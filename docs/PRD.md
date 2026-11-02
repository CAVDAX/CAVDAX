# Product Requirements Document (PRD) — CAVDAX

**Project**: CAVDAX (**C**ontextual **A**ction & **V**erified **D**ecision **A**utonomous e**X**ecution)  
**Track**: WeMakeDevs × FalkorDB *Graph Hacks: Context for AI Agents* (Track 01 & Track 02)  
**Target Submissions**: Model Context Protocol (MCP) Causal Execution Gate & FalkorDB GraphBLAS Matrix Invalidation  
**Version**: 1.0.0-PRODUCTION  

---

## 1. Executive Summary & Mission Statement

### 1.1 The Core Thesis & Societal/Developer Impact
Autonomous coding agents (e.g. Claude Code, Cursor, Codex, OpenCode) represent a monumental leap in developer leverage. However, when deployed into enterprise repositories, they suffer from a fatal structural vulnerability: **Silent Cache Rot**.

Modern agent architectures rely on **Vector RAG** (cosine similarity on embedding vectors). When an upstream Architectural Decision Record (ADR) or Git commit mutates foundational policy—such as deprecating `TokenAuth v1` in favor of `OAuth2 RS256`—the vector embedding of the old ADR remains semantically identical to the problem space. Vector search continues to retrieve the obsolete pattern with high confidence (>0.89 cosine similarity). The agent innocently generates code implementing decommissioned, insecure protocols, creating regression outages, silent security breaches, and catastrophic codebase rot.

### 1.2 The CAVDAX Solution
**CAVDAX** eliminates Silent Cache Rot by giving autonomous coding agents a **Causal Conscience**. Instead of fuzzy vector lookups, CAVDAX represents architectural policy as an explicit, temporal **Directed Acyclic Graph (DAG)** stored in **FalkorDB** and computed via **GraphBLAS sparse matrix linear algebra**.

By coupling this causal knowledge graph with an **Enclosed Model Context Protocol (MCP) Execution Gate**, CAVDAX intercepts every agent action (`apply_code_change`). Before a single byte is written to disk, the gate runs a multi-hop Cypher traversal (`DECISION → DEPENDS_ON → FACT → EXTRACTED_FROM → SOURCE`). If any upstream node has been marked `SUPERSEDED` by a fresh commit, the gate executes an atomic **Hard Block (HTTP 403)**, neutralizing the hallucinated write in under 2 milliseconds and forcing the agent into an **Act IV Revalidation Loop**.

```
  Traditional Vector RAG:
  [Upstream ADR Deprecated] ──► [Vector Search] ──► High Similarity (0.91) ──► ❌ Insecure Code Written to Disk

  CAVDAX Causal Architecture:
  [Upstream Git Commit] ──► [FalkorDB GraphBLAS] ──► Causal Invalidation Wave (1.8ms)
                                     │
  [Autonomous Coding Agent] ──► [Enclosed MCP Gate] ──► ⛔ HARD REJECT: Stale Provenance (Zero Bytes Written)
                                     │
                                     ▼
                            [Act IV Revalidation] ──► Grounded in Fresh ADR-002 ──► ✅ Safe Disk Commit
```

---

## 2. Target User Personas & User Journey Maps

### 2.1 Persona Matrix

| Persona | Role | Primary Goal | Critical Pain Point Solved |
| :--- | :--- | :--- | :--- |
| **Persona A: Autonomous Coding Agent** | Autonomous LLM Worker (Claude / Cursor) | Synthesize code changes, scaffold microservices, and refactor routes. | Blindly executing migrations against stale documentation and causing production outages. |
| **Persona B: Staff Systems Architect** | Repository Owner / Lead Engineer | Establish ADRs and enforce security policies across thousands of commits. | Lack of automated verification that AI agents actually honor new architectural decisions. |
| **Persona C: Security & Compliance Auditor** | Enterprise Security Lead | Guarantee provenance chain and cryptographic verification for all AI-generated code. | Undetected regression loops, credential exfiltration, and unverified third-party library injection. |

### 2.2 End-to-End User Journey (The 4-Act Orchestration)

1. **Act I: Baseline Coexistence**
   - Repository contains baseline policy `ADR-001` (Accepting TokenAuth v1 for Payment Gateway).
   - Knowledge graph links `ADR-001` $\rightarrow$ Fact `F-Auth-v1` $\rightarrow$ Decision `DEC-102` (Status: `VALID`).
   - Coding agent safely drafts checkout routes with TokenAuth v1.

2. **Act II: Ingestion of Superseding Commit**
   - Developer merges commit containing `ADR-002`: *"Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned"*.
   - CAVDAX Git ingestion parser extracts `ADR-002` and creates `SUPERSEDES` edge to `ADR-001`.
   - FalkorDB GraphBLAS runs sparse matrix invalidation wave: `ADR-001` becomes `SUPERSEDED`, `F-Auth-v1` becomes `STALE`, and `DEC-102` cascades to `INVALIDATED_NEEDS_REVALIDATION` in **2.14ms**.

3. **Act III: Enclosed MCP Gate Interception**
   - Autonomous agent, unaware of the recent commit, invokes tool `apply_code_change` with `DEC-102`.
   - The Enclosed MCP Gate intercepts the call before file write.
   - Cypher traversal checks provenance: detects `DEC-102` relies on `STALE` fact from `SUPERSEDED` source.
   - MCP Gate returns **`BLOCKED_SUPERSEDED_SOURCE` (HTTP 403)** in **1.84ms**. Zero files written to disk.

