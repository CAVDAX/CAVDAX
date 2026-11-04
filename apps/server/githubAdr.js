/**
 * GitHub ADR scan + "Initialize ADR" pull request.
 *
 * Everything here talks to the GitHub REST API with the signed-in user's OAuth token.
 * It never writes to the default branch: the only write is a new branch + one file + a pull
 * request, so the repository owner stays in control and merges (or closes) it on GitHub.
 */
import { parseFrontmatter } from '../../core/ingestion/parser.js';
import { isAdrPath } from '../../core/ingestion/adrPaths.js';

const GH_API = 'https://api.github.com';
const MAX_ADR_FILES = 50;
const MAX_ADR_BYTES = 100 * 1024;
const FETCH_BATCH = 10;

export const NEW_ADR_PATH = 'docs/adrs/ADR-001-record-architecture-decisions.md';
const BASE_BRANCH_NAME = 'cavdax/init-adr';

export class GithubAdrError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
export function assertRepoName(owner, repo) {
  const ok = [owner, repo].every((s) => typeof s === 'string' && NAME_RE.test(s) && s !== '.' && s !== '..');
  if (!ok) throw new GithubAdrError(400, 'INVALID_REPO', 'Invalid repository name.');
}

async function gh(fetchImpl, token, method, urlPath, body, accept = 'application/vnd.github+json') {
  const res = await fetchImpl(`${GH_API}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'cavdax',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.ok) {
    return accept.includes('raw') ? res.text() : res.json();
  }
  if (res.status === 401) throw new GithubAdrError(401, 'AUTH_EXPIRED', 'GitHub session expired. Sign in again.');
  if (res.status === 404) throw new GithubAdrError(404, 'NOT_FOUND', 'Repository not found or not accessible with this GitHub account.');
  if (res.status === 403) throw new GithubAdrError(403, 'FORBIDDEN', 'GitHub denied this request. Check repository access and write permission.');
  if (res.status === 409) throw new GithubAdrError(409, 'REPO_EMPTY', 'The repository has no commits yet.');
  if (res.status === 422) throw new GithubAdrError(422, 'UNPROCESSABLE', 'GitHub rejected the request.');
  throw new GithubAdrError(502, 'GITHUB_ERROR', `GitHub returned ${res.status}.`);
}

const enc = (s) => s.split('/').map(encodeURIComponent).join('/');

/**
 * Builds the causal graph the console renders, from parsed ADR frontmatter.
 * Mirrors the engine's cascade: an ADR that supersedes another marks it SUPERSEDED, its facts
 * stale, and the decisions that depend on those facts INVALIDATED_NEEDS_REVALIDATION.
 */
export function buildGraphFromAdrs(adrs) {
  const edges = [];
  const sources = new Map();
  const facts = new Map();
  const decisions = new Map();

  for (const adr of adrs) {
    const isProposed = String(adr.status || '').toUpperCase().includes('PROPOSED');
    sources.set(adr.id, {
      id: adr.id,
      label: 'Source',
      title: `${adr.id}: ${adr.title}`,
      status: isProposed ? 'PROPOSED' : 'ACTIVE',
      file: adr.path,
      adr_path: adr.path
    });
    if (adr.fact_id && adr.fact_claim) {
      facts.set(adr.fact_id, {
        id: adr.fact_id,
        label: 'Fact',
        title: adr.fact_claim,
        status: isProposed ? 'PROPOSED' : 'VALID',
        is_stale: false,
        from: adr.id,
        file: adr.path,
        adr_path: adr.path
      });
      edges.push({ source: adr.fact_id, target: adr.id, type: 'EXTRACTED_FROM' });
    }
  }

  for (const adr of adrs) {
    if (adr.decision_id && adr.fact_id && facts.has(adr.fact_id)) {
      const isProposed = String(adr.status || '').toUpperCase().includes('PROPOSED');
      const derivedTarget = adr.target_file || adr.path || null;
      decisions.set(adr.decision_id, {
        id: adr.decision_id,
        label: 'Decision',
        title: adr.decision_title || adr.decision_id,
        status: isProposed ? 'PROPOSED' : 'VALID',
        on: adr.fact_id,
        source_adr: adr.id,
        adr_path: adr.path,
        file: adr.path,
        target_file: derivedTarget
      });
      edges.push({ source: adr.decision_id, target: adr.fact_id, type: 'DEPENDS_ON' });
    }
  }

  for (const adr of adrs) {
    // Architectural Invariant: A PROPOSED ADR is an open draft or pull request.
    // It must NOT actively supersede or invalidate approved architecture records!
    if (String(adr.status || '').toUpperCase().includes('PROPOSED')) continue;

    for (const oldId of adr.supersedes) {
      const old = sources.get(oldId);
      if (!old || oldId === adr.id) continue;
      old.status = 'SUPERSEDED';
      edges.push({ source: adr.id, target: oldId, type: 'SUPERSEDES' });
      for (const f of facts.values()) {
        if (f.from !== oldId) continue;
        f.is_stale = true;
        for (const d of decisions.values()) {
          if (d.on === f.id) d.status = 'INVALIDATED_NEEDS_REVALIDATION';
        }
      }
    }
  }

  // Preserve 'from', 'on', 'source_adr', 'target_file' so causal graph inspection has full provenance
  const nodes = [...sources.values(), ...facts.values(), ...decisions.values()];
  return { nodes, edges };
}

function toArray(v) {
  if (!v) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean).map(String);
}

/**
 * Finds ADRs in the repository that have been superseded by a newer ADR according
 * to frontmatter "supersedes" declarations, but whose own file status does not yet
 * indicate that they are superseded (e.g. still says "ACCEPTED" or "PROPOSED").
 */
export function detectUnsyncedSupersessions(adrs) {
  const byId = new Map(adrs.map((a) => [a.id, a]));
  const unsynced = [];

  for (const adr of adrs) {
    const isProposed = String(adr.status || '').toUpperCase().includes('PROPOSED');
    if (isProposed) continue;

    for (const oldId of (adr.supersedes || [])) {
      const target = byId.get(oldId);
      if (!target || target.id === adr.id) continue;

      const currentStatus = String(target.status || "").toUpperCase();
      // If the target file status doesn't clearly reflect that it has been superseded
      if (!currentStatus.includes("SUPERSEDED")) {
        unsynced.push({
          targetId: target.id,
          targetPath: target.path,
          targetTitle: target.title,
          currentStatus: target.status || "ACCEPTED",
          supersedingId: adr.id,
          supersedingPath: adr.path,
          supersedingTitle: adr.title
        });
      }
    }
  }

  return unsynced;
}

/**
 * Updates an ADR file text to reflect that it has been superseded by a newer ADR.
 * Updates the frontmatter status: line, or inserts one if missing.
 */
export function applySupersededStatusToAdr(text, supersedingId) {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const rawFm = fmMatch[1];
    let newFm;
    if (/^status\s*:/im.test(rawFm)) {
      newFm = rawFm.replace(/^status\s*:.*$/im, "status: SUPERSEDED by " + supersedingId);
    } else {
      newFm = rawFm + "\nstatus: SUPERSEDED by " + supersedingId;
    }
    return text.replace(fmMatch[0], "---\n" + newFm.trim() + "\n---");
  }

  // Plain markdown without YAML frontmatter
  return "---\nstatus: SUPERSEDED by " + supersedingId + "\n---\n\n> **Note:** This decision has been superseded by [" + supersedingId + "].\n\n" + text;
}

/** Lists the ADRs on the repository's default branch and parses them. */
export async function scanRepoAdrs(args) {
  const { tree: _tree, ...result } = await scanWithTree(args);
  return result;
}

async function scanWithTree({ token, owner, repo, branch: requestedBranch, fetchImpl = fetch }) {
  assertRepoName(owner, repo);
  const meta = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}`);
  const branch = requestedBranch || meta.default_branch;
  const tree = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);

  const adrFiles = (tree.tree || [])
    .filter((e) => e.type === 'blob' && isAdrPath(e.path))
    .sort((a, b) => a.path.localeCompare(b.path));
  const capped = adrFiles.length > MAX_ADR_FILES;
  const selected = adrFiles.slice(0, MAX_ADR_FILES);

  const parsed = [];
  for (let i = 0; i < selected.length; i += FETCH_BATCH) {
    const batch = selected.slice(i, i + FETCH_BATCH);
    const results = await Promise.all(batch.map(async (entry) => {
      if (entry.size > MAX_ADR_BYTES) return null;
      const text = await gh(fetchImpl, token, 'GET',
        `/repos/${owner}/${repo}/contents/${enc(entry.path)}?ref=${encodeURIComponent(branch)}`,
        null, 'application/vnd.github.raw+json');
      const { frontmatter } = parseFrontmatter(text, entry.path);
      const base = entry.path.slice(entry.path.lastIndexOf('/') + 1).replace(/\.md$/i, '');
      const id = String(frontmatter.id || base);
      return {
        path: entry.path,
        id,
        title: String(frontmatter.title || id),
        status: frontmatter.status || null,
        supersedes: toArray(frontmatter.supersedes),
        fact_id: frontmatter.fact_id || null,
        fact_claim: frontmatter.fact_claim || null,
        decision_id: frontmatter.decision_id || null,
        decision_title: frontmatter.decision_title || null,
        target_file: frontmatter.target_file || null
      };
    }));
    parsed.push(...results.filter(Boolean));
  }

  return {
    tree: tree.tree || [],
    repo: `${owner}/${repo}`,
    branch,
    count: parsed.length,
    truncated: Boolean(tree.truncated) || capped,
    adrs: parsed.map(({ path: p, id, title, status, supersedes }) => ({ path: p, id, title, status, supersedes })),
    graph: buildGraphFromAdrs(parsed),
    unsynced: detectUnsyncedSupersessions(parsed)
  };
}

