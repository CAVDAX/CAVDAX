# CAVDAX Benchmark & Evaluation Report
*Empirical evaluation of Graph-Grounded Decision Execution vs. Vector RAG Baselines across 10 engineering scenarios.*

## 📊 Executive Summary
| Metric | Lexical Retrieval Baseline (Un-grounded) | CAVDAX Causal DAG Gate |
|---|---|---|
| **Stale Code Execution Prevention** | 10% (1/10 Pass) | **100% (10/10 Blocked)** |
| **Causal Superseding Awareness** | ❌ Blind to temporal ordering | ✅ **Direct DAG traversal** |
| **Execution Gate Enforcement** | ❌ Advisory / None | ✅ **Enclosed MCP tool** |
| **Decision Latency Benchmark** | ~350-450ms (typical remote vector API RTT) | **0.036ms (In-Memory DAG Traversal)** |

## 🧪 Detailed Scenario Scorecard
| ID | Category | Scenario Title | Vector RAG Vulnerability | CAVDAX Deterministic Defense | Latency |
|---|---|---|---|---|---|
| **SCEN-01** | Authentication | TokenAuth v1 Deprecation & OAuth2 Migration | Vector search ranked stale doc higher (0.429 vs 0.143); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.252ms` |
| **SCEN-02** | API Routing | Checkout API Route Breaking Version Bump (v1 -> v2) | Vector search ranked stale doc higher (0.667 vs 0.429); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.012ms` |
| **SCEN-03** | Security Vulnerability | Vulnerable Crypto Library Deprecation | Vector search ranked stale doc higher (0.667 vs 0.250); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.027ms` |
| **SCEN-04** | Governance & Ownership | CODEOWNERS Service Routing Shift (@alice -> @bob) | Vector search retrieved superseding document. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.010ms` |
| **SCEN-05** | DevOps & Containers | Docker Base Image Security Upgrade (node:18 -> node:20-alpine) | Vector search ranked stale doc higher (0.500 vs 0.100); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.012ms` |
| **SCEN-06** | Database Architecture | NoSQL to Relational Migration (MongoDB -> PostgreSQL) | Vector search ranked stale doc higher (0.700 vs 0.083); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.011ms` |
| **SCEN-07** | Secret Management | Plaintext Env Var to HashiCorp Vault Transition | Vector search ranked stale doc higher (0.455 vs 0.000); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.010ms` |
| **SCEN-08** | Feature Flags | Feature Flag Cleanup (FF_NEW_CHECKOUT Permanent Rollout) | Vector search ranked stale doc higher (0.556 vs 0.111); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.010ms` |
| **SCEN-09** | Infrastructure Limits | API Gateway Rate-Limit Throttling Reduction | Vector search ranked stale doc higher (0.462 vs 0.364); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.010ms` |
| **SCEN-10** | Open Source Compliance | License Incompatibility Shift (MIT -> Apache-2.0 with Patent Clause) | Vector search ranked stale doc higher (0.300 vs 0.000); Agent executes deprecated architecture. | `BLOCKED_DECISION_INVALIDATED` (Decision is marked invalidated) | `0.010ms` |

---
*Generated dynamically by CAVDAX Evaluation Harness on 12/11/2026.*
