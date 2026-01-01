---
status: done
priority: p2
issue_id: "252"
tags: [code-review, security, multi-tenant]
dependencies: ["246"]
---

# P2: Missing restaurant_id Validation in Refund Hook

## Problem Statement

The refund hook in `orderStateMachine.ts` does not explicitly validate `restaurant_id` before processing a refund.

**Why it matters:** While the order object should already be tenant-scoped from the database query, an explicit check provides defense-in-depth for this critical financial operation.

## Findings

**Location:** `orderStateMachine.ts` lines 529-565

```typescript
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  // No restaurant_id validation
  if (order.payment_status !== 'paid') { ... }
  // Proceeds to refund without tenant isolation check
});
```

The hook receives an order object but doesn't verify the tenant context before initiating a Stripe refund.

## Proposed Solutions

### Option A: Add Explicit Validation (Recommended)

```typescript
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  // Defense-in-depth: verify tenant context
  if (!order.restaurant_id) {
    logger.error('Refund hook: Missing restaurant_id', { orderId: order.id });
    return;
  }

  if (order.payment_status !== 'paid') { ... }
});
```

**Pros:** Defense-in-depth, explicit security check, good logging
**Cons:** Should never trigger in practice (overhead is negligible)
**Effort:** Trivial
**Risk:** None

### Option B: Add Type Assertion

Use TypeScript to ensure restaurant_id is required:

```typescript
type ValidatableOrder = Order & Required<Pick<Order, 'restaurant_id'>>;

OrderStateMachine.registerHook('*->cancelled', async (_transition, order: ValidatableOrder) => {
  // TypeScript ensures restaurant_id exists
});
```

**Pros:** Compile-time safety
**Cons:** Doesn't prevent runtime issues from malformed data
**Effort:** Trivial
**Risk:** None

## Recommended Action

_Awaiting triage decision. Consider implementing along with #246 (idempotency key fix)._

## Technical Details

**Affected Files:**
- `server/src/services/orderStateMachine.ts` (lines 529-565)

**Related Issues:**
- #246 (inconsistent refund idempotency keys) - same code section
- ADR-002 (multi-tenant architecture)

## Acceptance Criteria

- [ ] Refund hook validates restaurant_id before processing
- [ ] Missing restaurant_id is logged as error
- [ ] Refund is aborted if validation fails

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review security analysis |

## Resources

- ADR-002: Multi-tenancy architecture
- CLAUDE.md multi-tenant patterns section
