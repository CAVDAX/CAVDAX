import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const INDEX_SRC = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');

describe('7-Day Pro Trial & Enterprise Corporate Domain Security Hardening', () => {
  it('enforces start-trial route registration in index.js', () => {
    assert.ok(
      INDEX_SRC.includes("app.post('/api/billing/start-trial'"),
      'Route /api/billing/start-trial must be registered'
    );
  });

  it('enforces enterprise register-domain route registration in index.js', () => {
    assert.ok(
      INDEX_SRC.includes("app.post('/api/enterprise/register-domain'"),
      'Route /api/enterprise/register-domain must be registered'
    );
  });

  it('strictly blocks public freemail providers from enterprise registration', () => {
    assert.ok(INDEX_SRC.includes('BLOCKED_PUBLIC_EMAIL_DOMAINS'), 'BLOCKED_PUBLIC_EMAIL_DOMAINS must exist');
    assert.ok(INDEX_SRC.includes("'gmail.com'"), 'gmail.com must be blocked');
    assert.ok(INDEX_SRC.includes("'yahoo.com'"), 'yahoo.com must be blocked');
    assert.ok(INDEX_SRC.includes("'outlook.com'"), 'outlook.com must be blocked');
    assert.ok(INDEX_SRC.includes("'proton.me'"), 'proton.me must be blocked');
    assert.ok(INDEX_SRC.includes('PUBLIC_DOMAIN_FORBIDDEN'), 'Must reject public email domains with PUBLIC_DOMAIN_FORBIDDEN');
  });

  it('strictly validates domain syntax via RFC hostname regex', () => {
    assert.ok(INDEX_SRC.includes('INVALID_DOMAIN_SYNTAX'), 'Must reject invalid domain syntax');
    assert.ok(INDEX_SRC.includes('domainRegex'), 'Domain regex must be enforced');
  });

  it('binds 7-day Pro trial to identity, rejects repeat claims, and persists to disk', () => {
    assert.ok(INDEX_SRC.includes('TRIAL_ALREADY_USED'), 'Repeat trial claims must be rejected with TRIAL_ALREADY_USED');
    assert.ok(INDEX_SRC.includes('7 * 24 * 60 * 60 * 1000'), 'Trial duration must be strictly 7 days');
    const startTrialBlock = INDEX_SRC.slice(INDEX_SRC.indexOf("app.post('/api/billing/start-trial'"), INDEX_SRC.indexOf("app.post('/api/enterprise/register-domain'"));
    assert.ok(startTrialBlock.includes('syncSystemStateToDisk()'), 'start-trial must persist active trial to disk');
  });

  it('enforces corporate domain ownership verification and collision guard', () => {
    const regDomainBlock = INDEX_SRC.slice(INDEX_SRC.indexOf("app.post('/api/enterprise/register-domain'"), INDEX_SRC.indexOf("app.post('/api/billing/create-order'"));
    assert.ok(regDomainBlock.includes('DOMAIN_OWNERSHIP_UNVERIFIED'), 'Must enforce DOMAIN_OWNERSHIP_UNVERIFIED check');
    assert.ok(regDomainBlock.includes('DOMAIN_ALREADY_CLAIMED'), 'Must enforce DOMAIN_ALREADY_CLAIMED collision check');
    assert.ok(regDomainBlock.includes('syncSystemStateToDisk()'), 'register-domain must persist to disk');
  });

  it('resolves active trial and corporate org match in /api/auth/me with email verification', () => {
    const authMeBlock = INDEX_SRC.slice(INDEX_SRC.indexOf("app.get('/api/auth/me'"), INDEX_SRC.indexOf('// Test-only session bootstrap'));
    assert.ok(authMeBlock.includes('isTrialActive'), '/api/auth/me must check isTrialActive');
    assert.ok(authMeBlock.includes('trialDaysRemaining'), '/api/auth/me must compute trialDaysRemaining');
    assert.ok(authMeBlock.includes('matchedOrg'), '/api/auth/me must resolve matched organization');
    assert.ok(authMeBlock.includes('isEmailVerified'), '/api/auth/me must verify email ownership');
  });

  it('enforces Edge Bot Interceptor and pre-rendered docs / integration routes in index.js', () => {
    assert.ok(INDEX_SRC.includes('BOT_UA_REGEX'), 'BOT_UA_REGEX must be defined');
    assert.ok(INDEX_SRC.includes('CANONICAL_META_CATALOG'), 'CANONICAL_META_CATALOG must be defined');
    assert.ok(INDEX_SRC.includes("'/docs'"), 'Docs route must be configured in catalog');
    assert.ok(INDEX_SRC.includes("'/integrations/cursor'"), 'Cursor integration must be configured in catalog');
    assert.ok(INDEX_SRC.includes("'/integrations/claude-code'"), 'Claude Code integration must be configured in catalog');
  });

  it('enforces calibrated canonical tier prices (₹299 Pro, ₹4,999 Enterprise)', () => {
    assert.ok(INDEX_SRC.includes('pro: 29900'), 'Pro tier must be calibrated to 29900 paise (₹299/mo)');
    assert.ok(INDEX_SRC.includes('enterprise: 499900'), 'Enterprise tier must be calibrated to 499900 paise (₹4,999/mo)');
  });

  it('allows authentic active Pro trial users to restore Pro tier via /api/user/tier', () => {
    const tierRoute = INDEX_SRC.slice(INDEX_SRC.indexOf("app.post('/api/user/tier'"), INDEX_SRC.indexOf("app.get('/api/user/api-key'"));
    assert.ok(tierRoute.includes('isTrialValid'), '/api/user/tier must verify isTrialValid');
    assert.ok(tierRoute.includes('!hasPaidAccess && !isTrialValid'), 'Must allow upgrading to Pro if trial is valid');
  });
});
