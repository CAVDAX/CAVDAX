import { SimulationEngine } from './simulation.js';

export async function runDecisions(options = {}) {
  const filter = (options.filter || options.status || 'ALL').toUpperCase();
  const engine = new SimulationEngine({ repoRoot: process.cwd() });
  const result = engine.listActiveDecisions({ status_filter: filter });

  console.log('\n======================================================');
  console.log(`CAVDAX Active Architecture Decisions (Filter: ${filter})`);
  console.log('======================================================');
  console.log(`Total Decisions: ${result.count ?? 0}\n`);

  if (!result.decisions || result.decisions.length === 0) {
    console.log('No architecture decisions found matching the specified filter.\n');
    return true;
  }

  result.decisions.forEach(d => {
    const statusTag = d.status === 'APPROVED' ? '[APPROVED]' : `[${d.status}]`;
    console.log(`${d.id.padEnd(10)} ${statusTag.padEnd(14)} ${d.title}`);
    console.log(`           Governs: ${d.governs || 'Globally scoped'}`);
    if (d.grounded_in) {
      console.log(`           Grounded: ${d.grounded_in}`);
    }
  });
  console.log('\nUse "npx cavdax blast <id>" to inspect downstream blast radius of any decision.\n');
  return true;
}
