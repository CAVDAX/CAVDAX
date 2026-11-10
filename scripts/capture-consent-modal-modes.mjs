import puppeteer from 'puppeteer-core';

async function captureModes() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,960']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 960, deviceScaleFactor: 2 });

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/auth/me')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            login: 'suneetchugh-dev',
            name: 'Suneet Chugh',
            avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4',
            role: 'user'
          }
        })
      });
    } else if (url.includes('/api/billing/activate-evaluation-sponsor')) {
      req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          sponsor_tier: '2 Cups Sponsor',
          backer: {
            id: 'spn_eval_suneetchugh-dev',
            name: 'Suneet Chugh',
            tier_id: 2,
            tierName: '2 Cups'
          }
        })
      });
    } else {
      req.continue();
    }
  });

  await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  // Find tier 2 button explicitly
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => b.textContent.includes('Switch to 2 Cups'));
    if (target) {
      target.click();
      return target.textContent.trim();
    }
    return null;
  });
  console.log('Clicked target button:', clicked);

  await new Promise(r => setTimeout(r, 1200));

  const modalFound = await page.evaluate(() => Boolean(document.querySelector('[role="dialog"]')));
  console.log('Modal found:', modalFound);

  // Dark Mode
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/consent-modal-dark-live.png' });
  console.log('Saved dark mode screenshot');

  // Light Mode
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/consent-modal-light-live.png' });
  console.log('Saved light mode screenshot');

  await browser.close();
}

captureModes().catch(console.error);
