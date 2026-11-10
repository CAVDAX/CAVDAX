import puppeteer from 'puppeteer-core';
import path from 'path';

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 2 });

    await page.goto('http://localhost:5173/console', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const mockRepo = {
        id: 99901,
        name: 'causal-governance-engine',
        full_name: 'cavdax/causal-governance-engine',
        default_branch: 'main',
        private: false
      };
      localStorage.setItem('cavdax_connected_repos', JSON.stringify([mockRepo]));
      localStorage.setItem('cavdax_user_session', JSON.stringify({
        id: 76564569,
        login: 'suneetchugh-dev',
        name: 'Suneet Chugh',
        avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4'
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Click 'Workspace: Demo Sandbox' button
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.includes('Workspace:')) {
        await b.click();
        console.log('Clicked Workspace dropdown button');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 600));

    // Click the connected repo div[role="button"]
    const roleButtons = await page.$$('div[role="button"]');
    for (const rb of roleButtons) {
      const text = await page.evaluate(el => el.textContent || '', rb);
      if (text.includes('causal-governance-engine')) {
        await rb.click();
        console.log('Selected connected repo from dropdown!');
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2500));

    // Find and click the Disconnect button
    const actionButtons = await page.$$('button');
    let clicked = false;
    for (const b of actionButtons) {
      const text = await page.evaluate(el => el.textContent || '', b);
      if (text.trim() === 'Disconnect' || text.includes('Disconnect')) {
        await b.click();
        console.log('Clicked Disconnect button:', text);
        clicked = true;
        break;
      }
    }

    if (clicked) {
      await new Promise(r => setTimeout(r, 1000));
      const shotPath = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb/confirmation-dialog-live.png';
      await page.screenshot({ path: shotPath });
      console.log('SUCCESS: Saved confirmation dialog screenshot to:', shotPath);
    } else {
      console.log('Disconnect button not found');
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
