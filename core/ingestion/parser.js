/**
 * CAVDAX Deterministic ADR / Git Ingestion Engine
 * Parses real Markdown files with YAML frontmatter without relying on probabilistic LLMs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cascadeInvalidation } from '../graph/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

/**
 * Lightweight deterministic YAML frontmatter extractor (Zero-dependency fallback)
 *
 * Supports:
 *   - Scalar values:   key: value
 *   - Quoted strings:  key: "value" or key: 'value'
 *   - Inline arrays:   key: [a, b, c]
 *   - Block sequences: key:\n  - a\n  - b   (indented list items)
 *
 * The 'supersedes' key specifically may be a scalar string OR a list.
 * Both forms are normalised to an array by ingestAdrFile before use.
 */
/**
 * Zero-Config Heuristic Metadata Extractor
 * Automatically extracts ADR / RFC metadata from plain, unstructured Markdown without YAML frontmatter.
 * Supports Michael Nygard, MADR, RFCs, and unstructured issue/Notion formats.
 */
export function extractHeuristicMetadata(content, filePath = '') {
  const metadata = {};

  // 1. Title & ID detection: e.g. "# ADR-002: OAuth2 Token Migration" or "# 1. Record Architecture Decision"
  const titleMatch = content.match(/^#\s+(?:ADR[-_]?)?([A-Za-z0-9-_]+)?[:.]?\s*(.+)$/m);
  if (titleMatch) {
    if (titleMatch[1]) {
      const rawNum = titleMatch[1];
      const parsedId = /^\d+$/.test(rawNum) ? `ADR-${rawNum.padStart(3, '0')}` : rawNum.toUpperCase().replace('_', '-');
      if (/^ADR-\d+$/i.test(parsedId)) {
        metadata.id = parsedId;
      }
    }
    metadata.title = titleMatch[2].trim();
  }

  // Fallback ID from filename if not extracted
  if (!metadata.id && filePath) {
    const base = path.basename(filePath, path.extname(filePath));
    const idMatch = base.match(/ADR[-_]?\d+/i);
    const numMatch = base.match(/^(\d{3,4})[-_]/);
    if (idMatch) {
      metadata.id = idMatch[0].toUpperCase().replace('_', '-');
    } else if (numMatch) {
      metadata.id = `ADR-${numMatch[1]}`;
    } else {
      metadata.id = base;
    }
  }

  // 2a. Passive supersession detection: e.g. "Status: Superseded by ADR-002", "superseded by [ADR-002]"
  // This marks THIS file as the victim/superseded target, NOT the active superseder.
  const passiveMatches = content.match(/(?:superseded\s+by|deprecated\s+by|replaced\s+by)\s*:?\s*(?:\[)?([A-Za-z0-9-_]+)(?:\])?/i);
  if (passiveMatches) {
    metadata.status = 'SUPERSEDED';
    metadata.superseded_by = passiveMatches[1].toUpperCase().replace('_', '-');
  }

  // 2b. Active supersedes extraction: e.g. "Supersedes: ADR-001, ADR-002", "Replaces: [ADR-001]"
  // Requires directive syntax (supersedes: or replaces: at line start or after newline) to avoid matching prose sentences like "The cache replaces 1000 requests..."
  const activeLineMatches = content.match(/(?:^|\r?\n)\s*(?<!(?:superseded|deprecated|replaced)\s+)(?:supersedes|replaces)\s*:\s*([^\r\n]+)/gi);
  if (activeLineMatches) {
    const ids = [];
    for (const line of activeLineMatches) {
      const idMatches = line.matchAll(/(?:ADR[-_]?(\d+)|(?<![\w-])(\d{3,4})(?![\w-]))/gi);
      for (const m of idMatches) {
        const num = m[1] || m[2];
        const cleanId = `ADR-${num.padStart(3, '0')}`;
        if (cleanId !== metadata.id && !ids.includes(cleanId)) {
          ids.push(cleanId);
        }
      }
    }
    if (ids.length > 0) {
      metadata.supersedes = ids.length === 1 ? ids[0] : ids;
    }
  }
  // 3. Status extraction: e.g. "Status: Active", "Status: Accepted", "Status: Proposed"
  const statusMatch = content.match(/Status\s*:\s*([A-Za-z]+)/i);
  if (statusMatch) {
    const s = statusMatch[1].toUpperCase();
    if (['ACTIVE', 'ACCEPTED', 'APPROVED', 'VALID'].includes(s)) metadata.status = 'ACTIVE';
    else if (['SUPERSEDED', 'DEPRECATED', 'REPLACED', 'ARCHIVED'].includes(s)) metadata.status = 'SUPERSEDED';
    else if (['PROPOSED', 'DRAFT', 'PENDING', 'REJECTED'].includes(s)) metadata.status = s;
  }

  // 4. Decision extraction: e.g. "## Decision\nWe will use OAuth2 tokens..."
  const decisionMatch = content.match(/##\s+(?:Decision|Directive|Resolution)\s*\r?\n([\s\S]*?)(?=\r?\n##|$)/i);
  if (decisionMatch) {
    const cleanDecision = decisionMatch[1].trim().split(/\r?\n/)[0].replace(/^[-*]\s*/, '').slice(0, 120);
    metadata.decision_title = cleanDecision;
    metadata.decision_id = `DEC-${metadata.id ? metadata.id.replace('ADR-', '') : 'AUTO'}`;
  }

  // 4b. Target file / governs extraction: e.g. "Governs: src/services/payment.js" or "Target: src/auth.js"
  const targetMatch = content.match(/(?:Governs|Target[_\s]?file|Applies[_\s]?to)\s*:\s*([^\r\n]+)/i);
  if (targetMatch) {
    const cleanTarget = targetMatch[1].trim().replace(/^['"`]|['"`]$/g, '');
    metadata.target_file = cleanTarget;
    metadata.governs = cleanTarget;
  }

  // 5. Fact / Context extraction: e.g. "## Context\nLegacy token auth is vulnerable..."
  const contextMatch = content.match(/##\s+(?:Context|Problem|Fact|Rationale)\s*\r?\n([\s\S]*?)(?=\r?\n##|$)/i);
  if (contextMatch) {
    const cleanContext = contextMatch[1].trim().split(/\r?\n/)[0].replace(/^[-*]\s*/, '').slice(0, 160);
    metadata.fact_claim = cleanContext;
    metadata.fact_id = `F-${metadata.id ? metadata.id.replace('ADR-', '') : 'AUTO'}`;
  }

  return metadata;
}

export function parseFrontmatter(fileContent, filePath = '') {
  const match = fileContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    // Zero-Config Fallback: Parse plain unstructured Markdown using heuristic extractor
    const heuristic = extractHeuristicMetadata(fileContent, filePath);
    return { frontmatter: heuristic, body: fileContent };
  }

  const rawYaml = match[1];
  const body = fileContent.slice(match[0].length).trim();
  const frontmatter = {};

  const lines = rawYaml.split(/\r?\n/);
  let currentKey = null; // tracks the key whose block-sequence we are collecting

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Block-sequence item (  - value) belonging to the previous key
    if (trimmed.startsWith('- ') && currentKey) {
      const item = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, '');
      if (!Array.isArray(frontmatter[currentKey])) {
        // Convert existing scalar to array on first list item
        frontmatter[currentKey] = frontmatter[currentKey] ? [frontmatter[currentKey]] : [];
      }
      frontmatter[currentKey].push(item);
      continue;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      currentKey = trimmed.slice(0, colonIdx).trim();
      let value = trimmed.slice(colonIdx + 1).trim();

      // Inline array: key: [a, b, c]
      if (value.startsWith('[') && value.endsWith(']')) {
        frontmatter[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
        continue;
      }

      // Clean surrounding quotes from scalar values
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Clean inline comments: e.g. Status: Accepted # inline comment
      const commentIdx = value.indexOf(' #');
      if (commentIdx !== -1) {
        value = value.slice(0, commentIdx).trim();
      }

      // Empty value after colon means a block-sequence follows on next lines
      frontmatter[currentKey] = value || null;
    } else {
      // Line has no colon — not a key-value pair, reset currentKey
      currentKey = null;
    }
  }

  // Backfill missing fields with heuristic extraction (hybrid fallback)
  const heuristic = extractHeuristicMetadata(body, filePath);
  for (const [k, v] of Object.entries(heuristic)) {
    if (frontmatter[k] === undefined || frontmatter[k] === null) {
      frontmatter[k] = v;
    }
  }

  return { frontmatter, body };
}

/**
 * Ingests an ADR file and cascades invalidation if a `supersedes` key is detected.
 *
 * @param {object} graph
 * @param {string} filePath
 * @param {object} [options]
 * @param {string} [options.allowedRoot] Directory the ADR must live under.
 *   Defaults to the CAVDAX monorepo root; the npm CLI passes the user's repo.
 * @param {boolean} [options.isDemo] Tag the decision as demo data (excluded from the hosted
 *   plan quota). Defaults to a path check for the hosted server; the npm CLI passes false.
 */
export async function ingestAdrFile(graph, filePath, { allowedRoot: allowedRootOption, isDemo: isDemoOption } = {}) {
  const isDemo = isDemoOption ?? (filePath.includes('demo-repo') || filePath.includes('demo'));
  console.log(`[Ingestion] Reading ADR file: ${filePath}`);
  const absolutePath = path.resolve(filePath);

  // Security Confinement: Prevent path traversal outside repository root (OWASP A01/A03)
  const allowedRoot = path.resolve(allowedRootOption || REPO_ROOT);
  if (!absolutePath.startsWith(allowedRoot + path.sep) && absolutePath !== allowedRoot) {
    throw new Error(`Security Violation: Path traversal attempt outside project workspace: ${absolutePath}`);
  }

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`ADR file not found at path: ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(fileContent, absolutePath);

  const adrId = frontmatter.id || path.basename(filePath, path.extname(filePath));

  // Normalise 'supersedes' to an array so downstream code handles both:
  //   supersedes: ADR-001          (scalar string  → ['ADR-001'])
  //   supersedes: [ADR-001, ADR-003] (inline array → ['ADR-001', 'ADR-003'])
  //   supersedes:\n  - ADR-001\n  - ADR-003  (block sequence → ['ADR-001', 'ADR-003'])
  const rawSupersedes = frontmatter.supersedes;
  const supersedesIds = rawSupersedes
    ? (Array.isArray(rawSupersedes) ? rawSupersedes : [rawSupersedes]).filter(Boolean)
    : [];

  const sourceStatus = (frontmatter.status || 'ACTIVE').toUpperCase();
  const title = frontmatter.title || adrId;
  const relativePath = path.relative(allowedRootOption ? allowedRoot : process.cwd(), absolutePath).replace(/\\/g, '/');

  console.log(`[Ingestion] ADR ID: '${adrId}', Status: '${sourceStatus}', Supersedes: ${supersedesIds.length ? supersedesIds.join(', ') : 'None'}`);

  // 1. ATOMIC GRAPH INGESTION: MERGE Source node so any ADR (not just pre-seeded
  //    ones) exists in the graph before cascadeInvalidation tries to MATCH it.
  //    Without this, MATCH (newSource:Source {id: $adrId}) returns 0 rows and
  //    the entire cascade silently does nothing for novel ADRs like ADR-003.
  const mergeSourceCypher = `
    MERGE (s:Source {id: $adrId})
    ON CREATE SET
      s.ref = $ref,
      s.type = 'ADR',
      s.status = $sourceStatus,
      s.title = $title,
      s.created_at = timestamp()
    ON MATCH SET
      s.ref = $ref,
      s.status = $sourceStatus,
      s.title = $title
  `;
  await graph.query(mergeSourceCypher, { params: { adrId, ref: relativePath, title, sourceStatus } });

  // 2. OPTIONAL: If frontmatter declares a fact, MERGE Fact + EXTRACTED_FROM edge.
  if (frontmatter.fact_id && frontmatter.fact_claim) {
    const mergeFactCypher = `
      MATCH (s:Source {id: $adrId})
      MERGE (f:Fact {id: $factId})
      ON CREATE SET f.claim = $claim, f.is_stale = CASE WHEN s.status = 'SUPERSEDED' THEN true ELSE false END, f.verified = true
      ON MATCH SET f.is_stale = CASE WHEN s.status = 'SUPERSEDED' THEN true ELSE f.is_stale END
      MERGE (f)-[:EXTRACTED_FROM]->(s)
    `;
    await graph.query(mergeFactCypher, {
      params: { adrId, factId: frontmatter.fact_id, claim: frontmatter.fact_claim }
    });
  }

  // 2b. OPTIONAL: `decision_id` (+ `decision_title`) declares an architecture
  //     decision that depends on this ADR's fact. Without this, a real repo has
  //     no way to create Decision nodes (only the demo seed did).
  if (frontmatter.decision_id && frontmatter.fact_id) {
    const targetFile = frontmatter.target_file || frontmatter.governs || frontmatter.file || null;
    const mergeDecisionCypher = `
      MATCH (f:Fact {id: $factId})
      MERGE (d:Decision {id: $decisionId})
      ON CREATE SET d.title = $decisionTitle,
                    d.status = CASE WHEN f.is_stale = true THEN 'INVALIDATED_NEEDS_REVALIDATION' ELSE 'VALID' END,
                    d.target_file = $targetFile,
                    d.governs = $targetFile,
                    d.is_demo = $isDemo,
                    d.created_at = timestamp()
      ON MATCH SET d.status = CASE WHEN f.is_stale = true THEN 'INVALIDATED_NEEDS_REVALIDATION' ELSE d.status END,
                   d.target_file = coalesce(d.target_file, $targetFile),
                   d.governs = coalesce(d.governs, $targetFile),
                   d.is_demo = CASE WHEN $isDemo THEN true ELSE d.is_demo END
      MERGE (d)-[:DEPENDS_ON]->(f)
    `;
    await graph.query(mergeDecisionCypher, {
      params: {
        factId: frontmatter.fact_id,
        decisionId: frontmatter.decision_id,
        decisionTitle: frontmatter.decision_title || frontmatter.decision_id,
        targetFile,
        isDemo
      }
    });
  }

  // 3. TRIGGER CASCADING INVALIDATION for every superseded ADR
  //    Fix H2: Proposed, Draft, or Rejected ADRs must NEVER invalidate live decisions!
  const isDraftOrProposed = ['PROPOSED', 'DRAFT', 'PENDING', 'REJECTED'].includes(sourceStatus);
  const invalidationResults = [];

  if (!isDraftOrProposed) {
    for (const oldSourceId of supersedesIds) {
      console.log(`[Ingestion] ⚡ Mutation: '${adrId}' supersedes '${oldSourceId}'. Triggering cascade...`);
      const result = await cascadeInvalidation(graph, adrId, oldSourceId);
      console.log(`[Ingestion] Cascade on '${oldSourceId}' complete in ${result.latency_ms}ms. Affected: ${result.affected_decisions} decision(s)`);
      invalidationResults.push({ supersedes: oldSourceId, ...result });
    }
  } else {
    console.log(`[Ingestion] ADR '${adrId}' is in '${sourceStatus}' status — skipping cascading invalidation.`);
  }

  return {
    adr_id: adrId,
    supersedes: supersedesIds.length === 1 ? supersedesIds[0] : (supersedesIds.length > 1 ? supersedesIds : null),
    frontmatter,
    invalidation: invalidationResults.length === 1
      ? invalidationResults[0]
      : (invalidationResults.length > 1 ? invalidationResults : null)
  };
}
