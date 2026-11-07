/**
 * CAVDAX Enclosed MCP (Model Context Protocol) Server
 * Encloses the apply_code_change tool with an internal FalkorDB Cypher verification check.
 * An autonomous agent cannot skip the gate because it is the only execution path to write code.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyActionGate, revalidateDecision, fetchGraphState } from '../graph/queries.js';
import { renderGraphToSvg, computeBlastRadius } from '../graph/renderSvg.js';
import { globalLockManager } from './lockManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

/**
 * Resolves symlinks for a path that may not exist yet by resolving its deepest
 * existing ancestor and re-appending the missing tail. Returns null when a symlink
 * on the path cannot be resolved (e.g. dangling), so callers can fail closed.
 */
function realpathOfDeepestAncestor(target) {
  let current = target;
  const tail = [];
  for (;;) {
    try {
      fs.lstatSync(current);
      break;
    } catch (err) {
      if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') return null;
      const parent = path.dirname(current);
      if (parent === current) return null;
      tail.unshift(path.basename(current));
      current = parent;
    }
  }
  try {
    return path.join(fs.realpathSync(current), ...tail);
  } catch {
    return null;
  }
}

/**
 * Paths an agent must never write through the gate, even with an approved decision:
 * git internals, environment/secret files and CI workflow definitions.
 */
export function isProtectedWritePath(relativePath) {
  const segments = String(relativePath).split(/[\\/]+/).filter(Boolean).map((s) => s.toLowerCase());
  if (segments.includes('.git')) return true;
  if (segments.some((s) => s === '.env' || s.startsWith('.env.'))) return true;
  if (segments[0] === '.github') return true;
  return false;
}

