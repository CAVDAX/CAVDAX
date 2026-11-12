/**
 * CAVDAX Extended Source Ingestors
 *
 * Handles four additional source types beyond ADR Markdown files:
 *   1. Git commits         (type: COMMIT)
 *   2. package.json deps   (type: PACKAGE_JSON)
 *   3. CODEOWNERS changes  (type: CODEOWNERS)
 *   4. GitHub Issues       (type: GITHUB_ISSUE)
 *
 * Each ingestor:
 *   a) MERGE a (:Source) node into FalkorDB
 *   b) Optionally MERGE a (:Fact) node + [:EXTRACTED_FROM] edge
 *   c) Run cascadeInvalidation for every declared supersedes target
 *
 * All functions accept a live `graph` instance (from getFalkorClient)
 * and return a structured result object consistent with ingestAdrFile.
 *
 * parser.js is NOT modified — ADR ingestion lives there, this file
 * handles every non-ADR source type.
 */

import fs from 'fs';
import path from 'path';
import { cascadeInvalidation } from '../graph/queries.js';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/**
 * MERGE a Source node into FalkorDB and return the source ID.
 * Uses ON CREATE / ON MATCH to be fully idempotent.
 * Supports optional repo namespacing for multi-tenant isolation.
 */
async function mergeSource(graph, { id, type, ref, title, repo = null }) {
  await graph.query(
    `MERGE (s:Source {id: $id})
     ON CREATE SET s.type = $type, s.ref = $ref, s.title = $title,
                   s.repo = $repo,
                   s.status = 'ACTIVE', s.created_at = timestamp()
     ON MATCH  SET s.ref = $ref, s.title = $title,
                   s.repo = coalesce(s.repo, $repo)`,
    { params: { id, type, ref, title, repo } }
  );
}

/**
 * MERGE a Fact node and link it to an existing Source.
 */
async function mergeFact(graph, { sourceId, factId, claim }) {
  await graph.query(
    `MATCH (s:Source {id: $sourceId})
     MERGE (f:Fact {id: $factId})
     ON CREATE SET f.claim = $claim, f.is_stale = false, f.verified = true
     MERGE (f)-[:EXTRACTED_FROM]->(s)`,
    { params: { sourceId, factId, claim } }
  );
}

/**
 * Run cascadeInvalidation for each entry in a supersedesIds array.
 * Returns an array of invalidation result objects.
 */
async function cascadeAll(graph, newSourceId, supersedesIds) {
  const results = [];
  for (const oldId of supersedesIds) {
    console.log(`[Sources] Cascading invalidation: '${newSourceId}' supersedes '${oldId}'...`);
    const result = await cascadeInvalidation(graph, newSourceId, oldId);
    console.log(`[Sources] Cascade '${oldId}' done in ${result.latency_ms}ms — affected: ${result.affected_decisions}`);
    results.push({ supersedes: oldId, ...result });
  }
  return results;
}

// ─── Source Type 1: Git Commit ────────────────────────────────────────────────

/**
 * Ingest a Git commit as a CAVDAX Source node.
 *
 * Detects superseding relationships from:
 *   - Commit message containing "supersedes: ADR-XXX" or "breaks: DEC-XXX"
 *   - Conventional commits with a breaking change flag "feat!:" or "fix!:"
 *
 * @param {object} graph  - FalkorDB graph instance
 * @param {object} opts
 * @param {string} opts.sha       - Full or short commit SHA
 * @param {string} opts.message   - Commit message (first line or full body)
 * @param {string} [opts.author]  - Author identifier (email or username)
 * @param {string} [opts.repoRoot] - Repo root path for git operations
 * @returns {Promise<object>}
 */
