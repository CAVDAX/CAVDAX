/**
 * CAVDAX simulation engine (no FalkorDB required).
 *
 * Mirrors the hosted dashboard's in-memory fallback so people can try the gate
 * with `npx @cavdax/mcp-server` and no Docker. It is NOT a substitute for the
 * live graph and every response says so (`simulated: true`).
 *
 * Seeded state = the dashboard's Act II outcome:
 *   ADR-002 (ACTIVE) supersedes ADR-001  ->  F-Auth-v1 stale  ->  DEC-102 invalidated
 * Anything not in this in-memory graph is rejected (fail-closed), so a made-up
 * decision id can never be approved.
 */

import fs from 'fs';
import path from 'path';

const SIM_NOTE =
  'SIMULATED: FalkorDB is not connected, so this verdict comes from an in-memory demo graph, not your repo. ' +
  'Start FalkorDB and run "npx cavdax ingest" for real enforcement.';

export class SimulationEngine {
  constructor({ repoRoot = process.cwd() } = {}) {
    this.repoRoot = path.resolve(repoRoot || process.cwd());
    this.locks = new Map();
    this.decisions = new Map([
      ['DEC-102', { title: 'Generate Checkout Service with TokenAuth v1', status: 'INVALIDATED_NEEDS_REVALIDATION', fact: 'F-Auth-v1' }]
    ]);
    this.nodes = [
      { id: 'ADR-001', label: 'Source', status: 'SUPERSEDED' },
      { id: 'ADR-002', label: 'Source', status: 'ACTIVE' },
      { id: 'F-Auth-v1', label: 'Fact', is_stale: true },
      { id: 'F-OAuth2', label: 'Fact', is_stale: false },
      { id: 'DEC-102', label: 'Decision', status: 'INVALIDATED_NEEDS_REVALIDATION' }
    ];
    this.edges = [
      { source: 'ADR-002', target: 'ADR-001', type: 'SUPERSEDES' },
      { source: 'F-Auth-v1', target: 'ADR-001', type: 'EXTRACTED_FROM' },
      { source: 'F-OAuth2', target: 'ADR-002', type: 'EXTRACTED_FROM' },
      { source: 'DEC-102', target: 'F-Auth-v1', type: 'DEPENDS_ON' }
    ];
  }

  applyCodeChange({ decision_id, file_path, code_payload }) {
    const base = { simulated: true, simulated_warning: SIM_NOTE, decision_id };
    const decision = this.decisions.get(decision_id);

    if (!decision) {
      return {
        ...base,
        isError: true,
        gate_verdict: 'BLOCKED_DECISION_NOT_FOUND',
        violation_paths: [],
        message: `CAVDAX GATE BLOCKED (SIMULATION): Decision '${decision_id}' does not exist. No file was written.`
      };
    }

    if (decision.status === 'INVALIDATED_NEEDS_REVALIDATION') {
      return {
        ...base,
        isError: true,
        gate_verdict: 'BLOCKED_SUPERSEDED_SOURCE',
        violation_paths: [[`Decision:${decision_id}`, `Fact:${decision.fact}`, 'Source:ADR-001 (SUPERSEDED by ADR-002)']],
        message: `CAVDAX GATE BLOCKED (SIMULATION): '${decision_id}' is grounded in superseded source ADR-001. No file was written.`,
        instructions_for_agent: "Call 'revalidate_decision' (new_source_id ADR-002, new_fact_id F-OAuth2) and re-submit with the new decision id."
      };
    }

    if (decision.status !== 'VALID') {
      return {
        ...base,
        isError: true,
        gate_verdict: 'BLOCKED_DECISION_INVALIDATED',
        violation_paths: [],
        message: `CAVDAX GATE BLOCKED (SIMULATION): '${decision_id}' has status ${decision.status}. No file was written.`
      };
    }

    const root = this.repoRoot;
    const target = path.resolve(root, file_path);
    if (!target.startsWith(root + path.sep)) {
      return {
        ...base,
        isError: true,
        gate_verdict: 'BLOCKED_PATH_TRAVERSAL',
        message: 'Access denied: target file path must reside within the repository root.'
      };
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, code_payload, 'utf-8');

    return {
      ...base,
      isError: false,
      gate_verdict: 'APPROVED',
      file_path: target,
      message: `CAVDAX GATE APPROVED (SIMULATION): '${decision_id}' is valid. File written to ${target}.`
    };
  }

