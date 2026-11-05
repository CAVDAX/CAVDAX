/**
 * CAVDAX Backend Gateway & Enclosed MCP API
 * Exposes REST & SSE endpoints for the Porcelain Dark Web HUD and coding agents.
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID, randomBytes, createHmac, createHash, timingSafeEqual } from 'crypto';
// Constant-time string equality helper to defend against timing side-channel attacks (OWASP A02)
function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

import { rateLimit } from 'express-rate-limit';
import Razorpay from 'razorpay';

import { getFalkorClient } from '../../core/graph/client.js';
import {
  seedDemoGraph,
  fetchGraphState,
  verifyActionGate,
  revalidateDecision,
  fetchAuditLog
} from '../../core/graph/queries.js';
import { ingestAdrFile } from '../../core/ingestion/parser.js';
import { scanRepoAdrs, createAdrPullRequest, syncSupersededAdrPullRequest, listRepoBranches, GithubAdrError , proposeAdrPullRequest, createCiGatePullRequest} from './githubAdr.js';
import { CavdaxMcpServer } from '../../core/mcp/server.js';
import { renderGraphToSvg, computeBlastRadius } from '../../core/graph/renderSvg.js';
import { loadSystemState, saveSystemState } from './systemState.js';
import { sendInvalidationEmail } from './email.js';
import { getVapidPublicKey, savePushSubscription, broadcastWebPushAlert, isValidPushEndpoint } from './webPush.js';
import { isAdrPath } from '../../core/ingestion/adrPaths.js';
import { dispatchOutgoingWebhook, isSafeWebhookUrl } from './webhookDispatcher.js';
import { cascadeInvalidation } from '../../core/graph/queries.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve .env path relative to this file so it works regardless of cwd.
// This means `npm run dev` from repo root and from apps/server/ both work.
dotenv.config({ path: path.resolve(__dirname, '.env') });
const REPO_ROOT = path.resolve(__dirname, '../../');
dotenv.config({ path: path.resolve(REPO_ROOT, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;


// Trust reverse proxy (Caddy / Cloudflare) so secure session cookies and proto work properly
app.set('trust proxy', 1);

// Security Headers Middleware (OWASP A05 & Cloudflare Edge Zero-Trust Hardening)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://www.youtube.com https://s.ytimg.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: https: blob:; " +
    "connect-src 'self' https://api.github.com https://lumberjack.razorpay.com https://api.razorpay.com wss: ws:; " +
    "frame-src 'self' https://api.razorpay.com https://www.youtube-nocookie.com https://www.youtube.com; " +
    "form-action 'self' https://github.com; " +
    "worker-src 'self' blob:; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Explicit CORS Origin Allowlist (Blocks arbitrary cross-site credential theft)
const allowedOrigins = [
  'https://cavdax.sahnirmaan.live',
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, local cURL, MCP stdio clients)
    if (!origin) return callback(null, true);
    // Allow any localhost / 127.0.0.1 development port (Vite 5173, preview 4173, 5174, etc.)
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    // Preserve pristine raw buffer for HMAC signature verification (e.g. Razorpay webhooks)
    req.rawBody = buf;
  }
}));




// ---------------------------------------------------------------------------
// SESSION MIDDLEWARE & PERSISTENT SESSION RESILIENCE
// ---------------------------------------------------------------------------
// Dual-layer session resilience (Industry Standard: Linear/Vercel/Supabase):
// Layer 1: File-backed persistent session store (survives process/container restarts)
// Layer 2: Tamper-proof HMAC-SHA256 signed HTTP-only auth cookie (cavdax_auth)

function getOrCreateSessionSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length > 0) {
    return process.env.SESSION_SECRET.trim();
  }
  const keyFile = path.resolve(__dirname, 'data/.session_key');
  try {
    if (fs.existsSync(keyFile)) {
      const savedKey = fs.readFileSync(keyFile, 'utf8').trim();
      if (savedKey.length >= 32) {
        return savedKey;
      }
    }
    const newKey = randomBytes(32).toString('hex');
    const dataDir = path.resolve(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
    console.log('[CAVDAX Auth] Generated and persisted session secret to data/.session_key');
    return newKey;
  } catch (err) {
    console.warn('[CAVDAX Auth] Failed to persist session key, using ephemeral secret:', err.message);
    return randomBytes(32).toString('hex');
  }
}
const SESSION_SECRET = getOrCreateSessionSecret();
const SESSIONS_DIR = path.resolve(__dirname, 'data/sessions');

class PersistentFileStore extends session.Store {
  constructor(options = {}) {
    super();
    this.dir = options.dir || SESSIONS_DIR;
    try {
      if (!fs.existsSync(this.dir)) {
        fs.mkdirSync(this.dir, { recursive: true });
      }
    } catch (e) {
      console.warn('[CAVDAX SessionStore] Directory initialization warning:', e.message);
    }
  }

  get(sid, cb) {
    if (!sid || typeof sid !== 'string') return cb(null, null);
    // Sanitize sid to prevent path traversal (OWASP Phase 3)
    const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(this.dir, `${safeSid}.json`);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) return cb(null, null);
      try {
        const sessionData = JSON.parse(data);
        if (sessionData?.cookie?.expires && new Date(sessionData.cookie.expires).getTime() < Date.now()) {
          this.destroy(sid, () => cb(null, null));
        } else {
          cb(null, sessionData);
        }
      } catch {
        cb(null, null);
      }
    });
  }

  set(sid, sessionData, cb) {
    if (!sid || typeof sid !== 'string') return cb && cb(null);
    const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(this.dir, `${safeSid}.json`);
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const payload = JSON.stringify(sessionData);
    fs.writeFile(tempPath, payload, 'utf8', (err) => {
      if (err) return cb && cb(err);
      fs.rename(tempPath, filePath, (renameErr) => {
        if (cb) cb(renameErr || null);
      });
    });
  }

  destroy(sid, cb) {
    if (!sid || typeof sid !== 'string') return cb && cb(null);
    const safeSid = sid.replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(this.dir, `${safeSid}.json`);
    fs.unlink(filePath, () => {
      if (cb) cb(null);
    });
  }

  touch(sid, sessionData, cb) {
    this.set(sid, sessionData, cb);
  }
}

// Cryptographic signing & verification helpers (Defense-in-depth)
function signAuthToken(payload) {
  try {
    const json = JSON.stringify(payload);
    const data = Buffer.from(json, 'utf8').toString('base64url');
    const sig = createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    return `${data}.${sig}`;
  } catch (err) {
    console.error('[CAVDAX Auth] Error signing auth token:', err.message);
    return null;
  }
}

function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  try {
    const expectedSig = createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
    const bufSig = Buffer.from(sig);
    const bufExp = Buffer.from(expectedSig);
    if (bufSig.length !== bufExp.length || !timingSafeEqual(bufSig, bufExp)) {
      return null;
    }
    const json = Buffer.from(data, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.login !== 'string' || parsed.login.length > 64) return null;
    if (parsed.name && typeof parsed.name === 'string' && parsed.name.length > 128) {
      parsed.name = parsed.name.slice(0, 128);
    }
    return parsed;
  } catch {
    return null;
  }
}

function extractAuthCookie(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)cavdax_auth=([^;]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

function rehydrateSessionFromCookie(req) {
  if (req.session?.user) return req.session.user;
  const rawToken = extractAuthCookie(req);
  if (!rawToken) return null;
  const verified = verifyAuthToken(rawToken);
  if (verified && verified.login && verified.githubId) {
    if (!req.session) req.session = {};
    req.session.user = {
      githubId: verified.githubId,
      login: verified.login,
      name: verified.name || verified.login,
      avatarUrl: verified.avatarUrl || '',
      accessToken: verified.accessToken || '',
      tier: verified.tier || 'free'
    };
    if (verified.tier) req.session.tier = verified.tier;
    return req.session.user;
  }
  return null;
}

const sessionStore = new PersistentFileStore();

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Session Re-hydration Middleware (Restores session from signed cookie across restarts)
app.use((req, res, next) => {
  if (!req.session?.user) {
    rehydrateSessionFromCookie(req);
  }
  next();
});

/**
 * GET /api/push/vapid-public-key
 * Returns the VAPID public key for browser PushManager subscription.
 */
app.get('/api/push/vapid-public-key', (req, res) => {
  const publicKey = getVapidPublicKey();
  res.json({
    success: Boolean(publicKey),
    publicKey
  });
});

/**
 * POST /api/push/subscribe
 * Registers client PushSubscription for offline background desktop alerts.
 */
app.post('/api/push/subscribe', (req, res) => {
  const user = req.session?.user;
  const login = user?.login || 'default';
  const { subscription } = req.body || {};

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, error: 'MISSING_SUBSCRIPTION' });
  }

  const result = savePushSubscription(login, subscription);
  res.json(result);
});

// ---------------------------------------------------------------------------
// TIER CONFIG & RATE LIMITING
// ---------------------------------------------------------------------------
// CAVDAX_TIER env var controls rate limits so they are consistent between
// /api/dev/tier-check (which reports them) and the actual limiters applied.
// Previously the limits were hardcoded here and only shown in tier-check —
// now both read from the same source of truth.

// Load file-backed persistent system state (preserves Evaluation Mode, roster, IPs, API keys across deploys)
const savedSystemState = loadSystemState();
if (!Array.isArray(savedSystemState.sponsors)) {
  savedSystemState.sponsors = [];
}

const CANONICAL_SEED_SPONSORS = [
  {
    id: 'spn_seed_core_01',
    name: 'Suneet Chugh',
    github_handle: 'suneetchugh-dev',
    tier_id: 3,
    tier_label: 'Core Supporter',
    amount_paise: 84900,
    currency: 'INR',
    avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4',
    created_at: '2026-10-15T10:00:00.000Z',
    highlighted: true,
    is_seed: true
  },
  {
    id: 'spn_seed_cups_02',
    name: 'Causal Inference Working Group',
    github_handle: null,
    tier_id: 2,
    tier_label: '2 Cups Sponsor',
    amount_paise: 33900,
    currency: 'INR',
    avatar_url: null,
    created_at: '2026-10-22T14:30:00.000Z',
    highlighted: false,
    is_seed: true
  },
  {
    id: 'spn_seed_coffee_03',
    name: 'Developer Tooling Circle',
    github_handle: null,
    tier_id: 1,
    tier_label: 'Cookie Backer',
    amount_paise: 16900,
    currency: 'INR',
    avatar_url: null,
    created_at: '2026-10-28T18:15:00.000Z',
    highlighted: false,
    is_seed: true
  }
];

function syncSystemStateToDisk() {
  saveSystemState({
    hackathonMode: globalHackathonMode,
    whitelistedIps: globalWhitelistedIps,
    devRoster: globalDevRoster,
    apiKeys: Array.from(userApiKeyRegistry.values()),
    auditEntries: Array.isArray(savedSystemState.auditEntries) ? savedSystemState.auditEntries : [],
    sponsors: Array.isArray(savedSystemState.sponsors) ? savedSystemState.sponsors : []
  });
}

const CAVDAX_TIER = (process.env.CAVDAX_TIER || 'free').toLowerCase();
let globalHackathonMode = process.env.HACKATHON_MODE === 'true' || Boolean(savedSystemState.hackathonMode);

const TIER_CONFIG = {
  free: {
    label: 'Free',
    description: 'Local FalkorDB only. Rate limit: 100 req/min. MCP stdio transport.',
    features: ['stdio MCP', 'ADR ingestion', 'local FalkorDB'],
    rate_limit_per_min: 100,
    mcp_rate_limit_per_min: 30,
    node_limit: 500,         // max graph nodes before writes are rejected
    audit_log_limit: 10      // max entries returned from GET /api/audit
  },
  pro: {
    label: 'Pro',
    description: 'Cloud FalkorDB + SSE remote MCP. Webhook ingestion enabled.',
    features: ['SSE MCP', 'all source types', 'webhook ingestion', 'audit log'],
    rate_limit_per_min: 300,
    mcp_rate_limit_per_min: 100,
    node_limit: 10_000,      // pro tier graph capacity
    audit_log_limit: 1000    // pro tier audit history depth
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Multi-tenant FalkorDB. Custom rate limits. SLA guarantees.',
    features: ['multi-tenant', 'custom rate limits', 'SLA', 'RBAC'],
    rate_limit_per_min: -1,   // -1 = unlimited
    mcp_rate_limit_per_min: -1,
    node_limit: -1,           // -1 = no limit (enterprise)
    audit_log_limit: 500      // enterprise compliance window
  }
};

const activeTier = TIER_CONFIG[CAVDAX_TIER] || TIER_CONFIG.free;

// Detect if socket connection originates from a trusted reverse proxy, Docker network, or Cloudflare edge
export function isTrustedProxyIp(ip) {
  if (!ip) return false;
  const clean = ip.toLowerCase();
  // 1. Direct loopback
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost' || clean === '1') return true;
  // 2. Private subnets (Docker bridges, internal ingress controllers, Caddy, Nginx)
  if (clean.startsWith('10.') || clean.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  // 3. Known Cloudflare edge proxy IPv4 ranges (https://www.cloudflare.com/ips-v4)
  if (
    clean.startsWith('173.245.') ||
    clean.startsWith('103.21.') ||
    clean.startsWith('103.22.') ||
    clean.startsWith('103.31.') ||
    clean.startsWith('141.101.') ||
    clean.startsWith('108.162.') ||
    clean.startsWith('190.93.') ||
    clean.startsWith('188.114.') ||
    clean.startsWith('197.234.') ||
    clean.startsWith('198.41.') ||
    clean.startsWith('162.158.') ||
    clean.startsWith('162.159.') ||
    clean.startsWith('104.16.') ||
    clean.startsWith('104.17.') ||
    clean.startsWith('104.18.') ||
    clean.startsWith('104.19.') ||
    clean.startsWith('104.20.') ||
    clean.startsWith('104.21.') ||
    clean.startsWith('104.22.') ||
    clean.startsWith('104.23.') ||
    clean.startsWith('104.24.') ||
    clean.startsWith('104.25.') ||
    clean.startsWith('104.26.') ||
    clean.startsWith('104.27.') ||
    clean.startsWith('131.0.72.')
  ) return true;
  // Cloudflare 172.64.0.0/13 CIDR block (covers 172.64.0.0 through 172.71.255.255)
  if (/^172\.(6[4-9]|7[0-1])\./.test(clean)) return true;
  return false;
}

// Helper to extract client IP safely with reverse-proxy trust validation (OWASP A07 Hardening)
export function extractClientIp(req) {
  const socketIp = (req.socket?.remoteAddress || '').replace(/^.*:/, '').toLowerCase();
  const isDirectLoopback = socketIp === '127.0.0.1' || socketIp === '1' || socketIp === 'localhost' || socketIp === '::1';
  const isTrustedPeer = isDirectLoopback || process.env.TRUST_PROXY === 'true' || isTrustedProxyIp(socketIp);

  // Only inspect forwarding headers if request arrives through a verified proxy, edge network, or loopback
  if (isTrustedPeer) {
    const cfIp = req.headers['cf-connecting-ip'] || req.headers['true-client-ip'];
    if (cfIp) {
      const clean = (typeof cfIp === 'string' ? cfIp.trim() : cfIp[0]).toLowerCase();
      // Forwarded headers must NEVER be trusted to claim loopback/localhost status
      if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') {
        return socketIp || 'unknown';
      }
      return clean;
    }
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const first = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0]).toLowerCase();
      if (first === '127.0.0.1' || first === '::1' || first === 'localhost') {
        return socketIp || 'unknown';
      }
      if (first) return first;
    }
  }
  return req.ip || socketIp || 'unknown';
}

// Global Whitelisted Developer IPs (stored in server state)
let globalWhitelistedIps = Array.from(new Set([
  '127.0.0.1',
  'localhost',
  '::1',
  ...(process.env.VITE_ALLOWED_DEV_IPS || process.env.ALLOWED_DEV_IPS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),
  ...(Array.isArray(savedSystemState.whitelistedIps) ? savedSystemState.whitelistedIps : [])
]));

// -1 means unlimited — pass a very large max so express-rate-limit is effectively off
const apiMax = activeTier.rate_limit_per_min === -1 ? 1_000_000 : activeTier.rate_limit_per_min;
const mcpMax = activeTier.mcp_rate_limit_per_min === -1 ? 1_000_000 : activeTier.mcp_rate_limit_per_min;

console.log(`[CAVDAX] Tier: ${activeTier.label} — API limit: ${activeTier.rate_limit_per_min === -1 ? 'UNLIMITED' : apiMax + ' req/min'}, MCP limit: ${activeTier.mcp_rate_limit_per_min === -1 ? 'UNLIMITED' : mcpMax + ' req/min'}`);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  // During Hackathon Evaluation Mode, provide an elevated ceiling (1,200 req/min = 20 req/sec)
  // so judges enjoy zero throttling, while still shielding the server from external DoS/bot attacks.
  max: (req) => (globalHackathonMode ? 1200 : apiMax),
  skip: (req) => {
    const clientIp = extractClientIp(req).toLowerCase();
    // Trusted developer IPs skip rate limiting completely
    if (globalWhitelistedIps.includes(clientIp)) return true;
    return false;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests', message: 'Rate limit exceeded. Please retry in 60 seconds.' }
});

// Strict limiter — MCP tool execution endpoints
// Prevents runaway agent loops from hammering FalkorDB with tool calls.
const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  // 600 req/min = 10 tool calls/sec during evaluation mode
  max: (req) => (globalHackathonMode ? 600 : mcpMax),
  skip: (req) => {
    const clientIp = extractClientIp(req).toLowerCase();
    if (globalWhitelistedIps.includes(clientIp)) return true;
    return false;
  },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many MCP requests', message: 'MCP rate limit exceeded. Check for agent loops.' }
});

app.use('/api/', apiLimiter);          // applies to all /api/* routes
app.use('/api/mcp/', mcpLimiter);      // tighter limit on MCP routes (overrides above)

// Rate limiter for external GitHub PR & ADR mutation operations to protect secondary API limits
const githubActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req) => (globalHackathonMode ? 120 : 30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => {
    const clientIp = extractClientIp(req).toLowerCase();
    if (globalWhitelistedIps.includes(clientIp)) return true;
    return false;
  },
  message: { success: false, code: 'RATE_LIMIT_EXCEEDED', error: 'Too many GitHub operations requested. Please wait before retrying.' }
});

// ---------------------------------------------------------------------------
// AUTH MIDDLEWARE & CRYPTOGRAPHIC USER KEY REGISTRY
// ---------------------------------------------------------------------------
// Reads MCP_API_TOKEN from environment for root / CI access.
// Also maintains an in-memory SHA-256 hashed registry of user-scoped API keys:
//   keyHashHex -> { userId, login, tier, createdAt, lastUsedAt }
// Raw keys follow format: cvdx_live_<login>_<48-hex-entropy> (192 bits of entropy)
const API_TOKEN = process.env.MCP_API_TOKEN || null;
const userApiKeyRegistry = new Map();
if (Array.isArray(savedSystemState.apiKeys)) {
  for (const k of savedSystemState.apiKeys) {
    if (k && k.keyHash) {
      userApiKeyRegistry.set(k.keyHash, k);
    }
  }
}
let globalKeyRevocationEpoch = 0;

function hashApiKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  return createHash('sha256').update(rawKey.trim()).digest('hex');
}

function generateSecureApiKey(login) {
  const sanitizedLogin = (login || 'contributor').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  const entropy = randomBytes(24).toString('hex'); // 192 bits of cryptographic CSPRNG randomness
  return `cvdx_live_${sanitizedLogin}_${entropy}`;
}

if (!API_TOKEN) {
  console.warn(
    '[CAVDAX Auth] ⚠️  MCP_API_TOKEN is not set — write endpoints fallback to user API key verification.'
  );
}

