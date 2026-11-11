#!/usr/bin/env node

/**
 * CAVDAX Universal CLI Entrypoint (Zero-Dependency Standard Library)
 * Powered by Node.js native util.parseArgs (Zero external child_process imports)
 *
 * Supports:
 *   npx cavdax mcp         -> Launches stdio MCP server for Cursor / Claude
 *   npx cavdax ingest      -> Ingests local ADRs and git history into FalkorDB
 *   npx cavdax check       -> Validates staged files against causal graph
 *   npx cavdax gate        -> Enforces PR / commit architectural invariants in CI
 *   npx cavdax doctor      -> Runs connectivity and health checks
 *   npx cavdax init        -> Scaffolds ADR documentation structure
 *   npx cavdax impact      -> Inspects downstream architectural impact (alias: blast)
 *   npx cavdax decisions   -> Lists active architecture decisions
 */

import { parseArgs } from 'node:util';
import fs from 'node:fs';
import { startStdioServer } from '../src/stdioServer.js';
import { runIngest } from '../src/ingestCommand.js';
import { runCheck } from '../src/checkCommand.js';
import { runGate } from '../src/gateCommand.js';
import { runDoctor } from '../src/doctorCommand.js';
import { runInit } from '../src/initCommand.js';
import { runImpact } from '../src/impactCommand.js';
import { runDecisions } from '../src/decisionsCommand.js';

const pkgJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const { version } = pkgJson;

const rawArgs = process.argv.slice(2);

// Top-level help printer
function printHelp() {
  console.log(`
CAVDAX CLI v${version}
Causal Invalidation & Enclosed MCP Execution Gate for AI Coding Agents

Usage:
  npx cavdax [command] [options]

Commands:
  mcp (default)        Start the Model Context Protocol (MCP) stdio server
  ingest               Ingest sources into FalkorDB (ADR, commit, package.json, issue)
  check                Verify staged files or PR commits against causal graph
  gate                 Verify PR commits against architectural boundaries in CI/CD
  doctor               Diagnose FalkorDB connectivity and MCP readiness
  init                 Scaffold ADR documentation structure and MCP client configs
  impact, blast <id>   Inspect downstream architectural impact of a decision
  decisions            List active architecture decisions and governed paths

Options:
  -v, --version        Output version number
  -h, --help           Display help information

Examples:
  npx cavdax                      # Starts MCP stdio server
  npx cavdax check --staged       # Validates git staged files before commit
  npx cavdax impact DEC-101       # Explains downstream invalidation risk
`);
}

async function main() {
  // Check for global flags first
  if (rawArgs.includes('-v') || rawArgs.includes('--version')) {
    console.log(`cavdax v${version}`);
    process.exit(0);
  }

  // Parse command name (positional)
  let command = rawArgs.find(arg => !arg.startsWith('-')) || 'mcp';
  if (command === 'blast') command = 'impact';

  if (rawArgs.includes('-h') || rawArgs.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'mcp': {
      await startStdioServer();
      break;
    }

    case 'ingest': {
      const { values } = parseArgs({
        args: rawArgs.filter(a => a !== 'ingest'),
        options: {
          repo: { type: 'string', short: 'r', default: process.cwd() },
          host: { type: 'string', short: 'h', default: process.env.FALKORDB_HOST || 'localhost' },
          port: { type: 'string', short: 'p', default: process.env.FALKORDB_PORT || '6379' },
          type: { type: 'string', short: 't', default: 'adr' },
          sha: { type: 'string' },
          message: { type: 'string' },
          author: { type: 'string' },
          issue: { type: 'string' },
          url: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          supersedes: { type: 'string' }
        },
        allowPositionals: false,
        strict: false
      });
      await runIngest(values);
      break;
    }

    case 'check': {
      const { values } = parseArgs({
        args: rawArgs.filter(a => a !== 'check'),
        options: {
          staged: { type: 'boolean', short: 's', default: false },
          pr: { type: 'string' },
          strict: { type: 'boolean', default: false }
        },
        allowPositionals: false,
        strict: false
      });
      const success = await runCheck(values);
      process.exit(success ? 0 : 1);
      break;
    }

    case 'gate': {
      const { values } = parseArgs({
        args: rawArgs.filter(a => a !== 'gate'),
        options: {
          repo: { type: 'string', short: 'r' },
          sha: { type: 'string' },
          branch: { type: 'string', short: 'b' },
          strict: { type: 'boolean', default: false }
        },
        allowPositionals: false,
        strict: false
      });
      const success = await runGate(values);
      process.exit(success ? 0 : 1);
      break;
    }

    case 'doctor': {
      await runDoctor();
      break;
    }

    case 'init': {
      const { values } = parseArgs({
        args: rawArgs.filter(a => a !== 'init'),
        options: {
          repo: { type: 'string', short: 'r', default: process.cwd() }
        },
        allowPositionals: false,
        strict: false
      });
      await runInit(values);
      break;
    }

    case 'impact': {
      const { values, positionals } = parseArgs({
        args: rawArgs.filter(a => a !== 'impact' && a !== 'blast'),
        options: {
          decision: { type: 'string', short: 'd' }
        },
        allowPositionals: true,
        strict: false
      });
      const targetId = positionals[0] || values.decision;
      const success = await runImpact(targetId, values);
      process.exit(success ? 0 : 1);
      break;
    }

    case 'decisions': {
      const { values } = parseArgs({
        args: rawArgs.filter(a => a !== 'decisions'),
        options: {
          filter: { type: 'string', short: 'f', default: 'ALL' }
        },
        allowPositionals: false,
        strict: false
      });
      await runDecisions(values);
      process.exit(0);
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('[cavdax fatal error]', err);
  process.exit(1);
});
