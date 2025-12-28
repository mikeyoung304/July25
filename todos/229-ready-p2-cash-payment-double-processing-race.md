---
status: ready
priority: p2
issue_id: "229"
tags: [security, payments, race-condition, code-review]
dependencies: []
---

# Cash Payment Missing Double-Payment Prevention

## Problem Statement
The cash payment endpoint does not check if an order is already paid before processing, unlike the card payment endpoint. Two staff members could simultaneously process cash payment for the same order.

## Findings
- **Source**: Data Integrity Guardian Review (2025-12-28)
- **Location**: `server/src/routes/payments.routes.ts` lines 370-533
- **Evidence**: No payment_status check before cash processing

```typescript
// Card endpoint has this check (line 135-149):
const orderPaymentStatus = (order as any).payment_status;
if (orderPaymentStatus === 'paid' && existingPaymentId) {
  return res.status(409).json({ error: 'Order already paid' });
}

// Cash endpoint does NOT have this check:
const order = await OrdersService.getOrder(restaurantId, order_id);
// Proceeds directly to payment without status check
```

## Proposed Solutions

### Option 1: Add payment status check (Recommended)
- **Pros**: Matches card payment behavior, prevents double-processing
- **Cons**: None
- **Effort**: Small
- **Risk**: Low

```typescript
// After getting order, before processing:
const paymentStatus = (order as any).payment_status;
if (paymentStatus === 'paid') {
  return res.status(409).json({
    success: false,
    error: 'Order already paid',
    message: 'This order has already been paid.'
  });
}
```

### Option 2: Add optimistic locking
- **Pros**: Database-level protection
- **Cons**: More complex, requires schema change
- **Effort**: Medium
- **Risk**: Medium

## Recommended Action
Option 1 - Add status check to match card payment endpoint.

## Technical Details
- **Affected Files**: `server/src/routes/payments.routes.ts`
- **Related Components**: Cash payment processing
- **Database Changes**: No

## Acceptance Criteria
- [ ] Cash payment endpoint checks payment_status before processing
- [ ] Already-paid orders return 409 Conflict
- [ ] Staff cannot process same order twice
- [ ] Existing tests pass

## Work Log

### 2025-12-28 - Identified in Code Review
**By:** Data Integrity Guardian Agent
**Actions:**
- Identified missing double-payment check
- Assessed as MEDIUM severity

### 2025-12-28 - Triaged and Approved
**By:** Claude Code Review
**Decision:** Approved for implementation
**Rationale:** Valid finding with clear solution path
## Notes
Source: Code Review of commit 35025fd6
