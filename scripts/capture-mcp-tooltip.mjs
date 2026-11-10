import puppeteer from 'puppeteer-core';

async function capture() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,1000']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000, deviceScaleFactor: 2 });

  await page.goto('http://localhost:5173/mcp', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  const downloadLink = await page.$('a[href*="npmjs.com/package/@cavdax/mcp-server"]');
  if (!downloadLink) {
    await browser.close();
    return;
  }
  await downloadLink.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await new Promise(r => setTimeout(r, 400));

  // 1. Dark Mode
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 300));
  let box = await downloadLink.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/mcp-tooltip-full-dark.png',
      clip: {
        x: 100,
        y: Math.max(0, box.y - 70),
        width: 1080,
        height: 200
      }
    });
    console.log('Saved mcp-tooltip-full-dark.png');
  }

  // 2. Light Mode
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await new Promise(r => setTimeout(r, 300));
  box = await downloadLink.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/mcp-tooltip-full-light.png',
      clip: {
        x: 100,
        y: Math.max(0, box.y - 70),
        width: 1080,
        height: 200
      }
    });
    console.log('Saved mcp-tooltip-full-light.png');
  }

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
