# System Architecture Specification — CAVDAX

**Project**: CAVDAX (**C**ontextual **A**ction & **V**erified **D**ecision **A**utonomous e**X**ecution)  
**System Class**: Causal Knowledge Graph & Enclosed MCP Execution Gate  
**Version**: 1.0.0-PRODUCTION  

---

## 1. System Topology & Technology Stack Justification

CAVDAX is architected as a high-performance, low-latency polyglot monorepo engineered to provide autonomous AI coding agents with verifiable causal provenance before any code mutation reaches disk.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION & HUD TIER                                │
│   React 18 + Vite + Tailwind CSS + Lucide + Framer Motion Kinetic Physics       │
│   - Interactive Temporal DAG Canvas with dynamic column layout auto-scaling    │
│   - Draggable & Responsive Node Inspector with container boundary physics       │
│   - Live What-If Blast Radius Simulation & Downstream Dependency Traversal      │
│   - Monochromatic Design System, Sound Engine, and Audit Trail Quick-Filters    │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ HTTP REST & SSE (/api/events, /api/graph)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        MCP INTERCEPTOR & GATEWAY TIER                           │
│   Node.js (v20+) + Express Gateway + MCP Protocol Standard Server               │
│   - GitHub ADR Scanner & Smart Stack Detector (apps/server/githubAdr.js)        │
│   - Non-Destructive Pull Request Engine (cavdax/init-adr, cavdax/sync-*)        │
│   - Standalone SVG & Vision OCR Generator (core/graph/renderSvg.js)             │
│   - Atomic System State & Session Store (apps/server/systemState.js)            │
│   - Enclosed Tool Handlers: apply_code_change, export_graph_image, check_intent │
│   - Out-of-Band Divergence Radar: Resend API Dispatcher + VAPID Web Push Broker │
│   - GitHub Webhook Ingestion Engine: POST /api/github/webhook with HMAC-SHA256   │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ FalkorDB Client (Redis Protocol / Parameterized Cypher)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CAUSAL GRAPHBLAS STORAGE & KERNEL                          │
│   FalkorDB 0.4+ Container (GraphBLAS Sparse Matrix Linear Algebra Engine)       │
│   Causal Directed Acyclic Graph (DAG): Sources ──► Facts ──► Decisions ──► Actions│
│   Sub-2ms matrix invalidation traversal via ANY() path reachability             │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │ Atomic Write-Through on Approved Verdict
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    TARGET CODEBASES & REPOSITORY ECOSYSTEM                      │
│   - Local Protected Disk: Sandboxed target files (demo-repo/src/services/...)  │
│   - External GitHub Repos: Zero-touch default branches; dedicated review PRs    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Stack Selection Rationale
- **Out-of-Band Divergence Radar (Resend API + RFC 8292 VAPID Web Push)**: Real-time enclosed gating protects in-flight tool calls, but human engineers operate asynchronously. The divergence radar monitors repository mutations via webhooks and dispatches blast-radius bound alerts via Resend (`no-reply@sahnirmaan.live`) and background Service Worker push (`/sw.js`), eliminating silent architectural decay.

- **Client (React 18 + Vite)**: Instant HMR, minimal bundle footprint (<200kB), hardware-accelerated pure CSS animations for brand assets with zero external heavy canvas dependencies.
- **MCP Gateway (Node.js Express + MCP Protocol)**: Native compatibility with Claude Code, Cursor, and standard LLM tool-calling conventions. Complete protocol specification and enterprise deployment architecture are detailed in [MCP_SPECIFICATION.md](MCP_SPECIFICATION.md).
- **Graph Storage (FalkorDB + GraphBLAS)**: Traditional relational databases cannot perform multi-hop recursive dependency traversals under 10ms. Vector databases cannot perform causal graph invalidation. FalkorDB leverages GraphBLAS sparse matrix linear algebra to execute multi-hop Cypher queries in **<2ms**, making pre-execution gating imperceptible to developer workflows.

---

## 2. End-to-End Multi-Tier Data Flow

