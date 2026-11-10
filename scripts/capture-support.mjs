import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findBrowser() {
  const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge64 = 'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe';
  const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  for (const p of [edge, edge64, chrome]) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const ARTIFACT_DIR = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));
  await page.keyboard.press('Space');
  await page.click('body').catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'support-page-dark.png'), fullPage: true });
  console.log('Saved dark mode support page screenshot.');

  const themeBtn = await page.$('button[aria-label*="theme" i], button[title*="theme" i], button:has(svg.lucide-sun), button:has(svg.lucide-moon)');
  if (themeBtn) {
    await themeBtn.click();
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'support-page-light.png'), fullPage: true });
    console.log('Saved light mode support page screenshot.');
  }

  await browser.close();
}

run();
