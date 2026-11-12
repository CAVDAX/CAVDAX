/**
 * CAVDAX MCP Stdio Server (published package)
 *
 * JSON-RPC 2.0 / MCP `2024-11-05` adapter. Two coexisting modes:
 *
 *   LIVE        FalkorDB reachable. Uses the SAME engine as the hosted gateway
 *               (core/mcp/server.js + core/graph/queries.js): real gate query,
 *               file written only on approval, AgentAction audit node recorded.
 *   SIMULATION  FalkorDB unreachable. In-memory demo graph (see simulation.js);
 *               every response is labelled `simulated: true`.
 *
 *   CAVDAX_MODE=auto (default) | live | simulation
 *     auto        live if FalkorDB answers, otherwise simulation. While in
 *                 simulation each tool call retries the connection, so starting
 *                 Docker mid-session upgrades to live automatically.
 *     live        never simulate: if FalkorDB is down every call fails closed.
 *     simulation  never connect.
 *
 *   FALKORDB_HOST / FALKORDB_PORT / FALKORDB_PASSWORD / FALKORDB_GRAPH_NAME
 *   CAVDAX_REPO_ROOT   directory writes are confined to (default: cwd)
 *
 * stdout carries JSON-RPC only; all logging goes to stderr.
 */

import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { connectGraph, loadCore, falkorConfig, describeConnectError } from './runtime.js';
import { SimulationEngine } from './simulation.js';

const pkgJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const PACKAGE_VERSION = pkgJson.version || '1.3.3';
const log = (msg) => process.stderr.write(`[cavdax] ${msg}\n`);

// Needed so the holder of a decision lock is not blocked by its own lock.
const AGENT_ID_PROPERTY = {
  type: 'string',
  description: 'Optional. If you hold a lock from acquire_decision_lock, pass the same agent_id here so your own lock does not block you.'
};

