---
status: done
priority: p3
issue_id: "254"
tags: [code-review, data-integrity, testing]
dependencies: []
---

# P3: Missing Overflow Test for Large Quantities

## Problem Statement

While large totals are tested, there's no test for integer overflow when calculating `amount` in cents for extreme quantities.

**Why it matters:**
```typescript
// Price: $999.99 x quantity: 1,000,000 = $999,990,000.00
// In cents: 99,999,000,000 (exceeds JavaScript safe integer precision: 9,007,199,254,740,991)
```

Catering orders with bulk quantities could theoretically cause precision loss, resulting in incorrect charges.

## Findings

**Location:** `payment-calculation.test.ts` tests large totals (lines 489-524) but not overflow scenarios.

**JavaScript Safe Integer Limit:** `Number.MAX_SAFE_INTEGER = 9,007,199,254,740,991`
**Max safe total in cents:** ~$90 trillion (unlikely in practice)

**Realistic edge case:** A catering order for 10,000 items at $100 each = $1,000,000 = 100,000,000 cents (safe)

## Proposed Solutions

### Option A: Add Boundary Test (Recommended)

```typescript
it('should handle maximum safe order total', async () => {
  const maxSafeItems = {
    id: 'item-1',
    name: 'Bulk Item',
    price: 10000.00, // $10,000 per item
    quantity: 1000,  // 1000 items = $10,000,000
    modifiers: []
  };

  // Should calculate without precision loss
  const result = await PaymentService.calculateOrderTotal(restaurantId, mockOrder);
  expect(Number.isSafeInteger(result.amountCents)).toBe(true);
});
```

**Pros:** Documents safe limits, catches future issues
**Cons:** Edge case unlikely in practice
**Effort:** Trivial
**Risk:** None

### Option B: Add Explicit Overflow Check in Implementation

```typescript
const amountCents = Math.round(total * 100);
if (!Number.isSafeInteger(amountCents)) {
  throw new Error('Order total exceeds safe calculation limit');
}
```

**Pros:** Fails fast on impossible amounts
**Cons:** Additional runtime check
**Effort:** Trivial
**Risk:** None

## Recommended Action

_Awaiting triage decision. This is defensive - the limit is ~$90 trillion._

## Technical Details

**Affected Files:**
- `server/tests/services/payment-calculation.test.ts`
- `server/src/services/payment.service.ts` (if adding runtime check)

## Acceptance Criteria

- [ ] Test documents safe calculation limits
- [ ] No precision loss for realistic order sizes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review data integrity analysis |

## Resources

- Number.MAX_SAFE_INTEGER documentation
- payment-calculation.test.ts