/**
 * Express middleware that enforces Bearer token auth on write endpoints.
 * Validates against both root MCP_API_TOKEN and user-scoped cryptographic keys.
 * Skipped transparently when no tokens or keys are configured in local dev mode.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 1. Root / CI Token Check (Constant-time comparison)
  if (API_TOKEN && timingSafeStringEqual(token, API_TOKEN)) {
    req.authUser = { login: 'system', tier: 'enterprise', role: 'admin' };
    return next();
  }

  // 2. Cryptographic User Key Check
  if (token && token.startsWith('cvdx_live_')) {
    const keyHash = hashApiKey(token);
    const keyRecord = userApiKeyRegistry.get(keyHash);
    if (keyRecord && (keyRecord.createdAt || 0) >= globalKeyRevocationEpoch) {
      keyRecord.lastUsedAt = Date.now();
      req.authUser = {
        userId: keyRecord.userId,
        login: keyRecord.login,
        tier: keyRecord.tier || 'free',
        role: 'user'
      };
      return next();
    }
  }

  // 3. Authenticated Web Session (GitHub OAuth session cookie)
  if (req.session?.user) {
    req.authUser = {
      userId: req.session.user.githubId || req.session.user.login,
      login: req.session.user.login,
      tier: req.session.user.tier || 'free',
      role: 'user'
    };
    return next();
  }

  // 4. Transparent local dev fallback strictly in non-production environments
  if (process.env.NODE_ENV !== 'production' && !API_TOKEN && userApiKeyRegistry.size === 0) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'A valid Bearer token is required. Use Authorization: Bearer <API_KEY>.'
  });
}

// ---------------------------------------------------------------------------
// SSE CLIENT REGISTRIES
// ---------------------------------------------------------------------------

// In-memory SSE client registry for real-time Web HUD push notifications
const sseClients = new Set();

// In-memory registry of active remote MCP SSE agent sessions (MCP 2024-11-05)
// Each entry: { id, res, createdAt }
const mcpSessions = new Map();

// TTL for idle MCP SSE sessions — clean up sessions whose HTTP connection was
// dropped without a 'close' event (e.g. network failures, proxy crashes).
const MCP_SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of mcpSessions) {
    if (now - session.createdAt > MCP_SESSION_TTL_MS) {
      try { session.res.end(); } catch { /* already closed */ }
      mcpSessions.delete(sessionId);
      console.log(`[CAVDAX SSE] Evicted stale MCP session ${sessionId} (TTL exceeded)`);
    }
  }
}, 60 * 1000).unref(); // .unref() so the interval doesn't keep the process alive during tests

function sanitizeBroadcastPayload(eventType, payload) {
  if (eventType === 'MCP_TOOL_EXECUTED' && payload && typeof payload === 'object') {
    const sanitized = { ...payload };
    if (sanitized.args && typeof sanitized.args === 'object') {
      const sanitizedArgs = { ...sanitized.args };
      if (sanitizedArgs.code_payload) {
        // Redact raw source code payload from public unauthenticated SSE broadcasts
        sanitizedArgs.code_payload = `[REDACTED: ${sanitizedArgs.code_payload.length} chars]`;
      }
      sanitized.args = sanitizedArgs;
    }
    return sanitized;
  }
  return payload;
}

function clientCanSeeRepo(client, repo) {
  if (!repo || repo === 'demo') return true;
  const target = String(repo).toLowerCase();
  const userLogin = (client.user?.login || client.session?.user?.login || '').toLowerCase();
  const isAdmin = Boolean(
    client.user?.role === 'admin' ||
    userLogin === 'system' ||
    (userLogin && globalDevRoster.map(r => r.toLowerCase()).includes(userLogin))
  );
  const connected = Array.isArray(client.session?.connectedRepos) ? client.session.connectedRepos : [];
  const authorized = Array.isArray(client.session?.authorizedReposCache) ? client.session.authorizedReposCache : [];
  const isConnected = connected.some(r => r.toLowerCase() === target) || authorized.includes(target);
  const [owner] = target.split('/');
  const isOwner = Boolean(owner && userLogin && owner === userLogin);
  return isAdmin || isConnected || isOwner;
}

function isForeignRepoNode(n) {
  return Boolean(n && n.repo && n.repo !== 'demo' && !n.is_demo);
}

// Returns a copy of `graph` containing only the nodes (and their edges) this client may see.
function scopeGraphForClient(graph, client) {
  const nodes = graph.nodes.filter(n => !isForeignRepoNode(n) || clientCanSeeRepo(client, n.repo));
  const ids = new Set(nodes.map(n => n.id));
  const edges = Array.isArray(graph.edges) ? graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)) : graph.edges;
  return { ...graph, nodes, edges };
}

function broadcastEvent(eventType, rawPayload, options = {}) {
  const payload = sanitizeBroadcastPayload(eventType, rawPayload);
  const targetRepo = options.repo || rawPayload?.repo || rawPayload?.action?.repo || null;
  const timestamp = Date.now();
  const sharedData = JSON.stringify({ type: eventType, data: payload, timestamp });

  // Graph-bearing payloads (top-level or nested under `graph`) are filtered per client.
  const graphAtRoot = Array.isArray(payload?.nodes);
  const graphNested = !graphAtRoot && Array.isArray(payload?.graph?.nodes);
  const graphNodes = graphAtRoot ? payload.nodes : (graphNested ? payload.graph.nodes : null);
  const needsGraphScoping = Boolean(graphNodes && graphNodes.some(isForeignRepoNode));

  for (const client of sseClients) {
    try {
      // Cross-Tenant Isolation: if event is scoped to a specific non-demo repository
      if (!clientCanSeeRepo(client, targetRepo)) {
        continue;
      }
      let data = sharedData;
      if (needsGraphScoping) {
        const scoped = graphAtRoot
          ? scopeGraphForClient(payload, client)
          : { ...payload, graph: scopeGraphForClient(payload.graph, client) };
        data = JSON.stringify({ type: eventType, data: scoped, timestamp });
      }
      client.res.write(`event: ${eventType}\ndata: ${data}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Global state
let db = null;
let graph = null;
let mcpServer = null;
let isFalkorConnected = false;

// Initialize FalkorDB connection
async function initDb() {
  try {
    const clients = await getFalkorClient();
    db = clients.db;
    graph = clients.graph;
    const demoSandboxRoot = path.resolve(REPO_ROOT, 'demo-repo');
    mcpServer = new CavdaxMcpServer(graph, { repoRoot: demoSandboxRoot });
    isFalkorConnected = true;
    console.log('[CAVDAX Server] Successfully connected to FalkorDB.');
  } catch (err) {
    console.warn('[CAVDAX Server] FalkorDB connection failed on boot. Will retry on request.', err.message);
    isFalkorConnected = false;
  }
}

// Fallback in-memory mock if FalkorDB container is spinning up
// In-memory Decision Lock Registry with automatic TTL lease management
const activeDecisionLocks = new Map();

function cleanExpiredDecisionLocks() {
  const now = Date.now();
  for (const [decId, lock] of activeDecisionLocks.entries()) {
    if (lock.expires_at <= now) {
      activeDecisionLocks.delete(decId);
    }
  }
}

let fallbackGraphState = {
  nodes: [
    { id: 'ADR-001', label: 'Source', title: 'Adopt TokenAuth v1 for Payment Gateway', status: 'ACTIVE', type: 'ADR' },
    { id: 'F-Auth-v1', label: 'Fact', claim: 'Payment services require TokenAuth v1', is_stale: false, verified: true },
    { id: 'DEC-102', label: 'Decision', title: 'Generate Checkout Service with TokenAuth v1', status: 'VALID' },
    { id: 'ADR-002', label: 'Source', title: 'Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned', status: 'ACTIVE', type: 'ADR' },
    { id: 'F-OAuth2', label: 'Fact', claim: 'OAuth2 is strictly enforced; TokenAuth v1 prohibited', is_stale: false, verified: true },
    { id: 'act-hist-001', label: 'AgentAction', target_file: 'src/services/payment.js', status: 'EXECUTED', timestamp: Date.now() - 3600000 },
    { id: 'act-hist-002', label: 'AgentAction', target_file: 'src/services/billing.js', status: 'BLOCKED_SUPERSEDED_SOURCE', timestamp: Date.now() - 1800000 }
  ],
  edges: [
    { source: 'F-Auth-v1', target: 'ADR-001', type: 'EXTRACTED_FROM' },
    { source: 'DEC-102', target: 'F-Auth-v1', type: 'DEPENDS_ON' },
    { source: 'F-OAuth2', target: 'ADR-002', type: 'EXTRACTED_FROM' },
    { source: 'act-hist-001', target: 'DEC-102', type: 'GROUNDED_IN' },
    { source: 'act-hist-002', target: 'DEC-102', type: 'GROUNDED_IN' }
  ]
};

// ---------------------------------------------------------------------------
// NODE COUNT ENFORCEMENT MIDDLEWARE
// ---------------------------------------------------------------------------
// Runs MATCH (n) RETURN count(n) against FalkorDB before any write endpoint.
// Rejects with 429 if the active tier's node_limit is reached.
//
// Only enforced when FalkorDB is live — in simulation/fallback mode writes are
// in-memory only, so storage limits are not meaningful.
// If the count query itself fails, the write is allowed through (fail-open);
// the ingest endpoint has its own error handling for subsequent failures.
// node_limit = -1 means unlimited (Enterprise tier).

async function checkNodeLimit(req, res, next) {
  const limit = activeTier.node_limit;
  if (limit === -1) return next(); // Enterprise — unlimited

  if (!isFalkorConnected || !graph) return next(); // FalkorDB offline — let ingest handle it

  try {
    const result = await graph.query('MATCH (n) RETURN count(n) AS total');
    const total = result.data?.[0]?.total ?? 0;
    if (total >= limit) {
      return res.status(429).json({
        success: false,
        error: 'NODE_LIMIT_EXCEEDED',
        message: `Graph node limit reached for ${activeTier.label} tier (${total}/${limit} nodes). Upgrade tier or delete unused nodes.`,
        current_nodes: total,
        tier_limit: limit,
        tier: CAVDAX_TIER
      });
    }
    next();
  } catch (err) {
    // Count query fail — don't block the write, log it
    console.warn('[CAVDAX NodeLimit] Count query failed, skipping limit check:', err.message);
    next();
  }
}

// ---------------------------------------------------------------------------
// REST ENDPOINTS
// ---------------------------------------------------------------------------

// Global Authorized Developer GitHub Roster (stored in server state)
let globalDevRoster = Array.from(new Set([
  'suneetchugh-dev',
  'geetikachughibm',
  'gkc2406',
  ...(process.env.VITE_AUTHORIZED_DEV_USERS || process.env.AUTHORIZED_DEV_USERS || '')
    .split(',')
    .map(s => s.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean),
  ...(Array.isArray(savedSystemState.devRoster) ? savedSystemState.devRoster : [])
]));

// Middleware enforcing developer authorization on administrative endpoints (OWASP A01 Hardening)
function requireDevAuth(req, res, next) {
  // 1. Bearer API token (Constant-time comparison)
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (API_TOKEN && timingSafeStringEqual(token, API_TOKEN)) {
    return next();
  }

  // 2. Authenticated GitHub user on dev roster
  const sessionUser = req.session?.user?.login?.toLowerCase().replace(/^@/, '');
  if (sessionUser && globalDevRoster.includes(sessionUser)) {
    return next();
  }

  // 3. Localhost loopback access or local development environment
  const clientIp = extractClientIp(req).toLowerCase();
  const socketIp = (req.socket?.remoteAddress || '').replace(/^.*:/, '').toLowerCase();
  const isDirectLoopback = socketIp === '127.0.0.1' || socketIp === '1' || socketIp === 'localhost' || socketIp === '::1';

  // Physical socket must be verified loopback AND clientIp must not be spoofed
  if (isDirectLoopback && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_DEV_AUTH === 'true')) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied: Developer clearance or valid authorization token required.'
  });
}

// GET /api/system/dev-ips (Protected by requireDevAuth)
app.get('/api/system/dev-ips', requireDevAuth, (req, res) => {
  const clientIp = extractClientIp(req).toLowerCase();
  res.json({
    ips: globalWhitelistedIps,
    client_ip: clientIp,
    client_authorized: globalWhitelistedIps.includes(clientIp)
  });
});

// POST /api/system/dev-ips (Protected by requireDevAuth)
app.post('/api/system/dev-ips', requireDevAuth, (req, res) => {
  const { ip, action } = req.body || {};
  if (!ip || typeof ip !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid IP address required' });
  }
  const cleanIp = ip.trim().toLowerCase();
  if (action === 'remove') {
    globalWhitelistedIps = globalWhitelistedIps.filter(item => item !== cleanIp);
    console.log(`[CAVDAX] Revoked global IP authorization: ${cleanIp}`);
  } else {
    if (!globalWhitelistedIps.includes(cleanIp)) {
      globalWhitelistedIps.push(cleanIp);
      console.log(`[CAVDAX] Granted global IP authorization: ${cleanIp}`);
    }
  }

  syncSystemStateToDisk();
  broadcastEvent('DEV_IPS_UPDATED', { ips: globalWhitelistedIps });
  res.json({
    success: true,
    ips: globalWhitelistedIps
  });
});

// GET /api/system/dev-roster (Protected by requireDevAuth)
app.get('/api/system/dev-roster', requireDevAuth, (req, res) => {
  res.json({
    roster: globalDevRoster
  });
});

// POST /api/system/dev-roster (Protected by requireDevAuth)
app.post('/api/system/dev-roster', requireDevAuth, (req, res) => {
  const { username, action } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ success: false, error: 'Valid username required' });
  }
  const clean = username.trim().toLowerCase().replace(/^@/, '');
  if (action === 'remove') {
    if (!['suneetchugh-dev', 'geetikachughibm', 'gkc2406'].includes(clean)) {
      globalDevRoster = globalDevRoster.filter(u => u !== clean);
      console.log(`[CAVDAX] Revoked dev roster authorization: @${clean}`);
    }
  } else {
    if (!globalDevRoster.includes(clean)) {
      globalDevRoster.push(clean);
      console.log(`[CAVDAX] Granted dev roster authorization: @${clean}`);
    }
  }

  syncSystemStateToDisk();
  broadcastEvent('DEV_ROSTER_UPDATED', { roster: globalDevRoster });
  res.json({
    success: true,
    roster: globalDevRoster
  });
});

// Global Hackathon Evaluation Mode REST Endpoints
app.get('/api/system/hackathon-mode', (req, res) => {
  res.json({
    enabled: globalHackathonMode,
    active_tier: globalHackathonMode ? 'enterprise' : CAVDAX_TIER,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/system/hackathon-mode', requireDevAuth, (req, res) => {
  const { enabled } = req.body || {};
  globalHackathonMode = Boolean(enabled);
  if (!globalHackathonMode && Array.isArray(savedSystemState.sponsors)) {
    savedSystemState.sponsors = savedSystemState.sponsors.filter(s => !s.is_evaluation);
  }
  syncSystemStateToDisk();
  console.log(`[CAVDAX] Global Hackathon Evaluation Mode updated: ${globalHackathonMode ? 'ENABLED (ENTERPRISE UNLOCKED GLOBALLY)' : 'DISABLED'}`);
  broadcastEvent('HACKATHON_MODE_CHANGED', {
    enabled: globalHackathonMode,
    tier: globalHackathonMode ? 'enterprise' : CAVDAX_TIER
  });
  res.json({
    success: true,
    enabled: globalHackathonMode,
    active_tier: globalHackathonMode ? 'enterprise' : CAVDAX_TIER
  });
});

/**
 * POST /api/system/revoke-all-keys
 * Emergency Credential Invalidation & Kill Switch (Protected by requireDevAuth)
 * Instantly invalidates all active user-scoped API keys across all tiers.
 */
app.post('/api/system/revoke-all-keys', requireDevAuth, (req, res) => {
  const actor = req.session?.user?.login || req.authUser?.login || 'dev_administrator';
  const reason = (typeof req.body?.reason === 'string' && req.body.reason.trim())
    ? req.body.reason.trim().slice(0, 200)
    : 'Emergency security revocation: credential exposure containment';

  const revokedCount = userApiKeyRegistry.size;
  globalKeyRevocationEpoch = Date.now();
  userApiKeyRegistry.clear();
  syncSystemStateToDisk();

  const auditRecord = {
    action: 'EMERGENCY_GLOBAL_KEY_REVOCATION',
    actor: `@${actor.replace(/^@/, '')}`,
    reason,
    keys_revoked: revokedCount,
    revocation_epoch: globalKeyRevocationEpoch,
    timestamp: new Date().toISOString(),
    severity: 'CRITICAL'
  };

  const actionId = `act-revocation-${Date.now()}`;
  fallbackGraphState.nodes.push({
    id: actionId,
    label: 'AgentAction',
    target_file: 'SECURITY_CREDENTIAL_PURGE',
    status: 'GLOBAL_KEYS_REVOKED',
    timestamp: Date.now()
  });

  console.warn(`[CAVDAX Security] 🚨 EMERGENCY GLOBAL KEY REVOCATION: ${revokedCount} keys invalidated by @${actor}`);

  broadcastEvent('GLOBAL_KEYS_REVOKED', auditRecord);

  res.json({
    success: true,
    keys_revoked: revokedCount,
    epoch: globalKeyRevocationEpoch,
    message: `Emergency revocation complete. ${revokedCount} API key(s) purged from active memory.`,
    audit: auditRecord
  });
});

app.get('/api/client-ip', (req, res) => {
  res.json({ ip: extractClientIp(req) });
});

// 1. Health & Connection Status
app.get('/api/health', (req, res) => {
  // Exposes tier and tier_label so the Web HUD header badge can read the active
  // tier on the existing health poll — no extra /api/dev/tier-check round-trip needed.
  res.json({
    status: 'online',
    product: 'CAVDAX',
    expansion: 'Contextual Action & Verified Decision Autonomous eXecution',
    falkordb_connected: isFalkorConnected,
    tier: globalHackathonMode ? 'enterprise' : CAVDAX_TIER,
    tier_label: globalHackathonMode ? 'Enterprise' : activeTier.label,
    hackathon_mode: globalHackathonMode,
    client_ip: extractClientIp(req),
    timestamp: new Date().toISOString()
  });
});

// 2. Real-time Server-Sent Events (SSE)
app.get('/api/events', (req, res) => {
  const clientIp = extractClientIp(req);

  // OWASP A04: DoS & Socket Exhaustion Protection on persistent SSE streams
  let ipConnections = 0;
  for (const client of sseClients) {
    if (client.ip === clientIp) ipConnections++;
  }
  if (ipConnections >= 10) {
    return res.status(429).json({
      error: 'TOO_MANY_STREAMS',
      message: 'Maximum concurrent SSE event streams (10) exceeded for this IP address.'
    });
  }
  if (sseClients.size >= 500) {
    return res.status(503).json({
      error: 'STREAM_CAPACITY_REACHED',
      message: 'Server event streaming capacity reached. Please reconnect later.'
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientRecord = {
    res,
    session: req.session,
    user: req.session?.user || null,
    ip: extractClientIp(req)
  };

  sseClients.add(clientRecord);
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'CAVDAX SSE Stream Live' })}\n\n`);

  // 15s keepalive heartbeat ping to prevent Cloudflare HTTP/3 (QUIC) idle stream termination
  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientRecord);
  });
});

