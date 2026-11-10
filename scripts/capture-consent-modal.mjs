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
  await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    localStorage.setItem('cavdax_user_session', JSON.stringify({
      id: 76564569,
      login: 'suneetchugh-dev',
      name: 'Suneet Chugh',
      avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4'
    }));
    localStorage.setItem('cavdax_hackathon_mode', 'true');
    window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
    window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: true } }));
  });
  await new Promise(r => setTimeout(r, 1000));

  const btns = await page.$$('button');
  for (const b of btns) {
    const text = await page.evaluate(el => el.textContent || '', b);
    if (text.includes('Switch to 2 Cups') || text.includes('Switch to Cookie')) {
      await b.click();
      console.log('Clicked sponsor button:', text);
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1200));
  const shotPath = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/consent-modal-live.png';
  await page.screenshot({ path: shotPath });
  console.log('Saved:', shotPath);
  await browser.close();
}

capture().catch(console.error);
