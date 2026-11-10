import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

function findSystemBrowser() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of edgePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const ARTIFACT_DIR = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: findSystemBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // 1. Sponsors Page (Dark Mode)
    console.log('[1/4] Capturing Sponsors Page (Dark)...');
    await page.goto('http://localhost:5173/sponsors', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.press('Space');
    await page.click('body').catch(() => {});
    await new Promise(r => setTimeout(r, 1500));
    // Ensure dark
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!isDark) {
      await page.keyboard.press('d');
      await new Promise(r => setTimeout(r, 800));
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sponsors-clean-dark.png'), fullPage: true });

    // 2. Sponsors Page (Light Mode)
    console.log('[2/4] Capturing Sponsors Page (Light)...');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sponsors-clean-light.png'), fullPage: true });

    // 3. Support Page (Light Mode)
    console.log('[3/4] Capturing Support Page (Light)...');
    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'support-clean-light.png'), fullPage: true });

    // 4. Support Page (Dark Mode)
    console.log('[4/4] Capturing Support Page (Dark)...');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'support-clean-dark.png'), fullPage: true });

    console.log('All final audit captures completed!');
  } finally {
    await browser.close();
  }
}

run();
