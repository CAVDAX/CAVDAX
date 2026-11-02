<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/cavdax-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/cavdax-logo-light.svg">
    <img src="assets/cavdax-logo-dark.svg" width="100" height="100" alt="CAVDAX Logo" />
  </picture>
  <h1>CAVDAX: Contextual Action &amp; Verified Decision Autonomous eXecution</h1>
  <p><strong>Graph-Grounded Decision Execution for Coding Agents</strong></p>
  <p>
    Built for the <strong>WeMakeDevs &times; FalkorDB Graph Hacks Hackathon (October 2026)</strong><br />
    <span style="white-space: nowrap"><strong>Primary Track:</strong> Track 2 — Agent Memory and Coordination</span><br />
    <span style="white-space: nowrap"><strong>Secondary Track:</strong> Track 1 — Agents That Act on Connected Data</span>
  </p>

  <p>
    <a href="https://youtu.be/Nhdd7spj1RA">
      <img src="https://img.shields.io/badge/YouTube-10--Minute%20Demo%20Walkthrough-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube Demo Walkthrough" />
    </a>
    <a href="https://cavdax.sahnirmaan.live/">
      <img src="https://img.shields.io/badge/Live%20Production%20Demo-cavdax.sahnirmaan.live-10B981?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
    </a>
  </p>
</div>

<div align="center">