// ---------------------------------------------------------------------------
// Stack detection: the starter ADR describes what the repository actually uses.
// Only facts that are literally present in a file are claimed, and each one records
// which file it came from. Two kinds of signal are read:
//   - infrastructure config (docker-compose, Prisma schema, .env.example): states which
//     service really runs, so it outranks a client library;
//   - dependency manifests (package.json, go.mod, ...): states which libraries are used.
// ---------------------------------------------------------------------------

// Dependency manifests -> language (null: a dependency catalogue with no language of its own).
const MANIFESTS = {
  'package.json': 'Node.js',
  'requirements.txt': 'Python',
  'pyproject.toml': 'Python',
  'Pipfile': 'Python',
  'setup.py': 'Python',
  'go.mod': 'Go',
  'Cargo.toml': 'Rust',
  'pom.xml': 'Java',
  'build.gradle': 'Java',
  'build.gradle.kts': 'Kotlin/Java',
  'gradle/libs.versions.toml': null,
  'build.sbt': 'Scala',
  'Gemfile': 'Ruby',
  'composer.json': 'PHP',
  'mix.exs': 'Elixir',
  'pubspec.yaml': 'Dart',
  'Package.swift': 'Swift'
};
const COMPOSE_FILES = new Set(['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']);
// Only example env files are read. The real `.env` holds secrets and is never fetched.
const ENV_EXAMPLE_FILES = new Set(['.env.example', '.env.sample', '.env.template', '.env.dist']);
const PRISMA_FILES = new Set(['prisma/schema.prisma', 'schema.prisma']);
const MAX_MANIFEST_BYTES = 200 * 1024;
const MAX_STACK_FILES = 12;