function toRepoRelative(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

export class CavdaxMcpServer {
  /**
   * @param {object} graph FalkorDB graph
   * @param {object} [options]
   * @param {string} [options.repoRoot] Directory writes are confined to.
   *   Defaults to demo-repo/ if present to sandbox hosted demo execution;
   *   the npm stdio server passes the user's explicit working directory.
   * @param {boolean} [options.tagDemo] Tag the canonical demo decisions (DEC-10x) as demo data
   *   for the hosted plan quota. The npm stdio server passes false.
   */
  constructor(graph, { repoRoot, tagDemo = true } = {}) {
    this.graph = graph;
    const demoDir = path.resolve(REPO_ROOT, 'demo-repo');
    const defaultRepoRoot = fs.existsSync(demoDir) ? demoDir : REPO_ROOT;
    this.repoRoot = repoRoot ? path.resolve(repoRoot) : defaultRepoRoot;
    this.tagDemo = tagDemo;
  }

  /**
   * Returns tool schemas exposed to AI coding agents (Claude Code / Cursor)
   */
  getTools() {
    return [
      {
        name: 'apply_code_change',
        description: 'Applies a verified code modification to a target file. Protected by the CAVDAX FalkorDB Gate. The decision_id must have a fresh, un-superseded provenance path.',
        parameters: {
          type: 'object',
          properties: {
            decision_id: {
              type: 'string',
              description: 'The ID of the Architecture Decision (e.g. DEC-102 or DEC-103) justifying this change.'
            },
            file_path: {
              type: 'string',
              description: 'The relative or absolute path of the target file to create or modify.'
            },
            code_payload: {
              type: 'string',
              description: 'The full code content or patch to write.'
            },
            reasoning: {
              type: 'string',
              description: 'Brief explanation of why this code change is being made.'
            },
            agent_id: {
              type: 'string',
              description: 'Unique identifier of the calling agent (e.g., devin-run-41). Required to write while you hold a decision lock; without it your own lock is treated as foreign.'
            }
          },
          required: ['decision_id', 'file_path', 'code_payload']
        }
      },
      {
        name: 'check_intent_clearance',
        description: 'Pre-flight architectural clearance. Call BEFORE generating or applying code to verify if your proposed decision is grounded in active, un-superseded architecture records.',
        parameters: {
          type: 'object',
          properties: {
            decision_id: { type: 'string', description: 'The ID of the Architecture Decision (e.g., DEC-102 or DEC-103) you intend to implement.' },
            target_file: { type: 'string', description: 'Optional target file path you intend to modify.' },
            proposed_action: { type: 'string', description: 'Optional summary of the intended implementation or change.' },
            agent_id: { type: 'string', description: 'Unique identifier of the calling agent (e.g., devin-run-41). Pass the same id you used in acquire_decision_lock.' }
          },
          required: ['decision_id']
        }
      },
      {
        name: 'revalidate_decision',
        description: 'Act IV Revalidation: Synthesizes a new Decision replacing an invalidated one, grounded in a fresh superseding source.',
        parameters: {
          type: 'object',
          properties: {
            new_source_id: { type: 'string', description: 'ID of the fresh superseding source (e.g. ADR-002)' },
            old_decision_id: { type: 'string', description: 'ID of the invalidated decision being replaced (e.g. DEC-102)' },
            new_decision_id: { type: 'string', description: 'ID for the new decision (e.g. DEC-103)' },
            new_fact_id: { type: 'string', description: 'ID of the active fact supporting this decision (e.g. F-OAuth2)' },
            title: { type: 'string', description: 'Directive title for the new decision' }
          },
          required: ['new_source_id', 'old_decision_id', 'new_decision_id', 'new_fact_id', 'title']
        }
      },
      {
        name: 'acquire_decision_lock',
        description: 'Multi-Agent Concurrency Control: Acquires an exclusive mutation lock on an Architecture Decision branch, preventing other autonomous agents from stomping on concurrent edits.',
        parameters: {
          type: 'object',
          properties: {
            decision_id: { type: 'string', description: 'The ID of the decision to lock (e.g., DEC-102 or DEC-103).' },
            agent_id: { type: 'string', description: 'Unique identifier of the calling agent (e.g., devin-run-41).' },
            ttl_ms: { type: 'number', description: 'Lock duration lease in milliseconds (default: 60000ms).' },
            reason: { type: 'string', description: 'Operational rationale for the exclusive lease.' }
          },
          required: ['decision_id', 'agent_id']
        }
      },
      {
        name: 'release_decision_lock',
        description: 'Multi-Agent Concurrency Control: Releases a held decision lock, making it available for other autonomous agents.',
        parameters: {
          type: 'object',
          properties: {
            decision_id: { type: 'string', description: 'The ID of the decision being released.' },
            agent_id: { type: 'string', description: 'Unique identifier of the agent releasing the lock.' }
          },
          required: ['decision_id', 'agent_id']
        }
      },
      {
        name: 'export_graph_image',
        description: 'Generates a standalone SVG/visual image of the CAVDAX causal architecture graph for PR descriptions, documentation, or visual inspection.',
        parameters: {
          type: 'object',
          properties: {
            node_id: { type: 'string', description: 'Optional target node ID (e.g. DEC-102 or ADR-001) to center or inspect.' },
            highlight_blast_radius: { type: 'boolean', description: 'When true and node_id is provided, highlights downstream invalidated dependencies in pulsing warning colors.' },
            format: { type: 'string', enum: ['svg', 'markdown'], description: 'Output format (default: "svg").' }
          }
        }
      }
    ];
  }

  /**
   * Handles tool execution calls from the agent
   */
  async handleToolCall(toolName, args) {
    console.log(`[MCP Gate] Received tool call: '${toolName}' with decision: '${args.decision_id || args.new_decision_id}'`);

    if (toolName === 'apply_code_change') {
      return await this.executeApplyCodeChange(args);
    } else if (toolName === 'revalidate_decision') {
      return await this.executeRevalidateDecision(args);
    } else if (toolName === 'check_intent_clearance') {
      return await this.executeCheckIntentClearance(args);
    } else if (toolName === 'acquire_decision_lock') {
      return globalLockManager.acquireLock(args.decision_id, args.agent_id, args.ttl_ms, args.reason);
    } else if (toolName === 'release_decision_lock') {
      return globalLockManager.releaseLock(args.decision_id, args.agent_id);
    } else if (toolName === 'export_graph_image') {
      return await this.executeExportGraphImage(args);
    } else {
      throw new Error(`Unknown tool: '${toolName}'`);
    }
  }

  /**
   * Enclosed Execution Wrapper for apply_code_change
   */
  async executeApplyCodeChange({ decision_id, file_path, code_payload, reasoning, agent_id }) {
    console.log(`[MCP Gate] 🛡️ Intercepting apply_code_change for '${file_path}'...`);

    // Multi-Agent Concurrency Check: Verify foreign lock
    const lockCheck = globalLockManager.checkLock(decision_id, agent_id);
    if (lockCheck.locked && lockCheck.is_foreign) {
      console.warn(`[MCP Gate] ⛔ CONCURRENCY REFUSAL: Decision '${decision_id}' locked by '${lockCheck.locked_by}'`);
      return {
        isError: true,
        gate_verdict: 'BLOCKED_CONCURRENT_AGENT_LOCK',
        decision_id,
        locked_by: lockCheck.locked_by,
        expires_in_ms: lockCheck.expires_in_ms,
        message: `⛔ CONCURRENCY REFUSAL: Decision '${decision_id}' is actively locked by autonomous agent '${lockCheck.locked_by}' (${Math.ceil(lockCheck.expires_in_ms / 1000)}s remaining). Write blocked to prevent conflicting branch mutations.`,
        instructions_for_agent: `Wait for agent '${lockCheck.locked_by}' to release lock, or work on an unlocked decision branch.`
      };
    }
    // Security Confinement: Prevent path traversal upfront (OWASP A01/A03 Hardening)
    if (!file_path || typeof file_path !== 'string') {
      return {
        isError: true,
        gate_verdict: 'BLOCKED_INVALID_PATH',
        decision_id,
        error: 'Access denied: Target file path must be a non-empty string.'
      };
    }
    const resolvedRepo = path.resolve(this.repoRoot);
    const resolvedPath = path.resolve(resolvedRepo, file_path);
    if (!resolvedPath.startsWith(resolvedRepo + path.sep)) {
      console.warn(`[MCP Gate] ⛔ PATH TRAVERSAL ATTEMPT BLOCKED: '${file_path}' attempts to escape sandbox root.`);
      return {
        isError: true,
        gate_verdict: 'BLOCKED_PATH_TRAVERSAL',
        decision_id,
        error: 'Access denied: Target file path must reside within the sandbox repository root.'
      };
    }

    // Symlink confinement: a link inside the repo that points outside it must not be a way out.
    let realRepo = resolvedRepo;
    try { realRepo = fs.realpathSync(resolvedRepo); } catch { /* repo root not created yet: lexical root */ }
    const realPath = realpathOfDeepestAncestor(resolvedPath);
    if (!realPath || !realPath.startsWith(realRepo + path.sep)) {
      console.warn(`[MCP Gate] ⛔ SYMLINK ESCAPE BLOCKED: '${file_path}' resolves outside the sandbox root.`);
      return {
        isError: true,
        gate_verdict: 'BLOCKED_PATH_TRAVERSAL',
        decision_id,
        error: 'Access denied: Target file path resolves (through a symlink) outside the sandbox repository root.'
      };
    }

    // Protected paths are never writable through the gate, whatever the decision says.
    if (isProtectedWritePath(toRepoRelative(resolvedRepo, resolvedPath)) || isProtectedWritePath(toRepoRelative(realRepo, realPath))) {
      console.warn(`[MCP Gate] ⛔ PROTECTED PATH WRITE BLOCKED: '${file_path}'.`);
      return {
        isError: true,
        gate_verdict: 'BLOCKED_PROTECTED_PATH',
        decision_id,
        error: 'Access denied: git internals, .env files and .github/ workflow files cannot be modified through the gate.'
      };
    }

    console.log(`[MCP Gate] Running Query 1 against FalkorDB on '${decision_id}'...`);

    // 1. RUN INTERNAL FALKORDB VERIFICATION
    const checkResult = await verifyActionGate(this.graph, decision_id);

    // 2. ENFORCEMENT BRANCH A: HARD REJECT
    if (!checkResult.is_approved) {
      console.warn(`[MCP Gate] ⛔ GATE REFUSAL: Action BLOCKED! Verdict: ${checkResult.gate_verdict}`);
      console.warn(`[MCP Gate] Violation path:`, checkResult.violation_paths);

      // Log the blocked attempt in FalkorDB audit trail
      try {
        const actionId = `act-${Date.now()}`;
        await this.graph.query(`
          MATCH (d:Decision {id: $decisionId})
          CREATE (a:AgentAction {
            id: $actionId,
            target_file: $targetFile,
            status: $status,
            timestamp: timestamp()
          })
          CREATE (a)-[:GROUNDED_IN]->(d)
        `, {
          params: {
            decisionId: decision_id,
            actionId,
            targetFile: file_path,
            status: checkResult.gate_verdict || "BLOCKED_SUPERSEDED_SOURCE"
          }
        });
      } catch (auditErr) {
        console.error(`[MCP Gate] Warning: Failed to log blocked audit node:`, auditErr.message);
      }

      // Return structured MCP error payload back to agent (zero files written!)
      return {
        isError: true,
        gate_verdict: checkResult.gate_verdict,
        decision_id,
        latency_ms: checkResult.latency_ms,
        violation_paths: checkResult.violation_paths,
        message: `⛔ CAVDAX GATE BLOCKED: Execution rejected. Decision '${decision_id}' status is '${checkResult.gate_verdict}'. A supporting fact or source was superseded. Revalidation is required before code can be written.`,
        instructions_for_agent: `To resolve this, inspect the superseding source, create an updated decision via 'revalidate_decision', and re-submit your change.`
      };
    }

    // 2b. SCOPE CHECK: when the decision declares the file it governs, the write must target that file.
    //     A valid decision for one file does not authorise writing a different file.
    const scopeResult = await this.graph.query(
      `MATCH (d:Decision {id: $decisionId}) RETURN d.target_file AS target_file`,
      { params: { decisionId: decision_id } }
    );
    const declaredTarget = scopeResult?.data?.[0]?.target_file;
    if (typeof declaredTarget === 'string' && declaredTarget.trim()) {
      const normalizeRel = (p) => path.posix.normalize(String(p).replace(/\\/g, '/')).replace(/^\.\//, '');
      const requestedRel = toRepoRelative(resolvedRepo, resolvedPath);
      if (normalizeRel(declaredTarget) !== normalizeRel(requestedRel)) {
        console.warn(`[MCP Gate] ⛔ SCOPE REFUSAL: '${decision_id}' governs '${declaredTarget}', not '${requestedRel}'.`);
        return {
          isError: true,
          gate_verdict: 'BLOCKED_TARGET_FILE_MISMATCH',
          decision_id,
          latency_ms: checkResult.latency_ms,
          declared_target_file: declaredTarget,
          requested_file: requestedRel,
          message: `⛔ CAVDAX GATE BLOCKED: Decision '${decision_id}' only authorises changes to '${declaredTarget}', not '${requestedRel}'.`,
          instructions_for_agent: `Write only to '${declaredTarget}' under '${decision_id}', or use a decision that governs '${requestedRel}'.`
        };
      }
    }

    // 3. ENFORCEMENT BRANCH B: APPROVED (WRITE TO DISK)
    console.log(`[MCP Gate] ✅ GATE APPROVED: Causal provenance verified in ${checkResult.latency_ms}ms.`);

    const dir = path.dirname(resolvedPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolvedPath, code_payload, 'utf-8');
    console.log(`[MCP Gate] Successfully written verified code to: ${resolvedPath}`);

    // Log the successful execution in FalkorDB audit trail
    try {
      const actionId = `act-${Date.now()}`;
      await this.graph.query(`
        MATCH (d:Decision {id: $decisionId})
        CREATE (a:AgentAction {
          id: $actionId,
          target_file: $targetFile,
          status: 'EXECUTED',
          timestamp: timestamp()
        })
        CREATE (a)-[:GROUNDED_IN]->(d)
      `, { params: { decisionId: decision_id, actionId, targetFile: file_path } });
    } catch (auditErr) {
      console.error(`[MCP Gate] Warning: Failed to log audit node:`, auditErr.message);
    }

    return {
      isError: false,
      gate_verdict: 'APPROVED',
      decision_id,
      latency_ms: checkResult.latency_ms,
      file_path: resolvedPath,
      message: `✅ CAVDAX GATE APPROVED: Full causal provenance verified. File '${file_path}' successfully written to disk.`
    };
  }

  /**
   * Pre-Flight Architectural Clearance Handler
   * Allows AI agents to verify if a proposed decision is valid and grounded BEFORE writing code.
   */
  async executeCheckIntentClearance({ decision_id, target_file, proposed_action, agent_id }) {
    console.log(`[MCP Gate] 🔍 Checking pre-flight intent clearance for decision '${decision_id}'...`);

    // Multi-Agent Concurrency Check: Verify foreign lock
    const lockCheck = globalLockManager.checkLock(decision_id, agent_id);
    if (lockCheck.locked && lockCheck.is_foreign) {
      console.warn(`[MCP Gate] ⛔ PRE-FLIGHT CONCURRENCY REFUSAL: Decision '${decision_id}' locked by '${lockCheck.locked_by}'`);
      return {
        isError: true,
        clearance_granted: false,
        gate_verdict: 'BLOCKED_CONCURRENT_AGENT_LOCK',
        decision_id,
        locked_by: lockCheck.locked_by,
        expires_in_ms: lockCheck.expires_in_ms,
        latency_ms: 0.5,
        message: `⛔ PRE-FLIGHT REFUSAL: Decision '${decision_id}' is currently leased by agent '${lockCheck.locked_by}'. Clearance withheld to prevent race conditions.`,
        instructions_for_agent: `Another agent is actively modifying code for '${decision_id}'. Please select an alternate architectural branch.`
      };
    }
    const checkResult = await verifyActionGate(this.graph, decision_id);

    if (!checkResult.is_approved) {
      console.warn(`[MCP Gate] ⛔ PRE-FLIGHT REFUSAL: Clearance DENIED! Verdict: ${checkResult.gate_verdict}`);
      return {
        isError: true,
        clearance_granted: false,
        gate_verdict: checkResult.gate_verdict,
        decision_id,
        target_file: target_file || null,
        proposed_action: proposed_action || null,
        latency_ms: checkResult.latency_ms,
        violation_paths: checkResult.violation_paths,
        message: `⛔ CLEARANCE DENIED: Decision '${decision_id}' is invalid (verdict: '${checkResult.gate_verdict}'). A supporting fact or source is superseded or stale.`,
        instructions_for_agent: `Do NOT generate or apply code grounded in '${decision_id}'. Inspect active architecture records or invoke 'revalidate_decision' to create an approved decision first.`
      };
    }

    console.log(`[MCP Gate] ✅ PRE-FLIGHT APPROVED: Clearance GRANTED in ${checkResult.latency_ms}ms.`);
    return {
      isError: false,
      clearance_granted: true,
      gate_verdict: 'APPROVED',
      decision_id,
      target_file: target_file || null,
      proposed_action: proposed_action || null,
      latency_ms: checkResult.latency_ms,
      message: `✅ CLEARANCE GRANTED: Decision '${decision_id}' is verified and grounded in active architecture records. Safe to proceed with implementation.`
    };
  }

  /**
   * Act IV Revalidation Handler
   */
  async executeRevalidateDecision(args) {
    console.log(`[MCP Gate] 🔄 Executing Act IV Revalidation: Replacing '${args.old_decision_id}' with '${args.new_decision_id}'...`);
    const result = await revalidateDecision(this.graph, {
      newSourceId: args.new_source_id,
      oldDecisionId: args.old_decision_id,
      newDecisionId: args.new_decision_id,
      newFactId: args.new_fact_id,
      title: args.title,
      ...(this.tagDemo ? {} : { isDemo: false })
    });

    return {
      isError: false,
      message: `✅ REVALIDATION COMPLETE: Decision '${args.new_decision_id}' is now ACTIVE and replaces '${args.old_decision_id}'. Gate is now open for updated code execution.`,
      result
    };
  }

  /**
   * Generates a standalone SVG or Markdown-wrapped visual representation of the causal DAG.
   */
  async executeExportGraphImage({ node_id, highlight_blast_radius, format = 'svg' } = {}) {
    let graphState = { nodes: [], edges: [] };
    if (this.graph) {
      try {
        graphState = await fetchGraphState(this.graph);
      } catch (err) {
        console.warn('[MCP Gate] Could not fetch graph state from FalkorDB, using fallback:', err.message);
      }
    }

    const { blastNodeIds, summary } = (node_id && highlight_blast_radius)
      ? computeBlastRadius(graphState.nodes, graphState.edges, node_id)
      : { blastNodeIds: new Set(), summary: { facts: 0, decisions: 0, actions: 0, files: [] } };

    const svg = renderGraphToSvg(graphState, {
      nodeId: node_id,
      highlightBlastRadius: Boolean(highlight_blast_radius)
    });

    if (format === 'markdown') {
      const summaryText = (node_id && highlight_blast_radius)
        ? `Blast Radius for ${node_id}: ${summary.decisions} decisions, ${summary.facts} facts, ${summary.actions} actions, ${summary.files.length} target files.`
        : `CAVDAX Causal DAG: ${graphState.nodes.length} nodes, ${graphState.edges.length} edges.`;
      return {
        format: 'markdown',
        markdown: `### CAVDAX Architecture Verification\n\n${summaryText}\n\n\`\`\`xml\n${svg}\n\`\`\``,
        node_count: graphState.nodes.length,
        edge_count: graphState.edges.length,
        blast_radius: summary
      };
    }

    return {
      format: 'svg',
      svg,
      node_count: graphState.nodes.length,
      edge_count: graphState.edges.length,
      blast_radius: summary
    };
  }
}
