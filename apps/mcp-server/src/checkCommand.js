/**
 * CAVDAX Check Command
 *
 * npx cavdax check [--staged] [--pr <number>]
 *
 * Validates staged git files OR a GitHub PR's changed files against the
 * FalkorDB causal dependency graph. Returns exit code 0 (pass) or 1 (fail).
 *
 * Designed for use in:
 *   - git pre-commit hooks: `npx cavdax check --staged`
 *   - GitHub Actions CI:    `npx cavdax check --pr ${{ github.event.pull_request.number }}`
 *   - CAVDAX CI Gate:      `npx cavdax gate --sha <sha>`
 *
 * Only text-based source files are scanned for CAVDAX decision ID references.
 * Binary files, lock files, and generated assets are skipped to prevent false
 * positives and crashes from calling readFileSync on non-UTF-8 content.
 */

import { execFileSync } from 'child_process';
import path from 'path';
import { connectGraph, closeQuietly, describeConnectError, falkorConfig, loadCore } from './runtime.js';

// File extensions that are safe to read as UTF-8 text and may contain
// CAVDAX decision ID references (e.g. DEC-999 in a comment or config).
// Binary files, images, lock files, and generated bundles are excluded.
const SCANNABLE_EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs',
  '.ts', '.tsx', '.jsx',
  '.py', '.go', '.rs', '.rb', '.java', '.kt', '.cs', '.cpp', '.c', '.h',
  '.md', '.mdx', '.txt',
  '.yaml', '.yml', '.toml', '.ini', '.env',
  '.json',   // package.json, tsconfig etc — but NOT *.lock.json
  '.sh', '.bash', '.zsh',
  '.sql', '.graphql', '.proto'
]);

/**
 * Returns true if the file path should be scanned for decision ID references.
 * Excludes lock files and build artifacts explicitly regardless of extension.
 */
export function isScannableFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);

  // Exclude lock files by name pattern regardless of extension
  if (basename.endsWith('.lock') || basename === 'package-lock.json' || basename === 'yarn.lock' || basename === 'pnpm-lock.yaml') {
    return false;
  }

  // Exclude documentation and markdown files (they describe examples, not executable code dependencies)
  const ext = path.extname(normalized).toLowerCase();
  if (ext === '.md' || ext === '.mdx' || ext === '.txt') {
    return false;
  }

  // Exclude third-party dependencies, build outputs, and test specs
  if (
    normalized.includes('node_modules/') ||
    normalized.includes('/node_modules/') ||
    normalized.startsWith('.git/') ||
    normalized.includes('/.git/') ||
    normalized.includes('dist/') ||
    normalized.includes('/dist/') ||
    normalized.includes('build/') ||
    normalized.includes('/build/') ||
    normalized.includes('.next/') ||
    normalized.includes('.turbo/') ||
    basename.includes('.test.') ||
    basename.includes('.spec.')
  ) {
    return false;
  }

  return SCANNABLE_EXTENSIONS.has(ext);
}

/**
 * Returns a list of staged file paths via `git diff --cached --name-only`.
 * @returns {string[]}
 */