const WORKSPACE_FILE = /^(?:apps|packages|services|libs|backend|frontend|server|client)\/[^/]+\/([^/]+)$/;

/** Maps a repo-relative path to the manifest name it stands for: itself, or the file inside a one-level workspace. */
function manifestName(p) {
  if (fileKind(p)) return p;
  const ws = p.match(WORKSPACE_FILE);
  return ws && fileKind(ws[1]) === 'dependencies' ? ws[1] : null;
}

/** @returns {'dependencies'|'compose'|'env'|'prisma'|null} how a repo-relative path should be read */
function fileKind(p) {
  if (Object.hasOwn(MANIFESTS, p) || /^[^/]+\.csproj$/.test(p)) return 'dependencies';
  if (COMPOSE_FILES.has(p)) return 'compose';
  if (ENV_EXAMPLE_FILES.has(p)) return 'env';
  if (PRISMA_FILES.has(p)) return 'prisma';
  return null;
}

// Ordered by architectural weight: a primary database outranks a cache.
const DATASTORES = [
  { name: 'PostgreSQL', slug: 'Postgres', tokens: ['pg', 'pg-promise', 'postgres', 'psycopg2', 'psycopg2-binary', 'psycopg', 'asyncpg', 'github.com/lib/pq', 'github.com/jackc/pgx', 'postgresql', 'org.postgresql', 'npgsql', 'postgrex', 'postgres-nio'] },
  { name: 'MySQL', slug: 'MySQL', tokens: ['mysql', 'mysql2', 'mysqlclient', 'pymysql', 'github.com/go-sql-driver/mysql', 'mysql-connector-j', 'mysql-connector-java', 'mysql.data', 'pomelo.entityframeworkcore.mysql', 'myxql'] },
  { name: 'MariaDB', slug: 'MariaDB', tokens: ['mariadb', 'org.mariadb.jdbc', 'mariadb-java-client'] },
  { name: 'MongoDB', slug: 'Mongo', tokens: ['mongodb', 'mongoose', 'pymongo', 'motor', 'mongoengine', 'go.mongodb.org/mongo-driver', 'mongodb-driver-sync', 'mongodb.driver', 'mongodb_driver', 'mongo_dart'] },
  { name: 'SQLite', slug: 'SQLite', tokens: ['sqlite3', 'better-sqlite3', 'sqlite-jdbc'] },
  { name: 'DynamoDB', slug: 'DynamoDB', tokens: ['@aws-sdk/client-dynamodb', 'aws-sdk-dynamodb'] },
  { name: 'FalkorDB', slug: 'FalkorDB', tokens: ['falkordb'] },
  { name: 'Redis', slug: 'Redis', tokens: ['redis', 'ioredis', 'github.com/redis/go-redis', 'jedis', 'spring-boot-starter-data-redis', 'stackexchange.redis', 'redix'] }
];

const FRAMEWORKS = [
  { name: 'Express', slug: 'Express', tokens: ['express'] },
  { name: 'Fastify', slug: 'Fastify', tokens: ['fastify'] },
  { name: 'NestJS', slug: 'NestJS', tokens: ['@nestjs/core'] },
  { name: 'Next.js', slug: 'Next', tokens: ['next'] },
  { name: 'React', slug: 'React', tokens: ['react'] },
  { name: 'Vue', slug: 'Vue', tokens: ['vue'] },
  { name: 'Django', slug: 'Django', tokens: ['django'] },
  { name: 'Flask', slug: 'Flask', tokens: ['flask'] },
  { name: 'FastAPI', slug: 'FastAPI', tokens: ['fastapi'] },
  { name: 'Spring Boot', slug: 'SpringBoot', tokens: ['spring-boot-starter-web', 'spring-boot-starter'] },
  { name: 'Gin', slug: 'Gin', tokens: ['github.com/gin-gonic/gin'] },
  { name: 'Rails', slug: 'Rails', tokens: ['rails'] },
  { name: 'Laravel', slug: 'Laravel', tokens: ['laravel/framework'] },
  { name: 'ASP.NET Core', slug: 'AspNetCore', tokens: ['microsoft.net.sdk.web', 'microsoft.aspnetcore.app'] },
  { name: 'Phoenix', slug: 'Phoenix', tokens: ['phoenix'] }
];

// Infrastructure names -> datastore slug.
const IMAGE_TO_SLUG = {
  postgres: 'Postgres', postgis: 'Postgres', postgresql: 'Postgres',
  mysql: 'MySQL', mariadb: 'MariaDB',
  mongo: 'Mongo', mongodb: 'Mongo',
  redis: 'Redis', 'redis-stack': 'Redis', 'redis-stack-server': 'Redis',
  falkordb: 'FalkorDB'
};
const SCHEME_TO_SLUG = {
  postgres: 'Postgres', postgresql: 'Postgres', mysql: 'MySQL',
  mongodb: 'Mongo', 'mongodb+srv': 'Mongo', redis: 'Redis', rediss: 'Redis'
};
const PRISMA_PROVIDER_TO_SLUG = { postgresql: 'Postgres', mysql: 'MySQL', sqlite: 'SQLite', mongodb: 'Mongo' };

