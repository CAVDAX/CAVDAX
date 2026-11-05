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

async function main() {
  const browserPath = findSystemBrowser();
  if (!browserPath) {
    console.error('No Edge or Chrome executable found on system.');
    process.exit(1);
  }

  console.log(`[Verification] Launching browser: ${browserPath}`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const results = [];

  try {
    // 1. Visit Console page directly
    console.log('[Verification] Navigating to http://localhost:5173/console...');
    await page.goto('http://localhost:5173/console', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Check Ribbon Toolbar Order in GraphCanvas
    console.log('[Verification] Checking Ribbon Toolbar order in GraphCanvas...');
    const ribbonOrder = await page.evaluate(() => {
      const searchBtn = document.querySelector('button[aria-label^="Search DAG Nodes"]');
      const allFilterBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('All') && b.querySelector('svg.lucide-layers'));
      const downloadBtn = document.querySelector('button[aria-label="Download Vector Graph (SVG)"]');
      
      if (!searchBtn || !allFilterBtn || !downloadBtn) {
        return { error: 'Ribbon buttons not found', found: { search: !!searchBtn, filter: !!allFilterBtn, download: !!downloadBtn } };
      }

      // Check DOM document order
      const posSearch = searchBtn.compareDocumentPosition(allFilterBtn);
      const posFilter = allFilterBtn.compareDocumentPosition(downloadBtn);
      
      const isSearchBeforeFilter = (posSearch & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const isFilterBeforeDownload = (posFilter & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      
      const kbdText = searchBtn.querySelector('kbd')?.textContent || '';
      return {
        isSearchBeforeFilter,
        isFilterBeforeDownload,
        kbdText
      };
    });
    console.log('Ribbon check result:', ribbonOrder);
    results.push({
      test: 'Ribbon Toolbar Order (Search -> Drift -> Download) & Ctrl+K OS Badge',
      pass: ribbonOrder.isSearchBeforeFilter && ribbonOrder.isFilterBeforeDownload && ribbonOrder.kbdText.includes('Ctrl+K')
    });

    // 3. Test TerminalView Target Code Collapse / Expand Toggle
    console.log('[Verification] Checking TerminalView Target Code Collapse in Console...');
    const collapseCheck = await page.evaluate(() => {
      const toggleBtn = document.querySelector('button[aria-label*="code diff preview"]');
      const codeBlock = document.querySelector('pre');
      if (!toggleBtn) return { error: 'Toggle button not found', hasPre: !!codeBlock };
      const initialState = {
        hasToggle: true,
        isExpanded: toggleBtn.getAttribute('aria-expanded') === 'true',
        hasCode: !!codeBlock
      };
      
      // Click collapse
      toggleBtn.click();
      return initialState;
    });
    console.log('Initial collapse state:', collapseCheck);

    await new Promise(r => setTimeout(r, 500));
    const collapsedState = await page.evaluate(() => {
      const toggleBtn = document.querySelector('button[aria-label*="code diff preview"]');
      const codeBlock = document.querySelector('pre');
      const isExpanded = toggleBtn?.getAttribute('aria-expanded') === 'true';
      
      // Click expand again
      if (toggleBtn) toggleBtn.click();
      return {
        isExpanded,
        hasCode: !!codeBlock
      };
    });
    console.log('Collapsed state:', collapsedState);

    await new Promise(r => setTimeout(r, 500));
    const reExpandedState = await page.evaluate(() => {
      const toggleBtn = document.querySelector('button[aria-label*="code diff preview"]');
      const codeBlock = document.querySelector('pre');
      return {
        isExpanded: toggleBtn?.getAttribute('aria-expanded') === 'true',
        hasCode: !!codeBlock
      };
    });
    console.log('Re-expanded state:', reExpandedState);

    results.push({
      test: 'TerminalView Target Code Collapse / Expand Toggle',
      pass: collapseCheck.isExpanded && !collapsedState.isExpanded && !collapsedState.hasCode && reExpandedState.isExpanded && reExpandedState.hasCode
    });

    // 4. Check Preferences Modal (Theme Toggle Removed)
    console.log('[Verification] Opening Preferences Modal...');
    const openedPrefs = await page.evaluate(() => {
      const prefsBtn = document.querySelector('button[aria-label="Open System Preferences"]') || 
                       document.querySelector('button[title*="Preferences"]');
      if (prefsBtn) {
        prefsBtn.click();
        return true;
      }
      return false;
    });

    if (openedPrefs) {
      await new Promise(r => setTimeout(r, 600));
      const prefsHasAppearance = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('Display Appearance') || text.includes('System Theme') || text.includes('Light & Dark Modes');
      });
      console.log('Preferences modal has appearance toggle:', prefsHasAppearance);
      results.push({ test: 'Preferences Modal Removed Redundant Theme Toggle', pass: !prefsHasAppearance });

      // Close preferences modal via Escape
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // 5. Test ConnectRepoModal (Portal, Escape, Backdrop, Lenis isolation)
    console.log('[Verification] Opening Connect Repository Modal...');
    const openedConnectModal = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Connect Repo') && b.title?.includes('Connect a live GitHub repository')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (openedConnectModal) {
      await new Promise(r => setTimeout(r, 600));
      const modalPortalCheck = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"][aria-label="Connect GitHub Repository"]');
        if (!modal) return { found: false };
        // Modal is wrapped in fixed backdrop, which is child of body
        const isChildOfBody = modal.closest('div.fixed.inset-0')?.parentElement === document.body;
        const bodyScroll = modal.querySelector('div[data-lenis-prevent="true"], div[data-lenis-prevent]');
        return {
          found: true,
          isChildOfBody,
          hasLenisPrevent: !!bodyScroll
        };
      });
      console.log('ConnectRepoModal portal check:', modalPortalCheck);
      results.push({
        test: 'ConnectRepoModal Hoisted to Portal with Lenis Prevent',
        pass: modalPortalCheck.found && modalPortalCheck.isChildOfBody && modalPortalCheck.hasLenisPrevent
      });

      // Test Escape Key Dismissal
      console.log('[Verification] Pressing Escape to dismiss modal...');
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
      const isModalClosedAfterEsc = await page.evaluate(() => {
        return !document.querySelector('[role="dialog"][aria-label="Connect GitHub Repository"]');
      });
      console.log('ConnectRepoModal closed after Escape:', isModalClosedAfterEsc);
      results.push({ test: 'ConnectRepoModal Escape Key Dismissal', pass: isModalClosedAfterEsc });

      // Open again to test backdrop click
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent.includes('Connect Repo') && b.title?.includes('Connect a live GitHub repository')
        );
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 600));
      
      // Click backdrop outside modal content (e.g. top-left corner at x: 20, y: 20)
      console.log('[Verification] Clicking modal backdrop...');
      await page.mouse.click(20, 20);
      await new Promise(r => setTimeout(r, 500));
      const isModalClosedAfterBackdrop = await page.evaluate(() => {
        return !document.querySelector('[role="dialog"][aria-label="Connect GitHub Repository"]');
      });
      console.log('ConnectRepoModal closed after backdrop click:', isModalClosedAfterBackdrop);
      results.push({ test: 'ConnectRepoModal Backdrop Click Dismissal', pass: isModalClosedAfterBackdrop });
    }

    // 6. Test Audit Page Dynamic Empty State
    console.log('[Verification] Navigating to Audit page...');
    await page.goto('http://localhost:5173/audit', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    // Native Puppeteer typing into search filter
    const searchSelector = 'input[placeholder*="Filter by file"]';
    await page.waitForSelector(searchSelector, { timeout: 5000 });
    await page.click(searchSelector);
    await page.type(searchSelector, 'nonexistent_test_action_xyz');
    await new Promise(r => setTimeout(r, 500));

    const auditState = await page.evaluate(() => {
      const filteredText = document.body.innerText.toLowerCase();
      const hasOldText = filteredText.includes('run the 4-act demo from the console tab');
      const hasMatchingText = filteredText.includes('no matching agent actions found');
      const clearBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Clear all filters'));
      const hasClearBtn = !!clearBtn;

      if (clearBtn) clearBtn.click();

      return {
        hasOldText,
        hasMatchingText,
        hasClearBtn
      };
    });
    console.log('Audit page text check:', auditState);
    results.push({
      test: 'Audit Page Empty State Copy Refactored & Dynamic Search Reset Verified',
      pass: !auditState.hasOldText && auditState.hasMatchingText && auditState.hasClearBtn
    });

    // 7. Check MCP Page Dev PAT Wavefill Parity
    console.log('[Verification] Navigating to Connect MCP page...');
    await page.goto('http://localhost:5173/mcp', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    const mcpBtnCheck = await page.evaluate(() => {
      const devPatBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Dev PAT'));
      if (!devPatBtn) return { found: false };
      const waveSvg = devPatBtn.querySelector('svg[viewBox="0 0 320 48"]');
      const solidFill = devPatBtn.querySelector('div.bg-slate-950, div.bg-white');
      const hasTransparentBg = devPatBtn.className.includes('bg-transparent');
      return {
        found: true,
        hasWaveSvg: !!waveSvg,
        hasSolidFill: !!solidFill,
        hasTransparentBg,
        className: devPatBtn.className
      };
    });
    console.log('ConnectMcpPage Dev PAT button check:', mcpBtnCheck);
    results.push({
      test: 'ConnectMcpPage Dev PAT Wavefill Parity',
      pass: mcpBtnCheck.found && mcpBtnCheck.hasWaveSvg && mcpBtnCheck.hasSolidFill && mcpBtnCheck.hasTransparentBg
    });

    console.log('\n=======================================');
    console.log('ALL VERIFICATION RESULTS:');
    results.forEach(r => console.log(`${r.pass ? '✅ PASS' : '❌ FAIL'}: ${r.test}`));
    console.log('=======================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
  }
}

main();
