import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findSystemBrowser() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
  ];
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  ];
  for (const p of [...edgePaths, ...chromePaths]) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

const ARTIFACT_DIR = 'C:/Users/krish/.gemini/antigravity/brain/38440976-4035-486f-afea-97d85d33f0fb';

async function auditAll() {
  const browserPath = findSystemBrowser();
  if (!browserPath) {
    console.error('No Chrome or Edge browser binary found.');
    process.exit(1);
  }

  console.log(`[Visual Audit] Using browser binary: ${browserPath}`);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

    // Enable console logging from page
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[Browser Console Error] ${msg.text()}`);
    });

    // ─────────────────────────────────────────────────────────
    // 1. AUDIT PROFILE PAGE: ACTIVE CORE PATRON (Dark Mode)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 1. AUDITING PROFILE PAGE: ACTIVE CORE PATRON ---');
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Inject active Core Patron state in localStorage
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('cavdax_is_sponsor', 'true');
      localStorage.setItem('cavdax_sponsor_tier', 'Core Patron');
      localStorage.setItem('cavdax_sponsor_is_active', 'true');
      localStorage.setItem('cavdax_sponsor_created_at', '2026-03-15T10:00:00.000Z');
      localStorage.setItem('cavdax_user_session', JSON.stringify({
        username: 'suneetchugh-dev',
        login: 'suneetchugh-dev',
        name: 'Suneet Chugh',
        avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4',
        is_sponsor: true,
        sponsor_tier: 'Core Patron'
      }));
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    // Verify Active Badge DOM text & title
    const activeBadgeData = await page.evaluate(() => {
      // Find the sponsor badge button next to handle
      const btns = Array.from(document.querySelectorAll('button'));
      const sponsorBtn = btns.find(b => b.textContent.includes('Core Patron') || b.title?.includes('Core Patron'));
      return {
        text: sponsorBtn ? sponsorBtn.textContent.trim() : null,
        title: sponsorBtn ? sponsorBtn.getAttribute('title') : null,
        outerHTML: sponsorBtn ? sponsorBtn.outerHTML : null
      };
    });
    console.log('[Profile: Active Core Patron] DOM Text:', activeBadgeData.text);
    console.log('[Profile: Active Core Patron] Tooltip Title:', activeBadgeData.title);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-profile-active-core-dark.png'),
      fullPage: false
    });

    // ─────────────────────────────────────────────────────────
    // 2. AUDIT PROFILE PAGE: HISTORICAL CORE PATRON '26 (Dark Mode)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 2. AUDITING PROFILE PAGE: HISTORICAL CORE PATRON 2026 ---');
    await page.evaluate(() => {
      localStorage.setItem('cavdax_sponsor_is_active', 'false');
      localStorage.setItem('cavdax_sponsor_created_at', '2026-04-10T10:00:00.000Z');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    const past26BadgeData = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sponsorBtn = btns.find(b => b.textContent.includes('Core Patron') || b.title?.includes('Core Patron'));
      return {
        text: sponsorBtn ? sponsorBtn.textContent.trim() : null,
        title: sponsorBtn ? sponsorBtn.getAttribute('title') : null,
        outerHTML: sponsorBtn ? sponsorBtn.outerHTML : null
      };
    });
    console.log('[Profile: Past Core Patron 2026] DOM Text:', past26BadgeData.text);
    console.log('[Profile: Past Core Patron 2026] Tooltip Title:', past26BadgeData.title);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-profile-past-core-26-dark.png'),
      fullPage: false
    });

    // ─────────────────────────────────────────────────────────
    // 3. AUDIT PROFILE PAGE: HISTORICAL CORE PATRON '25 (Light Mode)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 3. AUDITING PROFILE PAGE: HISTORICAL CORE PATRON 2025 (Light Mode) ---');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cavdax_sponsor_is_active', 'false');
      localStorage.setItem('cavdax_sponsor_created_at', '2025-08-20T10:00:00.000Z');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1500));

    const past25BadgeData = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sponsorBtn = btns.find(b => b.textContent.includes('Core Patron') || b.title?.includes('Core Patron'));
      return {
        text: sponsorBtn ? sponsorBtn.textContent.trim() : null,
        title: sponsorBtn ? sponsorBtn.getAttribute('title') : null
      };
    });
    console.log('[Profile: Past Core Patron 2025] DOM Text:', past25BadgeData.text);
    console.log('[Profile: Past Core Patron 2025] Tooltip Title:', past25BadgeData.title);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-profile-past-core-25-light.png'),
      fullPage: false
    });

    // ─────────────────────────────────────────────────────────
    // 4. AUDIT EDIT RECOGNITION MODAL (Click Test on Profile)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 4. AUDITING EDIT RECOGNITION MODAL TRIGGER ---');
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Edit Recognition') || b.textContent.includes('Recognition Preferences'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('[Profile: Edit Recognition] Click successful:', clicked);
    await new Promise(r => setTimeout(r, 800));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-profile-recognition-modal-light.png'),
      fullPage: false
    });

    // ─────────────────────────────────────────────────────────
    // 5. AUDIT SUPPORT PAGE: VERIFIED BACKERS DIRECTORY (Dark Mode)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 5. AUDITING SUPPORT PAGE: BACKERS DIRECTORY & SHOWCASE ---');
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll down to Verified Backers Directory
    await page.evaluate(() => {
      const section = Array.from(document.querySelectorAll('h2, h3')).find(el => el.textContent.includes('Verified Backers') || el.textContent.includes('Backers Directory'));
      if (section) section.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-support-backers-directory-dark.png'),
      fullPage: false
    });

    // ─────────────────────────────────────────────────────────
    // 6. AUDIT SPONSORS PAGE: CORE PATRONS SHOWCASE (Dark & Light)
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 6. AUDITING SPONSORS PAGE: CORE PATRONS SHOWCASE ---');
    await page.goto('http://localhost:5173/sponsors', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect Core Patrons badge text in SponsorsPage
    const sponsorsPageBadges = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('span, div'))
        .filter(el => el.textContent.includes('Core Patron') && el.title?.includes('Core Patron'))
        .map(el => ({ text: el.textContent.trim(), title: el.getAttribute('title') }));
      return badges;
    });
    console.log('[SponsorsPage: Core Patrons Badges]:', JSON.stringify(sponsorsPageBadges, null, 2));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-sponsors-showcase-dark.png'),
      fullPage: false
    });

    // ─────────────────────────────────────────────────────────
    // 7. AUDIT SUBSYSTEM ERROR BOUNDARY COMPONENT
    // ─────────────────────────────────────────────────────────
    console.log('\n--- 7. AUDITING SUBSYSTEM ERROR BOUNDARY COMPONENT ---');
    // Navigate to a test page or render the Error Boundary directly in the DOM
    await page.goto('http://localhost:5173/support', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });

    // Inject the SubsystemErrorBoundary HTML directly to inspect current visual style in dark mode
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'error-boundary-test-container';
      container.style.position = 'fixed';
      container.style.inset = '0';
      container.style.zIndex = '999999';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.background = '#090A0C';

      container.innerHTML = `
        <div class="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0D11] p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden text-center flex flex-col items-center">
          <div class="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
            <div class="absolute inset-0 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px] opacity-25"></div>
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-400/[0.06] blur-2xl rounded-full"></div>
          </div>
          <div class="relative z-10 flex flex-col items-center w-full">
            <div class="relative mb-3 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7 text-amber-400 stroke-[1.75]">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 class="text-base sm:text-lg font-bold font-mono tracking-tight text-white leading-snug">
              Tier Capabilities & Governance Temporarily Unavailable
            </h2>
            <div class="flex flex-col gap-1 text-xs text-slate-400 font-mono mt-2 w-full max-w-sm">
              <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
                Isolated unexpected operational event in Tier Capabilities & Governance.
              </span>
              <span class="block whitespace-nowrap overflow-hidden text-ellipsis text-slate-500 text-[11px]">
                Navigation and other subsystems remain fully operational.
              </span>
            </div>
            <div class="mt-6 w-full max-w-xs">
              <button type="button" class="w-full h-9 flex items-center justify-center gap-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-mono font-semibold shadow-xs transition-all duration-200 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-current">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                <span>Restore Subsystem</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-boundary-card-current-dark.png'),
      fullPage: false
    });

    // Subsystem error boundary in light mode
    await page.evaluate(() => {
      const container = document.getElementById('error-boundary-test-container');
      container.style.background = '#F8FAFC';
      container.innerHTML = `
        <div class="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white/95 p-6 sm:p-8 shadow-xl backdrop-blur-md overflow-hidden text-center flex flex-col items-center">
          <div class="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
            <div class="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
            <div class="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 blur-2xl rounded-full"></div>
          </div>
          <div class="relative z-10 flex flex-col items-center w-full">
            <div class="relative mb-3 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="w-7 h-7 text-amber-500 stroke-[1.75]">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <h2 class="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-950 leading-snug">
              Tier Capabilities & Governance Temporarily Unavailable
            </h2>
            <div class="flex flex-col gap-1 text-xs text-slate-500 font-mono mt-2 w-full max-w-sm">
              <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
                Isolated unexpected operational event in Tier Capabilities & Governance.
              </span>
              <span class="block whitespace-nowrap overflow-hidden text-ellipsis text-slate-400 text-[11px]">
                Navigation and other subsystems remain fully operational.
              </span>
            </div>
            <div class="mt-6 w-full max-w-xs">
              <button type="button" class="w-full h-9 flex items-center justify-center gap-2 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-mono font-semibold shadow-xs transition-all duration-200 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5 text-current">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                <span>Restore Subsystem</span>
              </button>
            </div>
          </div>
        </div>
      `;
    });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'audit-boundary-card-current-light.png'),
      fullPage: false
    });

    console.log('\n[Visual Audit] All visual audits complete!');
  } finally {
    await browser.close();
  }
}

auditAll().catch(err => {
  console.error('[Visual Audit Error]', err);
  process.exit(1);
});
