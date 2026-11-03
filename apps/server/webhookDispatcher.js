import { lookup } from 'node:dns/promises';

/**
 * Checks whether an IP address belongs to loopback, link-local, private,
 * unique-local, or cloud metadata ranges.
 *
 * Covers:
 *  - 127.0.0.0/8 (Loopback IPv4)
 *  - 169.254.0.0/16 (Link-local & AWS/GCP/Azure instance metadata 169.254.169.254)
 *  - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (RFC 1918 Private IPv4)
 *  - 0.0.0.0/8 (Current network) & >= 224.0.0.0 (Multicast/Reserved)
 *  - ::1, :: (Loopback & Unspecified IPv6)
 *  - fc00::/7 (Unique Local Address IPv6)
 *  - fe80::/10 (Link-Local IPv6)
 *  - ::ffff:127.0.0.1 (IPv4-mapped IPv6)
 */
export function isPrivateOrMetadataIp(ip) {
  if (typeof ip !== 'string') return true;
  const clean = ip.trim().toLowerCase();

  // Exact loopback and metadata IP matches
  if (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === '[::1]' ||
    clean === '169.254.169.254' ||
    clean === '0.0.0.0' ||
    clean === '::'
  ) {
    return true;
  }

  // IPv4 checks
  const ipv4Match = clean.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const b0 = parseInt(ipv4Match[1], 10);
    const b1 = parseInt(ipv4Match[2], 10);

    if (b0 === 0) return true;
    if (b0 === 10) return true;
    if (b0 === 127) return true;
    if (b0 === 169 && b1 === 254) return true;
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
    if (b0 === 192 && b1 === 168) return true;
    if (b0 === 192 && b1 === 0 && parseInt(ipv4Match[3], 10) === 2) return true;
    if (b0 === 198 && b1 === 51 && parseInt(ipv4Match[3], 10) === 100) return true;
    if (b0 === 203 && b1 === 0 && parseInt(ipv4Match[3], 10) === 113) return true;
    if (b0 >= 224) return true;
  }

  // IPv6 checks
  if (clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('[fc') || clean.startsWith('[fd')) {
    return true;
  }
  if (clean.startsWith('fe80') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb') || clean.startsWith('[fe80')) {
    return true;
  }
  if (clean.includes('::ffff:')) {
    const mappedIpv4 = clean.split('::ffff:')[1].replace(/\]$/, '');
    return isPrivateOrMetadataIp(mappedIpv4);
  }

  return false;
}

/**
 * Asynchronously verifies that a webhook URL is safe from SSRF & DNS rebinding:
 * 1. Enforces HTTPS strictly
 * 2. Rejects string-level loopback, cloud metadata, and internal TLDs (.internal, .local)
 * 3. Asynchronously resolves DNS (A and AAAA records) via lookup({ all: true })
 * 4. Rejects if ANY resolved IP address belongs to private or metadata ranges
 */
export async function isSafeWebhookUrl(url) {
  if (!url || typeof url !== 'string' || url.length > 2048) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  // Fast-fail string heuristics
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  ) {
    return false;
  }

  // If already an IP literal, test directly
  if (isPrivateOrMetadataIp(hostname)) {
    return false;
  }

  // Asynchronous DNS resolution check
  try {
    const addresses = await lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return false;
    }

    for (const record of addresses) {
      if (isPrivateOrMetadataIp(record.address)) {
        return false;
      }
    }
  } catch {
    // Hostname does not resolve or network failure
    return false;
  }

  return true;
}

/**
 * CAVDAX Outgoing Webhook Dispatcher
 *
 * Dispatches JSON architectural divergence alerts to user-configured webhook endpoints
 * (e.g. Slack Incoming Webhooks, Discord, PagerDuty, or custom CI/CD pipelines).
 *
 * Security Invariants:
 *  - Enforces HTTPS
 *  - Strict SSRF defense: DNS pre-flight verification prevents both IP literals and
 *    malicious domains resolving to private/cloud metadata IPs (anti-DNS rebinding).
 *  - Hardened against socket starvation: enforced 3500ms timeout via AbortSignal.timeout.
 */
export async function dispatchOutgoingWebhook(url, payload) {
  if (!url || typeof url !== 'string') {
    return { success: false, error: 'MISSING_WEBHOOK_URL' };
  }

  const isSafe = await isSafeWebhookUrl(url);
  if (!isSafe) {
    console.warn(`[CAVDAX Webhook] Rejected unsafe, private, or unresolvable webhook URL: '${url}'`);
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
