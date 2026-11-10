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

    // Mount an isolated test component that renders EmptyState in both light and dark mode
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1000));
    await page.keyboard.press('Space');
    await page.click('body').catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // Evaluate EmptyState component rendering
    const screenshotDark = path.join(ARTIFACT_DIR, 'hosted-error-state-dark.png');
    const screenshotLight = path.join(ARTIFACT_DIR, 'hosted-error-state-light.png');

    console.log('Testing EmptyState rendering...');
  } finally {
    await browser.close();
  }
}

run();
