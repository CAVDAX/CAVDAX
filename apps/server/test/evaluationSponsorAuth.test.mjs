import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

function extractEvalSponsorHandler() {
  const start = INDEX_SRC.indexOf("app.post('/api/billing/activate-evaluation-sponsor'");
  assert.notEqual(start, -1, '/api/billing/activate-evaluation-sponsor route must exist in index.js');
  const end = INDEX_SRC.indexOf('\n});', start);
  assert.notEqual(end, -1, 'could not find end of /api/billing/activate-evaluation-sponsor handler');
  return INDEX_SRC.slice(start, end + 4);
}

function callEvalSponsor({
  body = {},
  session = {},
  globalHackathonMode = true,
  savedSystemState = { sponsors: [] }
} = {}) {
  let handler;
  const broadcastEvents = [];
  const stubs = {
    app: {
      post: (_p, ...args) => {
        handler = args[args.length - 1];
      }
    },
    checkEvaluationPassAuthorized: () => globalHackathonMode,
    savedSystemState,
    broadcastEvent: (evt, data) => broadcastEvents.push({ evt, data }),
    console: {
      log: () => {},
      error: () => {},
      warn: () => {}
    }
  };

  new Function(...Object.keys(stubs), extractEvalSponsorHandler())(...Object.values(stubs));

  const out = { status: 200, body: undefined };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; }
  };
  const req = {
    body,
    session,
    headers: {}
  };

  handler(req, res);
  return { ...out, broadcastEvents, savedSystemState };
}

test('activate-evaluation-sponsor: rejects unauthenticated guest requests with 401 UNAUTHORIZED', () => {
  const res = callEvalSponsor({
    body: { tier_id: 2 },
    session: {} // No user in session, no user_override
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
  assert.match(res.body.error?.message, /requires a connected GitHub account/);
});

test('activate-evaluation-sponsor: accepts authenticated session and binds user identity to backer record', () => {
  const mockUser = {
    id: 12345,
    login: 'judge-reviewer',
    name: 'Judge Reviewer',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345?v=4'
  };

  const savedSystemState = { sponsors: [] };
  const res = callEvalSponsor({
    body: { tier_id: 3 },
    session: { user: mockUser },
    savedSystemState
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.sponsor_tier, 'Core Supporter');
  assert.equal(res.body.is_evaluation, true);
  assert.equal(res.body.backer.github_handle, 'judge-reviewer');
  assert.equal(res.body.backer.name, 'Judge Reviewer');
  assert.equal(res.body.backer.avatar_url, 'https://avatars.githubusercontent.com/u/12345?v=4');
  assert.equal(res.body.backer.id, 'spn_eval_12345');
  assert.equal(savedSystemState.sponsors.length, 1);
});

test('activate-evaluation-sponsor: validates tier_id must be 1, 2, or 3', () => {
  const mockUser = { id: 999, login: 'dev-eval' };
  const res = callEvalSponsor({
    body: { tier_id: 99 },
    session: { user: mockUser }
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'INVALID_TIER');
});
