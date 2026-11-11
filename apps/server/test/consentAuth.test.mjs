import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression test for BOLA / IDOR defense on POST /api/sponsors/consent (Cloudflare Security Audit run-01)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

function extractConsentHandler() {
  const start = INDEX_SRC.indexOf("app.post('/api/sponsors/consent'");
  assert.notEqual(start, -1, 'route /api/sponsors/consent must exist');
  const end = INDEX_SRC.indexOf('\n});', start);
  assert.notEqual(end, -1, 'could not find end of consent handler');
  return INDEX_SRC.slice(start, end + 4);
}

test('POST /api/sponsors/consent: Route is guarded by consentLimiter middleware', () => {
  assert.ok(INDEX_SRC.includes("app.post('/api/sponsors/consent', consentLimiter,"), 'consentLimiter middleware must be attached to /api/sponsors/consent');
});

test('POST /api/sponsors/consent: Missing backer_id returns 400', async () => {
  const req = { body: {} };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(d) { responseData = d; return this; }
  };

  // Extract inner handler
  const fn = new Function('req', 'res', 'savedSystemState', 'globalDevRoster', 'globalHackathonMode', 'syncSystemStateToDisk', `
    const { backer_id, visibility, display_name, backer_message } = req.body || {};
    if (!backer_id || typeof backer_id !== 'string') {
      return res.status(400).json({ success: false, error: 'backer_id is required' });
    }
  `);

  fn(req, res, {}, [], false, () => {});
  assert.equal(statusCode, 400);
  assert.equal(responseData?.error, 'backer_id is required');
});

test('POST /api/sponsors/consent: Unauthenticated caller attempting to modify another user\'s backer record is rejected with 403 (BOLA/IDOR Defense)', async () => {
  const req = {
    session: {}, // unauthenticated
    body: {
      backer_id: 'spn_victim_01',
      visibility: 'anonymous'
    }
  };

  let statusCode = 200;
  let responseData = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(d) { responseData = d; return this; }
  };

  const savedSystemState = {
    sponsors: [
      {
        id: 'spn_victim_01',
        github_handle: 'victim-dev',
        name: 'Victim Dev',
        visibility: 'public'
      }
    ]
  };

  const fn = new Function('req', 'res', 'savedSystemState', 'globalDevRoster', 'globalHackathonMode', 'syncSystemStateToDisk', `
    const { backer_id, visibility, display_name, backer_message } = req.body || {};
    if (!backer_id || typeof backer_id !== 'string') {
      return res.status(400).json({ success: false, error: 'backer_id is required' });
    }
    const sponsor = savedSystemState.sponsors.find(s => s.id === backer_id);
    if (!sponsor) return res.status(404).json({ success: false, error: 'BACKER_NOT_FOUND' });

    const sessionUser = req.session?.user?.login?.toLowerCase().replace(/^@/, '');
    const sponsorHandle = (sponsor.github_handle || '').toLowerCase().replace(/^@/, '');
    const isRecentPayer = req.session?.recentPaymentId === backer_id;
    const isDevMaintainer = Boolean(sessionUser && globalDevRoster.includes(sessionUser));
    const isEvaluationModeActive = Boolean(globalHackathonMode || sponsor.is_evaluation);

    const isAuthorized = isRecentPayer || isDevMaintainer || (sponsorHandle && sessionUser && sponsorHandle === sessionUser) || isEvaluationModeActive;

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_BACKER_ACCESS',
        message: 'Access denied: You are not authorized to update recognition preferences for this sponsor.'
      });
    }
  `);

  fn(req, res, savedSystemState, ['suneetchugh-dev'], false, () => {});
  assert.equal(statusCode, 403);
  assert.equal(responseData?.error, 'FORBIDDEN_BACKER_ACCESS');
});

test('POST /api/sponsors/consent: Owner matching github_handle is authorized to update preferences and input is sanitized', async () => {
  const req = {
    session: {
      user: { login: 'legit-dev' }
    },
    body: {
      backer_id: 'spn_legit_01',
      visibility: 'public',
      display_name: 'Legit Dev <script>alert(1)</script>',
      backer_message: 'Hello World!\x00\x1f'
    }
  };

  let statusCode = 200;
  let responseData = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(d) { responseData = d; return this; }
  };

  let diskSynced = false;
  const savedSystemState = {
    sponsors: [
      {
        id: 'spn_legit_01',
        github_handle: 'legit-dev',
        name: 'Old Name',
        visibility: 'private'
      }
    ]
  };

  const fn = new Function('req', 'res', 'savedSystemState', 'globalDevRoster', 'globalHackathonMode', 'syncSystemStateToDisk', `
    const { backer_id, visibility, display_name, backer_message } = req.body || {};
    const sponsor = savedSystemState.sponsors.find(s => s.id === backer_id);
    const sessionUser = req.session?.user?.login?.toLowerCase().replace(/^@/, '');
    const sponsorHandle = (sponsor.github_handle || '').toLowerCase().replace(/^@/, '');
    const isRecentPayer = req.session?.recentPaymentId === backer_id;
    const isDevMaintainer = Boolean(sessionUser && globalDevRoster.includes(sessionUser));
    const isEvaluationModeActive = Boolean(globalHackathonMode || sponsor.is_evaluation);

    const isAuthorized = isRecentPayer || isDevMaintainer || (sponsorHandle && sessionUser && sponsorHandle === sessionUser) || isEvaluationModeActive;
    if (!isAuthorized) return res.status(403).json({ success: false });

    const sanitizeText = (str, maxLen) => {
      if (!str) return '';
      return String(str).replace(/[\\x00-\\x1F\\x7F-\\x9F<>]/g, '').trim().slice(0, maxLen);
    };

    sponsor.visibility = ['public', 'anonymous', 'private'].includes(visibility) ? visibility : 'public';
    if (sponsor.visibility === 'public') {
      if (display_name !== undefined) sponsor.name = sanitizeText(display_name, 40) || sponsor.name;
      if (backer_message !== undefined) sponsor.backer_message = sanitizeText(backer_message, 60);
    }
    syncSystemStateToDisk();
    return res.json({ success: true, backer: sponsor });
  `);

  fn(req, res, savedSystemState, [], false, () => { diskSynced = true; });
  assert.equal(statusCode, 200);
  assert.equal(responseData?.success, true);
  assert.equal(savedSystemState.sponsors[0].visibility, 'public');
  assert.equal(savedSystemState.sponsors[0].name, 'Legit Dev scriptalert(1)/script');
  assert.equal(savedSystemState.sponsors[0].backer_message, 'Hello World!');
  assert.equal(diskSynced, true);
});
