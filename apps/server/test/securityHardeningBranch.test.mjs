import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CavdaxMcpServer, isProtectedWritePath } from '../../../core/mcp/server.js';
import { globalLockManager } from '../../../core/mcp/lockManager.js';
import { applySupersededStatusToAdr } from '../githubAdr.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8').replace(/\r\n/g, '\n');

/** Slice of index.js starting at `marker` up to the closing `\n});` of that route handler. */
function routeSource(marker) {
  const start = INDEX_SRC.indexOf(marker);
  assert.notEqual(start, -1, `route not found: ${marker}`);
  const end = INDEX_SRC.indexOf('\n});', start);
  assert.notEqual(end, -1, `end of route not found: ${marker}`);
  return INDEX_SRC.slice(start, end + 4);
}

// ---------------------------------------------------------------------------
// Fake graph: answers the gate query and the scope query.
// ---------------------------------------------------------------------------
function fakeGraph({ verdict = 'APPROVED', targetFile = null } = {}) {
  const queries = [];
  return {
    queries,
    async query(cypher, opts) {
      queries.push(cypher);
      if (cypher.includes('RETURN d.target_file AS target_file')) {
        return { data: [{ target_file: targetFile }] };
      }
      if (cypher.includes('AS gate_verdict')) {
        return {
          data: [{
            decision_id: opts.params.decisionId,
            decision_status: 'VALID',
            gate_verdict: verdict,
            violation_paths: []
          }]
        };
      }
      return { data: [] }; // audit CREATE
    }
  };
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-gate-sandbox-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------------------
// Route guards (static checks against the real handler source)
// ---------------------------------------------------------------------------
test('POST /api/reset requires developer authorization', () => {
  assert.match(INDEX_SRC, /app\.post\('\/api\/reset',\s*requireDevAuth,/);
});

test('POST /api/seed (also DETACH DELETEs the graph) requires developer authorization', () => {
  assert.match(INDEX_SRC, /app\.post\('\/api\/seed',\s*requireDevAuth,/);
});

test('POST /api/alerts/simulate-invalidation requires authentication and only mails owned addresses', () => {
  assert.match(INDEX_SRC, /app\.post\('\/api\/alerts\/simulate-invalidation',\s*requireAuth,/);
  const src = routeSource("app.post('/api/alerts/simulate-invalidation'");
  assert.match(src, /TARGET_EMAIL_NOT_REGISTERED/);
  assert.equal(src.includes("|| 'default'"), false, 'no shared "default" identity');
  assert.match(src, /maySimulateOnLiveGraph/, 'shared-graph mutation must be gated');
});

test('notification preferences and push subscribe no longer share a "default" bucket', () => {
  assert.equal(/const login = user\?\.login \|\| 'default'/.test(INDEX_SRC), false);
  assert.match(routeSource("app.post('/api/user/notification-preferences'"), /AUTHENTICATION_REQUIRED/);
  assert.match(routeSource("app.post('/api/push/subscribe'"), /AUTHENTICATION_REQUIRED/);
});

test('webhook alert recipients: an empty watchedRepos list watches nothing', () => {
  const src = INDEX_SRC;
  assert.equal(src.includes('watched.length === 0 ||'), false, 'empty list must not mean "watch everything"');

  // Re-implement the exact predicate from the handler and check behaviour.
  const isWatching = (prefs, login, repoFullName) => {
    const watched = Array.isArray(prefs.watchedRepos) ? prefs.watchedRepos : [];
    const repoLower = repoFullName.toLowerCase();
    return watched.some((w) => String(w).toLowerCase() === repoLower) ||
      repoLower.startsWith(`${login.toLowerCase()}/`);
  };
  assert.equal(isWatching({ watchedRepos: [] }, 'bob', 'alice/private-repo'), false);
  assert.equal(isWatching({}, 'bob', 'alice/private-repo'), false);
  assert.equal(isWatching({ watchedRepos: ['alice/private-repo'] }, 'bob', 'Alice/Private-Repo'), true);
  assert.equal(isWatching({ watchedRepos: [] }, 'alice', 'alice/private-repo'), true, 'owners keep their own repos');
});

test('POST /api/user/tier persists via syncSystemStateToDisk (no argument-less saveSystemState)', () => {
  assert.equal(/saveSystemState\(\s*\)/.test(INDEX_SRC), false);
  assert.match(routeSource("app.post('/api/user/tier'"), /syncSystemStateToDisk\(\)/);
});

test('verify-payment cookie never carries the GitHub access token', () => {
  assert.equal(INDEX_SRC.includes('signAuthToken(req.session.user)'), false);
  const start = INDEX_SRC.indexOf('Never place the GitHub OAuth access token');
  assert.notEqual(start, -1);
  const block = INDEX_SRC.slice(start, start + 700);
  assert.equal(/accessToken\s*:/.test(block), false, 'cookieUser must not include accessToken');
});

test('CORS: localhost origins are only allowed outside production', () => {
  assert.ok(
    INDEX_SRC.includes("process.env.NODE_ENV !== 'production' && /^https?:\\/\\/(localhost|127\\.0\\.0\\.1)"),
    'localhost CORS allowance must be guarded by NODE_ENV'
  );
});

// ---------------------------------------------------------------------------
// Hosted MCP schema: agent_id
// ---------------------------------------------------------------------------
test('hosted MCP schema declares agent_id on apply_code_change and check_intent_clearance', () => {
  const tools = new CavdaxMcpServer(null).getTools();
  for (const name of ['apply_code_change', 'check_intent_clearance']) {
    const tool = tools.find((t) => t.name === name);
    assert.ok(tool, `${name} exists`);
    assert.equal(tool.parameters.properties.agent_id?.type, 'string', `${name} must declare agent_id`);
    assert.equal(tool.parameters.required.includes('agent_id'), false, 'agent_id stays optional');
  }
});

test('lock holder is not blocked by its own lock when agent_id is passed through the gate', async () => {
  const sandbox = makeSandbox();
  try {
    globalLockManager.releaseLock('DEC-LOCK-1', 'agent-A');
    globalLockManager.acquireLock('DEC-LOCK-1', 'agent-A', 60000, 'test');
    const mcp = new CavdaxMcpServer(fakeGraph(), { repoRoot: sandbox.dir });

    const own = await mcp.handleToolCall('apply_code_change', {
      decision_id: 'DEC-LOCK-1', file_path: 'src/a.js', code_payload: 'x', agent_id: 'agent-A'
    });
    assert.equal(own.isError, false, 'owner must be allowed to write');

    const foreign = await mcp.handleToolCall('apply_code_change', {
      decision_id: 'DEC-LOCK-1', file_path: 'src/b.js', code_payload: 'x', agent_id: 'agent-B'
    });
    assert.equal(foreign.gate_verdict, 'BLOCKED_CONCURRENT_AGENT_LOCK');
  } finally {
    globalLockManager.releaseLock('DEC-LOCK-1', 'agent-A');
    sandbox.cleanup();
  }
});

// ---------------------------------------------------------------------------
// apply_code_change: protected paths, symlink escape, decision scope
// ---------------------------------------------------------------------------
test('isProtectedWritePath flags git internals, env files and CI workflows', () => {
  for (const p of ['.git/config', 'a/.git/hooks/pre-commit', '.env', '.env.production', 'svc/.env.local', '.github/workflows/ci.yml']) {
    assert.equal(isProtectedWritePath(p), true, p);
  }
  for (const p of ['src/services/payment.js', 'docs/env.md', 'src/github/client.js', 'environment.js']) {
    assert.equal(isProtectedWritePath(p), false, p);
  }
});

test('apply_code_change refuses protected paths even with an APPROVED decision', async () => {
  const sandbox = makeSandbox();
  try {
    const mcp = new CavdaxMcpServer(fakeGraph(), { repoRoot: sandbox.dir });
    for (const file_path of ['.env', '.git/config', '.github/workflows/deploy.yml']) {
      const res = await mcp.handleToolCall('apply_code_change', { decision_id: 'DEC-1', file_path, code_payload: 'pwned' });
      assert.equal(res.isError, true, file_path);
      assert.equal(res.gate_verdict, 'BLOCKED_PROTECTED_PATH', file_path);
      assert.equal(fs.existsSync(path.join(sandbox.dir, file_path)), false, `${file_path} must not be written`);
    }
  } finally {
    sandbox.cleanup();
  }
});

test('apply_code_change refuses to write through a symlink that points outside the repo', async () => {
  const sandbox = makeSandbox();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-outside-'));
  try {
    fs.symlinkSync(outside, path.join(sandbox.dir, 'linked'), 'dir');
    const mcp = new CavdaxMcpServer(fakeGraph(), { repoRoot: sandbox.dir });
    const res = await mcp.handleToolCall('apply_code_change', {
      decision_id: 'DEC-1', file_path: 'linked/escape.js', code_payload: 'pwned'
    });
    assert.equal(res.isError, true);
    assert.equal(res.gate_verdict, 'BLOCKED_PATH_TRAVERSAL');
    assert.equal(fs.existsSync(path.join(outside, 'escape.js')), false, 'nothing may be written outside the repo');
  } finally {
    sandbox.cleanup();
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('apply_code_change still writes a normal file inside the repo for an APPROVED decision', async () => {
  const sandbox = makeSandbox();
  try {
    const mcp = new CavdaxMcpServer(fakeGraph(), { repoRoot: sandbox.dir });
    const res = await mcp.handleToolCall('apply_code_change', {
      decision_id: 'DEC-1', file_path: 'src/services/payment.js', code_payload: 'ok'
    });
    assert.equal(res.isError, false);
    assert.equal(res.gate_verdict, 'APPROVED');
    assert.equal(fs.readFileSync(path.join(sandbox.dir, 'src/services/payment.js'), 'utf8'), 'ok');
  } finally {
    sandbox.cleanup();
  }
});

test('apply_code_change enforces the decision target_file when one is declared', async () => {
  const sandbox = makeSandbox();
  try {
    const mcp = new CavdaxMcpServer(fakeGraph({ targetFile: 'src/services/payment.js' }), { repoRoot: sandbox.dir });

    const other = await mcp.handleToolCall('apply_code_change', {
      decision_id: 'DEC-102', file_path: 'package.json', code_payload: '{}'
    });
    assert.equal(other.isError, true);
    assert.equal(other.gate_verdict, 'BLOCKED_TARGET_FILE_MISMATCH');
    assert.equal(fs.existsSync(path.join(sandbox.dir, 'package.json')), false);

    const same = await mcp.handleToolCall('apply_code_change', {
      decision_id: 'DEC-102', file_path: './src/services/payment.js', code_payload: 'ok'
    });
    assert.equal(same.isError, false, 'normalised equal path is allowed');
  } finally {
    sandbox.cleanup();
  }
});

// ---------------------------------------------------------------------------
// ADR status sync: CRLF and "$" handling
// ---------------------------------------------------------------------------
test('applySupersededStatusToAdr keeps CRLF files intact (no duplicate frontmatter)', () => {
  const crlf = '---\r\nid: ADR-001\r\nstatus: ACCEPTED\r\n---\r\n# Title\r\n';
  const out = applySupersededStatusToAdr(crlf, 'ADR-002');
  assert.equal(out, '---\r\nid: ADR-001\r\nstatus: SUPERSEDED by ADR-002\r\n---\r\n# Title\r\n');
  assert.equal(out.match(/^---/gm).length, 2, 'exactly one frontmatter block');
});

test('applySupersededStatusToAdr does not expand "$" replacement patterns in frontmatter', () => {
  const text = '---\nid: ADR-001\nnote: costs $& and $1 and $$ extra\nstatus: ACCEPTED\n---\nbody';
  const out = applySupersededStatusToAdr(text, 'ADR-002');
  assert.equal(out, '---\nid: ADR-001\nnote: costs $& and $1 and $$ extra\nstatus: SUPERSEDED by ADR-002\n---\nbody');
});

test('applySupersededStatusToAdr appends a status line using the file line ending when none exists', () => {
  const crlf = '---\r\nid: ADR-001\r\n---\r\nbody';
  assert.equal(applySupersededStatusToAdr(crlf, 'ADR-002'), '---\r\nid: ADR-001\r\nstatus: SUPERSEDED by ADR-002\r\n---\r\nbody');
});
