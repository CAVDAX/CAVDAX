import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Comprehensive Devil's Advocate Round 5 Regression Test Suite
// Verifies fixes for:
// 1. Sponsor Pass Forgery Protection (no arbitrary user_override injection)
// 2. Paid Tier Persistence across Session Regeneration (Pro user stays Pro after re-login)
// 3. Trusted Proxy CIDR Matching with IPv6 and Strict Mode Neighbor Defense
// 4. API Key Connected Repos Population & CI GITHUB_TOKEN Forwarding

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------------------
// 1. EVALUATION SPONSOR PASS FORGERY PROTECTION
// ---------------------------------------------------------------------------
function extractEvalSponsorHandler() {
  const start = INDEX_SRC.indexOf("app.post('/api/billing/activate-evaluation-sponsor'");
  assert.notEqual(start, -1, 'route must exist');
  const end = INDEX_SRC.indexOf('\n});', start);
  assert.notEqual(end, -1, 'end of route not found');
  return INDEX_SRC.slice(start, end + 4);
}

function callEvalSponsor({
  body = {},
  session = {},
  headers = {},
  globalHackathonMode = true,
  savedSystemState = { sponsors: [] }
} = {}) {
  let handler;
  const broadcastEvents = [];
  const stubs = {
    app: { post: (_p, ...args) => { handler = args[args.length - 1]; } },
    checkEvaluationPassAuthorized: () => globalHackathonMode,
    globalHackathonMode,
    savedSystemState,
    broadcastEvent: (evt, data) => broadcastEvents.push({ evt, data }),
    API_TOKEN: 'secret_root_token',
    globalDevRoster: ['alice_dev', 'bob_lead'],
    timingSafeStringEqual: (a, b) => a === b,
    console: { log: () => {}, error: () => {}, warn: () => {} }
  };

  new Function(...Object.keys(stubs), extractEvalSponsorHandler())(...Object.values(stubs));

  const out = { status: 200, body: undefined };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; }
  };
  const req = { body, session, headers };

  handler(req, res);
  return { ...out, broadcastEvents, savedSystemState };
}

test('Round 5 Hardening: Unauthenticated caller CANNOT forge arbitrary user via user_override', () => {
  const savedState = { sponsors: [] };
  const res = callEvalSponsor({
    body: {
      tier_id: 3,
      user_override: { login: 'elonmusk', name: 'Elon Musk', avatar_url: 'https://evil.com/avatar.png' }
    },
    session: {}, // unauthenticated guest caller
    globalHackathonMode: true,
    savedSystemState: savedState
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  // Must NOT adopt 'elonmusk' or 'Elon Musk'
  assert.notEqual(res.body.backer.github_handle, 'elonmusk');
  assert.notEqual(res.body.backer.name, 'Elon Musk');
  // Must be sealed with watermarked evaluator identity
  assert.equal(res.body.backer.github_handle, 'hackathon-evaluator');
  assert.equal(res.body.backer.name, 'Hackathon Evaluator');
  assert.equal(res.body.backer.is_evaluation, true);
});

test('Round 5 Hardening: Authenticated session binds real GitHub user to sponsor record', () => {
  const realUser = {
    id: 884422,
    login: 'real-contributor',
    name: 'Real Contributor',
    avatar_url: 'https://avatars.githubusercontent.com/u/884422?v=4'
  };

  const savedState = { sponsors: [] };
  const res = callEvalSponsor({
    body: { tier_id: 2 },
    session: { user: realUser },
    globalHackathonMode: true,
    savedSystemState: savedState
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.backer.github_handle, 'real-contributor');
  assert.equal(res.body.backer.name, 'Real Contributor');
  assert.equal(res.body.backer.id, 'spn_eval_884422');
});

// ---------------------------------------------------------------------------
// 2. PAID TIER PERSISTENCE ACROSS SESSION REGENERATION
// ---------------------------------------------------------------------------
test('Round 5 Hardening: Paid tier is restored on dev-login and preserved across session regeneration', async () => {
  const start = INDEX_SRC.indexOf("app.post('/api/auth/dev-login'");
  const end = INDEX_SRC.indexOf('\n});', start);
  const handlerCode = INDEX_SRC.slice(start, end + 4);

  let handler;
  const cookiesSet = [];
  const savedState = {
    paidUsers: {
      '424242': { tier: 'pro', purchasedAt: new Date().toISOString(), paymentId: 'pay_123' }
    }
  };

  const stubs = {
    app: { post: (_p, ...args) => { handler = args[args.length - 1]; } },
    devAuthLimiter: (_req, _res, next) => next && next(),
    isProduction: false,
    savedSystemState: savedState,
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 424242, login: 'paying-dev', name: 'Paying Dev', avatar_url: '' })
    }),
    signAuthToken: (payload) => 'signed.' + Buffer.from(JSON.stringify(payload)).toString('base64url'),
    console: { log: () => {}, error: () => {}, warn: () => {} }
  };

  new Function(...Object.keys(stubs), handlerCode)(...Object.values(stubs));

  const out = { status: 200, body: undefined };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; },
    cookie(name, val, opts) { cookiesSet.push({ name, val, opts }); }
  };
  const session = {
    connectedRepos: ['acme-org/analytics-service'],
    save(cb) { cb(null); },
    regenerate(cb) {
      // Simulate express-session regenerate wiping the session
      delete session.user;
      delete session.tier;
      cb(null);
    }
  };
  const req = {
    body: { token: 'test_token_paying_user_123456789' },
    session
  };

  await handler(req, res);

  assert.equal(out.status, 200);
  assert.equal(out.body.success, true);
  // Crucial: Must be 'pro', NOT 'free'!
  assert.equal(out.body.user.tier, 'pro');
  assert.equal(session.user.tier, 'pro');
  assert.equal(session.tier, 'pro');
  // Crucial: Connected repos preserved across regeneration
  assert.deepEqual(session.connectedRepos, ['acme-org/analytics-service']);
});

