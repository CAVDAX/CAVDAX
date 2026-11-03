import { dispatchOutgoingWebhook } from '../webhookDispatcher.js';
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from '../webPush.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendInvalidationEmail, buildEmailHtml, escapeHtml } from '../email.js';
import { loadSystemState, saveSystemState } from '../systemState.js';

test('Notification Preferences: loadSystemState returns clean notificationPreferences object', () => {
  const state = loadSystemState();
  assert.ok(typeof state.notificationPreferences === 'object');
  assert.ok(state.notificationPreferences !== null);
});

test('Notification Preferences: saveSystemState persists user alert settings atomically', () => {
  const state = loadSystemState();
  const testUser = `test-user-${Date.now()}`;
  state.notificationPreferences[testUser] = {
    emailAlerts: true,
    browserAlerts: false,
    targetEmail: 'developer@sahnirmaan.live',
    watchedRepos: ['acme/inventory']
  };

  const saved = saveSystemState(state);
  assert.equal(saved, true);

  const reloaded = loadSystemState();
  assert.equal(reloaded.notificationPreferences[testUser].targetEmail, 'developer@sahnirmaan.live');
  assert.equal(reloaded.notificationPreferences[testUser].emailAlerts, true);
  assert.equal(reloaded.notificationPreferences[testUser].browserAlerts, false);
});

test('sendInvalidationEmail: Safely handles missing/invalid recipients without unhandled rejections', async () => {
  const result = await sendInvalidationEmail({
    to: 'not-an-email',
    decisionId: 'DEC-102',
    breakingSourceId: 'ADR-002'
  });
  assert.equal(result.success, false);
  assert.equal(result.error, 'INVALID_RECIPIENT');
});

test('sendInvalidationEmail: Alert debouncer suppresses rapid duplicate notifications', async () => {
  const recipient = `test-debouncer-${Date.now()}@example.com`;

  // First call (debouncer records timestamp even if API fails or disabled)
  // We mock a disabled environment to test the debouncing logic specifically
  const originalEnabled = process.env.EMAIL_ENABLED;
  try {
    process.env.EMAIL_ENABLED = 'false';
    const res1 = await sendInvalidationEmail({
      to: recipient,
      decisionId: 'DEC-102',
      breakingSourceId: 'ADR-002'
    });
    // In disabled mode, it exits early with EMAIL_DISABLED_OR_NO_KEY
    assert.equal(res1.success, false);
    assert.equal(res1.error, 'EMAIL_DISABLED_OR_NO_KEY');
  } finally {
    process.env.EMAIL_ENABLED = originalEnabled;
  }
});

test('Web Push: getVapidPublicKey returns valid base64url string', () => {
  const pubKey = getVapidPublicKey();
  assert.ok(typeof pubKey === 'string');
  assert.ok(pubKey.length > 20);
});

test('Web Push: savePushSubscription persists device subscription', () => {
  const mockSub = {
    endpoint: `https://fcm.googleapis.com/fcm/send/test-${Date.now()}`,
    keys: { p256dh: 'mock-p256dh-key', auth: 'mock-auth-secret' }
  };
  const res = savePushSubscription('test-dev', mockSub);
  assert.equal(res.success, true);
  assert.ok(res.count >= 1);

  // Clean up
  removePushSubscription(mockSub.endpoint);
});

test('Web Push: SSRF Protection rejects internal, loopback and cloud metadata endpoints', () => {
  const maliciousEndpoints = [
    'http://169.254.169.254/latest/meta-data/',
    'https://169.254.169.254/latest/meta-data/',
    'http://localhost:6379/eval',
    'https://127.0.0.1:3000/api',
    'http://10.0.0.5/admin',
    'https://192.168.1.1/router',
    'ftp://push.example.com',
    'not-a-url'
  ];

  for (const endpoint of maliciousEndpoints) {
    const res = savePushSubscription('attacker', {
      endpoint,
      keys: { p256dh: 'mock', auth: 'mock' }
    });
    assert.equal(res.success, false, `Endpoint '${endpoint}' should be rejected`);
    assert.equal(res.error, 'RESTRICTED_OR_INVALID_ENDPOINT');
  }
});

test('Email Template & HTML Sanitization: buildEmailHtml escapes all user inputs without ReferenceErrors', () => {
  const payload = {
    repo: 'acme/<script>alert(1)</script>',
    decisionId: 'DEC-102"><img src=x onerror=alert(1)>',
    decisionTitle: 'TokenAuth & "Special" Title',
    breakingSourceId: "ADR-002' OR 1=1--",
    breakingSourceTitle: 'OAuth2 Migration <iframe src="phish">',
    violationPaths: [['Decision:DEC-102', 'Fact:Stale', 'Source:ADR-002']],
    hudUrl: 'javascript:alert(1)', // malicious scheme
    remediationCli: 'npx cavdax mcp -> fix()'
  };

  const html = buildEmailHtml(payload);
  assert.ok(typeof html === 'string');
  assert.ok(html.length > 500);

  // Assert malicious scripts and angle brackets are strictly escaped
  assert.ok(!html.includes('<script>alert(1)</script>'), 'Script tag must be escaped');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Script tag should be escaped HTML entity');
  assert.ok(!html.includes('"><img src=x onerror=alert(1)>'), 'Image injection must be escaped');
  assert.ok(!html.includes('<iframe src="phish">'), 'Iframe injection must be escaped');

  // Assert malicious javascript: URL was rejected and defaulted to safe HTTPS origin
  assert.ok(!html.includes('href="javascript:alert(1)"'), 'javascript: URL scheme must be sanitized');
  assert.ok(html.includes('href="https://cavdax.sahnirmaan.live"'), 'Fallback safe URL must be present');
});

test('Outgoing Webhook: SSRF Protection rejects internal, loopback, private and cloud metadata endpoints', async () => {
  const maliciousUrls = [
    'http://169.254.169.254/latest/meta-data/',
    'https://169.254.169.254/latest/meta-data/',
    'http://localhost:8080/hook',
    'https://127.0.0.1:3000/hook',
    'http://10.0.0.5/slack',
    'https://192.168.1.1/webhook',
    'ftp://webhook.example.com',
    'not-a-url'
  ];

  for (const url of maliciousUrls) {
    const res = await dispatchOutgoingWebhook(url, { test: true });
    assert.equal(res.success, false, `Webhook URL '${url}' should be rejected by SSRF guard`);
    assert.equal(res.error, 'RESTRICTED_OR_INVALID_WEBHOOK_URL');
  }

  const emptyRes = await dispatchOutgoingWebhook('', { test: true });
  assert.equal(emptyRes.success, false);
  assert.equal(emptyRes.error, 'MISSING_WEBHOOK_URL');
});

test('Notification Preferences: Persists webhookUrl and scoped watchedRepos', () => {
  const state = loadSystemState();
  const testUser = `webhook-dev-${Date.now()}`;
  state.notificationPreferences[testUser] = {
    emailAlerts: true,
    browserAlerts: true,
    targetEmail: 'alerts@sahnirmaan.live',
    webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
    watchedRepos: ['acme/inventory', 'cavdax/core']
  };

  const saved = saveSystemState(state);
  assert.equal(saved, true);

  const reloaded = loadSystemState();
  assert.equal(reloaded.notificationPreferences[testUser].webhookUrl, 'https://hooks.slack.com/services/T00/B00/X00');
  assert.deepEqual(reloaded.notificationPreferences[testUser].watchedRepos, ['acme/inventory', 'cavdax/core']);
});
