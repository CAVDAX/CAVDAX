import fs from 'fs';
import path from 'path';

/**
 * cavdax init
 * Scaffolds ADR documentation structure and MCP client configurations for a project.
 */
export async function runInit(options = {}) {
  const root = path.resolve(options.targetDir || options.repo || process.cwd());
  const quiet = Boolean(options.quiet);
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  log(`\n======================================================`);
  log(`[CAVDAX] Causal Governance Initialization`);
  log(`======================================================`);
  log(`   Target Directory: ${root}\n`);

  let actionsTaken = 0;
  const createdFiles = [];
  const skippedFiles = [];

  // 1. Scaffold docs/adr directory and baseline ADR
  const adrDir = path.join(root, 'docs', 'adr');
  if (!fs.existsSync(adrDir)) {
    fs.mkdirSync(adrDir, { recursive: true });
    log(`   [OK] Created architectural records directory: docs/adr/`);
    actionsTaken++;
  } else {
    log(`   [INFO] Existing architectural directory detected: docs/adr/`);
  }

  const baselineAdrPath = path.join(adrDir, 'ADR-001-architectural-baseline.md');
  if (!fs.existsSync(baselineAdrPath) || options.force) {
    const baselineContent = `# ADR-001: Architectural Baseline & Verification Invariants

## Status
ACCEPTED

## Context
This project utilizes CAVDAX causal graph governance. All code changes executed by autonomous coding agents (Claude Code, Cursor, Antigravity) must be justified by an active, un-superseded Architecture Decision Record.

## Decision
1. All architectural decisions are documented under \`docs/adr/\`.
2. AI coding agents must query \`list_active_decisions\` and run \`check_intent_clearance\` before modifying code.
3. Code writes are executed via the enclosed \`apply_code_change\` MCP gate.
4. Pre-commit hooks run \`npx cavdax check --staged\` to verify causal provenance.

## Invariants Governed
- Decision ID: DEC-101
- Target File: src/**
- Fact ID: F-Baseline-001

## Consequences
- Guarantees zero unverified code drift or phantom architecture regression.
- Invalidation cascade automatically alerts engineers when upstream interfaces break.
`;
    fs.writeFileSync(baselineAdrPath, baselineContent, 'utf8');
    log(`   [OK] Generated initial baseline record: docs/adr/ADR-001-architectural-baseline.md`);
    createdFiles.push(baselineAdrPath);
    actionsTaken++;
  } else {
    log(`   [INFO] Baseline ADR already exists: docs/adr/ADR-001-architectural-baseline.md`);
    skippedFiles.push(baselineAdrPath);
  }

  // 2. Scaffold Cursor MCP Configuration (.cursor/mcp.json)
  const cursorDir = path.join(root, '.cursor');
  const cursorMcpPath = path.join(cursorDir, 'mcp.json');
  try {
    if (!fs.existsSync(cursorDir)) {
      fs.mkdirSync(cursorDir, { recursive: true });
    }
    let cursorConfig = { mcpServers: {} };
    if (fs.existsSync(cursorMcpPath)) {
      try {
        cursorConfig = JSON.parse(fs.readFileSync(cursorMcpPath, 'utf8'));
      } catch {}
    }
    if (!cursorConfig.mcpServers) cursorConfig.mcpServers = {};
    if (!cursorConfig.mcpServers.cavdax || options.force) {
      cursorConfig.mcpServers.cavdax = {
        command: 'npx',
        args: ['-y', '@cavdax/mcp-server@latest', 'mcp']
      };
      fs.writeFileSync(cursorMcpPath, JSON.stringify(cursorConfig, null, 2), 'utf8');
      log(`   [OK] Configured Cursor MCP Gate: .cursor/mcp.json`);
      createdFiles.push(cursorMcpPath);
      actionsTaken++;
    } else {
      log(`   [INFO] Cursor MCP Gate already configured in: .cursor/mcp.json`);
      skippedFiles.push(cursorMcpPath);
    }
  } catch (err) {
    if (!quiet) console.warn(`   [WARN] Could not write .cursor/mcp.json:`, err.message);
  }

  // 3. Print Claude Code & CI Instructions
  log(`\n------------------------------------------------------`);
  log(`Quick Setup Guide for AI Coding Agents:`);
  log(`------------------------------------------------------`);
  log(`* Claude Code:`);
  log(`  Run: claude mcp add cavdax -- npx -y @cavdax/mcp-server@latest mcp\n`);
  log(`* Cursor / Antigravity:`);
  log(`  Configuration active in .cursor/mcp.json\n`);
  log(`* Verify Readiness:`);
  log(`  Run: npx cavdax doctor\n`);
  log(`* Ingest Baseline:`);
  log(`  Run: npx cavdax ingest --type adr --repo .\n`);
  log(`======================================================`);
  log(`[OK] CAVDAX initialization complete (${actionsTaken} item(s) configured).\n`);

  return {
    success: true,
    root,
    createdFiles,
    skippedFiles,
    actionsTaken
  };
}
