/**
 * CAVDAX Ingest Command
 *
 * npx cavdax ingest [--type <type>] [--repo <path>] [--host <host>] [--port <port>]
 *
 * Supported source types:
 *   adr         (default) Scan docs/adr/, docs/adrs/, .adr/ for Markdown ADR files
 *   commit      Ingest a specific git commit (requires --sha)
 *   package     Scan package.json for dependency changes
 *   codeowners  Scan .github/CODEOWNERS for ownership changes
 *   issue       Ingest a GitHub Issue closure (requires --issue and --url)
 *   all         Run adr + package + codeowners sequentially
 */

import fs from 'fs';
import path from 'path';
import { connectGraph, loadCore, describeConnectError, falkorConfig } from './runtime.js';

// ─── FalkorDB connection helper ───────────────────────────────────────────────

async function connectFalkorDB(host, port) {
  try {
    const conn = await connectGraph({ host, port });
    console.log(`   Connected to FalkorDB at ${host}:${port} (graph: ${conn.graphName})`);
    return { client: conn.client, graph: conn.graph };
  } catch (err) {
    console.warn(`   ${describeConnectError(err, falkorConfig({ host, port }))} — running in dry-run mode`);
    return { client: null, graph: null };
  }
}

// ─── ADR file discovery (Zero-Dependency Native Node.js fs) ───────────────────

