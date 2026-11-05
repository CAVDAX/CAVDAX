# CAVDAX Future Roadmap
### Tiered Distribution, Dev Console & Long-Term Source Ingestion

**Document Status**: Internal Planning Reference  
**Branch**: `feature/medium-long-term-improvements`  
**Last Updated**: October 2026  
**Authors**: Geetika Chugh, Suneet Chugh

---

## Table of Contents

1. [Tiered Distribution Model](#1-tiered-distribution-model)
2. [What Is Already Built Per Tier](#2-what-is-already-built-per-tier)
3. [Internal Dev Console Architecture](#3-internal-dev-console-architecture)
4. [Long-Term Source Ingestion Roadmap](#4-long-term-source-ingestion-roadmap)
5. [Commercial Multi-Tenant Architecture & Dual-Mode Visualizer](#5-commercial-multi-tenant-architecture--dual-mode-visualizer)
6. [Universal Resilient Architecture: Platform-Wide Graceful Fallbacks & Enterprise Error Handling](#6-universal-resilient-architecture-platform-wide-graceful-fallbacks--enterprise-error-handling)
7. [Implementation Priority Order](#7-implementation-priority-order)
8. [Technical Debt to Resolve Before Launch](#8-technical-debt-to-resolve-before-launch)

---

## 1. Tiered Distribution Model

CAVDAX's core value scales directly with FalkorDB graph richness — more sources ingested, more decisions tracked, more powerful the gate. This maps naturally to a three-tier commercial model.

### Tier 1 — Free (Individual Developer)

**Target**: Solo developers, open source projects, hackathon participants.

| Capability | Limit |
|---|---|
| FalkorDB graph nodes | 500 max |
| Source types supported | ADR Markdown files only |
| MCP transport | Local stdio only (`npx @cavdax/mcp-server`) |
| `npx cavdax ingest` | Manual trigger only |
| `npx cavdax check` | Git staged files (`--staged`) |
| Audit log (`GET /api/audit`) | Last 10 entries |
| API rate limit | 30 req/min (implemented) |
| Auth | No token required |
| FalkorDB hosting | Self-hosted via Docker |
| Support | Community / GitHub Issues |

**Conversion trigger**: Developer hits the 500-node limit or needs hosted SSE for team sharing.

---

### Tier 2 — Pro ($29/month, Small Team)

**Target**: Startup engineering teams, 2–10 developers sharing a causal graph.

| Capability | Limit |
|---|---|
| FalkorDB graph nodes | 10,000 max |
| Source types supported | ADR + Git commits + `package.json` |
| MCP transport | Stdio + Hosted SSE (`cavdax.sahnirmaan.live/api/mcp/sse`) |
| `npx cavdax ingest` | Auto-ingest via GitHub webhook |
| `npx cavdax check` | PR gate via `cavdax-gate.yml` |
| Audit log | Last 1,000 entries + CSV export |
| API rate limit | 300 req/min |
| Auth | `MCP_API_TOKEN` Bearer token (implemented) |
| FalkorDB hosting | Shared hosted instance on `cavdax.sahnirmaan.live` |
| Support | Email |

**Key differentiator**: Entire team shares one graph. When one engineer ingests a new ADR, every teammate's agent is blocked from stale decisions instantly.

---

### Tier 3 — Enterprise (Custom Pricing)

**Target**: Large engineering orgs, compliance-heavy industries (fintech, healthcare, government).

| Capability | Limit |
|---|---|
| FalkorDB graph nodes | Unlimited |
| Source types supported | ADR + Git commits + `package.json` + `CODEOWNERS` + GitHub Issues + custom webhooks |
| MCP transport | Stdio + SSE + self-hosted Docker Compose |
| `npx cavdax ingest` | Real-time GitHub App webhook + CI/CD integration |
| Audit log | Unlimited + SIEM export (Splunk / Datadog / CloudWatch) |
| API rate limit | Custom per-org |
| Auth | SSO / SAML + per-team scoped tokens |
| Key Lifecycle Governance | Configurable expiration policies (30d / 60d / 90d / Custom), automated revocation triggers, and webhook audit notifications |
| FalkorDB hosting | Dedicated instance or self-hosted with SLA |
| `npx cavdax doctor` | Full health dashboard in Web HUD `/dev` console |
| Support | Dedicated Slack channel + SLA |

---

## 2. What Is Already Built Per Tier

```
Tier 1 (Free)
  ✅ npx @cavdax/mcp-server (published on npm)
  ✅ stdio MCP server (stdioServer.js)
  ✅ Rate limiting — 30 req/min on /api/mcp/* (express-rate-limit)
  ✅ FalkorDB simulation fallback mode (no Docker needed to evaluate)
  ✅ npx cavdax check --staged
  ✅ npx cavdax ingest --repo .
  ✅ ADR TEMPLATE.md + ADR-001/002/003 examples
  ✅ SSE exponential backoff (1s→30s + jitter) on client reconnect
  ✅ Tier badge in Web HUD header (FREE/PRO/ENT — font-mono, muted)
  ✅ Node count enforcement middleware (free=500, pro=10k, enterprise=unlimited)
  ✅ Audit log tier-aware cap (free=10, pro=1000, enterprise=500)

Tier 2 (Pro)
  ✅ Hosted SSE transport — GET /api/mcp/sse + POST /api/mcp/messages
  ✅ MCP_API_TOKEN Bearer auth middleware (requireAuth)
  ✅ GET /api/audit endpoint (fetchAuditLog Cypher query)
  ✅ Audit tab in Web HUD (AuditPage.jsx, /audit route)
  ✅ cavdax-gate.yml GitHub Action PR gate
  ✅ Multi-supersedes YAML support in parser.js
  ✅ Real latency measurement (FalkorDB internal execution time)
  ✅ GitHub OAuth full flow (/api/auth/github → callback → session → me → logout)
  ✅ CAVDAX_TIER env var — TIER_CONFIG single source of truth for rate limits + limits

Tier 3 (Enterprise)
  ✅ Docker Compose production stack (infra/docker-compose.prod.yml)
  ✅ Caddy HTTPS reverse proxy with security headers
  ✅ SSE session TTL cleanup (mcpSessions memory management)
  ✅ CODEOWNERS ingestion (sources.js — ingestCodeownersChange)
  ✅ Git commit ingestion (sources.js — ingestGitCommit)
  ✅ package.json dep change ingestion (sources.js — ingestPackageJsonChange)
  ✅ GitHub Issues as superseded sources (sources.js — ingestGitHubIssue)
  ✅ Node count enforcement middleware (checkNodeLimit async middleware)
  ✅ Dev Console (/dev internal route — DevConsolePage.jsx + /api/dev/tier-check)
  ✅ Global React Error Boundaries (SubsystemErrorBoundary wrapping 4 views)
  ✅ Caddy /dev production block + handle_errors 502→JSON
  ✅ RFC-7807 error envelope middleware (global unhandled Express error handler)
  ✅ FalkorDB background auto-reconnect (exponential backoff 5s→5min)
  ✅ fetchGraphState pagination — LIMIT 500 on unbounded MATCH (n) queries
  ⏳ SIEM export from /api/audit (Splunk/Datadog JSON format)
```

---

## 3. Internal Dev Console Architecture

### Purpose

The dev console (`/dev`) is an internal-only route for the CAVDAX team to:

- Switch between tiers and observe exactly what each tier can and cannot do
- Test rate limits, auth enforcement, node count caps, and source type restrictions
- Validate new ingestion source types before shipping to production
- Simulate agent behaviour across all three tiers in one browser session

### Access Control

The `/dev` route must never be publicly accessible on production.

**Caddy rule to add in `infra/Caddyfile`**:
```caddy
@dev_block {
    path /dev*
    not remote_ip 127.0.0.1 ::1 10.0.0.0/8
}
respond @dev_block 403
```

Locally (`localhost:5173`) the route is always accessible without restriction.

---

### Dev Console UI Layout

Route: `/dev`  
Design: follows `docs/UI_DESIGN_SYSTEM.md` — no emojis, Lucide icons, monospace metrics, no eyebrow pills.

```
┌──────────────────────────────────────────────────────────────────┐
│  CAVDAX Dev Console                          Internal Use Only    │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Active Tier    ┌──────┐ ┌─────┐ ┌───────────┐                  │
│                 │ Free │ │ Pro │ │ Enterprise │  ← sliding pill  │
│                 └──────┘ └─────┘ └───────────┘                  │
│                                                                  │
│  API Token      [________________________________]  Set          │
│                  Clears to empty = Free tier (no auth)           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Graph Observability                                                  │
│  ─────────────────────────────────────────────                   │
│  Node Count     147 / 500     ██████░░░░░░░░  29%               │
│  Edge Count     203                                              │
│  Gate Latency   1.84ms        FalkorDB Live                      │
├──────────────────────────────────────────────────────────────────┤
│  Tier Feature Checks                                             │
│  ─────────────────────────────────────────────                   │
│  Rate limit     30 req/min    Run 31x  →  [Trigger]             │
│  Auth           Bearer token  Wrong token → [Trigger 401]       │
│  Audit log      10 entries    Open /audit →  [Navigate]         │
│  Node cap       500 max       Seed 600 → [Trigger 429]         │
│  SSE transport  localhost     Connect → [Test SSE]             │
├──────────────────────────────────────────────────────────────────┤
│  Source Ingestion Tester                                         │
│  ─────────────────────────────────────────────                   │
│  Source Type   [ ADR ] [ COMMIT ] [ PACKAGE_JSON ] [ CODEOWNERS ]│
│  Input         [________________________________]               │
│                [Ingest →]                                        │
│                                                                  │
│  Result        SUPERSEDES edge created in 2.1ms                 │
│                Affected decisions: DEC-102, DEC-104              │
└──────────────────────────────────────────────────────────────────┘
```

### Dev Console Implementation Plan

**File to create**: `apps/client/src/components/DevConsolePage.jsx`

**Server endpoint to add**: `GET /api/dev/tier-check` — returns current tier config, node count, rate limit status. Protected: only responds to `127.0.0.1` or when `NODE_ENV !== 'production'`.

**App.jsx changes needed**:
```javascript
// Add to TAB_TO_PATH
dev: '/dev',

// Add to resolveTabFromUrl
if (rawPath === '/dev') return 'dev';

// Add to render
} : activeTab === 'dev' ? (
  <DevConsolePage />
)
```

**Header.jsx**: Do NOT add `/dev` to the main nav. Access it directly via URL — it should not appear in the public navigation bar.

---

## 4. Long-Term Source Ingestion Roadmap

All four new source types will live in a new file `core/ingestion/sources.js`. The existing `core/ingestion/parser.js` handles ADR Markdown only and will not be modified.

Each source type creates a `(:Source)` node in FalkorDB, then optionally triggers `cascadeInvalidation` if a superseding relationship is detected.

---

### Source Type 1 — Git Commit

**When to use**: Track commits that change architectural decisions — e.g. a commit that bumps a dependency version or renames a service endpoint.

**How CAVDAX detects superseding**:
```
Commit message pattern:  "supersedes: ADR-001"  or  "breaks: DEC-102"
Conventional commit:     "feat!: ..."  (breaking change flag)
```

**FalkorDB node created**:
```cypher
CREATE (s:Source {
  id: 'commit-9f8a2b',
  type: 'COMMIT',
  ref: '9f8a2b3',
  title: 'feat!: migrate payment endpoint to /api/v2',
  status: 'ACTIVE',
  author: 'alice@example.com',
  created_at: timestamp()
})
```

**Function signature**:
```javascript
// core/ingestion/sources.js
export async function ingestGitCommit(graph, { sha, message, author, repoRoot })
```

**CLI trigger**:
```bash
npx cavdax ingest --type commit --sha 9f8a2b3
```

---

### Source Type 2 — `package.json` Dependency Change

**When to use**: When a dependency is upgraded to a breaking version or a banned package is removed — agents should not generate code using the old API.

**How CAVDAX detects superseding**:
- `package.json` diff: if a dependency version changes (e.g. `"express": "^4"` → `"^5"`), old version's Source node is superseded
- If a package is removed entirely, its Source node is marked `SUPERSEDED`

**FalkorDB node created**:
```cypher
CREATE (s:Source {
  id: 'pkg-express-v5',
  type: 'PACKAGE_JSON',
  ref: 'package.json',
  title: 'express upgraded from ^4 to ^5 (breaking API change)',
  status: 'ACTIVE',
  created_at: timestamp()
})
```

**Function signature**:
```javascript
export async function ingestPackageJsonChange(graph, { filePath, oldVersion, newVersion, packageName })
```

**CLI trigger**:
```bash
npx cavdax ingest --type package --repo .
# Scans package.json, diffs against graph's known pkg Sources
```

---

### Source Type 3 — CODEOWNERS Change

**When to use**: When team ownership of a path changes, agents generating PR assignments or routing code must use the current owner, not a cached stale one.

**How CAVDAX detects superseding**:
- Line-by-line diff of `CODEOWNERS` file
- If `/services/payment.js @alice` → `/services/payment.js @bob`, old owner fact is superseded

**FalkorDB node created**:
```cypher
CREATE (s:Source {
  id: 'codeowners-payment-bob',
  type: 'CODEOWNERS',
  ref: '.github/CODEOWNERS',
  title: '/services/payment.js ownership transferred to @bob',
  status: 'ACTIVE',
  created_at: timestamp()
})
```

**Function signature**:
```javascript
export async function ingestCodeownersChange(graph, { filePath, path, oldOwner, newOwner })
```

**CLI trigger**:
```bash
npx cavdax ingest --type codeowners --repo .
```

---

### Source Type 4 — GitHub Issues (Closed as Superseded)

**When to use**: When a GitHub Issue is closed as "won't fix" or "superseded by", any decisions grounded in that Issue's requirements should be invalidated.

**How CAVDAX detects superseding**:
- GitHub webhook: `issues.closed` event with label `superseded` or closing comment containing `supersedes: ADR-XXX`
- GitHub API poll (for teams without webhook): `GET /repos/:owner/:repo/issues?state=closed&labels=superseded`

**FalkorDB node created**:
```cypher
CREATE (s:Source {
  id: 'issue-142',
  type: 'GITHUB_ISSUE',
  ref: 'https://github.com/org/repo/issues/142',
  title: 'Issue #142 closed: Abandon rate-limit v1 approach',
  status: 'ACTIVE',
  created_at: timestamp()
})
```

**Function signature**:
```javascript
export async function ingestGitHubIssue(graph, { issueNumber, title, htmlUrl, supersedesIds })
```

**New server endpoint needed**:
```javascript
// POST /api/webhook/github
// Receives GitHub App webhook events, routes to correct ingestor
app.post('/api/webhook/github', verifyGitHubWebhookSignature, async (req, res) => { ... })
```

---

### Unified Ingestor Entry Point

Once all four sources are implemented, `ingestCommand.js` will route to the correct function:

```javascript
// apps/mcp-server/src/ingestCommand.js (updated)
import {
  ingestGitCommit,
  ingestPackageJsonChange,
  ingestCodeownersChange,
  ingestGitHubIssue
} from '../../../core/ingestion/sources.js';

// npx cavdax ingest --type commit|package|codeowners|issue|adr
```

---

## 5. Commercial Multi-Tenant Architecture & Dual-Mode Visualizer

As CAVDAX matures from a hackathon showcase into a commercial SaaS product, it bridges the gap between zero-friction open-source evaluation and enterprise-grade multi-tenant compliance.

### 5.1 Dual Distribution Paradigms

| Dimension | Local Open Source (`npx cavdax studio`) | Hosted Enterprise Cloud (`cavdax.sahnirmaan.live`) |
|---|---|---|
| **Target** | Solo engineers, local CI scripts, offline air-gapped dev | Engineering orgs, CTOs, SecOps compliance teams |
| **Authentication** | **Zero Auth Needed** (Runs entirely on `localhost:5173`) | **Organization SSO** (GitHub / GitLab / Okta SAML) |
| **Database** | Local FalkorDB in Docker (`localhost:6379`) | Managed multi-tenant FalkorDB cluster |
| **UI Model** | Self-hosted inspection studio (like Prisma/Drizzle Studio) | Centralized web portal with organization workspaces |
| **Audit Visibility** | Developer-only local logs | Multi-repo compliance ledger with RBAC & SIEM streaming |

---

### 5.2 Multi-Tenant Organization Accounts & RBAC

For hosted cloud deployments, access control is strictly tenant-isolated:

1. **Authentication Flow**:
   - Engineers and admins authenticate via GitHub OAuth (`/api/auth/github`) or GitLab SSO.
   - Upon login, CAVDAX binds the user to their GitHub Organization (`org_id`).
   - Scoped API tokens (`cavdax_live_<token>`) are generated per repository or per team.

2. **Role-Based Access Control (RBAC)**:
   - **Org Owner / SecOps Lead**: Read/write access to all repositories; access to full compliance Audit Logs, SIEM export, and policy threshold configurations.
   - **Lead Architect**: Can approve decision revalidations, override false positives, and ingest foundational ADRs.
   - **Software Engineer / AI Agent**: Submits tool execution requests (`apply_code_change`); receives instant deterministic pass/block verdicts.

3. **FalkorDB Graph Isolation**:
   - Customer graphs are isolated using isolated graph keys: `cavdax_graph_{orgId}_{repoId}`.
   - GraphBLAS matrix operations execute strictly within the bounds of a single tenant graph.
   - Zero cross-tenant data leakage by design.

---

### 5.3 Dual-Mode Console Visualizer: Permanent 4-Act Demo vs Live Repo

A common failure of enterprise SaaS tools is replacing their best demo with an empty dashboard that requires 2 hours of setup. CAVDAX permanently maintains the **Dual-Mode Visualizer**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Workspace: [ ⚡ Demo: TokenAuth v1 → OAuth2 (4-Act) ▾ ]                     │
│             ├─ ⚡ Demo: TokenAuth v1 → OAuth2 (4-Act Showcase — Permanent)   │
│             ├─ 📦 AcmeCorp / checkout-service (Live Connected)              │
│             ├─ 📦 AcmeCorp / identity-service (Live Connected)              │
│             └─ ➕ Connect New GitHub Repository...                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **The Canonical 4-Act Demo (Permanent Sandbox)**:
   - **Never removed or deprecated**.
   - Serves as the universal 60-second onboarding sandbox for judges, prospective clients, and new developers.
   - Always available in one click without connecting any repository or entering credentials.

2. **Live Connected Repository Mode**:
   - When an organization switches the workspace selector to their connected repo, the Console transforms:
     - **Live Knowledge Graph**: Renders the team's actual ADRs, code modules, and decision DAG.
     - **SSE Event Stream**: Real-time invalidation pulses whenever a teammate merges an ADR or PR.
     - **Audit Ledger**: Displays genuine compliance records generated by Claude Code, Cursor, and CI/CD gates.

### 5.4 Annual Billing Cadence, Recurring Subscriptions & Enterprise Invoicing Engine

As CAVDAX scales into commercial production, enterprise customers require predictable annual accounting and multi-seat procurement rather than single monthly micro-charges.

#### 1. Dual Billing Cadence & Dynamic Switcher Interface
- **Framer Motion Sliding Pillbar**: A container-relative segmented pill switcher (`[ Monthly | Annual (Save 20%) ]`) in the Subscription Tiers view.
- **Dynamic Pro-Rated Pricing Display**:
  - **Community Tier**: Free Forever ($0 / ₹0).
  - **Pro Autonomous Tier**:
    - Monthly: **$4 / mo** (₹349 / mo).
    - Annual: **$3.20 / mo** (₹279 / mo) — billed annually at $38.40 (₹3,348 / yr).
  - **Enterprise Mesh Tier**:
    - Monthly: **$29 / mo** (₹2,499 / mo).
    - Annual: **$23.20 / mo** (₹1,999 / mo) — billed annually at $278.40 (₹23,988 / yr).
- **Zero Pill Jitter**: Built using container-relative spring physics (`UI_DESIGN_SYSTEM.md § 1.8`), maintaining identical button geometry across switches.

#### 2. Automated Webhook Lifecycle & Ledger Reconciliation
- **Payment Processor Integration**: Dual gateway routing via Stripe Billing and Razorpay Subscriptions (supporting INR unified payments and global USD cards).
- **Core Webhook Interceptors**:
  - `subscription.authenticated`: Binds the authenticated tenant organization to a recurring subscription ledger ID.
  - `subscription.charged` / `invoice.paid`: Automatically resets monthly causal verification quotas and extends the node capacity horizon.
  - `subscription.halted` / `payment.failed`: Enforces an automated 7-day grace period with observability warnings in the Web HUD before gracefully demoting the tenant to the Community tier (preserving all graph data in a read-only state).
  - `subscription.cancelled`: Marks the subscription to expire at the end of the current billing cycle without immediate service interruption.

#### 3. Enterprise Procurement & Multi-Seat Volume Licensing
- **Consolidated Tax Invoicing**: Automatic generation of compliant GST/VAT PDF invoices with organizational VATIN/GSTIN registration numbers.
- **Team Seat Allocation**: Central billing manager account that provisions and revokes developer API keys across engineering sub-teams under a unified annual quota pool.
- **Purchase Order (PO) & Custom MSA**: Support for offline enterprise wire transfers (ACH / NEFT / RTGS) for organizations with strict vendor procurement requirements.

---

---

## 6. Universal Resilient Architecture: Platform-Wide Graceful Fallbacks & Enterprise Error Handling

### 6.1 Design Philosophy: Zero Unhandled Raw Failures & Graceful Degradation

A fundamental principle of enterprise software (demonstrated by platforms like Linear, Stripe, and Vercel) is that **infrastructure failures, reverse-proxy drops (e.g. HTTP 502/504), network timeouts, and partial outages must NEVER result in broken UI screens, raw stack dumps, or alarming red error banners**.

When evaluated by judges, enterprise architects, or prospective clients:
- A raw error like `Failed to fetch audit log: HTTP 502` or `TypeError: Cannot read properties of undefined` breaks confidence and implies a fragile prototype.
- In contrast, a system that detects backend latency or service degradation, transitions smoothly to an **illustrative simulated state**, clearly labels the mode as `Offline Demonstration Mode`, and offers seamless one-click reconnection communicates **fault-tolerant, production-ready engineering maturity**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 CAVDAX RESILIENT FAILOVER PIPELINE                          │
│                                                                             │
│  [ Client Web HUD / CLI / MCP ]                                             │
│                 │                                                           │
│                 ▼                                                           │
│   ┌───────────────────────────┐                                             │
│   │ Network / API Health Call │                                             │
│   └─────────────┬─────────────┘                                             │
│                 │                                                           │
│        ┌────────┴────────┐                                                  │
│        ▼                 ▼                                                  │
│  [ HTTP 200 OK ]   [ 502 / Offline / Timeout ]                              │
│        │                 │                                                  │
│        ▼                 ▼                                                  │
│  Render Live      Activate Resilient Fallback Engine                        │
│  FalkorDB Data    ├─ Synthetic 4-Act Ledger Preview                         │
│                   ├─ In-Memory Baseline Graph DAG                           │
│                   ├─ Non-Alarmist Glassmorphic Notice Banner                │
│                   └─ Non-Blocking Exponential Retry Sync                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Frontend Web HUD Resilience Matrix

Every frontend surface in CAVDAX must implement defensive state management, boundary containment, and graceful degradation:

| Viewport / Subsystem | Potential Failure Mode | Unacceptable Behavior | Standard Resilient Fallback (Target Implementation) |
|---|---|---|---|
| **Audit Ledger (`AuditPage.jsx`)** | Backend container down (HTTP 502 / ECONNREFUSED) | Red box: `Failed to fetch audit log: HTTP 502` with empty screen | **Implemented**: Instant fallback to 6 illustrative 4-Act records (`ACT-001` through `ACT-004`), frosted amber notice banner (`DEMO PREVIEW`), and non-blocking `Retry Sync`. |
| **Knowledge Graph Canvas (`GraphCanvas.jsx`)** | `/api/graph` fetch failure or WebGL context crash | Blank black canvas or unhandled Three.js crash | **Fallback Baseline Graph**: Fall back to canonical hardcoded DAG (`ADR-001`, `ADR-002`, `DEC-101`, `DEC-103`, `AgentAction`) + WebGL context loss listener that recovers automatically on visibility change. |
| **Event Stream / Invalidation Pulses (`App.jsx`)** | `/api/events` SSE connection dropped | Infinite console errors (`EventSource failed`) or frozen HUD | **Exponential Backoff Reconnect**: Reconnect on 1s, 2s, 4s, 8s, up to 30s ceiling with jitter. Display monospace header indicator: `SSE Offline • Local Simulation Active`. |
| **4-Act Demo Console (`Console.jsx`)** | `/api/mcp/call` or `/api/ingest` returns 500/502 | Multi-step demo fails midway, locking the user out | **Client-Side Simulation Engine**: If HTTP fails, execute the state mutation in browser state (`graphData` local nodes, Cypher simulation, simulated 1.2ms GraphBLAS latency), allowing complete 4-Act demonstration without live backend. |
| **MCP Configuration Page (`ConnectMcpPage.jsx`)** | Offline network / clipboard permission denied | Silent failure or uncopied config | **Visual Feedback**: Copy button falls back to manual select-all textarea if `navigator.clipboard` throws; clear tooltip confirmation. |
| **Dev Console (`DevConsolePage.jsx`)** | `/api/dev/tier-check` 404 or 502 | Blank page with broken metrics | **Fallback Tier State**: Render default Tier 1 / Developer state with sample memory metrics and mock health check table. |

#### Global React 18 Error Boundaries (`<SubsystemErrorBoundary />`)
Every top-level view (`AuditPage`, `DevConsolePage`, `GraphCanvas`, `ConnectMcpPage`) will be wrapped in a localized Error Boundary. If an unexpected runtime rendering error occurs:
- The error is isolated to that specific tab without crashing the global navbar or Header.
- The user is presented with a double-bezel card:
  - Header: `Subsystem Recovered • Local State Reset Required`
  - Action: `Reload View` (resets tab state without full page refresh).
  - Technical Details: Collapsible monospace drawer (hidden by default).

---

### 6.3 Backend Gateway & Reverse Proxy Resilience Matrix

| Layer | Failure Scenario | Unacceptable Behavior | Enterprise Resilient Standard |
|---|---|---|---|
| **Caddy Reverse Proxy (`infra/Caddyfile`)** | `server:3000` container restarts or halts | Caddy returns raw Cloudflare 502 Bad Gateway HTML | **Caddy Error Handling Route**: Intercept 502/504 errors on `/api/*` and return clean JSON: `{ "success": false, "code": "SERVICE_RESTARTING", "retry_after": 5 }` with `Content-Type: application/json`. |
| **Express Backend (`apps/server/index.js`)** | FalkorDB container offline or Redis ping fails | Express server crashes (`UnhandledPromiseRejection`) or hangs indefinitely | **In-Memory Snapshot (`fallbackGraphState`)**: Already partially implemented; all read endpoints (`/api/graph`, `/api/audit`, `/api/health`) automatically serve the in-memory graph snapshot with `simulated: true`. Add periodic background reconnection ping (`setInterval(checkFalkor, 5000)`). |
| **Standardized Error Envelope** | Diverse error payloads across endpoints | Some endpoints return HTML strings, some `{ error: '' }`, some crash | **RFC-7807 Standard Error Envelope**: All API error responses adhere to `{ "success": false, "error": { "code": string, "message": string, "subsystem": string, "remediable": boolean } }`. |
| **Health Check Endpoint (`/api/health`)** | Upstream dependency down | Returns 500 and fails container orchestration health checks | Returns `200 OK` with degraded status payload: `{ "status": "degraded", "falkordb": false, "fallback_ready": true }` so reverse proxies do not prematurely drop the instance. |

---

### 6.4 Universal CLI & MCP Protocol Gateway Resilience

The universal CLI suite (`@cavdax/mcp-server` and `npx cavdax`) must provide clear, actionable diagnostics when operating in constrained environments:

1. **`npx cavdax doctor`**:
   - If FalkorDB connection fails on `localhost:6379`, do NOT output raw Node.js `ECONNREFUSED` stack traces.
   - Output structured diagnostic output:
     ```
     [!] FalkorDB GraphBLAS Engine: UNREACHABLE (localhost:6379)
     --> Remediation:
         1. Ensure Docker is running: `docker ps`
         2. Spin up FalkorDB instance: `docker run -p 6379:6379 falkordb/falkordb`
         3. Or specify custom host: `npx cavdax doctor --host <custom-host>`
     ```

2. **`npx cavdax check` (Pre-commit / CI Gate)**:
   - In air-gapped CI environments (where local Redis is not installed), provide `--offline-ast` mode:
     - Parses staged ADR markdown headers and git commits using static AST regex heuristics.
     - Enforces causal DAG invariants without requiring live GraphBLAS runtime.

3. **MCP Tool Gate (`apply_code_change`)**:
   - If FalkorDB becomes unreachable during agent code modification requests:
     - Return structured MCP tool error:
       ```json
       {
         "content": [{ "type": "text", "text": "⛔ CAVDAX MCP GATE ERROR: FalkorDB causal verification engine temporarily unreachable. File write suspended for safety. Please run 'npx cavdax doctor' or check network connection." }],
         "isError": true
       }
       ```
     - Never allow an unchecked write to pass silently during an infrastructure failure.

---

### 6.5 Phased Implementation Checklist

```
Phase 2.5 — Resilient Fallback Sprint (Immediate)
  [x] AuditPage: Resilient fallback to simulated 4-Act ledger on 502/network failure (Done)
  [x] GraphCanvas: AgentAction node dynamic Y distribution (SVG — no WebGL needed)
  [x] Console / App: Client-side simulation mode for 4-Act demo when backend API drops
  [x] Global React Error Boundary wrapper around all major viewports (SubsystemErrorBoundary)
  [x] Caddyfile: Return standardized JSON for upstream 502 errors instead of raw HTML

Phase 3.5 — Backend & CLI Resilience
  [x] Express: Standardize RFC-7807 error envelopes across all /api/* routes
  [x] Express: FalkorDB persistent auto-reconnect loop with exponential backoff
  [ ] CLI doctor: Clean ASCII remediation guidance for connection failures
  [ ] CLI check: Air-gapped static AST parsing fallback mode (--offline-ast)
```

## 7. Implementation Priority Order

```
Phase 1 — Already Done
  ✅ NPM package (@cavdax/mcp-server@1.0.0)
  ✅ Hosted SSE transport
  ✅ Auth middleware + rate limiting
  ✅ Audit endpoint + Audit UI tab
  ✅ Multi-supersedes YAML support
  ✅ ADR templates + TEMPLATE.md

Phase 2 — Done (sources.js + Dev Console)
  ✅ core/ingestion/sources.js scaffold
  ✅ ingestGitCommit()
  ✅ ingestPackageJsonChange()
  ✅ ingestCodeownersChange()
  ✅ ingestGitHubIssue() + /api/ingest-source HTTP endpoint
  ✅ DevConsolePage.jsx (amber offline banner, resilient fallback)
  ✅ GET /api/dev/tier-check endpoint
  ✅ Caddy /dev block rule for production (handle_errors 502→JSON)

Phase 3 — Done (Tier Enforcement)
  ✅ CAVDAX_TIER env var (free | pro | enterprise)
  ✅ Node count enforcement middleware (checkNodeLimit)
  ✅ Audit log entry limit per tier (activeTier.audit_log_limit)
  ✅ Rate limit values read from tier config (TIER_CONFIG single source of truth)
  ✅ Tier badge in Web HUD header (Header.jsx — font-mono FREE/PRO/ENT)

Phase 3.5 — Done (Platform Resilience)
  ✅ SubsystemErrorBoundary — 4 views wrapped
  ✅ RFC-7807 error envelope middleware (Express global error handler)
  ✅ FalkorDB background auto-reconnect with exponential backoff
  ✅ fetchGraphState LIMIT 500 pagination
  ✅ SSE client-side reconnect with exponential backoff + jitter
  ✅ GitHub OAuth full flow (session-based, CSRF state param)

Phase 4 — Enterprise (Remaining)
  [ ] SIEM export from /api/audit (Splunk/Datadog JSON format)
  [ ] GitHub App setup for real-time webhook ingestion
  [ ] SSO / SAML token scoping
  [ ] Dedicated FalkorDB instance provisioning docs
  [ ] CLI doctor: ASCII remediation guidance for connection failures
  [ ] CLI check: Air-gapped static AST parsing fallback (--offline-ast)
```

---

## 8. Technical Debt to Resolve Before Launch

| Item | File | Priority | Status |
|------|------|----------|--------|
| `README.md` still references `core/mcp/stdio.js` path | `README.md` | High | ✅ Verified — no stale reference (grep confirmed) |
| `README.md` simulation mode note still says DEC-102 = stale | `apps/mcp-server/README.md` | High | Open |
| Benchmark `evaluate.js` uses hardcoded latency numbers | `benchmark/evaluate.js` | Medium | Open |
| `fetchGraphState` has no pagination — unbounded query on large graphs | `core/graph/queries.js` | Medium | ✅ Fixed — LIMIT 500 added (M6) |
| No `.env.example` file — devs don't know what env vars exist | root | High | ✅ Fixed — `.env.example` created |
| `apps/server` has no `package-lock.json` committed — CI uses `npm install` | `apps/server/` | Medium | ✅ Fixed — `package-lock.json` committed |
| `CAVDAX_TIER` env var not yet read anywhere — tier logic not wired | `apps/server/index.js` | Phase 3 | ✅ Fixed — TIER_CONFIG is single source of truth |

---


---

## 9. NPM Package Distribution & Metadata Strategy (Pending Team Review with Geetika)

**Status**: Scheduled for Co-Architect Alignment (Suneet & Geetika)  
**Target Package**: `@cavdax/mcp-server` (`apps/mcp-server/package.json`)

### 9.1 The Architectural Decision
Currently, `apps/mcp-server/package.json` configures:
```json
"homepage": "https://github.com/suneetchugh-dev/CAVDAX/tree/main/apps/mcp-server#readme"
```

### 9.2 Industry Benchmark Comparison

| Platform / Tool | Package Name | `package.json` Homepage | Behavior on npmjs.com |
| :--- | :--- | :--- | :--- |
| **Stripe** | `stripe` | `https://stripe.com` | Directs to live product & API platform |
| **Supabase** | `@supabase/supabase-js` | `https://supabase.com` | Directs to live backend platform |
| **Prisma** | `prisma` | `https://www.prisma.io` | Directs to ORM product portal |
| **Model Context Protocol** | `@modelcontextprotocol/sdk` | `https://modelcontextprotocol.io` | Directs to official protocol specification |
| **FalkorDB** | `falkordb` | `https://falkordb.com` | Directs to GraphBLAS database site |
| **PostHog** | `posthog-js` | `https://posthog.com` | Directs to live product analytics platform |

### 9.3 Options for Evaluation
1. **Option A (Current — Monorepo Subtree)**:
   - Retain `https://github.com/suneetchugh-dev/CAVDAX/tree/main/apps/mcp-server#readme`.
   - *Pros*: Completely hermetic to the open-source GitHub monorepo subfolder.
   - *Cons*: NPM already displays the README directly on the page, and the "Repository" button already links to GitHub. Clicking Homepage provides a redundant duplicate view.
2. **Option B (Recommended SaaS Product Standard)**:
   - Update to `https://cavdax.sahnirmaan.live`.
   - *Pros*: Sidebar on npm displays distinct **Homepage** (live 3D causal graph & visual console) and **Repository** (GitHub source code). Elevates CAVDAX from a raw script to a full live platform.
3. **Option C (Dedicated Docs Subpath)**:
   - Update to `https://cavdax.sahnirmaan.live/mcp` or dedicated quickstart page.

*Decision pending discussion between Geetika Chugh and Suneet Chugh before next npm release (v1.2.6).*

*This document is the single source of truth for CAVDAX product roadmap decisions.*  
*Update this file when any planned item is completed or reprioritised.*