export const TOOLS = [
  {
    name: 'apply_code_change',
    description:
      'Write code to disk behind the CAVDAX Causal Graph Gate. Hard-rejects with zero disk mutation if decision_id depends on an invalidated or stale architecture decision.',
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: {
          type: 'string',
          description: 'The ID of the Architecture Decision (e.g., DEC-102 or DEC-103) justifying this change.'
        },
        file_path: { type: 'string', description: 'Target file path (relative to the repo root) to modify or create.' },
        code_payload: { type: 'string', description: 'Full code content to write to the target file.' },
        reasoning: { type: 'string', description: 'Technical rationale for this code modification.' },
        agent_id: AGENT_ID_PROPERTY
      },
      required: ['decision_id', 'file_path', 'code_payload']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        gate_verdict: { type: 'string' },
        status: { type: 'string' },
        decision_id: { type: 'string' },
        file_path: { type: 'string' },
        reason: { type: 'string' }
      }
    }
  },
  {
    name: 'revalidate_decision',
    description:
      'Mutating supersession write (Act IV): replace an invalidated Decision with a new Decision grounded in a human-reviewed Source/ADR. Do NOT use for read-only checks (use check_intent_clearance) or creating brand-new ADRs from scratch (ADRs are authored via human-reviewed PRs).',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        new_source_id: { type: 'string', description: 'Fresh superseding source ID (e.g., ADR-002)' },
        old_decision_id: { type: 'string', description: 'Invalidated decision ID being superseded (e.g., DEC-102)' },
        new_decision_id: { type: 'string', description: 'New decision ID (e.g., DEC-103)' },
        new_fact_id: { type: 'string', description: 'Active fact ID extracted from the new source (e.g., F-OAuth2)' },
        title: { type: 'string', description: 'Directive title for new decision' }
      },
      required: ['new_source_id', 'old_decision_id', 'new_decision_id', 'new_fact_id', 'title']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        status: { type: 'string' },
        old_decision_id: { type: 'string' },
        new_decision_id: { type: 'string' },
        message: { type: 'string' }
      }
    }
  },
  {
    name: 'check_intent_clearance',
    description:
      'Fast, read-only pre-flight gate check for a specific decision_id and target_file before generating or editing code. Use this before apply_code_change.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: {
          type: 'string',
          description: 'The ID of the Architecture Decision (e.g. DEC-102 or DEC-103) you intend to implement.'
        },
        target_file: {
          type: 'string',
          description: 'Optional target file path you intend to touch.'
        },
        proposed_action: {
          type: 'string',
          description: 'Optional summary of the intended code change.'
        },
        agent_id: AGENT_ID_PROPERTY
      },
      required: ['decision_id']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        clearance: { type: 'string' },
        allowed: { type: 'boolean' },
        decision_id: { type: 'string' },
        reason: { type: 'string' }
      }
    }
  },
  {
    name: 'acquire_decision_lock',
    description: 'Multi-Agent Concurrency Control: Leases an exclusive write lock on an Architecture Decision branch for agent_id.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: { type: 'string', description: 'The ID of the decision to lock.' },
        agent_id: { type: 'string', description: 'Unique identifier of the requesting AI agent.' },
        ttl_ms: { type: 'number', description: 'Lock duration lease in milliseconds (default: 60000ms).' },
        reason: { type: 'string', description: 'Operational rationale for the exclusive lease.' }
      },
      required: ['decision_id', 'agent_id']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        locked: { type: 'boolean' },
        decision_id: { type: 'string' },
        agent_id: { type: 'string' },
        expires_at: { type: 'string' }
      }
    }
  },
  {
    name: 'release_decision_lock',
    description: 'Multi-Agent Concurrency Control: Releases an exclusive write lock previously acquired by agent_id.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: { type: 'string', description: 'The ID of the decision to release.' },
        agent_id: { type: 'string', description: 'Unique identifier of the agent releasing the lock.' }
      },
      required: ['decision_id', 'agent_id']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        released: { type: 'boolean' },
        decision_id: { type: 'string' },
        agent_id: { type: 'string' }
      }
    }
  },
  {
    name: 'query_causal_graph',
    description:
      'Open-ended read-only exploration of raw causal graph nodes and edges (ADR, Fact, Decision, Action). Do NOT use for pre-write gate clearance (use check_intent_clearance) or single-decision detail lookup (use get_decision_details).',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        node_id: {
          type: 'string',
          description: 'Optional node ID (e.g. ADR-001, DEC-102). When set, only that node and its direct edges are returned.'
        }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        nodes: { type: 'array', items: { type: 'object' } },
        edges: { type: 'array', items: { type: 'object' } }
      }
    }
  },
  {
    name: 'export_graph_image',
    description:
      'Generates a standalone SVG/Markdown visual diagram of the CAVDAX causal architecture graph for PR descriptions or documentation.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        node_id: {
          type: 'string',
          description: 'Optional target node ID (e.g. DEC-102 or ADR-001) to center or inspect.'
        },
        highlight_blast_radius: {
          type: 'boolean',
          description: 'When true and node_id is provided, highlights downstream invalidated dependencies in pulsing warning colors.'
        },
        format: {
          type: 'string',
          enum: ['svg', 'markdown'],
          description: 'Output format (default: "svg").'
        }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        format: { type: 'string' },
        svg: { type: 'string' },
        node_count: { type: 'number' },
        edge_count: { type: 'number' }
      }
    }
  },
  {
    name: 'list_active_decisions',
    description:
      'Returns a lightweight manifest (IDs, titles, statuses, governed paths) of all architectural decisions governing this repository. Use get_decision_details to inspect a single decision in full; new ADRs are authored via human-reviewed PRs.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        status_filter: {
          type: 'string',
          enum: ['ALL', 'APPROVED', 'VALID', 'INVALIDATED_NEEDS_REVALIDATION', 'STALE'],
          description: 'Filter decisions by status (default: "ALL").'
        }
      }
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        status: { type: 'string' },
        count: { type: 'number' },
        total_decisions: { type: 'number' },
        active_count: { type: 'number' },
        decisions: { type: 'array', items: { type: 'object' } }
      }
    }
  },
  {
    name: 'get_decision_details',
    description:
      'Read-only full inspection of a single architectural decision (decision_id), including its metadata, grounded facts/sources, upstream/downstream causal dependencies, and lock state.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        decision_id: {
          type: 'string',
          description: 'The ID of the Architecture Decision (e.g. DEC-102 or ADR-001) to inspect in full.'
        }
      },
      required: ['decision_id']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        status: { type: 'string' },
        found: { type: 'boolean' },
        decision: { type: 'object' }
      }
    }
  },
  {
    name: 'explain_blast_radius',
    description:
      'Read-only downstream reachability analysis: computes which decisions and governed files will be invalidated before modifying an upstream ADR, Decision, or Fact.',
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    inputSchema: {
      type: 'object',
      properties: {
        node_id: {
          type: 'string',
          description: 'Target node ID (e.g. DEC-101 or ADR-001) to trace downstream impact for.'
        }
      },
      required: ['node_id']
    },
    outputSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string' },
        status: { type: 'string' },
        node_found: { type: 'boolean' },
        node_id: { type: 'string' },
        severity: { type: 'string' },
        downstream_invalidated_decisions: { type: 'array', items: { type: 'object' } },
        governed_files_at_risk: { type: 'array', items: { type: 'string' } }
      }
    }
  }
];

