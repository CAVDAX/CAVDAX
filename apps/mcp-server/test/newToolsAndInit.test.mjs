import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CavdaxStdioGateway, TOOLS } from '../src/stdioServer.js';
import { runInit } from '../src/initCommand.js';

const tool = (name) => TOOLS.find((t) => t.name === name);

test('list_active_decisions and explain_blast_radius are declared in TOOLS with schemas', () => {
  const listTool = tool('list_active_decisions');
  assert.ok(listTool, 'list_active_decisions must be declared in TOOLS');
  assert.equal(listTool.inputSchema.type, 'object');
  assert.equal(listTool.inputSchema.properties.status_filter?.type, 'string');

  const blastTool = tool('explain_blast_radius');
  assert.ok(blastTool, 'explain_blast_radius must be declared in TOOLS');
  assert.equal(blastTool.inputSchema.type, 'object');
  assert.equal(blastTool.inputSchema.properties.node_id?.type, 'string');
  assert.ok(blastTool.inputSchema.required.includes('node_id'), 'node_id must be required');
});

test('list_active_decisions returns structured decision manifests in simulation mode', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-list-'));
  try {
    const gateway = new CavdaxStdioGateway({ repoRoot: root, mode: 'simulation' });
    const call = async (name, args) => JSON.parse((await gateway.callTool(name, args)).content[0].text);

    // Initial simulation graph has DEC-102 with status INVALIDATED
    const allDecisions = await call('list_active_decisions', { status_filter: 'ALL' });
    assert.equal(allDecisions.status, 'SUCCESS');
    assert.ok(Array.isArray(allDecisions.decisions));
    assert.ok(allDecisions.count >= 1);

    const activeOnly = await call('list_active_decisions', { status_filter: 'ACTIVE' });
    assert.equal(activeOnly.status, 'SUCCESS');
    assert.ok(Array.isArray(activeOnly.decisions));
    // Since DEC-102 is INVALIDATED, activeOnly count is 0
    assert.equal(activeOnly.count, 0);

    // Revalidate DEC-103 as active
    await call('revalidate_decision', {
      new_source_id: 'ADR-002',
      old_decision_id: 'DEC-102',
      new_decision_id: 'DEC-103',
      new_fact_id: 'F-OAuth2',
      title: 'OAuth2 Authentication',
      target_file: 'src/auth/jwt.js'
    });

    const refreshedActive = await call('list_active_decisions', { status_filter: 'ACTIVE' });
    assert.equal(refreshedActive.status, 'SUCCESS');
    assert.ok(refreshedActive.count >= 1);
    const dec103 = refreshedActive.decisions.find(d => d.id === 'DEC-103');
    assert.ok(dec103, 'DEC-103 must be in active decisions');
    assert.equal(dec103.status, 'ACTIVE');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('explain_blast_radius returns downstream impact and severity', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-blast-'));
  try {
    const gateway = new CavdaxStdioGateway({ repoRoot: root, mode: 'simulation' });
    const call = async (name, args) => JSON.parse((await gateway.callTool(name, args)).content[0].text);

    // Test non-existent node
    const missing = await call('explain_blast_radius', { node_id: 'NON_EXISTENT' });
    assert.equal(missing.status, 'ERROR');
    assert.equal(missing.node_found, false);

    // Test DEC-102
    const blast = await call('explain_blast_radius', { node_id: 'DEC-102' });
    assert.equal(blast.status, 'SUCCESS');
    assert.equal(blast.node_found, true);
    assert.equal(blast.node_id, 'DEC-102');
    assert.ok(typeof blast.severity === 'string');
    assert.ok(Array.isArray(blast.governed_files_at_risk));
    assert.ok(Array.isArray(blast.direct_dependent_decisions));
    assert.ok(typeof blast.blast_radius_score === 'number');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('cavdax runInit scaffolds docs/adr, baseline ADR-001, and .cursor/mcp.json idempotently', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cavdax-init-test-'));
  try {
    const result = await runInit({ targetDir: tempDir, quiet: true });
    assert.equal(result.success, true);
    assert.equal(result.createdFiles.length, 2);

    const adrPath = path.join(tempDir, 'docs', 'adr', 'ADR-001-architectural-baseline.md');
    const mcpConfigPath = path.join(tempDir, '.cursor', 'mcp.json');

    assert.ok(fs.existsSync(adrPath), 'ADR-001 must exist');
    assert.ok(fs.existsSync(mcpConfigPath), '.cursor/mcp.json must exist');

    const adrContent = fs.readFileSync(adrPath, 'utf8');
    assert.ok(adrContent.includes('ADR-001: Architectural Baseline & Verification Invariants'));
    assert.ok(adrContent.includes('DEC-101'));

    const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
    assert.ok(mcpConfig.mcpServers?.cavdax, 'mcpServers.cavdax must exist');
    assert.equal(mcpConfig.mcpServers.cavdax.command, 'npx');

    // Idempotency check: runInit again without force should skip existing files
    const result2 = await runInit({ targetDir: tempDir, quiet: true });
    assert.equal(result2.success, true);
    assert.equal(result2.skippedFiles.length, 2);
    assert.equal(result2.createdFiles.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
