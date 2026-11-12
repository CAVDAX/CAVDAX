/**
 * scripts/test-ci.mjs — Cross-Platform Local CI Verification Runner
 *
 * Simulates a full headless GitHub Actions CI run on local workstations:
 * 1. Injects CI=true and GITHUB_ACTIONS=true into process.env
 * 2. Runs the Server test suite: node --test apps/server/test/*.test.mjs
 * 3. Runs the MCP package test suite: node --test apps/mcp-server/test/*.test.mjs
 * 4. Runs the mechanical README audit: python scripts/audit_readme.py --strict
 *
 * Guarantees zero CI environment drift between local dev and remote runners.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================================');
console.log('       CAVDAX LOCAL HEADLESS CI SIMULATION RUNNER                       ');
console.log('========================================================================');
console.log('Simulating CI runner environment (CI=true, GITHUB_ACTIONS=true)...');

const env = {
  ...process.env,
  CI: 'true',
  GITHUB_ACTIONS: 'true'
};

const serverTestDir = path.join(rootDir, 'apps', 'server', 'test');
const serverTestFiles = fs.existsSync(serverTestDir)
  ? fs.readdirSync(serverTestDir)
      .filter(f => f.endsWith('.test.mjs'))
      .map(f => path.join('apps', 'server', 'test', f))
  : [];

const mcpTestDir = path.join(rootDir, 'apps', 'mcp-server', 'test');
const mcpTestFiles = fs.existsSync(mcpTestDir)
  ? fs.readdirSync(mcpTestDir)
      .filter(f => f.endsWith('.test.mjs'))
      .map(f => path.join('apps', 'mcp-server', 'test', f))
  : [];

const tasks = [
  {
    name: 'Server & ADR Security Tests',
    cmd: process.execPath,
    args: ['--test', ...serverTestFiles],
    cwd: rootDir
  },
  {
    name: 'MCP Server Package Tests',
    cmd: process.execPath,
    args: ['--test', ...mcpTestFiles],
    cwd: rootDir
  },
  {
    name: 'Mechanical Anti-Slop README Invariant Gate',
    cmd: 'python',
    args: ['scripts/audit_readme.py', '--strict'],
    cwd: rootDir
  }
];

let failed = false;

for (const task of tasks) {
  console.log(`\n▶ Running: ${task.name}...`);
  try {
    execFileSync(task.cmd, task.args, {
      cwd: task.cwd,
      env,
      stdio: 'inherit'
    });
    console.log(`✅ ${task.name} passed.`);
  } catch (err) {
    console.error(`\n❌ Task failed: ${task.name} (exit code ${err.status ?? 1})`);
    failed = true;
    break;
  }
}

if (failed) {
  console.error('\n========================================================================');
  console.error('  VERDICT: CI SIMULATION FAILED. DO NOT COMMIT OR PUSH.');
  console.error('========================================================================\n');
  process.exit(1);
} else {
  console.log('\n========================================================================');
  console.log('  VERDICT: ALL CI SIMULATION GATES PASSED (100% READY FOR PUSH)');
  console.log('========================================================================\n');
  process.exit(0);
}
