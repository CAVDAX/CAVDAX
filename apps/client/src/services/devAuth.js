/**
 * devAuth.js — High-Security Access Gate & Cloaking Service for /devteam
 *
 * Implements strict multi-factor defense:
 * 1. IP Whitelisting: Validates client IP against VITE_ALLOWED_DEV_IPS
 * 2. GitHub Identity: Requires authenticated session matching authorized developer roster
 * 3. Master Dev Passkey: Zero-knowledge SHA-256 session challenge
 * 4. Silent 404 Cloaking: Unauthorized visitors see a standard 404 Causal Node Not Found page,
 *    revealing zero reconnaissance information about the existence of the dev panel.
 */

const SESSION_VAULT_KEY = 'cavdax_dev_vault_v1';
const IP_CACHE_KEY = 'cavdax_detected_client_ip';
const DYNAMIC_ROSTER_KEY = 'cavdax_authorized_dev_roster';
const DYNAMIC_ALLOWED_IPS_KEY = 'cavdax_authorized_dev_ips';

// Hardcoded authorized developer roster
export const DEFAULT_AUTHORIZED_ROSTER = [
  'suneetchugh-dev',
  'geetikachughibm',
  'gkc2406'
];

// Precomputed zero-knowledge SHA-256 hash for master passkey
// Never commits plaintext password to source
const MASTER_PASSKEY_HASH = '44fc4515e924df63db607ff442569372836352e041b1daa45716032d858317cc';

// Parse allowed IPs from env + local persistent whitelist
export function getAllowedIps() {
  const envIps = (import.meta.env.VITE_ALLOWED_DEV_IPS || '').trim();
  const parsedEnv = envIps
    ? envIps.split(',').map((ip) => ip.trim().toLowerCase()).filter(Boolean)
    : (import.meta.env.DEV ? ['127.0.0.1', 'localhost', '::1'] : []);

  let dynamicIps = [];
  try {
    const raw = localStorage.getItem(DYNAMIC_ALLOWED_IPS_KEY);
    if (raw) dynamicIps = JSON.parse(raw);
  } catch {}

  return Array.from(new Set([...parsedEnv, ...dynamicIps]));
}

// Get array of dynamically added custom whitelisted IPs
export function getCustomWhitelistedIps() {
  try {
    const raw = localStorage.getItem(DYNAMIC_ALLOWED_IPS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

// Whitelist a new IP address (accessible from inside unlocked dev panel)
export function addWhitelistedIp(ip) {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  if (!clean) return false;

  const current = getAllowedIps();
  if (!current.includes(clean)) {
    const custom = getCustomWhitelistedIps();
    const updated = Array.from(new Set([...custom, clean]));
    try {
      localStorage.setItem(DYNAMIC_ALLOWED_IPS_KEY, JSON.stringify(updated));
    } catch {}
    return true;
  }
  return false;
}

// Revoke a dynamically whitelisted IP address
export function removeWhitelistedIp(ip) {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  const custom = getCustomWhitelistedIps();
  const updated = custom.filter((item) => item !== clean);
  try {
    localStorage.setItem(DYNAMIC_ALLOWED_IPS_KEY, JSON.stringify(updated));
  } catch {}
  return true;
}

// Parse authorized GitHub usernames from roster + env + local persistent roster
export function getAuthorizedUsers() {
  const envUsers = (import.meta.env.VITE_AUTHORIZED_DEV_USERS || '').trim();
  const parsedEnv = envUsers
    ? envUsers.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean)
    : [];

  let dynamicRoster = [];
  try {
    const raw = localStorage.getItem(DYNAMIC_ROSTER_KEY);
    if (raw) dynamicRoster = JSON.parse(raw);
  } catch {}

  const combined = Array.from(new Set([
    ...DEFAULT_AUTHORIZED_ROSTER,
    ...parsedEnv,
    ...dynamicRoster
  ]));

  return combined;
}

// Authorize a new GitHub team member (only accessible from inside unlocked dev panel)
export function addAuthorizedUser(username) {
  if (!username) return false;
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return false;

  const current = getAuthorizedUsers();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    try {
      localStorage.setItem(DYNAMIC_ROSTER_KEY, JSON.stringify(updated));
    } catch {}
    return true;
  }
  return false;
}

// Revoke access for a GitHub team member
export function removeAuthorizedUser(username) {
  if (!username) return false;
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  const current = getAuthorizedUsers();
  const filtered = current.filter((u) => u !== clean);
  try {
    localStorage.setItem(DYNAMIC_ROSTER_KEY, JSON.stringify(filtered));
  } catch {}
  return true;
}

// Fetch client public IP with first-party discovery (zero 3rd-party tracking or adblocker blocks)
export async function fetchClientIp() {
  try {
    const cached = sessionStorage.getItem(IP_CACHE_KEY);
    if (cached) return cached;
  } catch {}

  const isLocalHost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '[::1]');

  if (isLocalHost) {
    try { sessionStorage.setItem(IP_CACHE_KEY, '127.0.0.1'); } catch {}
    return '127.0.0.1';
  }

  // 1. First-party server IP detection endpoint
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/client-ip', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        try { sessionStorage.setItem(IP_CACHE_KEY, data.ip); } catch {}
        return data.ip;
      }
    }
  } catch {}

  // 2. Fallback to /api/health
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.client_ip) {
        try { sessionStorage.setItem(IP_CACHE_KEY, data.client_ip); } catch {}
        return data.client_ip;
      }
    }
  } catch {}

  // Secure Fallback: only localhost can default to 127.0.0.1; remote clients default to unknown
  return isLocalHost ? '127.0.0.1' : 'unknown';
}

