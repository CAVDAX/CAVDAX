import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Extracts broadcastEvent and its helpers from index.js (which cannot be imported in tests)
// and verifies per-client tenant scoping of repo-scoped and graph-bearing SSE events.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8').replace(/\r\n/g, '\n');

function load() {
  const start = SRC.indexOf('function clientCanSeeRepo(');
  const fnStart = SRC.indexOf('function broadcastEvent(');
  assert.ok(start !== -1 && fnStart > start, 'broadcast helpers must exist in index.js');
  const end = SRC.indexOf('\n}\n', fnStart) + 3;
  const code = SRC.slice(start, end);
  const sseClients = new Set();
  const factory = new Function(
    'sseClients', 'globalDevRoster', 'sanitizeBroadcastPayload',
    `${code}\nreturn broadcastEvent;`
  );
  const broadcastEvent = factory(sseClients, ['admin-dev'], (_t, p) => p);
  return { broadcastEvent, sseClients };
}

function makeClient(login, connectedRepos = []) {
  const writes = [];
  return {
    writes,
    res: { write: (s) => writes.push(s) },
    user: login ? { login } : null,
    session: { user: login ? { login } : undefined, connectedRepos }
  };
}

function payloadOf(client) {
  const line = client.writes.find((w) => w.includes('data: '));
  return line ? JSON.parse(line.split('data: ')[1]) : null;
}

const mixedGraph = () => ({
  nodes: [
    { id: 'a', repo: 'demo' },
    { id: 'b', repo: 'alice/private' },
    { id: 'c', repo: 'bob/secret' }
  ],
  edges: [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'a', target: 'a' }
  ]
});

test('broadcastEvent: repo-scoped events are not delivered to unrelated clients', () => {
  const { broadcastEvent, sseClients } = load();
  const alice = makeClient('alice');
  const mallory = makeClient('mallory');
  sseClients.add(alice); sseClients.add(mallory);
  broadcastEvent('AGENT_ACTION_LOGGED', { x: 1 }, { repo: 'alice/private' });
  assert.equal(alice.writes.length, 1);
  assert.equal(mallory.writes.length, 0);
});

test('broadcastEvent: top-level graph payloads are filtered per client, not by the first foreign node', () => {
  const { broadcastEvent, sseClients } = load();
  const alice = makeClient('alice');
  const bob = makeClient('bob');
  const anon = makeClient(null);
  [alice, bob, anon].forEach((c) => sseClients.add(c));
  broadcastEvent('GRAPH_UPDATED', mixedGraph());
  assert.deepEqual(payloadOf(alice).data.nodes.map((n) => n.id), ['a', 'b']);
  assert.deepEqual(payloadOf(bob).data.nodes.map((n) => n.id), ['a', 'c']);
  assert.deepEqual(payloadOf(anon).data.nodes.map((n) => n.id), ['a']);
  assert.deepEqual(payloadOf(anon).data.edges, [{ source: 'a', target: 'a' }], 'edges to hidden nodes are dropped');
});

test('broadcastEvent: nested graph payloads (MUTATION_INGESTED) are filtered per client', () => {
  const { broadcastEvent, sseClients } = load();
  const alice = makeClient('alice');
  const anon = makeClient(null);
  sseClients.add(alice); sseClients.add(anon);
  broadcastEvent('MUTATION_INGESTED', { ingestResult: { ok: true }, graph: mixedGraph() });
  assert.deepEqual(payloadOf(alice).data.graph.nodes.map((n) => n.id), ['a', 'b']);
  assert.deepEqual(payloadOf(anon).data.graph.nodes.map((n) => n.id), ['a']);
  assert.deepEqual(payloadOf(anon).data.ingestResult, { ok: true });
});

test('broadcastEvent: admins see everything; demo-only graphs reach everyone', () => {
  const { broadcastEvent, sseClients } = load();
  const admin = makeClient('admin-dev');
  const anon = makeClient(null);
  sseClients.add(admin); sseClients.add(anon);
  broadcastEvent('GRAPH_UPDATED', mixedGraph());
  assert.equal(payloadOf(admin).data.nodes.length, 3);

  anon.writes.length = 0;
  broadcastEvent('GRAPH_UPDATED', { nodes: [{ id: 'a', repo: 'demo' }], edges: [] });
  assert.equal(anon.writes.length, 1);
});