[![CI](https://img.shields.io/github/actions/workflow/status/suneetchugh-dev/CAVDAX/ci.yml?style=for-the-badge&logo=github&label=CI)](https://github.com/suneetchugh-dev/CAVDAX/actions)
[![npm version](https://img.shields.io/npm/v/@cavdax/mcp-server?style=for-the-badge&logo=npm&logoColor=white&color=CB3837)](https://www.npmjs.com/package/@cavdax/mcp-server)
[![npm provenance](https://img.shields.io/badge/provenance-sigstore-informational?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/@cavdax/mcp-server)
[![FalkorDB](https://img.shields.io/badge/FalkorDB-GraphBLAS-FF2D55?style=for-the-badge&logo=redis&logoColor=white)](https://falkordb.com/)
[![MCP](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20(MCP)-06B6D4?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](./docker-compose.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=for-the-badge)](./LICENSE)
[![Latency](https://img.shields.io/badge/Gate%20Latency-%3C%202.5ms-8B5CF6?style=for-the-badge)](#empirical-benchmarks)

</div>

---

## The Fundamental Flaw of Modern Coding Agents

Modern autonomous coding agents (Claude Code, Cursor Composer, Windsurf, GitHub Copilot) rely on **Vector RAG (retrieval-augmented generation)** or lexical search to fetch repository context before modifying code.

### Why Vector RAG Fails in Production Repositories:
1. **Cosine Similarity Ignores Causal Directionality:** A superseded architecture decision (`ADR-001: Adopt TokenAuth v1`) and its superseding decision (`ADR-002: TokenAuth Deprecated; Enforce OAuth2`) share identical semantic vectors (`"payment", "auth", "checkout"`). Vector RAG often retrieves the older, higher-frequency document.
2. **Zero Invalidation Guarantees:** When an engineer commits a change to a config file (`CODEOWNERS`, `package.json`, or an ADR), vector embeddings remain static unless costly re-indexing is triggered.
3. **Unprotected Execution Paths:** Coding agents execute code modifications directly through standard file-system APIs without validating whether the decision justifying the change is still causally valid.

---

## The CAVDAX Solution: Graph-Grounded Enclosed Execution

**CAVDAX** converts repository engineering artifacts into an active, temporal causal Directed Acyclic Graph (DAG) stored inside **FalkorDB**.

When a superseding commit or ADR arrives:
1. **Deterministic Ingestion:** Frontmatter (`supersedes: ADR-001`) and commit messages are parsed deterministically without probabilistic LLM hops.
2. **Cascading Invalidation Wave:** FalkorDB establishes a `[:SUPERSEDES]` relationship and cascades invalidation status flags across the DAG in **< 4ms** via GraphBLAS sparse matrix operations.
3. **Enclosed MCP Execution Gate:** The agent's file modification tool (`apply_code_change`) is enclosed inside an internal parameterized Cypher gate. If any ancestor source or fact has been superseded, the gate **hard-blocks** execution (`BLOCKED_SUPERSEDED_SOURCE`). Zero invalid bytes are written to disk.
4. **Dynamic Invalidation Recovery:** The agent is prompted to invoke `revalidate_decision` to ground actions in active sources, enabling safe, verified execution.

---

## Graph Data Model & Causal Ontology

CAVDAX models engineering knowledge and agent actions using a formal 4-tier Causal Directed Acyclic Graph (DAG) optimized for sub-millisecond GraphBLAS traversal in FalkorDB:

```mermaid
graph TD
    subgraph Active_Path["Active Invariant Chain (Valid)"]
        direction TB
        S2["(:Source {id: 'ADR-002', status: 'ACTIVE'})"]
        F2["(:Fact {id: 'F-OAuth2-v2', is_stale: false})"]
        D2["(:Decision {id: 'DEC-103', status: 'VALID'})"]
        A1["(:AgentAction {verdict: 'APPROVED'})"]

        S2 -- "[:EXTRACTED_FROM]" --> F2
        F2 -- "[:DEPENDS_ON]" --> D2
        D2 -- "[:GROUNDED_IN]" --> A1
    end

    subgraph Stale_Path["Superseded Chain (Invalidated)"]
        direction TB
        S1["(:Source {id: 'ADR-001', status: 'SUPERSEDED'})"]
        F1["(:Fact {id: 'F-Auth-v1', is_stale: true})"]
        D1["(:Decision {id: 'DEC-102', status: 'INVALIDATED'})"]

        S1 -- "[:EXTRACTED_FROM]" --> F1
        F1 -- "[:DEPENDS_ON]" --> D1
    end

    S2 -. "[:SUPERSEDES]" .-> S1
    D2 -. "[:REPLACES]" .-> D1
```

### 1. Node Schemas & Labels
* **`(:Source)` — Authoritative Engineering Artifacts:**
  * `id` *(String, Primary Key)*: Unique identifier (e.g., `'ADR-001'`, `'commit-9f8a2b'`).
  * `title` *(String)*: Human-readable title of the document or change.
  * `type` *(String)*: Polymorphic artifact type (`'ADR'`, `'COMMIT'`, `'CODEOWNERS'`, `'PACKAGE_JSON'`).
  * `status` *(String)*: `'ACTIVE'` or `'SUPERSEDED'`.
  * `superseded_at` *(Integer, Optional)*: Unix millisecond epoch timestamp when superseded.
* **`(:Fact)` — Atomic Invariant Claims:**
  * `id` *(String, Primary Key)*: Unique claim ID (e.g., `'F-Auth-v1'`, `'F-OAuth2-v2'`).
  * `claim` *(String)*: Normalized atomic statement (e.g., `'TokenAuth v1 active'`, `'OAuth2 enforced'`).
  * `is_stale` *(Boolean)*: `false` when active; flipped to `true` when parent source is superseded.
  * `invalidated_at` *(Integer, Optional)*: Unix timestamp when marked stale.
* **`(:Decision)` — Architecture & Implementation Directives:**
  * `id` *(String, Primary Key)*: Directive identifier (e.g., `'DEC-102'`, `'DEC-103'`).
  * `title` *(String)*: Directive summary (e.g., `'Implement TokenAuth v1 for checkout'`).
  * `status` *(String)*: `'VALID'`, `'INVALIDATED_NEEDS_REVALIDATION'`, or `'REPLACED_ARCHIVED'`.
  * `created_at` *(Integer)*: Creation epoch timestamp.
* **`(:AgentAction)` — Verified Tool Execution Audit Log:**
  * `id` *(String, Primary Key)*: Unique audit event hash.
  * `tool` *(String)*: Invoked MCP tool name (`'apply_code_change'`).
  * `target_file` *(String)*: Protected file path (`'src/services/payment.js'`).
  * `verdict` *(String)*: `'APPROVED'` or `'BLOCKED'`.
  * `timestamp` *(Integer)*: Execution epoch timestamp.

### 2. Relationship Types & Causal Semantics
* **`(:Source)-[:SUPERSEDES]->(:Source)`**: Directed temporal invalidation edge between a newer artifact and an obsolete artifact.
* **`(:Fact)-[:EXTRACTED_FROM]->(:Source)`**: Provenance grounding attributing an atomic proposition to its authoritative origin.
* **`(:Decision)-[:DEPENDS_ON]->(:Fact)`**: Directional dependency indicating that a decision's validity is conditional on the fact remaining fresh (`*1..4` hops).
* **`(:Decision)-[:REPLACES]->(:Decision)`**: Evolutionary replacement edge linking a newly synthesized Act IV decision to an archived predecessor.
* **`(:AgentAction)-[:GROUNDED_IN]->(:Decision)`**: Mandatory audit link created only upon verified gate approval.

---

## 5 Architectural Pillars: Beyond Vector RAG & Naive Linters

CAVDAX provides production engineering organizations with an architectural defense against autonomous agent hallucinations:

| # | Competitive Moat | Problem in Traditional Agent Stacks | CAVDAX GraphBLAS Solution |
|---|---|---|---|
| **1** | **Proactive Intent Clearance** | Agents burn hundreds of tokens writing obsolete code before discovering a policy violation. | Agents query `check_intent_clearance` in **< 2ms pre-flight**. FalkorDB validates intent before a single byte of code is generated. |
| **2** | **Zero-Config Heuristic Parser** | Rigid tools fail unless engineering teams hand-craft strict YAML frontmatter on every document. | Intelligent regex heuristics extract titles, status, and supersessions from **plain unstructured Markdown, RFCs, and Notion exports**. |
| **3** | **Distributed Decision Locks** | Multiple autonomous agents (e.g., dual Devin or Claude Code instances) edit conflicting decisions concurrently. | `DecisionLockManager` provides **leased concurrency locks** (`acquire_decision_lock`, `release_decision_lock`) to eliminate multi-agent race conditions. |
| **4** | **Automated CI/CD PR Gate** | Manual CLI tools require local developer execution and are ignored during pull requests. | Automated **GitHub Action (`cavdax-gate.yml`)** scans changed files on PRs, blocks stale code, and outputs rich Markdown summaries to `$GITHUB_STEP_SUMMARY`. |
| **5** | **Out-of-Band Divergence Radar** | Developers remain unaware when a teammate commits a breaking ADR until an agent fails in production. | **Instant Out-of-Band Alerts** dispatch via **Resend HTML email** and **Service Worker Web Push** bound to decision blast radius. |

---

## System Architecture & Execution Flow

### 1. End-to-End System Architecture Flowchart

![CAVDAX System Architecture Flowchart](./assets/System-Architecture.svg)

*CAVDAX provides two architectural perspectives:*
* **Variant A (Horizontal `flowchart LR`)**: Recommended for 16:9 widescreen video presentations and fast left-to-right dataflow comprehension.
* **Variant B (Vertical `graph TB`)**: Deep-dive structural hierarchy detailing node schemas, state persistence, and protocol boundaries.

#### Variant A: Horizontal 16:9 Widescreen Architecture Flowchart (Presentation View)
*Flows left-to-right from AI Agents & Web HUD, through the Ingestion & MCP Gate, directly into FalkorDB's GraphBLAS Causal Core, and out to Target Codebases & the Out-of-Band Notification Plane:*

```mermaid
flowchart LR
    subgraph Client_Plane["1. Developer & Presentation Plane"]
        direction TB
        AIAgents["Autonomous AI Coding Agents<br/><i>Claude Code / Cursor / Devin</i>"]
        WebHUD["Web HUD & Visual Console<br/><i>/overview, /console, /mcp, /audit</i>"]
        Canvas["Temporal DAG Canvas<br/><i>D3 Hairline Optics</i>"]
        HUDAlerts["In-HUD Audio & Radar<br/><i>Web Audio Chime (880Hz)</i>"]
        WebHUD --> Canvas
        WebHUD --> HUDAlerts
    end

    subgraph Gateway_Plane["2. Gateway & Ingestion Plane"]
        direction TB
        MCPGate["Enclosed MCP Gate<br/><i>core/mcp/server.js</i>"]
        ServerAPI["Express Server & SSE<br/><i>apps/server/index.js</i>"]
        GitScanner["GitHub ADR Scanner<br/><i>apps/server/githubAdr.js</i>"]
        WebhookHandler["GitHub Webhook Listener<br/><i>POST /api/github/webhook</i>"]
        ServerAPI --> MCPGate
        ServerAPI --> GitScanner
        WebhookHandler --> ServerAPI
    end

    subgraph Causal_Engine["3. FalkorDB GraphBLAS Causal Core (Mathematical Heart)"]
        direction TB
        FalkorDB[("FalkorDB 0.4+<br/>Sparse Matrix Engine")]
        Sources["(:Source {id, title, status})"]
        Facts["(:Fact {claim, is_stale})"]
        Decisions["(:Decision {id, status})"]
        AgentActions["(:AgentAction {target_file})"]
        
        FalkorDB --- Sources
        FalkorDB --- Facts
        FalkorDB --- Decisions
        FalkorDB --- AgentActions

        Sources -. "[:SUPERSEDES]" .-> Sources
        Facts -. "[:EXTRACTED_FROM]" .-> Sources
        Decisions -. "[:DEPENDS_ON]" .-> Facts
        AgentActions -. "[:GROUNDED_IN]" .-> Decisions
    end

    subgraph Target_Ecosystem["4. Target Repo & Notification Plane"]
        direction TB
        GitHubRepos["External GitHub Repos<br/><i>Public & Private (OAuth)</i>"]
        ProtectedDisk["Target Filesystem<br/><i>Sandboxed Safe Mutation</i>"]
        EmailRadar["Resend Transactional Email<br/><i>sahnirmaan.live</i>"]
        WebPushBroker["VAPID Web Push Broker<br/><i>RFC 8292 (/sw.js)</i>"]
        DevInbox["Developer Alerts Inbox<br/><i>Actionable Causal DAG Breadcrumb</i>"]
        
        EmailRadar --> DevInbox
        WebPushBroker --> DevInbox
    end

    %% Left-to-Right Execution & Invalidation Flows
    AIAgents ==>|"1. stdio / SSE (check_intent_clearance)"| MCPGate
    WebHUD <==>|"REST & SSE Live Updates"| ServerAPI
    MCPGate <==>|"2. Sub-millisecond Cypher (A^T · x)"| FalkorDB
    MCPGate -->|"3a. 200 OK (Clearance Approved)"| ProtectedDisk
    MCPGate -.->|"3b. 403 Forbidden (Blocked Invalidation)"| AIAgents
    
    GitScanner <==>|"Scan ADR ASTs & Stack"| GitHubRepos
    GitHubRepos -->|"Git Push Webhook (breaks: DEC-xxx)"| WebhookHandler
    ServerAPI -->|"Dispatch Transactional Invalidation"| EmailRadar
    ServerAPI -->|"Dispatch Browser Push Notification"| WebPushBroker
    ServerAPI -->|"SSE Invalidation Event"| HUDAlerts
```

#### Variant B: Vertical Structural Architecture Flowchart (Hierarchy View)

```mermaid
graph TB
    subgraph Client_Plane["1. Developer & Presentation Plane"]
        WebHUD["Web HUD & Visual Console (/overview, /console, /mcp, /audit)"]
        Canvas["Interactive Temporal DAG Canvas"]
        NodeInspector["Draggable Node Inspector (Physics Bounds)"]
        WhatIfBanner["What-If Blast Radius Simulation Engine"]
        AIAgents["AI Coding Agents (Claude Code, Cursor, Windsurf, Devin)"]
        Notifications["Developer Inbox & Web Push Service Worker (/sw.js)"]
        WebHUD --> Canvas
        Canvas --> NodeInspector
        Canvas --> WhatIfBanner
    end

    subgraph Gateway_Plane["2. Gateway & Protocol Ingestion Plane"]
        Server["Express API Server (apps/server/index.js)"]
        MCPGateway["Enclosed MCP Gateway (core/mcp/server.js)"]
        GitHubScan["GitHub ADR AST Scanner & Stack Detector (apps/server/githubAdr.js)"]
        StateStore["Atomic System State Store (apps/server/systemState.js)"]
        SVGEngine["Standalone SVG & Vision OCR Engine (core/graph/renderSvg.js)"]
        EmailDispatcher["Transactional Alert Engine (Resend API / sahnirmaan.live)"]
        WebPushBroker["VAPID Web Push Broker (RFC 8292)"]
        WebhookReceiver["GitHub Webhook Ingestion (/api/github/webhook)"]
        
        Server --> MCPGateway
        Server --> GitHubScan
        Server --> StateStore
        Server --> SVGEngine
        Server --> EmailDispatcher
        Server --> WebPushBroker
        WebhookReceiver --> Server
    end

    subgraph Causal_Engine["3. FalkorDB GraphBLAS Causal Core"]
        FalkorDB[("FalkorDB 0.4+ (RedisGraph Sparse Matrix Engine)")]
        Sources["(:Source {id, title, status, commit})"]
        Facts["(:Fact {id, claim, is_stale, verified})"]
        Decisions["(:Decision {id, title, status, rationale})"]
        AgentActions["(:AgentAction {id, tool, target_file, status})"]
        FalkorDB --> Sources
        FalkorDB --> Facts
        FalkorDB --> Decisions
        FalkorDB --> AgentActions
        Sources -. "[:SUPERSEDES]" .-> Sources
        Facts -. "[:EXTRACTED_FROM]" .-> Sources
        Decisions -. "[:DEPENDS_ON]" .-> Facts
        AgentActions -. "[:GROUNDED_IN]" .-> Decisions
    end

    subgraph Target_Ecosystem["4. Target Codebase & Version Control"]
        GitHubRepos["External GitHub Repositories (e.g. acme-checkout)"]
        InitBranch["Isolated Starter Branch (cavdax/init-adr)"]
        SyncBranch["Isolated Status Patch Branch (cavdax/sync-*)"]
        ProtectedDisk["Target Local Disk (Sandboxed Writes)"]
        GitHubRepos --> InitBranch
        GitHubRepos --> SyncBranch
    end

    AIAgents <==>|"MCP Stdio / HTTP SSE (apply_code_change, export_graph_image)"| MCPGateway
    WebHUD <==>|"REST & SSE Events (/api/graph, /api/github/repos)"| Server
    MCPGateway <==>|"Parameterized Cypher (< 2ms Matrix Traversal)"| FalkorDB
    GitHubScan <==>|"GitHub REST API (Non-Destructive AST Scan)"| GitHubRepos
    GitHubScan -->|"Draft Starter ADR / Sync PR"| InitBranch
    GitHubScan -->|"Draft Superseded Status PR"| SyncBranch
    MCPGateway -->|"Verified Write on Gate Approval"| ProtectedDisk
    GitHubRepos -->|"Live Push / PR Webhook"| WebhookReceiver
    EmailDispatcher -->|"Actionable Causal HTML Email"| Notifications
    WebPushBroker -->|"Instant Desktop/Mobile Push"| Notifications
```

#### 🔔 Notification Plane (Out-of-Band Divergence Radar)
CAVDAX treats notifications as an essential, enterprise-grade feedback loop that prevents AI agents from executing against stale context even when developers are offline:
1. **Resend Transactional Email (`apps/server/email.js`)**: Invalids dispatch clean HTML emails via `sahnirmaan.live` with Decision ID, ASCII causal tree, and blast-radius deep links.
2. **RFC 8292 VAPID Web Push (`apps/server/webPush.js` & `public/sw.js`)**: Hardware OS and browser-level notification badges delivering instant disruption alerts.
3. **Procedural In-HUD Audio Chimes (`apps/client/src/App.jsx`)**: Synthesizes 880Hz / 440Hz dual-tone Web Audio chimes on invalidation events.
4. **Live Invalidation Pitch Trigger (`⚡ Simulate Alert`)**: Accessible via top HUD toolbar and Preferences Modal for live demonstrations.

### 2. Multi-Layer Architecture & FalkorDB GraphBLAS Engine Flowchart
![CAVDAX Layer Architecture Flowchart](./assets/System-Architecture2.svg)

```mermaid
graph LR
    subgraph Ingestion_Layer["Layer 1: Ingestion & Extraction"]
        ADRDoc["ADR / Markdown Files"] --> ASTParser["AST Frontmatter Parser"]
        GitCommit["Git Commits / Webhooks"] --> IngestCommit["Commit Ingestion Hook"]
        StackManifests["Package & Infra Manifests"] --> StackDetector["Smart Stack Detector"]
    end

    subgraph Causal_Matrix["Layer 2: GraphBLAS Causal DAG (FalkorDB)"]
        direction TB
        S1["(:Source {id: 'ADR-001', status: 'SUPERSEDED'})"]
        S2["(:Source {id: 'ADR-002', status: 'ACTIVE'})"]
        F1["(:Fact {id: 'F-Auth', is_stale: true})"]
        F2["(:Fact {id: 'F-OAuth2', is_stale: false})"]
        D1["(:Decision {id: 'DEC-102', status: 'INVALIDATED'})"]
        D2["(:Decision {id: 'DEC-103', status: 'VALID'})"]
        
        S2 -- "[:SUPERSEDES]" --> S1
        F1 -- "[:EXTRACTED_FROM]" --> S1
        F2 -- "[:EXTRACTED_FROM]" --> S2
        D1 -- "[:DEPENDS_ON]" --> F1
        D2 -- "[:DEPENDS_ON]" --> F2
        D2 -. "[:REPLACES]" .-> D1
    end

    subgraph Gating_Layer["Layer 3: Enclosed MCP Execution Gate"]
        MCPTool["apply_code_change (decision_id, file, payload)"]
        GateLogic{"verifyActionGate (BFS Cypher)"}
        Approved["Verdict: APPROVED (< 2ms)"]
        Blocked["Verdict: BLOCKED_SUPERSEDED_SOURCE"]
        DiskWrite["Atomic Filesystem Write"]
        AuditLedger[("(:AgentAction Audit Node)")]

        MCPTool --> GateLogic
        GateLogic -- "Grounded in DEC-103 (Fresh)" --> Approved --> DiskWrite --> AuditLedger
        GateLogic -- "Grounded in DEC-102 (Stale)" --> Blocked --> AuditLedger
    end

    Ingestion_Layer --> Causal_Matrix
    Causal_Matrix --> Gating_Layer
```

### 3. Enclosed MCP Protocol Execution Gate Flowchart
![CAVDAX Enclosed MCP Gate Flowchart](./assets/MCP-FLOWCHART.svg)

```mermaid
graph TD
    Start["Agent invokes 'apply_code_change' or 'check_intent_clearance'"] --> Extract["Extract Decision ID (e.g. DEC-102) & Target File"]
    Extract --> Query["Execute Parameterized Cypher against FalkorDB GraphBLAS"]
    Query --> Traversal{"Trace Causal Path:
Decision -> Fact -> Source
Check if ANY source is SUPERSEDED"}
    
    Traversal -- "Active & Valid (0 Superseded Sources)" --> Approved["Gate Verdict: APPROVED (< 2ms)"]
    Approved --> ConfinementCheck{"Path Confinement Check:
Target resides within repo root?"}
    ConfinementCheck -- "Yes (Clean Path)" --> DiskWrite["Atomic Write Code to Protected Disk"]
    ConfinementCheck -- "No (Path Traversal Detected)" --> PathBlock["Gate Verdict: BLOCKED_PATH_TRAVERSAL
Zero Bytes Written"]
    DiskWrite --> LogApproved["Create (:AgentAction {status: 'EXECUTED'}) in FalkorDB"]
    LogApproved --> ReturnApproved["Return JSON 200 OK + Execution Latency to Agent"]

    Traversal -- "Superseded or Invalidated Path" --> Blocked["Gate Verdict: BLOCKED_SUPERSEDED_SOURCE"]
    Blocked --> LogBlocked["Create (:AgentAction {status: 'BLOCKED'}) in FalkorDB"]
    LogBlocked --> ZeroBytes["ZERO BYTES WRITTEN TO DISK"]
    ZeroBytes --> ReturnBlocked["Return JSON 403 Forbidden with exact violation path
& Guidance to invoke 'revalidate_decision'"]
```

### 4. Autonomous Causal Invalidation & Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer / GitHub
    actor Agent as Autonomous AI Agent
    participant Web as Visual Console HUD
    participant Gate as Enclosed MCP Gate
    participant Graph as FalkorDB (GraphBLAS)
    participant Repo as Target Repository

    Note over Dev, Graph: ACT I: Baseline Architectural Grounding
    Dev->>Repo: Merge ADR-001 (TokenAuth v1 accepted)
    Gate->>Graph: Ingest ADR-001 & Create Decision DEC-102 (status: VALID)
    Web->>Graph: Fetch Causal DAG & Display Grounded Chain

    Note over Dev, Graph: ACT II: Temporal Invalidation (Superseding Commit)
    Dev->>Repo: Commit ADR-002 (Mandatory OAuth2, supersedes ADR-001)
    Gate->>Graph: Ingest ADR-002: CREATE (ADR-002)-[:SUPERSEDES] to (ADR-001)
    Graph->>Graph: GraphBLAS Linear Algebra Invalidation Cascade (2.1ms)
    Graph-->>Web: SSE Event: ADR-001 is SUPERSEDED, DEC-102 is INVALIDATED

    Note over Agent, Repo: ACT III: Stale Agent Execution Intercepted
    Agent->>Gate: apply_code_change(decision: 'DEC-102', file: 'payment.js')
    Gate->>Graph: verifyActionGate(decisionId: 'DEC-102')
    Graph-->>Gate: Verdict: BLOCKED_SUPERSEDED_SOURCE (stale fact detected)
    Gate-->>Agent: 403 Forbidden: Zero bytes written to disk
    Gate->>Web: Log BLOCKED attempt on Compliance Audit Ledger

    Note over Agent, Repo: ACT IV: Autonomous Revalidation & Gated Write
    Agent->>Gate: check_intent_clearance(decision: 'DEC-103')
    Agent->>Gate: revalidate_decision(new_source: 'ADR-002', old_decision: 'DEC-102', new_decision: 'DEC-103')
    Graph->>Graph: CREATE (DEC-103:Decision)-[:REPLACES] to (DEC-102)
    Agent->>Gate: apply_code_change(decision: 'DEC-103', file: 'payment.js', code: 'OAuth2')
    Gate->>Graph: verifyActionGate(decisionId: 'DEC-103')
    Graph-->>Gate: Verdict: APPROVED (1.6ms)
    Gate->>Repo: Atomic write verified OAuth2 implementation to disk
    Gate-->>Agent: 200 OK: Code written with verified causal provenance
```

---

## Production Interface Showcase

Captured directly from our live production deployment at [https://cavdax.sahnirmaan.live/](https://cavdax.sahnirmaan.live/):

### 1. Causal Graph & Temporal DAG Canvas (`/overview`)
> Visualizes live FalkorDB Directed Acyclic Graph (DAG) state, active vs. superseded architectural sources, and real-time graph invalidation.

<div align="center">
  <img src="./assets/screenshots/01_causal_graph_overview.png" alt="CAVDAX Causal Graph Overview" width="950" />
</div>

### 2. Connected Repository Developer Workspace (`/console`)
> Real-time developer workspace with connected repository lifecycle controls, branch tracking, and instant architecture baseline initialization (`ADR-001`).

<div align="center">
  <img src="./assets/screenshots/02_developer_console.png" alt="CAVDAX Developer Console" width="950" />
</div>

### 3. Interactive MCP Action Playground (`/mcp`)
> Pre-flight causal verification simulator featuring live Cypher query generation, traversal depth controls (`1..4` hops), and sub-millisecond GraphBLAS latency display.

<div align="center">
  <img src="./assets/screenshots/03_mcp_action_playground.png" alt="CAVDAX MCP Action Playground" width="950" />
</div>

### 4. Immutable Compliance Audit Ledger (`/audit`)
> Tamper-evident operational ledger recording every tool execution, verdict, target file path, and grounding decision ID.

<div align="center">
  <img src="./assets/screenshots/04_compliance_audit_ledger.png" alt="CAVDAX Compliance Audit Ledger" width="950" />
</div>

### 5. Developer Profile, Plan Quotas & Active MCP Keys (`/profile`)
> Real-time subscription tier management, plan quota consumption metrics, and secure MCP API key provisioning.

<div align="center">
  <img src="./assets/screenshots/05_developer_profile_quota.png" alt="CAVDAX Developer Profile and Quotas" width="950" />
</div>


---

## Out-of-Band Divergence Radar & Real-Time Alerts

While CAVDAX's enclosed MCP gate (`apply_code_change`) prevents active coding agents from writing stale code in real-time, production engineering is fundamentally asynchronous. If a security lead or teammate merges `ADR-002` at 10:00 AM deprecating TokenAuth v1, an offline developer's planned implementation decision (`DEC-102`) is instantly superseded.

CAVDAX provides **Dual-Plane Protection**:
1. **In-Flight Enclosed Gate (MCP)**: Intercepts active coding agents in real-time.
2. **Out-of-Band Divergence Radar (Email + Web Push + Webhooks)**: Automatically notifies the decision author or team asynchronously the millisecond a superseding ADR is pushed to the repository.

```
[GitHub Push: ADR-002 Merged] ──► [POST /api/github/webhook]
                                            │
                                            ▼
                      [FalkorDB GraphBLAS Causal Traversal]
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
       [Resend Transactional Email]                 [VAPID Service Worker Push]
       - Monochromatic Console HTML                - Background OS Notification
       - Actionable Causal Provenance              - Works with tab closed
       - 1-Click HUD Blast Radius Link             - Offline Developer Alert
```

### 1. Blast-Radius Bound Causal Notifications
Unlike noisy CI bots that broadcast spam to an entire team, CAVDAX traverses the FalkorDB causal DAG:
`(newerSource)-[:SUPERSEDES]->(oldSource)<-[:EXTRACTED_FROM]-(Fact)<-[:DEPENDS_ON]-(d:Decision)`  
Alerts are dispatched **strictly to the registered owner or CODEOWNER of the affected decision**, completely eliminating alert fatigue.

### 2. Dual Out-of-Band Delivery Channels
* **Developer-Console Transactional Email (Resend API)**:
  * Dispatched from `no-reply@sahnirmaan.live` with verified DKIM/SPF domain authentication.
  * Formatted in an industrial monochromatic developer aesthetic containing the exact broken decision ID, superseding source ID, causal violation path, direct 1-click link to the visual Blast Radius diff in the CAVDAX HUD, and copy-paste remediation CLI directive.
  * Includes an automated sliding-window alert debouncer (5-minute window) to prevent spam during rapid git commit sequences.
* **Background Web Push (Service Worker + VAPID)**:
  * Native browser `PushManager` subscription registered via `/sw.js` and managed by `apps/client/src/services/webPush.js`.
  * Elliptic-curve cryptography (ECDSA NIST P-256) VAPID key pairs generated and persisted server-side.
  * Delivers operating system-level desktop notifications even when browser tabs are closed.

### 3. Interactive Pitch & Demo Trigger (`/api/alerts/simulate-invalidation`)
For live hackathon pitches and judging evaluations:
* The HUD provides a **"Simulate Incompatible ADR Commit"** action in the Developer Console and Preferences.
* Instantly triggers FalkorDB causal invalidation, broadcasts SSE to the live DAG canvas, and dispatches an authentic divergence alert to the evaluator's inbox with measured sub-second latency.

---

## Core Cypher Queries (FalkorDB GraphBLAS)

CAVDAX leverages FalkorDB's linear-algebraic matrix engine to run deep multi-hop traversals in sub-millisecond timeframes.

### Query 1: Enclosed Action Gate Verification (`verifyActionGate`)
Evaluates the full causal dependency tree and uses `ANY(...)` aggregation to prevent mixed-path false positives:

```cypher
MATCH (d:Decision {id: $decisionId})
WITH d, d.status AS decision_status
OPTIONAL MATCH path = (d)-[:DEPENDS_ON*1..4]->(f:Fact)-[:EXTRACTED_FROM]->(s:Source)
WITH d, decision_status,
     collect({
       path_nodes: [n IN nodes(path) | labels(n)[0] + ':' + coalesce(n.id, n.ref)],
       fact_stale: coalesce(f.is_stale, false),
       source_status: coalesce(s.status, 'ACTIVE')
     }) AS dependencies
RETURN d.id AS decision_id,
       decision_status,
       CASE 
         WHEN decision_status = 'INVALIDATED_NEEDS_REVALIDATION' THEN 'BLOCKED_DECISION_INVALIDATED'
         WHEN size(dependencies) = 0 THEN 'BLOCKED_NO_GROUNDING'
         WHEN ANY(dep IN dependencies WHERE dep.fact_stale = true) THEN 'BLOCKED_STALE_FACT'
         WHEN ANY(dep IN dependencies WHERE dep.source_status = 'SUPERSEDED') THEN 'BLOCKED_SUPERSEDED_SOURCE'
         ELSE 'APPROVED'
       END AS gate_verdict,
       [dep IN dependencies WHERE dep.fact_stale = true OR dep.source_status = 'SUPERSEDED' | dep.path_nodes] AS violation_paths
```

### Query 2: Cascading Invalidation Wave (`cascadeInvalidation`)
Propagates invalidation from a newly ingested source down to all affected decisions in $< 3\text{ ms}$:

```cypher
MATCH (newSource:Source {id: $newSourceId})
MATCH (oldSource:Source {id: $oldSourceId})
MERGE (newSource)-[:SUPERSEDES]->(oldSource)
SET oldSource.status = 'SUPERSEDED',
    oldSource.superseded_at = timestamp()
WITH oldSource
MATCH (oldSource)<-[:EXTRACTED_FROM]-(staleFact:Fact)
SET staleFact.is_stale = true, 
    staleFact.invalidated_at = timestamp()
WITH staleFact
MATCH (d:Decision)-[:DEPENDS_ON*1..4]->(staleFact)
SET d.status = 'INVALIDATED_NEEDS_REVALIDATION',
    d.invalidated_at = timestamp()
RETURN count(DISTINCT d) AS affected_decisions, 
       collect(DISTINCT d.id) AS invalidated_decision_ids
```

### Query 3: Act IV Revalidation Loop (`revalidateDecision`)
Closes the loop by safely retiring the invalidated decision and grounding the fresh decision:

```cypher
MATCH (newSource:Source {id: $newSourceId})<-[:EXTRACTED_FROM]-(newFact:Fact {id: $newFactId})
MATCH (oldDecision:Decision {id: $oldDecisionId})
CREATE (newDecision:Decision {
  id: $newDecisionId,
  title: $title,
  status: 'VALID',
  created_at: timestamp()
})
CREATE (newDecision)-[:DEPENDS_ON]->(newFact)
CREATE (newDecision)-[:REPLACES]->(oldDecision)
SET oldDecision.status = 'REPLACED_ARCHIVED'
RETURN newDecision.id AS active_decision_id, oldDecision.id AS archived_decision_id
```

---

## Empirical Benchmarks

### 1. Vector RAG vs. CAVDAX (10 Engineering Scenarios)
Evaluated via `node benchmark/evaluate.js`:

| Scenario ID | Category | Vector RAG Baseline | CAVDAX FalkorDB Gate | Latency |
|---|---|---|---|---|
| **SCEN-01** | Authentication Migration | ❌ Stale TokenAuth v1 written | 🛡️ **BLOCKED_SUPERSEDED_SOURCE** | `1.84ms` |
| **SCEN-02** | API Routing Breaking Change | ❌ Deprecated /v1 route built | 🛡️ **BLOCKED_SUPERSEDED_SOURCE** | `1.42ms` |
| **SCEN-03** | Crypto CVE Deprecation | ❌ Vulnerable crypto-js imported | 🛡️ **BLOCKED_STALE_FACT** | `1.95ms` |
| **SCEN-04** | CODEOWNERS Governance Shift | ❌ Stale reviewer assigned | 🛡️ **BLOCKED_SUPERSEDED_SOURCE** | `1.15ms` |
| **SCEN-05** | Docker Base Image Bump | ❌ Outdated node:18 base written | 🛡️ **BLOCKED_STALE_FACT** | `1.72ms` |
| **SCEN-06** | NoSQL to SQL Migration | ❌ Mongoose schema created | 🛡️ **BLOCKED_SUPERSEDED_SOURCE** | `2.31ms` |
| **SCEN-07** | Secret Vault Transition | ❌ Plaintext env var leaked | 🛡️ **BLOCKED_DECISION_INVALIDATED** | `1.68ms` |
| **SCEN-08** | Feature Flag Deprecation | ❌ Dead flag conditional reintroduced | 🛡️ **BLOCKED_SUPERSEDED_SOURCE** | `1.34ms` |
| **SCEN-09** | Rate-Limit Threshold Lowering | ❌ Flood test tripped alarms | 🛡️ **BLOCKED_STALE_FACT** | `1.55ms` |
| **SCEN-10** | OSS License Compliance | ❌ Incompatible license header added | 🛡️ **BLOCKED_SUPERSEDED_SOURCE** | `1.49ms` |

* **Vector RAG Failure Rate:** **100% (10/10 silent hallucinations)**
* **CAVDAX Gate Protection Rate:** **100% (10/10 deterministic blocks)**
* **Average Gate Latency:** **1.65ms**

### 2. Large-Scale Enterprise DAG Performance
Evaluated via `node benchmark/scale_generator.js`:

| Total Nodes | Total Edges | Graph Depth | Gate Query 1 Latency | Cascade Query 2 Latency | GraphBLAS Memory |
|---|---|---|---|---|---|
| **3,300** | 3,270 | 4 hops | **2.16 ms** | **3.32 ms** | 6.9 MB |
| **9,900** | 9,810 | 4 hops | **2.04 ms** | **3.42 ms** | 12.3 MB |
| **25,150** | 24,940 | 4 hops | **2.53 ms** | **3.47 ms** | 24.8 MB |
| **50,550** | 50,100 | 4 hops | **2.30 ms** | **3.81 ms** | 45.7 MB |

### 3. Section 37 Truth-in-Data Governance
* **Zero Hardcoded Benchmarks**: All scenario evaluations execute live algorithmic traversals and real vector similarity calculations without hardcoded string literals or synthetic failure states.
* **Nanosecond-Precision Timers**: Invalidation gate latencies are measured dynamically at runtime using high-resolution hardware timers (`process.hrtime.bigint()`). Synthetic fallback constants (e.g. `|| 0.42`) are strictly prohibited across both production code and benchmark suites.


---

## Live Demo: The 4-Act Storyline

The Web HUD features an interactive 4-Act stepper designed for video demonstration:

* **Act I: Baseline (ADR-001 Active):** `DEC-102` is valid and authorized to scaffold checkout using `TokenAuth v1`.
* **Act II: Commit Mutation (ADR-002 Ingested):** Security board commits `ADR-002` superseding `ADR-001`. Query 2 executes in 2.1ms, turning `ADR-001` red (`SUPERSEDED`), `F-Auth-v1` red (`STALE`), and `DEC-102` red (`INVALIDATED_NEEDS_REVALIDATION`).
* **Act III: Enclosed MCP Gate Rejection:** The coding agent attempts to write `TokenAuth.v1` into `demo-repo/src/services/payment.js`. The enclosed MCP tool executes Query 1, detects the broken causal link, and emits `[ ⛔ 403 MCP GATE BLOCKED: BLOCKED_SUPERSEDED_SOURCE ]`. The file remains 100% untouched on disk!
* **Act IV: Revalidation & Safe Execution:** The agent synthesizes `DEC-103` (OAuth2 JWT/RS256) grounded in `ADR-002`. The gate verifies the fresh causal path in 1.62ms and emits `[ ✅ 200 MCP GATE APPROVED ]`. The verified OAuth2 code is safely written to disk.

---

## Live Production Deployment

CAVDAX is deployed and running live in production:
👉 **[https://cavdax.sahnirmaan.live/](https://cavdax.sahnirmaan.live/)**

### Production Architecture & Cloud Infrastructure:
* **Edge Reverse Proxy & Automated SSL:** Caddy 2 reverse proxy with dynamic TLS/SSL certificates terminates production traffic over port 443 with HSTS and security headers.
* **Low-Latency Streaming:** Dedicated `/api/events` Server-Sent Events (SSE) pipeline with reverse-proxy buffering disabled (`proxy_buffering off`) for instant UI graph invalidation pulses.
* **Remote Model Context Protocol (MCP) Endpoint:** Accessible at `https://cavdax.sahnirmaan.live/api/mcp/sse` for remote coding agents, IDEs, and CI/CD pipelines.
* **GraphBLAS Backend Mesh:** Low-overhead Docker Compose mesh linking the Node.js Express gateway and FalkorDB GraphBLAS on an isolated internal network.

---

## Web HUD Multi-Route Topology (9 Operational Views)

The CAVDAX Web HUD provides a world-class, industrial-brutalist / porcelain operational interface spanning 9 specialized views:

1. **Architectural Overview (`/overview` or `/`)**: Value proposition, Causal Invalidation Radar, and interactive Cytoscape.js Directed Acyclic Graph canvas.
2. **Connected Repository Developer Workspace (`/console`)**: Multi-tenant workspace for linking GitHub repositories with context-preserving OAuth reconnection, tracking active branch mutations, and managing architecture baselines.
3. **MCP Action Playground (`/mcp`)**: Interactive pre-flight verification console with dynamic traversal depth sliders (`1..4` hops), live Cypher inspection, and sub-millisecond execution timing metrics.
4. **4-Act Storyline Stepper (`/walkthrough`)**: Interactive demonstration stepper guiding evaluators through baseline validity, upstream commit mutation, enclosed MCP gate rejection, and Act IV revalidation.
5. **Immutable Compliance Audit Ledger (`/audit`)**: Tamper-evident ledger providing full provenance and execution verification history across all agent actions.
6. **Core Maintainers & Attribution (`/team`)**: Project research attribution, engineering background, and architecture credits.
7. **Developer Profile & Responsive Dual-Display Engine (`/profile`)**: Live plan quota consumption monitoring, capability tiers, secure MCP key generation, and an adaptive dual-layout engine calibrated for both **HP Victus laptop single-screen viewports (1536×864, zero vertical scrolling)** and **27-inch desktop monitors (1440p/1080p, spacious layout)** with profile-exclusive transparent navbar.
8. **Community Stewardship & Operational Backing (`/support`)**: Transparent operational resource breakdown and community sponsorship integration.
9. **Zero-Trust Administrative Enclave**: Protected diagnostic console, developer IP whitelisting gate, and system status roster.

---

## Enterprise Security Hardening & Cloudflare Zero-Trust Standard

CAVDAX enforces a mandatory **7-Phase Cloudflare Security & Pen-Test Audit Standard (Rule 25)** across all runtime, API, and MCP layers:

* **Boundary & Parameter Sanitization**: All endpoint inputs (`decision_id <= 128`, `target_file <= 256`, `proposed_action <= 500`) are strictly clamped to eliminate ReDoS and memory amplification vectors.
* **Zero Split-Brain Session Desynchronization (Rule 0j)**: Enforces `credentials: 'include'` and instantaneous 401 unauthenticated session purges across all client endpoints to keep client cookies synchronized with server sessions across deployment restarts.
* **Context-Preserving GitHub OAuth Routing**: Preserves the user's active page and workflow context (`returnTo`) upon authenticating, automatically reopening repository connection dialogs without disorienting navigation jumps.
* **Dual-Layer Persistent Session Resilience**: Eliminates post-deployment logout churn through a file-backed `PersistentFileStore` (mounted via Docker volume `server-sessions`) paired with a tamper-proof HMAC-SHA256 signed HTTP-only auth cookie (`cavdax_auth`) with constant-time verification (`timingSafeEqual`) for instant zero-downtime session re-hydration across server restarts.

CAVDAX implements comprehensive defense-in-depth security across both API and runtime layers:

* **Strict Administrative Authorization (`requireDevAuth`)**: Critical administrative endpoints (`POST /api/system/dev-ips`, `/api/system/dev-roster`, `/api/system/hackathon-mode`) enforce cryptographically hashed developer credentials and remote IP whitelisting.
* **Path Traversal Defenses**: All file modification operations (`apply_code_change`, `/api/ingest`) validate target paths against project root boundaries to prevent arbitrary file access outside the sandbox.
* **Client IP Spoofing Mitigation**: The gateway inspects proxy socket addresses rather than untrusted `X-Forwarded-For` headers to prevent spoofed IP bypasses.
* **Production Security Headers**: All responses include strict HTTP security directives:
  * `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
  * `X-Frame-Options: DENY` (Clickjacking defense)
  * `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Enforced HTTPS)
* **Cryptographic Billing Plan Validation**: Razorpay order IDs are cryptographically linked to target subscription tiers in server memory (`pendingBillingOrders`), preventing client-side parameter tampering.

---

## Production SEO & Structured Metadata Suite

The client application includes an enterprise-grade SEO and search discovery infrastructure:

* **Schema.org JSON-LD Structured Data**: Embedded semantic graph declarations for `SoftwareApplication`, `Organization`, `WebSite`, and dynamic `BreadcrumbList` across all views.
* **Route-Aware Dynamic Metadata (`SEOHead.jsx`)**: Automatically synchronizes document title, description, canonical link, OpenGraph (`og:*`), and Twitter Card (`twitter:*`) tags upon client-side navigation.
* **Branded OpenGraph Preview Cards**: High-definition 1200×630px social cards (`og-image.jpg`, `og-image.png`, `og-image.svg`) featuring the official CAVDAX emblem and geometric Space Grotesk wordmark.
* **Search Engine Crawl Directives**: Validated `robots.txt` disallowing internal debug routes, paired with an XML index (`sitemap.xml`) featuring explicit priority and change frequency ratings.

---

## Quickstart Guide

### Option 1: Docker Compose (Recommended)
Launch the entire mesh (FalkorDB + Server + Web HUD) with one command:

```bash
docker-compose up --build
```

- **Porcelain Dark Web HUD:** `http://localhost:5173`
- **CAVDAX Backend Gateway & MCP:** `http://localhost:3001` (internal container port 3000)
- **FalkorDB Redis Endpoint:** `localhost:6379`

### Option 2: Local Development
```bash
# 1. Install dependencies
cd apps/server && npm install
cd ../client && npm install
cd ../..

# 2. Run benchmark tests
npm run benchmark
npm run benchmark:scale

# 3. Start server and client
npm run server
npm run client
```

---

## Model Context Protocol (MCP) Integration & Client Setup

CAVDAX implements the Anthropic Model Context Protocol (MCP) specification `2024-11-05` to enclose autonomous coding agents (Claude Code, Cursor IDE, Claude Desktop, Windsurf/Roo Code) behind a FalkorDB GraphBLAS causal barrier.

📖 **Comprehensive Technical Guide**: [docs/MCP_SPECIFICATION.md](docs/MCP_SPECIFICATION.md)

### Supported Transports & Connectors
- **Local Stdio (`stdio`):** `npx -y @cavdax/mcp-server` (zero-latency, runs the MCP gate locally against your own FalkorDB instance).
- **Remote Cloud SSE (`SSE`):** Connect to `https://cavdax.sahnirmaan.live/api/mcp/sse` (for centralized team graphs and remote CI/CD pipelines).

### Client Configuration Snippets

You can connect your coding agents via **Mode A: Local Stdio (Zero configuration, no API key required)** or **Mode B: Remote Cloud SSE (Centralized team graph & remote CI/CD)**.

> **API Key for Remote Cloud SSE**: If using Remote Cloud SSE, generate your API key in one click at [cavdax.sahnirmaan.live/mcp](https://cavdax.sahnirmaan.live/mcp).

---

#### Mode A: Local Stdio (`npx -y @cavdax/mcp-server`) — Recommended

##### 1. Cursor IDE (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "cavdax": {
      "command": "npx",
      "args": ["-y", "@cavdax/mcp-server"]
    }
  }
}
```

##### 2. Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "cavdax": {
      "command": "npx",
      "args": ["-y", "@cavdax/mcp-server"]
    }
  }
}
```

##### 3. Claude Code CLI
```bash
claude mcp add cavdax -- npx -y @cavdax/mcp-server
```

##### 4. Windsurf / Roo Code (`mcp_config.json`)
```json
{
  "mcpServers": {
    "cavdax": {
      "command": "npx",
      "args": ["-y", "@cavdax/mcp-server"]
    }
  }
}
```

---

#### Mode B: Remote Cloud SSE (`https://cavdax.sahnirmaan.live/api/mcp/sse`)

##### 1. Cursor IDE (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "cavdax": {
      "url": "https://cavdax.sahnirmaan.live/api/mcp/sse",
      "headers": {
        "Authorization": "Bearer YOUR_CAVDAX_API_KEY"
      }
    }
  }
}
```

##### 2. Claude Desktop (via `mcp-proxy`)
*Claude Desktop requires local stdio to bridge remote SSE streams:*
```json
{
  "mcpServers": {
    "cavdax": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-proxy",
        "https://cavdax.sahnirmaan.live/api/mcp/sse",
        "--headers",
        "Authorization=Bearer YOUR_CAVDAX_API_KEY"
      ]
    }
  }
}
```

##### 3. Claude Code CLI
```bash
claude mcp add cavdax https://cavdax.sahnirmaan.live/api/mcp/sse --header "Authorization: Bearer YOUR_CAVDAX_API_KEY"
```

### Registered Model Context Protocol (MCP) Tools
1. `check_intent_clearance`: **Proactive Architectural Pre-Flight Radar.** Allows AI coding agents (Claude Code, Devin, Cursor) to verify proposed actions against FalkorDB *prior to generating tokens or editing files*. Eliminates reactive token burn in < 2ms.
2. `apply_code_change`: **Enclosed Execution Gate.** Intercepts in-flight file write actions and validates decision provenance against the causal graph. Hard-blocks execution if grounding facts are stale (`BLOCKED_SUPERSEDED_SOURCE`).
3. `revalidate_decision`: **Dynamic Invalidation Recovery.** Synthesizes a new Decision replacing an invalidated or superseded one, automatically linking the new Decision to active Facts extracted from fresh ADRs.
4. `acquire_decision_lock`: **Distributed Concurrency Lock.** Prevents race conditions during multi-agent workflows (e.g. concurrent Devin or Claude Code sessions) by leasing atomic locks on specific decision branches.
5. `release_decision_lock`: **Lease Release.** Voluntarily releases leased locks upon completed task milestone execution.
6. `export_graph_image`: **Visual PR Artifact Generator.** Produces standalone SVG/PNG vector maps with Vision OCR tags for automated PR descriptions and multimodal model grounding.
7. `query_causal_graph` *(Local CLI/stdio)*: Sub-millisecond GraphBLAS BFS Cypher query for active ADRs, dependencies, and invalidation trails.

### Universal CLI Daemon (`@cavdax/mcp-server` v1.2.0)
```bash
# Start local Model Context Protocol stdio daemon
npx -y @cavdax/mcp-server

# Diagnose FalkorDB GraphBLAS connection and causal DAG health
npx cavdax doctor

# Ingest ADRs (supports standard YAML frontmatter and plain Markdown files)
npx cavdax ingest --repo .

# Validate staged files or PR diffs against active architecture decisions
npx cavdax check --staged
npx cavdax check --pr <number>
```

---

## Repository Structure

```
CAVDAX/
├── apps/
│   ├── client/                  # React 18 + Vite + Tailwind Porcelain Dark Web HUD
│   │   ├── public/sw.js         # Service Worker (Web Push & background divergence alerts)
│   │   ├── src/components/      # AuditPage, DevConsolePage, McpActionPlayground, PreferencesModal, etc.
│   │   ├── src/services/        # webPush.js (VAPID PushManager subscription manager)
│   │   └── Dockerfile           # Client containerization
│   ├── server/                  # Node.js + Express Backend Gateway
│   │   ├── index.js             # REST API, SSE broadcaster, MCP SSE transport, GitHub webhook ingestion
│   │   ├── email.js             # Resend API transactional divergence alert dispatcher & debouncer
│   │   ├── webPush.js           # VAPID key manager & Web Push background notification broker
│   │   ├── systemState.js       # Atomic persistent state & user notification preferences
│   │   ├── test/                # Unit & security test suite (57 automated tests)
│   │   └── Dockerfile           # Server containerization
│   └── mcp-server/              # Standalone NPM package (@cavdax/mcp-server — published)
│       ├── bin/cavdax.js        # Universal CLI: npx cavdax mcp|ingest|check|doctor
│       └── src/                 # stdioServer, ingestCommand, checkCommand, doctorCommand
├── assets/                      # Monochromatic Mermaid-style architecture flowcharts (.svg)
├── benchmark/                   # Evaluation harness & empirical scale tests
│   ├── evaluate.js              # 10-Scenario Vector RAG vs CAVDAX benchmark
│   ├── scale_generator.js       # 50,000-node GraphBLAS stress test
│   ├── results.json             # Benchmark metrics data
│   └── EVALUATION_REPORT.md     # Detailed evaluation markdown report
├── core/                        # Core Engine Modules
│   ├── graph/                   # FalkorDB client manager & optimized Cypher queries
│   ├── ingestion/               # parser.js (ADR YAML) + sources.js (commit/package/codeowners/issue)
│   └── mcp/                     # Enclosed MCP server & apply_code_change tool
├── demo-repo/                   # Target repository subject to agent mutations
│   ├── docs/adrs/               # ADR-001 (stale), ADR-002 (superseding), ADR-003 (multi-supersedes), TEMPLATE.md
│   ├── .github/CODEOWNERS       # Governance source generalization
│   └── src/services/            # payment.js target service
├── docs/                        # Complete technical specifications & guides
│   └── FUTURE_ROADMAP.md        # Tiered distribution plan & long-term source ingestion roadmap
├── .env.example                 # Environment variable reference (copy to .env — never commit .env)
├── action.yml                   # Reusable composite GitHub Action (CAVDAX causal invalidation gate)
├── .github/workflows/           # CI pipeline + cavdax-gate.yml (PR blocking workflow)
├── docker-compose.yml           # Multi-container orchestration (FalkorDB, server, client)
├── LICENSE                      # GNU General Public License v3.0
└── package.json                 # Monorepo root scripts
```

---

## Team & Attribution

Built with passion for the **WeMakeDevs &times; FalkorDB Graph Hacks Hackathon**:

* **Suneet Chugh** ([@suneetchugh-dev](https://github.com/suneetchugh-dev)) — Lead Architect & Systems Engineer: FalkorDB GraphBLAS Causal Core, Enclosed MCP Gate, Visual Operational Console (9 Views), Cloudflare Edge Mesh & Empirical Benchmarks.
* **Geetika Chugh** ([@GeetikaChughIBM](https://github.com/GeetikaChughIBM)) — Co-Creator & Systems Engineer: Official 10-Minute Demo Video Walkthrough, `@cavdax/mcp-server` NPM Distribution (Sigstore Provenance), GitHub Repo AST Scanner & Ingestion Engine, and Razorpay Sponsor Architecture.

---
*License: GNU GPL 3.0 &bull; Powered by FalkorDB GraphBLAS & Model Context Protocol (MCP)*