  acquireLock({ decision_id, agent_id, ttl_ms = 60000, reason = '' }) {
    const existing = this.locks.get(decision_id);
    const now = Date.now();
    if (existing && existing.expiresAt > now && existing.agentId !== agent_id) {
      return {
        simulated: true,
        acquired: false,
        gate_verdict: 'BLOCKED_CONCURRENT_AGENT_LOCK',
        decision_id,
        locked_by: existing.agentId,
        expires_in_ms: existing.expiresAt - now,
        message: `⛔ CONCURRENCY REFUSAL (SIMULATION): Decision '${decision_id}' is locked by agent '${existing.agentId}'.`
      };
    }
    const expiresAt = now + (ttl_ms || 60000);
    this.locks.set(decision_id, { agentId: agent_id, expiresAt, reason });
    return {
      simulated: true,
      acquired: true,
      decision_id,
      agent_id,
      expires_at: new Date(expiresAt).toISOString(),
      message: `✅ LOCK ACQUIRED (SIMULATION): Agent '${agent_id}' holds exclusive lease on '${decision_id}'.`
    };
  }

  releaseLock({ decision_id, agent_id }) {
    const existing = this.locks.get(decision_id);
    if (!existing) {
      return { simulated: true, released: true, decision_id, message: "No active lock found." };
    }
    if (existing.agentId && agent_id && existing.agentId !== agent_id) {
      return {
        simulated: true,
        released: false,
        isError: true,
        decision_id,
        message: `Cannot release lock: held by agent '${existing.agentId}', not '${agent_id}'.`
      };
    }
    this.locks.delete(decision_id);
    return { simulated: true, released: true, decision_id };
  }

  checkIntentClearance({ decision_id, target_file, proposed_action, agent_id }) {
    const lock = this.locks.get(decision_id);
    if (lock && lock.expiresAt > Date.now() && lock.agentId !== agent_id) {
      return {
        simulated: true,
        isError: true,
        clearance_granted: false,
        gate_verdict: 'BLOCKED_CONCURRENT_AGENT_LOCK',
        decision_id,
        locked_by: lock.agentId,
        message: `⛔ PRE-FLIGHT CONCURRENCY REFUSAL (SIMULATION): Decision '${decision_id}' is leased by '${lock.agentId}'.`
      };
    }
    const base = { simulated: true, simulated_warning: SIM_NOTE, decision_id, target_file: target_file || null, proposed_action: proposed_action || null };
    const decision = this.decisions.get(decision_id);

    if (!decision) {
      return {
        ...base,
        isError: true,
        clearance_granted: false,
        gate_verdict: 'BLOCKED_DECISION_NOT_FOUND',
        violation_paths: [],
        message: `CLEARANCE DENIED (SIMULATION): Decision '${decision_id}' does not exist in architecture graph.`
      };
    }

    if (decision.status === 'INVALIDATED_NEEDS_REVALIDATION') {
      return {
        ...base,
        isError: true,
        clearance_granted: false,
        gate_verdict: 'BLOCKED_SUPERSEDED_SOURCE',
        violation_paths: [[`Decision:${decision_id}`, `Fact:${decision.fact}`, 'Source:ADR-001 (SUPERSEDED by ADR-002)']],
        message: `⛔ CLEARANCE DENIED (SIMULATION): Decision '${decision_id}' is grounded in superseded source ADR-001.`,
        instructions_for_agent: "Call 'revalidate_decision' (new_source_id ADR-002, new_fact_id F-OAuth2) before generating code."
      };
    }

    if (decision.status !== 'VALID') {
      return {
        ...base,
        isError: true,
        clearance_granted: false,
        gate_verdict: 'BLOCKED_DECISION_INVALIDATED',
        violation_paths: [],
        message: `⛔ CLEARANCE DENIED (SIMULATION): Decision '${decision_id}' has status ${decision.status}.`
      };
    }

    return {
      ...base,
      isError: false,
      clearance_granted: true,
      gate_verdict: 'APPROVED',
      message: `✅ CLEARANCE GRANTED (SIMULATION): Decision '${decision_id}' is verified and grounded in active records.`
    };
  }

  revalidateDecision({ new_source_id, old_decision_id, new_decision_id, new_fact_id, title }) {
    const base = { simulated: true, simulated_warning: SIM_NOTE };
    const old = this.decisions.get(old_decision_id);
    if (!old) {
      return { ...base, isError: true, message: `Cannot revalidate: old decision '${old_decision_id}' does not exist.` };
    }
    const sourceNode = this.nodes.find(n => n.id === new_source_id && n.label === 'Source');
    if (sourceNode && sourceNode.status === 'SUPERSEDED') {
      return {
        ...base,
        isError: true,
        message: `Cannot revalidate: target source '${new_source_id}' is itself SUPERSEDED.`
      };
    }
    const factNode = this.nodes.find(n => n.id === new_fact_id && n.label === 'Fact');
    if (factNode && factNode.is_stale) {
      return {
        ...base,
        isError: true,
        message: `Cannot revalidate: target fact '${new_fact_id}' is stale.`
      };
    }
    old.status = 'REPLACED_ARCHIVED';
    this.decisions.set(new_decision_id, { title, status: 'VALID', fact: new_fact_id });
    this.nodes.push({ id: new_decision_id, label: 'Decision', title, status: 'VALID' });
    this.edges.push(
      { source: new_decision_id, target: new_fact_id, type: 'DEPENDS_ON' },
      { source: new_decision_id, target: old_decision_id, type: 'REPLACES' }
    );
    return {
      ...base,
      isError: false,
      message: `REVALIDATION COMPLETE (SIMULATION): '${new_decision_id}' is ACTIVE (grounded in '${new_fact_id}' from '${new_source_id}') and replaces '${old_decision_id}'.`,
      result: { active_decision_id: new_decision_id, archived_decision_id: old_decision_id }
    };
  }