### 2.1 The 4-Act Causal Invalidation & Execution Loop

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / Git Webhook
    actor Agent as Autonomous AI Agent
    participant MCP as Enclosed MCP Gate
    participant Falkor as FalkorDB (GraphBLAS)
    participant Disk as Protected Codebase Disk

    Note over Dev, Falkor: ACT I: Baseline State (ADR-001 accepted, DEC-102 valid)
    Dev->>Falkor: Seed Baseline ADR-001 & DEC-102
    Falkor-->>MCP: Causal Chain Active

    Note over Dev, Falkor: ACT II: Ingestion of Superseding Commit
    Dev->>MCP: POST /api/ingest (Commit containing ADR-002)
    MCP->>Falkor: Cypher: CREATE (new:Source {id:'ADR-002'})-[:SUPERSEDES] to (old:Source {id:'ADR-001'})
    Falkor->>Falkor: GraphBLAS Invalidation Cascade (ADR-001 is SUPERSEDED, DEC-102 is INVALIDATED)
    Falkor-->>MCP: Invalidation Complete in 2.14ms

    Note over Agent, Disk: ACT III: Agent Attempts Stale Code Execution
    Agent->>MCP: POST /api/mcp/call (apply_code_change, decision: 'DEC-102')
    MCP->>Falkor: Cypher: Check Decision DEC-102 dependency provenance
    Falkor-->>MCP: Return: Source=SUPERSEDED, Fact=STALE
    MCP-->>Agent: 403 FORBIDDEN: BLOCKED_SUPERSEDED_SOURCE (Zero bytes written to disk)

    Note over Agent, Disk: ACT IV: Revalidation & Grounded Write
    Agent->>Falkor: Query Active Sources (Returns ADR-002: OAuth2)
    Agent->>Falkor: Create Decision DEC-103 grounded in ADR-002
    Agent->>MCP: POST /api/mcp/call (apply_code_change, decision: 'DEC-103')
    MCP->>Falkor: Verify Provenance Path for DEC-103
    Falkor-->>MCP: Return: Source=ACTIVE, Fact=VERIFIED
    MCP->>Disk: Atomic Write Verified OAuth2 Code to payment.js
    MCP-->>Agent: 200 OK: GATE APPROVED in 1.62ms
```

---

## 3. Causal Graph Schema & Data Contracts

### 3.1 Node Entity Declarations
```cypher
// 1. Source Node (Architectural Decision Records / Commits)
(:Source {
  id: STRING,         // e.g. "ADR-001", "ADR-002"
  title: STRING,      // e.g. "Adopt TokenAuth v1", "Migrate to OAuth2"
  status: STRING,     // "ACTIVE" | "SUPERSEDED" | "DEPRECATED"
  timestamp: INTEGER, // Epoch ms
  commit_hash: STRING // Git SHA-1 hash
})

// 2. Fact Node (Atomic Claims extracted from Sources)
(:Fact {
  id: STRING,         // e.g. "F-Auth-v1", "F-OAuth2"
  claim: STRING,      // e.g. "Payment services require TokenAuth v1"
  is_stale: BOOLEAN,  // true | false
  verified: BOOLEAN   // true | false
})