// 3. Seed Demo Graph
app.post('/api/seed', requireAuth, async (req, res) => {
  try {
    if (!isFalkorConnected) await initDb();

    if (graph) {
      await seedDemoGraph(graph);
      const graphState = await fetchGraphState(graph);
      broadcastEvent('GRAPH_UPDATED', graphState);
      return res.json({ success: true, message: 'FalkorDB demo graph seeded successfully.', graph: graphState });
    } else {
      // Return fallback state
      broadcastEvent('GRAPH_UPDATED', fallbackGraphState);
      return res.json({ success: true, message: 'Seeded in fallback simulation mode.', graph: fallbackGraphState });
    }
  } catch (err) {
    console.error('Seed Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * Verifies whether the calling user or session has authorized access to requestedRepo.
 * Used to eliminate Insecure Direct Object Reference (IDOR) on audit and graph routes.
 */
export async function verifyUserRepoAccess(req, requestedRepo) {
  if (!requestedRepo || requestedRepo === 'demo') return true;
  const isSessionAuth = Boolean(req.session?.user || req.authUser);
  if (!isSessionAuth) return false;

  const userLogin = (req.session?.user?.login || req.authUser?.login || '').toLowerCase();
  
  // 1. Root system user or admin role
  if (req.authUser?.role === 'admin' || userLogin === 'system') {
    return true;
  }

  // 2. Global developer roster
  if (userLogin && globalDevRoster.map(r => r.toLowerCase()).includes(userLogin)) {
    return true;
  }

  const connected = Array.isArray(req.session?.connectedRepos) ? req.session.connectedRepos : [];
  if (connected.some(r => r.toLowerCase() === requestedRepo.toLowerCase())) {
    return true;
  }

  const [owner] = requestedRepo.split('/');
  // 3. Direct personal repository check (owner matches user login)
  if (owner && userLogin && owner.toLowerCase() === userLogin) {
    return true;
  }

  // 4. Repositories recorded on the API key or system state for this user
  if (req.authUser?.connectedRepos && Array.isArray(req.authUser.connectedRepos)) {
    if (req.authUser.connectedRepos.some(r => r.toLowerCase() === requestedRepo.toLowerCase())) {
      return true;
    }
  }

  // 5. GitHub Actions / CI caller token:
  // If the caller provides a GitHub token (e.g. via x-github-token or GITHUB_TOKEN header), verify write/admin permission directly!
  const callerGhToken = req.headers?.['x-github-token'] || req.headers?.['x-github-actions-token'];
  if (callerGhToken && typeof callerGhToken === 'string') {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${requestedRepo}`, {
        headers: {
          Authorization: `Bearer ${callerGhToken.trim()}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'CAVDAX-App'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData.permissions?.push || ghData.permissions?.admin) {
          return true;
        }
      }
    } catch {}
  }

  // 6. Interactive user OAuth token check
  const token = req.session?.user?.accessToken;
  if (token) {
    if (!Array.isArray(req.session.authorizedReposCache)) {
      req.session.authorizedReposCache = [];
    }
    if (req.session.authorizedReposCache.includes(requestedRepo.toLowerCase())) {
      return true;
    }
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${requestedRepo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'CAVDAX-App'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        // REQUIRE push (write) or admin permission — public read access does NOT constitute tenant tenancy!
        const canWrite = Boolean(ghData.permissions?.push || ghData.permissions?.admin);
        if (canWrite) {
          req.session.authorizedReposCache.push(requestedRepo.toLowerCase());
          return true;
        }
      }
    } catch {
      // Network or GitHub API error - fallback to false
    }
  }

  // 7. Server GITHUB_TOKEN verification for API-key callers on Organization / Collaborator repos:
  // Allows legitimate CI gates to verify if the key owner has push/admin rights on an org repo
  if (req.authUser && process.env.GITHUB_TOKEN && userLogin) {
    try {
      const collaboratorRes = await fetch(`https://api.github.com/repos/${requestedRepo}/collaborators/${encodeURIComponent(userLogin)}/permission`, {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'CAVDAX-App'
        }
      });
      if (collaboratorRes.ok) {
        const permData = await collaboratorRes.json();
        const perm = permData.permission; // 'admin', 'write', 'read', 'none'
        if (perm === 'admin' || perm === 'write') {
          return true;
        }
      }
    } catch (err) {
      console.warn(`[CAVDAX verifyUserRepoAccess] Collaborator check failed for ${requestedRepo}:`, err.message);
    }
  }

  return false;
}

// 4. Fetch Live Graph State for Visualizer Canvas
app.get('/api/graph', async (req, res) => {
  try {
    if (!isFalkorConnected) await initDb();

    // Tenant isolation: allow authenticated users to view their connected repo graph;
    // Unauthenticated public visitors strictly receive canonical demo graph state.
    const requestedRepo = req.query.repo ? String(req.query.repo).trim() : null;
    if (requestedRepo && requestedRepo !== 'demo') {
      const hasAccess = await verifyUserRepoAccess(req, requestedRepo);
      if (!hasAccess) {
        return res.status(403).json({
          nodes: [],
          edges: [],
          error: 'FORBIDDEN',
          message: 'You do not have access to view graph state for this repository.'
        });
      }
    }
    const isSessionAuth = Boolean(req.session?.user || req.authUser);
    const repoScope = (isSessionAuth && requestedRepo) ? requestedRepo : null;

    if (graph) {
      const graphState = await fetchGraphState(graph, { repo: repoScope });
      return res.json(graphState);
    } else {
      // In-memory fallback: filter out non-demo records if not matching scope
      const filteredNodes = fallbackGraphState.nodes.filter(n => {
        if (!n.repo || n.repo === 'demo' || n.is_demo) return true;
        return repoScope && n.repo === repoScope;
      });
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = fallbackGraphState.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
      return res.json({ nodes: filteredNodes, edges: filteredEdges });
    }
  } catch (err) {
    console.error('Fetch Graph Error:', err);
    res.json(fallbackGraphState);
  }
});

// 4b. Export Standalone Graph Image (SVG) for MCP Agents & Markdown Embeds
app.get('/api/graph/export-image', async (req, res) => {
  try {
    if (!isFalkorConnected) await initDb();

    // Resolve repo and branch scopes with tenant isolation
    const requestedRepo = req.query.repo ? String(req.query.repo).trim() : null;
    if (requestedRepo && requestedRepo !== 'demo') {
      const hasAccess = await verifyUserRepoAccess(req, requestedRepo);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have access to export the graph for this repository.'
        });
      }
    }
    const requestedBranch = sanitizeBranchName(req.query.branch, null);
    const isSessionAuth = Boolean(req.session?.user || req.authUser);
    const repoScope = (isSessionAuth && requestedRepo) ? requestedRepo : null;

    let graphState = fallbackGraphState;
    if (graph) {
      graphState = await fetchGraphState(graph, { repo: repoScope });
    } else {
      // In-memory fallback
      const filteredNodes = fallbackGraphState.nodes.filter(n => {
        if (!n.repo || n.repo === 'demo' || n.is_demo) return true;
        const matchRepo = repoScope && n.repo === repoScope;
        const matchBranch = !requestedBranch || !n.branch || sanitizeBranchName(n.branch) === requestedBranch;
        return matchRepo && matchBranch;
      });
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = fallbackGraphState.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
      graphState = { nodes: filteredNodes, edges: filteredEdges };
    }

    const nodeId = req.query.node_id || req.query.nodeId || null;
    const highlightBlastRadius = req.query.blast === '1' || req.query.highlight_blast_radius === 'true';
    const isDarkTheme = req.query.theme !== 'light';

    const svg = renderGraphToSvg(graphState, {
      nodeId,
      highlightBlastRadius,
      isDarkTheme,
      title: repoScope ? `CAVDAX: ${repoScope} (${requestedBranch || 'main'})` : undefined
    });

    if (req.query.format === 'json') {
      const { summary } = (nodeId && highlightBlastRadius)
        ? computeBlastRadius(graphState.nodes, graphState.edges, nodeId)
        : { summary: { facts: 0, decisions: 0, actions: 0, files: [] } };
      return res.json({ success: true, svg, blast_radius: summary });
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    return res.send(svg);
  } catch (err) {
    console.error('Export Graph Image Error:', err);
    res.status(500).json({ success: false, error: 'Could not render graph SVG.' });
  }
});

// 5. Ingest ADR / Commit Mutation (Act II)
// checkNodeLimit runs before the handler — rejects if tier node_limit is reached
app.post('/api/ingest', requireAuth, checkNodeLimit, async (req, res) => {
  try {
    if (!isFalkorConnected) await initDb();

    // Security Confinement: Prevent path traversal (OWASP A01/A03 Hardening)
    const resolvedRepo = path.resolve(REPO_ROOT);
    let targetAdrPath = path.join(resolvedRepo, 'demo-repo/docs/adrs/ADR-002.md');
    if (req.body?.filePath && typeof req.body.filePath === 'string') {
      const candidate = path.resolve(resolvedRepo, req.body.filePath);
      if (!candidate.startsWith(resolvedRepo + path.sep) && candidate !== resolvedRepo) {
        return res.status(403).json({ success: false, error: 'Access denied: Path traversal attempt outside repository root.' });
      }
      targetAdrPath = candidate;
    }

    if (graph) {
      const ingestResult = await ingestAdrFile(graph, targetAdrPath);
      const updatedGraph = await fetchGraphState(graph);
      
      broadcastEvent('MUTATION_INGESTED', { ingestResult, graph: updatedGraph });
      broadcastEvent('GRAPH_UPDATED', updatedGraph);

      return res.json({
        success: true,
        ingestResult,
        graph: updatedGraph
      });
    } else {
      // In fallback simulation mode: mutate fallbackGraphState
      const adr001 = fallbackGraphState.nodes.find(n => n.id === 'ADR-001');
      if (adr001) adr001.status = 'SUPERSEDED';

      const f1 = fallbackGraphState.nodes.find(n => n.id === 'F-Auth-v1');
      if (f1) f1.is_stale = true;

      const d1 = fallbackGraphState.nodes.find(n => n.id === 'DEC-102');
      if (d1) d1.status = 'INVALIDATED_NEEDS_REVALIDATION';

      // Add supersedes edge (idempotent / deduplicated)
      const hasEdge = fallbackGraphState.edges.some(
        e => e.source === 'ADR-002' && e.target === 'ADR-001' && e.type === 'SUPERSEDES'
      );
      if (!hasEdge) {
        fallbackGraphState.edges.push({ source: 'ADR-002', target: 'ADR-001', type: 'SUPERSEDES' });
      }

      broadcastEvent('MUTATION_INGESTED', { adr_id: 'ADR-002', supersedes: 'ADR-001', graph: fallbackGraphState });
      broadcastEvent('GRAPH_UPDATED', fallbackGraphState);

      return res.json({
        success: true,
        simulated: true,
        ingestResult: {
          adr_id: 'ADR-002',
          supersedes: 'ADR-001',
          invalidation: { affected_decisions: 1, invalidated_decision_ids: ['DEC-102'], latency_ms: 2.1 }
        },
        graph: fallbackGraphState
      });
    }
  } catch (err) {
    console.error('Ingest Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Enclosed MCP Gate Execution (Act III & Safe Execution)
app.post('/api/mcp/call', requireAuth, async (req, res) => {
  const { toolName, args } = req.body || {};

  // --- Input validation: fail fast with a clean 400 before touching the DB ---
  // Without this, undefined args crash mcpServer.handleToolCall with a TypeError
  // and undefined decision_id causes FalkorDB parameter serialisation exceptions,
  // both returning an opaque 500 to the caller.
  if (!toolName || typeof toolName !== 'string') {
    return res.status(400).json({
      isError: true,
      error: "Missing or invalid 'toolName'. Must be 'apply_code_change' or 'revalidate_decision'."
    });
  }

  if (!args || typeof args !== 'object') {
    return res.status(400).json({
      isError: true,
      error: "Missing or invalid 'args' object payload."
    });
  }

  if (toolName === 'apply_code_change') {
    if (!args.decision_id || typeof args.decision_id !== 'string') {
      return res.status(400).json({
        isError: true,
        error: "Missing required parameter 'args.decision_id' for tool 'apply_code_change'."
      });
    }
    if (!args.file_path || !args.code_payload) {
      return res.status(400).json({
        isError: true,
        error: "Missing required parameters 'args.file_path' and/or 'args.code_payload'."
      });
    }

    // Hosted Demo Security Confinement: writes from /api/mcp/call are strictly confined to demo-repo sandbox
    const sandboxDir = path.resolve(REPO_ROOT, 'demo-repo');
    const resolvedPath = path.resolve(sandboxDir, args.file_path);
    if (!resolvedPath.startsWith(sandboxDir + path.sep) && resolvedPath !== sandboxDir) {
      return res.status(403).json({
        isError: true,
        gate_verdict: 'BLOCKED_PATH_TRAVERSAL',
        error: 'Access denied: Target file path must reside within the demo-repo sandbox.'
      });
    }
  } else if (toolName === 'revalidate_decision') {
    const required = ['new_source_id', 'old_decision_id', 'new_decision_id', 'new_fact_id', 'title'];
    const missing = required.filter(field => !args[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        isError: true,
        error: `Missing required parameter(s) for 'revalidate_decision': ${missing.join(', ')}`
      });
    }
  } else if (toolName === 'check_intent_clearance') {
    if (!args.decision_id || typeof args.decision_id !== 'string' || args.decision_id.trim().length === 0) {
      return res.status(400).json({
        isError: true,
        error: "Missing or empty required parameter 'args.decision_id' for tool 'check_intent_clearance'."
      });
    }
    if (args.decision_id.length > 128) {
      return res.status(400).json({
        isError: true,
        error: "Parameter 'args.decision_id' exceeds maximum length limit of 128 characters."
      });
    }
    if (args.target_file && (typeof args.target_file !== 'string' || args.target_file.length > 256)) {
      return res.status(400).json({
        isError: true,
        error: "Optional parameter 'args.target_file' must be a string with maximum length of 256 characters."
      });
    }
    if (args.proposed_action && (typeof args.proposed_action !== 'string' || args.proposed_action.length > 500)) {
      return res.status(400).json({
        isError: true,
        error: "Optional parameter 'args.proposed_action' must be a string with maximum length of 500 characters."
      });
    }
    args.decision_id = args.decision_id.trim();
  } else if (toolName === 'acquire_decision_lock') {
    if (!args.decision_id || !args.agent_id) {
      return res.status(400).json({
        isError: true,
        error: "Missing required parameters 'args.decision_id' and/or 'args.agent_id' for 'acquire_decision_lock'."
      });
    }
  } else if (toolName === 'release_decision_lock') {
    if (!args.decision_id || !args.agent_id) {
      return res.status(400).json({
        isError: true,
        error: "Missing required parameters 'args.decision_id' and/or 'args.agent_id' for 'release_decision_lock'."
      });
    }
  } else if (toolName === 'export_graph_image') {
    // optional parameters, no mandatory fields required
  } else {
    return res.status(400).json({
      isError: true,
      error: `Unsupported MCP tool: '${toolName}'. Supported tools: 'apply_code_change', 'revalidate_decision', 'check_intent_clearance', 'acquire_decision_lock', 'release_decision_lock', 'export_graph_image'.`
    });
  }
  // --- End validation ---

  // --- Plan Quota Enforcement (Causal Verification Gate) ---
  const sessionTier = req.session?.tier || req.session?.user?.tier;
  const effectiveTier = globalHackathonMode ? 'enterprise' : (sessionTier || CAVDAX_TIER || 'free').toLowerCase();
  const decisionLimit = effectiveTier === 'free' ? 50 : (effectiveTier === 'pro' ? 1000 : -1);

  if (decisionLimit !== -1 && (toolName === 'apply_code_change' || toolName === 'revalidate_decision')) {
    let currentDecisions = 0;
    try {
      if (graph) {
        const dRes = await graph.query("MATCH (d:Decision) WHERE coalesce(d.is_demo, false) = false AND NOT d.id IN ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-100', 'DEC-101', 'DEC-102', 'DEC-103', 'DEC-201'] RETURN count(d) AS cnt");
        if (dRes && dRes.data && dRes.data.length > 0) {
          const val = dRes.data[0].cnt;
          currentDecisions = typeof val === 'number' ? val : parseInt(val, 10) || 0;
        }
      }
    } catch {}

    if (currentDecisions >= decisionLimit) {
      return res.status(429).json({
        isError: true,
        gate_verdict: 'BLOCKED_QUOTA_EXCEEDED',
        error: `Monthly verification quota exceeded: ${effectiveTier === 'free' ? 'Community' : 'Pro'} tier allows up to ${decisionLimit} causal verifications per month. Upgrade your plan to increase throughput.`
      });
    }
  }

  try {
    if (!isFalkorConnected) await initDb();

    if (mcpServer) {
      const result = await mcpServer.handleToolCall(toolName, args);
      const updatedGraph = await fetchGraphState(graph);

      broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result });
      broadcastEvent('GRAPH_UPDATED', updatedGraph);

      return res.json(result);
    } else {
      // Fallback simulation mode
      if (toolName === 'apply_code_change') {
        const isDec102 = args.decision_id === 'DEC-102';
        const dNode = fallbackGraphState.nodes.find(n => n.id === args.decision_id);

        // 1. Fail Closed: If decision node does not exist in graph records, reject immediately
        if (!dNode && !isDec102) {
          const unknownResponse = {
            isError: true,
            simulated: true,
            simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
            gate_verdict: 'BLOCKED_NO_GROUNDING',
            decision_id: args.decision_id,
            latency_ms: 0,
            simulated_latency_ms: 1.12,
            message: `⛔ CAVDAX GATE BLOCKED (SIMULATION): Execution rejected. Decision '${args.decision_id}' does not exist in active architecture records. Zero files written.`,
            instructions_for_agent: `To resolve this, verify the decision ID or author an Architecture Decision Record (ADR) before submitting code changes.`
          };
          broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: unknownResponse });
          return res.json(unknownResponse);
        }

        const isInvalidated = (dNode && dNode.status === 'INVALIDATED_NEEDS_REVALIDATION') || isDec102;

        if (isInvalidated) {
          const actionId = `act-${Date.now()}`;
          // Replace prior action for this decision to prevent duplicate node clutter
          fallbackGraphState.nodes = fallbackGraphState.nodes.filter(
            n => !(n.label === 'AgentAction' && n.decision_id === args.decision_id)
          );
          fallbackGraphState.nodes.push({
            id: actionId,
            decision_id: args.decision_id,
            label: 'AgentAction',
            target_file: args.file_path,
            status: 'BLOCKED_SUPERSEDED_SOURCE',
            timestamp: Date.now()
          });
          fallbackGraphState.edges = fallbackGraphState.edges.filter(
            e => !(e.target === args.decision_id && e.type === 'GROUNDED_IN')
          );
          fallbackGraphState.edges.push({
            source: actionId,
            target: args.decision_id,
            type: 'GROUNDED_IN'
          });

          const rejectResponse = {
            isError: true,
            simulated: true, // FalkorDB offline — in-memory simulation
            simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
            gate_verdict: 'BLOCKED_SUPERSEDED_SOURCE',
            decision_id: args.decision_id,
            latency_ms: 0,             // Real query latency is 0 (no DB was queried)
            simulated_latency_ms: 1.84, // Reference value from prior live benchmarks
            violation_paths: [['Source:ADR-001 (SUPERSEDED)', 'Fact:F-Auth-v1 (STALE)', `Decision:${args.decision_id}`]],
            message: `⛔ CAVDAX GATE BLOCKED (SIMULATION): Execution rejected. Decision '${args.decision_id}' is grounded in superseded source 'ADR-001'. No files were written.`,
            instructions_for_agent: `To resolve this, inspect superseding source 'ADR-002', call 'revalidate_decision', and re-submit with the active decision ID.`
          };
          broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: rejectResponse });
          return res.json(rejectResponse);
        } else {
          // Approved — Security Confinement: verify file target resides within demo-repo sandbox
          const resolvedRepo = path.resolve(REPO_ROOT, 'demo-repo');
          const targetPath = path.resolve(resolvedRepo, args.file_path);
          if (!targetPath.startsWith(resolvedRepo + path.sep)) {
            return res.status(403).json({
              isError: true,
              gate_verdict: 'BLOCKED_PATH_TRAVERSAL',
              error: 'Access denied: Target file path must reside within the demo-repo sandbox.'
            });
          }
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, args.code_payload, 'utf-8');

          const actionId = `act-${Date.now()}`;
          // Replace prior action for this decision to prevent duplicate node clutter
          fallbackGraphState.nodes = fallbackGraphState.nodes.filter(
            n => !(n.label === 'AgentAction' && n.decision_id === args.decision_id)
          );
          fallbackGraphState.nodes.push({
            id: actionId,
            decision_id: args.decision_id,
            label: 'AgentAction',
            target_file: args.file_path,
            status: 'EXECUTED',
            timestamp: Date.now()
          });
          fallbackGraphState.edges = fallbackGraphState.edges.filter(
            e => !(e.target === args.decision_id && e.type === 'GROUNDED_IN')
          );
          fallbackGraphState.edges.push({
            source: actionId,
            target: args.decision_id,
            type: 'GROUNDED_IN'
          });

          const approveResponse = {
            isError: false,
            simulated: true, // FalkorDB offline — in-memory simulation
            simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
            gate_verdict: 'APPROVED',
            decision_id: args.decision_id,
            latency_ms: 0,             // Real query latency is 0 (no DB was queried)
            simulated_latency_ms: 1.62, // Reference value from prior live benchmarks
            file_path: targetPath,
            message: `✅ CAVDAX GATE APPROVED (SIMULATION): Target file written to disk.`
          };
          broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: approveResponse });
          broadcastEvent('GRAPH_UPDATED', fallbackGraphState);
          return res.json(approveResponse);
        }
      } else if (toolName === 'check_intent_clearance') {
        const isDec102 = args.decision_id === 'DEC-102';
        const dNode = fallbackGraphState.nodes.find(n => n.id === args.decision_id);

        // Fail closed if decision is unrecognized
        if (!dNode && !isDec102) {
          const denialResponse = {
            isError: true,
            clearance_granted: false,
            simulated: true,
            simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
            gate_verdict: 'BLOCKED_NO_GROUNDING',
            decision_id: args.decision_id,
            target_file: args.target_file || null,
            proposed_action: args.proposed_action || null,
            latency_ms: 0,
            simulated_latency_ms: 1.12,
            message: `⛔ CLEARANCE DENIED (SIMULATION): Decision '${args.decision_id}' does not exist in architecture records. Pre-flight check failed.`,
            instructions_for_agent: `Do NOT generate code grounded in '${args.decision_id}'. Verify the decision ID or author an ADR before requesting clearance.`
          };
          broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: denialResponse });
          return res.json(denialResponse);
        }

        const isInvalidated = (dNode && dNode.status === 'INVALIDATED_NEEDS_REVALIDATION') || isDec102;

        if (isInvalidated) {
          const denialResponse = {
            isError: true,
            clearance_granted: false,
            simulated: true,
            simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
            gate_verdict: 'BLOCKED_SUPERSEDED_SOURCE',
            decision_id: args.decision_id,
            target_file: args.target_file || null,
            proposed_action: args.proposed_action || null,
            latency_ms: 0,
            simulated_latency_ms: 1.84,
            violation_paths: [['Source:ADR-001 (SUPERSEDED)', 'Fact:F-Auth-v1 (STALE)', `Decision:${args.decision_id}`]],
            message: `⛔ CLEARANCE DENIED (SIMULATION): Decision '${args.decision_id}' is grounded in superseded source 'ADR-001'. Pre-flight check failed.`,
            instructions_for_agent: `Do NOT generate code grounded in '${args.decision_id}'. Inspect superseding source 'ADR-002', call 'revalidate_decision', and re-check clearance.`
          };
          broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: denialResponse });
          return res.json(denialResponse);
        } else {
          const grantResponse = {
            isError: false,
            clearance_granted: true,
            simulated: true,
            simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
            gate_verdict: 'APPROVED',
            decision_id: args.decision_id,
            target_file: args.target_file || null,
            proposed_action: args.proposed_action || null,
            latency_ms: 0,
            simulated_latency_ms: 1.62,
            message: `✅ CLEARANCE GRANTED (SIMULATION): Decision '${args.decision_id}' is valid and active. Safe to proceed with code generation.`
          };
          broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: grantResponse });
          return res.json(grantResponse);
        }
      } else if (toolName === 'acquire_decision_lock') {
        cleanExpiredDecisionLocks();
        const existingLock = activeDecisionLocks.get(args.decision_id);
        const ttl = Number(args.ttl_ms) || 60000;
        const now = Date.now();

        if (existingLock && existingLock.expires_at > now && existingLock.agent_id !== args.agent_id) {
          const conflictResp = {
            isError: true,
            acquired: false,
            simulated: true,
            gate_verdict: 'BLOCKED_LOCK_HELD_BY_OTHER_AGENT',
            decision_id: args.decision_id,
            holder_agent_id: existingLock.agent_id,
            expires_at: new Date(existingLock.expires_at).toISOString(),
            remaining_seconds: Math.max(0, Math.ceil((existingLock.expires_at - now) / 1000)),
            message: `⛔ CONCURRENCY COLLISION: Decision '${args.decision_id}' is locked by agent '${existingLock.agent_id}'. Multi-agent collision prevented.`,
            instructions_for_agent: `Wait for agent '${existingLock.agent_id}' to release the lease or yield to avoid split-brain git conflicts.`
          };
          broadcastEvent('DECISION_LOCK_CONFLICT', conflictResp);
          return res.status(409).json(conflictResp);
        }

        const expiresAt = now + ttl;
        const lockRecord = {
          agent_id: args.agent_id,
          decision_id: args.decision_id,
          expires_at: expiresAt,
          acquired_at: now
        };
        activeDecisionLocks.set(args.decision_id, lockRecord);

        const lockResp = {
          isError: false,
          acquired: true,
          simulated: true,
          gate_verdict: 'LOCK_ACQUIRED',
          decision_id: args.decision_id,
          agent_id: args.agent_id,
          ttl_ms: ttl,
          expires_at: new Date(expiresAt).toISOString(),
          message: `✅ LOCK ACQUIRED: Agent '${args.agent_id}' holds exclusive lease on '${args.decision_id}'.`
        };
        broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: lockResp });
        broadcastEvent('DECISION_LOCK_CHANGED', {
          action: 'ACQUIRED',
          decision_id: args.decision_id,
          agent_id: args.agent_id,
          activeLocks: Array.from(activeDecisionLocks.values())
        });
        return res.json(lockResp);
      } else if (toolName === 'release_decision_lock') {
        cleanExpiredDecisionLocks();
        const existingLock = activeDecisionLocks.get(args.decision_id);
        const wasHeld = Boolean(existingLock);
        activeDecisionLocks.delete(args.decision_id);

        const unlockResp = {
          isError: false,
          released: true,
          simulated: true,
          decision_id: args.decision_id,
          agent_id: args.agent_id || existingLock?.agent_id || 'unknown',
          message: wasHeld
            ? `🔓 LOCK RELEASED: Decision '${args.decision_id}' lease returned to pool. Free for other agents.`
            : `LOCK RELEASED: Decision '${args.decision_id}' was not held.`
        };
        broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: unlockResp });
        broadcastEvent('DECISION_LOCK_CHANGED', {
          action: 'RELEASED',
          decision_id: args.decision_id,
          activeLocks: Array.from(activeDecisionLocks.values())
        });
        return res.json(unlockResp);
      } else if (toolName === 'export_graph_image') {
        const { summary } = (args.node_id && args.highlight_blast_radius)
          ? computeBlastRadius(fallbackGraphState.nodes, fallbackGraphState.edges, args.node_id)
          : { summary: { facts: 0, decisions: 0, actions: 0, files: [] } };
        const svg = renderGraphToSvg(fallbackGraphState, {
          nodeId: args.node_id,
          highlightBlastRadius: Boolean(args.highlight_blast_radius)
        });
        const exportResp = { format: args.format || 'svg', svg, node_count: fallbackGraphState.nodes.length, edge_count: fallbackGraphState.edges.length, blast_radius: summary };
        broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: exportResp });
        return res.json(exportResp);
      } else if (toolName === 'revalidate_decision') {
        // Act IV simulation
        const oldD = fallbackGraphState.nodes.find(n => n.id === args.old_decision_id);
        if (oldD) oldD.status = 'REPLACED_ARCHIVED';

        fallbackGraphState.nodes.push({
          id: args.new_decision_id,
          label: 'Decision',
          title: args.title,
          status: 'VALID'
        });
        fallbackGraphState.edges.push({
          source: args.new_decision_id,
          target: args.new_fact_id,
          type: 'DEPENDS_ON'
        });
        fallbackGraphState.edges.push({
          source: args.new_decision_id,
          target: args.old_decision_id,
          type: 'REPLACES'
        });

        const revalResponse = {
          isError: false,
          simulated: true, // FalkorDB offline — in-memory simulation
          simulated_warning: 'FalkorDB offline — returned from in-memory simulation',
          message: `✅ REVALIDATION COMPLETE (SIMULATION): Decision '${args.new_decision_id}' is active and grounded in '${args.new_fact_id}'.`,
          active_decision_id: args.new_decision_id,
          latency_ms: 0,            // Real query latency is 0 (no DB was queried)
          simulated_latency_ms: 2.3 // Reference value from prior live benchmarks
        };
        broadcastEvent('MCP_TOOL_EXECUTED', { toolName, args, result: revalResponse });
        broadcastEvent('GRAPH_UPDATED', fallbackGraphState);
        return res.json(revalResponse);
      }
    }
  } catch (err) {
    console.error('MCP Call Error:', err);
    res.status(500).json({ isError: true, error: err.message });
  }
});

