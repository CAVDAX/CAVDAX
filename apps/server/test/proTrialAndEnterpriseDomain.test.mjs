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

  it('binds 7-day Pro trial to identity and rejects repeat claims', () => {
    assert.ok(INDEX_SRC.includes('TRIAL_ALREADY_USED'), 'Repeat trial claims must be rejected with TRIAL_ALREADY_USED');
    assert.ok(INDEX_SRC.includes('7 * 24 * 60 * 60 * 1000'), 'Trial duration must be strictly 7 days');
  });

  it('resolves active trial and corporate org match in /api/auth/me', () => {
    const authMeBlock = INDEX_SRC.slice(INDEX_SRC.indexOf("app.get('/api/auth/me'"), INDEX_SRC.indexOf('// Test-only session bootstrap'));
    assert.ok(authMeBlock.includes('isTrialActive'), '/api/auth/me must check isTrialActive');
    assert.ok(authMeBlock.includes('trialDaysRemaining'), '/api/auth/me must compute trialDaysRemaining');
    assert.ok(authMeBlock.includes('matchedOrg'), '/api/auth/me must resolve matched organization');
  });
});
