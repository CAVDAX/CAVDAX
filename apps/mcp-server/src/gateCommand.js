/**
 * CAVDAX Gate Command (CI/CD Architectural Verification Gate)
 *
 * npx @cavdax/mcp-server gate --repo=<owner/repo> --sha=<commit_sha> [--strict]
 *
 * Enforces architectural boundaries as a mandatory Status Check on Pull Requests.
 * Validates PR commit diffs against repository ADRs and causal invariants.
 *
 * Returns exit code 0 on clearance, or 1 on blocked architectural violations.
 */

import { execFileSync } from 'child_process';
import path from 'path';
import { runCheck } from './checkCommand.js';

export async function runGate(options = {}) {
  console.log('\n======================================================');
  console.log('🛡️  CAVDAX Architectural Invariant Gate');
  console.log('======================================================');
  console.log(`   Repository : ${options.repo || process.env.GITHUB_REPOSITORY || 'local'}`);
  console.log(`   Commit SHA : ${options.sha || process.env.GITHUB_SHA || 'HEAD'}`);
  console.log(`   Strict Mode: ${options.strict ? 'ENABLED (Fail on unreachable)' : 'STANDARD'}\n`);

  const serverUrl = process.env.CAVDAX_SERVER_URL || '';
  const apiKey = process.env.CAVDAX_API_KEY || '';
  const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS || options.strict);

  // 1. Security Check: Validate commit SHA format to prevent command injection
  if (options.sha) {
    const trimmedSha = String(options.sha).trim();
    if (!/^[0-9a-f]{7,40}$/i.test(trimmedSha)) {
      console.error(`   ⛔ Security Error: Invalid commit SHA format "${options.sha}". Expected 7-40 hex characters.`);
      return false;
    }
    options.sha = trimmedSha;
  }

  let remoteDecisions = null;

  // 2. If remote CAVDAX server is configured, perform remote tenant verification
  if (serverUrl && options.repo) {
    try {
      console.log(`   Connecting to verification engine at ${serverUrl}...`);
      const [owner, name] = options.repo.split('/');
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'CAVDAX-Gate-Runner/1.2.4'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['X-CAVDAX-API-KEY'] = apiKey;
      }

      const res = await fetch(`${serverUrl}/api/github/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/adrs`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`   ✅ CAVDAX Server synchronized (${data.count || 0} active ADRs registered in graph).`);
        // Decision statuses from the server's graph are the source of truth when no local graph exists.
        remoteDecisions = {};
        for (const n of (data.graph?.nodes || [])) {
          if (n.label === 'Decision' && n.id) remoteDecisions[n.id] = n.status;
        }
      } else if (res.status === 401 || res.status === 403) {
        console.error(`   ⛔ CAVDAX API Key authentication failure (${res.status}). Authorization denied.`);
        if (isCi) {
          console.error('      Failing closed in CI: Provide a valid CAVDAX_API_KEY secret.');
          return false;
        }
      } else {
        console.warn(`   ⚠️  Remote server response ${res.status}. Falling back to local causal verification.`);
        if (options.strict) {
          console.error('      --strict is set: failing closed on non-OK server response.');
          return false;
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  Remote CAVDAX endpoint unreachable (${err.message}). Falling back to local causal verification.`);
      if (options.strict) {
        console.error('   ⛔ Strict mode enabled: failing closed due to unreachable verification server.');
        return false;
      }
    }
  }

  // 3. Determine changed files safely without shell interpolation
  let changedFiles = [];
  try {
    if (options.sha) {
      const output = execFileSync('git', ['diff-tree', '--no-commit-id', '--name-only', '-r', options.sha], { encoding: 'utf-8' });
      changedFiles = output.trim().split('\n').map(s => s.trim()).filter(Boolean);
    } else {
      const output = execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { encoding: 'utf-8' });
      changedFiles = output.trim().split('\n').map(s => s.trim()).filter(Boolean);
    }
  } catch {
    try {
      const output = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf-8' });
      changedFiles = output.trim().split('\n').map(s => s.trim()).filter(Boolean);
    } catch {
      changedFiles = [];
    }
  }

  console.log(`   Scanned ${changedFiles.length} file(s) changed in commit.`);

  // 4. Delegate verification with explicit files list
  const passed = await runCheck({
    ...options,
    files: changedFiles,
    remoteDecisions
  });

  if (passed) {
    console.log('\n✅ CAVDAX Architectural Gate: All invariants verified. Clearance granted.\n');
  } else {
    console.error('\n⛔ CAVDAX Architectural Gate: Invariant violations detected. Status check failed.\n');
  }

  return passed;
}
