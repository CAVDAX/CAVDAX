import puppeteer from 'puppeteer-core';

async function captureMcp() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/mcp', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  // Find the container enclosing @cavdax/mcp-server
  const heroCard = await page.evaluateHandle(() => {
    const textEl = Array.from(document.querySelectorAll('span')).find(s => s.textContent.includes('@cavdax/mcp-server'));
    return textEl ? textEl.closest('.p-5') || textEl.parentElement.parentElement.parentElement : null;
  });

  if (heroCard && heroCard.asElement()) {
    // Light mode
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await new Promise(r => setTimeout(r, 400));
    await heroCard.asElement().screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/mcp-card-light.png'
    });
    console.log('Saved mcp-card-light.png');

    // Dark mode
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise(r => setTimeout(r, 400));
    await heroCard.asElement().screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/mcp-card-dark.png'
    });
    console.log('Saved mcp-card-dark.png');
  } else {
    console.error('Could not find hero card');
  }

  await browser.close();
}

captureMcp().catch(console.error);