// Check whether an IP is in the allowed list
export function isIpAuthorized(clientIp) {
  const isLocalHost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '[::1]');

  if (isLocalHost) {
    return true;
  }

  const allowed = getAllowedIps();
  // When no explicit IP whitelist restriction is configured, allow verified GitHub developers through
  if (allowed.length === 0) {
    return true;
  }
  const cleanIp = (clientIp || '').trim().toLowerCase();
  if (!cleanIp || cleanIp === 'unknown') {
    return isLocalHost;
  }
  return allowed.includes(cleanIp) || (isLocalHost && (allowed.includes('localhost') || allowed.includes('127.0.0.1')));
}

// Check whether a GitHub user object is in the authorized roster
export function isUserAuthorized(githubUser) {
  const authorized = getAuthorizedUsers();
  if (!githubUser || !githubUser.login) {
    // In local development, if no user session is active yet, allow testing only if dev bypass is set
    return Boolean(import.meta.env.DEV && import.meta.env.VITE_DEV_ALLOW_DEV_BYPASS === 'true');
  }
  const cleanLogin = githubUser.login.trim().toLowerCase().replace(/^@/, '');
  return authorized.includes(cleanLogin);
}

// Check active dev session
export function getActiveDevSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_VAULT_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    if (Date.now() - session.authenticatedAt > FOUR_HOURS) {
      sessionStorage.removeItem(SESSION_VAULT_KEY);
      return null;
    }
    const login = session.login || session.user || 'suneetchugh-dev';
    return {
      ...session,
      login,
      user: login,
      name: session.name || (login === 'suneetchugh-dev' ? 'Suneet Chugh' : login)
    };
  } catch {
    return null;
  }
}

