import { loadSystemState, saveSystemState } from './systemState.js';

let webpush = null;
try {
  const mod = await import('web-push');
  webpush = mod.default || mod;
} catch {
  // Graceful fallback when web-push is not yet installed in runtime
}

let isInitialized = false;
let currentVapidKeys = null;

/**
 * Validates push subscription endpoint to prevent SSRF (Server-Side Request Forgery).
 * Enforces HTTPS and rejects loopback, private, and cloud metadata addresses.
 */
export function isValidPushEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false;
  try {
    const parsed = new URL(endpoint);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    // Block loopback, link-local, and cloud metadata (IPv4 + IPv6 ULA/Link-Local)
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname === '169.254.169.254' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname.startsWith('[fc') ||
      hostname.startsWith('[fd') ||
      hostname.startsWith('[fe80')
    ) {
      return false;
    }

    // Block IPv4 private ranges (10.x, 172.16-31.x, 192.168.x)
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const b0 = parseInt(ipMatch[1], 10);
      const b1 = parseInt(ipMatch[2], 10);
      if (b0 === 10) return false;
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return false;
      if (b0 === 192 && b1 === 168) return false;
      if (b0 === 0 || b0 === 127) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Initializes VAPID keys for Web Push.
 * Loads existing keys from environment or persistent system_state.json.
 * If none exist and webpush is available, generates a fresh ECDSA key pair and persists it.
 */
export function initWebPush() {
  if (isInitialized && currentVapidKeys) return currentVapidKeys;

  const state = loadSystemState();
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;

  if (envPub && envPriv) {
    currentVapidKeys = {
      publicKey: envPub,
      privateKey: envPriv
    };
  } else if (state.vapidKeys?.publicKey && state.vapidKeys?.privateKey) {
    currentVapidKeys = state.vapidKeys;
  } else if (webpush && typeof webpush.generateVAPIDKeys === 'function') {
    // Generate fresh VAPID keypair
    const generated = webpush.generateVAPIDKeys();
    currentVapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey
    };
    state.vapidKeys = currentVapidKeys;
    saveSystemState(state);
    console.log('[CAVDAX WebPush] Generated and persisted fresh VAPID keys');
  } else {
    currentVapidKeys = {
      publicKey: 'cavdax-fallback-vapid-public-key-for-local-development',
      privateKey: 'cavdax-fallback-vapid-private-key'
    };
  }

  const contactSubject = process.env.VAPID_SUBJECT || 'mailto:alerts@sahnirmaan.live';
  if (webpush && typeof webpush.setVapidDetails === 'function') {
    try {
      webpush.setVapidDetails(
        contactSubject,
        currentVapidKeys.publicKey,
        currentVapidKeys.privateKey
      );
      isInitialized = true;
    } catch (err) {
      console.warn('[CAVDAX WebPush] Notice initializing VAPID details:', err.message);
    }
  }

  return currentVapidKeys;
}

/**
 * Returns the public VAPID key for client subscriptions.
 */
export function getVapidPublicKey() {
  const keys = initWebPush();
  return keys?.publicKey || null;
}

/**
 * Registers a new client push subscription for a user login.
 */
export function savePushSubscription(login, subscription) {
  if (!subscription || !subscription.endpoint) {
    return { success: false, error: 'INVALID_SUBSCRIPTION' };
  }

  if (!isValidPushEndpoint(subscription.endpoint)) {
    return { success: false, error: 'RESTRICTED_OR_INVALID_ENDPOINT' };
  }

  const state = loadSystemState();
  if (!state.pushSubscriptions) state.pushSubscriptions = {};
  if (!Array.isArray(state.pushSubscriptions[login])) {
    state.pushSubscriptions[login] = [];
  }

  // Deduplicate by endpoint
  const existingIdx = state.pushSubscriptions[login].findIndex(s => s.endpoint === subscription.endpoint);
  if (existingIdx >= 0) {
    state.pushSubscriptions[login][existingIdx] = subscription;
  } else {
    state.pushSubscriptions[login].push(subscription);
  }

  saveSystemState(state);
  return { success: true, count: state.pushSubscriptions[login].length };
}

/**
 * Removes an expired or invalid push subscription.
 */
export function removePushSubscription(endpoint) {
  const state = loadSystemState();
  if (!state.pushSubscriptions) return;

  let changed = false;
  for (const login of Object.keys(state.pushSubscriptions)) {
    const list = state.pushSubscriptions[login];
    if (Array.isArray(list)) {
      const filtered = list.filter(s => s.endpoint !== endpoint);
      if (filtered.length !== list.length) {
        state.pushSubscriptions[login] = filtered;
        changed = true;
      }
    }
  }

  if (changed) {
    saveSystemState(state);
  }
}

/**
 * Dispatches a Web Push notification to a single client subscription.
 */
export async function sendWebPushNotification(subscription, payload) {
  if (!subscription || !isValidPushEndpoint(subscription.endpoint)) {
    return { success: false, error: 'INVALID_ENDPOINT' };
  }

  initWebPush();
  if (!webpush || typeof webpush.sendNotification !== 'function') {
    return { success: false, error: 'WEB_PUSH_NOT_AVAILABLE' };
  }

  try {
    const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    await webpush.sendNotification(subscription, dataString);
    return { success: true };
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      // Subscription expired or unregistered by user
      removePushSubscription(subscription.endpoint);
    }
    return { success: false, error: err.message, statusCode: err.statusCode };
  }
}

/**
 * Broadcasts an architectural divergence alert to all registered push subscriptions.
 */
export async function broadcastWebPushAlert(payload, targetLogin = null) {
  initWebPush();
  const state = loadSystemState();
  const subsMap = state.pushSubscriptions || {};

  const targets = [];
  if (targetLogin && Array.isArray(subsMap[targetLogin])) {
    targets.push(...subsMap[targetLogin]);
  } else {
    for (const login of Object.keys(subsMap)) {
      if (Array.isArray(subsMap[login])) {
        targets.push(...subsMap[login]);
      }
    }
  }

  if (targets.length === 0) {
    return { dispatched: 0, successful: 0 };
  }

  let successful = 0;
  for (const sub of targets) {
    const res = await sendWebPushNotification(sub, {
      title: payload.title || 'CAVDAX: Divergence Detected',
      body: payload.body || `Decision ${payload.decision_id || 'DEC'} invalidated by superseding ADR.`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.decision_id ? `divergence-${payload.decision_id}` : 'divergence-alert',
      data: {
        url: payload.url || 'https://cavdax.sahnirmaan.live/console',
        decision_id: payload.decision_id,
        timestamp: Date.now()
      }
    });
    if (res.success) successful++;
  }

  return { dispatched: targets.length, successful };
}