const REQUIRED_ARGS = {
  apply_code_change: ['decision_id', 'file_path', 'code_payload'],
  revalidate_decision: ['new_source_id', 'old_decision_id', 'new_decision_id', 'new_fact_id', 'title'],
  check_intent_clearance: ['decision_id'],
  acquire_decision_lock: ['decision_id', 'agent_id'],
  release_decision_lock: ['decision_id', 'agent_id'],
  query_causal_graph: [],
  export_graph_image: [],
  list_active_decisions: [],
  get_decision_details: ['decision_id'],
  explain_blast_radius: ['node_id'],
  // Unadvertised backward-compatible dispatch alias for legacy callers
  explain_architectural_impact: ['node_id']
};

const toolResult = (payload, isError = false) => ({
  ...(isError ? { isError: true } : {}),
  content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }]
});

export class CavdaxStdioGateway {
  constructor({ repoRoot = process.env.CAVDAX_REPO_ROOT || process.cwd(), mode = process.env.CAVDAX_MODE || ((process.env.CI || process.env.NODE_ENV === 'production') ? 'live' : 'auto') } = {}) {
    if (!['auto', 'live', 'simulation'].includes(mode)) {
      throw new Error(`Invalid CAVDAX_MODE '${mode}'. Use auto, live or simulation.`);
    }
    this.repoRoot = path.resolve(repoRoot);
    this.configuredMode = mode;
    this.live = null; // { connection, server, fetchGraphState }
    this.sim = null;
    this.lastError = null;
    this.announced = null;
  }

  announce(mode) {
    if (this.announced === mode) return;
    this.announced = mode;
    if (mode === 'live') log(`LIVE mode: graph '${this.live.connection.graphName}' @ ${this.live.connection.host}:${this.live.connection.port}, writes confined to ${this.repoRoot}`);
    else log(`SIMULATION mode (${this.lastError || 'forced by CAVDAX_MODE'}). Verdicts come from an in-memory demo graph.`);
  }

  async connectLive() {
    const cfg = falkorConfig();
    try {
      const [{ CavdaxMcpServer }, queries] = await Promise.all([loadCore('mcp/server.js'), loadCore('graph/queries.js')]);
      const connection = await connectGraph();
      this.live = {
        connection,
        server: new CavdaxMcpServer(connection.graph, { repoRoot: this.repoRoot, tagDemo: false }),
        fetchGraphState: queries.fetchGraphState
      };
      this.lastError = null;
      return true;
    } catch (err) {
      this.live = null;
      this.lastError = describeConnectError(err, cfg);
      return false;
    }
  }

  /** Returns 'live' | 'simulation' | 'unavailable'. */
  async resolveMode() {
    if (this.configuredMode === 'simulation') return 'simulation';
    if (this.live) return 'live';
    if (await this.connectLive()) return 'live';
    return this.configuredMode === 'live' ? 'unavailable' : 'simulation';
  }

  getSim() {
    this.sim ||= new SimulationEngine({ repoRoot: this.repoRoot });
    return this.sim;
  }

