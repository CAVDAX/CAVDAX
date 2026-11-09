import { SimulationEngine } from './simulation.js';

export async function runImpact(nodeId, options = {}) {
  const targetId = nodeId || options.decision || options.id;
  if (!targetId) {
    console.log('\n[cavdax impact] Target decision or source node ID required.');
    console.log('Usage: npx cavdax impact <node-id> (e.g. npx cavdax impact DEC-101)\n');
    return false;
  }

  const engine = new SimulationEngine({ repoRoot: process.cwd() });
  const result = engine.explainBlastRadius({ node_id: targetId });

  if (result.isError) {
    console.log(`\n[cavdax impact] ${result.message}\n`);
    return false;
  }

  console.log('\n======================================================');
  console.log('CAVDAX Architectural Impact & Downstream Analysis');
  console.log('======================================================');
  console.log(`Target Node     : ${result.node_id} (${result.node_type || 'DECISION'})`);
  console.log(`Impact Severity : ${result.severity}`);
  console.log(`Downstream Risk : ${result.downstream_node_count} node(s) impacted`);
  console.log('------------------------------------------------------');

  if (result.downstream_invalidated_decisions?.length) {
    console.log('\nDownstream Invalidated Decisions:');
    result.downstream_invalidated_decisions.forEach(d => {
      console.log(`  - [${d.id}] ${d.title} (${d.current_status} -> ${d.projected_status})`);
    });
  }

  if (result.governed_files_at_risk?.length) {
    console.log('\nGoverned Source Files at Risk:');
    result.governed_files_at_risk.forEach(f => {
      console.log(`  - ${f}`);
    });
  }

  if (result.remediation_directive) {
    console.log(`\nRemediation: ${result.remediation_directive}\n`);
  }
  return true;
}

// Backwards-compatible alias
export const runBlast = runImpact;