// 3. Decision Node (Agent Reasoning & Architectural Intent)
(:Decision {
  id: STRING,         // e.g. "DEC-102", "DEC-103"
  title: STRING,      // e.g. "Generate Checkout with TokenAuth v1"
  status: STRING,     // "VALID" | "INVALIDATED_NEEDS_REVALIDATION" | "ARCHIVED"
  rationale: STRING   // Architectural justification
})
```

### 3.2 Relational Edge Contracts
- `(:Fact)-[:EXTRACTED_FROM]->(:Source)`: Identifies the foundational documentation origin of a factual premise.
- `(:Decision)-[:DEPENDS_ON]->(:Fact)`: Encapsulates agent reasoning upon factual premises.
- `(:Source)-[:SUPERSEDES]->(:Source)`: Causal temporal precedence. When `A SUPERSEDES B`, all downstream facts and decisions of `B` are instantly poisoned.

---

## 4. Model Context Protocol (MCP) Interface Declarations

CAVDAX implements the official Anthropic Model Context Protocol specification:

### 4.1 Tool: `apply_code_change`
```json
{
  "name": "apply_code_change",
  "description": "Applies verified code modifications to the repository, strictly gated by causal provenance in FalkorDB.",
  "parameters": {
    "type": "object",
    "properties": {
      "decision_id": {
        "type": "string",
        "description": "The unique identifier of the Decision node justifying this change (e.g. 'DEC-103')."
      },
      "file_path": {
        "type": "string",
        "description": "Relative target file path in the repository (e.g. 'demo-repo/src/services/payment.js')."
      },
      "code_payload": {
        "type": "string",
        "description": "The exact source code to write upon provenance verification."
      }
    },
    "required": ["decision_id", "file_path", "code_payload"]
  }
}
```

### 4.2 Tool: `check_intent_clearance`
```json
{
  "name": "check_intent_clearance",
  "description": "Pre-flight validation check. Evaluates whether a target Decision node is causally grounded before generating tokens or code.",
  "parameters": {
    "type": "object",
    "properties": {
      "decision_id": { "type": "string", "description": "The decision identifier to verify (e.g. 'DEC-103')." },
      "target_file": { "type": "string", "description": "Optional file path intended for mutation." },
      "proposed_action": { "type": "string", "description": "Optional brief intent description." }
    },
    "required": ["decision_id"]
  }
}
```

### 4.3 Tool: `revalidate_decision`
```json
{
  "name": "revalidate_decision",
  "description": "Recovers from causal invalidation by synthesizing a new Decision linked to fresh active ADR Facts.",
  "parameters": {
    "type": "object",
    "properties": {
      "old_decision_id": { "type": "string", "description": "The superseded/invalidated decision ID." },
      "new_decision_id": { "type": "string", "description": "The new replacement decision ID (e.g. 'DEC-103')." },
      "new_decision_title": { "type": "string", "description": "Architectural rationale title." },
      "adr_file": { "type": "string", "description": "Source ADR Markdown file path." }
    },
    "required": ["old_decision_id", "new_decision_id", "new_decision_title"]
  }
}
```

### 4.4 Tools: `acquire_decision_lock` & `release_decision_lock`
```json
{
  "name": "acquire_decision_lock",
  "description": "Leases an exclusive temporal lock on a Decision node to prevent multi-agent collision.",
  "parameters": {
    "type": "object",
    "properties": {
      "decision_id": { "type": "string" },
      "agent_id": { "type": "string" },
      "ttl_ms": { "type": "number", "description": "Lock lease duration in milliseconds (default: 30000ms)." },
      "reason": { "type": "string" }
    },
    "required": ["decision_id", "agent_id"]
  }
}
```

### 4.5 Tool: `export_graph_image`
```json
{
  "name": "export_graph_image",
  "description": "Generates a standalone SVG or PNG vector snapshot of the active causal graph for PR artifacts and visual debugging.",
  "parameters": {
    "type": "object",
    "properties": {
      "format": { "type": "string", "enum": ["svg", "png"] },
      "theme": { "type": "string", "enum": ["dark", "light"] }
    }
  }
}
```

---

## 5. Security & Invalidation Gates (Cypher Traversal Queries)

### 5.1 Pre-Execution Provenance Verification Query
```cypher
MATCH (d:Decision {id: $decision_id})
OPTIONAL MATCH (d)-[:DEPENDS_ON]->(f:Fact)-[:EXTRACTED_FROM]->(s:Source)
OPTIONAL MATCH (new_s:Source)-[:SUPERSEDES]->(s)
RETURN 
  d.id AS decision_id,
  d.status AS decision_status,
  f.id AS fact_id,
  f.is_stale AS fact_stale,
  s.id AS source_id,
  s.status AS source_status,
  new_s.id AS superseding_source_id
```

### 5.2 Real-Time Gate Evaluation Logic
1. If `d` does not exist $\rightarrow$ **REJECT** (`UNREGISTERED_DECISION`).
2. If `s.status == 'SUPERSEDED'` or `new_s != null` $\rightarrow$ **REJECT** (`BLOCKED_SUPERSEDED_SOURCE`).
3. If `f.is_stale == true` $\rightarrow$ **REJECT** (`BLOCKED_STALE_FACT`).
4. If `d.status == 'VALID'` and all upstream sources are `ACTIVE` $\rightarrow$ **APPROVE** (`APPROVED`).

---

## 6. Infrastructure, Containerization & Fail-Open Resilience

### 6.1 Docker Compose Mesh (`docker-compose.yml`)
CAVDAX orchestrates its graph database, backend gateway, and client Web HUD through the root `docker-compose.yml` stack:

```yaml
services:
  # 1. FalkorDB Graph Engine (GraphBLAS Sparse Matrix Database)
  falkordb:
    image: falkordb/falkordb:latest
    container_name: cavdax-falkordb
    ports:
      - "6379:6379"
    volumes:
      - falkordb-data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # 2. CAVDAX Backend Gateway & Enclosed MCP Gate
  server:
    build:
      context: .
      dockerfile: apps/server/Dockerfile
    container_name: cavdax-server
    environment:
      - PORT=3000
      - FALKORDB_HOST=falkordb
      - FALKORDB_PORT=6379
      - NODE_ENV=development
      - GITHUB_CALLBACK_URL=http://localhost:3001/api/auth/github/callback
      - CLIENT_URL=http://localhost:5173
    ports:
      - "3001:3000"
    volumes:
      - server-sessions:/app/apps/server/data/sessions
    depends_on:
      falkordb:
        condition: service_healthy
    restart: unless-stopped

  # 3. CAVDAX Porcelain Dark Web HUD
  client:
    build:
      context: .
      dockerfile: apps/client/Dockerfile
    container_name: cavdax-client
    environment:
      - VITE_API_URL=http://server:3000
    ports:
      - "5173:5173"
    depends_on:
      - server
    restart: unless-stopped