/** Extracts lowercase dependency names from one manifest file. */
function dependencyNames(fileName, content) {
  const out = new Set();
  if (fileName === 'package.json' || fileName === 'composer.json') {
    try {
      const pkg = JSON.parse(content);
      for (const key of ['dependencies', 'devDependencies', 'require', 'require-dev']) {
        for (const dep of Object.keys(pkg[key] || {})) out.add(dep.toLowerCase());
      }
    } catch { /* malformed manifest: claim nothing from it */ }
    return out;
  }
  if (fileName === 'pom.xml') {
    for (const m of content.matchAll(/<artifactId>\s*([^<\s]+)\s*<\/artifactId>/g)) out.add(m[1].toLowerCase());
    return out;
  }
  if (fileName.endsWith('.csproj')) {
    for (const m of content.matchAll(/(?:Include|Sdk)\s*=\s*"([^"]+)"/gi)) out.add(m[1].toLowerCase());
    return out;
  }
  // requirements.txt, pyproject.toml, Pipfile, setup.py, go.mod, Cargo.toml, build.gradle(.kts),
  // build.sbt, Gemfile, mix.exs, pubspec.yaml, Package.swift: tokenise.
  for (const m of content.toLowerCase().matchAll(/[a-z0-9@][a-z0-9_.\-/@]*/g)) out.add(m[0]);
  return out;
}

