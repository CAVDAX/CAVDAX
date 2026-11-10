import puppeteer from 'puppeteer-core';

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('cavdax_dev_vault_v1', JSON.stringify({
      authenticatedAt: Date.now(),
      user: { login: 'suneetchugh-dev', name: 'Suneet Chugh' },
      authorizedAs: 'suneetchugh-dev'
    }));
    sessionStorage.setItem('cavdax_has_evaluation_pass', 'true');
  });

  await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 400));

  // Click any sponsor button
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Sponsor') || b.textContent.includes('Cookie') || b.textContent.includes('Pass'));
    if (btn) {
      btn.click();
      return btn.textContent;
    }
    return false;
  });
  console.log('Clicked button text:', clicked);

  await new Promise(r => setTimeout(r, 400));

  // Full screenshot
  await page.screenshot({
    path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/support-toast-live.png'
  });
  console.log('Saved support-toast-live.png');

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