function findMarkdownFilesSync(dir) {
  const results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findMarkdownFilesSync(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

async function discoverAdrFiles(repoRoot) {
  const candidateDirs = [
    '.adr', 'adr', 'adrs', 'doc/adr', 'doc/adrs', 'docs/adr', 'docs/adrs',
    'docs/decisions', 'docs/architecture/decisions', 'architecture/decisions',
    'architecture', 'decisions', 'design/adr', 'design/adrs', 'design/decisions',
    'wiki/adr', 'wiki/adrs', 'demo-repo/docs/adrs', 'demo-repo/docs/adr'
  ];

  const found = [];
  for (const relDir of candidateDirs) {
    const absDir = path.resolve(repoRoot, relDir);
    try {
      if (fs.existsSync(absDir) && fs.statSync(absDir).isDirectory()) {
        found.push(...findMarkdownFilesSync(absDir));
      }
    } catch {}
  }

  // Also discover any root or docs/ ADR-*.md files
  const rootCandidates = ['.', 'docs'];
  for (const relDir of rootCandidates) {
    const absDir = path.resolve(repoRoot, relDir);
    try {
      if (fs.existsSync(absDir) && fs.statSync(absDir).isDirectory()) {
        const entries = fs.readdirSync(absDir);
        for (const file of entries) {
          if (/^adr-.*\.md$/i.test(file)) {
            found.push(path.join(absDir, file));
          }
        }
      }
    } catch {}
  }

  // TEMPLATE.md documents the format; ingesting it would create a bogus "TEMPLATE" Source.
  return [...new Set(found)].filter((f) => !/^template/i.test(path.basename(f)));
}

/** Number of ADRs a file supersedes — superseding ADRs must be ingested after the ones they replace. */
function supersedesCount(filePath) {
  try {
    const head = fs.readFileSync(filePath, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
    const block = head.match(/^supersedes:[ \t]*(.*)\r?\n((?:[ \t]+-[^\n]*\n?)*)/m);
    if (!block) return 0;
    const inline = block[1].trim();
    const items = block[2].split('\n').filter((l) => l.trim().startsWith('-')).length;
    if (items) return items;
    if (inline.startsWith('[')) return inline.slice(1, -1).split(',').filter((s) => s.trim()).length;
    return inline ? 1 : 0;
  } catch {
    return 0;
  }
}

// ─── Engine loaders (bundled in the tarball, or ../../../core in the monorepo) ──

async function loadSources() {
  try {
    return await loadCore('ingestion/sources.js');
  } catch {
    return null;
  }
}

async function loadParser() {
  try {
    return (await loadCore('ingestion/parser.js')).ingestAdrFile || null;
  } catch {
    return null;
  }
}

// ─── Type handlers ────────────────────────────────────────────────────────────

async function ingestAdr(repoRoot, graph, dryRun) {
  const adrFiles = (await discoverAdrFiles(repoRoot)).sort(
    (a, b) => supersedesCount(a) - supersedesCount(b) || a.localeCompare(b)
  );

  if (adrFiles.length === 0) {
    console.log('   No ADR files found in .adr/, docs/adr/, or docs/adrs/');
    console.log('   Create Markdown files in one of those directories and re-run.');
    return { processed: 0, total: 0 };
  }

  console.log(`   Found ${adrFiles.length} ADR file(s):`);
  adrFiles.forEach(f => console.log(`     • ${path.relative(repoRoot, f)}`));

  if (dryRun) {
    console.log('\n   Dry-run: FalkorDB unavailable, no data written.');
    return { processed: 0, total: adrFiles.length };
  }

  const ingestAdrFile = await loadParser();
  let processed = 0;

  for (const filePath of adrFiles) {
    try {
      if (!ingestAdrFile) throw new Error('CAVDAX ingestion engine (core/ingestion/parser.js) not found');
      const res = await ingestAdrFile(graph, filePath, { allowedRoot: repoRoot, isDemo: false });
      const inval = [].concat(res.invalidation || []);
      const hit = inval.flatMap((i) => i.invalidated_decision_ids || []);
      console.log(
        `   + Ingested: ${path.relative(repoRoot, filePath)}` +
          (res.supersedes ? ` (supersedes ${[].concat(res.supersedes).join(', ')}` + (hit.length ? `; invalidated ${hit.join(', ')})` : ')') : '')
      );
      processed++;
    } catch (err) {
      console.error(`   x Failed: ${path.relative(repoRoot, filePath)} — ${err.message}`);
    }
  }

  return { processed, total: adrFiles.length };
}

async function ingestCommit(options, graph, dryRun) {
  if (!options.sha) {
    console.error('   --sha <commit-sha> is required for --type commit');
    process.exit(1);
  }

  // Strict SHA validation prevents OS command injection
  const cleanSha = String(options.sha).trim();
  if (!/^[0-9a-fA-F]{4,40}$/.test(cleanSha)) {
    console.error('   Error: Invalid commit SHA format. Must be a 4-40 hexadecimal string.');
    process.exit(1);
  }

  const sources = await loadSources();
  if (!sources) {
    console.error('   sources.js not found — run inside the CAVDAX monorepo');
    process.exit(1);
  }

  // Resolve message from SHA if not provided
  let message = options.message;
  if (!message) {
    try {
      const { execFileSync } = await import('child_process');
      message = execFileSync('git', ['log', '--format=%B', '-n', '1', cleanSha], {
        cwd: path.resolve(options.repo),
        encoding: 'utf-8'
      }).trim();
    } catch {
      message = `Commit ${options.sha}`;
    }
  }

  if (dryRun) {
    console.log(`   Dry-run: would ingest commit ${options.sha} — "${message.split('\n')[0]}"`);
    return;
  }

  const result = await sources.ingestGitCommit(graph, {
    sha: cleanSha,
    message,
    author: options.author,
    repoRoot: path.resolve(options.repo)
  });
  console.log(`   + Ingested commit ${result.source_id}${result.supersedes ? ` (supersedes: ${[].concat(result.supersedes).join(', ')})` : ''}`);
  return result;
}

async function ingestPackage(repoRoot, graph, dryRun) {
  const pkgPath = path.join(repoRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log(`   No package.json found at ${pkgPath}`);
    return { processed: 0 };
  }

  const sources = await loadSources();
  if (!sources) {
    console.error('   sources.js not found — run inside the CAVDAX monorepo');
    process.exit(1);
  }

  if (dryRun) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const count = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length;
    console.log(`   Dry-run: would scan ${count} dependencies from ${pkgPath}`);
    return { processed: 0 };
  }

  const results = await sources.scanAndIngestPackageJson(graph, pkgPath);
  const changed = results.filter(r => r.supersedes);
  console.log(`   + Scanned ${results.length} packages — ${changed.length} with breaking changes ingested`);
  return { processed: results.length };
}

async function ingestCodeowners(repoRoot, graph, dryRun) {
  const coPath = path.join(repoRoot, '.github', 'CODEOWNERS');
  const coPathAlt = path.join(repoRoot, 'CODEOWNERS');
  const filePath = fs.existsSync(coPath) ? coPath : fs.existsSync(coPathAlt) ? coPathAlt : null;

  if (!filePath) {
    console.log('   No CODEOWNERS file found at .github/CODEOWNERS or CODEOWNERS');
    return { processed: 0 };
  }

  const sources = await loadSources();
  if (!sources) {
    console.error('   sources.js not found — run inside the CAVDAX monorepo');
    process.exit(1);
  }

  if (dryRun) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
    console.log(`   Dry-run: would scan ${lines.length} ownership rules from ${path.relative(repoRoot, filePath)}`);
    return { processed: 0 };
  }

  const results = await sources.scanAndIngestCodeowners(graph, filePath);
  console.log(`   + Scanned CODEOWNERS — ${results.length} ownership change(s) ingested`);
  return { processed: results.length };
}

async function ingestIssue(options, graph, dryRun) {
  if (!options.issue || !options.url) {
    console.error('   --issue <number> and --url <html_url> are required for --type issue');
    process.exit(1);
  }

  const sources = await loadSources();
  if (!sources) {
    console.error('   sources.js not found — run inside the CAVDAX monorepo');
    process.exit(1);
  }

  if (dryRun) {
    console.log(`   Dry-run: would ingest Issue #${options.issue} from ${options.url}`);
    return;
  }

  const result = await sources.ingestGitHubIssue(graph, {
    issueNumber: options.issue,
    title: options.title || `Issue #${options.issue}`,
    htmlUrl: options.url,
    body: options.body || '',
    supersedesIds: options.supersedes ? options.supersedes.split(',').map(s => s.trim()) : [],
    state: 'closed'
  });

  if (result.skipped) {
    console.log(`   Skipped Issue #${options.issue}: ${result.reason}`);
  } else {
    console.log(`   + Ingested Issue #${result.issue_number}${result.supersedes ? ` (supersedes: ${[].concat(result.supersedes).join(', ')})` : ''}`);
  }
  return result;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function runIngest(options) {
  const repoRoot = path.resolve(options.repo || process.cwd());
  const { host, port } = falkorConfig({ host: options.host, port: options.port });
  const type = (options.type || 'adr').toLowerCase();

  console.log(`\nCAVDAX Ingest — type: ${type.toUpperCase()} — repo: ${repoRoot}`);
  console.log(`FalkorDB: ${host}:${port}\n`);

  if (!fs.existsSync(repoRoot)) {
    console.error(`Repository path does not exist: ${repoRoot}`);
    process.exit(1);
  }

  const { client, graph } = await connectFalkorDB(host, port);
  const dryRun = !graph;

  let result;

  switch (type) {
    case 'adr':
      result = await ingestAdr(repoRoot, graph, dryRun);
      break;
    case 'commit':
      result = await ingestCommit(options, graph, dryRun);
      break;
    case 'package':
    case 'package.json':
      result = await ingestPackage(repoRoot, graph, dryRun);
      break;
    case 'codeowners':
      result = await ingestCodeowners(repoRoot, graph, dryRun);
      break;
    case 'issue':
      result = await ingestIssue(options, graph, dryRun);
      break;
    case 'all':
      console.log('--- ADR ---');
      await ingestAdr(repoRoot, graph, dryRun);
      console.log('\n--- package.json ---');
      await ingestPackage(repoRoot, graph, dryRun);
      console.log('\n--- CODEOWNERS ---');
      await ingestCodeowners(repoRoot, graph, dryRun);
      break;
    default:
      console.error(`Unknown --type "${type}". Valid: adr | commit | package | codeowners | issue | all`);
      process.exit(1);
  }

  if (client) {
    try { await client.close(); } catch { /* ignore */ }
  }

  console.log(`\nIngest complete.`);
  return result;
}
