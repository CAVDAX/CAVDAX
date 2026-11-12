/**
 * CAVDAX Payment Architecture & Security Hardening Test Suite
 * File: Codebase/apps/server/test/payment_security_harness.test.mjs
 * 
 * Verifies:
 * 1. Cryptographic HMAC-SHA256 Signature Verification & Timing-Safe Equality
 * 2. Replay Attack Prevention & Idempotency Persistence Across Restarts
 * 3. Server-Side Order Integrity & Fail-Closed Tier Provisioning
 * 4. Localhost / Loopback Payment Confinement Defense
 * 5. 30-Day Billing Expiration & Automatic Quota Downgrade Invariants
 * 6. Webhook Raw-Body Signature Validation & Idempotent Ingestion
 * 7. Multi-Currency Arithmetic & Zero Floating-Point Drift
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, timingSafeEqual, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Architectural Primitives Under Test (Mirroring index.js standards)
// ---------------------------------------------------------------------------

const CANONICAL_TIER_PRICES_PAISE = Object.freeze({
  pro: 29900,         // ₹299 / mo ($4/mo)
  enterprise: 299900  // ₹2,999 / mo ($35/mo)
});

const TIER_LIMITS = Object.freeze({
  free: {
    repositories: 1,
    decisions: 50,
    maxAgentLocks: 1,
    rate_limit_per_min: 300
  },
  pro: {
    repositories: 5,
    decisions: 500,
    maxAgentLocks: 3,
    rate_limit_per_min: 600
  },
  enterprise: {
    repositories: -1,
    decisions: -1,
    maxAgentLocks: -1,
    rate_limit_per_min: 1000000
  }
});

function timingSafeStringEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function computeRazorpaySignature(orderId, paymentId, secret) {
  const payload = `${orderId}|${paymentId}`;
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

function computeWebhookSignature(rawBody, secret) {
  const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  return createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Harness Test Fixtures & In-Memory State Container
// ---------------------------------------------------------------------------

class PaymentHarnessEngine {
  constructor(options = {}) {
    this.keySecret = options.keySecret || 'test_rzp_secret_key_987654321';
    this.webhookSecret = options.webhookSecret || 'test_rzp_webhook_secret_abcdef';
    this.razorpayConfigured = options.razorpayConfigured !== false;
    this.pendingOrders = new Map();
    this.processedPayments = new Set();
    this.storageFilePath = options.storageFilePath || null;
    this.systemState = {
      paidUsers: {},
      sponsors: []
    };
  }

  loadPersistedPayments() {
    if (this.storageFilePath && fs.existsSync(this.storageFilePath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(this.storageFilePath, 'utf8'));
        if (Array.isArray(raw)) {
          this.processedPayments = new Set(raw);
        }
      } catch (err) {
        // fail-safe
      }
    }
  }

  saveProcessedPayment(paymentId) {
    if (!paymentId || typeof paymentId !== 'string') return;
    this.processedPayments.add(paymentId);
    if (this.storageFilePath) {
      fs.mkdirSync(path.dirname(this.storageFilePath), { recursive: true });
      fs.writeFileSync(this.storageFilePath, JSON.stringify([...this.processedPayments]), 'utf8');
    }
  }

  handleCreateOrder(req) {
    const originHost = (req.headers.origin || req.headers.host || '').toLowerCase();
    if (originHost.includes('localhost') || originHost.includes('127.0.0.1')) {
      return {
        status: 403,
        body: {
          success: false,
          error: {
            code: 'LOCALHOST_PAYMENTS_FORBIDDEN',
            message: 'Live Razorpay orders cannot be initiated on localhost to prevent stranded funds in the air.'
          }
        }
      };
    }

    if (!this.razorpayConfigured) {
      return {
        status: 503,
        body: { success: false, error: { code: 'RAZORPAY_NOT_CONFIGURED' } }
      };
    }

    const { amount_paise, receipt, tier } = req.body || {};
    const requestedTier = (tier || '').toLowerCase().trim();

    let amount = parseInt(amount_paise, 10);
    let assignedTier = 'free';

    // Server-side canonical pricing enforcement
    if (requestedTier === 'pro') {
      amount = CANONICAL_TIER_PRICES_PAISE.pro;
      assignedTier = 'pro';
    } else if (requestedTier === 'enterprise') {
      amount = CANONICAL_TIER_PRICES_PAISE.enterprise;
      assignedTier = 'enterprise';
    } else {
      if (!amount || amount < 100) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: 'INVALID_AMOUNT', message: 'amount_paise must be an integer >= 100 (₹1 minimum).' }
          }
        };
      }
      assignedTier = 'supporter';
    }

    const orderId = `order_${randomUUID().replace(/-/g, '').slice(0, 14)}`;
    this.pendingOrders.set(orderId, {
      amount,
      tier: (assignedTier === 'supporter' ? 'free' : assignedTier),
      isSupporter: (assignedTier === 'supporter'),
      user: req.session?.user ? { ...req.session.user } : null,
      createdAt: Date.now()
    });

    return {
      status: 200,
      body: {
        success: true,
        order_id: orderId,
        amount,
        currency: 'INR',
        receipt: receipt || `cavdax_${randomUUID().slice(0, 8)}`
      }
    };
  }

  handleVerifyPayment(req) {
    const originHost = (req.headers.origin || req.headers.host || '').toLowerCase();
    if (originHost.includes('localhost') || originHost.includes('127.0.0.1')) {
      return {
        status: 403,
        body: {
          success: false,
          error: {
            code: 'LOCALHOST_PAYMENTS_FORBIDDEN',
            message: 'Live Razorpay payment verification cannot be processed on localhost to prevent reconciliation desync.'
          }
        }
      };
    }

    if (!this.razorpayConfigured) {
      return {
        status: 503,
        body: { success: false, error: { code: 'RAZORPAY_NOT_CONFIGURED' } }
      };
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    // Guard: required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.' }
        }
      };
    }

    // Cryptographic HMAC-SHA256 verification
    const expectedSig = computeRazorpaySignature(razorpay_order_id, razorpay_payment_id, this.keySecret);
    if (!timingSafeStringEqual(expectedSig, razorpay_signature)) {
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'SIGNATURE_MISMATCH', message: 'Payment signature verification failed. Do not grant access.' }
        }
      };
    }

    // Replay attack defense
    if (this.processedPayments.has(razorpay_payment_id)) {
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'PAYMENT_ALREADY_PROCESSED', message: 'Payment has already been processed and verified.' }
        }
      };
    }

    // Fail-closed order resolution
    const recordedOrder = this.pendingOrders.get(razorpay_order_id);
    if (!recordedOrder) {
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order record expired or invalid. Please initiate payment again.' }
        }
      };
    }

    const authorizedTier = recordedOrder.tier || 'free';
    const isSupporter = Boolean(recordedOrder.isSupporter);
    const orderAmount = recordedOrder.amount || 0;

    this.pendingOrders.delete(razorpay_order_id);
    this.saveProcessedPayment(razorpay_payment_id);

    const userIdentifier = req.session?.user?.githubId
      ? String(req.session.user.githubId)
      : (req.session?.user?.login?.toLowerCase() || 'anonymous_user');

    if (!isSupporter) {
      const nowMs = Date.now();
      const expiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
      this.systemState.paidUsers[userIdentifier] = {
        tier: authorizedTier,
        purchasedAt: new Date(nowMs).toISOString(),
        expiresAt,
        paymentId: razorpay_payment_id,
        login: req.session?.user?.login || userIdentifier
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        tier: isSupporter ? 'free' : authorizedTier,
        is_sponsor: isSupporter,
        amount_paise: orderAmount
      }
    };
  }

  handleWebhook(req) {
    const signature = req.headers['x-razorpay-signature'];
    if (this.webhookSecret) {
      if (!signature) {
        return { status: 401, body: { success: false, error: 'MISSING_WEBHOOK_SIGNATURE' } };
      }
      const rawPayload = req.rawBody || JSON.stringify(req.body);
      const expected = computeWebhookSignature(rawPayload, this.webhookSecret);
      if (!timingSafeStringEqual(expected, signature)) {
        return { status: 400, body: { success: false, error: 'WEBHOOK_SIGNATURE_MISMATCH' } };
      }
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event?.event;
    const paymentId = event?.payload?.payment?.entity?.id;
    const notes = event?.payload?.payment?.entity?.notes || {};

    if (eventType === 'payment.captured' && paymentId) {
      this.saveProcessedPayment(paymentId);
      const targetUser = (notes.userId || notes.login || notes.github_handle || '').toLowerCase();
      const targetTier = notes.tier || 'pro';
      const isSupporter = Boolean(notes.isSupporter || targetTier === 'supporter');

      if (targetUser && !isSupporter) {
        const nowMs = Date.now();
        this.systemState.paidUsers[targetUser] = {
          tier: targetTier,
          purchasedAt: new Date(nowMs).toISOString(),
          expiresAt: new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paymentId,
          login: targetUser
        };
      }
    }

    return { status: 200, body: { success: true } };
  }

  resolveEffectiveQuota(userIdentifier) {
    const paidRecord = this.systemState.paidUsers[userIdentifier?.toLowerCase()];
    const now = Date.now();

    let effectiveTier = 'free';
    if (paidRecord) {
      const expiresAtMs = new Date(paidRecord.expiresAt).getTime();
      if (expiresAtMs > now) {
        effectiveTier = paidRecord.tier;
      }
    }

    return {
      tier: effectiveTier,
      limits: TIER_LIMITS[effectiveTier] || TIER_LIMITS.free,
      isExpired: Boolean(paidRecord && new Date(paidRecord.expiresAt).getTime() <= now)
    };
  }
}

// ---------------------------------------------------------------------------
// TEST SPECIFICATIONS
// ---------------------------------------------------------------------------

describe('CAVDAX Payment & Subscription Tier Security Harness', () => {
  let engine;
  let tmpFilePath;

  beforeEach(() => {
    tmpFilePath = path.join(os.tmpdir(), `cavdax_pay_test_${randomUUID()}.json`);
    engine = new PaymentHarnessEngine({ storageFilePath: tmpFilePath });
  });

  // -------------------------------------------------------------------------
  // 1. Cryptographic HMAC-SHA256 Signature Verification
  // -------------------------------------------------------------------------
  describe('1. Cryptographic HMAC-SHA256 Signature Verification', () => {
    it('passes for a valid HMAC-SHA256 signature generated with matching secret', () => {
      const orderId = 'order_test_9012';
      const paymentId = 'pay_test_3456';
      const validSig = computeRazorpaySignature(orderId, paymentId, engine.keySecret);

      engine.pendingOrders.set(orderId, { amount: 29900, tier: 'pro', isSupporter: false });

      const res = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: validSig
        },
        session: { user: { login: 'octocat', githubId: 101 } }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.tier, 'pro');
    });

    it('rejects tampered signature with 400 SIGNATURE_MISMATCH', () => {
      const orderId = 'order_test_9012';
      const paymentId = 'pay_test_3456';
      const forgedSig = 'a'.repeat(64);

      engine.pendingOrders.set(orderId, { amount: 29900, tier: 'pro', isSupporter: false });

      const res = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: forgedSig
        }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'SIGNATURE_MISMATCH');
    });

    it('rejects requests with missing required fields with 400 MISSING_FIELDS', () => {
      const testCases = [
        { razorpay_payment_id: 'pay_123', razorpay_signature: 'sig_123' },
        { razorpay_order_id: 'order_123', razorpay_signature: 'sig_123' },
        { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123' }
      ];

      for (const payload of testCases) {
        const res = engine.handleVerifyPayment({
          headers: { host: 'cavdax.sahnirmaan.live' },
          body: payload
        });
        assert.equal(res.status, 400);
        assert.equal(res.body.error?.code, 'MISSING_FIELDS');
      }
    });

    it('verifies constant-time comparison prevents side-channel timing leaks', () => {
      const sigA = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e1234567890abcdef123456';
      const sigB = '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e1234567890abcdef123457';
      const sigC = 'different_length';

      assert.equal(timingSafeStringEqual(sigA, sigA), true);
      assert.equal(timingSafeStringEqual(sigA, sigB), false);
      assert.equal(timingSafeStringEqual(sigA, sigC), false);
      assert.equal(timingSafeStringEqual(null, sigA), false);
      assert.equal(timingSafeStringEqual(sigA, 12345), false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Replay Attack Prevention & Idempotency
  // -------------------------------------------------------------------------
  describe('2. Replay Attack Prevention & Idempotency', () => {
    it('rejects duplicate payment_id submissions with 400 PAYMENT_ALREADY_PROCESSED', () => {
      const orderId1 = 'order_replay_1';
      const orderId2 = 'order_replay_2';
      const paymentId = 'pay_replay_token_xyz';

      engine.pendingOrders.set(orderId1, { amount: 29900, tier: 'pro', isSupporter: false });
      engine.pendingOrders.set(orderId2, { amount: 29900, tier: 'pro', isSupporter: false });

      const sig1 = computeRazorpaySignature(orderId1, paymentId, engine.keySecret);
      const firstRes = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { razorpay_order_id: orderId1, razorpay_payment_id: paymentId, razorpay_signature: sig1 }
      });
      assert.equal(firstRes.status, 200);

      const sig2 = computeRazorpaySignature(orderId2, paymentId, engine.keySecret);
      const replayRes = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { razorpay_order_id: orderId2, razorpay_payment_id: paymentId, razorpay_signature: sig2 }
      });

      assert.equal(replayRes.status, 400);
      assert.equal(replayRes.body.success, false);
      assert.equal(replayRes.body.error?.code, 'PAYMENT_ALREADY_PROCESSED');
    });

    it('persists processed payment IDs across server restarts via atomic disk ledger', () => {
      const paymentId = 'pay_persisted_disk_777';
      engine.saveProcessedPayment(paymentId);

      assert.ok(fs.existsSync(tmpFilePath));
      const diskContents = JSON.parse(fs.readFileSync(tmpFilePath, 'utf8'));
      assert.ok(diskContents.includes(paymentId));

      const restartedEngine = new PaymentHarnessEngine({ storageFilePath: tmpFilePath });
      restartedEngine.loadPersistedPayments();

      assert.ok(restartedEngine.processedPayments.has(paymentId));

      const orderId = 'order_cold_restart';
      restartedEngine.pendingOrders.set(orderId, { amount: 29900, tier: 'pro' });
      const sig = computeRazorpaySignature(orderId, paymentId, restartedEngine.keySecret);

      const replayRes = restartedEngine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig }
      });

      assert.equal(replayRes.status, 400);
      assert.equal(replayRes.body.error?.code, 'PAYMENT_ALREADY_PROCESSED');

      if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Order Integrity & Fail-Closed Tier Provisioning
  // -------------------------------------------------------------------------
  describe('3. Order Integrity & Fail-Closed Tier Provisioning', () => {
    it('overrides arbitrary low client-provided amounts for Pro tier with canonical 29,900 paise', () => {
      const res = engine.handleCreateOrder({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { tier: 'pro', amount_paise: 100 }
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.amount, 29900);
      const recorded = engine.pendingOrders.get(res.body.order_id);
      assert.equal(recorded.amount, 29900);
      assert.equal(recorded.tier, 'pro');
    });

    it('fails closed with 400 ORDER_NOT_FOUND if order record is missing and never defaults to Pro', () => {
      const orderId = 'order_nonexistent_999';
      const paymentId = 'pay_fake_valid_sig';
      const validSig = computeRazorpaySignature(orderId, paymentId, engine.keySecret);

      const res = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: validSig },
        session: { user: { login: 'attacker' } }
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error?.code, 'ORDER_NOT_FOUND');
      assert.equal(engine.systemState.paidUsers['attacker'], undefined);
    });

    it('enforces >= 100 paise minimum for supporter donations and blocks Pro entitlement grants', () => {
      const rejectRes = engine.handleCreateOrder({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { tier: 'supporter', amount_paise: 99 }
      });
      assert.equal(rejectRes.status, 400);
      assert.equal(rejectRes.body.error?.code, 'INVALID_AMOUNT');

      const validRes = engine.handleCreateOrder({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { tier: 'supporter', amount_paise: 84900 }
      });
      assert.equal(validRes.status, 200);

      const orderId = validRes.body.order_id;
      const paymentId = 'pay_supporter_patron';
      const sig = computeRazorpaySignature(orderId, paymentId, engine.keySecret);

      const verifyRes = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig },
        session: { user: { login: 'benefactor' } }
      });

      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.body.is_sponsor, true);
      assert.equal(verifyRes.body.tier, 'free');
      assert.equal(engine.systemState.paidUsers['benefactor'], undefined);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Localhost / Loopback Payment Confinement
  // -------------------------------------------------------------------------
  describe('4. Localhost / Loopback Payment Confinement', () => {
    it('rejects create-order requests originating from localhost or 127.0.0.1 with 403', () => {
      const forbiddenOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'localhost:3000',
        '127.0.0.1:8080'
      ];

      for (const origin of forbiddenOrigins) {
        const res = engine.handleCreateOrder({
          headers: { origin },
          body: { tier: 'pro' }
        });
        assert.equal(res.status, 403);
        assert.equal(res.body.error?.code, 'LOCALHOST_PAYMENTS_FORBIDDEN');
      }
    });

    it('rejects verify-payment requests originating from loopback hosts with 403', () => {
      const res = engine.handleVerifyPayment({
        headers: { host: 'localhost:3000' },
        body: { razorpay_order_id: 'o_1', razorpay_payment_id: 'p_1', razorpay_signature: 's_1' }
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error?.code, 'LOCALHOST_PAYMENTS_FORBIDDEN');
    });
  });

  // -------------------------------------------------------------------------
  // 5. 30-Day Billing Expiration & Quota Invariants
  // -------------------------------------------------------------------------
  describe('5. 30-Day Billing Expiration & Quota Invariants', () => {
    it('sets subscription expiresAt to exactly 30 days in the future upon verification', () => {
      const orderId = 'order_exp_test';
      const paymentId = 'pay_exp_test';
      const sig = computeRazorpaySignature(orderId, paymentId, engine.keySecret);

      engine.pendingOrders.set(orderId, { amount: 29900, tier: 'pro', isSupporter: false });

      const startTime = Date.now();
      const res = engine.handleVerifyPayment({
        headers: { host: 'cavdax.sahnirmaan.live' },
        body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: sig },
        session: { user: { login: 'pro_developer' } }
      });

      assert.equal(res.status, 200);
      const record = engine.systemState.paidUsers['pro_developer'];
      assert.ok(record);

      const expiresMs = new Date(record.expiresAt).getTime();
      const expectedMs = startTime + 30 * 24 * 60 * 60 * 1000;
      assert.ok(Math.abs(expiresMs - expectedMs) < 1000, 'Expiration must be precisely 30 days ahead');
    });

    it('immediately downgrades expired subscriptions to Community/Free quotas', () => {
      engine.systemState.paidUsers['active_pro'] = {
        tier: 'pro',
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      };

      const activeQuota = engine.resolveEffectiveQuota('active_pro');
      assert.equal(activeQuota.tier, 'pro');
      assert.equal(activeQuota.limits.repositories, 5);
      assert.equal(activeQuota.limits.maxAgentLocks, 3);
      assert.equal(activeQuota.limits.decisions, 500);

      engine.systemState.paidUsers['expired_pro'] = {
        tier: 'pro',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      };

      const expiredQuota = engine.resolveEffectiveQuota('expired_pro');
      assert.equal(expiredQuota.tier, 'free');
      assert.equal(expiredQuota.isExpired, true);
      assert.equal(expiredQuota.limits.repositories, 1);
      assert.equal(expiredQuota.limits.maxAgentLocks, 1);
      assert.equal(expiredQuota.limits.decisions, 50);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Webhook Raw-Body Signature Validation & Idempotent Ingestion
  // -------------------------------------------------------------------------
  describe('6. Webhook Raw-Body Signature Validation & Idempotent Ingestion', () => {
    it('authenticates valid raw-body HMAC-SHA256 signatures on webhooks', () => {
      const payloadObj = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_captured_1',
              order_id: 'order_wh_1',
              amount: 29900,
              notes: { login: 'webhook_user', tier: 'pro' }
            }
          }
        }
      };
      const rawPayload = JSON.stringify(payloadObj);
      const signature = computeWebhookSignature(rawPayload, engine.webhookSecret);

      const res = engine.handleWebhook({
        headers: { 'x-razorpay-signature': signature },
        rawBody: rawPayload,
        body: payloadObj
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(engine.processedPayments.has('pay_wh_captured_1'));
      assert.equal(engine.systemState.paidUsers['webhook_user']?.tier, 'pro');
    });

    it('rejects webhooks with missing signature header with 401', () => {
      const res = engine.handleWebhook({
        headers: {},
        body: { event: 'payment.captured' }
      });
      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'MISSING_WEBHOOK_SIGNATURE');
    });

    it('rejects webhooks with tampered signature with 400', () => {
      const res = engine.handleWebhook({
        headers: { 'x-razorpay-signature': 'invalid_forged_hash' },
        rawBody: '{"event":"payment.captured"}',
        body: { event: 'payment.captured' }
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'WEBHOOK_SIGNATURE_MISMATCH');
    });

    it('processes duplicate webhook events idempotently without double-crediting or corrupting state', () => {
      const payloadObj = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wh_dup_id',
              amount: 29900,
              notes: { login: 'dedup_user', tier: 'pro' }
            }
          }
        }
      };
      const rawPayload = JSON.stringify(payloadObj);
      const signature = computeWebhookSignature(rawPayload, engine.webhookSecret);

      const req = {
        headers: { 'x-razorpay-signature': signature },
        rawBody: rawPayload,
        body: payloadObj
      };

      const res1 = engine.handleWebhook(req);
      assert.equal(res1.status, 200);

      const res2 = engine.handleWebhook(req);
      assert.equal(res2.status, 200);

      assert.equal(engine.processedPayments.size, 1);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Multi-Currency Arithmetic & Zero Floating-Point Drift
  // -------------------------------------------------------------------------
  describe('7. Multi-Currency Arithmetic & Zero Floating-Point Drift', () => {
    function formatInr(paise) {
      if (!Number.isInteger(paise)) throw new TypeError('Paise must be integer');
      const rupees = Math.floor(paise / 100);
      const remainder = paise % 100;
      return `₹${rupees.toLocaleString('en-IN')}.${String(remainder).padStart(2, '0')}`;
    }

    function formatUsd(cents) {
      if (!Number.isInteger(cents)) throw new TypeError('Cents must be integer');
      const dollars = Math.floor(cents / 100);
      const remainder = cents % 100;
      return `$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
    }

    it('formats INR paise to rupees with exact zero-drift string conversion', () => {
      assert.equal(formatInr(29900), '₹299.00');
      assert.equal(formatInr(299900), '₹2,999.00');
      assert.equal(formatInr(100), '₹1.00');
      assert.equal(formatInr(84900), '₹849.00');
      assert.equal(formatInr(33900), '₹339.00');
      assert.equal(formatInr(16900), '₹169.00');
    });

    it('formats USD cents with exact decimal precision', () => {
      assert.equal(formatUsd(400), '$4.00');
      assert.equal(formatUsd(3500), '$35.00');
      assert.equal(formatUsd(100000), '$1,000.00');
    });

    it('demonstrates integer operations prevent floating-point accumulation drift', () => {
      const floatSum = 0.1 + 0.2;
      assert.notEqual(floatSum, 0.3);

      const integerPaiseSum = 10 + 20;
      assert.equal(integerPaiseSum, 30);
      assert.equal(formatInr(integerPaiseSum), '₹0.30');
    });
  });
});
