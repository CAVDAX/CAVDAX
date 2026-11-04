/**
 * Tests for the GitHub ADR scan and the "Initialize ADR" pull request flow.
 * GitHub is mocked, so nothing touches a real repository.
 *   node --test apps/server/test/githubAdr.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdrPath } from '../../../core/ingestion/adrPaths.js';
import { parseFrontmatter } from '../../../core/ingestion/parser.js';
import {
  scanRepoAdrs, createAdrPullRequest, syncSupersededAdrPullRequest, detectUnsyncedSupersessions, applySupersededStatusToAdr, buildGraphFromAdrs, buildStarterAdr, detectStack, selectStackFiles, assertRepoName, NEW_ADR_PATH,
  listRepoBranches,
  proposeAdrPullRequest,
  createCiGatePullRequest
} from '../githubAdr.js';

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
const text = (body) => ({ ok: true, status: 200, json: async () => ({}), text: async () => body });

const ADR1 = `---
id: ADR-001
title: Use MongoDB
fact_id: F-Mongo
fact_claim: Orders live in MongoDB
decision_id: DEC-201
decision_title: Build on MongoDB
---
# ADR-001: Use MongoDB
`;
const ADR2 = `---
id: ADR-002
title: Use PostgreSQL
supersedes: ADR-001
fact_id: F-Postgres
fact_claim: Orders live in PostgreSQL
---
# ADR-002: Use PostgreSQL
`;

/** Fake GitHub. `files` maps path -> content. Records every call. */
function fakeGithub({ files = {}, openPulls = [], takenBranch = false, extraTree = [] } = {}) {
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname);
    calls.push({ method, path: p, body: opts.body ? JSON.parse(opts.body) : null });
    if (method === 'GET' && /^\/repos\/o\/r$/.test(p)) return json({ default_branch: 'main' });
    if (method === 'GET' && p.startsWith('/repos/o/r/git/trees/')) {
      return json({ truncated: false, tree: [...Object.keys(files).map((f) => ({ type: 'blob', path: f, size: files[f].length })), ...extraTree] });
    }
    if (method === 'GET' && p.startsWith('/repos/o/r/contents/')) {
      const content = files[p.replace('/repos/o/r/contents/', '')];
      return content === undefined ? json({}, 404) : text(content);
    }
    if (method === 'GET' && p === '/repos/o/r/branches') {
      return json([
        { name: 'main', commit: { sha: 'sha-main' }, protected: true },
        { name: 'feat/branch-1', commit: { sha: 'sha-feat' }, protected: false }
      ]);
    }
    if (method === 'GET' && p === '/repos/o/r/pulls') return json(openPulls);
    if (method === 'GET' && p === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'abc123' } });
    if (method === 'POST' && p === '/repos/o/r/git/refs') return takenBranch && opts.body.includes('"refs/heads/cavdax/init-adr"') ? json({}, 422) : json({});
    if (method === 'PUT' && p.startsWith('/repos/o/r/contents/')) return json({ content: {} }, 201);
    if (method === 'POST' && p === '/repos/o/r/pulls') return json({ number: 7, html_url: 'https://github.com/o/r/pull/7' }, 201);
    return json({}, 404);
  };
  return { fetchImpl, calls };
}

test('isAdrPath accepts the common ADR folders and rejects non-decisions', () => {
  for (const p of ['docs/adrs/ADR-001.md', 'docs/adr/0001-x.md', 'doc/adr/0001.md', '.adr/a.md', 'docs/decisions/x.md',
    'architecture/decisions/x.md', 'adr/x.md', 'DOCS/ADRS/X.md']) assert.equal(isAdrPath(p), true, p);
  for (const p of ['README.md', 'docs/adrs/README.md', 'docs/adrs/template.md', 'docs/adrs/diagram.png', 'src/adr.md',
    'docs/guide.md', 'docs/adrs-extra/x.md']) assert.equal(isAdrPath(p), false, p);
});

test('assertRepoName rejects path tricks', () => {
  assert.doesNotThrow(() => assertRepoName('GeetikaChughIBM', 'acme-checkout'));
  for (const [o, r] of [['..', 'r'], ['o', '../x'], ['o', 'a/b'], ['o', ''], ['o', 'r?x=1']]) {
    assert.throws(() => assertRepoName(o, r), /Invalid repository/);
  }
});