export async function ingestGitCommit(graph, { sha, message, author = 'unknown', repoRoot = process.cwd(), repo = null }) {
  if (!sha || !message) throw new Error('ingestGitCommit requires sha and message');

  const repoPrefix = repo ? `${repo.replace(/[^a-zA-Z0-9_-]/g, '_')}-` : '';
  const shortSha = sha.slice(0, 7);
  const sourceId = `${repoPrefix}commit-${shortSha}`;
  const title = message.split('\n')[0].trim().slice(0, 120);

  console.log(`[Sources] Ingesting Git commit: ${sourceId} — "${title}"`);

  // Detect supersedes targets from commit message body
  // Patterns: "supersedes: ADR-001, ADR-002" or "breaks: DEC-102"
  const supersedesIds = [];
  const breaksDecisionIds = [];
  const supersedesMatches = message.matchAll(/supersedes[:\s]+([A-Z]+-\d+(?:\s*,\s*[A-Z]+-\d+)*)/gi);
  for (const match of supersedesMatches) {
    match[1].split(',').map(s => s.trim()).filter(Boolean).forEach(id => supersedesIds.push(id));
  }
  const breaksMatches = message.matchAll(/breaks[:\s]+([A-Z]+-\d+(?:\s*,\s*[A-Z]+-\d+)*)/gi);
  for (const match of breaksMatches) {
    match[1].split(',').map(s => s.trim()).filter(Boolean).forEach(id => {
      if (id.startsWith('DEC-')) {
        breaksDecisionIds.push(id);
      } else {
        supersedesIds.push(id);
      }
    });
  }
  // Detect conventional commit breaking change (feat!: / fix!: / refactor!:)
  const isBreaking = /^[a-z]+!:/i.test(title);
  const factId = `${repoPrefix}F-commit-${shortSha}`;
  const factClaim = isBreaking
    ? `Breaking change introduced in commit ${shortSha}: ${title}`
    : `Commit ${shortSha} merged: ${title}`;

  await mergeSource(graph, {
    id: sourceId,
    type: 'COMMIT',
    ref: sha,
    title: `[${shortSha}] ${title}`,
    repo,
  });

  await mergeFact(graph, { sourceId, factId, claim: factClaim });

  const invalidationResults = await cascadeAll(graph, sourceId, supersedesIds);
  for (const decId of breaksDecisionIds) {
    console.log(`[Sources] Breaking decision directly: '${decId}' by '${sourceId}'...`);
    await graph.query(
      `MATCH (d:Decision {id: $decId})
       SET d.status = 'INVALIDATED_NEEDS_REVALIDATION', d.invalidated_at = timestamp()
       MERGE (s:Source {id: $sourceId})
       MERGE (s)-[:BREAKS]->(d)`,
      { params: { decId, sourceId } }
    ).catch(() => {});
    invalidationResults.push({ breaks_decision: decId, status: 'INVALIDATED_NEEDS_REVALIDATION' });
  }

  return {
    source_id: sourceId,
    type: 'COMMIT',
    sha,
    title,
    author,
    is_breaking: isBreaking,
    supersedes: supersedesIds.length > 0 ? supersedesIds : null,
    fact_id: factId,
    invalidation: invalidationResults.length === 1
      ? invalidationResults[0]
      : (invalidationResults.length > 1 ? invalidationResults : null),
  };
}

// ─── Source Type 2: package.json Dependency Change ───────────────────────────

/**
 * Ingest a package.json dependency version change as a CAVDAX Source node.
 *
 * When a package moves to a new major version (breaking), it supersedes the
 * previous version's Source node so that agents can't generate code using the
 * old API surface.
 *
 * @param {object} graph
 * @param {object} opts
 * @param {string} opts.packageName  - e.g. "express"
 * @param {string} opts.oldVersion   - e.g. "^4.18.0"
 * @param {string} opts.newVersion   - e.g. "^5.0.0"
 * @param {string} [opts.filePath]   - Relative path to package.json
 * @returns {Promise<object>}
 */
/**
 * Safely extracts the major version integer from a semver string
 * (e.g. "^10.2.1", "~9.4.0", ">=10.0.0", "v10.0.0" -> 10, 9, 10, 10)
 */
