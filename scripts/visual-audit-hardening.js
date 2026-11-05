import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findSystemBrowser() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
  ];
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];
  for (const p of [...edgePaths, ...chromePaths]) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

const ARTIFACT_DIR = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb';

async function runVisualAudit() {
  const browserPath = findSystemBrowser();
  if (!browserPath) {
    console.error('No Edge or Chrome executable found on system.');
    process.exit(1);
  }

  console.log(`[Visual Audit] Launching browser: ${browserPath}`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Visit /mcp (the real MCP connection route)
    console.log('[Visual Audit] Navigating to http://localhost:5173/mcp ...');
    await page.goto('http://localhost:5173/mcp', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));

    const mcpShot = path.join(ARTIFACT_DIR, 'visual_audit_mcp_page.png');
    await page.screenshot({ path: mcpShot, fullPage: false });
    console.log(`[Visual Audit] Screenshot saved: ${mcpShot}`);

    // Verify Dev PAT button exists on /mcp
    const buttons = await page.$$('button');
    let devPatBtn = null;
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('Dev PAT')) {
        devPatBtn = b;
        break;
      }
    }
    console.log(`[Visual Audit] Dev PAT button on /mcp: ${devPatBtn ? 'FOUND' : 'NOT FOUND'}`);

    if (devPatBtn) {
      console.log('[Visual Audit] Clicking Dev PAT button to verify modal...');
      await devPatBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const modalShot = path.join(ARTIFACT_DIR, 'visual_audit_dev_pat_modal.png');
      await page.screenshot({ path: modalShot, fullPage: false });
      console.log(`[Visual Audit] Screenshot saved: ${modalShot}`);

      // Dismiss modal
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 400));
    }

    // 2. Visit /console and test Command Palette (Ctrl+K)
    console.log('[Visual Audit] Navigating to http://localhost:5173/console ...');
    await page.goto('http://localhost:5173/console', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1500));

    console.log('[Visual Audit] Triggering Ctrl+K on /console...');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyK');
    await page.keyboard.up('Control');
    await new Promise(r => setTimeout(r, 800));

    const cmdKShot = path.join(ARTIFACT_DIR, 'visual_audit_command_palette.png');
    await page.screenshot({ path: cmdKShot, fullPage: false });
    console.log(`[Visual Audit] Screenshot saved: ${cmdKShot}`);

    // Dismiss with Escape
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));

    // 3. Test ConnectRepoModal -> Dev PAT click
    console.log('[Visual Audit] Opening ConnectRepoModal on /console...');
    await page.goto('http://localhost:5173/console?openConnectRepo=1', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    const repoButtons = await page.$$('button');
    let useTokenBtn = null;
    for (const b of repoButtons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('Use Personal Access Token')) {
        useTokenBtn = b;
        break;
      }
    }

    if (useTokenBtn) {
      console.log('[Visual Audit] Clicking Use Personal Access Token in ConnectRepoModal...');
      await useTokenBtn.click();
      await new Promise(r => setTimeout(r, 600));

      const tokenModalFromRepoShot = path.join(ARTIFACT_DIR, 'visual_audit_pat_from_repo_modal.png');
      await page.screenshot({ path: tokenModalFromRepoShot, fullPage: false });
      console.log(`[Visual Audit] Screenshot saved: ${tokenModalFromRepoShot}`);
    }

    console.log(`[Visual Audit] Total critical page errors detected: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('[Visual Audit] Console errors:', consoleErrors);
    }

    console.log('[Visual Audit] Puppeteer visual audit complete successfully!');
  } catch (err) {
    console.error('[Visual Audit] Error during audit:', err);
  } finally {
    await browser.close();
  }
}

runVisualAudit();
