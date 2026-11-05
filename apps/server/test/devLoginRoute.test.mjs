import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression coverage for POST /api/auth/dev-login.
// Verifies dev PAT authentication, production rejection (OWASP A01), validation,
// CRLF injection defense, and session creation without boots or real external network calls.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

function extractDevLoginHandler() {
  const start = INDEX_SRC.indexOf("app.post('/api/auth/dev-login'");
  assert.notEqual(start, -1, '/api/auth/dev-login route must exist in index.js');
  const end = INDEX_SRC.indexOf('\n});', start);
  assert.notEqual(end, -1, 'could not find end of /api/auth/dev-login handler');
  return INDEX_SRC.slice(start, end + 4);
}

async function callDevLogin({
  body = {},
  isProduction = false,
  fetchStub = async () => ({ ok: true, json: async () => ({ id: 999, login: 'dev-user', name: 'Dev User', avatar_url: 'https://example.com/avatar.png' }) })
} = {}) {
  let handler;
  const cookiesSet = [];
  const stubs = {
    app: {
      post: (_p, ...args) => {
        handler = args[args.length - 1];
      }
    },
    devAuthLimiter: (_req, _res, next) => next && next(),
    isProduction,
    fetch: fetchStub,
    signAuthToken: (payload) => 'signed.' + Buffer.from(JSON.stringify(payload)).toString('base64url'),
    console: {
      log: () => {},
      error: () => {},
      warn: () => {}
    }
  };

  new Function(...Object.keys(stubs), extractDevLoginHandler())(...Object.values(stubs));

  const out = { status: 200, body: undefined, cookies: cookiesSet };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; },
    cookie(name, val, opts) { cookiesSet.push({ name, val, opts }); }
  };
  const session = {
    save(cb) { cb(null); }
  };
  const req = {
    body,
    session
  };

  await handler(req, res);
  return { out, session };
}

test('POST /api/auth/dev-login is strictly blocked in production', async () => {
  const { out } = await callDevLogin({
    body: { token: 'ghp_validToken123456789' },
    isProduction: true
  });
  assert.equal(out.status, 403);
  assert.equal(out.body.error, 'DEV_AUTH_DISABLED_IN_PRODUCTION');
});

test('POST /api/auth/dev-login rejects missing or non-string token', async () => {
  const { out: outMissing } = await callDevLogin({ body: {} });
  assert.equal(outMissing.status, 400);
  assert.equal(outMissing.body.error, 'TOKEN_REQUIRED');

  const { out: outType } = await callDevLogin({ body: { token: 12345 } });
  assert.equal(outType.status, 400);
  assert.equal(outType.body.error, 'TOKEN_REQUIRED');
});

test('POST /api/auth/dev-login rejects too short token format', async () => {
  const { out } = await callDevLogin({ body: { token: 'short' } });
  assert.equal(out.status, 400);
  assert.equal(out.body.error, 'INVALID_TOKEN_FORMAT');
});

test('POST /api/auth/dev-login security: rejects CRLF injection and malicious header characters in token', async () => {
  // Test newline injection
  const { out: outCrlf } = await callDevLogin({ body: { token: 'ghp_validToken123\r\nX-Injected: evil' } });
  assert.equal(outCrlf.status, 400);
  assert.equal(outCrlf.body.error, 'INVALID_TOKEN_FORMAT');

  // Test special characters / spaces
  const { out: outSpecial } = await callDevLogin({ body: { token: 'ghp_token with spaces!@#' } });
  assert.equal(outSpecial.status, 400);
  assert.equal(outSpecial.body.error, 'INVALID_TOKEN_FORMAT');
});

test('POST /api/auth/dev-login propagates GitHub 401 Bad credentials', async () => {
  const { out } = await callDevLogin({
    body: { token: 'ghp_invalid_token_sample_12345' },
    fetchStub: async () => ({
      ok: false,
      status: 401,
      text: async () => 'Bad credentials'
    })
  });
  assert.equal(out.status, 401);
  assert.equal(out.body.error, 'INVALID_GITHUB_TOKEN');
});

test('POST /api/auth/dev-login successfully populates session and returns user on valid PAT', async () => {
  const validToken = 'ghp_mockPersonalAccessToken1234567890';
  const { out, session } = await callDevLogin({
    body: { token: validToken },
    fetchStub: async (url, opts) => {
      assert.equal(url, 'https://api.github.com/user');
      assert.equal(opts.headers.Authorization, `Bearer ${validToken}`);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 424242,
          login: 'octocat',
          name: 'The Octocat',
          avatar_url: 'https://github.com/images/error/octocat_happy.gif'
        })
      };
    }
  });

  assert.equal(out.status, 200);
  assert.equal(out.body.success, true);
  assert.equal(out.body.user.login, 'octocat');
  assert.equal(out.body.user.githubId, 424242);

  // Verify session populated
  assert.equal(session.user.login, 'octocat');
  assert.equal(session.user.accessToken, validToken);

  // Verify cookie signed
  assert.equal(out.cookies.length, 1);
  assert.equal(out.cookies[0].name, 'cavdax_auth');
});