/** Datastore slugs that an infrastructure config file states are in use. */
function infrastructureSlugs(kind, content) {
  const slugs = new Set();
  if (kind === 'compose') {
    for (const m of content.matchAll(/^[ \t-]*image:[ \t]*["']?([^\s"'#]+)/gm)) {
      const name = m[1].split('@')[0].split('/').pop().split(':')[0].toLowerCase();
      if (Object.hasOwn(IMAGE_TO_SLUG, name)) slugs.add(IMAGE_TO_SLUG[name]);
    }
  } else if (kind === 'env') {
    const re = /^[ \t]*(?:export[ \t]+)?[A-Za-z_][A-Za-z0-9_]*[ \t]*=[ \t]*["']?(?:jdbc:)?(postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?):\/\//gim;
    for (const m of content.matchAll(re)) slugs.add(SCHEME_TO_SLUG[m[1].toLowerCase()]);
  } else if (kind === 'prisma') {
    const code = content.replace(/^[ \t]*\/\/.*$/gm, '');
    for (const m of code.matchAll(/provider\s*=\s*"(postgresql|mysql|sqlite|mongodb)"/g)) slugs.add(PRISMA_PROVIDER_TO_SLUG[m[1]]);
  }
  return slugs;
}

/**
 * @param {Record<string,string>} files repo-relative path -> content
 * @returns {{languages: string[], datastores: object[], frameworks: object[], evidence: string[]}}
 *   Each datastore/framework carries `via` (the files that showed it) and `strong` (true when an
 *   infrastructure config file, not just a library, showed it). Strong datastores sort first.
 */
export function detectStack(files) {
  const languages = [];
  const evidence = [];
  const found = new Map(); // slug -> { via: Set<string>, strong: boolean }
  const mark = (slug, file, strong) => {
    const hit = found.get(slug) || { via: new Set(), strong: false };
    hit.via.add(file);
    hit.strong = hit.strong || strong;
    found.set(slug, hit);
  };

  for (const [file, content] of Object.entries(files)) {
    const name = manifestName(file);
    const kind = name && fileKind(name);
    if (!kind) continue;
    evidence.push(file);
    if (kind === 'dependencies') {
      const lang = name.endsWith('.csproj') ? 'C#' : MANIFESTS[name];
      if (lang && !languages.includes(lang)) languages.push(lang);
      const deps = dependencyNames(name, content);
      for (const entry of [...DATASTORES, ...FRAMEWORKS]) {
        if (entry.tokens.some((t) => deps.has(t))) mark(entry.slug, file, false);
      }
    } else {
      for (const slug of infrastructureSlugs(kind, content)) mark(slug, file, true);
    }
  }

  const collect = (table) => table
    .filter((e) => found.has(e.slug))
    .map((e) => ({ ...e, via: [...found.get(e.slug).via], strong: found.get(e.slug).strong }))
    .sort((a, b) => Number(b.strong) - Number(a.strong)); // stable: ties keep table order
  return { languages, datastores: collect(DATASTORES), frameworks: collect(FRAMEWORKS), evidence };
}

function joinList(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * The starter ADR committed by the pull request. Parseable by the CAVDAX ingestion engine.
 * With a detected stack it records the repository's primary technology choice; with nothing
 * detected it falls back to the standard "record architecture decisions" ADR.
 */
export function buildStarterAdr({ date = new Date(), repo = 'this repository', detection = null } = {}) {
  const day = date.toISOString().slice(0, 10);
  const primary = detection && (detection.datastores[0] || detection.frameworks[0]);

  if (!primary) {
    return `---
id: ADR-001
title: Record architecture decisions
status: ACCEPTED
date: ${day}
fact_id: F-ADR-Process
fact_claim: Architecture decisions for ${repo} are recorded as ADRs in docs/adrs
decision_id: DEC-001
decision_title: Record significant architecture decisions as ADRs
---
# ADR-001: Record architecture decisions

## Context
CAVDAX could not detect a technology stack from the manifest files in ${repo}.
Architecture decisions are easy to lose, and AI coding agents need one place to read what was decided.

## Decision
Significant architecture decisions are recorded as Markdown files in \`docs/adrs/\`.
When a decision changes, add a new ADR that sets \`supersedes: ADR-001\` (use the old ADR id)
instead of editing history.

## Consequences
- CAVDAX reads these files and builds a causal graph of sources, facts and decisions.
- Agents are blocked from acting on a decision whose source ADR has been superseded.
- Replace this with a real decision from your project when you have one.
`;
  }

  const isStore = detection.datastores[0] === primary;
  const others = [...detection.datastores, ...detection.frameworks].filter((e) => e !== primary);
  const stack = detection.languages.length ? ` (${joinList(detection.languages)})` : '';
  const kind = isStore ? 'data store' : 'application framework';
  const subject = isStore ? `${primary.name} as the primary data store` : `${primary.name} as the application framework`;
  const files = (e) => joinList(e.via.map((f) => `\`${f}\``));
  const sources = joinList(detection.evidence.map((f) => `\`${f}\``));
  // Infrastructure files say a service runs; manifests only say a library is used. Keep them apart.
  const isInfra = (f) => fileKind(manifestName(f) || f) !== 'dependencies';
  const infraVia = primary.via.filter(isInfra);
  const libVia = primary.via.filter((f) => !isInfra(f));
  const proof = [
    infraVia.length ? `${files({ via: infraVia })} ${infraVia.length === 1 ? 'runs' : 'run'} ${primary.name} as a service` : '',
    libVia.length ? `${files({ via: libVia })} ${libVia.length === 1 ? 'depends' : 'depend'} on ${primary.name}` : ''
  ].filter(Boolean).join('; ');

  return `---
id: ADR-001
title: Use ${primary.name} as the ${kind} for ${repo}
status: ACCEPTED
date: ${day}
fact_id: F-${primary.slug}
fact_claim: ${repo} uses ${subject}
decision_id: DEC-001
decision_title: Build ${repo} on ${primary.name}
---
# ADR-001: Use ${primary.name} as the ${kind} for ${repo}

## Context
CAVDAX read ${sources} in ${repo}${stack}. ${proof}${others.length ? `, alongside ${joinList(others.map((e) => e.name))}` : ''}.
This record captures that existing choice so engineers and AI coding agents work against it.

## Decision
${repo} uses **${primary.name}** as its ${kind}. New code follows this choice unless a later ADR supersedes it.

## Consequences
- Agents and engineers scaffold new code against ${primary.name}.
- To change this, add a new ADR with \`supersedes: ADR-001\`. CAVDAX then marks this decision for revalidation.
- This ADR was generated from the files listed above, not from the reasoning behind the choice. Edit it to match your intent before merging.
`;
}

function pullRequestBody(detection) {
  const lines = [
    'This pull request was opened by CAVDAX on behalf of the repository owner.',
    '',
    `It adds one file, \`${NEW_ADR_PATH}\`, a starter Architecture Decision Record. Nothing else changes.`,
    ''
  ];
  const found = detection && [...detection.datastores, ...detection.frameworks];
  if (found && found.length) {
    lines.push('Detected:');
    for (const e of found) lines.push(`- ${e.name}, from ${joinList(e.via.map((f) => `\`${f}\``))}${e.strong ? ' (a service the repository runs)' : ' (a library dependency)'}`);
    lines.push('', 'The ADR records the first of these as the primary technology choice.');
  } else {
    lines.push('No known data store or framework was found in the files CAVDAX reads, so the ADR is the standard "record architecture decisions" record.');
  }
  lines.push('', 'This is generated from file contents only, not from the reasoning behind the choice. Edit it to match your intent before merging, or close this pull request to decline.');
  lines.push('After you merge, CAVDAX reads ADRs from the default branch and builds the decision graph.');
  return lines.join('\n');
}

/** Repo-relative paths worth reading: root files, prisma/, gradle/, and one monorepo level (apps|packages|services|libs|backend|frontend|server|client). */
export function selectStackFiles(tree) {
  const picked = tree
    .filter((e) => e.type === 'blob' && (e.size ?? 0) <= MAX_MANIFEST_BYTES && manifestName(e.path))
    .map((e) => e.path);
  // Root files first (they describe the whole repository), then workspaces; stable within a depth.
  picked.sort((a, b) => (a.split('/').length - b.split('/').length) || a.localeCompare(b));
  return picked.slice(0, MAX_STACK_FILES);
}

/** Reads the selected files from the default branch and detects the stack. */
async function detectRepoStack({ token, owner, repo, branch, tree, fetchImpl }) {
  const paths = selectStackFiles(tree);
  const files = {};
  await Promise.all(paths.map(async (p) => {
    files[p] = await gh(fetchImpl, token, 'GET',
      `/repos/${owner}/${repo}/contents/${enc(p)}?ref=${encodeURIComponent(branch)}`,
      null, 'application/vnd.github.raw+json');
  }));
  return detectStack(files);
}

/** Opens (or returns the already-open) pull request that adds the starter ADR. */
export async function createAdrPullRequest({ token, owner, repo, fetchImpl = fetch, now = new Date() }) {
  assertRepoName(owner, repo);

  const scan = await scanWithTree({ token, owner, repo, fetchImpl });
  if (scan.count > 0) {
    throw new GithubAdrError(409, 'ADRS_EXIST', 'This repository already has ADRs. Nothing to initialize.');
  }
  const base = scan.branch;

  // Idempotent: a second click returns the pull request that is already open.
  const open = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/pulls?state=open&per_page=100`);
  const existing = (Array.isArray(open) ? open : []).find((p) => typeof p.head?.ref === 'string' && p.head.ref.startsWith(BASE_BRANCH_NAME));
  if (existing) {
    return { number: existing.number, url: existing.html_url, branch: existing.head.ref, path: NEW_ADR_PATH, base, reused: true };
  }

  // Read everything we need before writing anything, so a failure cannot leave an orphan branch.
  const detection = await detectRepoStack({ token, owner, repo, branch: base, tree: scan.tree, fetchImpl });

  const baseRef = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${enc(base)}`);
  const baseSha = baseRef.object.sha;

  let branch = BASE_BRANCH_NAME;
  try {
    await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseSha });
  } catch (err) {
    if (err.code !== 'UNPROCESSABLE') throw err;
    // Branch name taken by an earlier, closed pull request: use a unique suffix.
    branch = `${BASE_BRANCH_NAME}-${now.getTime().toString(36)}`;
    await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseSha });
  }

  await gh(fetchImpl, token, 'PUT', `/repos/${owner}/${repo}/contents/${enc(NEW_ADR_PATH)}`, {
    message: 'docs: add starter architecture decision record (ADR-001)',
    content: Buffer.from(buildStarterAdr({ date: now, repo: `${owner}/${repo}`, detection }), 'utf-8').toString('base64'),
    branch
  });

  const pr = await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/pulls`, {
    title: 'Add starter ADR for CAVDAX (ADR-001)',
    head: branch,
    base,
    body: pullRequestBody(detection)
  });

  const detected = [...detection.datastores, ...detection.frameworks].map((e) => e.name);
  return { number: pr.number, url: pr.html_url, branch, path: NEW_ADR_PATH, base, reused: false, detected };
}


/**
 * Opens (or returns the already-open) pull request that marks a superseded ADR as SUPERSEDED.
 * Strictly non-destructive: creates a branch, commits the updated file, and opens a PR.
 * Never touches the default branch directly.
 */
export async function syncSupersededAdrPullRequest({ token, owner, repo, targetId, supersedingId, fetchImpl = fetch, now = new Date() }) {
  assertRepoName(owner, repo);
  if (!targetId || !supersedingId) {
    throw new GithubAdrError(400, "INVALID_PARAMS", "targetId and supersedingId are required.");
  }

  const scan = await scanWithTree({ token, owner, repo, fetchImpl });
  const target = scan.adrs.find((a) => a.id === targetId);
  if (!target) {
    throw new GithubAdrError(404, "TARGET_NOT_FOUND", "Target ADR " + targetId + " was not found in the repository.");
  }

  const superseding = scan.adrs.find((a) => a.id === supersedingId);
  if (!superseding) {
    throw new GithubAdrError(404, "SUPERSEDING_NOT_FOUND", "Superseding ADR " + supersedingId + " was not found in the repository.");
  }

  if (!superseding.supersedes.includes(targetId)) {
    throw new GithubAdrError(400, "NOT_SUPERSEDED", supersedingId + " does not declare that it supersedes " + targetId + ".");
  }

  const base = scan.branch;
  const syncBranchBase = "cavdax/sync-" + targetId.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-status";

  // Idempotent: check if pull request is already open for this sync branch
  const open = await gh(fetchImpl, token, "GET", "/repos/" + owner + "/" + repo + "/pulls?state=open&per_page=100");
  const existing = (Array.isArray(open) ? open : []).find((p) => typeof p.head?.ref === "string" && p.head.ref.startsWith(syncBranchBase));
  if (existing) {
    return {
      number: existing.number,
      url: existing.html_url,
      branch: existing.head.ref,
      path: target.path,
      targetId,
      supersedingId,
      base,
      reused: true
    };
  }

  // Fetch the current file raw content and blob metadata
  const originalText = await gh(fetchImpl, token, "GET",
    "/repos/" + owner + "/" + repo + "/contents/" + enc(target.path) + "?ref=" + encodeURIComponent(base),
    null, "application/vnd.github.raw+json");

  const fileMeta = await gh(fetchImpl, token, "GET",
    "/repos/" + owner + "/" + repo + "/contents/" + enc(target.path) + "?ref=" + encodeURIComponent(base));

  const updatedText = applySupersededStatusToAdr(originalText, supersedingId);

  // Get base branch SHA
  const baseRef = await gh(fetchImpl, token, "GET", "/repos/" + owner + "/" + repo + "/git/ref/heads/" + enc(base));
  const baseSha = baseRef.object.sha;

  let branch = syncBranchBase;
  try {
    await gh(fetchImpl, token, "POST", "/repos/" + owner + "/" + repo + "/git/refs", { ref: "refs/heads/" + branch, sha: baseSha });
  } catch (err) {
    if (err.code !== "UNPROCESSABLE") throw err;
    branch = syncBranchBase + "-" + now.getTime().toString(36);
    await gh(fetchImpl, token, "POST", "/repos/" + owner + "/" + repo + "/git/refs", { ref: "refs/heads/" + branch, sha: baseSha });
  }

  // Commit the file change to the new branch
  await gh(fetchImpl, token, "PUT", "/repos/" + owner + "/" + repo + "/contents/" + enc(target.path), {
    message: "chore(adr): mark " + targetId + " superseded by " + supersedingId,
    content: Buffer.from(updatedText, "utf-8").toString("base64"),
    sha: fileMeta.sha,
    branch
  });

  // Open Pull Request
  const pr = await gh(fetchImpl, token, "POST", "/repos/" + owner + "/" + repo + "/pulls", {
    title: "chore(adr): mark " + targetId + " superseded by " + supersedingId,
    head: branch,
    base,
    body: [
      "This pull request was opened by CAVDAX on behalf of the repository owner.",
      "",
      "In the repository architecture graph, **" + supersedingId + "** (*" + superseding.title + "*) supersedes **" + targetId + "**.",
      "However, `" + target.path + "` was still listed with status `" + (target.status || "ACCEPTED") + "`.",
      "",
      "This PR synchronizes the markdown file status so human developers and tools see that **" + targetId + "** has been superseded.",
      "",
      "Review the diff and merge when ready."
    ].join("\n")
  });

  return {
    number: pr.number,
    url: pr.html_url,
    branch,
    path: target.path,
    targetId,
    supersedingId,
    base,
    reused: false
  };
}


/**
 * List branches for a connected GitHub repository.
 * Returns an array of branch objects with name, commit SHA, and isDefault flag.
 */
export async function listRepoBranches({ token, owner, repo, fetchImpl = fetch }) {
  assertRepoName(owner, repo);
  const meta = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}`);
  const defaultBranch = meta.default_branch || 'main';
  const branches = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/branches?per_page=100`);

  return (Array.isArray(branches) ? branches : []).map((b) => ({
    name: b.name,
    sha: b.commit?.sha,
    isDefault: b.name === defaultBranch,
    protected: Boolean(b.protected)
  }));
}