4. **Act IV: Revalidation & Grounded Execution**
   - Agent receives deterministic causal error trace.
   - Agent queries FalkorDB for active replacement source $\rightarrow$ retrieves `ADR-002`.
   - Agent synthesizes verified Decision `DEC-103` (OAuth2 Bearer RS256).
   - Agent re-submits `apply_code_change` with `DEC-103`.
   - MCP Gate verifies unblemished causal chain $\rightarrow$ returns **`APPROVED` (HTTP 200)** in **1.62ms**.
   - Verified OAuth2 code written cleanly to disk.

---

## 3. Core Functional Capabilities (Requirements Matrix)

### 3.1 Module 1: Ingestion & Causal Graph Synthesis Engine
- **FR-1.1 Git Commit Webhook / Stream Ingestion**: Parse commit diffs and ADR markdown headers for YAML frontmatter (`supersedes: ADR-xxx`, `status: accepted`).
- **FR-1.2 Entity Extraction**: Automatically generate typed nodes:
  - `:Source { id, title, status, timestamp, hash }`
  - `:Fact { id, claim, is_stale, verified }`
  - `:Decision { id, title, status, rationale }`
- **FR-1.3 Relational Topology**: Establish typed directed edges:
  - `(:Fact)-[:EXTRACTED_FROM]->(:Source)`
  - `(:Decision)-[:DEPENDS_ON]->(:Fact)`
  - `(:Source)-[:SUPERSEDES]->(:Source)`

### 3.2 Module 2: FalkorDB GraphBLAS Invalidation Engine
- **FR-2.1 Cascading Matrix Invalidation**: Upon addition of a `SUPERSEDES` edge, execute GraphBLAS matrix multiplication to propagate staleness down all outgoing dependency paths:
  $$\text{StaleFacts} = A^T \cdot \text{SupersededSources}$$
  $$\text{InvalidDecisions} = B^T \cdot \text{StaleFacts}$$
- **FR-2.2 Real-Time Latency SLA**: Invalidation cascade across 10,000 nodes must complete in $< 5\text{ms}$ on commodity hardware.

### 3.3 Module 3: Enclosed Model Context Protocol (MCP) Execution Gate
- **FR-3.1 Tool Interception**: Expose standardized MCP tools (`apply_code_change`, `check_intent_clearance`, `revalidate_decision`, `acquire_decision_lock`, `release_decision_lock`, `export_graph_image`).
- **FR-3.2 Pre-Execution Provenance Verification**: Every tool invocation targeting file mutations must supply a `decision_id`.
- **FR-3.3 Atomic Sandboxing**: If verification fails, abort write operation immediately; log diagnostic causal path; return structured failure payload to LLM context.

### 3.4 Module 4: Real-Time Cybernetic Diagnostics HUD
- **FR-4.1 Live Graph Visualization**: Force-directed interactive canvas rendering live nodes and edges with real-time status color coding (Cyan = Active, Amber = Stale/Superseded, Ruby = Invalidated, Emerald = Verified).
- **FR-4.2 Real-Time Cognitive State HUD**: Render agent state (`IDLE`, `REASONING`, `EXECUTING`, `VERIFIED`, `REJECTED`) via `CavdaxAgentStateIndicator`.
- **FR-4.3 Server-Sent Events (SSE)**: Stream graph mutations and gate verdicts over `/api/events` with zero polling lag.

---

## 4. Explicit Non-Goals & Scope Boundaries

To prevent overengineering and scope creep, CAVDAX establishes clear non-goals:
1. **NOT a General-Purpose Text Search Engine**: CAVDAX does not replace full-text codebase search. It governs architectural causal integrity.
2. **NOT a Blind File Watcher**: CAVDAX requires explicit decision attribution; it does not passively guess intent from raw file edits.
3. **NOT an LLM Training Pipeline**: CAVDAX operates entirely at inference/runtime without fine-tuning weights.
4. **NO Cloud Escrow Custody**: CAVDAX does not manage financial transactions or live currency disbursement.

---

## 5. Technical Constraints & Performance Budgets

- **Query Latency Budget**: FalkorDB Cypher verification queries must execute in $\le 3.0\text{ms}$ (p95) and $\le 5.0\text{ms}$ (p99).
- **Client Bundle Budget**: Production JS bundle $\le 250\text{kB}$ gzipped; zero third-party canvas UI bloat.
- **Offline / Simulation Fallback**: If FalkorDB Docker container is temporarily disconnected, client gracefully degrades to in-memory GraphBLAS simulation without throwing uncaught exceptions.
- **Zero Secret Leakage**: Zero API keys or tokens embedded in client distributions.

---

## 6. Success Metrics & Verification Criteria

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Stale Provenance Interception Rate** | **100.0%** | Automated suite asserting 0 stale decision writes bypass MCP Gate. |
| **Gate Verification Latency** | **$< 2.5\text{ms}$** | High-resolution performance timer on `/api/mcp/call`. |
| **Graph Invalidation Time** | **$< 3.0\text{ms}$** | FalkorDB benchmark query execution log. |
| **Act IV Revalidation Recovery** | **100.0%** | Agent successfully synthesizes DEC-103 and passes gate on retry. |
