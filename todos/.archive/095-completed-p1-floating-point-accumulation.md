---
status: complete
priority: p1
issue_id: "095"
tags: [code-review, data-integrity, money, pr-148]
dependencies: []
---

# Floating Point Accumulation Error in Order Totals

## Problem Statement

Direct accumulation of floating-point `subtotal` and `tax` values without rounding can cause precision drift when multiple orders are aggregated. This can lead to payment validation failures when client and server calculations differ by fractions of a cent.

**Why it matters:** Financial calculations require precise handling. Floating-point errors can compound with each order, potentially exceeding the 1-cent tolerance in payment validation.

## Findings

### Data Integrity Guardian
- **File:** `client/src/pages/ServerView.tsx:141-147`
- **Evidence:**
```typescript
// ❌ FLOATING POINT ACCUMULATION - NO ROUNDING
const subtotal = ordersResponse.reduce((sum: number, order: any) => {
  return sum + (order.subtotal || 0)  // Direct float addition
}, 0)

const tax = ordersResponse.reduce((sum: number, order: any) => {
  return sum + (order.tax || 0)  // Direct float addition
}, 0)
```

### Performance Oracle
- **Additional Issue:** Two separate reduce operations when one would suffice (O(2n) instead of O(n))

### Example Scenario
```javascript
// Three orders on a table
Order 1: subtotal = 10.33, tax = 0.85
Order 2: subtotal = 10.33, tax = 0.85
Order 3: subtotal = 10.34, tax = 0.85

// Client calculation (no rounding):
subtotal = 10.33 + 10.33 + 10.34 = 31.000000000000004
tax = 0.85 + 0.85 + 0.85 = 2.5500000000000003
total = 33.550000000000004

// Server recalculation: total = 33.55
// Result: Payment validation could FAIL due to precision difference
```

## Proposed Solutions

### Option A: Round After Accumulation (Recommended)
**Pros:** Simple, minimal code change
**Cons:** Still accumulates errors internally
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
const { subtotal, tax } = ordersResponse.reduce(
  (acc, order) => ({
    subtotal: acc.subtotal + (order.subtotal || 0),
    tax: acc.tax + (order.tax || 0)
  }),
  { subtotal: 0, tax: 0 }
);

// Round to 2 decimals after accumulation
const roundedSubtotal = Math.round(subtotal * 100) / 100;
const roundedTax = Math.round(tax * 100) / 100;
```

### Option B: Use Integer Cent Arithmetic
**Pros:** No floating-point errors at all
**Cons:** Requires conversion back to dollars for display
**Effort:** Medium
**Risk:** Low

```typescript
const { subtotalCents, taxCents } = ordersResponse.reduce(
  (acc, order) => ({
    subtotalCents: acc.subtotalCents + Math.round((order.subtotal || 0) * 100),
    taxCents: acc.taxCents + Math.round((order.tax || 0) * 100)
  }),
  { subtotalCents: 0, taxCents: 0 }
);

const subtotal = subtotalCents / 100;
const tax = taxCents / 100;
```

### Option C: Use decimal.js Library
**Pros:** Industry standard for financial calculations
**Cons:** Additional dependency, overkill for MVP
**Effort:** Medium
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx:141-147`
- **Components:** ServerView, handleCloseTable callback
- **Database Changes:** None

## Acceptance Criteria

- [ ] Order totals are rounded to 2 decimal places
- [ ] Single reduce operation (performance improvement)
- [ ] Payment validation passes with multiple orders
- [ ] Tests verify calculation accuracy

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **IEEE 754:** Floating-point arithmetic standard
- **Similar Pattern:** `payment.service.ts:149` uses `Math.round(total * 100)`
