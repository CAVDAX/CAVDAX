import { isIP, BlockList } from 'node:net';
import { lookup } from 'node:dns/promises';
import dns from 'node:dns';
import { Agent } from 'undici';

/**
 * Native Node.js CIDR BlockList for Private, Local, Multicast, Reserved, and Cloud Metadata IPs.
 * Covers:
 *  - 127.0.0.0/8 & ::1 (Loopback IPv4/IPv6)
 *  - 169.254.0.0/16 & fe80::/10 (Link-local & AWS/GCP/Azure instance metadata 169.254.169.254)
 *  - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (RFC 1918 Private IPv4)
 *  - 100.64.0.0/10 (CGNAT, including Alibaba Cloud metadata 100.100.100.200)
 *  - 198.18.0.0/15, 192.0.0.0/24, 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 (Test-nets / Benchmarks)
 *  - 0.0.0.0/8, 224.0.0.0/4, 240.0.0.0/4 (Current network, Multicast, Reserved)
 *  - ::, fc00::/7 (Unspecified, Unique Local Address IPv6 ULA)
 */
const restrictedIpBlockList = new BlockList();
// Loopback
restrictedIpBlockList.addSubnet('127.0.0.0', 8, 'ipv4');
restrictedIpBlockList.addSubnet('::1', 128, 'ipv6');
// Link-local & Cloud Metadata (AWS/GCP/Azure 169.254.169.254)
restrictedIpBlockList.addSubnet('169.254.0.0', 16, 'ipv4');
restrictedIpBlockList.addSubnet('fe80::', 10, 'ipv6');
// RFC 1918 Private IPv4
restrictedIpBlockList.addSubnet('10.0.0.0', 8, 'ipv4');
restrictedIpBlockList.addSubnet('172.16.0.0', 12, 'ipv4');
restrictedIpBlockList.addSubnet('192.168.0.0', 16, 'ipv4');
// CGNAT & Alibaba Cloud Metadata (100.100.100.200)
restrictedIpBlockList.addSubnet('100.64.0.0', 10, 'ipv4');
// Testing / Benchmark / Documentation / Protocol Assignments
restrictedIpBlockList.addSubnet('198.18.0.0', 15, 'ipv4');
restrictedIpBlockList.addSubnet('192.0.0.0', 24, 'ipv4');
restrictedIpBlockList.addSubnet('192.0.2.0', 24, 'ipv4');
restrictedIpBlockList.addSubnet('198.51.100.0', 24, 'ipv4');
restrictedIpBlockList.addSubnet('203.0.113.0', 24, 'ipv4');
// Current network, Multicast, Reserved
restrictedIpBlockList.addSubnet('0.0.0.0', 8, 'ipv4');
restrictedIpBlockList.addSubnet('224.0.0.0', 4, 'ipv4');
restrictedIpBlockList.addSubnet('240.0.0.0', 4, 'ipv4');
// IPv6 Unspecified & Unique Local Address (ULA fc00::/7)
restrictedIpBlockList.addSubnet('::', 128, 'ipv6');
restrictedIpBlockList.addSubnet('fc00::', 7, 'ipv6');

/**
 * Checks whether an IP address belongs to loopback, link-local, private,
 * unique-local, or cloud metadata ranges using native Node BlockList.
 *
 * NOTE: Non-IP strings (e.g. hostnames like fcm.googleapis.com) return FALSE,
 * preventing false-positive rejection of valid domains.
 */
export function isPrivateOrMetadataIp(ip) {
  if (typeof ip !== 'string') return true;
  let clean = ip.trim().toLowerCase();
  if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (clean.includes('::ffff:')) {
    const tail = clean.split('::ffff:')[1];
    // Check if the tail is dotted-decimal or hex
    if (tail.includes('.')) {
      clean = tail;
    } else {
      // Hex form e.g. 7f00:1 -> 127.0.0.1
      const parts = tail.split(':');
      if (parts.length === 2) {
        const p1 = parseInt(parts[0], 16);
        const p2 = parseInt(parts[1], 16);
        if (!isNaN(p1) && !isNaN(p2)) {
          clean = `${(p1 >> 8) & 0xff}.${p1 & 0xff}.${(p2 >> 8) & 0xff}.${p2 & 0xff}`;
        }
      }
    }
  }

  const ipType = isIP(clean);
  if (ipType === 0) {
    // Not an IP address (e.g. hostnames like fcm.googleapis.com, fdic.gov)
    return false;
  }

  const family = ipType === 4 ? 'ipv4' : 'ipv6';
  try {
    return restrictedIpBlockList.check(clean, family);
  } catch {
    return true;
  }
}

/**
 * Anti-DNS Rebinding Socket Dispatcher Agent
 * Intercepts DNS resolution at the exact moment of socket creation (connect.lookup)
 * to eliminate Time-Of-Check to Time-Of-Use (TOCTOU) DNS rebinding attacks.
 */
export const ssrfGuardedAgent = new Agent({
  connect: {
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, options, (err, address, family) => {
        if (err) return callback(err);
        const addrList = Array.isArray(address) ? address : [{ address, family }];
        for (const item of addrList) {
          if (isPrivateOrMetadataIp(item.address)) {
            return callback(new Error(`SSRF connection blocked: ${hostname} resolved to restricted IP ${item.address}`));
          }
        }
        callback(null, address, family);
      });
    }
  }
});

/**
 * Asynchronously verifies that a webhook URL is safe from SSRF & DNS rebinding:
 * 1. Enforces HTTPS strictly
 * 2. Rejects string-level loopback, cloud metadata, and internal TLDs (.internal, .local, .localhost)
 * 3. Asynchronously resolves DNS (A and AAAA records) via lookup({ all: true })
 * 4. Rejects if ANY resolved IP address belongs to private or metadata ranges
 */
export async function isSafeWebhookUrl(url, { resolver = lookup } = {}) {
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

  // Fast-fail string heuristics for internal domains
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost')
  ) {
    return false;
  }

  // If already an IP literal, test directly against BlockList
  if (isPrivateOrMetadataIp(hostname)) {
    return false;
  }

  // Asynchronous DNS resolution check
  try {
    const addresses = await resolver(hostname, { all: true });
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
 *  - Native Node.js BlockList CIDR checks covering RFC 1918, CGNAT, Link-local, AWS/Azure/GCP/Alibaba metadata
 *  - Anti-TOCTOU: Connect-time DNS validation via ssrfGuardedAgent
 *  - Blocks HTTP 3xx redirects (redirect: 'error') to prevent redirect-based SSRF bypass
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
      redirect: 'error', // NEVER follow redirects (prevents 302 -> internal/metadata bypass)
      dispatcher: ssrfGuardedAgent, // Validates IP at socket connect time (anti-TOCTOU rebinding)
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
