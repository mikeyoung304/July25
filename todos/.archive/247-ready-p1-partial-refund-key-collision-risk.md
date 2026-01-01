---
status: done
priority: p1
issue_id: "247"
tags: [code-review, security, payments, data-integrity]
dependencies: []
---

# P1: Partial Refund Idempotency Key Collision Risk

## Problem Statement

Partial refunds for the same payment generate keys based on timestamp (seconds precision) only. Two partial refunds within the same second would generate colliding keys.

**Why it matters:** If a manager issues two partial refunds in quick succession (e.g., refund $10, then another $5), the second could be silently ignored by Stripe due to idempotency collision, causing accounting discrepancies.

## Findings

**Current Key Format:**
```typescript
// Format: refund_{restaurantSuffix}_{paymentSuffix}_{timestamp}
// Example: refund_1111_abc1_1735488000
```

**Collision Scenario:**
```
T+0.000s: Refund $10 for order abc → key: refund_1111_abc1_1735488000
T+0.500s: Refund $5 for order abc  → key: refund_1111_abc1_1735488000 (COLLISION!)
```

The second refund would be ignored by Stripe because it has the same idempotency key, but the system would not report an error.

**Evidence Location:**
- `payment-idempotency.test.ts` lines 177-234 (test shows timestamp-only keys)
- `payment.service.ts` line 52-64 (`generateIdempotencyKey` function)

## Proposed Solutions

### Option A: Include Refund Amount in Key (Recommended)

```typescript
function generateIdempotencyKey(
  type: 'pay' | 'refund',
  restaurantId: string,
  entityId: string,
  amountCents?: number  // For partial refunds
): string {
  const suffix = amountCents ? `_${amountCents}` : '';
  return `${type}_${restaurantSuffix}_${entitySuffix}_${ts}${suffix}`;
}
```

**Pros:** Amount differentiates partial refunds, no random component
**Cons:** Same amount within same second still collides (rare)
**Effort:** Small
**Risk:** Low

### Option B: Use Millisecond Precision

Change from `Math.floor(Date.now() / 1000)` to `Date.now()` for millisecond precision.

**Pros:** Simple change, much lower collision risk
**Cons:** Still theoretically possible to collide
**Effort:** Trivial
**Risk:** Low

### Option C: Add Unique Nonce for Partial Refunds Only

Add a random component only for partial refunds (full refunds don't need it):

```typescript
const nonce = isPartialRefund ? `_${randomBytes(4).toString('hex')}` : '';
```

**Pros:** Eliminates collision risk entirely
**Cons:** Conflicts with #238 decision to remove nonce (was for payments, not refunds)
**Effort:** Small
**Risk:** Low

## Recommended Action

_Awaiting triage decision._

## Technical Details

**Affected Files:**
- `server/src/services/payment.service.ts` (generateIdempotencyKey function)

**Related Issues:**
- #238 (nonce removal - note: that was for payments, not refunds)

## Acceptance Criteria

- [ ] Partial refunds within same second get unique keys
- [ ] Test case added for rapid partial refund scenario
- [ ] Stripe collision cannot cause silent refund failures

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review data integrity analysis |

## Resources

- Stripe idempotency key best practices
- payment-idempotency.test.ts lines 177-234
