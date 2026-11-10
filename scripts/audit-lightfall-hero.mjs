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

async function main() {
  const browserPath = findSystemBrowser();
  if (!browserPath) process.exit(1);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Navigate to /tier-benefits
    console.log('[Audit] Navigating to http://localhost:5173/tier-benefits ...');
    await page.goto('http://localhost:5173/tier-benefits', { waitUntil: 'domcontentloaded' });
    
    // Ensure dark theme initially
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_theme', 'dark');
    });
    // Wait for Lightfall WebGL animation to advance several frames
    await new Promise(r => setTimeout(r, 2500));

    // Capture Hero Viewport in Dark Mode
    const heroDarkPath = path.join(ARTIFACT_DIR, 'lightfall-hero-dark.png');
    await page.screenshot({ path: heroDarkPath, fullPage: false });
    console.log(`[Audit] Saved dark mode Lightfall hero screenshot: ${heroDarkPath}`);

    // Scroll slightly down to inspect Section 2 cards with updated backdrop-blur-xl
    await page.evaluate(() => {
      window.scrollTo({ top: 900, behavior: 'instant' });
    });
    await new Promise(r => setTimeout(r, 1200));
    const cardsDarkPath = path.join(ARTIFACT_DIR, 'lightfall-cards-dark.png');
    await page.screenshot({ path: cardsDarkPath, fullPage: false });
    console.log(`[Audit] Saved dark mode cards screenshot: ${cardsDarkPath}`);

    // Toggle to Light Mode
    console.log('[Audit] Toggling to Light Mode via keyboard shortcut "d"...');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 2500));

    const heroLightPath = path.join(ARTIFACT_DIR, 'lightfall-hero-light.png');
    await page.screenshot({ path: heroLightPath, fullPage: false });
    console.log(`[Audit] Saved light mode Lightfall hero screenshot: ${heroLightPath}`);

    // Return to dark
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_theme', 'dark');
    });
    console.log('[Audit] All Lightfall audit screenshots captured successfully.');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