export function parseMajorVersion(v) {
  if (!v || typeof v !== 'string') return null;
  const match = v.trim().match(/^(?:[\^~>=<vV\s]*?)(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export async function ingestPackageJsonChange(graph, { packageName, oldVersion, newVersion, filePath = 'package.json', repo = null }) {
  if (!packageName || !newVersion) throw new Error('ingestPackageJsonChange requires packageName and newVersion');

  // Derive a stable, deterministic source ID from package + version (repo namespaced if provided)
  const repoPrefix = repo ? `${repo.replace(/[^a-zA-Z0-9_-]/g, '_')}-` : '';
  const sanitize = v => v.replace(/[\^~>=<\s]/g, '').replace(/\./g, '_');
  const newSourceId = `${repoPrefix}pkg-${packageName}-${sanitize(newVersion)}`;
  const oldSourceId = oldVersion ? `${repoPrefix}pkg-${packageName}-${sanitize(oldVersion)}` : null;

  const oldMajor = parseMajorVersion(oldVersion);
  const newMajor = parseMajorVersion(newVersion);
  const isMajorBump = oldMajor !== null && newMajor !== null && newMajor > oldMajor;

  const title = oldVersion
    ? `${packageName} upgraded ${oldVersion} → ${newVersion}${isMajorBump ? ' (breaking major bump)' : ''}`
    : `${packageName}@${newVersion} introduced`;

  console.log(`[Sources] Ingesting package.json change: ${newSourceId}`);

  await mergeSource(graph, {
    id: newSourceId,
    type: 'PACKAGE_JSON',
    ref: filePath,
    title,
    repo,
  });

  const factId = `${repoPrefix}F-pkg-${packageName}-${sanitize(newVersion)}`;
  const factClaim = `${packageName}@${newVersion} is the active dependency version; prior API surface ${oldVersion || 'unknown'} is prohibited`;

  await mergeFact(graph, { sourceId: newSourceId, factId, claim: factClaim });

  // Only cascade if it's a major bump — minor/patch bumps don't break API contracts
  const supersedesIds = (isMajorBump && oldSourceId) ? [oldSourceId] : [];
  const invalidationResults = await cascadeAll(graph, newSourceId, supersedesIds);

  return {
    source_id: newSourceId,
    type: 'PACKAGE_JSON',
    package_name: packageName,
    old_version: oldVersion || null,
    new_version: newVersion,
    is_major_bump: isMajorBump,
    supersedes: supersedesIds.length > 0 ? supersedesIds : null,
    fact_id: factId,
    invalidation: invalidationResults.length === 1
      ? invalidationResults[0]
      : (invalidationResults.length > 1 ? invalidationResults : null),
  };
}

/**
 * Scan a package.json file and ingest all dependencies that have changed
 * compared to known Sources in FalkorDB.
 *
 * @param {object} graph
 * @param {string} filePath - Absolute path to package.json
 * @returns {Promise<object[]>} Array of ingest results per changed package
 */
export async function scanAndIngestPackageJson(graph, filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`package.json not found: ${filePath}`);

  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const results = [];

  for (const [name, version] of Object.entries(allDeps)) {
    // Check if this package already has a Source node in FalkorDB
    const existing = await graph.query(
      `MATCH (s:Source {type: 'PACKAGE_JSON'}) WHERE s.id STARTS WITH $prefix RETURN s.id AS id LIMIT 1`,
      { params: { prefix: `pkg-${name}-` } }
    );
    const oldVersion = existing.data?.[0]?.id
      ? existing.data[0].id.replace(`pkg-${name}-`, '').replace(/_/g, '.').replace(/^(\d)/, '^$1')
      : null;

    const result = await ingestPackageJsonChange(graph, {
      packageName: name,
      oldVersion,
      newVersion: version,
      filePath: path.relative(process.cwd(), filePath),
    });
    results.push(result);
  }

  return results;
}

// ─── Source Type 3: CODEOWNERS Change ────────────────────────────────────────

/**
 * Ingest a CODEOWNERS path ownership change as a CAVDAX Source node.
 *
 * When ownership of a path transfers, agents generating PR assignments or
 * routing code must use the current owner — the old owner fact is superseded.
 *
 * @param {object} graph
 * @param {object} opts
 * @param {string} opts.filePath   - Relative path to CODEOWNERS file
 * @param {string} opts.ownedPath  - The glob path being transferred (e.g. "/services/payment.js")
 * @param {string} opts.oldOwner   - Previous owner handle (e.g. "@alice")
 * @param {string} opts.newOwner   - New owner handle (e.g. "@bob")
 * @returns {Promise<object>}
 */
export async function ingestCodeownersChange(graph, { filePath, ownedPath, oldOwner, newOwner, repo = null }) {
  if (!ownedPath || !newOwner) throw new Error('ingestCodeownersChange requires ownedPath and newOwner');

  const repoPrefix = repo ? `${repo.replace(/[^a-zA-Z0-9_-]/g, '_')}-` : '';
  const sanitizePath = p => p.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const sanitizeOwner = o => o.replace('@', '').replace(/[^a-zA-Z0-9-_]/g, '-');

  const newSourceId = `${repoPrefix}codeowners-${sanitizePath(ownedPath)}-${sanitizeOwner(newOwner)}`;
  const oldSourceId = oldOwner
    ? `${repoPrefix}codeowners-${sanitizePath(ownedPath)}-${sanitizeOwner(oldOwner)}`
    : null;

  const title = oldOwner
    ? `${ownedPath} ownership transferred from ${oldOwner} to ${newOwner}`
    : `${ownedPath} ownership assigned to ${newOwner}`;

  console.log(`[Sources] Ingesting CODEOWNERS change: ${newSourceId}`);

  await mergeSource(graph, {
    id: newSourceId,
    type: 'CODEOWNERS',
    ref: filePath || '.github/CODEOWNERS',
    title,
    repo,
  });

  const factId = `${repoPrefix}F-owner-${sanitizePath(ownedPath)}`;
  const factClaim = `${ownedPath} is owned by ${newOwner}; review assignments to ${oldOwner || 'previous owner'} are invalid`;

  await mergeFact(graph, { sourceId: newSourceId, factId, claim: factClaim });

  const supersedesIds = oldSourceId ? [oldSourceId] : [];
  const invalidationResults = await cascadeAll(graph, newSourceId, supersedesIds);

  return {
    source_id: newSourceId,
    type: 'CODEOWNERS',
    owned_path: ownedPath,
    old_owner: oldOwner || null,
    new_owner: newOwner,
    supersedes: supersedesIds.length > 0 ? supersedesIds : null,
    fact_id: factId,
    invalidation: invalidationResults.length === 1
      ? invalidationResults[0]
      : (invalidationResults.length > 1 ? invalidationResults : null),
  };
}

/**
 * Parse a CODEOWNERS file and ingest all ownership entries.
 * Compares against existing Source nodes in FalkorDB to detect changes.
 *
 * @param {object} graph
 * @param {string} filePath - Absolute path to CODEOWNERS file
 * @returns {Promise<object[]>}
 */
export async function scanAndIngestCodeowners(graph, filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`CODEOWNERS not found: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const results = [];

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;

    const [ownedPath, ...owners] = parts;
    const newOwner = owners.join(' ');

    // Check existing CODEOWNERS Source for this path
    const existing = await graph.query(
      `MATCH (s:Source {type: 'CODEOWNERS'}) WHERE s.title CONTAINS $path RETURN s.id AS id, s.title AS title ORDER BY s.created_at DESC LIMIT 1`,
      { params: { path: ownedPath } }
    );

    // Extract old owner from existing title if present
    const oldOwnerMatch = existing.data?.[0]?.title?.match(/to (@\S+)$/);
    const oldOwner = oldOwnerMatch ? oldOwnerMatch[1] : null;

    // Skip if ownership hasn't changed
    if (oldOwner && oldOwner === newOwner) continue;

    const result = await ingestCodeownersChange(graph, {
      filePath: path.relative(process.cwd(), filePath),
      ownedPath,
      oldOwner,
      newOwner,
    });
    results.push(result);
  }

  return results;
}

// ─── Source Type 4: GitHub Issue ─────────────────────────────────────────────

/**
 * Ingest a GitHub Issue closure as a CAVDAX Source node.
 *
 * When an Issue is closed as "superseded" or "won't fix", any decisions
 * grounded in that Issue's requirements should be invalidated.
 *
 * Superseding targets are detected from:
 *   - Issue body/closing comment containing "supersedes: ADR-XXX"
 *   - Explicit supersedesIds array passed by caller (from GitHub webhook)
 *
 * @param {object} graph
 * @param {object} opts
 * @param {number|string} opts.issueNumber  - GitHub Issue number
 * @param {string}        opts.title        - Issue title
 * @param {string}        opts.htmlUrl      - Full GitHub URL to the issue
 * @param {string}        [opts.body]       - Issue body (scanned for supersedes refs)
 * @param {string[]}      [opts.supersedesIds] - Explicit list of superseded source IDs
 * @param {string}        [opts.state]      - "closed" | "open" (only closed issues are ingested)
 * @returns {Promise<object>}
 */
export async function ingestGitHubIssue(graph, { issueNumber, title, htmlUrl, body = '', supersedesIds = [], state = 'closed', repo = null }) {
  if (!issueNumber || !title) throw new Error('ingestGitHubIssue requires issueNumber and title');

  if (state !== 'closed') {
    console.log(`[Sources] Skipping Issue #${issueNumber} — state is '${state}', only closed issues are ingested`);
    return { skipped: true, reason: 'issue_not_closed', issue_number: issueNumber };
  }

  const repoPrefix = repo ? `${repo.replace(/[^a-zA-Z0-9_-]/g, '_')}-` : '';
  const sourceId = `${repoPrefix}issue-${issueNumber}`;

  // Scan body for additional supersedes references
  const bodyRefs = [];
  const bodyMatches = body.matchAll(/(?:supersedes|deprecates|breaks)[:\s]+([A-Z]+-\d+(?:\s*,\s*[A-Z]+-\d+)*)/gi);
  for (const match of bodyMatches) {
    match[1].split(',').map(s => s.trim()).filter(Boolean).forEach(id => bodyRefs.push(id));
  }
  const allSupersedesIds = [...new Set([...supersedesIds, ...bodyRefs])];

  const titleTruncated = title.slice(0, 120);
  console.log(`[Sources] Ingesting GitHub Issue #${issueNumber}: "${titleTruncated}"`);

  await mergeSource(graph, {
    id: sourceId,
    type: 'GITHUB_ISSUE',
    ref: htmlUrl,
    title: `Issue #${issueNumber} closed: ${titleTruncated}`,
    repo,
  });

  const factId = `${repoPrefix}F-issue-${issueNumber}`;
  const factClaim = `GitHub Issue #${issueNumber} closed: requirements from this issue are no longer active`;

  await mergeFact(graph, { sourceId, factId, claim: factClaim });

  const invalidationResults = await cascadeAll(graph, sourceId, allSupersedesIds);

  return {
    source_id: sourceId,
    type: 'GITHUB_ISSUE',
    issue_number: issueNumber,
    title: titleTruncated,
    html_url: htmlUrl,
    supersedes: allSupersedesIds.length > 0 ? allSupersedesIds : null,
    fact_id: factId,
    invalidation: invalidationResults.length === 1
      ? invalidationResults[0]
      : (invalidationResults.length > 1 ? invalidationResults : null),
  };
}