// 7. Act IV Direct Revalidation Helper
app.post('/api/act-iv-revalidate', requireAuth, async (req, res) => {
  try {
    if (!isFalkorConnected) await initDb();

    const payload = {
      new_source_id: 'ADR-002',
      old_decision_id: 'DEC-102',
      new_decision_id: 'DEC-103',
      new_fact_id: 'F-OAuth2',
      title: 'Scaffold Payment Gateway with OAuth2 (JWT/RS256)'
    };

    if (mcpServer) {
      const result = await mcpServer.handleToolCall('revalidate_decision', payload);
      const updatedGraph = await fetchGraphState(graph);
      broadcastEvent('GRAPH_UPDATED', updatedGraph);
      return res.json({ success: true, result, graph: updatedGraph });
    } else {
      // In fallback simulation
      const oldD = fallbackGraphState.nodes.find(n => n.id === 'DEC-102');
      if (oldD) oldD.status = 'REPLACED_ARCHIVED';

      if (!fallbackGraphState.nodes.some(n => n.id === 'DEC-103')) {
        fallbackGraphState.nodes.push({
          id: 'DEC-103',
          label: 'Decision',
          title: 'Scaffold Payment Gateway with OAuth2 (JWT/RS256)',
          status: 'VALID'
        });
        fallbackGraphState.edges.push({ source: 'DEC-103', target: 'F-OAuth2', type: 'DEPENDS_ON' });
        fallbackGraphState.edges.push({ source: 'DEC-103', target: 'DEC-102', type: 'REPLACES' });
      }

      broadcastEvent('GRAPH_UPDATED', fallbackGraphState);
      return res.json({
        success: true,
        simulated: true,
        result: {
          active_decision_id: 'DEC-103',
          archived_decision_id: 'DEC-102',
          latency_ms: 2.1
        },
        graph: fallbackGraphState
      });
    }
  } catch (err) {
    console.error('Act IV Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Reset Demo Repository & Graph (Protected by requireDevAuth)
app.post('/api/reset', requireDevAuth, async (req, res) => {
  try {
    const paymentServicePath = path.join(REPO_ROOT, 'demo-repo/src/services/payment.js');
    const initialStub = `/**
 * Payment Gateway Service
 * Target file subject to CAVDAX Enclosed MCP Guardrails.
 */

import express from 'express';

const app = express();
app.use(express.json());

// Current initial state: Unimplemented checkout route awaiting agent implementation
app.post('/api/checkout', (req, res) => {
  res.status(501).json({ error: 'Checkout route not implemented yet.' });
});

export default app;
`;
    fs.writeFileSync(paymentServicePath, initialStub, 'utf-8');

    if (!isFalkorConnected) await initDb();
    if (graph) {
      await seedDemoGraph(graph);
      const state = await fetchGraphState(graph);
      broadcastEvent('GRAPH_UPDATED', state);
      return res.json({ success: true, message: 'Reset complete.', graph: state });
    } else {
      fallbackGraphState = {
        nodes: [
          { id: 'ADR-001', label: 'Source', title: 'Adopt TokenAuth v1 for Payment Gateway', status: 'ACTIVE', type: 'ADR' },
          { id: 'F-Auth-v1', label: 'Fact', claim: 'Payment services require TokenAuth v1', is_stale: false, verified: true },
          { id: 'DEC-102', label: 'Decision', title: 'Generate Checkout Service with TokenAuth v1', status: 'VALID' },
          { id: 'ADR-002', label: 'Source', title: 'Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned', status: 'ACTIVE', type: 'ADR' },
          { id: 'F-OAuth2', label: 'Fact', claim: 'OAuth2 is strictly enforced; TokenAuth v1 prohibited', is_stale: false, verified: true }
        ],
        edges: [
          { source: 'F-Auth-v1', target: 'ADR-001', type: 'EXTRACTED_FROM' },
          { source: 'DEC-102', target: 'F-Auth-v1', type: 'DEPENDS_ON' },
          { source: 'F-OAuth2', target: 'ADR-002', type: 'EXTRACTED_FROM' }
        ]
      };
      broadcastEvent('GRAPH_UPDATED', fallbackGraphState);
      return res.json({ success: true, simulated: true, message: 'Reset to initial state.', graph: fallbackGraphState });
    }
  } catch (err) {
    console.error('Reset Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// 9. Audit Log — Agent Action History for Security & Compliance Teams
// ---------------------------------------------------------------------------

/**
 * GET /api/audit[?limit=<n>]
 *
 * Returns a time-ordered list of all AgentAction nodes written to FalkorDB by
 * the MCP gate, enriched with the grounding decision and its status.
 * This endpoint is read-only and does NOT require auth — compliance dashboards
 * and monitoring tools can poll it without a token.
 *
 * Falls back to the in-memory fallbackGraphState when FalkorDB is offline.
 *
 * Query params:
 *   limit  — max entries to return (default: 100, max: 500)
 */
app.get('/api/audit', async (req, res) => {
  // Cap is tier-aware: free=10, pro=1000, enterprise=500.
  // Reads from activeTier.audit_log_limit — same TIER_CONFIG object that drives rate limits.
  const tierCap = activeTier.audit_log_limit;
  const limit = Math.min(parseInt(req.query.limit || '100', 10), tierCap);

  // Tenant isolation: unauthenticated visitors strictly receive demo audit entries.
  const requestedRepo = req.query.repo ? String(req.query.repo).trim() : null;
  if (requestedRepo && requestedRepo !== 'demo') {
    const hasAccess = await verifyUserRepoAccess(req, requestedRepo);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        entries: [],
        error: 'FORBIDDEN',
        message: 'You do not have access to audit records for this repository.'
      });
    }
  }
  const requestedBranch = sanitizeBranchName(req.query.branch, null);
  const isSessionAuth = Boolean(req.session?.user || req.authUser);
  const repoScope = (isSessionAuth && requestedRepo) ? requestedRepo : null;

  try {
    if (!isFalkorConnected) await initDb();

    let entries = [];
    let latencyMs = 0;
    let totalCount = 0;

    if (graph) {
      const auditData = await fetchAuditLog(graph, limit, { repo: repoScope });
      entries = auditData.entries || [];
      latencyMs = auditData.latency_ms || 0;
      totalCount = auditData.total || entries.length;
    } else {
      // Fallback: derive audit entries from in-memory fallbackGraphState
      const fallbackEntries = fallbackGraphState.nodes
        .filter(n => n.label === 'AgentAction')
        .filter(n => {
          if (!n.repo || n.repo === 'demo') return true;
          return repoScope && n.repo === repoScope;
        })
        .map(n => {
          const edge = fallbackGraphState.edges.find(e => e.source === n.id && e.type === 'GROUNDED_IN');
          const decisionId = edge ? edge.target : null;
          const decisionNode = decisionId ? fallbackGraphState.nodes.find(d => d.id === decisionId) : null;
          return {
            action_id:       n.id,
            target_file:     n.target_file || null,
            status:          n.status,
            repo:            n.repo || 'demo',
            branch:          n.branch || 'main',
            executed_at:     n.timestamp || Date.now(),
            decision_id:     decisionId,
            decision_status: decisionNode ? decisionNode.status : null,
            decision_title:  decisionNode ? decisionNode.title : null
          };
        });
      entries = fallbackEntries;
      totalCount = fallbackEntries.length;
    }

    // Merge persistent connected repo audit entries strictly scoped to the authorized repo
    const persistedActions = Array.isArray(savedSystemState.auditEntries) ? savedSystemState.auditEntries : [];
    const seenActionIds = new Set(entries.map(e => e.action_id));
    for (const pa of persistedActions) {
      const matchRepo = repoScope ? (pa.repo === repoScope) : (!pa.repo || pa.repo === 'demo');
      const matchBranch = !requestedBranch || sanitizeBranchName(pa.branch || 'main') === requestedBranch;
      if (matchRepo && matchBranch && !seenActionIds.has(pa.action_id)) {
        entries.push(pa);
        seenActionIds.add(pa.action_id);
      }
    }

    // Sort descending by execution time and apply limit
    entries.sort((a, b) => (b.executed_at || 0) - (a.executed_at || 0));
    const cappedEntries = entries.slice(0, limit);

    return res.json({
      success: true,
      simulated: !graph,
      entries: cappedEntries,
      total: entries.length,
      latency_ms: latencyMs
    });
  } catch (err) {
    console.error('Audit Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// SOURCE INGESTION ENDPOINT (Extended source types via HTTP)
// ---------------------------------------------------------------------------

/**
 * POST /api/ingest-source
 *
 * Ingest any of the 4 extended source types into FalkorDB over HTTP.
 * Useful for GitHub webhooks, CI pipelines, and external automation.
 *
 * Auth: Bearer token required (requireAuth).
 *
 * Request body:
 *   { type: 'commit'|'package'|'codeowners'|'issue', ...typeSpecificFields }
 *
 * Supported types and their required fields:
 *   commit:     { sha, message, author? }
 *   package:    { packageName, newVersion, oldVersion? }
 *   codeowners: { ownedPath, newOwner, oldOwner?, filePath? }
 *   issue:      { issueNumber, title, htmlUrl, body?, supersedesIds?, state? }
 */
// checkNodeLimit runs before the handler — rejects if tier node_limit is reached
app.post('/api/ingest-source', requireAuth, checkNodeLimit, async (req, res) => {
  const { type, ...fields } = req.body || {};

  if (!type) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: type',
      valid_types: ['commit', 'package', 'codeowners', 'issue']
    });
  }

  const validTypes = ['commit', 'package', 'codeowners', 'issue'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Unknown type "${type}"`,
      valid_types: validTypes
    });
  }

  try {
    if (!isFalkorConnected) await initDb();

    // Dynamically import sources.js (same relative path used by ingestCommand.js)
    const sources = await import('../../core/ingestion/sources.js');

    if (!graph) {
      // FalkorDB offline — return a dry-run acknowledgement
      return res.json({
        success: true,
        dry_run: true,
        type,
        message: 'FalkorDB is offline — no data written. Fields received:',
        fields
      });
    }

    let result;

    switch (type) {
      case 'commit': {
        const { sha, message, author } = fields;
        if (!sha || !message) {
          return res.status(400).json({ success: false, error: 'commit requires sha and message' });
        }
        result = await sources.ingestGitCommit(graph, { sha, message, author });
        break;
      }
      case 'package': {
        const { packageName, newVersion, oldVersion } = fields;
        if (!packageName || !newVersion) {
          return res.status(400).json({ success: false, error: 'package requires packageName and newVersion' });
        }
        result = await sources.ingestPackageJsonChange(graph, { packageName, newVersion, oldVersion });
        break;
      }
      case 'codeowners': {
        const { ownedPath, newOwner, oldOwner, filePath } = fields;
        if (!ownedPath || !newOwner) {
          return res.status(400).json({ success: false, error: 'codeowners requires ownedPath and newOwner' });
        }
        result = await sources.ingestCodeownersChange(graph, { ownedPath, newOwner, oldOwner, filePath });
        break;
      }
      case 'issue': {
        const { issueNumber, title, htmlUrl, body, supersedesIds, state } = fields;
        if (!issueNumber || !title || !htmlUrl) {
          return res.status(400).json({ success: false, error: 'issue requires issueNumber, title, and htmlUrl' });
        }
        result = await sources.ingestGitHubIssue(graph, {
          issueNumber,
          title,
          htmlUrl,
          body: body || '',
          supersedesIds: supersedesIds || [],
          state: state || 'closed'
        });
        break;
      }
    }

    broadcastEvent('SOURCE_INGESTED', { type, source_id: result.source_id });
    res.json({ success: true, type, result });

  } catch (err) {
    console.error('[CAVDAX] /api/ingest-source error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// DEV TIER CHECK (Internal diagnostic endpoint — URL-only, no nav tab)
// ---------------------------------------------------------------------------

/**
 * GET /api/dev/tier-check
 *
 * Returns server tier, FalkorDB connection state, rate-limit config,
 * active session counts, and process uptime. Used by DevConsolePage.
 *
 * No auth required — read-only diagnostic. Restrict at Caddy level in prod
 * (e.g. only allow internal IPs or VPN).
 */
app.get('/api/dev/tier-check', (req, res) => {
  // Use top-level TIER_CONFIG and CAVDAX_TIER — single source of truth
  // so the reported limits match the limits actually enforced by the limiters.
  res.json({
    success: true,
    tier: CAVDAX_TIER,
    tier_meta: activeTier,
    falkordb: {
      connected: isFalkorConnected,
      host: process.env.FALKORDB_HOST || 'localhost',
      port: parseInt(process.env.FALKORDB_PORT || '6379', 10),
      graph_name: process.env.FALKORDB_GRAPH_NAME || 'cavdax_core_graph',
      mode: isFalkorConnected ? 'live' : 'simulation'
    },
    sessions: {
      mcp_active: mcpSessions.size,
      sse_clients: sseClients.size,
      mcp_ttl_ms: MCP_SESSION_TTL_MS
    },
    server: {
      uptime_seconds: Math.floor(process.uptime()),
      node_version: process.version,
      port: PORT,
      auth_enabled: !!API_TOKEN
    }
  });
});

/**
 * POST /api/dev/log-event
 * Broadcasts an authentic developer team event across all connected SSE clients.
 * Protected by requireDevAuth (validates constant-time Bearer token, dev roster, or loopback socket).
 */
app.post('/api/dev/log-event', requireDevAuth, (req, res) => {
  const { type, message, metadata } = req.body || {};
  if (!type || !message) {
    return res.status(400).json({ success: false, error: 'type and message required' });
  }
  const eventPayload = {
    id: `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: String(type).toUpperCase().slice(0, 32),
    message: String(message).slice(0, 256),
    metadata: metadata || {},
    timestamp: Date.now()
  };
  broadcastEvent('DEV_TEAM_EVENT', eventPayload);
  return res.json({ success: true, event: eventPayload });
});

/**
 * GET /api/user/quota
 * Real plan tier limits, active graph node counts, and billing cycle calculations.
 */
app.get('/api/user/quota', async (req, res) => {
  const sessionTier = req.session?.tier || req.session?.user?.tier;
  const effectiveTier = globalHackathonMode ? 'enterprise' : (req.query.tier || sessionTier || CAVDAX_TIER || 'free').toLowerCase();
  const tier = effectiveTier;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;

  const userLogin = req.session?.user?.login;
  const matchingSponsor = userLogin && Array.isArray(savedSystemState.sponsors)
    ? savedSystemState.sponsors.find(s => s.github_handle === userLogin)
    : null;
  let isSponsor = Boolean(req.session?.is_sponsor || req.session?.user?.is_sponsor || matchingSponsor);
  let sponsorTier = req.session?.sponsor_tier || req.session?.user?.sponsor_tier || matchingSponsor?.tier_label || null;
  if (!globalHackathonMode && (req.session?.is_evaluation_sponsor || matchingSponsor?.is_evaluation)) {
    if (!matchingSponsor || matchingSponsor.is_evaluation) {
      isSponsor = false;
      sponsorTier = null;
    }
  }

  let activeNodes = fallbackGraphState.nodes.length;
  let userDecisions = 0;
  try {
    if (graph) {
      const qRes = await graph.query('MATCH (n) RETURN count(n) AS cnt');
      if (qRes && qRes.data && qRes.data.length > 0) {
        const val = qRes.data[0].cnt;
        activeNodes = typeof val === 'number' ? val : parseInt(val, 10) || fallbackGraphState.nodes.length;
      }
      // Count only real user-created decisions (strictly excluding the canonical 4-Act demo decisions)
      const dRes = await graph.query("MATCH (d:Decision) WHERE coalesce(d.is_demo, false) = false AND NOT d.id IN ['DEC-001', 'DEC-002', 'DEC-003', 'DEC-100', 'DEC-101', 'DEC-102', 'DEC-103', 'DEC-201'] RETURN count(d) AS cnt");
      if (dRes && dRes.data && dRes.data.length > 0) {
        userDecisions = typeof dRes.data[0].cnt === 'number' ? dRes.data[0].cnt : parseInt(dRes.data[0].cnt, 10) || 0;
      }
    }
  } catch {
    // fallback in-memory count
  }

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(1, endOfMonth.getDate() - now.getDate());

  res.json({
    success: true,
    tier,
    tier_label: config.label,
    is_sponsor: isSponsor,
    sponsor_tier: sponsorTier,
    limits: {
      repositories: tier === 'free' ? 1 : (tier === 'pro' ? 10 : -1),
      decisions: tier === 'free' ? 50 : (tier === 'pro' ? 1000 : -1),
      nodes: config.node_limit,
      rate_limit_per_min: config.rate_limit_per_min,
      mcp_rate_limit_per_min: config.mcp_rate_limit_per_min
    },
    usage: {
      repositories: Array.isArray(req.session?.connectedRepos) && req.session.connectedRepos.length > 0 ? req.session.connectedRepos.length : 1,
      user_decisions: userDecisions,
      active_nodes: activeNodes,
      mcp_sessions: mcpSessions.size,
      sse_clients: sseClients.size
    },
    cycle: {
      days_remaining: daysRemaining,
      resets_on: new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  });
});

// ---------------------------------------------------------------------------
// OFFICIAL MCP SSE TRANSPORT (MCP spec 2024-11-05)
// ---------------------------------------------------------------------------

/**
 * Handles a JSON-RPC 2.0 MCP request against the mcpServer (or fallback simulation).
 * Supports: initialize, notifications/initialized, tools/list, tools/call
 */
async function handleMcpJsonRpc(request) {
  const { id, method, params } = request;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'cavdax-causal-mcp-gate', version: '1.0.0' }
      }
    };
  }

  if (method === 'notifications/initialized') {
    return null; // notifications require no response
  }

  if (method === 'tools/list') {
    const tools = mcpServer ? mcpServer.getTools() : [];
    return { jsonrpc: '2.0', id, result: { tools } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    if (!isFalkorConnected) await initDb();

    if (mcpServer) {
      const result = await mcpServer.handleToolCall(name, args);
      const updatedGraph = await fetchGraphState(graph);
      broadcastEvent('MCP_TOOL_EXECUTED', { toolName: name, args, result });
      broadcastEvent('GRAPH_UPDATED', updatedGraph);
      return { jsonrpc: '2.0', id, result };
    }

    // Fallback simulation (mirrors /api/mcp/call logic)
    const isStale = args?.decision_id === 'DEC-102';
    if (name === 'apply_code_change') {
      const verdict = isStale ? 'BLOCKED_SUPERSEDED_SOURCE' : 'VERIFIED_CAUSAL_PROVENANCE';
      return {
        jsonrpc: '2.0',
        id,
        result: {
          isError: isStale,
          content: [{
            type: 'text',
            text: isStale
              ? `HARD REJECT (simulation): Decision ${args.decision_id} is stale/superseded.`
              : `GATE APPROVED (simulation): Decision ${args.decision_id} verified. Verdict: ${verdict}`
          }]
        }
      };
    }

    throw new Error(`Tool not found in simulation mode: ${name}`);
  }

  throw new Error(`Method not supported: ${method}`);
}

/**
 * 10. MCP SSE Discovery & Stream Initiator
 * GET /api/mcp/sse
 *
 * Client connects here first. Server responds with an 'endpoint' event
 * containing the sessionId-scoped URL for subsequent JSON-RPC messages.
 */

// GET /api/mcp/locks — Returns active multi-agent decision leases
app.get('/api/mcp/locks', (req, res) => {
  cleanExpiredDecisionLocks();
  res.json({
    active_locks: Array.from(activeDecisionLocks.values())
  });
});
app.get('/api/mcp/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering

  const sessionId = randomUUID();
  mcpSessions.set(sessionId, { id: sessionId, res, createdAt: Date.now() });

  // Mandatory MCP 'endpoint' event — tells the client where to POST messages
  res.write(`event: endpoint\ndata: /api/mcp/messages?sessionId=${sessionId}\n\n`);

  req.on('close', () => {
    mcpSessions.delete(sessionId);
  });
});

/**
 * 11. MCP JSON-RPC Message Receiver
 * POST /api/mcp/messages?sessionId=<sessionId>
 *
 * Client POSTs a JSON-RPC 2.0 request here. Server acknowledges with 202,
 * then streams the JSON-RPC response back on the established SSE connection.
 */
app.post('/api/mcp/messages', requireAuth, async (req, res) => {
  const { sessionId } = req.query;

  if (!sessionId || !mcpSessions.has(sessionId)) {
    return res.status(404).json({
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: { code: -32001, message: 'Session not found or expired' }
    });
  }

  const session = mcpSessions.get(sessionId);
  const request = req.body;

  // Acknowledge receipt immediately per MCP spec
  res.status(202).json({ success: true });

  try {
    const response = await handleMcpJsonRpc(request);
    if (response) {
      session.res.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
    }
  } catch (err) {
    session.res.write(`event: message\ndata: ${JSON.stringify({
      jsonrpc: '2.0',
      id: request?.id || null,
      error: { code: -32603, message: err.message }
    })}\n\n`);
  }
});

// ---------------------------------------------------------------------------
// GITHUB OAUTH (roadmap 5.2 — hosted cloud authentication)
// ---------------------------------------------------------------------------
// Three env vars required (only for hosted deployment — local dev skips OAuth):
//   GITHUB_CLIENT_ID      — from github.com/settings/apps or /settings/developers
//   GITHUB_CLIENT_SECRET  — same OAuth app
//   GITHUB_CALLBACK_URL   — e.g. https://cavdax.sahnirmaan.live/api/auth/github/callback
//                           or    http://localhost:3000/api/auth/github/callback  (local testing)
//
// Flow:
//   1.  GET /api/auth/github       — redirect user to GitHub authorize page
//   2.  GET /api/auth/github/callback — GitHub redirects here with ?code=
//       → exchange code for access_token
//       → fetch user profile from api.github.com/user
//       → store { githubId, login, name, avatarUrl, accessToken } in session
//       → redirect to /mcp (ConnectMcpPage) with ?connected=1
//   3.  GET /api/auth/me           — returns current session user (or 401)
//   4.  POST /api/auth/logout      — destroys session

const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID     || null;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || null;
const isProduction         = process.env.NODE_ENV === 'production';
const CLIENT_URL           = process.env.CLIENT_URL           || (isProduction ? 'https://cavdax.sahnirmaan.live' : 'http://localhost:5173');
const GITHUB_CALLBACK_URL  = process.env.GITHUB_CALLBACK_URL
  || (isProduction
      ? 'https://cavdax.sahnirmaan.live/api/auth/github/callback'
      : `http://localhost:${PORT === 3000 ? 3001 : PORT}/api/auth/github/callback`);

// In-memory CSRF state store (keyed by random state param, TTL 10 min)
const oauthStateStore = new Map(); // state → { createdAt }
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [k, v] of oauthStateStore) {
    if (v.createdAt < cutoff) oauthStateStore.delete(k);
  }
}, 60 * 1000).unref();

