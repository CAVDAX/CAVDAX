import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

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

async function captureDowngradeDialogs() {
  const browserPath = findSystemBrowser();
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // ─────────────────────────────────────────────────────────
    // 1. CAPTURE SWITCH TO 2 CUPS (MEDIUM SIZE) - DARK MODE
    // ─────────────────────────────────────────────────────────
    console.log('[Capture] Navigating to http://localhost:5173/support (Dark Mode) ...');
    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });

    // Set Core Patron active sponsor state
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_is_sponsor', 'true');
      localStorage.setItem('cavdax_sponsor_tier', 'Core');
      localStorage.setItem('cavdax_user_session', JSON.stringify({
        username: 'suneetchugh-dev',
        login: 'suneetchugh-dev',
        name: 'Suneet Chugh',
        avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4',
        is_sponsor: true,
        sponsor_tier: 'Core'
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Click "Switch to 2 Cups" button
    console.log('[Capture] Clicking "Switch to 2 Cups" button...');
    const clicked2Cups = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Switch to 2 Cups') || b.textContent.includes('2 Cups'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('[Capture] Clicked Switch to 2 Cups:', clicked2Cups);
    await new Promise(r => setTimeout(r, 800));

    // Read dialog DOM lines
    const dialogLines = await page.evaluate(() => {
      const descEl = document.getElementById('confirm-dialog-desc');
      if (!descEl) return null;
      return Array.from(descEl.querySelectorAll('span')).map(s => s.textContent.trim());
    });
    console.log('[Dialog 2 Cups] Description Lines:', dialogLines);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'downgrade-dialog-2cups-human-dark.png'),
      fullPage: false
    });
    console.log('[Capture] Saved downgrade-dialog-2cups-human-dark.png');

    // ─────────────────────────────────────────────────────────
    // 2. CAPTURE SWITCH TO COOKIE (SMALL SIZE) - LIGHT MODE
    // ─────────────────────────────────────────────────────────
    console.log('\n[Capture] Toggling to Light Mode and clicking Switch to Cookie ...');
    // Dismiss current modal
    await page.keyboard.press('Escape');
    await new Promise(r => setTimeout(r, 400));

    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Click "Switch to Cookie" button
    const clickedCookie = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Switch to Cookie') || b.textContent.includes('Cookie'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('[Capture] Clicked Switch to Cookie:', clickedCookie);
    await new Promise(r => setTimeout(r, 800));

    const cookieDialogLines = await page.evaluate(() => {
      const descEl = document.getElementById('confirm-dialog-desc');
      if (!descEl) return null;
      return Array.from(descEl.querySelectorAll('span')).map(s => s.textContent.trim());
    });
    console.log('[Dialog Cookie] Description Lines:', cookieDialogLines);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'downgrade-dialog-cookie-human-light.png'),
      fullPage: false
    });
    console.log('[Capture] Saved downgrade-dialog-cookie-human-light.png');

  } finally {
    await browser.close();
  }
}

captureDowngradeDialogs().catch(err => {
  console.error('[Capture Error]', err);
  process.exit(1);
});
