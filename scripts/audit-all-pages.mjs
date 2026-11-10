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

async function run() {
  const browserPath = findSystemBrowser();
  if (!browserPath) {
    console.error('No Chrome or Edge binary found.');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // 1. Support Page (Dark)
    console.log('[1/5] Checking Support Page (Dark)...');
    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));
    // Clear any test localStorage evaluation key if present
    await page.evaluate(() => {
      localStorage.removeItem('cavdax_evaluation_sponsor');
      localStorage.removeItem('cavdax_evaluation_active');
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'support-page-dark.png'), fullPage: true });

    // 2. Support Page (Light)
    console.log('[2/5] Checking Support Page (Light)...');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'support-page-light.png'), fullPage: true });

    // Switch back to dark
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 500));

    // 3. Sponsors Page (Dark)
    console.log('[3/5] Checking Sponsors Page (Dark)...');
    await page.goto('http://localhost:5173/sponsors', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sponsors-page-dark.png'), fullPage: true });

    // 4. Sponsors Page (Light)
    console.log('[4/5] Checking Sponsors Page (Light)...');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'sponsors-page-light.png'), fullPage: true });

    // 5. Tier Benefits Page (Light Hero)
    console.log('[5/5] Checking Tier Benefits Page (Light Hero)...');
    await page.goto('http://localhost:5173/tiers', { waitUntil: 'domcontentloaded', timeout: 15000 });
    // It should be light mode right now
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lightfall-hero-light.png'), fullPage: false });

    console.log('All verification screenshots captured successfully!');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    await browser.close();
  }
}

run();
