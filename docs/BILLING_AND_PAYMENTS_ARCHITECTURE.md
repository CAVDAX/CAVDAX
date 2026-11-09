# CAVDAX Billing, Payments, and Quota Metering Architecture

**Document Status:** Architecture Blueprint & Implementation Specification  
**Version:** 1.0.0 (GraphHacks Monorepo Standard)  
**Security Standard:** Zero-Trust Client, Zero-PCI Footprint, Test-Mode Intermediary  
**Constraint Rule:** Strictly zero real financial custody. Student prototype concept utilizing sandbox/test credentials only.

---

## 1. Executive Summary & Zero-Custody Model

CAVDAX implements an asynchronous, event-driven subscription management and quota enforcement layer designed to meter high-frequency AST tool call verifications, FalkorDB GraphBLAS reachability calculations, and per-repository causal graph generation.

### 1.1 Non-Custodial Legal & Security Posture
In strict accordance with RBI regulations, the Companies Act CSR guidelines, and hackathon project integrity rules:
- **No Third-Party Fund Holding:** CAVDAX never maintains escrow balances, directly debits bank accounts, or holds developer/sponsor funds in custody.
- **Hosted Payment Gateways (Test Mode Only):** All transactions, token authorizations, and mock co-funding disbursements execute strictly via **RazorpayX Test Mode** (for INR ₹ / Indian developer framing) and **Stripe Test Mode** (for international developer tiering).
- **Zero-PCI Compliance Footprint:** No credit card numbers, CVVs, or bank credentials ever pass through or touch CAVDAX servers or local databases. Client applications interact with hosted checkout portals or test tokens.

```
+-----------------------------------------------------------------------------+
|                           DEVELOPER / CLIENT                                |
|          (Browser PWA / IDE MCP Agent: Cursor, Claude Code, Windsurf)       |
+-----------------------------------------------------------------------------+
                                       |
                                       | 1. POST /api/billing/checkout (tier: "pro")
                                       v
+-----------------------------------------------------------------------------+
|                           CAVDAX CORE API GATEWAY                           |
|       - Validates GitHub OAuth Session & Tenant Context                     |
|       - Generates Hosted Session (Stripe Checkout / RazorpayX Order)        |
+-----------------------------------------------------------------------------+
                                       |
                                       | 2. Redirect to Sandbox Portal
                                       v
+-----------------------------------------------------------------------------+
|                       SANDBOX PAYMENT PROCESSOR                             |
|          (Stripe Test Mode `cs_test_...` / RazorpayX `order_test_...`)      |
|       - Processes Mock Authorization (Test Cards: 4242... / Success Sim)    |
+-----------------------------------------------------------------------------+
                                       |
                                       | 3. Cryptographically Signed Webhook
                                       |    (X-Razorpay-Signature / Stripe-Signature)
                                       v
+-----------------------------------------------------------------------------+
|                        CAVDAX WEBHOOK INGESTION ENGINE                      |
|       - Validates HMAC-SHA256 Signature against Raw Request Buffer          |
|       - Idempotent Event Deduplication in PostgreSQL/MongoDB Event Store    |
|       - Updates Tenant Quota & Tier State in Redis & Active Memory          |
+-----------------------------------------------------------------------------+
```

---

## 2. Subscription Tiers & Quota Specifications

CAVDAX defines three distinct architectural tiers, visually communicated via the concentric profile Tier Ring:

| Dimension | Tier 1: Free Community | Tier 2: Pro Autonomous | Tier 3: Team & Scale |
|---|---|---|---|
| **Tier Ring Hue** | Platinum / Titanium (`ring-slate-400` / `ring-white/30`) | Golden Amber (`ring-amber-400` with specular glow) | Deep Iris / Violet (`ring-violet-400` with aura) |
| **Price (Simulated)** | $0 / month (Free forever) | $29 / month (₹2,499 / mo) | Custom / Air-gapped deployment |
| **AST Tool Checks** | 100 verifications / 24-hour window | 10,000 verifications / 24-hour window | Unlimited / Hardware-constrained |
| **Connected Repos** | 1 Active GitHub repository | Unlimited connected repositories | Unlimited / Self-hosted GitHub Enterprise |
| **Reachability Engine** | Standard DFS/BFS traversal | FalkorDB GraphBLAS matrix semirings (< 2.1ms) | Dedicated on-premise FalkorDB cluster |
| **Webhook Ingestion** | Polling & manual refresh | Live real-time webhook streaming | Sub-millisecond direct socket bus |
| **Audit Log History** | 24-Hour ephemeral window | 90-Day cryptographic signed audit ledger | Immutable append-only audit trail |
| **SLA & Support** | Community GitHub Discussions | Priority ticket triage & early MCP access | Dedicated 24/7 SLA & architectural consultation |

---

## 3. Quota Metering & Rate-Limiting Engine

