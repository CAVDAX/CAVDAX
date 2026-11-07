import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGate } from '../../mcp-server/src/gateCommand.js';
import { runCheck, isScannableFile } from '../../mcp-server/src/checkCommand.js';
import { detectUnsyncedSupersessions } from '../githubAdr.js';

test('CI Gate Security: Reject command injection attempt in commit SHA', async () => {
  const maliciousSha = 'HEAD; touch /tmp/PWNED_INJECTION';
  const passed = await runGate({ repo: 'test/repo', sha: maliciousSha, strict: true });
  assert.equal(passed, false, 'Command injection in SHA must be rejected immediately');
});

test('CI Gate Security: Reject invalid SHA format characters', async () => {
  const invalidSha = 'not-a-valid-sha-xyz!@#';
  const passed = await runGate({ repo: 'test/repo', sha: invalidSha, strict: true });
  assert.equal(passed, false, 'Malformed SHA must return false');
});

test('checkCommand: isScannableFile includes monorepo app source files', () => {
  assert.equal(isScannableFile('apps/server/index.js'), true, 'apps/server source files must be scannable');
  assert.equal(isScannableFile('apps/client/src/App.jsx'), true, 'apps/client source files must be scannable');
  assert.equal(isScannableFile('core/graph/queries.js'), true, 'core source files must be scannable');
  assert.equal(isScannableFile('services/payment/pay.py'), true, 'services source files must be scannable');
  
  // Excluded files
  assert.equal(isScannableFile('package-lock.json'), false, 'lockfiles must be excluded');
  assert.equal(isScannableFile('apps/server/node_modules/express/index.js'), false, 'node_modules must be excluded');
  assert.equal(isScannableFile('apps/client/dist/assets/index.js'), false, 'dist outputs must be excluded');
  assert.equal(isScannableFile('apps/server/test/index.test.mjs'), false, 'test files must be excluded');
  assert.equal(isScannableFile('README.md'), false, 'docs must be excluded');
});

test('checkCommand: runCheck processes explicit files list without usage bailout', async () => {
  const files = ['apps/server/dummy_non_existent.js'];
  // When files array is provided with non-existent / empty files, it should not bail with usage
  const result = await runCheck({ files });
  assert.equal(result, true, 'Files with no decision violations should pass clearance');
});

test('detectUnsyncedSupersessions: PROPOSED ADR does NOT mark target ADR as superseded', () => {
  const adrs = [
    {
      id: 'ADR-001',
      title: 'Original Active ADR',
      status: 'ACCEPTED',
      path: 'docs/adrs/ADR-001.md',
      supersedes: []
    },
    {
      id: 'ADR-002',
      title: 'Proposed Future Superseder',
      status: 'PROPOSED',
      path: 'docs/adrs/ADR-002.md',
      supersedes: ['ADR-001']
    }
  ];

  const unsynced = detectUnsyncedSupersessions(adrs);
  assert.equal(unsynced.length, 0, 'PROPOSED ADR must not trigger status sync on accepted ADR');
});

test('detectUnsyncedSupersessions: ACCEPTED ADR correctly marks target ADR as superseded', () => {
  const adrs = [
    {
      id: 'ADR-001',
      title: 'Original Active ADR',
      status: 'ACCEPTED',
      path: 'docs/adrs/ADR-001.md',
      supersedes: []
    },
    {
      id: 'ADR-002',
      title: 'Merged Superseding ADR',
      status: 'ACCEPTED',
      path: 'docs/adrs/ADR-002.md',
      supersedes: ['ADR-001']
    }
  ];

  const unsynced = detectUnsyncedSupersessions(adrs);
  assert.equal(unsynced.length, 1, 'ACCEPTED ADR must identify unsynced superseded target');
  assert.equal(unsynced[0].targetId, 'ADR-001');
  assert.equal(unsynced[0].supersedingId, 'ADR-002');
});

test('checkCommand: remoteDecisions blocks stale and unknown decisions, passes valid ones (no FalkorDB)', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-gate-'));
  const mk = (name, body) => { const p = path.join(dir, name); fs.writeFileSync(p, body); return p; };
  const stale = mk('stale.js', '// grounded in DEC-101\n');
  const valid = mk('valid.js', '// grounded in DEC-102\n');
  const unknown = mk('unknown.js', '// grounded in DEC-999\n');

  const prevPort = process.env.FALKORDB_PORT;
  const prevCi = process.env.CI;
  process.env.FALKORDB_PORT = '6399';
  process.env.CI = 'true';
  try {
    const remoteDecisions = { 'DEC-101': 'INVALIDATED_NEEDS_REVALIDATION', 'DEC-102': 'VALID' };
    assert.equal(await runCheck({ files: [stale], remoteDecisions }), false, 'stale decision must block');
    assert.equal(await runCheck({ files: [valid], remoteDecisions }), true, 'valid decision must pass');
    assert.equal(await runCheck({ files: [unknown], remoteDecisions }), false, 'decision unknown to the server must fail closed');
    assert.equal(await runCheck({ files: [valid] }), false, 'without any graph source CI still fails closed');
  } finally {
    if (prevPort === undefined) delete process.env.FALKORDB_PORT; else process.env.FALKORDB_PORT = prevPort;
    if (prevCi === undefined) delete process.env.CI; else process.env.CI = prevCi;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