/**
 * GET /api/auth/github
 * Redirects the browser to GitHub's authorization page.
 * If GITHUB_CLIENT_ID is not configured, returns a clear 503 explanation.
 */
app.get('/api/auth/github', (req, res) => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      error: 'GITHUB_OAUTH_NOT_CONFIGURED',
      message: 'GitHub OAuth is not configured on this server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in your .env file.',
      docs: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app'
    });
  }

  // Generate CSRF state token and store it briefly.
  // Also persist the returnTo path so the callback can redirect back to the
  // originating page (e.g. /profile) rather than always landing on /mcp.
  const state = randomBytes(20).toString('hex');
  const VALID_RETURN_ROUTES = ['/overview', '/console', '/mcp', '/walkthrough', '/audit', '/team', '/profile', '/support', '/devteam'];
  const candidatePath = (typeof req.query.returnTo === 'string' ? req.query.returnTo.split('?')[0] : '/mcp');
  const safeReturnTo = VALID_RETURN_ROUTES.includes(candidatePath) ? req.query.returnTo : '/mcp';
  oauthStateStore.set(state, { createdAt: Date.now(), returnTo: safeReturnTo });

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: 'repo workflow read:user read:org user:email',
    state
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

/**
 * GET /api/auth/github/callback
 * GitHub redirects here after the user approves the OAuth app.
 */
app.get('/api/auth/github/callback', async (req, res) => {
  const { code, state, error: ghError } = req.query;

  // Recover the returnTo path stored at OAuth initiation (defaults to /mcp)
  const stateEntry = oauthStateStore.get(state);
  const returnTo = stateEntry?.returnTo || '/mcp';

  // User denied access or GitHub returned an error
  if (ghError) {
    const sep = returnTo.includes("?") ? "&" : "?";
    return res.redirect(`${returnTo}${sep}oauth_error=${encodeURIComponent(ghError)}`);
  }

  // CSRF state validation
  if (!state || !stateEntry) {
    return res.redirect('/mcp?oauth_error=invalid_state');
  }
  oauthStateStore.delete(state);

  if (!code) {
    const sep = returnTo.includes("?") ? "&" : "?";
    return res.redirect(`${returnTo}${sep}oauth_error=missing_code`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_CALLBACK_URL
      })
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('[CAVDAX OAuth] Token exchange failed:', tokenData);
      const frontendBase = CLIENT_URL || '';
      return res.redirect(`${frontendBase}${returnTo}?oauth_error=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`);
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch GitHub user profile & verified email
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    const userData = await userRes.json();

    let primaryEmail = userData.email || null;
    try {
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });
      if (emailsRes.ok) {
        const emailsData = await emailsRes.json();
        if (Array.isArray(emailsData)) {
          const primaryObj = emailsData.find(e => e.primary && e.verified) || emailsData.find(e => e.primary) || emailsData[0];
          if (primaryObj && primaryObj.email) {
            primaryEmail = primaryObj.email;
          }
        }
      }
    } catch (emailErr) {
      console.warn('[CAVDAX OAuth] Note fetching user emails:', emailErr.message);
    }

    const frontendBase = CLIENT_URL || '';

    if (!userData.id) {
      const sep = returnTo.includes("?") ? "&" : "?";
      return res.redirect(`${frontendBase}${returnTo}${sep}oauth_error=user_fetch_failed`);
    }

    // 3. Persist user in session & sign persistent auth cookie
    req.session.user = {
      githubId:   userData.id,
      login:      userData.login,
      name:       userData.name || userData.login,
      avatarUrl:  userData.avatar_url,
      email:      primaryEmail,
      accessToken,
      tier:       req.session?.tier || 'free'
    };

    // Set signed persistent cookie for instant re-hydration across server restarts
    // Strip sensitive OAuth access token from client cookie payload (OWASP A01/A02 Defense-in-depth)
    const cookieUser = {
      githubId:  userData.id,
      login:     userData.login,
      name:      userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      email:     primaryEmail,
      tier:      req.session?.tier || 'free'
    };
    const signedAuth = signAuthToken(cookieUser);
    if (signedAuth) {
      res.cookie('cavdax_auth', signedAuth, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    console.log(`[CAVDAX OAuth] User authenticated: ${userData.login} (id: ${userData.id})`);

    // 4. Prevent Session Fixation (OWASP A07): Regenerate session upon authentication
    const redirectUrl = `${frontendBase}${returnTo}${returnTo.includes("?") ? "&" : "?"}connected=1&login=${encodeURIComponent(userData.login)}&name=${encodeURIComponent(userData.name || userData.login)}&avatar=${encodeURIComponent(userData.avatar_url || '')}&githubId=${userData.id}`;
    const saveAndRedirect = () => {
      req.session.user = {
        githubId:  userData.id,
        login:     userData.login,
        name:      userData.name || userData.login,
        avatarUrl: userData.avatar_url,
        email:     primaryEmail,
        tier:      'free',
        accessToken: access_token
      };
      req.session.save((err) => {
        if (err) console.error('[CAVDAX OAuth] Session save error:', err);
        res.redirect(redirectUrl);
      });
    };

    if (typeof req.session.regenerate === 'function') {
      req.session.regenerate((regenErr) => {
        if (regenErr) console.warn('[CAVDAX OAuth] Session regeneration warning:', regenErr.message);
        saveAndRedirect();
      });
    } else {
      saveAndRedirect();
    }

  } catch (err) {
    const frontendBase = CLIENT_URL || '';
    console.error('[CAVDAX OAuth] Callback error:', err.message);
    const sep = returnTo.includes("?") ? "&" : "?";
    res.redirect(`${frontendBase}${returnTo}${sep}oauth_error=${encodeURIComponent('server_error')}`);
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated GitHub user from the session.
 * Used by ConnectMcpPage to show the connected user badge.
 */
app.get('/api/auth/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(200).json({ authenticated: false });
  }
  const { githubId, login, name, avatarUrl } = req.session.user;
  res.json({ authenticated: true, user: { githubId, login, name, avatarUrl } });
});

// Test-only session bootstrap (Strictly disabled in production)
if (process.env.NODE_ENV === 'test') {
  app.post('/api/auth/test-session', (req, res) => {
    req.session.user = {
      githubId: req.body?.githubId || 12345,
      login: req.body?.login || 'test-dev',
      name: 'Test Dev',
      avatarUrl: ''
    };
    res.json({ success: true, user: req.session.user });
  });
}

const devAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => {
    const clientIp = extractClientIp(req).toLowerCase();
    if (globalWhitelistedIps.includes(clientIp)) return true;
    return false;
  },
  message: { success: false, code: 'AUTH_RATE_LIMIT_EXCEEDED', error: 'Too many authentication attempts. Please wait 15 minutes.' }
});

/**
 * POST /api/auth/dev-login
 * Developer Personal Access Token (PAT) authentication for local/offline environments.
 * Strictly forbidden in production environments (OWASP A01 Access Control).
 */
app.post('/api/auth/dev-login', devAuthLimiter, async (req, res) => {
  const socketIp = (req.socket?.remoteAddress || '').replace(/^.*:/, '').toLowerCase();
  const isDirectLoopback = socketIp === '127.0.0.1' || socketIp === '1' || socketIp === 'localhost' || socketIp === '::1';

  if (isProduction) {
    return res.status(403).json({
      success: false,
      error: 'DEV_AUTH_DISABLED_IN_PRODUCTION',
      message: 'Dev PAT authentication is strictly disabled in production environments.'
    });
  }

  // In non-production, restrict to loopback unless ALLOW_DEV_LOGIN=true
  if (process.env.NODE_ENV !== 'test' && process.env.ALLOW_DEV_LOGIN !== 'true' && !isDirectLoopback && req.socket?.remoteAddress) {
    return res.status(403).json({
      success: false,
      error: 'DEV_AUTH_LOOPBACK_REQUIRED',
      message: 'Dev PAT authentication is restricted to loopback unless ALLOW_DEV_LOGIN=true.'
    });
  }

  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'TOKEN_REQUIRED',
      message: 'GitHub Personal Access Token is required.'
    });
  }

  const trimmedToken = token.trim();
  // Strict format validation: GitHub tokens are alphanumeric + underscores only.
  // Blocks CRLF injection into outgoing HTTP headers and prevents malicious payloads.
  if (!/^[a-zA-Z0-9_]{10,255}$/.test(trimmedToken)) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_TOKEN_FORMAT',
      message: 'GitHub Personal Access Token format is invalid. Must be 10-255 alphanumeric characters.'
    });
  }

  try {
    const ghRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${trimmedToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'CAVDAX-Dev-Gateway'
      }
    });

    if (!ghRes.ok) {
      const status = ghRes.status;
      return res.status(status === 401 ? 401 : 400).json({
        success: false,
        error: 'INVALID_GITHUB_TOKEN',
        message: status === 401
          ? 'GitHub rejected this token: Bad credentials.'
          : 'GitHub API verification failed for this token.'
      });
    }

    const userData = await ghRes.json();
    if (!userData || !userData.id) {
      return res.status(400).json({
        success: false,
        error: 'USER_FETCH_FAILED',
        message: 'Unable to retrieve GitHub profile using provided token.'
      });
    }

    const executeSave = () => {
      req.session.user = {
        githubId: userData.id,
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url || '',
        email: userData.email || '',
        accessToken: trimmedToken,
        tier: 'free'
      };

      const cookieUser = {
        githubId: userData.id,
        login: userData.login,
        name: userData.name || userData.login,
        avatarUrl: userData.avatar_url || '',
        email: userData.email || '',
        tier: 'free'
      };

      const signedAuth = signAuthToken(cookieUser);
      if (signedAuth) {
        const isSecureReq = isProduction || req.secure || req.headers?.['x-forwarded-proto'] === 'https';
        res.cookie('cavdax_auth', signedAuth, {
          httpOnly: true,
          secure: Boolean(isSecureReq),
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      }

      console.log(`[CAVDAX DevAuth] Local user authenticated via PAT: ${userData.login} (id: ${userData.id})`);

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('[CAVDAX DevAuth] Session save error:', saveErr.message);
          return res.status(500).json({ success: false, error: 'SESSION_SAVE_FAILED' });
        }
        return res.json({
          success: true,
          user: {
            githubId: userData.id,
            login: userData.login,
            name: userData.name || userData.login,
            avatarUrl: userData.avatar_url || '',
            tier: 'free'
          }
        });
      });
    };

    // Prevent Session Fixation (OWASP A07)
    if (typeof req.session.regenerate === 'function') {
      req.session.regenerate((err) => {
        if (err) console.warn('[CAVDAX DevAuth] Session regeneration warning:', err.message);
        executeSave();
      });
    } else {
      executeSave();
    }
  } catch (err) {
    console.error('[CAVDAX DevAuth] Network error validating token:', err.message);
    return res.status(500).json({
      success: false,
      error: 'GITHUB_API_UNREACHABLE',
      message: 'Failed to connect to GitHub API.'
    });
  }
});

