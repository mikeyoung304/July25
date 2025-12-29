---
status: deferred
priority: p2
issue_id: "240"
tags: [code-review, data-integrity, payments, race-condition]
dependencies: []
deferred_reason: "Theoretical race condition - reviewers agreed this is over-engineered for edge case. Stripe has safeguards. Revisit if evidence of actual duplicates in production."
---

# P2: Double Payment Race Condition

## Problem Statement

The double-payment prevention check uses a read-then-check pattern without database-level locking. Two concurrent requests could both pass the "not paid" check and proceed to create payment intents.

**Why it matters:** While Stripe's idempotency keys prevent duplicate charges for the exact same request, two different payment intents could be created for the same order, potentially leading to double charges if both are completed.

## Findings

**Location:** `server/src/routes/payments.routes.ts:133-149` and `396-409`

**Evidence:**
```typescript
// Lines 135-149 in create-payment-intent
const orderPaymentStatus = (order as any).payment_status;
const existingPaymentId = (order as any).payment_id;
if (orderPaymentStatus === 'paid' && existingPaymentId) {
  return res.status(409).json({ error: 'Order already paid' });
}
// ... race window here ...
// ... then creates payment intent
```

**Risk Window:** Between reading `payment_status` and creating the payment intent, another request could:
1. Also read `payment_status` as 'unpaid'
2. Create its own payment intent
3. Complete payment before the first request

## Proposed Solutions

### Option A: Use SELECT FOR UPDATE (Database Lock)
**Pros:** Guaranteed atomicity, standard pattern
**Cons:** Requires raw SQL or Prisma transaction, holds lock
**Effort:** Medium
**Risk:** Low

### Option B: Optimistic Locking with Version Column
**Pros:** No lock contention, uses existing `version` column
**Cons:** Requires retry logic on conflict
**Effort:** Medium
**Risk:** Low

### Option C: Redis Distributed Lock
**Pros:** Works across multiple instances
**Cons:** Adds Redis dependency, more complex
**Effort:** Large
**Risk:** Medium

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/routes/payments.routes.ts`
- `server/src/services/orders.service.ts`

**Components:** Payment routes, Order service

## Acceptance Criteria

- [ ] Concurrent payment attempts for same order result in only one success
- [ ] Second request receives 409 Conflict, not a duplicate payment intent
- [ ] Test: Simulate concurrent payments, verify only one succeeds

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during data integrity review | Read-then-check has race window |

## Resources

- PostgreSQL SELECT FOR UPDATE docs
- Optimistic vs Pessimistic locking patterns
