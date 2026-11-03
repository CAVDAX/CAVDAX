import { isValidPushEndpoint } from './webPush.js';

/**
 * CAVDAX Outgoing Webhook Dispatcher
 *
 * Dispatches JSON architectural divergence alerts to user-configured webhook endpoints
 * (e.g. Slack Incoming Webhooks, Discord, PagerDuty, or custom CI/CD pipelines).
 *
 * Security Invariants:
 *  - Enforces HTTPS
 *  - Strict SSRF defense: rejects IPv4 private subnets (RFC 1918), loopback, link-local,
 *    IPv6 ULA/link-local, and AWS/GCP/Azure cloud metadata (169.254.169.254).
 *  - Hardened against socket starvation: enforced 3500ms timeout via AbortSignal.timeout.
 */
export async function dispatchOutgoingWebhook(url, payload) {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'MISSING_WEBHOOK_URL' };
  }

  if (!isValidPushEndpoint(url)) {
    console.warn(`[CAVDAX Webhook] Rejected invalid or restricted webhook URL: '${url}'`);
    return { success: false, error: 'RESTRICTED_OR_INVALID_WEBHOOK_URL' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CAVDAX-Divergence-Radar/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500)
    });

    if (!res.ok) {
      console.warn(`[CAVDAX Webhook] Remote webhook endpoint returned status ${res.status}`);
      return { success: false, status: res.status };
    }

    return { success: true };
  } catch (err) {
    console.warn('[CAVDAX Webhook] Network failure delivering webhook:', err.message);
    return { success: false, error: err.message };
  }
}
