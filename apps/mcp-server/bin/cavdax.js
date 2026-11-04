#!/usr/bin/env node

/**
 * CAVDAX Universal CLI Entrypoint
 * Supports:
 *   npx cavdax mcp         -> Launches stdio MCP server for Cursor / Claude
 *   npx cavdax ingest      -> Ingests local ADRs and git history into FalkorDB
 *   npx cavdax check       -> Validates staged files against causal graph
 *   npx cavdax gate        -> Enforces PR / commit architectural invariants in CI
 *   npx cavdax doctor      -> Runs connectivity and health checks
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import { startStdioServer } from '../src/stdioServer.js';
import { runIngest } from '../src/ingestCommand.js';
import { runCheck } from '../src/checkCommand.js';
import { runGate } from '../src/gateCommand.js';
import { runDoctor } from '../src/doctorCommand.js';

const program = new Command();
const { version } = createRequire(import.meta.url)('../package.json');

program
  .name('cavdax')
  .description('CAVDAX: Causal Invalidation & Enclosed MCP Execution Gate for AI Coding Agents')
  .version(version);

program
  .command('mcp', { isDefault: true })
  .description('Start the Model Context Protocol (MCP) stdio server for Claude Code and Cursor')
  .action(async () => {
    await startStdioServer();
  });

program
  .command('ingest')
  .description('Ingest sources into FalkorDB (ADR, commit, package.json, CODEOWNERS, GitHub Issue)')
  .option('-r, --repo <path>', 'Repository root path', process.cwd())
  .option('-h, --host <host>', 'FalkorDB host', process.env.FALKORDB_HOST || 'localhost')
  .option('-p, --port <port>', 'FalkorDB port', process.env.FALKORDB_PORT || '6379')
  .option('-t, --type <type>', 'Source type: adr | commit | package | codeowners | issue | all', 'adr')
  .option('--sha <sha>', 'Git commit SHA (required for --type commit)')
  .option('--message <msg>', 'Commit message override (optional for --type commit)')
  .option('--author <author>', 'Commit author (optional for --type commit)')
  .option('--issue <number>', 'GitHub Issue number (required for --type issue)')
  .option('--url <url>', 'GitHub Issue HTML URL (required for --type issue)')
  .option('--title <title>', 'GitHub Issue title (optional for --type issue)')
  .option('--body <body>', 'GitHub Issue body (optional, scanned for supersedes refs)')
  .option('--supersedes <ids>', 'Comma-separated source IDs this supersedes (e.g. ADR-001,ADR-002)')
  .action(async (options) => {
    await runIngest(options);
  });

program
  .command('check')
  .description('Verify staged files or PR commits against the FalkorDB causal dependency graph')
  .option('-s, --staged', 'Check currently staged git files')
  .option('--pr <number>', 'GitHub Pull Request number (for CI environments)')
  .option('--strict', 'Fail (exit 1) when FalkorDB is unreachable instead of skipping the check')
  .action(async (options) => {
    const success = await runCheck(options);
    process.exit(success ? 0 : 1);
  });

program
  .command('gate')
  .description('Verify PR commits or staged files against architectural boundaries in CI/CD pipelines')
  .option('-r, --repo <repo>', 'Repository full name (owner/repo)')
  .option('--sha <sha>', 'Pull request head commit SHA')
  .option('-b, --branch <branch>', 'Target branch name')
  .option('--strict', 'Fail when verification server or graph is unreachable')
  .action(async (options) => {
    const success = await runGate(options);
    process.exit(success ? 0 : 1);
  });

program
  .command('doctor')
  .description('Diagnose FalkorDB connectivity, GraphBLAS matrix health, and MCP readiness')
  .action(async () => {
    await runDoctor();
  });

program.parse(process.argv);
