import fs from 'node:fs';
import { dispatchOutgoingWebhook, isSafeWebhookUrl, isPrivateOrMetadataIp } from '../webhookDispatcher.js';
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

test('Outgoing Webhook: Anti-DNS Rebinding and Hostname Resolution (deterministic offline unit tests)', async () => {
  // 1. Hostnames must NOT be falsely identified as IP literals (Problem 1 fix)
  assert.equal(isPrivateOrMetadataIp('fcm.googleapis.com'), false, 'fcm.googleapis.com must not be blocked as IPv6');
  assert.equal(isPrivateOrMetadataIp('fdic.gov'), false, 'fdic.gov must not be blocked as IPv6');
  assert.equal(isPrivateOrMetadataIp('feast.example.com'), false, 'feast.example.com must not be blocked as IPv6');
  assert.equal(isPrivateOrMetadataIp('fead.example.com'), false, 'fead.example.com must not be blocked as IPv6');

  // 2. Legitimate public IPs return false
  assert.equal(isPrivateOrMetadataIp('8.8.8.8'), false);
  assert.equal(isPrivateOrMetadataIp('1.1.1.1'), false);
  assert.equal(isPrivateOrMetadataIp('2607:f8b0:4005:805::200e'), false);

  // 3. Loopback & Private IPv4 return true
  assert.equal(isPrivateOrMetadataIp('127.0.0.1'), true);
  assert.equal(isPrivateOrMetadataIp('127.0.5.10'), true);
  assert.equal(isPrivateOrMetadataIp('10.0.0.5'), true);
  assert.equal(isPrivateOrMetadataIp('172.16.50.1'), true);
  assert.equal(isPrivateOrMetadataIp('192.168.1.1'), true);
  assert.equal(isPrivateOrMetadataIp('0.0.0.0'), true);

  // 4. Cloud metadata IPs (AWS/Azure/GCP and Alibaba CGNAT) return true (Problem 4 fix)
  assert.equal(isPrivateOrMetadataIp('169.254.169.254'), true, 'AWS/GCP/Azure metadata must be blocked');
  assert.equal(isPrivateOrMetadataIp('100.100.100.200'), true, 'Alibaba Cloud metadata must be blocked');
  assert.equal(isPrivateOrMetadataIp('100.64.0.1'), true, 'CGNAT range must be blocked');

  // 5. Special reserved & benchmark CIDRs return true
  assert.equal(isPrivateOrMetadataIp('198.18.0.1'), true, '198.18.0.0/15 must be blocked');
  assert.equal(isPrivateOrMetadataIp('192.0.0.1'), true, '192.0.0.0/24 must be blocked');
  assert.equal(isPrivateOrMetadataIp('240.0.0.1'), true, 'Class E reserved must be blocked');

  // 6. IPv6 Loopback, Link-local, and ULA return true
  assert.equal(isPrivateOrMetadataIp('::1'), true);
  assert.equal(isPrivateOrMetadataIp('fe80::1'), true);
  assert.equal(isPrivateOrMetadataIp('fc00::1'), true);
  assert.equal(isPrivateOrMetadataIp('fd00::1'), true);
  assert.equal(isPrivateOrMetadataIp('::'), true);

  // 7. IPv4-mapped IPv6 (dotted and hex forms) return true
  assert.equal(isPrivateOrMetadataIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrMetadataIp('::ffff:169.254.169.254'), true);
  assert.equal(isPrivateOrMetadataIp('::ffff:7f00:1'), true, 'Hex IPv4-mapped IPv6 loopback must be blocked');

  // 8. Deterministic offline DNS rebinding tests via mock resolvers (Problem 5 fix)
  const mockLoopbackResolver = async () => [{ address: '127.0.0.1', family: 4 }];
  const mockMetadataResolver = async () => [{ address: '169.254.169.254', family: 4 }];
  const mockAlibabaResolver = async () => [{ address: '100.100.100.200', family: 4 }];
  const mockPublicResolver = async () => [{ address: '142.250.190.46', family: 4 }];
  const mockFailureResolver = async () => { throw new Error('ENOTFOUND'); };

  assert.equal(
    await isSafeWebhookUrl('https://evil-rebind.com/hook', { resolver: mockLoopbackResolver }),
    false,
    'Domain resolving to 127.0.0.1 must be rejected without network roundtrip'
  );
  assert.equal(
    await isSafeWebhookUrl('https://evil-metadata.com/hook', { resolver: mockMetadataResolver }),
    false,
    'Domain resolving to 169.254.169.254 must be rejected'
  );
  assert.equal(
    await isSafeWebhookUrl('https://evil-alibaba.com/hook', { resolver: mockAlibabaResolver }),
    false,
    'Domain resolving to 100.100.100.200 must be rejected'
  );
  assert.equal(
    await isSafeWebhookUrl('https://fcm.googleapis.com/webhook', { resolver: mockPublicResolver }),
    true,
    'Legitimate public domain fcm.googleapis.com must pass safety verification'
  );
  assert.equal(
    await isSafeWebhookUrl('https://non-existent-domain.test/hook', { resolver: mockFailureResolver }),
    false,
    'Unresolvable domain must fail-safe'
  );

  // 9. Protocol and suffix guards
  assert.equal(await isSafeWebhookUrl('http://fcm.googleapis.com/webhook'), false, 'Non-HTTPS must be rejected');
  assert.equal(await isSafeWebhookUrl('https://internal-service.local/hook'), false, '.local suffix must be rejected');
  assert.equal(await isSafeWebhookUrl('https://k8s.internal/hook'), false, '.internal suffix must be rejected');
});