test('scan finds ADRs in docs/adrs and builds the real graph', async () => {
  const { fetchImpl } = fakeGithub({ files: { 'docs/adrs/ADR-001.md': ADR1, 'README.md': '# hi', 'docs/adrs/README.md': 'x' } });
  const r = await scanRepoAdrs({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.equal(r.count, 1);
  assert.equal(r.branch, 'main');
  assert.deepEqual(r.graph.nodes.map((n) => n.id).sort(), ['ADR-001', 'DEC-201', 'F-Mongo']);
  assert.ok(r.graph.edges.some((e) => e.type === 'DEPENDS_ON' && e.source === 'DEC-201' && e.target === 'F-Mongo'));
});

test('a superseding ADR invalidates the dependent decision in the graph', async () => {
  const { fetchImpl } = fakeGithub({ files: { 'docs/adrs/ADR-001.md': ADR1, 'docs/adrs/ADR-002.md': ADR2 } });
  const r = await scanRepoAdrs({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  const byId = Object.fromEntries(r.graph.nodes.map((n) => [n.id, n]));
  assert.equal(byId['ADR-001'].status, 'SUPERSEDED');
  assert.equal(byId['F-Mongo'].is_stale, true);
  assert.equal(byId['DEC-201'].status, 'INVALIDATED_NEEDS_REVALIDATION');
  assert.equal(byId['ADR-002'].status, 'ACTIVE');
  assert.ok(r.graph.edges.some((e) => e.type === 'SUPERSEDES' && e.source === 'ADR-002'));
});

test('scan of a repo without ADRs returns zero and an empty graph', async () => {
  const { fetchImpl } = fakeGithub({ files: { 'README.md': '# hi' } });
  const r = await scanRepoAdrs({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.equal(r.count, 0);
  assert.deepEqual(r.graph, { nodes: [], edges: [] });
});

test('Initialize opens a PR from a new branch and never writes to the default branch', async () => {
  const { fetchImpl, calls } = fakeGithub({ files: { 'README.md': '# hi' } });
  const pr = await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.equal(pr.number, 7);
  assert.equal(pr.branch, 'cavdax/init-adr');
  assert.equal(pr.reused, false);
  const put = calls.find((c) => c.method === 'PUT');
  assert.equal(put.body.branch, 'cavdax/init-adr');
  assert.ok(put.path.endsWith(NEW_ADR_PATH));
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 1);
  assert.equal(calls.find((c) => c.method === 'POST' && c.path.endsWith('/pulls')).body.base, 'main');
  assert.ok(!calls.some((c) => /heads\/main$/.test(c.path) && c.method !== 'GET'), 'must not modify main');
});

test('fallback starter ADR (nothing detected) parses with the real CAVDAX parser', () => {
  const { frontmatter } = parseFrontmatter(buildStarterAdr({ date: new Date('2026-01-02T00:00:00Z'), repo: 'o/r' }), NEW_ADR_PATH);
  assert.equal(frontmatter.id, 'ADR-001');
  assert.equal(frontmatter.fact_id, 'F-ADR-Process');
  assert.equal(frontmatter.decision_id, 'DEC-001');
  assert.equal(frontmatter.date, '2026-01-02');
  assert.ok(isAdrPath(NEW_ADR_PATH));
});

test('detectStack reads real dependencies and ranks a database above a cache', () => {
  const d = detectStack({ 'package.json': JSON.stringify({ dependencies: { express: '^4', redis: '^4', pg: '^8' } }) });
  assert.deepEqual(d.languages, ['Node.js']);
  assert.deepEqual(d.datastores.map((s) => s.name), ['PostgreSQL', 'Redis']);
  assert.deepEqual(d.frameworks.map((s) => s.name), ['Express']);
  assert.deepEqual(d.evidence, ['package.json']);
});

test('detectStack reads Python, Go and Java manifests', () => {
  assert.equal(detectStack({ 'requirements.txt': 'Django==4.2\npsycopg2-binary==2.9\n' }).datastores[0].name, 'PostgreSQL');
  assert.equal(detectStack({ 'requirements.txt': 'Django==4.2\n' }).frameworks[0].name, 'Django');
  assert.equal(detectStack({ 'go.mod': 'module x\nrequire go.mongodb.org/mongo-driver v1.1\n' }).datastores[0].name, 'MongoDB');
  assert.equal(detectStack({ 'pom.xml': '<dependency><artifactId>mysql-connector-j</artifactId></dependency>' }).datastores[0].name, 'MySQL');
});

test('detectStack claims nothing from unknown, empty or malformed manifests', () => {
  const none = { datastores: [], frameworks: [] };
  for (const m of [{}, { 'package.json': '{ not json' }, { 'package.json': '{"dependencies":{"lodash":"1"}}' }, { 'README.md': 'postgres mongodb' }]) {
    const d = detectStack(m);
    assert.deepEqual({ datastores: d.datastores, frameworks: d.frameworks }, none);
  }
});

test('detectStack does not match substrings (e.g. "pg" inside "upgrade")', () => {
  assert.equal(detectStack({ 'requirements.txt': 'upgrade-tool==1.0\nredisson==2\n' }).datastores.length, 0);
});

test('starter ADR describes the repo that was scanned, and parses with the real parser', () => {
  const detection = detectStack({ 'package.json': JSON.stringify({ dependencies: { mongoose: '8', redis: '4' } }) });
  const md = buildStarterAdr({ date: new Date('2026-01-02T00:00:00Z'), repo: 'acme/shop', detection });
  const { frontmatter } = parseFrontmatter(md, NEW_ADR_PATH);
  assert.equal(frontmatter.id, 'ADR-001');
  assert.equal(frontmatter.fact_id, 'F-Mongo');
  assert.match(frontmatter.fact_claim, /acme\/shop uses MongoDB/);
  assert.match(frontmatter.title, /MongoDB/);
  assert.match(md, /alongside Redis/);
  assert.match(md, /`package.json`/);
  assert.ok(!/PostgreSQL/.test(md), 'must not claim a database that is not in the manifest');
});

test('Initialize writes an ADR built from the repo manifest', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: { 'package.json': JSON.stringify({ dependencies: { pg: '8', express: '4' } }), 'README.md': '# hi' }
  });
  const pr = await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.deepEqual(pr.detected, ['PostgreSQL', 'Express']);
  const put = calls.find((c) => c.method === 'PUT');
  const md = Buffer.from(put.body.content, 'base64').toString('utf-8');
  assert.match(md, /fact_id: F-Postgres/);
  assert.match(md, /o\/r uses PostgreSQL as the primary data store/);
  const prCall = calls.find((c) => c.method === 'POST' && c.path.endsWith('/pulls'));
  assert.match(prCall.body.body, /- PostgreSQL, from `package.json` \(a library dependency\)/);
  assert.match(prCall.body.body, /- Express, from `package.json`/);
});

test('Initialize reads manifests before creating the branch (no orphan branch on failure)', async () => {
  const { fetchImpl, calls } = fakeGithub({ files: { 'package.json': '{}', 'README.md': '# hi' } });
  await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  const manifestRead = calls.findIndex((c) => c.method === 'GET' && c.path.endsWith('/contents/package.json'));
  const branchCreate = calls.findIndex((c) => c.method === 'POST' && c.path.endsWith('/git/refs'));
  assert.ok(manifestRead >= 0 && manifestRead < branchCreate);
});

test('Initialize on a repo with no recognised stack falls back to the process ADR', async () => {
  const { fetchImpl, calls } = fakeGithub({ files: { 'README.md': '# hi' } });
  const pr = await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.deepEqual(pr.detected, []);
  const md = Buffer.from(calls.find((c) => c.method === 'PUT').body.content, 'base64').toString('utf-8');
  assert.match(md, /fact_id: F-ADR-Process/);
});

test('docker-compose image outranks a client library, and the ADR says the service runs', () => {
  const d = detectStack({
    'package.json': JSON.stringify({ dependencies: { mongoose: '8', pg: '8' } }),
    'docker-compose.yml': 'services:\n  db:\n    image: postgres:16-alpine\n  cache:\n    image: "redis:7"\n'
  });
  assert.equal(d.datastores[0].name, 'PostgreSQL');
  assert.equal(d.datastores[0].strong, true);
  assert.deepEqual(d.datastores[0].via.sort(), ['docker-compose.yml', 'package.json']);
  assert.equal(d.datastores.find((s) => s.name === 'MongoDB').strong, false);
  const md = buildStarterAdr({ repo: 'o/r', detection: d });
  assert.match(md, /`docker-compose.yml` runs PostgreSQL as a service; `package.json` depends on PostgreSQL/);
});

test('a strong signal wins even when a weaker store is earlier in the table', () => {
  const d = detectStack({
    'package.json': JSON.stringify({ dependencies: { pg: '8' } }),
    'docker-compose.yaml': 'services:\n  m:\n    image: mongo:7\n'
  });
  assert.deepEqual(d.datastores.map((s) => s.name), ['MongoDB', 'PostgreSQL']);
});

test('compose parsing handles registries, tags, digests and ignores non-database images', () => {
  const y = [
    'services:',
    '  a:', '    image: docker.io/library/postgres:15',
    '  b:', '    image: ghcr.io/acme/mysql-exporter:1',
    '  c:', '    image: mongo@sha256:abc',
    '  d:', '    image: nginx:latest',
    '  e:', '    # image: redis:7',
    '  f:', '    build: .'
  ].join('\n');
  assert.deepEqual(detectStack({ 'docker-compose.yml': y }).datastores.map((s) => s.name), ['PostgreSQL', 'MongoDB']);
});

test('Prisma provider reveals the real database', () => {
  const schema = 'datasource db {\n  provider = "postgresql"\n  url = env("DATABASE_URL")\n}\ngenerator client { provider = "prisma-client-js" }\n';
  const d = detectStack({ 'prisma/schema.prisma': schema });
  assert.equal(d.datastores[0].name, 'PostgreSQL');
  assert.equal(d.datastores[0].strong, true);
  assert.equal(detectStack({ 'prisma/schema.prisma': '// provider = "mongodb"\n' }).datastores.length, 0);
});

test('.env.example connection strings reveal the database; secrets are never read', () => {
  const d = detectStack({ '.env.example': 'DATABASE_URL=postgres://user:pass@localhost:5432/app\nREDIS_URL="redis://localhost:6379"\nPORT=3000\n' });
  assert.deepEqual(d.datastores.map((s) => s.name), ['PostgreSQL', 'Redis']);
  assert.deepEqual(selectStackFiles([{ type: 'blob', path: '.env', size: 10 }, { type: 'blob', path: '.env.local', size: 10 }]), []);
  assert.deepEqual(selectStackFiles([{ type: 'blob', path: '.env.example', size: 10 }]), ['.env.example']);
});

test('additional ecosystems: Gradle Kotlin DSL, Pipfile, .csproj, mix.exs, pubspec', () => {
  assert.equal(detectStack({ 'build.gradle.kts': 'implementation("org.postgresql:postgresql:42")' }).datastores[0].name, 'PostgreSQL');
  assert.equal(detectStack({ 'Pipfile': '[packages]\nfastapi = "*"\npymongo = "*"\n' }).datastores[0].name, 'MongoDB');
  const cs = detectStack({ 'Shop.csproj': '<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup><PackageReference Include="Npgsql" Version="8"/></ItemGroup></Project>' });
  assert.deepEqual(cs.languages, ['C#']);
  assert.equal(cs.datastores[0].name, 'PostgreSQL');
  assert.equal(cs.frameworks[0].name, 'ASP.NET Core');
  assert.equal(detectStack({ 'mix.exs': '{:phoenix, "~> 1.7"}, {:postgrex, ">= 0.0.0"}' }).datastores[0].name, 'PostgreSQL');
  assert.equal(detectStack({ 'pubspec.yaml': 'dependencies:\n  mongo_dart: ^0.10\n' }).datastores[0].name, 'MongoDB');
});

test('monorepo: one level of workspaces is read; deeper and vendored paths are not', () => {
  const t = (path) => ({ type: 'blob', path, size: 100 });
  const picked = selectStackFiles([
    t('package.json'), t('apps/server/package.json'), t('packages/db/package.json'),
    t('apps/server/src/package.json'), t('node_modules/x/package.json'), t('apps/server/README.md'), t('docs/package.json')
  ]);
  assert.deepEqual(picked, ['package.json', 'apps/server/package.json', 'packages/db/package.json']);
  const d = detectStack({ 'package.json': '{}', 'apps/server/package.json': JSON.stringify({ dependencies: { falkordb: '6', express: '4' } }) });
  assert.equal(d.datastores[0].name, 'FalkorDB');
  assert.deepEqual(d.datastores[0].via, ['apps/server/package.json']);
});

test('file selection skips oversized files and caps the number read', () => {
  const big = { type: 'blob', path: 'package.json', size: 5 * 1024 * 1024 };
  assert.deepEqual(selectStackFiles([big]), []);
  const many = Array.from({ length: 40 }, (_, i) => ({ type: 'blob', path: `packages/p${i}/package.json`, size: 10 }));
  assert.equal(selectStackFiles(many).length, 12);
});

test('Initialize reads infrastructure files and cites them in the ADR and the PR', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: {
      'package.json': JSON.stringify({ dependencies: { mongoose: '8' } }),
      'docker-compose.yml': 'services:\n  db:\n    image: postgres:16\n',
      '.env': 'SECRET=do-not-read'
    }
  });
  const pr = await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.deepEqual(pr.detected, ['PostgreSQL', 'MongoDB']);
  assert.ok(!calls.some((c) => c.path.endsWith('/contents/.env')), 'the real .env must never be fetched');
  const md = Buffer.from(calls.find((c) => c.method === 'PUT').body.content, 'base64').toString('utf-8');
  assert.match(md, /fact_id: F-Postgres/);
  assert.match(md, /`docker-compose.yml` runs PostgreSQL as a service, alongside MongoDB/);
  assert.ok(!/package.json` runs/.test(md), 'a library manifest must not be described as running a service');
  const body = calls.find((c) => c.method === 'POST' && c.path.endsWith('/pulls')).body.body;
  assert.match(body, /PostgreSQL, from `docker-compose.yml` \(a service the repository runs\)/);
  assert.match(body, /MongoDB, from `package.json` \(a library dependency\)/);
});

test('Initialize is idempotent: an open CAVDAX PR is returned, not duplicated', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: { 'README.md': '# hi' },
    openPulls: [{ number: 3, html_url: 'https://github.com/o/r/pull/3', head: { ref: 'cavdax/init-adr' } }]
  });
  const pr = await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.equal(pr.number, 3);
  assert.equal(pr.reused, true);
  assert.ok(!calls.some((c) => c.method === 'POST' || c.method === 'PUT'));
});

test('Initialize uses a unique branch when the default name is taken', async () => {
  const { fetchImpl } = fakeGithub({ files: { 'README.md': '# hi' }, takenBranch: true });
  const pr = await createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl, now: new Date(1700000000000) });
  assert.match(pr.branch, /^cavdax\/init-adr-[a-z0-9]+$/);
});

test('Initialize refuses when the repo already has ADRs', async () => {
  const { fetchImpl, calls } = fakeGithub({ files: { 'docs/adrs/ADR-001.md': ADR1 } });
  await assert.rejects(() => createAdrPullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl }), (e) => e.code === 'ADRS_EXIST' && e.status === 409);
  assert.ok(!calls.some((c) => c.method !== 'GET'));
});

test('GitHub errors map to clear codes', async () => {
  for (const [status, code] of [[401, 'AUTH_EXPIRED'], [404, 'NOT_FOUND'], [403, 'FORBIDDEN']]) {
    const fetchImpl = async () => json({}, status);
    await assert.rejects(() => scanRepoAdrs({ token: 't', owner: 'o', repo: 'r', fetchImpl }), (e) => e.code === code);
  }
});

test('buildGraphFromAdrs ignores a supersedes target that does not exist', () => {
  const g = buildGraphFromAdrs([{ id: 'ADR-009', title: 'x', path: 'p', supersedes: ['ADR-404'], fact_id: null, fact_claim: null }]);
  assert.equal(g.nodes.length, 1);
  assert.equal(g.edges.length, 0);
});


test('detectUnsyncedSupersessions finds superseded ADRs still marked ACCEPTED', () => {
  const adrs = [
    { id: 'ADR-001', title: 'Old Mongo', status: 'ACCEPTED', path: 'docs/adrs/ADR-001.md', supersedes: [] },
    { id: 'ADR-002', title: 'New Postgres', status: 'ACCEPTED', path: 'docs/adrs/ADR-002.md', supersedes: ['ADR-001'] }
  ];
  const unsynced = detectUnsyncedSupersessions(adrs);
  assert.equal(unsynced.length, 1);
  assert.equal(unsynced[0].targetId, 'ADR-001');
  assert.equal(unsynced[0].supersedingId, 'ADR-002');
});

test('detectUnsyncedSupersessions ignores ADRs already marked SUPERSEDED', () => {
  const adrs = [
    { id: 'ADR-001', title: 'Old Mongo', status: 'SUPERSEDED by ADR-002', path: 'docs/adrs/ADR-001.md', supersedes: [] },
    { id: 'ADR-002', title: 'New Postgres', status: 'ACCEPTED', path: 'docs/adrs/ADR-002.md', supersedes: ['ADR-001'] }
  ];
  const unsynced = detectUnsyncedSupersessions(adrs);
  assert.equal(unsynced.length, 0);
});

test('applySupersededStatusToAdr rewrites frontmatter and plain text correctly', () => {
  const fmAdr = '---\nid: ADR-001\nstatus: ACCEPTED\ntitle: Old\n---\n# ADR-001\n';
  const updatedFm = applySupersededStatusToAdr(fmAdr, 'ADR-002');
  assert.match(updatedFm, /status: SUPERSEDED by ADR-002/);

  const plainAdr = '# ADR-001\nNo frontmatter here.\n';
  const updatedPlain = applySupersededStatusToAdr(plainAdr, 'ADR-002');
  assert.match(updatedPlain, /status: SUPERSEDED by ADR-002/);
  assert.match(updatedPlain, /# ADR-001/);
});

test('syncSupersededAdrPullRequest opens a pull request on a dedicated branch', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: {
      'docs/adrs/ADR-001.md': ADR1,
      'docs/adrs/ADR-002.md': ADR2
    }
  });

  const res = await syncSupersededAdrPullRequest({
    token: 't',
    owner: 'o',
    repo: 'r',
    targetId: 'ADR-001',
    supersedingId: 'ADR-002',
    fetchImpl
  });

  assert.equal(res.targetId, 'ADR-001');
  assert.equal(res.supersedingId, 'ADR-002');
  assert.equal(res.reused, false);
  assert.ok(res.branch.startsWith("cavdax/sync-adr-001-status"));

  // Verifies it never wrote to default branch directly
  const refCall = calls.find((c) => c.method === 'POST' && c.path === '/repos/o/r/git/refs');
  assert.ok(refCall);
  assert.equal(refCall.body.ref, `refs/heads/${res.branch}`);

  // Verifies PUT committed to the new branch
  const putCall = calls.find((c) => c.method === 'PUT' && c.path.includes('ADR-001.md'));
  assert.ok(putCall);
  assert.equal(putCall.body.branch, res.branch);
  const committedText = Buffer.from(putCall.body.content, 'base64').toString('utf-8');
  assert.match(committedText, /status: SUPERSEDED by ADR-002/);

  // Verifies PR opened
  const prCall = calls.find((c) => c.method === 'POST' && c.path === '/repos/o/r/pulls');
  assert.ok(prCall);
  assert.match(prCall.body.title, /chore\(adr\): mark ADR-001 superseded by ADR-002/);
});

test('syncSupersededAdrPullRequest is idempotent when PR is already open', async () => {
  const { fetchImpl } = fakeGithub({
    files: {
      'docs/adrs/ADR-001.md': ADR1,
      'docs/adrs/ADR-002.md': ADR2
    },
    openPulls: [{ number: 99, html_url: 'https://github.com/o/r/pull/99', head: { ref: 'cavdax/sync-adr-001-status' } }]
  });

  const res = await syncSupersededAdrPullRequest({
    token: 't',
    owner: 'o',
    repo: 'r',
    targetId: 'ADR-001',
    supersedingId: 'ADR-002',
    fetchImpl
  });

  assert.equal(res.reused, true);
  assert.equal(res.number, 99);
});

test('syncSupersededAdrPullRequest refuses when target is not superseded', async () => {
  const { fetchImpl } = fakeGithub({
    files: {
      'docs/adrs/ADR-001.md': ADR1
    }
  });

  await assert.rejects(
    () => syncSupersededAdrPullRequest({ token: 't', owner: 'o', repo: 'r', targetId: 'ADR-001', supersedingId: 'ADR-002', fetchImpl }),
    (e) => e.code === 'SUPERSEDING_NOT_FOUND' && e.status === 404
  );
});

test('listRepoBranches returns formatted branches with isDefault indicator', async () => {
  const { fetchImpl } = fakeGithub();
  const branches = await listRepoBranches({ token: 't', owner: 'o', repo: 'r', fetchImpl });
  assert.equal(Array.isArray(branches), true);
  assert.equal(branches.length, 2);
  assert.equal(branches[0].name, 'main');
  assert.equal(branches[0].isDefault, true);
  assert.equal(branches[1].name, 'feat/branch-1');
  assert.equal(branches[1].isDefault, false);
});

test('scanRepoAdrs supports targeting a specific branch ref', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: { 'docs/adrs/ADR-001.md': ADR1 }
  });
  const res = await scanRepoAdrs({ token: 't', owner: 'o', repo: 'r', branch: 'feat/branch-1', fetchImpl });
  assert.equal(res.count, 1);
  assert.equal(res.branch, 'feat/branch-1');
  const treeCall = calls.find(c => c.method === 'GET' && c.path.includes('/git/trees/feat/branch-1'));
  assert.ok(treeCall, 'Should fetch tree for requested branch');
});

test('proposeAdrPullRequest opens a pull request with sequential ADR number', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: {
      'docs/adrs/ADR-001.md': ADR1,
      'docs/adrs/ADR-002.md': ADR2
    }
  });

  const res = await proposeAdrPullRequest({
    token: 'test-token',
    owner: 'o',
    repo: 'r',
    title: 'Migrate Session Store to Redis',
    context: 'Memory store does not persist across container reboots.',
    decision: 'Use Redis for session persistence.',
    consequences: 'Requires REDIS_URL in environment.',
    supersedes: 'ADR-001',
    fetchImpl
  });

  assert.equal(res.adrId, 'ADR-003');
  assert.equal(res.number, 7);
  assert.ok(res.branch.startsWith('cavdax/propose-adr-003'));
  assert.equal(res.path, 'docs/adrs/ADR-003-migrate-session-store-to-redis.md');

  // Verify file PUT payload
  const putCall = calls.find(c => c.method === 'PUT' && c.path.includes('docs/adrs/ADR-003'));
  assert.ok(putCall, 'Should put content for ADR-003');
  const decodedContent = Buffer.from(putCall.body.content, 'base64').toString('utf-8');
  assert.ok(decodedContent.includes('id: ADR-003'));
  assert.ok(decodedContent.includes('supersedes: ADR-001'));
  assert.ok(decodedContent.includes('Migrate Session Store to Redis'));

  // Verify PR POST payload
  const prCall = calls.find(c => c.method === 'POST' && c.path === '/repos/o/r/pulls');
  assert.ok(prCall, 'Should create GitHub PR');
  assert.ok(prCall.body.title.includes('Propose ADR-003'));
});

test('proposeAdrPullRequest avoids numbering collisions with in-flight open PR proposals', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: {
      'docs/adrs/ADR-001.md': ADR1,
      'docs/adrs/ADR-002.md': ADR2
    },
    openPulls: [
      {
        number: 10,
        title: 'Propose ADR-003: In-flight proposal from agent A',
        head: { ref: 'cavdax/propose-adr-003-agent-a' }
      }
    ]
  });

  const res = await proposeAdrPullRequest({
    token: 'test-token',
    owner: 'o',
    repo: 'r',
    title: 'Adopt Kafka for Event Streaming',
    context: 'Need pub-sub broker.',
    decision: 'Use Apache Kafka.',
    consequences: 'Zookeeper/KRaft operational overhead.',
    fetchImpl
  });

  // Should skip ADR-003 because of the open PR and allocate ADR-004
  assert.equal(res.adrId, 'ADR-004');
  assert.ok(res.branch.startsWith('cavdax/propose-adr-004'));
  assert.equal(res.path, 'docs/adrs/ADR-004-adopt-kafka-for-event-streaming.md');
});

test('proposeAdrPullRequest validates required title and decision fields', async () => {
  const { fetchImpl } = fakeGithub();
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: '', decision: 'd', fetchImpl }),
    (e) => e.code === 'INVALID_TITLE' && e.status === 400
  );
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'Valid ADR Title', decision: '', fetchImpl }),
    (e) => e.code === 'INVALID_DECISION' && e.status === 400
  );
});

test('createCiGatePullRequest opens PR adding .github/workflows/cavdax-gate.yml', async () => {
  const { fetchImpl, calls } = fakeGithub({
    files: { 'docs/adrs/ADR-001.md': ADR1 }
  });

  const res = await createCiGatePullRequest({
    token: 'test-token',
    owner: 'o',
    repo: 'r',
    fetchImpl
  });

  assert.equal(res.number, 7);
  assert.ok(res.branch.startsWith('cavdax/ci-architecture-gate'));
  assert.equal(res.path, '.github/workflows/cavdax-gate.yml');

  const putCall = calls.find(c => c.method === 'PUT' && c.path.includes('.github/workflows/cavdax-gate.yml'));
  assert.ok(putCall, 'Should commit cavdax-gate.yml');
  const decoded = Buffer.from(putCall.body.content, 'base64').toString('utf-8');
  assert.ok(decoded.includes('@cavdax/mcp-server') && decoded.includes('gate'));
});

test('proposeAdrPullRequest security: rejects CRLF injection, oversized inputs, and invalid supersedes', async () => {
  const { fetchImpl } = fakeGithub({
    files: { 'docs/adrs/ADR-001.md': ADR1 }
  });

  // Rejects CRLF in title
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'ADR Title\nstatus: ACCEPTED', decision: 'Valid decision', fetchImpl }),
    (e) => e.code === 'INVALID_TITLE' && e.status === 400
  );

  // Rejects title exceeding 200 chars
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'A'.repeat(201), decision: 'Valid decision', fetchImpl }),
    (e) => e.code === 'INVALID_TITLE' && e.status === 400
  );

  // Rejects title shorter than 3 chars
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'ab', decision: 'Valid decision', fetchImpl }),
    (e) => e.code === 'INVALID_TITLE' && e.status === 400
  );

  // Rejects decision exceeding 20,000 chars
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'Valid Title', decision: 'x'.repeat(20001), fetchImpl }),
    (e) => e.code === 'INVALID_DECISION' && e.status === 400
  );

  // Rejects malicious or CRLF supersedes string
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'Valid Title', decision: 'Valid decision', supersedes: 'ADR-001\nstatus: ACCEPTED', fetchImpl }),
    (e) => e.code === 'INVALID_SUPERSEDES' && e.status === 400
  );

  // Rejects supersedes with path traversal
  await assert.rejects(
    () => proposeAdrPullRequest({ token: 't', owner: 'o', repo: 'r', title: 'Valid Title', decision: 'Valid decision', supersedes: '../../etc/passwd', fetchImpl }),
    (e) => e.code === 'INVALID_SUPERSEDES' && e.status === 400
  );
});

test('createCiGatePullRequest security: idempotent reuse and workflow collision refusal', async () => {
  // Idempotency: Reuses existing open PR
  const { fetchImpl: reuseFetch } = fakeGithub({
    files: { 'docs/adrs/ADR-001.md': ADR1 },
    openPulls: [{ number: 42, html_url: 'https://github.com/o/r/pull/42', head: { ref: 'cavdax/ci-architecture-gate' } }]
  });

  const reused = await createCiGatePullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl: reuseFetch });
  assert.equal(reused.number, 42);
  assert.equal(reused.reused, true);

  // Refusal: Fails if .github/workflows/cavdax-gate.yml already exists
  const { fetchImpl: conflictFetch } = fakeGithub({
    files: {
      'docs/adrs/ADR-001.md': ADR1,
      '.github/workflows/cavdax-gate.yml': 'name: Existing Gate'
    }
  });

  await assert.rejects(
    () => createCiGatePullRequest({ token: 't', owner: 'o', repo: 'r', fetchImpl: conflictFetch }),
    (e) => e.code === 'WORKFLOW_ALREADY_EXISTS' && e.status === 409
  );
});


test('buildGraphFromAdrs: PROPOSED ADR does not invalidate active decisions', () => {
  const adrs = [
    {
      id: 'ADR-001',
      title: 'Active ADR',
      status: 'ACCEPTED',
      fact_id: 'F-1',
      fact_claim: 'Claim 1',
      decision_id: 'DEC-1',
      decision_title: 'Decision 1',
      supersedes: []
    },
    {
      id: 'ADR-002',
      title: 'Draft Proposal',
      status: 'PROPOSED',
      fact_id: 'F-2',
      fact_claim: 'Claim 2',
      decision_id: 'DEC-2',
      decision_title: 'Decision 2',
      supersedes: ['ADR-001']
    }
  ];

  const { nodes } = buildGraphFromAdrs(adrs);
  const src1 = nodes.find(n => n.id === 'ADR-001');
  const src2 = nodes.find(n => n.id === 'ADR-002');
  const dec1 = nodes.find(n => n.id === 'DEC-1');
  const dec2 = nodes.find(n => n.id === 'DEC-2');

  assert.equal(src1.status, 'ACTIVE', 'ADR-001 must remain ACTIVE');
  assert.equal(dec1.status, 'VALID', 'DEC-1 must remain VALID');
  assert.equal(src2.status, 'PROPOSED', 'ADR-002 must be marked PROPOSED');
  assert.equal(dec2.status, 'PROPOSED', 'DEC-2 must be marked PROPOSED');
});
