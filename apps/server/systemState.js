import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
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
        userRepos: (typeof parsed.userRepos === 'object' && parsed.userRepos !== null) ? parsed.userRepos : {}
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
 */
export function saveSystemState(state) {
  ensureDataDir();
  try {
    const payload = JSON.stringify({
      hackathonMode: Boolean(state.hackathonMode),
      whitelistedIps: Array.isArray(state.whitelistedIps) ? state.whitelistedIps : [],
      devRoster: Array.isArray(state.devRoster) ? state.devRoster : [],
      apiKeys: Array.isArray(state.apiKeys) ? state.apiKeys : [],
      auditEntries: Array.isArray(state.auditEntries) ? state.auditEntries.slice(0, 500) : [],
      notificationPreferences: (typeof state.notificationPreferences === 'object' && state.notificationPreferences !== null)
        ? state.notificationPreferences
        : {},
      sponsors: Array.isArray(state.sponsors) ? state.sponsors.slice(0, 100) : [],
      paidUsers: (typeof state.paidUsers === 'object' && state.paidUsers !== null) ? state.paidUsers : {},
      userRepos: (typeof state.userRepos === 'object' && state.userRepos !== null) ? state.userRepos : {},
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
