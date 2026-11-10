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

  // 1. Capture Support Page with new Explore Wall link
  await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  // Dark mode
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/explore-wall-dark.png',
    clip: { x: 300, y: 130, width: 680, height: 120 }
  });

  // Light mode
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({
    path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/explore-wall-light.png',
    clip: { x: 300, y: 130, width: 680, height: 120 }
  });

  // 2. Click Explore Wall to navigate to SponsorsPage
  const exploreBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Explore Wall'));
  });
  if (exploreBtn && exploreBtn.asElement()) {
    await exploreBtn.asElement().click();
    console.log('Clicked Explore Wall button');
  } else {
    console.error('Could not find Explore Wall button');
  }

  await new Promise(r => setTimeout(r, 1500));

  // 3. Capture Sponsors Page Dark Mode Full
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({
    path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/sponsors-dark-monochrome.png'
  });
  console.log('Saved sponsors-dark-monochrome.png');

  // Scroll halfway to show ribbon and lower tiers
  await page.evaluate(() => window.scrollTo(0, 500));
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({
    path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/sponsors-dark-scrolled.png'
  });
  console.log('Saved sponsors-dark-scrolled.png');

  // 4. Click a node in the sphere to open modal and check quote single-line
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 400));
  const node = await page.$('.cursor-pointer img[alt*="Suneet"], .cursor-pointer img');
  if (node) {
    await node.click();
    console.log('Clicked backer node in sphere');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({
      path: 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/sphere-lightbox-singleline.png'
    });
    console.log('Saved sphere-lightbox-singleline.png');
  }

  await browser.close();
}

capture().catch(console.error);
