import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    
    await page.goto('http://localhost:5173/sponsors', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Dark Mode Full Page
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_theme', 'dark');
    });
    await new Promise(r => setTimeout(r, 600));

    const darkPath = path.join(ARTIFACT_DIR, 'sponsors-clean-bottom-dark.png');
    await page.screenshot({ path: darkPath, fullPage: true });
    console.log(`Saved ${darkPath}`);

    // Light Mode Full Page
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 800));

    const lightPath = path.join(ARTIFACT_DIR, 'sponsors-clean-bottom-light.png');
    await page.screenshot({ path: lightPath, fullPage: true });
    console.log(`Saved ${lightPath}`);

  } finally {
    await browser.close();
  }
}

run().catch(console.error);
