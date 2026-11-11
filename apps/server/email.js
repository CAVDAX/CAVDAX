/**
 * CAVDAX Architectural Invalidation Alert Dispatcher (Resend API)
 *
 * Dispatches high-priority, actionable causal divergence alerts when an
 * architecture decision is invalidated by a superseding ADR, breaking commit,
 * or concurrent lock race.
 *
 * Implements:
 *   - Native fetch to Resend REST API (zero npm bloat)
 *   - Sliding-window alert debouncer (prevents spam on rapid git pushes)
 *   - Monochromatic, developer-console HTML aesthetic
 *   - Actionable causal provenance & 1-click remediation links
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEBOUNCE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// In-memory rate limiting map: `${recipient}:${decisionId}` -> timestamp
const alertDebounceMap = new Map();

/**
 * Clean up stale debounce entries periodically (unref so process can exit cleanly).
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of alertDebounceMap.entries()) {
    if (now - timestamp > DEBOUNCE_WINDOW_MS) {
      alertDebounceMap.delete(key);
    }
  }
}, 60 * 1000).unref();

/**
 * Builds the monochromatic developer email template.
 */

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildEmailHtml({
  repo,
  decisionId,
  decisionTitle,
  breakingSourceId,
  breakingSourceTitle,
  violationPaths = [],
  hudUrl,
  remediationCli
}) {
  const safeRepo = escapeHtml(repo);
  const safeDecisionId = escapeHtml(decisionId);
  const safeDecisionTitle = escapeHtml(decisionTitle);
  const safeBreakingSourceId = escapeHtml(breakingSourceId);
  const safeBreakingSourceTitle = escapeHtml(breakingSourceTitle);

  const formattedViolationPath = violationPaths && violationPaths.length > 0
    ? (Array.isArray(violationPaths[0]) ? violationPaths[0].join(' ➔ ') : String(violationPaths[0]))
    : `Decision:${decisionId} ➔ Fact:Stale ➔ Source:${breakingSourceId}`;
  const safeViolationPath = escapeHtml(formattedViolationPath);

  let resolvedHudUrl = 'https://cavdax.sahnirmaan.live';
  if (typeof hudUrl === 'string' && (hudUrl.startsWith('https://') || hudUrl.startsWith('http://localhost'))) {
    resolvedHudUrl = hudUrl;
  }

  const rawCli = remediationCli || `npx cavdax mcp -> revalidate_decision("${breakingSourceId}", "${decisionId}")`;
  const safeCli = escapeHtml(rawCli);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAVDAX Architectural Divergence Alert</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #000000;
      color: #E4E4E7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    .email-container {
      max-width: 600px;
      margin: 32px auto;
      background-color: #0A0A0A;
      border: 1px solid #27272A;
      border-radius: 12px;
      overflow: hidden;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background-color: #18181B;
      color: #F4F4F5;
      border: 1px solid #3F3F46;
      margin-bottom: 12px;
    }
    .title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: -0.02em;
    }
    .subtitle {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #A1A1AA;
      line-height: 1.5;
    }
    .table-box {
      width: 100%;
      background-color: #121217;
      border: 1px solid #27272A;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .table-box td {
      padding: 10px 14px;
      border-bottom: 1px solid #1C1C22;
      font-size: 13px;
      vertical-align: top;
    }
    .table-box tr:last-child td {
      border-bottom: none;
    }
    .label-col {
      width: 140px;
      color: #71717A;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .val-col {
      color: #F4F4F5;
      font-weight: 500;
    }
    .code-block {
      background-color: #050507;
      border: 1px solid #27272A;
      border-radius: 6px;
      padding: 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #E4E4E7;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      margin: 10px 0 24px 0;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      color: #71717A;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 20px 0 0 0;
    }
    .cta-button {
      display: inline-block;
      width: 100%;
      text-align: center;
      box-sizing: border-box;
      padding: 13px 24px;
      background-color: #FFFFFF;
      color: #000000;
      font-weight: 700;
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-decoration: none;
      border-radius: 8px;
    }
    .footer {
      padding: 20px 28px;
      border-top: 1px solid #27272A;
      background-color: #050507;
      font-size: 11px;
      color: #52525B;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div style="padding: 24px 28px; border-bottom: 1px solid #27272A; background-color: #0C0C0F;">
      <div class="badge">Gate Refusal Alert</div>
      <h1 class="title">Architectural Divergence Detected</h1>
      <p class="subtitle">An incoming change has superseded an architectural invariant in <strong>${safeRepo}</strong>.</p>
    </div>
    <div style="padding: 28px;">
      <table class="table-box" role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td class="label-col">Repository</td>
          <td class="val-col">${safeRepo}</td>
        </tr>
        <tr>
          <td class="label-col">Invalidated Decision</td>
          <td class="val-col" style="color: #FFFFFF; font-weight: 600;">${safeDecisionId} — ${safeDecisionTitle}</td>
        </tr>
        <tr>
          <td class="label-col">Superseded By</td>
          <td class="val-col">${safeBreakingSourceId} — ${safeBreakingSourceTitle}</td>
        </tr>
        <tr>
          <td class="label-col">Gate Verdict</td>
          <td class="val-col" style="font-family: ui-monospace, SFMono-Regular, monospace; font-weight: 700; color: #FFFFFF;">BLOCKED_SUPERSEDED_SOURCE</td>
        </tr>
      </table>

      <div class="section-title">Causal Invalidation Traversal</div>
      <div class="code-block">${safeViolationPath}</div>

      <div class="section-title">Remediation Directive (MCP / CLI)</div>
      <div class="code-block">${safeCli}</div>

      <p style="font-size: 13px; color: #A1A1AA; line-height: 1.5; margin: 0 0 20px 0;">
        Autonomous coding agents attempting to write code grounded in <code style="font-family: ui-monospace, SFMono-Regular, monospace; color: #FFFFFF; background-color: #18181B; padding: 2px 6px; border-radius: 4px; border: 1px solid #27272A;">${safeDecisionId}</code> are hard-rejected by the CAVDAX Causal Gate until revalidated against <code style="font-family: ui-monospace, SFMono-Regular, monospace; color: #FFFFFF; background-color: #18181B; padding: 2px 6px; border-radius: 4px; border: 1px solid #27272A;">${safeBreakingSourceId}</code>.
      </p>

      <a href="${resolvedHudUrl}" class="cta-button" target="_blank" rel="noopener noreferrer">
        Inspect Blast Radius in CAVDAX HUD ➔
      </a>
    </div>
    <div class="footer">
      This notification was dispatched automatically by CAVDAX Causal GraphBLAS Engine for <strong>${safeRepo}</strong>.<br>
      To modify alert thresholds, update Notification Preferences in your CAVDAX developer settings.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispatches an architectural invalidation alert email via Resend REST API.
 *
 * @param {object} params
 * @param {string} params.to                  - Recipient email address
 * @param {string} params.repo                - Repository identifier (e.g. 'owner/repo')
 * @param {string} params.decisionId          - Impacted Decision ID (e.g. 'DEC-102')
 * @param {string} [params.decisionTitle]     - Decision title
 * @param {string} params.breakingSourceId    - Superseding Source ID (e.g. 'ADR-002')
 * @param {string} [params.breakingSourceTitle] - Source title
 * @param {Array}  [params.violationPaths]    - Graph nodes in violation path
 * @param {string} [params.hudUrl]            - Direct deep link to CAVDAX UI
 * @param {string} [params.remediationCli]    - Recommended CLI command
 * @param {boolean} [params.force=false]      - Bypass debounce window (used for interactive demo triggers)
 * @returns {Promise<{ success: boolean, id?: string, debounced?: boolean, error?: string }>}
 */
export async function sendInvalidationEmail({
  to,
  repo = 'connected-repo',
  decisionId = 'DEC-102',
  decisionTitle = 'Generate Checkout Service with TokenAuth v1',
  breakingSourceId = 'ADR-002',
  breakingSourceTitle = 'Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned',
  violationPaths = [],
  hudUrl,
  remediationCli,
  force = false
}) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.warn(`[CAVDAX Email] Skipping invalid recipient email: '${to}'`);
    return { success: false, error: 'INVALID_RECIPIENT' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const isEnabled = process.env.EMAIL_ENABLED === 'true';
  const from = process.env.EMAIL_FROM || 'CAVDAX Divergence Alerts <alerts@cavdax.dev>';

  if (!isEnabled || !apiKey) {
    console.log(`[CAVDAX Email] Email alerts disabled or missing RESEND_API_KEY (EMAIL_ENABLED=${isEnabled})`);
    return { success: false, error: 'EMAIL_DISABLED_OR_NO_KEY' };
  }

  // Check alert debouncer
  const debounceKey = `${to.toLowerCase().trim()}:${decisionId}`;
  const now = Date.now();
  if (!force && alertDebounceMap.has(debounceKey)) {
    const elapsed = now - alertDebounceMap.get(debounceKey);
    if (elapsed < DEBOUNCE_WINDOW_MS) {
      console.log(`[CAVDAX Email] Alert for ${debounceKey} debounced (${Math.round(elapsed / 1000)}s since last alert)`);
      return { success: true, debounced: true };
    }
  }

  alertDebounceMap.set(debounceKey, now);

  const subject = `⛔ [CAVDAX] Divergence Alert: ${decisionId} superseded in ${repo}`;
  const html = buildEmailHtml({
    repo,
    decisionId,
    decisionTitle,
    breakingSourceId,
    breakingSourceTitle,
    violationPaths,
    hudUrl,
    remediationCli
  });

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[CAVDAX Email] Resend API error response:', data);
      return { success: false, error: data.message || 'RESEND_DISPATCH_FAILED' };
    }

    console.log(`[CAVDAX Email] ✅ Alert email sent to ${to} for ${decisionId} (Resend ID: ${data.id})`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[CAVDAX Email] Network failure sending email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches an official Direct Team Acknowledgment & Thank-You email to new sponsors.
 * Honors the Tier 3 "Direct Team Acknowledgment" contract with bespoke developer styling.
 */
export async function sendSponsorThankYouEmail({
  to,
  name = 'Supporter',
  tierName = 'Core Patron',
  amountPaise = 84900,
  currency = 'INR'
}) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    console.warn(`[CAVDAX Email] Skipping invalid sponsor recipient email: '${to}'`);
    return { success: false, error: 'INVALID_RECIPIENT' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const isEnabled = process.env.EMAIL_ENABLED === 'true';
  const from = process.env.EMAIL_FROM || 'CAVDAX Core Team <notifications@cavdax.dev>';

  if (!isEnabled || !apiKey) {
    console.log(`[CAVDAX Email] Sponsor email dispatch simulated (EMAIL_ENABLED=${isEnabled}, to=${to})`);
    return { success: true, simulated: true };
  }

  const safeName = escapeHtml(name);
  const safeTier = escapeHtml(tierName);
  const displayAmount = currency === 'INR' ? `₹${(amountPaise / 100).toFixed(0)}` : `$${(amountPaise / 100).toFixed(2)}`;
  const subject = `💎 [CAVDAX] Direct Team Acknowledgment: Thank you for backing us as a ${safeTier}!`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CAVDAX Supporter Acknowledgment</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #000000;
      color: #E4E4E7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .email-container {
      max-width: 600px;
      margin: 32px auto;
      background-color: #0A0A0A;
      border: 1px solid #27272A;
      border-radius: 12px;
      overflow: hidden;
    }
  </style>
</head>
<body style="background-color: #000000; margin: 0; padding: 24px 12px;">
  <div class="email-container">
    <div style="padding: 24px 28px; border-bottom: 1px solid #27272A; background-color: #121214;">
      <span style="font-family: monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #A1A1AA;">CAVDAX // CORE ARCHITECTURE</span>
      <h1 style="margin: 8px 0 0 0; font-size: 20px; font-weight: 700; color: #FFFFFF; font-family: monospace;">Direct Team Acknowledgment</h1>
    </div>
    <div style="padding: 28px;">
      <p style="font-size: 15px; line-height: 1.6; color: #E4E4E7; margin: 0 0 16px 0;">
        Dear <strong>${safeName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #A1A1AA; margin: 0 0 20px 0;">
        On behalf of the entire CAVDAX development team, we want to extend our heartfelt gratitude for your contribution of <strong>${displayAmount}</strong> as a <strong>${safeTier}</strong>.
      </p>
      <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
        <span style="font-family: monospace; font-size: 11px; text-transform: uppercase; color: #71717A; display: block; margin-bottom: 8px;">Active Supporter Privileges</span>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #D4D4D8; line-height: 1.8;">
          <li>Interactive 3D Backer Sphere Node with specular prominence</li>
          <li>Verified Backers Directory placement</li>
          <li>Permanent Sponsor badge & profile halo</li>
          <li>Direct team communication & roadmap collaboration</li>
        </ul>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #A1A1AA; margin: 0 0 24px 0;">
        You can inspect your live backer node on the 3D Fibonacci sphere or adjust your public display preferences at any time:
      </p>
      <div style="text-align: center; margin: 0 0 28px 0;">
        <a href="https://cavdax.sahnirmaan.live/sponsors" style="display: inline-block; background-color: #FFFFFF; color: #000000; font-family: monospace; font-weight: 600; font-size: 13px; text-decoration: none; padding: 10px 24px; border-radius: 6px;">
          View Backer Sphere →
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #71717A; margin: 0; border-top: 1px solid #27272A; padding-top: 16px;">
        With gratitude,<br>
        <strong style="color: #E4E4E7;">Suneet Chugh & The CAVDAX Team</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[CAVDAX Email] Sponsor email dispatch failed:', data);
      return { success: false, error: data.message || 'RESEND_DISPATCH_FAILED' };
    }
    console.log(`[CAVDAX Email] ✅ Sponsor thank-you email sent to ${to} (Resend ID: ${data.id})`);
    return { success: true, id: data.id };
  } catch (err) {
    console.error('[CAVDAX Email] Network failure sending sponsor thank-you email:', err.message);
    return { success: false, error: err.message };
  }
}
