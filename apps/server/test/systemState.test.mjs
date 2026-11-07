import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolate from the real apps/server/data directory so running the tests can never
// read, overwrite or delete a developer's or server's live system_state.json.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-system-state-'));
process.env.CAVDAX_DATA_DIR = DATA_DIR;
const STATE_FILE = path.join(DATA_DIR, 'system_state.json');

const { loadSystemState, saveSystemState } = await import('../systemState.js');

function resetStateFile() {
  fs.rmSync(STATE_FILE, { force: true });
}

test.after(() => {
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('systemState: loadSystemState returns clean defaults on initial call', () => {
  resetStateFile();
  const state = loadSystemState();
  assert.equal(typeof state.hackathonMode, 'boolean');
  assert.ok(Array.isArray(state.whitelistedIps));
  assert.ok(Array.isArray(state.devRoster));
  assert.ok(Array.isArray(state.apiKeys));
  assert.ok(Array.isArray(state.auditEntries));
});

test('systemState: saveSystemState atomically persists state to disk and reloads accurately', () => {
  resetStateFile();
  const mockState = {
    hackathonMode: true,
    whitelistedIps: ['192.168.1.100', '10.0.0.1'],
    devRoster: ['test-architect', 'evaluator-judge'],
    apiKeys: [
      { keyHash: 'hash_abc123', userId: '12345', login: 'test-architect', tier: 'enterprise' }
    ],
    auditEntries: [
      { action_id: 'act-001', repo: 'test/repo', status: 'APPROVED', target_file: 'src/app.js', executed_at: Date.now() }
    ]
  };

  const saved = saveSystemState(mockState);
  assert.equal(saved, true);
  assert.ok(fs.existsSync(STATE_FILE));

  const loaded = loadSystemState();
  assert.equal(loaded.hackathonMode, true);
  assert.deepEqual(loaded.whitelistedIps, ['192.168.1.100', '10.0.0.1']);
  assert.deepEqual(loaded.devRoster, ['test-architect', 'evaluator-judge']);
  assert.equal(loaded.apiKeys.length, 1);
  assert.equal(loaded.apiKeys[0].login, 'test-architect');
  assert.equal(loaded.auditEntries.length, 1);
  assert.equal(loaded.auditEntries[0].repo, 'test/repo');
});

test('systemState: vapidKeys and pushSubscriptions round-trip through save and load', () => {
  resetStateFile();
  const state = loadSystemState();
  state.vapidKeys = { publicKey: 'PUB', privateKey: 'PRIV' };
  state.pushSubscriptions = { alice: [{ endpoint: 'https://push.example/1' }] };
  assert.equal(saveSystemState(state), true);

  const reloaded = loadSystemState();
  assert.deepEqual(reloaded.vapidKeys, { publicKey: 'PUB', privateKey: 'PRIV' });
  assert.deepEqual(reloaded.pushSubscriptions, { alice: [{ endpoint: 'https://push.example/1' }] });
});

test('systemState: a save that omits vapidKeys/pushSubscriptions/notificationPreferences preserves them on disk', () => {
  resetStateFile();
  const seeded = loadSystemState();
  seeded.vapidKeys = { publicKey: 'PUB', privateKey: 'PRIV' };
  seeded.pushSubscriptions = { alice: [{ endpoint: 'https://push.example/1' }] };
  seeded.notificationPreferences = { alice: { emailAlerts: true, watchedRepos: ['alice/app'] } };
  assert.equal(saveSystemState(seeded), true);

  // This is exactly what syncSystemStateToDisk() in index.js passes: no push/VAPID/notification fields.
  assert.equal(saveSystemState({ hackathonMode: false, whitelistedIps: ['1.2.3.4'] }), true);

  const after = loadSystemState();
  assert.deepEqual(after.vapidKeys, { publicKey: 'PUB', privateKey: 'PRIV' }, 'VAPID keys must survive');
  assert.deepEqual(after.pushSubscriptions, { alice: [{ endpoint: 'https://push.example/1' }] }, 'subscriptions must survive');
  assert.deepEqual(after.notificationPreferences, { alice: { emailAlerts: true, watchedRepos: ['alice/app'] } }, 'preferences must survive');
  assert.deepEqual(after.whitelistedIps, ['1.2.3.4'], 'fields the caller did supply are still updated');
});

test('systemState: saveSystemState() without a state object fails loudly and does not touch the file', () => {
  resetStateFile();
  assert.equal(saveSystemState({ hackathonMode: true }), true);
  const before = fs.readFileSync(STATE_FILE, 'utf8');
  assert.equal(saveSystemState(), false);
  assert.equal(fs.readFileSync(STATE_FILE, 'utf8'), before);
});