  queryGraph({ node_id } = {}) {
    const nodes = node_id ? this.nodes.filter((n) => n.id === node_id) : this.nodes;
    if (node_id && nodes.length === 0) {
      return { isError: true, message: `Node '${node_id}' not found in the simulated graph.` };
    }
    const edges = node_id ? this.edges.filter((e) => e.source === node_id || e.target === node_id) : this.edges;
    return { simulated: true, simulated_warning: SIM_NOTE, nodes, edges };
  }

  listActiveDecisions({ status_filter = 'ALL' } = {}) {
    const base = { simulated: true, simulated_warning: SIM_NOTE };
    const decisionsList = [];
    const filterUpper = (status_filter || 'ALL').toUpperCase();
    for (const [id, d] of this.decisions) {
      const status = d.status || 'VALID';
      let matches = false;
      if (filterUpper === 'ALL') {
        matches = true;
      } else if (filterUpper === 'ACTIVE') {
        matches = (status === 'VALID' || status === 'APPROVED' || status === 'ACTIVE');
      } else {
        matches = (status.toUpperCase() === filterUpper);
      }
      if (matches) {
        decisionsList.push({
          id,
          title: d.title || 'Architectural Decision',
          status: (status === 'VALID' ? 'ACTIVE' : status),
          governs: d.governs || 'src/**',
          grounded_in: d.fact || null
        });
      }
    }
    return {
      ...base,
      status: 'SUCCESS',
      count: decisionsList.length,
      total_decisions: decisionsList.length,
      active_count: decisionsList.filter((d) => d.status === 'VALID' || d.status === 'APPROVED' || d.status === 'ACTIVE').length,
      decisions: decisionsList
    };
  }

  explainBlastRadius({ node_id } = {}) {
    const base = { simulated: true, simulated_warning: SIM_NOTE, target_node: node_id };
    if (!node_id || typeof node_id !== 'string') {
      return { ...base, isError: true, status: 'ERROR', node_found: false, message: 'node_id is required to calculate architectural blast radius.' };
    }
    const cleanId = node_id.trim();
    const targetNode = this.nodes.find((n) => n.id === cleanId);
    if (!targetNode) {
      return { ...base, isError: true, status: 'ERROR', node_found: false, target_node: cleanId, message: `Node '${cleanId}' not found in simulated architecture graph.` };
    }

    const visited = new Set();
    const queue = [cleanId];
    const invalidatedDecisions = [];

    while (queue.length > 0) {
      const current = queue.shift();
      for (const edge of this.edges) {
        if (edge.target === current && !visited.has(edge.source)) {
          visited.add(edge.source);
          queue.push(edge.source);
          const dec = this.decisions.get(edge.source);
          if (dec) {
            invalidatedDecisions.push({
              id: edge.source,
              title: dec.title,
              current_status: dec.status,
              projected_status: 'INVALIDATED_NEEDS_REVALIDATION'
            });
          }
        }
      }
    }

    const severity = invalidatedDecisions.length > 2
      ? 'CRITICAL_ARCHITECTURAL_BLAST'
      : (invalidatedDecisions.length > 0 ? 'HIGH_IMPACT_INVALIDATION' : 'CONTAINED_LOW_IMPACT');

    return {
      ...base,
      status: 'SUCCESS',
      node_found: true,
      node_id: cleanId,
      target_node: cleanId,
      node_type: targetNode.label,
      severity,
      downstream_invalidated_decisions: invalidatedDecisions,
      downstream_node_count: visited.size,
      direct_dependent_decisions: invalidatedDecisions.map(d => d.id),
      governed_files_at_risk: ['src/services/payment.js', 'src/middleware/auth.js'],
      blast_radius_score: visited.size,
      remediation_directive: invalidatedDecisions.length > 0
        ? `Modifying '${cleanId}' will invalidate ${invalidatedDecisions.length} dependent decision(s). Call 'revalidate_decision' to ground new decisions before modifying source files.`
        : `Node '${cleanId}' has zero downstream dependent decisions. Safe to modify or deprecate without causal invalidation.`
    };
  }
}