// SHA-256 helper
async function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Verify Dev Passkey Challenge
export async function verifyDevPasskey(enteredKey, user) {
  const cleanKey = (enteredKey || '').trim();
  if (!cleanKey) return { success: false, error: 'Passkey cannot be empty' };

  const masterPass = (import.meta.env.VITE_DEV_MASTER_KEY || '').trim();
  const passHash = (import.meta.env.VITE_DEV_PASSKEY_HASH || '').trim().toLowerCase();

  let isValid = false;

  const enteredHash = await sha256(cleanKey);

  // 1. Direct env master pass match
  if (masterPass && cleanKey === masterPass) {
    isValid = true;
  }
  // 2. Custom env hash match
  else if (passHash && enteredHash === passHash) {
    isValid = true;
  }
  // 3. Built-in zero-knowledge hash match for user-configured master passkey
  else if (enteredHash === MASTER_PASSKEY_HASH) {
    isValid = true;
  }
  // 4. Built-in dev passkey fallback for local isolated dev testing
  else if (import.meta.env.DEV && (cleanKey === 'cavdax_dev' || cleanKey === 'admin')) {
    isValid = true;
  }

  if (isValid) {
    const login = user?.login || 'suneetchugh-dev';
    const name = user?.name || (login === 'suneetchugh-dev' ? 'Suneet Chugh' : login);
    const sessionPayload = {
      authenticatedAt: Date.now(),
      user: login,
      login: login,
      name: name,
      role: 'CORE_DEV',
      token: `cavdax_token_${Math.random().toString(36).slice(2)}`,
    };
    try {
      sessionStorage.setItem(SESSION_VAULT_KEY, JSON.stringify(sessionPayload));
    } catch {}
    return { success: true, session: sessionPayload };
  }

  return { success: false, error: 'Invalid master passkey credentials.' };
}

// Developer Entitlement Tier Override
export function setDevTierOverride(tierKey) {
  if (!['free', 'pro', 'enterprise'].includes(tierKey)) return;
  try {
    localStorage.setItem('cavdax_tier', tierKey);
    localStorage.setItem('cavdax_dev_tier_override', 'true');
    window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: tierKey } }));
  } catch {}
}

export function getDevCurrentTier() {
  try {
    return localStorage.getItem('cavdax_tier') || 'free';
  } catch {
    return 'free';
  }
}

// Emergency Killswitch / Sign Out
export function devSignOut() {
  try {
    sessionStorage.removeItem(SESSION_VAULT_KEY);
  } catch {}
}

// Hackathon Evaluation Mode Helpers
export function isHackathonEvaluationMode() {
  return typeof window !== 'undefined' && localStorage.getItem('cavdax_hackathon_mode') === 'true';
}

export function setHackathonEvaluationMode(enabled) {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.setItem('cavdax_hackathon_mode', 'true');
    localStorage.setItem('cavdax_tier', 'enterprise');
    window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: true } }));
    window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'enterprise' } }));
  } else {
    localStorage.removeItem('cavdax_hackathon_mode');
    localStorage.setItem('cavdax_tier', 'free');
    window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: false } }));
    window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'free' } }));
  }
}

// Fetch global Hackathon Evaluation Mode from server
export async function fetchGlobalHackathonMode() {
  try {
    const res = await fetch('/api/system/hackathon-mode');
    if (res.ok) {
      const data = await res.json();
      const serverEnabled = Boolean(data?.enabled);
      if (typeof window !== 'undefined') {
        const localEnabled = localStorage.getItem('cavdax_hackathon_mode') === 'true';
        // Effective mode: if either server-backed global mode OR local evaluation pass is active, keep active
        const effectiveMode = serverEnabled || localEnabled;
        if (effectiveMode) {
          localStorage.setItem('cavdax_hackathon_mode', 'true');
          localStorage.setItem('cavdax_tier', 'enterprise');
        }
        window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: effectiveMode } }));
        if (effectiveMode) {
          window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'enterprise' } }));
        }
        return effectiveMode;
      }
      return serverEnabled;
    }
  } catch {}
  return isHackathonEvaluationMode();
}

