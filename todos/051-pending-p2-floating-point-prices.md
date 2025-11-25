---
status: pending
priority: p2
issue_id: "051"
tags: [code-review, data-integrity, financial, voice-ordering]
dependencies: []
---

# Floating-Point Price Calculation Risk

## Problem Statement

Cart total calculations use JavaScript floating-point arithmetic which can cause cent-level discrepancies in financial calculations.

**Location:** `server/src/ai/functions/realtime-menu-tools.ts:334-348`

```typescript
function updateCartTotals(cart: Cart, taxRate: number = DEFAULT_TAX_RATE): void {
  cart.subtotal = cart.items.reduce((sum, item) => {
    const basePrice = item.price * item.quantity;  // Float multiplication
    const modifierPrice = (item.modifiers || []).reduce(
      (modSum, mod) => modSum + mod.price,  // Float addition
      0
    ) * item.quantity;
    return sum + basePrice + modifierPrice;
  }, 0);

  cart.tax = cart.subtotal * taxRate;  // Float multiplication
  cart.total = cart.subtotal + cart.tax;
}
```

**Why It Matters:**
- `0.1 + 0.2 = 0.30000000000000004` in JavaScript
- Payment comparison failures
- Audit reconciliation discrepancies

## Findings

### Example Error:
```javascript
// Scenario: 3 items at $10.99 with 8.25% tax
(10.99 * 3) + (10.99 * 3 * 0.0825) = 35.69 (expected)
// JavaScript may compute: 35.690000000000005
```

### Current Mitigation:
- `toFixed(2)` on display (lines 653-655) masks the issue
- But exact equality checks in payment processing may fail

### Cents Conversion Issue (Line 292):
```typescript
price: (matchingRule.price_adjustment || 0) / 100
// 233 cents / 100 = 2.33000000000000004 (float error)
```

## Proposed Solutions

### Solution 1: Integer Cents Throughout (Recommended)
**Pros:** Eliminates floating-point errors entirely
**Cons:** Requires refactoring interfaces
**Effort:** Medium (8 hours)
**Risk:** Low

```typescript
interface Cart {
  subtotal_cents: number;  // Integer cents
  tax_cents: number;
  total_cents: number;
}

function updateCartTotals(cart: Cart, taxRate: number): void {
  cart.subtotal_cents = cart.items.reduce((sum, item) => {
    const basePrice = Math.round(item.price_cents * item.quantity);
    const modifierPrice = item.modifiers.reduce(
      (modSum, mod) => modSum + mod.price_cents, 0
    ) * item.quantity;
    return sum + basePrice + modifierPrice;
  }, 0);

  cart.tax_cents = Math.round(cart.subtotal_cents * taxRate);
  cart.total_cents = cart.subtotal_cents + cart.tax_cents;
}
```

### Solution 2: decimal.js Library
**Pros:** Exact decimal arithmetic
**Cons:** New dependency, performance overhead
**Effort:** Low (2 hours)
**Risk:** Low

### Solution 3: Round at Each Step
**Pros:** Minimal code changes
**Cons:** May accumulate small errors
**Effort:** Low (1 hour)
**Risk:** Medium

## Recommended Action
<!-- To be filled after triage -->

## Technical Details

**Affected Files:**
- `server/src/ai/functions/realtime-menu-tools.ts`
- Cart interface definitions

## Acceptance Criteria

- [ ] All monetary values stored as integer cents internally
- [ ] Zero floating-point discrepancies in totals
- [ ] Payment comparison tests pass with exact equality
- [ ] Display values converted only at final output

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-24 | Created from code review | Current toFixed(2) masks but doesn't fix |

## Resources

- IEEE 754 floating-point specification
- https://0.30000000000000004.com/