// ---------------------------------------------------------------------------
// 3. TRUSTED PROXY CIDR & IPV6 MATCHING
// ---------------------------------------------------------------------------
function extractProxyHelper() {
  const isTrustedStart = INDEX_SRC.indexOf('export function isTrustedProxyIp');
  const isTrustedEnd = INDEX_SRC.indexOf('// Helper to extract client IP safely', isTrustedStart);
  const code = `
    ${INDEX_SRC.slice(isTrustedStart, isTrustedEnd).replace('export function', 'function')}
    return { isTrustedProxyIp };
  `;
  return new Function(code)().isTrustedProxyIp;
}

test('Round 5 Hardening: Cloudflare IPv6 edge ranges are trusted', () => {
  const isTrusted = extractProxyHelper();
  // Cloudflare IPv6 official prefixes
  assert.equal(isTrusted('2606:4700::1'), true);
  assert.equal(isTrusted('2606:4700:3037::ac43:d123'), true);
  assert.equal(isTrusted('2400:cb00:2048:1::c629:d7a2'), true);
});

test('Round 5 Hardening: Cloudflare IPv4 exact CIDR boundary matching', () => {
  const isTrusted = extractProxyHelper();
  // Within 131.0.72.0/22 (covers 131.0.72.0 - 131.0.75.255)
  assert.equal(isTrusted('131.0.72.1'), true);
  assert.equal(isTrusted('131.0.73.50'), true);
  assert.equal(isTrusted('131.0.75.254'), true);
  // Outside 131.0.72.0/22
  assert.equal(isTrusted('131.0.76.1'), false);
  assert.equal(isTrusted('131.0.71.255'), false);

  // Cloudflare 172.64.0.0/13 (172.64.0.0 - 172.71.255.255)
  assert.equal(isTrusted('172.64.0.1'), true);
  assert.equal(isTrusted('172.70.1.1'), true);
  assert.equal(isTrusted('172.71.255.254'), true);
  // Outside (e.g. 172.72.x is NOT Cloudflare)
  assert.equal(isTrusted('172.72.0.1'), false);
});

test('Round 5 Hardening: STRICT_PROXY_TRUST rejects untracked private subnets', () => {
  const isTrusted = extractProxyHelper();
  const prevStrict = process.env.STRICT_PROXY_TRUST;
  try {
    process.env.STRICT_PROXY_TRUST = 'true';
    // When strict proxy trust is enabled, arbitrary 10.x neighbours cannot spoof headers
    assert.equal(isTrusted('10.0.5.9'), false);
    assert.equal(isTrusted('192.168.1.100'), false);
    // Loopback remains trusted
    assert.equal(isTrusted('127.0.0.1'), true);
    assert.equal(isTrusted('::1'), true);
  } finally {
    if (prevStrict !== undefined) {
      process.env.STRICT_PROXY_TRUST = prevStrict;
    } else {
      delete process.env.STRICT_PROXY_TRUST;
    }
  }
});

// ---------------------------------------------------------------------------
// 4. API KEY CONNECTED REPOS POPULATION & CI GATE TOKEN FORWARDING
// ---------------------------------------------------------------------------
test('Round 5 Hardening: requireAuth populates connectedRepos on req.authUser from systemState', () => {
  const requireAuthStart = INDEX_SRC.indexOf('function requireAuth(req, res, next)');
  const requireAuthEnd = INDEX_SRC.indexOf('// ---------------------------------------------------------------------------', requireAuthStart);
  const authCode = INDEX_SRC.slice(requireAuthStart, requireAuthEnd !== -1 ? requireAuthEnd : INDEX_SRC.indexOf('\n}\n', requireAuthStart) + 3);

  const code = `
    const userApiKeyRegistry = new Map();
    const savedSystemState = {
      userRepos: {
        'alice': ['acme-org/backend-service', 'acme-org/auth-service']
      }
    };
    const globalKeyRevocationEpoch = 0;
    function hashApiKey(k) { return 'hash_' + k; }
    function timingSafeStringEqual(a, b) { return a === b; }
    const API_TOKEN = null;

    userApiKeyRegistry.set('hash_cvdx_live_alice1234567890123456', {
      userId: 101,
      login: 'alice',
      tier: 'pro',
      createdAt: 1000
    });

    ${authCode}
    return { requireAuth };
  `;
  const { requireAuth } = new Function(code)();

  const req = {
    headers: {
      authorization: 'Bearer cvdx_live_alice1234567890123456'
    }
  };
  let nextCalled = false;
  const res = {
    status() { return { json() {} }; }
  };
  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.authUser?.login, 'alice');
  assert.equal(req.authUser?.tier, 'pro');
  // Crucial: Must be populated!
  assert.deepEqual(req.authUser?.connectedRepos, [
    'acme-org/backend-service',
    'acme-org/auth-service'
  ]);
});