/**
 * Opens a pull request proposing a new Architecture Decision Record (ADR).
 * Creates a dedicated branch, commits the formatted MADR markdown file, and opens a PR.
 */
export async function proposeAdrPullRequest({
  token,
  owner,
  repo,
  title,
  context,
  decision,
  consequences = '',
  supersedes = null,
  fetchImpl = fetch,
  now = new Date()
}) {
  assertRepoName(owner, repo);
  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new GithubAdrError(400, 'INVALID_TITLE', 'ADR title is required.');
  }
  if (/[\r\n]/.test(title)) {
    throw new GithubAdrError(400, 'INVALID_TITLE', 'ADR title cannot contain newline characters.');
  }
  const cleanTitle = title.replace(/[\x00-\x1f\x7f]/g, '').trim();
  if (cleanTitle.length < 3 || cleanTitle.length > 200) {
    throw new GithubAdrError(400, 'INVALID_TITLE', 'ADR title must be between 3 and 200 characters.');
  }
  if (!decision || typeof decision !== 'string' || !decision.trim()) {
    throw new GithubAdrError(400, 'INVALID_DECISION', 'ADR decision statement is required.');
  }
  if (decision.length > 20000) {
    throw new GithubAdrError(400, 'INVALID_DECISION', 'ADR decision statement exceeds maximum allowed size of 20,000 characters.');
  }
  if (context && (typeof context !== 'string' || context.length > 20000)) {
    throw new GithubAdrError(400, 'INVALID_CONTEXT', 'ADR context exceeds maximum allowed size of 20,000 characters.');
  }
  if (consequences && (typeof consequences !== 'string' || consequences.length > 20000)) {
    throw new GithubAdrError(400, 'INVALID_CONSEQUENCES', 'ADR consequences exceeds maximum allowed size of 20,000 characters.');
  }

  let cleanSupersedes = null;
  if (supersedes !== null && supersedes !== undefined && String(supersedes).trim()) {
    const rawSup = String(supersedes).trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(rawSup)) {
      throw new GithubAdrError(400, 'INVALID_SUPERSEDES', 'Invalid supersedes reference format. Must be an alphanumeric ADR identifier (e.g. ADR-001).');
    }
    cleanSupersedes = rawSup;
  }

  const scan = await scanWithTree({ token, owner, repo, fetchImpl });
  const base = scan.branch;

  // Determine next sequential ADR number
  let maxNum = 0;
  for (const adr of scan.adrs) {
    const match = (adr.id || '').match(/ADR-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  const adrId = `ADR-${String(nextNum).padStart(3, '0')}`;
  
  // Create URL-friendly slug from title (capped at 40 chars to prevent git/filesystem path overflows)
  const slug = cleanTitle.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '') || 'decision';
  
  const targetDir = scan.adrs.length > 0
    ? (scan.adrs[0].path.startsWith('docs/adrs') ? 'docs/adrs' : (scan.adrs[0].path.startsWith('docs/decisions') ? 'docs/decisions' : 'docs/adrs'))
    : 'docs/adrs';
  const filePath = `${targetDir}/${adrId}-${slug}.md`;

  const dateIso = now.toISOString().slice(0, 10);
  const safeFrontmatterTitle = cleanTitle.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const frontmatterLines = [
    '---',
    `id: ${adrId}`,
    `title: "${safeFrontmatterTitle}"`,
    'status: PROPOSED',
    `date: ${dateIso}`
  ];
  if (cleanSupersedes) {
    frontmatterLines.push(`supersedes: ${cleanSupersedes}`);
  }
  frontmatterLines.push('---');

  const adrMarkdown = `${frontmatterLines.join('\n')}

# ${adrId}: ${cleanTitle}

## Status
PROPOSED

## Context and Problem Statement
${(context && context.trim()) ? context.trim() : 'Document the architectural context and driving requirements.'}

## Decision Outcome
${decision.trim()}

## Consequences
${(consequences && consequences.trim()) ? consequences.trim() : 'Active system invariants and downstream architectural impacts.'}
`;

  const baseRef = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${enc(base)}`);
  const baseSha = baseRef.object.sha;

  let branch = `cavdax/propose-${adrId.toLowerCase()}`;
  try {
    await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseSha });
  } catch (err) {
    if (err.code !== 'UNPROCESSABLE') throw err;
    branch = `cavdax/propose-${adrId.toLowerCase()}-${now.getTime().toString(36)}`;
    await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseSha });
  }

  try {
    const cleanTitle = title.trim().replace(/[\r\n\t]/g, ' ');
    await gh(fetchImpl, token, 'PUT', `/repos/${owner}/${repo}/contents/${enc(filePath)}`, {
      message: `docs: propose ${adrId} - ${cleanTitle}`,
      content: Buffer.from(adrMarkdown, 'utf-8').toString('base64'),
      branch
    });

    const cleanDecisionQuote = decision
      .trim()
      .split('\n')
      .map(line => `> ${line.replace(/@([a-zA-Z0-9_-]+)/g, '@<!-- -->$1')}`)
      .join('\n');

    const prBody = `## CAVDAX Proposed Architecture Decision Record (${adrId})

This pull request was drafted via the **CAVDAX Architectural Console**.

- **Decision ID:** \`${adrId}\`
- **Title:** ${cleanTitle}
- **File:** \`${filePath}\`
${supersedes ? `- **Supersedes:** \`${supersedes.trim()}\`` : ''}

