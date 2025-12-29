---
status: done
priority: p2
issue_id: "241"
tags: [code-review, security, multi-tenant]
dependencies: []
---

# P2: Refund Endpoint Missing Tenant Validation

## Problem Statement

The refund endpoint validates restaurant access via middleware but doesn't verify that the payment being refunded actually belongs to the authenticated restaurant. An attacker who knows a valid `paymentId` from another restaurant could potentially issue a refund.

**Why it matters:** Multi-tenant isolation is critical. A malicious user in Restaurant A could refund payments from Restaurant B if they obtain a payment ID.

## Findings

**Location:** `server/src/routes/payments.routes.ts:612-737`

**Evidence:**
```typescript
// Payment is retrieved directly from Stripe
const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);

// Missing validation:
// if (paymentIntent.metadata?.restaurant_id !== req.restaurantId) {
//   throw Unauthorized('Payment does not belong to this restaurant');
// }
```

The `validateRefundRequest` receives `restaurantId` but only uses it for idempotency key generation, not for ownership verification.

## Proposed Solutions

### Option A: Validate Stripe metadata (Recommended)
**Pros:** Simple, uses existing data
**Cons:** Relies on metadata being set correctly on payment creation
**Effort:** Small
**Risk:** Low

```typescript
if (paymentIntent.metadata?.restaurant_id !== req.restaurantId) {
  throw Unauthorized('Payment does not belong to this restaurant');
}
```

### Option B: Look up payment in local database first
**Pros:** More reliable, doesn't depend on Stripe metadata
**Cons:** Adds database query
**Effort:** Small
**Risk:** Low

## Recommended Action
<!-- Filled during triage -->

## Technical Details

**Affected Files:**
- `server/src/routes/payments.routes.ts` (refund endpoint)

**Components:** Payment routes

## Acceptance Criteria

- [ ] Refund fails with 401/403 if payment belongs to different restaurant
- [ ] Test: Attempt refund of payment from Restaurant B while authenticated as Restaurant A
- [ ] Audit log captures cross-tenant refund attempts

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-29 | Identified during security review | Missing tenant ownership check |

## Resources

- ADR-002: Multi-tenancy architecture