volumes:
  falkordb-data:
    driver: local
  server-sessions:
    driver: local
```

> **Container Lifecycle Hook Invariant**: To guarantee deterministic container compilation, `apps/client/Dockerfile` copies `apps/client/scripts/` prior to `RUN npm install`, ensuring custom postinstall patches (`node scripts/patch-hairline.js`) resolve without layer-caching misses.

### 6.2 Zero-Blocker Simulation Fallback
If the FalkorDB Docker container is offline during a local developer evaluation or live demo:
- `apps/server/falkor_driver.js` automatically catches connection timeouts.
- Switches instantaneously to the internal `InMemGraphBLAS` engine.
- Emulates the exact GraphBLAS matrix invalidation and gate returns with identical Cypher responses, guaranteeing **zero runtime crashes or demo blockers**.


---

## 7. Enterprise Security Perimeter & Web HUD Multi-Route Topology

### 7.1 Multi-Layer Defense-in-Depth Security
CAVDAX implements layered security across client, gateway, and kernel boundaries:
1. **Administrative IP Whitelisting & Dev Authentication (`requireDevAuth`)**:
   - Administrative endpoints (`POST /api/system/dev-ips`, `/api/system/dev-roster`, `/api/system/hackathon-mode`) are guarded by SHA-256 token verification and IP allowlists.
2. **Path Traversal Confinement**:
   - Gated file operations (`apply_code_change`, `/api/ingest`) resolve target paths with `path.resolve` and verify that the target starts with `PROJECT_ROOT`, preventing arbitrary directory access.
3. **Client IP Spoofing Mitigation**:
   - Uses remote socket address inspection to prevent proxy header tampering.
4. **Transport Security Headers**:
   - Injects `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Strict-Transport-Security`.
5. **Cryptographic Order Tier Binding**:
   - Razorpay order creation binds subscription tier attributes in server memory (`pendingBillingOrders`), rejecting mismatched confirmation payloads with canonical server-side pricing (`CANONICAL_TIER_PRICES_PAISE`).
6. **Tool Sandbox Confinement (`demo-repo/`)**:
   - Tool execution (`apply_code_change`) is confined to `demo-repo/` root; path traversal attempts outside the sandbox trigger immediate 403 blocks with zero byte writes.
7. **Multi-Tenant Scoped Graph Query Isolation**:
   - Graph queries (`/api/graph`, `/api/audit`) enforce parameterized tenant scoping (`WHERE coalesce(d.repo, 'demo') = $repoScope`); unauthenticated callers strictly see canonical demo data.
8. **Section 37 Truth-in-Data Standard (Zero Hardcoded Benchmark Strings or Fake Latency Fallbacks)**:
   - Absolute ban on synthetic numerical constants or logical OR fallbacks for elapsed times (e.g. `parseFloat(...) || 0.42` eliminated); pure execution time is measured dynamically with nanosecond precision (`process.hrtime.bigint()`). Benchmark evaluation suites run real dynamic vector similarity and DAG traversals rather than hardcoded mock strings.



### 7.2 Web HUD Route Topology (9 Operational Surfaces)
The client application provides 9 dedicated routes:
- `/` or `/overview`: Architectural Overview, Causal Invalidation Radar, Cytoscape DAG.
- `/console`: Connected Repository Workspace, git branch mutations, baseline initialization.
- `/mcp`: Live Model Context Protocol Action Playground and sub-millisecond Cypher query simulator.
- `/walkthrough`: 4-Act Storyline Stepper guiding evaluators through baseline, commit mutation, enclosed MCP rejection, and revalidation.
- `/audit`: Immutable compliance ledger displaying all tool execution events.
- `/team`: Engineering credits and research attribution.
- `/profile`: Developer quota tracking, plan capability matrix, and active MCP key provisioning.
- `/support`: Community sponsorship tiers and transparent operational backing breakdown.
- Zero-Trust Administrative Enclave: Diagnostic console, dev IP roster, and node state inspection.

---

## 8. The Causal Interception Enclave Subsystem Architecture

### 8.1 System Topology & Interception Pipeline
The **Causal Interception Enclave** (`#enclave-hub-section`) is CAVDAX's core architectural theater, positioned directly between the problem presentation bento grid and the downstream causal execution loop. It acts as the interactive control plane and hardware-grade visualization of the autonomous agent write-interception pipeline.

