/**
 * CAVDAX Multi-Agent Decision Concurrency Lock Manager
 *
 * Prevents race conditions and conflicting mutations when multiple autonomous
 * coding agents (e.g., dual Devin, Claude Code, or Cursor instances) operate
 * on the same architecture decision branches simultaneously.
 */

export class DecisionLockManager {
  constructor() {
    this.locks = new Map(); // decision_id -> { agentId, acquiredAt, expiresAt, reason }
  }

  /**
   * Acquires a timed lease lock on an architectural decision.
   *
   * @param {string} decisionId - The ID of the decision being locked (e.g., DEC-102, DEC-103)
   * @param {string} agentId - Unique identifier of the requesting agent (e.g., devin-run-41, claude-code-subagent)
   * @param {number} [ttlMs=60000] - Lock duration in milliseconds (default: 60s)
   * @param {string} [reason=''] - Rationale for locking this decision branch
   * @returns {object} Status object indicating acquired (true/false)
   */
  acquireLock(decisionId, agentId, ttlMs = 60000, reason = '', tier = 'free') {
    const now = Date.now();
    const existing = this.locks.get(decisionId);

    // Active lock held by a different agent
    if (existing && existing.expiresAt > now && existing.agentId !== agentId) {
      const remainingMs = existing.expiresAt - now;
      return {
        acquired: false,
        gate_verdict: 'BLOCKED_CONCURRENT_AGENT_LOCK',
        decision_id: decisionId,
        locked_by: existing.agentId,
        expires_in_ms: remainingMs,
        reason: existing.reason || 'Active agent transaction in progress',
        message: `⛔ CONCURRENCY REFUSAL: Decision '${decisionId}' is actively locked by agent '${existing.agentId}' (${Math.ceil(remainingMs / 1000)}s remaining). Concurrent mutation blocked to prevent DAG divergence.`
      };
    }

    // Enforce tier concurrency limits if not renewing own lock
    if (!existing || existing.expiresAt <= now) {
      const normalizedTier = String(tier || 'free').toLowerCase();
      const maxLocks = normalizedTier === 'free' ? 1 : (normalizedTier === 'pro' ? 3 : -1);
      if (maxLocks !== -1) {
        let activeCount = 0;
        for (const [id, lock] of this.locks.entries()) {
          if (id !== decisionId && lock.agentId === agentId && lock.expiresAt > now) {
            activeCount++;
          }
        }
        if (activeCount >= maxLocks) {
          return {
            acquired: false,
            gate_verdict: 'BLOCKED_TIER_CONCURRENCY_LIMIT_EXCEEDED',
            code: 'TIER_CONCURRENCY_LIMIT_EXCEEDED',
            decision_id: decisionId,
            message: `⛔ CONCURRENCY QUOTA EXCEEDED: ${normalizedTier === 'free' ? 'Community' : 'Pro'} tier allows up to ${maxLocks} concurrent decision lease(s). Upgrade plan to acquire additional parallel agent locks.`
          };
        }
      }
    }

    const expiresAt = now + Math.min(Math.max(ttlMs, 5000), 300000); // Bounds: 5s to 5min
    this.locks.set(decisionId, {
      agentId,
      acquiredAt: now,
      expiresAt,
      reason: reason || 'Architectural modification lease'
    });

    return {
      acquired: true,
      decision_id: decisionId,
      agent_id: agentId,
      expires_at: new Date(expiresAt).toISOString(),
      ttl_ms: expiresAt - now,
      message: `✅ LOCK ACQUIRED: Agent '${agentId}' holds exclusive mutation lease on '${decisionId}' for ${Math.round((expiresAt - now) / 1000)}s.`
    };
  }

  /**
   * Releases an existing lock held by the designated agent.
   */
  releaseLock(decisionId, agentId) {
    const existing = this.locks.get(decisionId);
    if (!existing) {
      return {
        released: true,
        decision_id: decisionId,
        message: `Notice: Decision '${decisionId}' was not locked.`
      };
    }

    if (existing.agentId !== agentId && existing.expiresAt > Date.now()) {
      return {
        released: false,
        decision_id: decisionId,
        locked_by: existing.agentId,
        message: `Cannot release: Lock on '${decisionId}' is held by agent '${existing.agentId}', not '${agentId}'.`
      };
    }

    this.locks.delete(decisionId);
    return {
      released: true,
      decision_id: decisionId,
      message: `✅ LOCK RELEASED: Decision '${decisionId}' is now available for other agents.`
    };
  }

  /**
   * Checks whether a decision is currently locked by a foreign agent.
   */
  checkLock(decisionId, agentId = null) {
    const now = Date.now();
    const existing = this.locks.get(decisionId);

    if (existing && existing.expiresAt > now) {
      const isForeign = agentId ? existing.agentId !== agentId : true;
      return {
        locked: true,
        is_foreign: isForeign,
        locked_by: existing.agentId,
        expires_in_ms: existing.expiresAt - now,
        reason: existing.reason
      };
    }

    if (existing && existing.expiresAt <= now) {
      this.locks.delete(decisionId); // Lazy purge of expired lock
    }

    return { locked: false };
  }

  /**
   * Returns a snapshot of all active locks for observability & audit inspection.
   */
  listActiveLocks() {
    const now = Date.now();
    const active = [];
    for (const [decisionId, lock] of this.locks.entries()) {
      if (lock.expiresAt > now) {
        active.push({
          decision_id: decisionId,
          agent_id: lock.agentId,
          remaining_ms: lock.expiresAt - now,
          expires_at: new Date(lock.expiresAt).toISOString(),
          reason: lock.reason
        });
      } else {
        this.locks.delete(decisionId);
      }
    }
    return active;
  }
}

export const globalLockManager = new DecisionLockManager();