Verification requests initiated by local MCP agents (Cursor, Claude Code, JetBrains, Windsurf) are intercepted and authenticated before evaluating the causal graph.

### 3.1 Redis Sliding Window Counter Algorithm
Each verification request evaluates tenant quotas using a sliding window counter backed by Redis. This avoids the abrupt "boundary burst" flaws inherent in fixed-window rate limiters.

```lua
-- KEYS[1]: tenant:quota:sliding:{tenant_id}
-- ARGV[1]: current_timestamp_ms
-- ARGV[2]: window_duration_ms (86400000 for 24 hours)
-- ARGV[3]: quota_limit (e.g., 100 or 10000)

local current_time = tonumber(ARGV[1])
local window_start = current_time - tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

-- 1. Remove expired timestamps outside the rolling window
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', window_start)

-- 2. Count active verifications within the rolling window
local current_usage = redis.call('ZCARD', KEYS[1])

if current_usage < limit then
    -- Record this verification with microsecond score
    redis.call('ZADD', KEYS[1], current_time, current_time)
    redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2]))
    return {1, limit - current_usage - 1} -- {Allowed: true, Remaining: quota - 1}
else
    return {0, 0} -- {Allowed: false, Remaining: 0}
end
```

### 3.2 HTTP 429 & MCP Protocol Backpressure Response
When a tenant exceeds their allocated quota, the CAVDAX MCP Gateway immediately returns a structured protocol response without invoking GraphBLAS linear algebra routines, preserving server resources:

```json
{
  "jsonrpc": "2.0",
  "id": "req_8f12a9c",
  "error": {
    "code": -32001,
    "message": "CAVDAX Quota Exhausted: Daily verification limit reached for tier 'free'.",
    "data": {
      "tier": "free",
      "limit": 100,
      "reset_in_seconds": 3840,
      "upgrade_url": "https://cavdax.dev/profile"
    }
  }
}
```

---

## 4. Webhook Lifecycle & Cryptographic Idempotency

Payment lifecycle events (`checkout.session.completed`, `payment_intent.succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`) originate from Stripe/RazorpayX test environments and require strict zero-trust handling.

### 4.1 Cryptographic Signature Validation
Before parsing incoming JSON request bodies, the raw binary buffer must be cryptographically verified against the configured webhook secret:

```javascript
// Express.js Webhook Middleware (Raw Body Buffer Handling)
app.post(
  '/api/billing/webhook/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Pass validated event to idempotent processor
    await processBillingEventIdempotent(event);
    res.status(200).json({ received: true });
  }
);
```

### 4.2 Idempotent Deduplication Event Store
Network retries from payment processors can deliver the same webhook event multiple times. CAVDAX enforces strict deduplication via an append-only `processed_billing_events` ledger:

```sql
CREATE TABLE IF NOT EXISTS processed_billing_events (
    event_id VARCHAR(128) PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload_hash CHAR(64) NOT NULL
);
```

**Execution Procedure:**
1. Check if `event.id` already exists in `processed_billing_events`.
2. If present, return HTTP `200 OK` immediately without re-applying quota changes.
3. If absent, begin database transaction:
   - Insert `event.id` into `processed_billing_events`.
   - Update `tenant_subscriptions` table (`tier = 'pro'`, `quota = 10000`, `expires_at = ...`).
   - Invalidate tenant cache in Redis (`DEL tenant:cache:{id}`).
   - Commit transaction.

---

## 5. Security, Secrets, and Environmental Configuration

All billing secrets and keys must strictly reside in environment variables and never be committed to repository branches:

```env
# Stripe Sandbox (Test Keys Only)
STRIPE_SECRET_KEY=sk_test_placeholder_key_not_committed
STRIPE_WEBHOOK_SECRET=whsec_placeholder_secret_not_committed
STRIPE_PRICE_ID_PRO=price_placeholder_pro_monthly

# RazorpayX Sandbox (Test Keys Only)
RAZORPAYX_KEY_ID=rzp_test_placeholder_key_id
RAZORPAYX_KEY_SECRET=rzp_test_placeholder_secret
RAZORPAYX_WEBHOOK_SECRET=whsec_razorpay_placeholder

# Local Metering Redis
REDIS_QUOTA_HOST=localhost
REDIS_QUOTA_PORT=6379
```

---

## 6. Audit Logging & Compliance Ledger

In accordance with audit trail standards, all subscription tier transitions, mock payments, and quota resets produce an audit log entry visible in the `/audit` inspection ledger:

```json
{
  "timestamp": "2026-10-23T04:45:00.000Z",
  "actor": "@developer_contributor",
  "event": "TIER_TRANSITION",
  "previous_tier": "free",
  "new_tier": "pro",
  "action_id": "act_sub_9921e",
  "mechanism": "Stripe Sandbox Checkout (Simulated Mode)",
  "audit_hash": "sha256:7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a"
}
```

This ensures complete operational visibility and governance without requiring live banking integrations.
