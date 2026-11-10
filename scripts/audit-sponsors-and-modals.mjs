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
    console.error('No Chrome or Edge binary found.');
    process.exit(1);
  }

  console.log(`[Audit] Launching system browser: ${browserPath}`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // 1. Audit Sponsors & Backers Showcase Page (Dark Mode)
    console.log('[Audit] Navigating to http://localhost:5173/sponsors ...');
    await page.goto('http://localhost:5173/sponsors', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000)); // allow React & Framer Motion to settle

    const darkPath = path.join(ARTIFACT_DIR, 'sponsors-page-dark.png');
    await page.screenshot({ path: darkPath, fullPage: true });
    console.log(`[Audit] Saved dark mode sponsors showcase screenshot: ${darkPath}`);

    // 2. Toggle Theme to Light Mode
    console.log('[Audit] Toggling to Light Mode...');
    const themeBtn = await page.$('button[aria-label*="theme" i], button[title*="theme" i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)');
    if (themeBtn) {
      await themeBtn.click();
      await new Promise(r => setTimeout(r, 600));
    } else {
      // Direct class toggle
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('cavdax_theme', 'light');
      });
      await new Promise(r => setTimeout(r, 600));
    }

    const lightPath = path.join(ARTIFACT_DIR, 'sponsors-page-light.png');
    await page.screenshot({ path: lightPath, fullPage: true });
    console.log(`[Audit] Saved light mode sponsors showcase screenshot: ${lightPath}`);

    // Switch back to dark for consistency
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_theme', 'dark');
    });
    await new Promise(r => setTimeout(r, 300));

    // 3. Audit Support Page & Backer Consent Modal
    console.log('[Audit] Navigating to http://localhost:5173/support ...');
    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    // Ensure logged-in mock session & hackathon mode active
    await page.evaluate(() => {
      localStorage.setItem('cavdax_user_session', JSON.stringify({
        id: 76564569,
        login: 'suneetchugh-dev',
        name: 'Suneet Chugh',
        avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4'
      }));
      localStorage.setItem('cavdax_hackathon_mode', 'true');
      window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
      window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: true } }));
    });
    await new Promise(r => setTimeout(r, 1000));

    // Look for evaluation pass sponsor button on Cookie or 2 Cups tier
    console.log('[Audit] Triggering 1-Click Evaluation Sponsor pass to test Consent Modal...');
    const evalButtons = await page.$$('button');
    let clicked = false;
    for (const btn of evalButtons) {
      const text = await page.evaluate(el => el.textContent || '', btn);
      if (text.includes('Evaluation Sponsor') || text.includes('Activate Sponsor Pass') || text.includes('Cookie Pass') || text.includes('Pass Active') || text.includes('Activate')) {
        await btn.click();
        clicked = true;
        break;
      }
    }

    if (!clicked) {
      // Fallback: Dispatch sponsor-registered event or call trigger directly
      console.log('[Audit] Calling evaluation sponsor activation directly...');
      await page.evaluate(async () => {
        try {
          const res = await fetch('/api/billing/activate-evaluation-sponsor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              tier_id: 2,
              user_override: { id: 'eval_auditor', login: 'audit-engineer', name: 'Systems Auditor' }
            })
          });
          const data = await res.json();
          window.dispatchEvent(new CustomEvent('cavdax:sponsor-registered', { detail: data.backer }));
        } catch (e) {
          console.error(e);
        }
      });
      await new Promise(r => setTimeout(r, 800));
    }

    await new Promise(r => setTimeout(r, 1000));
    const modalPath = path.join(ARTIFACT_DIR, 'backer-consent-modal.png');
    await page.screenshot({ path: modalPath, fullPage: false });
    console.log(`[Audit] Saved backer consent modal screenshot: ${modalPath}`);

    // Test clicking "Anonymous Backer"
    console.log('[Audit] Selecting Anonymous Backer radio...');
    const radioLabels = await page.$$('label');
    for (const label of radioLabels) {
      const text = await page.evaluate(el => el.textContent || '', label);
      if (text.includes('Anonymous Backer')) {
        await label.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 400));
    const anonPath = path.join(ARTIFACT_DIR, 'backer-consent-anonymous.png');
    await page.screenshot({ path: anonPath, fullPage: false });
    console.log(`[Audit] Saved anonymous consent screenshot: ${anonPath}`);

    // Test keyboard escape dismissal
    console.log('[Audit] Testing keyboard Escape dismissal...');
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 500));
    const dismissedPath = path.join(ARTIFACT_DIR, 'backer-consent-dismissed.png');
    await page.screenshot({ path: dismissedPath, fullPage: false });
    console.log(`[Audit] Saved modal dismissed screenshot: ${dismissedPath}`);

    console.log('[Audit] All visual audits completed successfully.');
  } finally {
    await browser.close();
  }
}

runVisualAudit().catch((err) => {
  console.error('[Audit Error]', err);
  process.exit(1);
});
