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

    await page.goto('http://localhost:5173/benefits', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 800));

    // Dismiss splash if present
    await page.keyboard.press('Space');
    await page.click('body').catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // Check if initial theme is dark; if dark, press 'd' to toggle React state to light
    const initiallyDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (initiallyDark) {
      console.log('App is dark, pressing "d" to toggle to light...');
      await page.keyboard.press('d');
      await new Promise(r => setTimeout(r, 2000)); // wait for shader and canvas to re-render in light mode
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 800));

    // Capture Light Mode Hero
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lightfall-hero-light.png'), fullPage: false });
    console.log('Saved lightfall-hero-light.png!');

    // Press 'd' to toggle to Dark Mode
    console.log('Pressing "d" to toggle to dark...');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 800));

    // Capture Dark Mode Hero
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lightfall-hero-dark.png'), fullPage: false });
    console.log('Saved lightfall-hero-dark.png!');

    console.log('Done!');
  } finally {
    await browser.close();
  }
}

run();