/**
 * GET /api/user/api-key
 * Returns the active cryptographic API key for the authenticated user or session.
 */
app.get('/api/user/api-key', (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication required: Sign in with GitHub to generate and manage API keys'
    });
  }
  const login = sessionUser.login;
  const userId = sessionUser.githubId;
  const tier = sessionUser.tier || req.session?.tier || 'free';

  // If user already has an active key in session
  if (req.session?.apiKey && req.session?.keyHash) {
    const sessionKeyCreatedAt = req.session.keyCreatedAt || 0;
    if (sessionKeyCreatedAt < globalKeyRevocationEpoch) {
      console.log(`[CAVDAX Auth] Purging revoked session key for ${login} (issued before revocation epoch)`);
      req.session.apiKey = null;
      req.session.keyHash = null;
      req.session.keyCreatedAt = null;
      return res.status(401).json({
        success: false,
        authenticated: true,
        revoked: true,
        error: 'Security Notice: Your previous API key was invalidated during an emergency credential revocation. Please rotate your key to issue a fresh credential.'
      });
    }
    // SEC-KEY-03: Re-hydrate in-memory registry if server restarted or worker scaled
    if (!userApiKeyRegistry.has(req.session.keyHash)) {
      userApiKeyRegistry.set(req.session.keyHash, {
        userId,
        login,
        tier,
        createdAt: Date.now(),
        lastUsedAt: null
      });
      console.log(`[CAVDAX Auth] Re-registered active session key in registry for: ${login}`);
    } else {
      // Sync user profile if user authenticated with GitHub after key was initially issued
      const existingRecord = userApiKeyRegistry.get(req.session.keyHash);
      if (sessionUser && existingRecord && existingRecord.userId !== sessionUser.githubId) {
        existingRecord.userId = sessionUser.githubId;
        existingRecord.login = sessionUser.login;
        existingRecord.tier = sessionUser.tier || tier;
      }
    }

    return res.json({
      success: true,
      authenticated: Boolean(sessionUser),
      apiKey: req.session.apiKey,
      masked: `${req.session.apiKey.slice(0, 16)}...${req.session.apiKey.slice(-4)}`
    });
  }

  // Generate initial cryptographic key with 192-bit CSPRNG entropy
  const now = Date.now();
  const newKey = generateSecureApiKey(login);
  const keyHash = hashApiKey(newKey);

  userApiKeyRegistry.set(keyHash, {
    userId,
    login,
    tier,
    createdAt: now,
    lastUsedAt: null
  });

  if (req.session) {
    req.session.apiKey = newKey;
    req.session.keyHash = keyHash;
    req.session.keyCreatedAt = now;
  }
  syncSystemStateToDisk();

  res.json({
    success: true,
    authenticated: Boolean(sessionUser),
    apiKey: newKey,
    masked: `${newKey.slice(0, 16)}...${newKey.slice(-4)}`
  });
});

/**
 * POST /api/user/rotate-api-key
 * Cryptographically rotates the user's API key, invalidating the previous hash.
 */

// Strict limiter — Cryptographic API Key Rotation (OWASP API4 Resource Exhaustion Defense)
const keyRotateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,                  // max 5 key rotations per 5 minutes per IP/session
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: 'Too many key rotation requests. Limit is 5 rotations per 5 minutes.' }
});

app.post('/api/user/rotate-api-key', keyRotateLimiter, (req, res) => {
  const sessionUser = req.session?.user;
  if (!sessionUser) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Authentication required: Sign in with GitHub to rotate API keys'
    });
  }
  const login = sessionUser.login;
  const userId = sessionUser.githubId;
  const tier = sessionUser.tier || req.session?.tier || 'free';

  // Invalidate old key hash if present
  if (req.session?.keyHash) {
    userApiKeyRegistry.delete(req.session.keyHash);
  }

  // Generate new cryptographic key with 192 bits of entropy
  const now = Date.now();
  const newKey = generateSecureApiKey(login);
  const newHash = hashApiKey(newKey);

  userApiKeyRegistry.set(newHash, {
    userId,
    login,
    tier,
    createdAt: now,
    lastUsedAt: null
  });

  if (req.session) {
    req.session.apiKey = newKey;
    req.session.keyHash = newHash;
    req.session.keyCreatedAt = now;
  }
  syncSystemStateToDisk();

  console.log(`[CAVDAX Auth] Cryptographic API key rotated for: ${login}`);

  res.json({
    success: true,
    apiKey: newKey,
    masked: `${newKey.slice(0, 16)}...${newKey.slice(-4)}`
  });
});

/**
 * POST /api/auth/logout
 * Destroys the session and redirects to /mcp.
 */
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('cavdax_auth', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.clearCookie('connect.sid', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  req.session.destroy(err => {
    if (err) console.error('[CAVDAX OAuth] Session destroy error:', err.message);
    res.json({ success: true });
  });
});

/**
 * GET /api/github/repos
 * Returns repositories accessible to the authenticated GitHub session.
 */
app.get('/api/github/repos', async (req, res) => {
  if (!req.session?.user?.accessToken) {
    return res.status(401).json({
      authenticated: false,
      repos: [],
      message: 'GitHub authentication required to list repositories.'
    });
  }

  try {
    const ghRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member', {
      headers: {
        Authorization: `Bearer ${req.session.user.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.warn('[CAVDAX Repos] GitHub API error:', ghRes.status, errText);
      return res.status(ghRes.status).json({
        authenticated: true,
        repos: [],
        error: 'Failed to fetch repositories from GitHub.'
      });
    }

    const repos = await ghRes.json();
    const cleanRepos = (Array.isArray(repos) ? repos : []).map(r => ({
      id: String(r.id),
      name: r.name,
      full_name: r.full_name,
      owner: r.owner?.login,
      private: Boolean(r.private),
      default_branch: r.default_branch || 'main',
      html_url: r.html_url,
      description: r.description,
      updated_at: r.updated_at
    }));

    res.json({ authenticated: true, repos: cleanRepos });
  } catch (err) {
    console.error('[CAVDAX Repos] Fetch error:', err.message);
    res.status(500).json({ authenticated: true, repos: [], error: err.message });
  }
});

/**
 * GET /api/github/repos/:owner/:repo/adrs
 * Scans the default branch of a GitHub repository for ADRs and returns them with a causal graph.
 */
/**
 * GET /api/github/repos/:owner/:repo/branches
 * Returns all branches for the repository so users can switch branches in the Knowledge Graph.
 */
app.get('/api/github/repos/:owner/:repo/branches', async (req, res) => {
  const token = req.session?.user?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'GitHub authentication required.' });
  }
  const { owner, repo } = req.params;
  try {
    const branches = await listRepoBranches({ token, owner, repo });
    res.json({ success: true, branches });
  } catch (err) {
    if (err instanceof GithubAdrError) {
      res.status(err.status).json({ success: false, code: err.code, error: err.message });
    } else {
      console.error('[CAVDAX listRepoBranches]', err);
      res.status(500).json({ success: false, code: 'GITHUB_ERROR', error: 'Could not fetch branches from GitHub.' });
    }
  }
});

// Shared branch name sanitizer enforcing length, format, and control-character safety
export function sanitizeBranchName(branch, fallback = 'main') {
  if (typeof branch !== 'string') return fallback;
  const trimmed = branch.trim();
  if (trimmed.length > 0 && trimmed.length <= 255 && !/[\x00-\x1f\x7f]/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

app.get('/api/github/repos/:owner/:repo/adrs', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const apiKey = bearerToken || req.headers['x-cavdax-api-key'] || null;

  let isApiKeyAuth = false;
  let authUser = null;

  if (API_TOKEN && apiKey && timingSafeStringEqual(apiKey, API_TOKEN)) {
    isApiKeyAuth = true;
    authUser = { login: 'system', tier: 'enterprise', role: 'admin' };
  } else if (apiKey && apiKey.startsWith('cvdx_live_')) {
    const keyHash = hashApiKey(apiKey);
    const keyRecord = userApiKeyRegistry.get(keyHash);
    if (keyRecord && (keyRecord.createdAt || 0) >= globalKeyRevocationEpoch) {
      isApiKeyAuth = true;
      authUser = {
        userId: keyRecord.userId,
        login: keyRecord.login,
        tier: keyRecord.tier || 'free',
        role: 'user'
      };
    }
  }

  // Must have either GitHub OAuth session or a valid CAVDAX API key (or local dev mode)
  if (!req.session?.user && !isApiKeyAuth) {
    if (process.env.NODE_ENV !== 'production' && !API_TOKEN && userApiKeyRegistry.size === 0) {
      // Local development without keys configured
    } else {
      return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'Authentication required. Provide a valid session cookie or CAVDAX Bearer API key.' });
    }
  }

  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`.toLowerCase();

  if (isApiKeyAuth) req.authUser = authUser;
  const hasAccess = (req.session?.user || isApiKeyAuth) ? await verifyUserRepoAccess(req, repoFullName) : false;

  // API-key callers may only read repos they are entitled to; they must never reach the server token otherwise.
  if (isApiKeyAuth && !hasAccess) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'This API key does not have access to this repository.' });
  }

  // Session users scan with their own OAuth token (GitHub enforces their access).
  // The server GITHUB_TOKEN is only used for API-key callers that passed the access check above.
  const token = req.session?.user?.accessToken || (isApiKeyAuth ? process.env.GITHUB_TOKEN : null) || null;
  if (!token) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'GitHub authentication required.' });
  }

  const sessionTier = req.session?.tier || req.session?.user?.tier || authUser?.tier;
  const effectiveTier = globalHackathonMode ? 'enterprise' : (sessionTier || CAVDAX_TIER || 'free').toLowerCase();
  const repoLimit = effectiveTier === 'free' ? 1 : (effectiveTier === 'pro' ? 10 : -1);

  const requestedBranch = sanitizeBranchName(req.query.branch, null);
  try {
    const result = await scanRepoAdrs({ token: token || undefined, owner, repo, branch: requestedBranch || undefined });

    // ONLY after a successful scan AND verified write access, track connected repo with limit enforcement.
    // Read-only visibility must never grant tenant access (connectedRepos feeds verifyUserRepoAccess).
    if (req.session?.user && hasAccess) {
      if (!Array.isArray(req.session.connectedRepos)) {
        req.session.connectedRepos = [];
      }
      if (!req.session.connectedRepos.includes(repoFullName)) {
        if (repoLimit !== -1 && req.session.connectedRepos.length >= repoLimit) {
          return res.status(403).json({
            success: false,
            code: 'TIER_REPO_LIMIT_EXCEEDED',
            error: `Plan limit reached: ${effectiveTier === 'free' ? 'Community' : 'Pro'} tier allows up to ${repoLimit} connected repository. Upgrade to Pro Autonomous or Enterprise to connect additional repositories.`
          });
        }
        req.session.connectedRepos.push(repoFullName);
      }
    }
    const targetBranch = sanitizeBranchName(requestedBranch || 'main');
    // Scope persisted actions to BOTH repository and active branch to prevent cross-branch leakage
    const persistedRepoActions = (!hasAccess ? [] : (savedSystemState.auditEntries || [])).filter(e => {
      const matchRepo = e.repo?.toLowerCase() === repoFullName.toLowerCase();
      const matchBranch = sanitizeBranchName(e.branch || 'main') === targetBranch;
      return matchRepo && matchBranch;
    });
    if (result?.graph && Array.isArray(result.graph.nodes) && Array.isArray(result.graph.edges)) {
      // Deduplicate actions by decision_id: display at most 1 active/latest action node per decision on the canvas
      const latestActionByDecision = new Map();
      for (const a of persistedRepoActions) {
        if (a.decision_id && !latestActionByDecision.has(a.decision_id)) {
          latestActionByDecision.set(a.decision_id, a);
        }
      }
      for (const a of latestActionByDecision.values()) {
        result.graph.nodes.push({
          id: a.action_id,
          label: 'AgentAction',
          title: `ACT: ${a.status === 'APPROVED' ? 'Verified Write' : 'Blocked Write'} (${a.decision_id})`,
          status: a.status,
          target_file: a.target_file,
          decision_id: a.decision_id,
          timestamp: a.executed_at,
          latency_ms: a.latency_ms,
          repo: a.repo,
          branch: a.branch || targetBranch
        });
        result.graph.edges.push({
          source: a.action_id,
          target: a.decision_id,
          type: 'GROUNDED_IN'
        });
      }
    }
    res.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof GithubAdrError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[CAVDAX /adrs error]:', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error: 'Failed to scan repository ADRs.' });
  }
});

/**
 * POST /api/github/repos/:owner/:repo/init-adr
 * Opens a starter ADR pull request on branch cavdax/init-adr based on detected stack.
 */
/**
 * POST /api/github/repos/:owner/:repo/propose-adr
 * Opens a pull request proposing a new Architecture Decision Record on GitHub.
 */
app.post('/api/github/repos/:owner/:repo/propose-adr', githubActionLimiter, async (req, res) => {
  const token = req.session?.user?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'GitHub authentication required.' });
  }
  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`;
  const hasAccess = await verifyUserRepoAccess(req, repoFullName);
  if (!hasAccess) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have access to propose ADRs for this repository.' });
  }
  const { title, context, decision, consequences, supersedes } = req.body || {};
  try {
    const pr = await proposeAdrPullRequest({
      token,
      owner,
      repo,
      title,
      context,
      decision,
      consequences,
      supersedes
    });
    return res.json({ success: true, pr });
  } catch (err) {
    if (err instanceof GithubAdrError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[CAVDAX proposeAdrPullRequest]', err);
    return res.status(500).json({ success: false, code: 'GITHUB_ERROR', error: 'Failed to propose ADR pull request on GitHub.' });
  }
});

/**
 * POST /api/github/repos/:owner/:repo/ci-gate-pr
 * Opens a pull request that adds .github/workflows/cavdax-gate.yml.
 */
app.post('/api/github/repos/:owner/:repo/ci-gate-pr', githubActionLimiter, async (req, res) => {
  const token = req.session?.user?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'GitHub authentication required.' });
  }
  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`;
  const hasAccess = await verifyUserRepoAccess(req, repoFullName);
  if (!hasAccess) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have access to install CI workflows on this repository.' });
  }
  try {
    const pr = await createCiGatePullRequest({ token, owner, repo });
    return res.json({ success: true, pr });
  } catch (err) {
    if (err instanceof GithubAdrError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[CAVDAX createCiGatePullRequest]', err);
    return res.status(500).json({ success: false, code: 'GITHUB_ERROR', error: 'Failed to create CI gate pull request on GitHub.' });
  }
});