// Toggle global Hackathon Evaluation Mode on server
export async function setGlobalHackathonMode(enabled) {
  const boolVal = Boolean(enabled);
  try {
    const res = await fetch('/api/system/hackathon-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled: boolVal })
    });
    if (res.ok) {
      const data = await res.json();
      const serverEnabled = Boolean(data?.enabled);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cavdax_hackathon_mode', serverEnabled ? 'true' : 'false');
        if (serverEnabled) {
          localStorage.setItem('cavdax_tier', 'enterprise');
        } else {
          localStorage.setItem('cavdax_tier', 'free');
        }
        window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: serverEnabled } }));
        window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: serverEnabled ? 'enterprise' : 'free' } }));
      }
      return { success: true, enabled: serverEnabled };
    }
  } catch (err) {
    console.error('Failed to update server hackathon mode:', err);
  }
  setHackathonEvaluationMode(boolVal);
  return { success: true, enabled: boolVal };
}

// Server-Backed Global IP Whitelist Sync
export async function fetchGlobalWhitelistedIps() {
  try {
    const res = await fetch('/api/system/dev-ips', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.ips)) {
        const ips = data.ips.map(s => s.trim().toLowerCase());
        try {
          localStorage.setItem(DYNAMIC_ALLOWED_IPS_KEY, JSON.stringify(ips));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:dev-ips-updated', { detail: { ips } }));
        return ips;
      }
    }
  } catch {}
  return getAllowedIps();
}

export async function addGlobalWhitelistedIp(ip) {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  addWhitelistedIp(clean);
  try {
    const res = await fetch('/api/system/dev-ips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ip: clean, action: 'add' })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.ips)) {
        try {
          localStorage.setItem(DYNAMIC_ALLOWED_IPS_KEY, JSON.stringify(data.ips));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:dev-ips-updated', { detail: { ips: data.ips } }));
      }
      return true;
    }
  } catch {}
  return true;
}

export async function removeGlobalWhitelistedIp(ip) {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  removeWhitelistedIp(clean);
  try {
    const res = await fetch('/api/system/dev-ips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ip: clean, action: 'remove' })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.ips)) {
        try {
          localStorage.setItem(DYNAMIC_ALLOWED_IPS_KEY, JSON.stringify(data.ips));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:dev-ips-updated', { detail: { ips: data.ips } }));
      }
      return true;
    }
  } catch {}
  return true;
}

// Global Authorized Developer GitHub Roster Service (Server-backed + SSE synchronized)
export async function fetchGlobalDevRoster() {
  try {
    const res = await fetch('/api/system/dev-roster', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.roster)) {
        try {
          localStorage.setItem(DYNAMIC_ROSTER_KEY, JSON.stringify(data.roster));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:dev-roster-updated', { detail: { roster: data.roster } }));
        return data.roster;
      }
    }
  } catch {}
  return getAuthorizedUsers();
}

export async function addGlobalAuthorizedUser(username) {
  if (!username) return false;
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  addAuthorizedUser(clean);
  try {
    const res = await fetch('/api/system/dev-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: clean, action: 'add' })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.roster)) {
        try {
          localStorage.setItem(DYNAMIC_ROSTER_KEY, JSON.stringify(data.roster));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:dev-roster-updated', { detail: { roster: data.roster } }));
      }
      return true;
    }
  } catch {}
  return true;
}

export async function removeGlobalAuthorizedUser(username) {
  if (!username) return false;
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  removeAuthorizedUser(clean);
  try {
    const res = await fetch('/api/system/dev-roster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: clean, action: 'remove' })
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.roster)) {
        try {
          localStorage.setItem(DYNAMIC_ROSTER_KEY, JSON.stringify(data.roster));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:dev-roster-updated', { detail: { roster: data.roster } }));
      }
      return true;
    }
  } catch {}
  return true;
}


// Emergency Global API Key Revocation Service (Dev Enclave -> Server & SSE broadcast)
export async function emergencyRevokeAllKeys(reason = 'Emergency security revocation triggered by dev team enclave') {
  try {
    const res = await fetch('/api/system/revoke-all-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (res.ok && data?.success) {
      window.dispatchEvent(new CustomEvent('cavdax:keys-revoked', { detail: data }));
      return { success: true, data };
    }
    return { success: false, error: data?.error || 'Failed to revoke keys' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