  async callTool(name, args = {}) {
    if (!(name in REQUIRED_ARGS)) throw new Error(`Tool not found: ${name}`);

    const missing = REQUIRED_ARGS[name].filter((k) => typeof args[k] !== 'string' || args[k] === '');
    if (missing.length) return toolResult(`Missing required argument(s) for ${name}: ${missing.join(', ')}`, true);

    const mode = await this.resolveMode();

    if (mode === 'unavailable') {
      return toolResult(
        `CAVDAX gate unavailable: ${this.lastError}. CAVDAX_MODE=live forbids simulation, so no action was taken (fail-closed). ` +
          'Start FalkorDB (docker run -d -p 6379:6379 falkordb/falkordb:latest) and run "npx cavdax doctor".',
        true
      );
    }

    if (mode === 'simulation') {
      this.announce('simulation');
      const sim = this.getSim();
      let result;
      if (name === 'apply_code_change') result = sim.applyCodeChange(args);
      else if (name === 'revalidate_decision') result = sim.revalidateDecision(args);
      else if (name === 'check_intent_clearance') result = sim.checkIntentClearance(args);
      else if (name === 'acquire_decision_lock') result = sim.acquireLock(args);
      else if (name === 'release_decision_lock') result = sim.releaseLock(args);
      else if (name === 'list_active_decisions') result = sim.listActiveDecisions(args);
      else if (name === 'get_decision_details') result = sim.getDecisionDetails(args);
      else if (name === 'explain_blast_radius' || name === 'explain_architectural_impact') result = sim.explainBlastRadius(args);
      else if (name === 'export_graph_image') {
        const [{ renderGraphToSvg, computeBlastRadius }] = await Promise.all([loadCore('graph/renderSvg.js')]);
        const { blastNodeIds, summary } = (args.node_id && args.highlight_blast_radius)
          ? computeBlastRadius(sim.nodes, sim.edges, args.node_id)
          : { blastNodeIds: new Set(), summary: { facts: 0, decisions: 0, actions: 0, files: [] } };
        const svg = renderGraphToSvg({ nodes: sim.nodes, edges: sim.edges }, {
          nodeId: args.node_id,
          highlightBlastRadius: Boolean(args.highlight_blast_radius)
        });
        result = { format: args.format || 'svg', svg, node_count: sim.nodes.length, edge_count: sim.edges.length, blast_radius: summary };
      } else {
        result = sim.queryGraph(args);
      }
      return toolResult({ mode: 'simulation', ...result }, result.isError === true);
    }

    this.announce('live');
    try {
      if (name === 'query_causal_graph') {
        const state = await this.live.fetchGraphState(this.live.connection.graph);
        if (args.node_id) {
          const nodes = state.nodes.filter((n) => n.id === args.node_id);
          if (nodes.length === 0) return toolResult(`Node '${args.node_id}' not found in graph '${this.live.connection.graphName}'.`, true);
          const edges = state.edges.filter((e) => e.source === args.node_id || e.target === args.node_id);
          return toolResult({ mode: 'live', nodes, edges });
        }
        return toolResult({ mode: 'live', ...state });
      }
      const result = await this.live.server.handleToolCall(name, args);
      return toolResult({ mode: 'live', ...result }, result.isError === true);
    } catch (err) {
      // Dropped connection: forget it so the next call re-resolves the mode.
      this.live = null;
      this.announced = null;
      this.lastError = err.message;
      return toolResult(`CAVDAX gate error: ${err.message}`, true);
    }
  }

  async handle(request) {
    const { id, method, params } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'cavdax-causal-mcp-gate', version: PACKAGE_VERSION }
          }
        };
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
      case 'tools/call':
        return { jsonrpc: '2.0', id, result: await this.callTool(params?.name, params?.arguments) };
      default:
        if (id === undefined || id === null || method?.startsWith('notifications/')) return null;
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not supported: ${method}` } };
    }
  }
}

export async function startStdioServer() {
  // The engine logs with console.*; stdout must stay pure JSON-RPC.
  console.log = console.info = console.warn = (...a) => process.stderr.write(a.join(' ') + '\n');

  const gateway = new CavdaxStdioGateway();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  let inFlight = 0;
  let closed = false;
  const maybeExit = () => {
    if (closed && inFlight === 0) process.exit(0);
  };

  rl.on('line', async (line) => {
    if (!line.trim()) return;
    inFlight++;
    let request;
    try {
      request = JSON.parse(line);
    } catch {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n');
      inFlight--;
      return;
    }
    try {
      const response = await gateway.handle(request);
      if (response) process.stdout.write(JSON.stringify(response) + '\n');
    } catch (err) {
      if (request.id !== undefined && request.id !== null) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: err.message } }) + '\n');
      }
    } finally {
      inFlight--;
      maybeExit();
    }
  });
  rl.on('close', () => {
    closed = true;
    maybeExit();
  });
}
