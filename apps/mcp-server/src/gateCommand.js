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

import { execSync } from 'child_process';
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

  // 1. If remote CAVDAX server is configured, perform remote tenant verification
  if (serverUrl && options.repo) {
    try {
      console.log(`   Connecting to verification engine at ${serverUrl}...`);
      const [owner, name] = options.repo.split('/');
      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'CAVDAX-Gate-Runner/1.2.3'
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
      } else if (res.status === 401 || res.status === 403) {
        console.warn(`   ⚠️  CAVDAX API Key authentication notice (${res.status}). Falling back to local causal engine.`);
      } else {
        console.warn(`   ⚠️  Remote server response ${res.status}. Falling back to local causal verification.`);
      }
    } catch (err) {
      console.warn(`   ⚠️  Remote CAVDAX endpoint unreachable (${err.message}). Falling back to local causal verification.`);
      if (options.strict) {
        console.error('   ⛔ Strict mode enabled: failing closed due to unreachable verification server.');
        return false;
      }
    }
  }

  // 2. Delegate file and decision reference checking to checkCommand
  // If in PR context, pass the git diff options
  const checkOptions = {
    ...options,
    staged: false
  };

  // Determine changed files in commit
  try {
    const diffCmd = options.sha 
      ? `git diff-tree --no-commit-id --name-only -r ${options.sha}` 
      : 'git diff --name-only origin/main...HEAD';
    const changedFiles = execSync(diffCmd, { encoding: 'utf-8' }).trim().split('\n').filter(Boolean);
    console.log(`   Scanned ${changedFiles.length} file(s) changed in commit.`);
  } catch {
    // If git diff-tree fails (e.g. shallow clone), check staged/modified
    checkOptions.staged = true;
  }

  const passed = await runCheck(checkOptions);

  if (passed) {
    console.log('\n✅ CAVDAX Architectural Gate: All invariants verified. Clearance granted.\n');
  } else {
    console.error('\n⛔ CAVDAX Architectural Gate: Invariant violations detected. Status check failed.\n');
  }

  return passed;
}
