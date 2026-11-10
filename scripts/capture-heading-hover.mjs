import puppeteer from 'puppeteer-core';

async function captureHeading() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  // Light Mode - Idle
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/heading-idle-light.png',
    clip: { x: 300, y: 50, width: 680, height: 180 }
  });

  // Light Mode - Hover on Heading
  const h1 = await page.$('h1');
  if (h1) {
    await h1.hover();
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/heading-hover-light.png',
      clip: { x: 300, y: 50, width: 680, height: 180 }
    });
  }

  // Dark Mode - Hover on Heading
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 300));
  if (h1) {
    await h1.hover();
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/heading-hover-dark.png',
      clip: { x: 300, y: 50, width: 680, height: 180 }
    });
  }

  console.log('Successfully captured heading screenshots!');
  await browser.close();
}

captureHeading().catch(console.error);
