#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const stagedOnly = args.includes('--staged');

function getFilesToScan() {
  if (stagedOnly) {
    try {
      const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
      return output
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.endsWith('.md') && fs.existsSync(f));
    } catch {
      return [];
    }
  }

  const results = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (item.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  walk('.');
  return results;
}

let totalErrors = 0;
const files = getFilesToScan();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // Check 1: Synthetic CRCRLF (\r\r\n)
  if (content.includes('\r\r\n')) {
    console.error(`⛔ [lint-markdown] ${file}: Found synthetic double carriage returns (\\r\\r\\n). Strip \\r before saving.`);
    totalErrors++;
  }

  // Check 2: Indented raw HTML tags outside fenced code blocks (causes GFM indented code block traps)
  const lines = content.split(/\r?\n/);
  let inCodeFence = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCodeFence = !inCodeFence;
      return;
    }
    if (!inCodeFence) {
      if (/^\s{4,}<(picture|source|img|a|strong|p|div|span|h[1-6]|table|tr|td|th|ul|ol|li)\b/i.test(line)) {
        console.error(`⛔ [lint-markdown] ${file}:${idx + 1}: Indented HTML element with >=4 spaces triggers GFM indented code block trap: "${trimmed}"`);
        totalErrors++;
      }
    }
  });
}

if (totalErrors > 0) {
  console.error(`\n❌ Markdown lint failed with ${totalErrors} violation(s). Fix violations or strip leading spaces to 0.`);
  process.exit(1);
} else {
  console.log(`✅ [lint-markdown] Verified ${files.length} markdown file(s): zero GFM indented code block traps.`);
  process.exit(0);
}