app.post('/api/github/repos/:owner/:repo/init-adr', githubActionLimiter, async (req, res) => {
  const token = req.session?.user?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'GitHub authentication required.' });
  }
  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`;
  const hasAccess = await verifyUserRepoAccess(req, repoFullName);
  if (!hasAccess) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have access to initialize ADRs on this repository.' });
  }
  try {
    const pullRequest = await createAdrPullRequest({ token, owner, repo });
    res.json({ success: true, pullRequest });
  } catch (err) {
    if (err instanceof GithubAdrError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[CAVDAX /init-adr error]:', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error: 'Failed to create starter ADR pull request.' });
  }
});

/**
 * POST /api/github/repos/:owner/:repo/sync-adr-status
 * Opens a pull request on branch cavdax/sync-<adr>-status updating a superseded ADR's markdown status.
 */
/**
 * POST /api/github/repos/:owner/:repo/verify-action
 * Executes authentic temporal causal gate verification against repository ADRs with sub-millisecond precision.
 * Records the resulting AgentAction in the persistent audit trail with real measured latency.
 */
app.post('/api/github/repos/:owner/:repo/verify-action', requireAuth, async (req, res) => {
  const token = req.session?.user?.accessToken || process.env.GITHUB_TOKEN || null;
  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`;
  const hasAccess = await verifyUserRepoAccess(req, repoFullName);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      error: 'You do not have permission to verify actions against this repository.'
    });
  }
  const { decisionId, targetFile, branch } = req.body || {};
  const actionBranch = sanitizeBranchName(branch, 'main');

  try {
    let currentGraph = null;
    if (token) {
      try {
        const scanResult = await scanRepoAdrs({ token, owner, repo, branch });
        currentGraph = scanResult?.graph;
      } catch (scanErr) {
        console.warn(`[CAVDAX verify-action] Live scan notice:`, scanErr.message);
      }
    }

    const nodes = currentGraph?.nodes || [];
    const decisions = nodes.filter(n => n.label === 'Decision');
    if (decisions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No Architecture Decisions found in repository ${owner}/${repo}. Please ingest or initialize ADRs first.`
      });
    }

    let decisionNode = null;
    if (decisionId) {
      decisionNode = nodes.find(n => n.id === decisionId);
      if (!decisionNode) {
        return res.status(404).json({
          success: false,
          error: `Architecture Decision '${decisionId}' not found in repository ${owner}/${repo} graph.`
        });
      }
    } else {
      decisionNode = decisions[0];
    }

    // Pure causal gate check execution time (measured with process.hrtime.bigint)
    const gateStart = process.hrtime.bigint();
    const isApproved = decisionNode.status === 'VALID';
    const verdict = isApproved ? 'APPROVED' : 'BLOCKED_SUPERSEDED_SOURCE';
    const gateElapsedNs = process.hrtime.bigint() - gateStart;
    let latencyMs = Math.max(0.01, parseFloat((Number(gateElapsedNs) / 1_000_000).toFixed(3)));

    const actionId = `act-${Date.now().toString(36)}`;
    const now = Date.now();
    const resolvedTarget = targetFile || (decisionNode.file ? decisionNode.file : 'src/index.js');
    const repoFullName = `${owner}/${repo}`;

    if (isFalkorConnected && graph) {
      try {
        const falkorGateStart = process.hrtime.bigint();
        // Remove previous test probe actions grounded in this decision scoped strictly to this branch
        await graph.query(`
          MATCH (prevAction:AgentAction {repo: $repo, branch: $branch})-[:GROUNDED_IN]->(d:Decision {id: $decisionId})
          DETACH DELETE prevAction
        `, { params: { repo: repoFullName, branch: actionBranch, decisionId: decisionNode.id } }).catch(() => {});

        await graph.query(`
          MERGE (d:Decision {id: $decisionId})
          ON CREATE SET d.title = $decisionTitle, d.status = $decisionStatus, d.repo = $repo
          CREATE (a:AgentAction {
            id: $actionId,
            target_file: $targetFile,
            status: $status,
            repo: $repo,
            branch: $branch,
            timestamp: $now
          })
          CREATE (a)-[:GROUNDED_IN]->(d)
        `, {
          params: {
            decisionId: decisionNode.id,
            decisionTitle: decisionNode.title || decisionNode.id,
            decisionStatus: decisionNode.status,
            actionId,
            targetFile: resolvedTarget,
            status: verdict,
            repo: repoFullName,
            branch: actionBranch,
            now
          }
        });

        const falkorGateElapsedNs = process.hrtime.bigint() - falkorGateStart;
        latencyMs = Math.max(0.05, parseFloat((Number(falkorGateElapsedNs) / 1_000_000).toFixed(2)));
      } catch (falkorErr) {
        console.warn('[CAVDAX verify-action] FalkorDB record notice:', falkorErr.message);
      }
    }

    const actionRecord = {
      action_id: actionId,
      target_file: resolvedTarget,
      status: verdict,
      repo: repoFullName,
      branch: actionBranch,
      decision_id: decisionNode.id,
      decision_status: decisionNode.status,
      decision_title: decisionNode.title || decisionNode.id,
      executed_at: now,
      latency_ms: latencyMs
    };

    if (!Array.isArray(savedSystemState.auditEntries)) {
      savedSystemState.auditEntries = [];
    }
    savedSystemState.auditEntries.unshift(actionRecord);
    syncSystemStateToDisk();

    broadcastEvent('AGENT_ACTION_LOGGED', actionRecord, { repo: repoFullName });
    broadcastEvent('MCP_TOOL_INTERCEPTED', {
      toolName: 'apply_code_change',
      decisionId: decisionNode.id,
      targetFile: resolvedTarget,
      verdict: isApproved ? 'APPROVED' : 'BLOCKED',
      latencyMs,
      repo: repoFullName,
      timestamp: now
    }, { repo: repoFullName });

    return res.json({
      success: true,
      action: {
        id: actionId,
        label: 'AgentAction',
        title: `ACT: ${isApproved ? 'Verified Write' : 'Blocked Write'} (${decisionNode.id})`,
        status: verdict,
        target_file: resolvedTarget,
        decision_id: decisionNode.id,
        timestamp: now,
        latency_ms: latencyMs,
        repo: repoFullName,
        branch: actionBranch
      },
      edge: {
        source: actionId,
        target: decisionNode.id,
        type: 'GROUNDED_IN'
      },
      verdict,
      is_approved: isApproved,
      latency_ms: latencyMs,
      target_file: resolvedTarget,
      decision: decisionNode
    });
  } catch (err) {
    console.error('[CAVDAX verify-action error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/github/repos/:owner/:repo/sync-adr-status', githubActionLimiter, async (req, res) => {
  const token = req.session?.user?.accessToken;
  if (!token) {
    return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', error: 'GitHub authentication required.' });
  }
  const { owner, repo } = req.params;
  const repoFullName = `${owner}/${repo}`;
  const hasAccess = await verifyUserRepoAccess(req, repoFullName);
  if (!hasAccess) {
    return res.status(403).json({ success: false, code: 'FORBIDDEN', error: 'You do not have access to synchronize ADR status on this repository.' });
  }
  const { targetId, supersedingId } = req.body || {};
  try {
    const pullRequest = await syncSupersededAdrPullRequest({ token, owner, repo, targetId, supersedingId });
    res.json({ success: true, pullRequest });
  } catch (err) {
    if (err instanceof GithubAdrError) {
      return res.status(err.status).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[CAVDAX /sync-adr-status error]:', err);
    res.status(500).json({ success: false, code: 'INTERNAL_ERROR', error: 'Failed to create sync ADR pull request.' });
  }
});

// ---------------------------------------------------------------------------
// RAZORPAY PAYMENT GATEWAY
// ---------------------------------------------------------------------------
// Three endpoints power the sponsor page and (future) Pro subscription flow:
//
//   POST /api/billing/create-order    — create a Razorpay order, return order_id
//   POST /api/billing/verify-payment  — HMAC-SHA256 signature verification
//   POST /api/billing/webhook         — Razorpay webhook (async payment events)
//
// Credentials are read from environment variables only — never hardcoded.
// KEY_SECRET never leaves the server.
//
// Razorpay amounts are in the smallest currency unit (paise for INR).
// ₹1 = 100 paise. Minimum order: 100 paise (₹1).

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || null;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || null;

// Lazily initialise the Razorpay SDK only when credentials are present.
// If env vars are missing the endpoints return a clear 503 (not a crash).
let razorpayClient = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpayClient = new Razorpay({
    key_id:     RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log('[CAVDAX Razorpay] Payment gateway initialised.');
} else {
  console.warn('[CAVDAX Razorpay] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set — billing endpoints disabled.');
}

/**
 * POST /api/billing/create-order
 * Creates a Razorpay order and returns the order_id to the frontend.
 *
 * Body: { amount_paise: number, receipt?: string }
 *   amount_paise — integer, minimum 100 (₹1)
 *   receipt      — optional idempotency label (defaults to a UUID)
 *
 * Returns: { order_id, amount, currency, receipt }
 */
// Canonical server-side tier pricing table (paise: ₹1 = 100 paise)
const CANONICAL_TIER_PRICES_PAISE = Object.freeze({
  pro: 33900,         // ₹339 / mo ($4/mo)
  enterprise: 990000  // ₹9,900 / mo ($120/mo)
});

// In-memory order tracking to prevent tier tampering (OWASP A04 Hardening)
const pendingBillingOrders = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [orderId, data] of pendingBillingOrders) {
    if (now - data.createdAt > 2 * 60 * 60 * 1000) {
      pendingBillingOrders.delete(orderId);
    }
  }
}, 15 * 60 * 1000).unref();

app.get('/api/billing/config', (req, res) => {
  res.json({
    configured: Boolean(razorpayClient),
    key_id: RAZORPAY_KEY_ID || null
  });
});

app.post('/api/billing/create-order', async (req, res) => {
  if (!razorpayClient) {
    return res.status(503).json({
      success: false,
      error: { code: 'RAZORPAY_NOT_CONFIGURED', message: 'Payment gateway is not configured on this server.' }
    });
  }

  const { amount_paise, receipt, tier } = req.body || {};
  const requestedTier = (tier || '').toLowerCase().trim();

  let amount = parseInt(amount_paise, 10);
  let assignedTier = 'free';

  // Server-side pricing enforcement: clients cannot submit arbitrary low amounts for paid tiers
  if (requestedTier === 'pro') {
    amount = CANONICAL_TIER_PRICES_PAISE.pro;
    assignedTier = 'pro';
  } else if (requestedTier === 'enterprise') {
    amount = CANONICAL_TIER_PRICES_PAISE.enterprise;
    assignedTier = 'enterprise';
  } else {
    // Supporter / donation tier — must be integer >= 100 (₹1 minimum)
    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'amount_paise must be an integer >= 100 (₹1 minimum).' }
      });
    }
    assignedTier = 'supporter';
  }

  try {
    const order = await razorpayClient.orders.create({
      amount,
      currency: 'INR',
      receipt:  receipt || `cavdax_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      payment_capture: 1  // auto-capture
    });

    pendingBillingOrders.set(order.id, {
      amount,
      tier: (assignedTier === 'supporter' ? 'free' : assignedTier),
      isSupporter: (assignedTier === 'supporter'),
      user: req.session?.user ? { ...req.session.user } : null,
      createdAt: Date.now()
    });

    console.log(`[CAVDAX Razorpay] Order created: ${order.id} | ₹${(amount / 100).toFixed(2)} [Tier: ${assignedTier}]`);

    res.json({
      success: true,
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      receipt:  order.receipt,
      key_id:   RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('[CAVDAX Razorpay] create-order error:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'ORDER_CREATION_FAILED', message: err.message }
    });
  }
});

/**
 * POST /api/billing/verify-payment
 * Verifies the Razorpay payment signature after the frontend checkout completes.
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * Returns { success: true } only if signatures match.
 * Returns 400 if signature is missing or invalid — NEVER mark as paid in this case.
 */
app.post('/api/billing/verify-payment', (req, res) => {
  if (!razorpayClient) {
    return res.status(503).json({
      success: false,
      error: { code: 'RAZORPAY_NOT_CONFIGURED', message: 'Payment gateway is not configured on this server.' }
    });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier } = req.body;

  // Guard: all three fields are required
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.' }
    });
  }

  // HMAC-SHA256 verification (Razorpay standard)
  const payload  = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex');

  if (!timingSafeStringEqual(expected, razorpay_signature)) {
    console.warn(`[CAVDAX Razorpay] Signature mismatch for order ${razorpay_order_id}`);
    return res.status(400).json({
      success: false,
      error: { code: 'SIGNATURE_MISMATCH', message: 'Payment signature verification failed. Do not grant access.' }
    });
  }

  console.log(`[CAVDAX Razorpay] Payment verified: ${razorpay_payment_id} for order ${razorpay_order_id}`);

  // Signature is valid — payment is genuine.
  // Secure Tier Assignment: use server-recorded order tier; if expired/purged, default to 'pro' and never trust client input
  const recordedOrder = pendingBillingOrders.get(razorpay_order_id);
  const authorizedTier = recordedOrder?.tier || 'pro';
  const isSupporter = Boolean(recordedOrder?.isSupporter);
  const orderAmount = recordedOrder?.amount || 16900;
  if (recordedOrder) {
    pendingBillingOrders.delete(razorpay_order_id);
  }

  // Derive sponsor tier details if supporter payment
  let sponsorTierId = 1;
  let sponsorTierLabel = 'Cookie Backer';
  if (orderAmount >= 84900) {
    sponsorTierId = 3;
    sponsorTierLabel = 'Core Supporter';
  } else if (orderAmount >= 33900) {
    sponsorTierId = 2;
    sponsorTierLabel = '2 Cups Sponsor';
  }

  const currentUser = req.session?.user || recordedOrder?.user || {};
  let backerRecord = null;

  if (isSupporter) {
    const rawLogin = currentUser.login;
    const sanitizedHandle = (typeof rawLogin === 'string' && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(rawLogin.trim()))
      ? rawLogin.trim()
      : null;
    const sanitizedName = typeof currentUser.name === 'string' && currentUser.name.trim().length > 0
      ? currentUser.name.trim().slice(0, 60)
      : (sanitizedHandle || 'Community Backer');
    let sanitizedAvatar = null;
    if (typeof currentUser.avatar_url === 'string') {
      const cleanUrl = currentUser.avatar_url.trim();
      if (cleanUrl.startsWith('https://avatars.githubusercontent.com/') || cleanUrl.startsWith('https://images.unsplash.com/')) {
        sanitizedAvatar = cleanUrl;
      }
    }

    backerRecord = {
      id: razorpay_payment_id,
      order_id: razorpay_order_id,
      tier_id: sponsorTierId,
      tier_label: sponsorTierLabel,
      amount_paise: orderAmount,
      currency: 'INR',
      github_handle: sanitizedHandle,
      name: sanitizedName,
      avatar_url: sanitizedAvatar,
      created_at: new Date().toISOString(),
      highlighted: (sponsorTierId === 3),
      is_seed: false
    };

    if (!Array.isArray(savedSystemState.sponsors)) {
      savedSystemState.sponsors = [];
    }
    // Avoid duplicates, prepend to top of wall
    savedSystemState.sponsors = savedSystemState.sponsors.filter(s => s.id !== razorpay_payment_id);
    savedSystemState.sponsors.unshift(backerRecord);
    syncSystemStateToDisk();
    broadcastEvent('SPONSOR_REGISTERED', backerRecord);
    console.log(`[CAVDAX Sponsors] Backer registered: ${backerRecord.name} (${backerRecord.tier_label})`);
  }

  if (req.session) {
    if (!isSupporter) {
      req.session.tier = authorizedTier;
    } else {
      req.session.is_sponsor = true;
      req.session.sponsor_tier = sponsorTierLabel;
    }
    if (req.session.user) {
      if (!isSupporter) {
        req.session.user.tier = authorizedTier;
      } else {
        req.session.user.is_sponsor = true;
        req.session.user.sponsor_tier = sponsorTierLabel;
      }
      const signedAuth = signAuthToken(req.session.user);
      if (signedAuth) {
        res.cookie('cavdax_auth', signedAuth, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
      }
    }
  }

  res.json({
    success: true,
    payment_id: razorpay_payment_id,
    order_id:   razorpay_order_id,
    tier:       isSupporter ? (req.session?.tier || 'free') : authorizedTier,
    is_sponsor: isSupporter,
    sponsor_tier: isSupporter ? sponsorTierLabel : null,
    backer: backerRecord
  });
});

function checkEvaluationPassAuthorized(req) {
  if (globalHackathonMode) return true;
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (API_TOKEN && timingSafeStringEqual(token, API_TOKEN)) return true;
  const sessionUser = req.session?.user?.login?.toLowerCase().replace(/^@/, '');
  if (sessionUser && globalDevRoster.includes(sessionUser)) return true;
  const clientIp = extractClientIp(req).toLowerCase();
  const socketIp = (req.socket?.remoteAddress || '').replace(/^.*:/, '').toLowerCase();
  const isDirectLoopback = socketIp === '127.0.0.1' || socketIp === '1' || socketIp === 'localhost' || socketIp === '::1';
  if (isDirectLoopback && (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost') && (process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_DEV_AUTH === 'true')) return true;
  return false;
}

/**
 * POST /api/billing/activate-evaluation-sponsor
 * Activates an ephemeral sponsor tier for Hackathon Evaluators / Authorized Devs.
 */
app.post('/api/billing/activate-evaluation-sponsor', (req, res) => {
  if (!checkEvaluationPassAuthorized(req)) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Evaluation Sponsor Pass requires Hackathon Evaluation Mode or developer authorization.' }
    });
  }

  const { tier_id, user_override } = req.body || {};
  const tierNum = parseInt(tier_id, 10);
  if (![1, 2, 3].includes(tierNum)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_TIER', message: 'tier_id must be 1 (Cookie), 2 (2 Cups), or 3 (Core).' }
    });
  }

  const tierMap = {
    1: { label: 'Cookie Backer', highlighted: false, paise: 16900 },
    2: { label: '2 Cups Sponsor', highlighted: false, paise: 33900 },
    3: { label: 'Core Supporter', highlighted: true, paise: 84900 }
  };
  const tierInfo = tierMap[tierNum];

  // Evaluation sponsor pass strictly requires a connected GitHub account or developer identity
  const effectiveUser = req.session?.user || user_override || null;
  if (!effectiveUser || !effectiveUser.login) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Evaluation Sponsor activation requires a connected GitHub account or developer session.' }
    });
  }

  const backerId = 'spn_eval_' + (effectiveUser.id || effectiveUser.login);
  const backerRecord = {
    id: backerId,
    name: effectiveUser.name || effectiveUser.login,
    github_handle: effectiveUser.login,
    tier_id: tierNum,
    tier_label: tierInfo.label,
    amount_paise: tierInfo.paise,
    currency: 'INR',
    avatar_url: effectiveUser.avatar_url || effectiveUser.avatarUrl || null,
    created_at: new Date().toISOString(),
    highlighted: tierInfo.highlighted,
    is_evaluation: true,
    is_seed: false
  };

  if (effectiveUser && req.session && !req.session.user) {
    req.session.user = {
      id: effectiveUser.id || 'dev_eval',
      login: effectiveUser.login || 'evaluator',
      name: effectiveUser.name || effectiveUser.login || 'Evaluator',
      avatar_url: effectiveUser.avatar_url || effectiveUser.avatarUrl || null,
      tier: 'enterprise',
      role: 'dev'
    };
  }

  if (!Array.isArray(savedSystemState.sponsors)) {
    savedSystemState.sponsors = [];
  }
  // Remove existing evaluation record for this identity/session so no clutter
  savedSystemState.sponsors = savedSystemState.sponsors.filter(s => {
    if (s.id === backerId) return false;
    if (effectiveUser?.login && s.github_handle === effectiveUser.login && s.is_evaluation) return false;
    return true;
  });
  savedSystemState.sponsors.unshift(backerRecord);

  if (req.session) {
    req.session.is_sponsor = true;
    req.session.sponsor_tier = tierInfo.label;
    req.session.is_evaluation_sponsor = true;
    if (req.session.user) {
      req.session.user.is_sponsor = true;
      req.session.user.sponsor_tier = tierInfo.label;
      req.session.user.is_evaluation_sponsor = true;
    }
  }

  broadcastEvent('SPONSOR_REGISTERED', backerRecord);

  res.json({
    success: true,
    is_sponsor: true,
    sponsor_tier: tierInfo.label,
    is_evaluation: true,
    backer: backerRecord
  });
});

/**
 * POST /api/billing/reset-evaluation-sponsor
 * Resets ephemeral evaluation sponsor pass back to normal visitor state.
 */
app.post('/api/billing/reset-evaluation-sponsor', (req, res) => {
  const user = req.session?.user;
  const backerId = user?.id ? ('spn_eval_' + user.id) : (user?.login ? ('spn_eval_' + user.login) : null);
  if (Array.isArray(savedSystemState.sponsors)) {
    savedSystemState.sponsors = savedSystemState.sponsors.filter(s => {
      if (s.is_evaluation && (s.id === backerId || (user?.login && s.github_handle === user.login) || !user)) {
        return false;
      }
      return true;
    });
  }
  if (req.session) {
    req.session.is_sponsor = false;
    req.session.sponsor_tier = null;
    req.session.is_evaluation_sponsor = false;
    if (req.session.user) {
      req.session.user.is_sponsor = false;
      req.session.user.sponsor_tier = null;
      req.session.user.is_evaluation_sponsor = false;
    }
  }
  res.json({ success: true, is_sponsor: false });
});

/**
 * GET /api/sponsors
 * Returns verified community backers and supporters.
 */
app.get('/api/sponsors', (req, res) => {
  const persistedSponsors = Array.isArray(savedSystemState.sponsors) ? savedSystemState.sponsors : [];
  const effectivePersisted = globalHackathonMode ? persistedSponsors : persistedSponsors.filter(s => !s.is_evaluation);
  const allSponsors = [...effectivePersisted];
  for (const seed of CANONICAL_SEED_SPONSORS) {
    if (!allSponsors.some(s => s.id === seed.id || (seed.github_handle && s.github_handle === seed.github_handle))) {
      allSponsors.push(seed);
    }
  }
  res.json({
    success: true,
    count: allSponsors.length,
    sponsors: allSponsors
  });
});

/**
 * POST /api/billing/webhook
 * Receives asynchronous Razorpay events (payment.captured, payment.failed, etc.).
 * Validates the X-Razorpay-Signature header before trusting the payload.
 *
 * Register this URL in the Razorpay Dashboard → Webhooks:
 *   https://cavdax.sahnirmaan.live/api/billing/webhook
 *
 * Webhook secret: set RAZORPAY_WEBHOOK_SECRET in .env (separate from KEY_SECRET).
 * If RAZORPAY_WEBHOOK_SECRET is not set, the endpoint logs but does not validate.
 */
app.post('/api/billing/webhook', (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature     = req.headers['x-razorpay-signature'];

  // Validate webhook signature if secret is configured (OWASP A02/A07 Hardening)
  if (webhookSecret) {
    if (!signature) {
      console.warn('[CAVDAX Razorpay Webhook] ⛔ Missing x-razorpay-signature header — request rejected.');
      return res.status(401).json({ success: false, error: 'MISSING_WEBHOOK_SIGNATURE' });
    }
    const rawPayload = req.rawBody || (typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body : JSON.stringify(req.body));
    const expected  = createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    if (!timingSafeStringEqual(expected, signature)) {
      console.warn('[CAVDAX Razorpay Webhook] Signature mismatch — ignoring.');
      return res.status(400).json({ success: false, error: 'WEBHOOK_SIGNATURE_MISMATCH' });
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('[CAVDAX Razorpay Webhook] ⛔ RAZORPAY_WEBHOOK_SECRET is unconfigured in production environment.');
      return res.status(503).json({ success: false, error: 'WEBHOOK_SECRET_UNCONFIGURED' });
    }
    console.warn('[CAVDAX Razorpay Webhook] ⚠️ RAZORPAY_WEBHOOK_SECRET not set in non-production — skipping signature validation.');
  }

  let event = req.body;
  if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
    try {
      event = JSON.parse(req.body.toString());
    } catch {
      return res.status(400).json({ success: false, error: 'INVALID_JSON' });
    }
  }

  const eventType  = event?.event;
  const paymentId  = event?.payload?.payment?.entity?.id;
  const orderId    = event?.payload?.payment?.entity?.order_id;
  const amountPaise = event?.payload?.payment?.entity?.amount;

  console.log(`[CAVDAX Razorpay Webhook] Event: ${eventType} | payment: ${paymentId} | order: ${orderId}`);

  switch (eventType) {
    case 'payment.captured':
      // TODO (feature/payment-gateway): activate Pro tier for the user linked to orderId
      console.log(`[CAVDAX Razorpay Webhook] Payment captured ₹${(amountPaise / 100).toFixed(2)} — order ${orderId}`);
      break;
    case 'payment.failed':
      console.warn(`[CAVDAX Razorpay Webhook] Payment failed for order ${orderId}`);
      break;
    case 'subscription.activated':
      console.log(`[CAVDAX Razorpay Webhook] Subscription activated — ${event?.payload?.subscription?.entity?.id}`);
      break;
    case 'subscription.cancelled':
      console.log(`[CAVDAX Razorpay Webhook] Subscription cancelled — ${event?.payload?.subscription?.entity?.id}`);
      break;
    default:
      // Unhandled event — acknowledge and move on
      break;
  }

  // Always return 200 quickly so Razorpay stops retrying
  res.status(200).json({ success: true });
});