### Decision Outcome
${cleanDecisionQuote}

---
*Created automatically by [CAVDAX](https://cavdax.sahnirmaan.live) Continuous Architectural Validation Engine.*`;

    const pr = await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/pulls`, {
      title: `Propose ${adrId}: ${cleanTitle}`,
      head: branch,
      base,
      body: prBody
    });

    return {
      number: pr.number,
      url: pr.html_url,
      branch,
      path: filePath,
      adrId,
      base,
      reused: false
    };
  } catch (err) {
    // Transactional cleanup: delete created branch if PUT or PR creation fails
    try {
      await gh(fetchImpl, token, 'DELETE', `/repos/${owner}/${repo}/git/refs/heads/${enc(branch)}`);
    } catch {
      // Best-effort cleanup, ignore ref delete errors
    }
    throw err;
  }
}


/**
 * Opens a pull request that adds .github/workflows/cavdax-gate.yml
 * to enforce deterministic architectural invariants on Pull Requests in CI.
 */
export async function createCiGatePullRequest({
  token,
  owner,
  repo,
  fetchImpl = fetch,
  now = new Date()
}) {
  assertRepoName(owner, repo);
  const scan = await scanWithTree({ token, owner, repo, fetchImpl });
  const base = scan.branch;

  const workflowPath = '.github/workflows/cavdax-gate.yml';

  // Security & Conflict check: Refuse if workflow already exists in default branch tree
  const alreadyExists = (scan.tree || []).some(t => t.path === workflowPath);
  if (alreadyExists) {
    throw new GithubAdrError(409, 'WORKFLOW_ALREADY_EXISTS', 'CAVDAX CI verification workflow already exists on this repository.');
  }

  // Idempotency check: Reuse existing open CI Gate pull request if already active
  const openPulls = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/pulls?state=open&per_page=100`);
  const existingPr = (Array.isArray(openPulls) ? openPulls : []).find(p => typeof p.head?.ref === 'string' && p.head.ref.startsWith('cavdax/ci-architecture-gate'));
  if (existingPr) {
    return {
      number: existingPr.number,
      url: existingPr.html_url,
      branch: existingPr.head.ref,
      path: workflowPath,
      base,
      reused: true
    };
  }
  const workflowContent = `name: CAVDAX Architectural Gate

on:
  pull_request:
    branches: [ main, master, develop ]

jobs:
  cavdax-gate:
    name: Verify Architectural Invariants
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run CAVDAX Invariant Gate Check
        run: npx -y @cavdax/mcp-server@1.2.4 gate --repo=\${{ github.repository }} --sha=\${{ github.event.pull_request.head.sha }}
        env:
          CAVDAX_API_KEY: \${{ secrets.CAVDAX_API_KEY }}
          CAVDAX_SERVER_URL: https://cavdax.sahnirmaan.live
`;

  const baseRef = await gh(fetchImpl, token, 'GET', `/repos/${owner}/${repo}/git/ref/heads/${enc(base)}`);
  const baseSha = baseRef.object.sha;

  let branch = 'cavdax/ci-architecture-gate';
  try {
    await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseSha });
  } catch (err) {
    if (err.code !== 'UNPROCESSABLE') throw err;
    branch = `cavdax/ci-architecture-gate-${now.getTime().toString(36)}`;
    await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: baseSha });
  }

  try {
    await gh(fetchImpl, token, 'PUT', `/repos/${owner}/${repo}/contents/${enc(workflowPath)}`, {
      message: 'ci: add CAVDAX architectural verification gate workflow',
      content: Buffer.from(workflowContent, 'utf-8').toString('base64'),
      branch
    });

    const pr = await gh(fetchImpl, token, 'POST', `/repos/${owner}/${repo}/pulls`, {
      title: 'Add CAVDAX CI Architectural Verification Gate',
      head: branch,
      base,
      body: `## CAVDAX Continuous Architectural Gate

This pull request installs the **CAVDAX Invariant Verification Gate** as a GitHub Actions workflow.

### What this does:
1. Runs automatically on every pull request targeting your default branch.
2. Validates proposed code changes against accepted Architecture Decision Records (ADRs).
3. Hard-blocks autonomous AI agents and pull requests from merging if they violate system boundaries or introduce circular dependencies.

Once merged, generate a CAVDAX API Key in your console and add it to repository secrets as \`CAVDAX_API_KEY\`.

---
*Created automatically by [CAVDAX](https://cavdax.sahnirmaan.live) Continuous Architectural Validation Engine.*`
    });

    return {
      number: pr.number,
      url: pr.html_url,
      branch,
      path: workflowPath,
      base,
      reused: false
    };
  } catch (err) {
    // Transactional cleanup: delete created branch if PUT or PR creation fails
    try {
      await gh(fetchImpl, token, 'DELETE', `/repos/${owner}/${repo}/git/refs/heads/${enc(branch)}`);
    } catch {
      // Best-effort cleanup
    }
    throw err;
  }
}
