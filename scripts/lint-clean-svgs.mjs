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
        .filter(f => (f.endsWith('.jsx') || f.endsWith('.tsx')) && f.includes('apps/client/src/components/') && fs.existsSync(f));
    } catch {
      return [];
    }
  }

  const baseDir = path.resolve('apps/client/src/components');
  if (!fs.existsSync(baseDir)) return [];

  const results = [];
  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (item.endsWith('.jsx') || item.endsWith('.tsx')) {
        results.push(full);
      }
    }
  }
  walk(baseDir);
  return results;
}

let totalErrors = 0;
const files = getFilesToScan();

// Regex 1: detects <div className="..."> wrapping an SVG or Lucide Icon with squircle classes (rounded-xl/2xl + p-2/p-2.5 + bg-*)
const SQUIRCLE_ICON_WRAPPER = /<div[^>]*className=["'][^"']*\b(rounded-(?:xl|2xl))\b[^"']*\b(p-2|p-2\.5|p-1\.5)\b[^"']*\b(bg-(?:slate|white|gray|zinc|neutral|amber|blue|indigo)[^"']*)\b[^"']*["'][^>]*>\s*<([A-Z][A-Za-z0-9]+|svg)\b[^>]*\/>\s*<\/div>/gs;

// Regex 2: detects SVG / Lucide icons with dynamic vertical hover translation jitter in navigation/controls (Rule 0af)
const TRANSLATING_NAV_ICON = /<([A-Z][A-Za-z0-9]+|svg)\b[^>]*className=["'][^"']*\b(group-hover:-translate-y-[0-9.]+|group-hover:translate-y-[0-9.]+|hover:-translate-y-[0-9.]+)\b[^"']*["'][^>]*\/?>/gs;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = SQUIRCLE_ICON_WRAPPER.exec(content)) !== null) {
    // Exclude deliberate interactive user buttons or full avatars
    if (match[0].includes('cursor-pointer') || match[0].includes('onClick') || match[0].includes('role="button"')) {
      continue;
    }
    const linesUpToMatch = content.slice(0, match.index).split('\n').length;
    console.error(`⛔ [lint-clean-svgs] ${path.relative(process.cwd(), file)}:${linesUpToMatch}: Found generic squircle icon container wrapper:`);
    console.error(`   ${match[0].replace(/\s+/g, ' ')}`);
    console.error(`   👉 Invariant (Rule 0ad): Render SVGs directly and cleanly inline without artificial bounding squircle boxes.`);
    totalErrors++;
  }

  // Scan for jittery hover translation on navigation SVGs (excluding ArrowUpRight external link cues)
  while ((match = TRANSLATING_NAV_ICON.exec(content)) !== null) {
    if (match[1] === 'ArrowUpRight') {
      continue; // Allow external link diagonal cues
    }
    const linesUpToMatch = content.slice(0, match.index).split('\n').length;
    console.error(`⛔ [lint-clean-svgs] ${path.relative(process.cwd(), file)}:${linesUpToMatch}: Found dynamic hover translation on navigation SVG icon:`);
    console.error(`   ${match[0].replace(/\s+/g, ' ')}`);
    console.error(`   👉 Invariant (Rule 0af): SVG icons in navigation bars, tab selectors, and pill docks must remain statically anchored without hover translation jitter.`);
    totalErrors++;
  }
}

if (totalErrors > 0) {
  console.error(`\n[lint-clean-svgs] ❌ Found ${totalErrors} squircle container violation(s). Commit aborted.`);
  process.exit(1);
} else {
  console.log(`[lint-clean-svgs] ✅ Clean SVGs verified across ${files.length} component(s). Zero squircle wrappers.`);
  process.exit(0);
}
