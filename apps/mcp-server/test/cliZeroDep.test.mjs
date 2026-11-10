import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('Zero-Dependency CLI Security Invariant: bin/cavdax.js does not import commander or child_process', () => {
  const cliPath = resolve(__dirname, '../bin/cavdax.js');
  const code = readFileSync(cliPath, 'utf8');

  // Verify commander is not imported
  assert.equal(code.includes("from 'commander'"), false, 'bin/cavdax.js must not import commander');
  assert.equal(code.includes('require("commander")'), false, 'bin/cavdax.js must not require commander');

  // Verify child_process is not imported in CLI dispatcher
  assert.equal(code.includes("from 'child_process'"), false, 'bin/cavdax.js must not import child_process');
  assert.equal(code.includes("from 'node:child_process'"), false, 'bin/cavdax.js must not import node:child_process');

  // Verify native util.parseArgs is used
  assert.equal(code.includes("from 'node:util'"), true, 'bin/cavdax.js must use node:util');
  assert.equal(code.includes('parseArgs'), true, 'bin/cavdax.js must use parseArgs');
});

test('Zero-Dependency package.json Invariant: commander is removed from dependencies', () => {
  const pkgPath = resolve(__dirname, '../package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  assert.equal(pkg.dependencies.commander, undefined, 'commander must be removed from dependencies');
  assert.deepEqual(Object.keys(pkg.dependencies), ['falkordb'], 'only falkordb should remain as dependency');
});
