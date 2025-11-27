---
status: pending
priority: p1
issue_id: "080"
tags: [code-review, financial, data-integrity]
dependencies: []
---

# Server Floating-Point Arithmetic vs Client Cents-Based Calculations

## Problem Statement

The server performs financial calculations using floating-point arithmetic (dollars as decimals) while the client uses cents-based integer arithmetic. This creates a fundamental mismatch that can lead to rounding errors, calculation discrepancies, and financial data integrity issues.

## Findings

**Affected Files:**
1. `server/routes/realtime/realtime-menu-tools.ts` (lines 467-481)
2. `server/services/orders/orders.service.ts` (lines 180-193)

**Examples of Floating-Point Arithmetic:**
```typescript
// realtime-menu-tools.ts:467-481
const basePrice = Number(item.base_price) || 0;
const modifierTotal = selectedModifiers.reduce(
  (sum, mod) => sum + (Number(mod.price_adjustment) || 0),
  0
);
const itemTotal = (basePrice + modifierTotal) * quantity;

// orders.service.ts:180-193
const subtotal = items.reduce((sum, item) => {
  return sum + (item.unit_price * item.quantity);
}, 0);
```

**Problems:**
- **Precision Loss:** Floating-point cannot represent 0.1 exactly (0.1 + 0.2 = 0.30000000000000004)
- **Rounding Errors:** Multi-step calculations compound rounding errors
- **Data Mismatch:** Server calculations may not match client calculations
- **Financial Risk:** Invoice totals may not reconcile with item totals

## Proposed Solutions

### Option 1: Migrate Server to Cents (Recommended)
Convert all server-side financial calculations to use cents (integers):

```typescript
// realtime-menu-tools.ts (updated)
const basePrice = Math.round(Number(item.base_price) * 100) || 0; // cents
const modifierTotal = selectedModifiers.reduce(
  (sum, mod) => sum + (Math.round(Number(mod.price_adjustment) * 100) || 0),
  0
); // cents
const itemTotal = (basePrice + modifierTotal) * quantity; // cents

return {
  ...item,
  price_cents: itemTotal, // store in cents
  price: itemTotal / 100  // convert to dollars for display
};
```

```typescript
// orders.service.ts (updated)
const subtotalCents = items.reduce((sum, item) => {
  const unitPriceCents = Math.round(item.unit_price * 100);
  return sum + (unitPriceCents * item.quantity);
}, 0);

const subtotal = subtotalCents / 100; // convert to dollars for storage
```

### Option 2: Use Decimal.js Library
Add a decimal arithmetic library for precise calculations:

```bash
npm install decimal.js
```

```typescript
import Decimal from 'decimal.js';

const basePrice = new Decimal(item.base_price || 0);
const modifierTotal = selectedModifiers.reduce(
  (sum, mod) => sum.plus(new Decimal(mod.price_adjustment || 0)),
  new Decimal(0)
);
const itemTotal = basePrice.plus(modifierTotal).times(quantity);
```

### Option 3: Standardize on Database Decimal Type
Ensure database uses DECIMAL/NUMERIC types instead of FLOAT/DOUBLE:

```sql
ALTER TABLE menu_items
  ALTER COLUMN base_price TYPE DECIMAL(10,2);
```

## Acceptance Criteria

- [ ] All server-side financial calculations use integer cents or Decimal library
- [ ] Client and server calculations match exactly (verified by tests)
- [ ] No floating-point arithmetic used for money (enforce with linter rule)
- [ ] Database schema uses DECIMAL/NUMERIC for all price columns
- [ ] Unit tests verify calculation precision (e.g., 0.1 + 0.2 = 0.3 exactly)
- [ ] Integration tests compare client vs server totals
- [ ] Documentation updated with financial calculation standards

## Related Files

- `server/routes/realtime/realtime-menu-tools.ts` (lines 467-481)
- `server/services/orders/orders.service.ts` (lines 180-193)
- `client/src/services/cart/cart.ts` (client-side cents calculations)
- `shared/types/order.types.ts` (type definitions for prices)

## Migration Path

1. Audit all price-related fields in database
2. Add `*_cents` columns alongside existing price columns
3. Migrate calculations to use cents
4. Verify client/server parity with integration tests
5. Update API contracts to use cents
6. Remove deprecated dollar-based calculations
7. Add ESLint rule: `no-floating-point-money-math`

## Notes

**Financial calculations should NEVER use floating-point arithmetic.** This is a fundamental principle in financial software. The IEEE 754 floating-point standard cannot represent decimal numbers like 0.10 exactly, leading to cumulative rounding errors.

**Industry Standard:** Store and calculate in smallest currency unit (cents for USD), only convert to dollars for display.

**Related Issues:**
- See ADR-001 for snake_case convention (already followed)
- Consider adding ADR-014 for financial calculation standards