// ---------------------------------------------------------------------------
// 9. Static Web HUD Serving & SPA Path Routing Fallback (/overview, /console, /mcp, /project, /team)
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// GLOBAL RFC-7807 ERROR ENVELOPE MIDDLEWARE
// ---------------------------------------------------------------------------
// Catches any unhandled Express errors (4-argument signature required by Express).
// Returns a uniform JSON shape so both the Web HUD and coding agents always get a
// predictable error structure rather than raw stack traces or HTML error pages.
//
// Shape: { success: false, error: { code, message, subsystem, remediable } }
//   code        — machine-readable string (e.g. "NODE_LIMIT_EXCEEDED", "HTTP_500")
//   subsystem   — which API area the error originated from (inferred from req.path)
//   remediable  — true for 4xx (caller can fix it), false for 5xx (server-side)
//
// Must be registered AFTER all route handlers and static file middleware.
// Express identifies error handlers by their 4-parameter signature (err, req, res, next).


// ---------------------------------------------------------------------------
// ARCHITECTURAL DIVERGENCE NOTIFICATION & WEBHOOK ENGINE
// ---------------------------------------------------------------------------

/**
 * GET /api/user/notification-preferences
 * Returns the current user's email and notification preferences.
 */
app.get('/api/user/notification-preferences', (req, res) => {
  const user = req.session?.user;
  const login = user?.login || 'default';
  const savedState = loadSystemState();
  const prefs = savedState.notificationPreferences?.[login] || {
    emailAlerts: true,
    browserAlerts: true,
    targetEmail: user?.email || '',
    webhookUrl: '',
    watchedRepos: []
  };

  res.json({
    success: true,
    preferences: prefs,
    authenticated: Boolean(user),
    userEmail: user?.email || null,
    emailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_ENABLED === 'true')
  });
});

/**
 * POST /api/user/notification-preferences
 * Updates notification preferences in persistent system state.
 */
app.post('/api/user/notification-preferences', async (req, res) => {
  const user = req.session?.user;
  const login = user?.login || 'default';
  const { emailAlerts, browserAlerts, targetEmail, webhookUrl, watchedRepos } = req.body || {};

  if (targetEmail && (typeof targetEmail !== 'string' || targetEmail.length > 254 || !targetEmail.includes('@'))) {
    return res.status(400).json({ success: false, error: 'INVALID_TARGET_EMAIL' });
  }

  if (webhookUrl && (typeof webhookUrl !== 'string' || !(await isSafeWebhookUrl(webhookUrl)))) {
    return res.status(400).json({ success: false, error: 'INVALID_OR_RESTRICTED_WEBHOOK_URL' });
  }

  const savedState = loadSystemState();
  if (!savedState.notificationPreferences) {
    savedState.notificationPreferences = {};
  }

  savedState.notificationPreferences[login] = {
    emailAlerts: typeof emailAlerts === 'boolean' ? emailAlerts : true,
    browserAlerts: typeof browserAlerts === 'boolean' ? browserAlerts : true,
    targetEmail: (targetEmail && typeof targetEmail === 'string') ? targetEmail.trim() : (user?.email || ''),
    webhookUrl: (webhookUrl && typeof webhookUrl === 'string') ? webhookUrl.trim() : (savedState.notificationPreferences[login]?.webhookUrl || ''),
    watchedRepos: Array.isArray(watchedRepos) ? watchedRepos : (savedState.notificationPreferences[login]?.watchedRepos || [])
  };

  saveSystemState(savedState);
  res.json({
    success: true,
    preferences: savedState.notificationPreferences[login]
  });
});

/**
 * POST /api/alerts/simulate-invalidation
 * Interactive pitch & live demo trigger: Simulates an incompatible commit or superseding ADR
 * from a teammate, triggering immediate causal invalidation, SSE HUD broadcast, and real
 * Resend email alert dispatch to the user's inbox.
 */

const simulateAlertLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 6, // 6 simulations per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED: Maximum 6 simulation alerts per 10 minutes.' }
});

// RFC 5322 compliant email validator
const RFC5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// In-memory recipient cooldown map to prevent harassment and quota exhaustion: recipient -> timestamp
const simulationRecipientCooldown = new Map();
const SIMULATION_RECIPIENT_COOLDOWN_MS = 60 * 1000; // 60 seconds per recipient

app.post('/api/alerts/simulate-invalidation', simulateAlertLimiter, async (req, res) => {
  const {
    repo = 'acme-inventory',
    decisionId = 'DEC-102',
    decisionTitle = 'Generate Checkout Service with TokenAuth v1',
    breakingSourceId = 'ADR-002',
    breakingSourceTitle = 'Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned',
    targetEmail
  } = req.body || {};

  const user = req.session?.user;
  const login = user?.login || 'default';
  const savedState = loadSystemState();
  const userPrefs = savedState.notificationPreferences?.[login];

  // Resolve and validate recipient strictly
  let recipient = null;
  if (targetEmail && typeof targetEmail === 'string') {
    const trimmed = targetEmail.trim().toLowerCase();
    if (!RFC5322_EMAIL_REGEX.test(trimmed)) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_EMAIL_FORMAT: The provided targetEmail is not a valid email address.'
      });
    }
    recipient = trimmed;
  } else {
    recipient = (userPrefs?.targetEmail || user?.email || 'suneetchugh@gmail.com').toLowerCase().trim();
  }

  // Recipient cooldown enforcement (60 seconds per recipient)
  const lastDispatched = simulationRecipientCooldown.get(recipient);
  const now = Date.now();
  if (lastDispatched && (now - lastDispatched < SIMULATION_RECIPIENT_COOLDOWN_MS)) {
    const remainingSec = Math.ceil((SIMULATION_RECIPIENT_COOLDOWN_MS - (now - lastDispatched)) / 1000);
    return res.status(429).json({
      success: false,
      error: `RECIPIENT_COOLDOWN_ACTIVE: An alert was recently dispatched to ${recipient}. Please wait ${remainingSec}s before sending another alert to this address.`
    });
  }

  const violationPaths = [
    [`Decision:${decisionId}`, 'Fact:F-Auth-v1', `Source:${breakingSourceId} (SUPERSEDED by ${breakingSourceId})`]
  ];

  // 1. Invalidate decision in FalkorDB if live
  if (isFalkorConnected && graph) {
    try {
      await cascadeInvalidation(graph, breakingSourceId, 'ADR-001').catch(() => {});
    } catch (e) {
      console.warn('[CAVDAX Simulation] Live cascade notice:', e.message);
    }
  }

  // 2. Broadcast SSE event to all connected HUD viewers with audio trigger flag
  const alertPayload = {
    type: 'ARCHITECTURAL_DIVERGENCE_ALERT',
    timestamp: Date.now(),
    repo,
    decision_id: decisionId,
    decision_title: decisionTitle,
    breaking_source_id: breakingSourceId,
    breaking_source_title: breakingSourceTitle,
    violation_paths: violationPaths,
    gate_verdict: 'BLOCKED_SUPERSEDED_SOURCE',
    simulated: true
  };
  broadcastEvent('ARCHITECTURAL_DIVERGENCE_ALERT', alertPayload);

  // 3. Dispatch real Resend email alert
  const hudUrl = `${CLIENT_URL || 'https://cavdax.sahnirmaan.live'}/console?highlight=${encodeURIComponent(decisionId)}&blast=true`;
  // Dispatch Web Push to registered desktop Service Workers strictly for the requesting user
  broadcastWebPushAlert({
    title: 'CAVDAX: Divergence Alert',
    body: `Decision ${decisionId} is invalidated by ${breakingSourceId}!`,
    decision_id: decisionId,
    url: hudUrl
  }, login).catch((err) => console.warn('[CAVDAX WebPush] Notice:', err.message));

  // Dispatch outgoing webhook if configured
  if (userPrefs?.webhookUrl) {
    dispatchOutgoingWebhook(userPrefs.webhookUrl, alertPayload).catch((err) =>
      console.warn('[CAVDAX Webhook] Notice:', err.message)
    );
  }

  // Dispatch email with recipient cooldown recorded
  const emailResult = await sendInvalidationEmail({
    to: recipient,
    repo,
    decisionId,
    decisionTitle,
    breakingSourceId,
    breakingSourceTitle,
    violationPaths,
    hudUrl,
    remediationCli: `npx cavdax mcp -> revalidate_decision("${breakingSourceId}", "${decisionId}")`,
    force: true
  });

  if (emailResult.success) {
    simulationRecipientCooldown.set(recipient, now);
  }

  return res.json({
    success: true,
    alert: alertPayload,
    emailSent: emailResult.success,
    emailResult,
    recipient
  });
});

/**
 * POST /api/github/webhook
 * Real GitHub repository webhook receiver for push and pull_request events.
 */
const handleGithubWebhook = async (req, res) => {
  const event = req.headers['x-github-event'];
  const signature = req.headers['x-hub-signature-256'];
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  if (process.env.NODE_ENV === 'production' && !webhookSecret) {
    console.error('[CAVDAX Webhook] Rejected webhook in production: GITHUB_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ success: false, error: 'WEBHOOK_SECRET_NOT_CONFIGURED' });
  }

  if (webhookSecret) {
    if (!signature) {
      return res.status(401).json({ success: false, error: 'MISSING_SIGNATURE' });
    }
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const expected = 'sha256=' + createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const trusted = Buffer.from(expected, 'utf8');
    const provided = Buffer.from(signature, 'utf8');
    if (trusted.length !== provided.length || !timingSafeEqual(trusted, provided)) {
      return res.status(401).json({ success: false, error: 'INVALID_SIGNATURE' });
    }
  }

  if (event === 'ping') {
    return res.json({ success: true, message: 'PONG' });
  }

  if (event !== 'push') {
    return res.json({ success: true, message: `Ignored event: ${event}` });
  }

  // Immediately respond 202 Accepted to prevent GitHub's 10-second webhook timeout
  res.status(202).json({ success: true, queued: true, event: 'push' });

  // Process ingestion and alerts asynchronously in a non-blocking background queue
  setImmediate(async () => {
    try {
      const { repository, commits = [] } = req.body || {};
      const repoFullName = repository?.full_name || 'unknown/repo';

      const invalidatedDecisions = [];

      for (const commit of commits) {
        const msg = commit.message || '';
        const sha = commit.id?.slice(0, 7) || 'HEAD';
        const author = commit.author?.name || 'teammate';

        // Direct decision break signal: breaks: DEC-xxx
        const breaksMatches = [...msg.matchAll(/breaks[:\s]+(DEC-\d+)/gi)];
        for (const m of breaksMatches) {
          invalidatedDecisions.push({
            decisionId: m[1].toUpperCase(),
            sourceSha: sha,
            breakingSourceId: `commit-${sha}`,
            breakingSourceTitle: msg.split('\n')[0],
            author,
            message: msg.split('\n')[0]
          });
        }

        // ADR supersession signal: supersedes: ADR-xxx
        const supersedesMatches = [...msg.matchAll(/supersedes[:\s]+(ADR-\d+)/gi)];
        for (const m of supersedesMatches) {
          const supersededAdr = m[1].toUpperCase();
          invalidatedDecisions.push({
            decisionId: `CASCADE-${supersededAdr}`,
            sourceSha: sha,
            breakingSourceId: `commit-${sha}`,
            breakingSourceTitle: `Supersedes ${supersededAdr}: ${msg.split('\n')[0]}`,
            author,
            message: msg.split('\n')[0]
          });
        }

        // ADR file changes detected via path inspection: commit.added + commit.modified
        const touchedFiles = [...(commit.added || []), ...(commit.modified || [])];
        for (const file of touchedFiles) {
          if (isAdrPath(file)) {
            const match = file.match(/(ADR-\d+)/i) || file.match(/\/(\d{3,4})[-_]/);
            const adrId = match ? (match[1].toUpperCase().startsWith('ADR-') ? match[1].toUpperCase() : `ADR-${match[1]}`) : file;
            const alreadyRegistered = invalidatedDecisions.some((d) => d.breakingSourceId === adrId || d.sourceSha === sha);
            if (!alreadyRegistered) {
              invalidatedDecisions.push({
                decisionId: `ADR-MUTATION-${adrId}`,
                sourceSha: sha,
                breakingSourceId: adrId,
                breakingSourceTitle: `ADR modified in ${file}`,
                author,
                message: `Architectural Decision Record ${adrId} updated via ${file}`
              });
            }
          }
        }
      }

      if (invalidatedDecisions.length === 0) {
        return;
      }

      // Invalidate decision in FalkorDB if live graph is connected
      if (isFalkorConnected && graph) {
        for (const inv of invalidatedDecisions) {
          if (inv.breakingSourceId && inv.decisionId.startsWith('CASCADE-')) {
            const targetAdr = inv.decisionId.replace('CASCADE-', '');
            await cascadeInvalidation(graph, inv.breakingSourceId, targetAdr).catch(() => {});
          }
        }
      }

      // Scoped Recipient Resolution: Filter by watchedRepos & repository ownership
      const savedState = loadSystemState();
      const allPrefs = savedState.notificationPreferences || {};
      const targetRecipients = [];

      for (const [login, prefs] of Object.entries(allPrefs)) {
        const watched = Array.isArray(prefs.watchedRepos) ? prefs.watchedRepos : [];
        const isWatching = watched.length === 0 ||
          watched.includes(repoFullName) ||
          repoFullName.toLowerCase().startsWith(`${login.toLowerCase()}/`);

        if (isWatching) {
          targetRecipients.push({ login, prefs });
        }
      }

      const hudBase = CLIENT_URL || 'https://cavdax.sahnirmaan.live';

      for (const inv of invalidatedDecisions) {
        const hudUrl = `${hudBase}/console?highlight=${encodeURIComponent(inv.decisionId)}&blast=true`;
        const alertPayload = {
          type: 'ARCHITECTURAL_DIVERGENCE_ALERT',
          repo: repoFullName,
          decision_id: inv.decisionId,
          breaking_source_id: inv.breakingSourceId,
          breaking_source_title: inv.breakingSourceTitle,
          breaking_commit: inv.sourceSha,
          breaking_message: inv.message,
          author: inv.author,
          timestamp: Date.now()
        };

        // 1. Channel 1: SSE Broadcast to active consoles
        broadcastEvent('ARCHITECTURAL_DIVERGENCE_ALERT', alertPayload);

        // 2. Channel 2: RFC 8292 VAPID Web Push scoped strictly to targetRecipients who enabled browserAlerts
        for (const target of targetRecipients) {
          if (target.prefs.browserAlerts) {
            broadcastWebPushAlert({
              title: `CAVDAX: Divergence Alert (${repoFullName})`,
              body: `${inv.decisionId} invalidated by ${inv.breakingSourceId}!`,
              decision_id: inv.decisionId,
              url: hudUrl
            }, target.login).catch((err) => console.warn('[CAVDAX WebPush] Webhook alert notice:', err.message));
          }
        }

        // 3. Channel 3: Resend Transactional Email
        for (const target of targetRecipients) {
          if (target.prefs.emailAlerts && target.prefs.targetEmail) {
            sendInvalidationEmail({
              to: target.prefs.targetEmail,
              repo: repoFullName,
              decisionId: inv.decisionId,
              decisionTitle: inv.breakingSourceTitle,
              breakingSourceId: inv.breakingSourceId,
              breakingSourceTitle: inv.breakingSourceTitle,
              hudUrl
            }).catch((err) => console.warn('[CAVDAX Email] Webhook email notice:', err.message));
          }
        }

        // 4. Channel 4: Generic Outgoing JSON Webhooks (Slack, Discord, custom API)
        for (const target of targetRecipients) {
          if (target.prefs.webhookUrl) {
            dispatchOutgoingWebhook(target.prefs.webhookUrl, alertPayload).catch((err) =>
              console.warn('[CAVDAX Webhook] Outgoing webhook notice:', err.message)
            );
          }
        }
      }
    } catch (err) {
      console.error('[CAVDAX Webhook] Error during background alert dispatch:', err.message);
    }
  });
};

app.post('/api/github/webhook', handleGithubWebhook);
app.post('/api/webhooks/github', handleGithubWebhook);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  // Infer which subsystem produced the error from the request path
  let subsystem = 'server';
  if (req.path.startsWith('/api/mcp')) subsystem = 'mcp_gate';
  else if (req.path.startsWith('/api/ingest')) subsystem = 'ingestion';
  else if (req.path.startsWith('/api/auth')) subsystem = 'oauth';
  else if (req.path.startsWith('/api/audit')) subsystem = 'audit';
  else if (req.path.startsWith('/api/graph')) subsystem = 'graph';

  // Include stack trace in non-production only — never leak internals to clients
  const detail = process.env.NODE_ENV !== 'production' ? err.stack : undefined;

  console.error(`[CAVDAX Error] ${subsystem} — ${status} — ${err.message}`);

  res.status(status).json({
    success: false,
    error: {
      code: err.code || `HTTP_${status}`,
      message: err.message || 'An unexpected error occurred.',
      subsystem,
      remediable: status < 500, // 4xx = client can fix it; 5xx = server-side
      ...(detail ? { detail } : {})
    }
  });
});

// ---------------------------------------------------------------------------
// FALKORDB BACKGROUND AUTO-RECONNECT
// ---------------------------------------------------------------------------
// If FalkorDB was unreachable at boot, the server previously had no mechanism
// to reconnect without a restart. This loop polls continuously in the background.
//
// Reconnect schedule: starts at 5 s, doubles on each consecutive failure,
// caps at 5 minutes. Resets to 5 s the moment a connection succeeds.
//
// When already connected, a cheap `RETURN 1` ping validates the link each cycle;
// if it throws, isFalkorConnected is set to false and the next cycle retries.
//
// setTimeout(...).unref() ensures the timer does not keep the Node process alive
// during graceful shutdown or test teardown.

let _falkorReconnectDelay = 5_000; // starts at 5s
const FALKOR_RECONNECT_MIN = 5_000;
const FALKOR_RECONNECT_MAX = 5 * 60 * 1000; // 5 min ceiling

function _scheduleFalkorReconnect() {
  setTimeout(async () => {
    if (isFalkorConnected) {
      // Already connected — silently verify with a cheap ping
      try {
        await graph.query('RETURN 1');
        // Still alive — reset backoff and schedule next check at base interval
        _falkorReconnectDelay = FALKOR_RECONNECT_MIN;
      } catch {
        isFalkorConnected = false;
        console.warn('[CAVDAX Reconnect] FalkorDB ping failed — marking disconnected.');
      }
    } else {
      console.log(`[CAVDAX Reconnect] Retrying FalkorDB connection (next in ${_falkorReconnectDelay / 1000}s)...`);
      await initDb();
      if (isFalkorConnected) {
        console.log('[CAVDAX Reconnect] FalkorDB reconnected successfully. Backoff reset.');
        _falkorReconnectDelay = FALKOR_RECONNECT_MIN; // success — reset to base
      } else {
        // Exponential backoff: double the delay, cap at max
        _falkorReconnectDelay = Math.min(_falkorReconnectDelay * 2, FALKOR_RECONNECT_MAX);
      }
    }
    _scheduleFalkorReconnect(); // always reschedule
  }, _falkorReconnectDelay).unref();
}

// Start listening
initDb().finally(() => {
  app.listen(PORT, () => {
    console.log(`[CAVDAX Server] Running at http://localhost:${PORT}`);
    console.log(`[CAVDAX Server] Graph Engine: ${isFalkorConnected ? 'FalkorDB Live' : 'Simulation Fallback Ready'}`);
  });
  _scheduleFalkorReconnect(); // start background reconnect loop after first boot attempt
});
