import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CAVDAX_DATA_DIR lets tests (and unusual deployments) keep state out of apps/server/data.
const DATA_DIR = process.env.CAVDAX_DATA_DIR
  ? path.resolve(process.env.CAVDAX_DATA_DIR)
  : path.resolve(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'system_state.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[CAVDAX SystemState] Failed to initialize data directory:', err.message);
  }
}

/**
 * Loads persistent system configuration from disk if available.
 * Returns defaults combined with environment variable fallbacks.
 */
export function loadSystemState() {
  ensureDataDir();
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        hackathonMode: typeof parsed.hackathonMode === 'boolean' ? parsed.hackathonMode : (process.env.HACKATHON_MODE === 'true'),
        whitelistedIps: Array.isArray(parsed.whitelistedIps) ? parsed.whitelistedIps : [],
        devRoster: Array.isArray(parsed.devRoster) ? parsed.devRoster : [],
        apiKeys: Array.isArray(parsed.apiKeys) ? parsed.apiKeys : [],
        auditEntries: Array.isArray(parsed.auditEntries) ? parsed.auditEntries : [],
        notificationPreferences: (typeof parsed.notificationPreferences === 'object' && parsed.notificationPreferences !== null)
          ? parsed.notificationPreferences
          : {},
        sponsors: Array.isArray(parsed.sponsors) ? parsed.sponsors : [],
        paidUsers: (typeof parsed.paidUsers === 'object' && parsed.paidUsers !== null) ? parsed.paidUsers : {},
        userRepos: (typeof parsed.userRepos === 'object' && parsed.userRepos !== null) ? parsed.userRepos : {},
        vapidKeys: (typeof parsed.vapidKeys === 'object' && parsed.vapidKeys !== null) ? parsed.vapidKeys : null,
        pushSubscriptions: (typeof parsed.pushSubscriptions === 'object' && parsed.pushSubscriptions !== null) ? parsed.pushSubscriptions : {}
      };
    }
  } catch (err) {
    console.warn('[CAVDAX SystemState] Warning reading system_state.json:', err.message);
  }
  return {
    hackathonMode: process.env.HACKATHON_MODE === 'true',
    whitelistedIps: [],
    devRoster: [],
    apiKeys: [],
    auditEntries: [],
    notificationPreferences: {},
    sponsors: [],
    vapidKeys: null,
    pushSubscriptions: {}
  };
}

/**
 * Atomically writes persistent system configuration to disk.
 * Uses atomic tmp-file rename to protect against crash corruption.
 *
 * `vapidKeys`, `pushSubscriptions` and `notificationPreferences` are owned by
 * webPush.js and the notification routes. Callers such as syncSystemStateToDisk()
 * do not carry them, so when a caller omits them the values already on disk are
 * preserved instead of being erased.
 */
export function saveSystemState(state) {
  ensureDataDir();
  try {
    if (!state || typeof state !== 'object') {
      throw new TypeError('saveSystemState requires a state object');
    }

    let vapidKeys = state.vapidKeys;
    let pushSubscriptions = state.pushSubscriptions;
    let notificationPreferences = state.notificationPreferences;
    if (vapidKeys === undefined || pushSubscriptions === undefined || notificationPreferences === undefined) {
      const onDisk = loadSystemState();
      if (vapidKeys === undefined) vapidKeys = onDisk.vapidKeys;
      if (pushSubscriptions === undefined) pushSubscriptions = onDisk.pushSubscriptions;
      if (notificationPreferences === undefined) notificationPreferences = onDisk.notificationPreferences;
    }

    const payload = JSON.stringify({
      hackathonMode: Boolean(state.hackathonMode),
      whitelistedIps: Array.isArray(state.whitelistedIps) ? state.whitelistedIps : [],
      devRoster: Array.isArray(state.devRoster) ? state.devRoster : [],
      apiKeys: Array.isArray(state.apiKeys) ? state.apiKeys : [],
      auditEntries: Array.isArray(state.auditEntries) ? state.auditEntries.slice(0, 500) : [],
      notificationPreferences: (typeof notificationPreferences === 'object' && notificationPreferences !== null)
        ? notificationPreferences
        : {},
      sponsors: Array.isArray(state.sponsors) ? state.sponsors.slice(0, 100) : [],
      paidUsers: (typeof state.paidUsers === 'object' && state.paidUsers !== null) ? state.paidUsers : {},
      userRepos: (typeof state.userRepos === 'object' && state.userRepos !== null) ? state.userRepos : {},
      vapidKeys: (typeof vapidKeys === 'object' && vapidKeys !== null) ? vapidKeys : null,
      pushSubscriptions: (typeof pushSubscriptions === 'object' && pushSubscriptions !== null) ? pushSubscriptions : {},
      updatedAt: new Date().toISOString()
    }, null, 2);

    const tempFile = `${STATE_FILE}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tempFile, payload, 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
    return true;
  } catch (err) {
    console.error('[CAVDAX SystemState] Failed to persist system_state.json:', err.message);
    return false;
  }
}
