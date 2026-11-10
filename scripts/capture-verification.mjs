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

async function run() {
  const browser = await puppeteer.launch({
    executablePath: findSystemBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    // 1. Benefits Page (Light Mode)
    console.log('[1/2] Capturing Lightfall Hero in Light Mode...');
    await page.goto('http://localhost:5173/benefits', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.press('Space');
    await page.click('body').catch(() => {});
    await new Promise(r => setTimeout(r, 1200));

    // Ensure Light Mode
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cavdax_theme', 'light');
    });
    // Trigger react state update if needed via 'd'
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (isDark) {
      await page.keyboard.press('d');
      await new Promise(r => setTimeout(r, 1000));
    }
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lightfall-hero-light.png'), fullPage: false });

    // 2. Benefits Page (Dark Mode)
    console.log('[2/2] Capturing Lightfall Hero in Dark Mode...');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'lightfall-hero-dark.png'), fullPage: false });

    console.log('Capture finished successfully!');
  } finally {
    await browser.close();
  }
}

run();
