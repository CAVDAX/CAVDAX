# @cavdax/mcp-server

> **CAVDAX** — Contextual Action & Verified Decision Autonomous eXecution  
> Enclosed MCP Server backed by FalkorDB GraphBLAS

Blocks AI coding agents from writing code grounded in stale or superseded Architecture Decisions. Implements the [Model Context Protocol](https://spec.modelcontextprotocol.io) `2024-11-05` over stdio for zero-config integration with Cursor, Claude Code, and Claude Desktop.

---

## Quick Start

### Cursor (project-level `.cursor/mcp.json`)

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

### Claude Code CLI

```bash
claude mcp add cavdax npx -y @cavdax/mcp-server
```

### Claude Desktop (`claude_desktop_config.json`)

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

### Hosted Enterprise SSE (Cursor / any SSE-capable client)

```json
{
  "mcpServers": {
    "cavdax-cloud": {
      "url": "https://cavdax.sahnirmaan.live/api/mcp/sse",
      "transport": "sse"
    }
  }
}
```

---

## CLI Commands

```bash
npx @cavdax/mcp-server              # Start MCP stdio server (default)
npx cavdax mcp                      # Start MCP stdio server (explicit)
npx cavdax ingest --repo .          # Ingest ADRs from current repo into FalkorDB
npx cavdax check --staged           # Validate staged files (git pre-commit hook)
npx cavdax check --staged --strict  # ...and fail if FalkorDB is unreachable (CI)
npx cavdax check --pr 42            # Validate PR #42 changed files (CI)
npx cavdax gate --repo org/repo --sha <commit_sha> [--strict] # Verify PR commit against invariants in CI/CD
npx cavdax doctor                   # Diagnose FalkorDB & MCP readiness
```

---

## MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `apply_code_change` | Writes a file (confined to the repo root) only if the referenced `decision_id` is causally valid. Hard-rejects stale, invalidated and unknown decisions. |
| `revalidate_decision` | Archives an invalidated decision and creates a new one grounded in a superseding ADR. |
| `check_intent_clearance` | Pre-flight check. Call before writing code to find out whether a `decision_id` is still valid, without generating anything. Takes `decision_id` (required), `target_file` and `proposed_action`. |
| `acquire_decision_lock` | Leases an exclusive lock on a decision so two agents cannot change it at once. Takes `decision_id`, `agent_id`, optional `ttl_ms` and `reason`. |
| `release_decision_lock` | Releases a lock held by the calling agent. |
| `query_causal_graph` | Inspects the causal graph (optionally one `node_id`) to check node statuses and dependency paths. |
| `export_graph_image` | Generates a standalone SVG or PNG vector snapshot of the active causal graph for PR artifacts and visual debugging. |

> **About decision locks.** Locks are leased (5 seconds to 5 minutes) and held in the memory of one MCP server process. They stop two agents that share that server from changing the same decision at once. Each IDE or agent that starts its own `npx` stdio process gets its own lock table, so those processes do not see each other's locks. For multi-agent safety across separate clients, point them at one shared server, such as the hosted SSE endpoint.

---

## FalkorDB Setup (Local)

```bash
docker run -d --name falkordb -p 6379:6379 falkordb/falkordb:latest
npx cavdax doctor
npx cavdax ingest --repo .     # ADRs may declare decision_id / decision_title in frontmatter; plain Markdown ADRs (no frontmatter) are also parsed
```

## Modes

| Mode | When | Behaviour |
|------|------|-----------|
| **live** | FalkorDB reachable | Real causal gate query, file written only on approval, audit node recorded. Responses carry `"mode": "live"`. |
| **simulation** | FalkorDB unreachable | In-memory demo graph where `DEC-102` is stale. Approved writes still land on disk. Unknown decision IDs are rejected. Every response carries `"simulated": true`. |

`CAVDAX_MODE=auto` (default) picks live when possible and retries on each call. `CAVDAX_MODE=live` never simulates and fails closed. `CAVDAX_MODE=simulation` never connects.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FALKORDB_HOST` | `localhost` | FalkorDB server host |
| `FALKORDB_PORT` | `6379` | FalkorDB server port |
| `FALKORDB_PASSWORD` | _(none)_ | FalkorDB password |
| `FALKORDB_GRAPH_NAME` | `cavdax_core_graph` | Graph to use |
| `CAVDAX_MODE` | `auto` | `auto`, `live` or `simulation` |
| `CAVDAX_REPO_ROOT` | current directory | Directory file writes are confined to |
| `CAVDAX_SERVER_URL` | _(none)_ | Remote CAVDAX server URL for CI/CD gate fallback |
| `CAVDAX_API_KEY` | _(none)_ | Bearer API token for authenticated remote decision checks |

---

## License

GPL-3.0 — © CAVDAX Team
