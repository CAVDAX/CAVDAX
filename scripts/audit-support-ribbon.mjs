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

async function auditSupportRibbon() {
  const browserPath = findSystemBrowser();
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,1100'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });

    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
    
    // Set sponsor state in localStorage
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_is_sponsor', 'true');
      localStorage.setItem('cavdax_sponsor_tier', 'Core Patron');
      localStorage.setItem('cavdax_user_session', JSON.stringify({
        username: 'suneetchugh-dev',
        login: 'suneetchugh-dev',
        name: 'Suneet Chugh',
        avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4',
        is_sponsor: true,
        sponsor_tier: 'Core Patron'
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to recognition ribbon
    await page.evaluate(() => {
      const ribbon = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('Recognition Preference:'));
      if (ribbon) ribbon.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-support-ribbon-strip-dark.png'),
      fullPage: false
    });
    console.log('[Audit] Saved audit-support-ribbon-strip-dark.png');

    // Click "Edit Recognition" button
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Edit Recognition'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('[Audit] Clicked Edit Recognition:', clicked);
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-support-consent-modal-dark.png'),
      fullPage: false
    });
    console.log('[Audit] Saved audit-support-consent-modal-dark.png');

    // Toggle to Light Mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-support-consent-modal-light.png'),
      fullPage: false
    });
    console.log('[Audit] Saved audit-support-consent-modal-light.png');

  } finally {
    await browser.close();
  }
}

auditSupportRibbon().catch(err => {
  console.error('[Ribbon Audit Error]', err);
  process.exit(1);
});
