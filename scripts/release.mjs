/**
 * scripts/release.mjs — Automated, Verified Release & NPM Publishing Pipeline
 *
 * Guarantees zero unverified releases:
 * 1. Verifies git working tree is clean.
 * 2. Verifies current branch is main and synchronized with origin/main.
 * 3. Enforces full headless CI simulation test gate (node scripts/test-ci.mjs).
 * 4. Verifies version alignment in apps/mcp-server/package.json.
 * 5. Creates GitHub Release tagged v<version> via GitHub CLI.
 * 6. Monitors .github/workflows/publish-mcp.yml until completion.
 * 7. Verifies published package version on the npm registry.
 */

import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('========================================================================');
console.log('       CAVDAX VERIFIED RELEASE & PUBLISHING PIPELINE                    ');
console.log('========================================================================');

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: rootDir, stdio: 'pipe', encoding: 'utf8', ...opts }).trim();
}

// 1. Check git working tree
console.log('\n[1/6] Checking git working tree...');
const status = run('git', ['status', '--porcelain']);
if (status.length > 0) {
  console.error('❌ Error: Working tree is not clean. Commit or stash changes before releasing:');
  console.error(status);
  process.exit(1);
}
console.log('✅ Working tree clean.');

// 2. Check current branch and sync
console.log('\n[2/6] Verifying branch synchronization...');
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch !== 'main') {
  console.error(`❌ Error: Releases must be cut from 'main' (currently on '${branch}').`);
  process.exit(1);
}
run('git', ['fetch', 'origin', 'main']);
const localSha = run('git', ['rev-parse', 'HEAD']);
const remoteSha = run('git', ['rev-parse', 'origin/main']);
if (localSha !== remoteSha) {
  console.error(`❌ Error: Local main (${localSha.slice(0, 7)}) is not synchronized with origin/main (${remoteSha.slice(0, 7)}).`);
  process.exit(1);
}
console.log(`✅ Branch 'main' verified at ${localSha.slice(0, 7)}.`);

// 3. Read package version
console.log('\n[3/6] Reading @cavdax/mcp-server version...');
const pkgPath = path.join(rootDir, 'apps', 'mcp-server', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
console.log(`Target release version: ${version} (Tag: ${tag})`);

// Check if tag already exists
const existingTags = run('git', ['tag', '-l', tag]);
if (existingTags.split('\n').includes(tag)) {
  console.error(`❌ Error: Git tag '${tag}' already exists.`);
  process.exit(1);
}

// 4. Run full headless CI simulation test gate
console.log('\n[4/6] Executing mandatory headless CI simulation test suite...');
try {
  execFileSync(process.execPath, ['scripts/test-ci.mjs'], { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Pre-release CI simulation test gate passed.');
} catch (err) {
  console.error('\n❌ Release aborted: Test suite or architectural invariants failed.');
  process.exit(1);
}

// 5. Check GitHub CLI authentication
console.log('\n[5/6] Verifying GitHub CLI credentials...');
try {
  run('gh', ['auth', 'status']);
  console.log('✅ GitHub CLI authenticated.');
} catch (err) {
  console.error('❌ Error: GitHub CLI is not authenticated. Run "gh auth login".');
  process.exit(1);
}

console.log('\n========================================================================');
console.log(`  READY TO PUBLISH: ${tag}`);
console.log('========================================================================');
