import puppeteer from 'puppeteer-core';

async function captureCard() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/mcp', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));

  const cardHandle = await page.evaluateHandle(() => {
    const cards = Array.from(document.querySelectorAll('.neo-glass-card'));
    return cards.find(c => c.textContent.includes('@cavdax/mcp-server'));
  });

  if (cardHandle && cardHandle.asElement()) {
    // Light
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await new Promise(r => setTimeout(r, 500));
    await cardHandle.asElement().screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/npm-banner-light.png'
    });

    // Dark
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise(r => setTimeout(r, 500));
    await cardHandle.asElement().screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/npm-banner-dark.png'
    });
    console.log('Saved npm-banner screenshots');
  } else {
    console.log('Card not found');
  }

  await browser.close();
}

captureCard().catch(console.error);
