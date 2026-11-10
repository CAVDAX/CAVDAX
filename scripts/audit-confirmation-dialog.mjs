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

async function runConfirmationAudit() {
  const browserPath = findSystemBrowser();
  if (!browserPath) process.exit(1);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.evaluate(() => {
      localStorage.setItem('cavdax_user_session', JSON.stringify({
        id: 76564569,
        login: 'suneetchugh-dev',
        name: 'Suneet Chugh',
        avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4'
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    const rotateBtns = await page.$$('button');
    let clicked = false;
    for (const b of rotateBtns) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('Rotate Key')) {
        await b.click();
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await new Promise(r => setTimeout(r, 800));
      const rotateModalPath = path.join(ARTIFACT_DIR, 'confirmation-dialog-rotate-key.png');
      await page.screenshot({ path: rotateModalPath, fullPage: false });
      console.log(`[Audit] Saved API key rotation confirmation screenshot: ${rotateModalPath}`);
    } else {
      console.log('[Audit] Rotate Key button not found, checking page text...');
    }
  } finally {
    await browser.close();
  }
}

runConfirmationAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
