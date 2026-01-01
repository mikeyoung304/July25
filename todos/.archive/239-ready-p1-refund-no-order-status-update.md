---
status: done
priority: p1
issue_id: "239"
tags: [code-review, data-integrity, payments]
dependencies: []
---

# P1: Refund Doesn't Update Order Payment Status

## Problem Statement

When a refund is processed, the order's `payment_status` remains as `paid` instead of being updated to `refunded`. This creates data inconsistency between Stripe and the local database.

**Why it matters:**
- Staff see orders as "paid" when they're actually refunded
- Financial reporting is incorrect
- Reconciliation between Stripe and database fails

## Findings

**Location:** `server/src/routes/payments.routes.ts:612-737`

**Evidence:** After successful refund:
```typescript
// Logs refund to audit trail
await PaymentService.logPaymentAttempt({ ... status: 'refunded' ... });

// Missing: OrdersService.updateOrderPayment(restaurantId, orderId, 'refunded', ...)
```

The refund endpoint:
1. ✅ Validates and creates refund with Stripe
2. ✅ Logs the refund to audit trail
3. ❌ Does NOT update order's payment_status

## Proposed Solutions

### Option A: Add order status update after refund (Recommended)
**Pros:** Simple, consistent with other payment flows
**Cons:** Need to extract order_id from payment metadata
**Effort:** Small
**Risk:** Low

```typescript
// After successful refund:
const orderId = paymentIntent.metadata?.['order_id'];
if (orderId) {
  await OrdersService.updateOrderPayment(
    req.restaurantId!,
    orderId,
    'refunded',
    'card',
    paymentId
  );
}
```

### Option B: Handle in webhook instead
**Pros:** Works even if API call times out
**Cons:** Adds delay, requires refund webhook handler
**Effort:** Medium
**Risk:** Medium

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/routes/payments.routes.ts` (refund endpoint)

**Components:** Payment routes, Order service

**Database Changes:** None (uses existing payment_status column)

## Acceptance Criteria

- [ ] After full refund, order.payment_status = 'refunded'
- [ ] After partial refund, order.payment_status = 'partially_refunded' (or stays 'paid')
- [ ] Refund metadata includes order_id for correlation
- [ ] Test: Refund endpoint updates order status correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during data integrity review | Order status not updated on refund |

## Resources

- Related: Refund idempotency key (#001)