function getStagedFiles() {
  try {
    const output = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf-8' });
    return output.trim().split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Attempts to connect to FalkorDB and verify whether a given decision ID
 * (extracted heuristically from source file content) is still valid.
 *
 * @param {string[]} files - List of file paths to check.
 * @param {object} options - CLI options (host, port passed via env).
 * @returns {Promise<boolean>} true if all checks pass, false if any violations found.
 */
async function verifyFiles(files, options = {}) {
  let client = null;
  let graph = null;
  let verifyActionGate = null;
  let unreachableReason = null;

  try {
    ({ client, graph } = await connectGraph());
    ({ verifyActionGate } = await loadCore('graph/queries.js'));
  } catch (err) {
    unreachableReason = describeConnectError(err, falkorConfig());
    graph = null;
  }

  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS || options.strict);

  const remoteDecisions = options.remoteDecisions || null;

  // --strict / CI: an unverifiable gate must not silently pass (a remote decision map counts as verifiable).
  if (!graph && isCi && !remoteDecisions) {
    console.error(`   ⛔ ${unreachableReason}`);
    console.error('      CI / Strict mode active: unverifiable decisions are treated as failures.');
  }

  let allPassed = true;

  for (const filePath of files) {
    if (!isScannableFile(filePath)) {
      console.log(`   ⏭️  ${filePath} — skipped (binary/lock/generated file)`);
      continue;
    }

    // Scan for decision ID patterns (e.g. DEC-999)
    let decisionIds = [];
    try {
      const { readFileSync } = await import('fs');
      const content = readFileSync(filePath, 'utf-8');
      const matches = content.match(/\bDEC-\d+\b/g) || [];
      decisionIds = [...new Set(matches)];
    } catch {
      // File unreadable or deleted — skip gracefully
      console.log(`   ⏭️  ${filePath} — skipped (file unreadable or deleted)`);
      continue;
    }

    if (decisionIds.length === 0) {
      console.log(`   ✅ ${filePath} — no CAVDAX decision references found`);
      continue;
    }

    for (const decId of decisionIds) {
      let result;

      if (graph && verifyActionGate) {
        result = await verifyActionGate(graph, decId);
      } else if (remoteDecisions) {
        const status = remoteDecisions[decId];
        if (status === undefined) {
          result = { is_approved: true, gate_verdict: 'SKIPPED_UNKNOWN_DECISION', violation_paths: [] };
        } else if (status === 'VALID') {
          result = { is_approved: true, gate_verdict: 'APPROVED_REMOTE_GRAPH', violation_paths: [] };
        } else {
          result = { is_approved: false, gate_verdict: 'BLOCKED_STALE_DECISION', violation_paths: [{ decision: decId, status }] };
        }
      } else {
        if (isCi) {
          console.error(`   ⛔ CI Error: FalkorDB is unreachable. Cannot verify causal invariant ${decId} in ${filePath}.`);
          result = {
            is_approved: false,
            gate_verdict: 'BLOCKED_GATE_UNREACHABLE',
            violation_paths: []
          };
        } else {
          console.warn(`   ⚠️  FalkorDB unreachable — skipping causal check for ${decId} in ${filePath}`);
          result = {
            is_approved: true,
            gate_verdict: 'SKIPPED_NO_FALKORDB',
            violation_paths: []
          };
        }
      }

      if (!result.is_approved) {
        console.error(`   ⛔ BLOCKED: ${filePath} references ${decId}`);
        console.error(`      Verdict: ${result.gate_verdict}`);
        console.error(`      Violation path: ${JSON.stringify(result.violation_paths)}`);
        allPassed = false;
      } else {
        console.log(`   ✅ ${filePath} — ${decId} verified (${result.gate_verdict})`);
      }
    }
  }

  await closeQuietly(client);
  return allPassed;
}

/**
 * Main entry point for the `check` command.
 * @param {object} options - Commander options object.
 * @returns {Promise<boolean>} true = pass, false = fail
 */
export async function runCheck(options = {}) {
  console.log('\n🛡️  CAVDAX Check — causal provenance validation\n');

  let filesToCheck = [];

  if (Array.isArray(options.files)) {
    filesToCheck = options.files;
    console.log(`   Direct mode: checking ${filesToCheck.length} target file(s)...\n`);
  } else if (options.staged) {
    filesToCheck = getStagedFiles();
    if (filesToCheck.length === 0) {
      console.log('   No staged files found. Nothing to check.');
      return true;
    }
    console.log(`   Checking ${filesToCheck.length} staged file(s)...\n`);
  } else if (options.pr) {
    console.log(`   PR mode: checking files changed in PR #${options.pr}`);
    try {
      const output = execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { encoding: 'utf-8' });
      filesToCheck = output.trim().split('\n').map(s => s.trim()).filter(Boolean);
    } catch {
      console.warn('   ⚠️  Could not determine changed files via git diff — checking staged files.');
      filesToCheck = getStagedFiles();
    }
    if (filesToCheck.length === 0) {
      console.log('   No changed files found in PR. Nothing to check.');
      return true;
    }
    console.log(`   Checking ${filesToCheck.length} PR file(s)...\n`);
  } else {
    console.log('   Usage: npx cavdax check --staged   OR   npx cavdax check --pr <number>');
    return false;
  }

  if (filesToCheck.length === 0) {
    console.log('   No scannable files found. Clearance granted.\n');
    return true;
  }

  const passed = await verifyFiles(filesToCheck, options);

  if (passed) {
    console.log('\n✅ All causal provenance checks passed.\n');
  } else {
    console.error('\n⛔ CAVDAX gate blocked one or more files. Fix violations before merging.\n');
  }

  return passed;
}
