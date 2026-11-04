import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Regression coverage for GET /api/github/repos/:owner/:repo/adrs.
//
// index.js cannot be imported in a test (it boots Express, connects to FalkorDB and
// writes session files), so the handler is extracted from source and executed with
// stubbed dependencies. A duplicate `const repoFullName` in the handler once threw
// "ReferenceError: Cannot access 'repoFullName' before initialization" on every request.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

function extractAdrsHandler() {
  const start = INDEX_SRC.indexOf("app.get('/api/github/repos/:owner/:repo/adrs'");
  assert.notEqual(start, -1, '/adrs route must exist in index.js');
  const end = INDEX_SRC.indexOf('\n});', start);
  assert.notEqual(end, -1, 'could not find end of /adrs handler');
  return INDEX_SRC.slice(start, end + 4);
}

async function callAdrs({ session, headers = {}, env = {}, tier = 'free', scan, access = true, apiToken = null, scanArgs } = {}) {
  let handler;
  const stubs = {
    app: { get: (_p, fn) => { handler = fn; } },
    API_TOKEN: apiToken,
    timingSafeStringEqual: (a, b) => a === b,
    verifyUserRepoAccess: async () => access,
    hashApiKey: () => '',
    userApiKeyRegistry: new Map(),
    globalKeyRevocationEpoch: 0,
    globalHackathonMode: false,
    CAVDAX_TIER: tier,
    sanitizeBranchName: (b, fallback) => (typeof b === 'string' && b ? b : fallback),
    scanRepoAdrs: scan || (async (args) => { if (scanArgs) scanArgs.push(args); return { graph: { nodes: [], edges: [] }, adrs: [] }; }),
    savedSystemState: { auditEntries: [] },
    GithubAdrError: class GithubAdrError extends Error {},
    process: { env }
  };
  new Function(...Object.keys(stubs), extractAdrsHandler())(...Object.values(stubs));

  const out = { status: 200, body: undefined };
  const res = {
    status(code) { out.status = code; return this; },
    json(body) { out.body = body; return this; }
  };
  const req = {
    headers,
    query: {},
    params: { owner: 'Octo', repo: 'Hello' },
    session
  };
  await handler(req, res);
  return { ...out, session };
}

test('/adrs handler: authenticated session scans the repo and returns 200 (no TDZ ReferenceError)', async () => {
  const session = { user: { login: 'u', accessToken: 'tok' } };
  const { status, body } = await callAdrs({ session });
  assert.equal(status, 200, `expected 200, got ${status}: ${JSON.stringify(body)}`);
  assert.equal(body.success, true);
});

test('/adrs handler: records the lowercased repo in session.connectedRepos only after a successful scan', async () => {
  const session = { user: { login: 'u', accessToken: 'tok' } };
  await callAdrs({ session });
  assert.deepEqual(session.connectedRepos, ['octo/hello']);

  const failing = { user: { login: 'u', accessToken: 'tok' } };
  const { status } = await callAdrs({
    session: failing,
    scan: async () => { throw new Error('boom'); }
  });
  assert.equal(status, 500);
  assert.ok(!failing.connectedRepos || failing.connectedRepos.length === 0, 'failed scan must not connect the repo');
});

test('/adrs handler: free tier rejects a second connected repo with TIER_REPO_LIMIT_EXCEEDED', async () => {
  const session = { user: { login: 'u', accessToken: 'tok' }, connectedRepos: ['other/repo'] };
  const { status, body } = await callAdrs({ session, tier: 'free' });
  assert.equal(status, 403);
  assert.equal(body.code, 'TIER_REPO_LIMIT_EXCEEDED');
});

test('/adrs handler: unauthenticated request in production returns 401', async () => {
  const { status, body } = await callAdrs({ session: {}, env: { NODE_ENV: 'production' } });
  assert.equal(status, 401);
  assert.equal(body.code, 'AUTH_REQUIRED');
});

test('/adrs handler: session user without write access is not added to connectedRepos', async () => {
  const session = { user: { login: 'u', accessToken: 'tok' } };
  const { status } = await callAdrs({ session, access: false });
  assert.equal(status, 200);
  assert.ok(!session.connectedRepos || session.connectedRepos.length === 0, 'read-only visibility must not grant tenancy');
});

test('/adrs handler: API-key caller without repo access gets 403 and never reaches the server GITHUB_TOKEN', async () => {
  const calls = [];
  const { status, body } = await callAdrs({
    session: {},
    headers: { authorization: 'Bearer root-token' },
    apiToken: 'root-token',
    access: false,
    env: { GITHUB_TOKEN: 'server-token' },
    scanArgs: calls
  });
  assert.equal(status, 403);
  assert.equal(body.code, 'FORBIDDEN');
  assert.equal(calls.length, 0, 'scan must not run');
});

test('/adrs handler: API-key caller with access scans using the server GITHUB_TOKEN', async () => {
  const calls = [];
  const { status } = await callAdrs({
    session: {},
    headers: { authorization: 'Bearer root-token' },
    apiToken: 'root-token',
    access: true,
    env: { GITHUB_TOKEN: 'server-token' },
    scanArgs: calls
  });
  assert.equal(status, 200);
  assert.equal(calls[0].token, 'server-token');
});

test('/adrs handler: anonymous dev-mode caller gets 401 and never reaches the server GITHUB_TOKEN', async () => {
  const calls = [];
  const { status } = await callAdrs({ session: {}, env: { NODE_ENV: 'development', GITHUB_TOKEN: 'server-token' }, scanArgs: calls });
  assert.equal(status, 401);
  assert.equal(calls.length, 0);
});