```
┌────────────────────────────────────────────────────────────────────────┐
│  CLIENT PWA (React 18 + Lenis + TailWind)                             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  CausalEnclaveHub.jsx                                           │  │
│  │  - 3D Isometric Viewport Deck (Perspective: 1400px)             │  │
│  │  - Solitary Node Elevation Vector Math (-42px Y Lift)            │  │
│  │  - 4.2s Sequential Concentric Squircle Wavefront Generator       │  │
│  │  - Precision Fullscreen Centering Guard (|diffCenter| < 80px)   │  │
│  │  - Proactive Keyboard Docking & Traversal Engine                 │  │
│  └─────────────────────────────────┬────────────────────────────────┘  │
└────────────────────────────────────┼───────────────────────────────────┘
                                     │ SSE / Fetch (POST /api/mcp/call)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│  CORE API GATEWAY (Node.js Express + MCP Protocol Engine)             │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Tool Gate: apply_code_change │  │ Tool Gate: check_intent_clearance ││
│  └──────────────┬───────────────┘  └────────────────┬───────────────┘  │
│                 │                                   │                  │
│                 ▼                                   ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ FalkorDB GraphBLAS Matrix Semiring (< 2.0ms Sweeps)              │  │
│  │ - Adjacency Matrix: Extracted_From & Depends_On DAG               │  │
│  │ - Causal Invalidation: Sparse Matrix Multiply BFS                │  │
│  │ - Multi-Agent Leases: acquire_decision_lock Concurrency Engine   │  │
│  │ - Lock Inspection Endpoint: GET /api/mcp/locks                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.2 The 9-Stage Architectural Pipeline
1. **Stage 00 · Causal Semiring Kernel (`CORE`)**: Central algebraic semiring computing transitive reachability and causal invalidation over the dependency DAG in sub-2ms matrix sweeps.
2. **Stage 01 · Claude Code MCP Gate (`01`)**: Intercepts tool calls and filesystem write operations in-flight, blocking obsolete code mutations before bytes hit the disk.
3. **Stage 02 · Cursor IDE Transceiver (`02`)**: Low-latency stdio bridge delivering real-time topological invalidation feedback directly into editor buffers.
4. **Stage 03 · Git AST Diff Extractor (`03`)**: Optical AST parser extracting structural code deltas from commit graphs and detecting implementation drift from active ADRs.
5. **Stage 04 · ADR Invariant Store (`04`)**: Immutable single source of truth preserving superseded and active architectural decision lineages.
6. **Stage 05 · GraphBLAS Matrix Mesh (`05`)**: Sparse matrix algebraic engine executing reachability semirings across arbitrary dependency graphs.
7. **Stage 06 · CI/CD Gate Harness (`06`)**: Automated pipeline verification harness failing pull requests if code commits rely on deprecated architectural claims.
8. **Stage 07 · Cryptographic Audit Trail (`07`)**: Tamper-evident execution ledger capturing every agent interception, rule evaluation, and deterministic verdict.
9. **Stage 08 · Closed-Loop Auto-Repair (`08`)**: Guided remediation pipeline feeding verified ADR invariant constraints back to coding agents for clean self-healing.

### 8.3 Solitary Elevation & 3D Spatial Camera Math
- **Solitary Elevation Invariant**: To preserve visual clarity and eliminate card displacement, only the actively hovered or selected tile elevates (`elevatedCoord: [X, Y - 42]`). All other 8 slabs remain locked to their resting coordinates (`restCoord`).
- **Spring Camera Dynamics**: Stage transitions dynamically shift `transform: perspective(1400px) rotateX(...) rotateY(...) scale(...) translate3d(...)` with a smooth `cubic-bezier(0.16, 1, 0.3, 1)` spring curve, moving the viewport from the wide architectural top view (`CORE`) directly into targeted orbital zoom views for each individual subsystem.

### 8.4 Fullscreen Docking & Lenis Virtualizer Handshake
- **Deterministic Centering**: Viewport locking threshold is calculated as $|\text{sectionCenter} - \text{viewportCenter}| < \min(80, \text{viewportHeight} \times 0.08)$, guaranteeing identical docking precision on $1080\text{p}$ F11 fullscreen and responsive laptop displays.
- **Internal Docking Exemption**: Internal scroll calls pass `options.isInternalDock = true`, preventing Lenis's global programmatic scroll flag (`window.__isProgrammaticScroll`) from triggering false-positive unlocks.
