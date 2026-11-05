import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverIndexPath = path.resolve(__dirname, '../index.js');
const serverIndexSrc = readFileSync(serverIndexPath, 'utf8');

function extractOauthCallbackHandler() {
  const marker = "app.get('/api/auth/github/callback',";
  const startIdx = serverIndexSrc.indexOf(marker);
  if (startIdx === -1) {
    throw new Error('Could not find /api/auth/github/callback handler in index.js');
  }

  // Find the closing }); of this route
  const endPattern = "app.get('/api/auth/me',";
  const endIdx = serverIndexSrc.indexOf(endPattern, startIdx);
  if (endIdx === -1) {
    throw new Error('Could not find end of /api/auth/github/callback handler');
  }

  const rawChunk = serverIndexSrc.slice(startIdx, endIdx);
  // Match inside async (req, res) => { ... }
  const match = rawChunk.match(/async\s*\(req,\s*res\)\s*=>\s*\{([\s\S]*)\}\);\s*(?:\/\*\*[\s\S]*)?$/);
  if (!match) {
    throw new Error('Could not parse handler body from chunk');
  }

  const handlerBody = match[1];

  return new Function(
    'req',
    'res',
    'oauthStateStore',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL',
    'CLIENT_URL',
    'signAuthToken',
    'fetch',
    `return (async () => {
      ${handlerBody}
    })();`
  );
}

test('OAuth callback: returns invalid_state when state is missing or invalid', async () => {
  const handler = extractOauthCallbackHandler();
  const oauthStateStore = new Map();

  let redirectUrl = null;
  const req = {
    query: { code: 'some_code', state: 'unregistered_state' }
  };
  const res = {
    redirect: (url) => { redirectUrl = url; }
  };

  await handler(
    req,
    res,
    oauthStateStore,
    'client_id',
    'client_secret',
    'http://localhost:3000/callback',
    'http://localhost:5173',
    () => 'mock_token',
    async () => ({})
  );

  assert.strictEqual(redirectUrl, '/mcp?oauth_error=invalid_state');
});

test('OAuth callback: completes exchange, regenerates session, and stores accessToken without ReferenceError', async () => {
  const handler = extractOauthCallbackHandler();
  const oauthStateStore = new Map();
  oauthStateStore.set('valid_state_123', {
    createdAt: Date.now(),
    returnTo: '/profile'
  });

  let sessionRegenerated = false;
  let sessionSaved = false;
  let redirectUrl = null;
  let cookieSet = null;

  const mockSession = {
    user: null,
    regenerate(cb) {
      sessionRegenerated = true;
      cb(null);
    },
    save(cb) {
      sessionSaved = true;
      cb(null);
    }
  };

  const req = {
    query: { code: 'gh_code_456', state: 'valid_state_123' },
    session: mockSession
  };

  const res = {
    cookie: (name, val, opts) => { cookieSet = { name, val, opts }; },
    redirect: (url) => { redirectUrl = url; }
  };

  // Mock global fetch for GitHub OAuth token and user profile
  const mockFetch = async (url, opts) => {
    if (url.includes('/login/oauth/access_token')) {
      return {
        json: async () => ({ access_token: 'gho_secret_token_abc123' })
      };
    }
    if (url === 'https://api.github.com/user') {
      return {
        json: async () => ({
          id: 998877,
          login: 'edgeuser',
          name: 'Edge Tester',
          avatar_url: 'https://avatars.githubusercontent.com/u/998877',
          email: 'edge@example.com'
        })
      };
    }
    if (url.includes('/user/emails')) {
      return {
        ok: true,
        json: async () => [{ email: 'edge@example.com', primary: true, verified: true }]
      };
    }
    return { ok: false, json: async () => ({}) };
  };

  await handler(
    req,
    res,
    oauthStateStore,
    'mock_client_id',
    'mock_client_secret',
    'https://cavdax.sahnirmaan.live/api/auth/github/callback',
    'https://cavdax.sahnirmaan.live',
    () => 'signed_cavdax_cookie',
    mockFetch
  );

  // Assert session regeneration happened (OWASP A07 Session Fixation mitigation)
  assert.strictEqual(sessionRegenerated, true, 'Session should be regenerated');
  assert.strictEqual(sessionSaved, true, 'Session should be saved');

  // Critical Invariant: accessToken must equal the exchanged token (no access_token ReferenceError)
  assert.ok(req.session.user, 'User object should be hydrated');
  assert.strictEqual(req.session.user.login, 'edgeuser');
  assert.strictEqual(req.session.user.accessToken, 'gho_secret_token_abc123');

  // Cookie must be set
  assert.ok(cookieSet, 'cavdax_auth cookie should be set');
  assert.strictEqual(cookieSet.name, 'cavdax_auth');

  // Must redirect to returnTo (/profile) with success params
  assert.ok(redirectUrl, 'Should redirect');
  assert.ok(redirectUrl.startsWith('https://cavdax.sahnirmaan.live/profile'));
  assert.ok(redirectUrl.includes('connected=1'));
  assert.ok(redirectUrl.includes('login=edgeuser'));
});