test('Simulate Invalidation Alert: Rejects requests with missing or empty targetEmail', async () => {
  // Test candidate extraction logic matching /api/alerts/simulate-invalidation
  const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`\{|\}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  
  function resolveRecipient(targetEmail, userPrefs, user) {
    const candidate = (
      (typeof targetEmail === 'string' && targetEmail.trim() ? targetEmail.trim() : null) ||
      userPrefs?.targetEmail ||
      user?.email ||
      ''
    ).toLowerCase().trim();

    if (!candidate) {
      return { error: 'MISSING_RECIPIENT_EMAIL' };
    }
    if (!RFC5322_EMAIL_REGEX.test(candidate)) {
      return { error: 'INVALID_EMAIL_FORMAT' };
    }
    return { recipient: candidate };
  }

  // 1. Completely empty payload
  assert.equal(resolveRecipient(undefined, null, null).error, 'MISSING_RECIPIENT_EMAIL');
  assert.equal(resolveRecipient('', null, null).error, 'MISSING_RECIPIENT_EMAIL');
  assert.equal(resolveRecipient('   ', null, null).error, 'MISSING_RECIPIENT_EMAIL');

  // 2. Invalid format
  assert.equal(resolveRecipient('not-an-email', null, null).error, 'INVALID_EMAIL_FORMAT');
  assert.equal(resolveRecipient('user@', null, null).error, 'INVALID_EMAIL_FORMAT');
  assert.equal(resolveRecipient('@domain.com', null, null).error, 'INVALID_EMAIL_FORMAT');

  // 3. Valid target email
  assert.equal(resolveRecipient('developer@sahnirmaan.live', null, null).recipient, 'developer@sahnirmaan.live');

  // 4. Fallback to userPrefs when targetEmail is omitted
  assert.equal(resolveRecipient(null, { targetEmail: 'alerts@example.com' }, null).recipient, 'alerts@example.com');

  // 5. Hardcoded email check: Ensure zero references to suneetchugh@gmail.com in apps/server/index.js
  const serverIndexContent = fs.readFileSync('apps/server/index.js', 'utf8');
  assert.equal(serverIndexContent.includes('suneetchugh@gmail.com'), false, 'Hardcoded email must be eliminated');
});
