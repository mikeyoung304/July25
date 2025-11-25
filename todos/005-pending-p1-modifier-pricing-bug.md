# TODO-005: Fix Modifier Pricing in Voice Orders

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 005
- **Tags**: business-logic, voice, pricing, revenue
- **Dependencies**: None
- **Created**: 2025-11-24
- **Source**: Code Review - Backend Analyst Agent

---

## Problem Statement

Voice orders do NOT charge for modifiers (extra toppings, size upgrades, etc.). The CartItem interface stores modifiers as `string[]` (names only), and the price calculation ignores them entirely.

**This is a direct revenue loss bug.**

---

## Findings

### Current Code
```typescript
// server/src/ai/functions/realtime-menu-tools.ts

// Line 136-154: CartItem interface
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];  // ❌ Only names, no prices!
}

// Line 145-149: Price calculation IGNORES modifiers
cart.subtotal = cart.items.reduce((sum, item) => {
  return sum + (item.price * item.quantity);  // ❌ No modifier pricing!
}, 0);
```

### Business Impact
Example scenario:
- Customer orders "Burger with extra cheese (+$1.50) and bacon (+$2.00)"
- System charges: $10.00 (base burger price)
- Should charge: $13.50 (base + modifiers)
- **Revenue loss: $3.50 per order**

### Comment in Code
The code has a comment acknowledging this:
```typescript
// KNOWN LIMITATION: Modifier pricing not implemented
```

---

## Proposed Solutions

### Option A: Full Modifier Pricing (Recommended)
Update CartItem to include modifier objects with prices.

**Pros**: Correct pricing, production-ready
**Cons**: Requires menu modifier price lookup
**Effort**: Medium (2-3 hours)
**Risk**: Low

### Option B: Modifier Lookup at Checkout
Keep string[] but lookup prices during checkout.

**Pros**: Less invasive
**Cons**: Delayed calculation, potential mismatch
**Effort**: Low (1-2 hours)
**Risk**: Medium

---

## Recommended Action

**Option A** - Update data model:

```typescript
// Updated CartItem interface
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

// Updated price calculation
cart.subtotal = cart.items.reduce((sum, item) => {
  const basePrice = item.price * item.quantity;
  const modifierPrice = (item.modifiers || []).reduce(
    (modSum, mod) => modSum + mod.price,
    0
  ) * item.quantity;
  return sum + basePrice + modifierPrice;
}, 0);
```

### AI Function Update
Update `add_to_cart` function to accept modifier prices:
```typescript
// In realtime-menu-tools.ts add_to_cart handler
const modifiersWithPrices = await lookupModifierPrices(
  restaurantId,
  menuItemId,
  modifierNames
);
```

---

## Technical Details

### Affected Files
- `server/src/ai/functions/realtime-menu-tools.ts:136-154`
- `server/src/ai/functions/realtime-menu-tools.ts:145-149`

### Database Query Needed
```sql
SELECT id, name, price
FROM menu_item_modifiers
WHERE menu_item_id = $1
AND name = ANY($2)
AND restaurant_id = $3;
```

---

## Acceptance Criteria

- [ ] CartItem interface includes modifier prices
- [ ] Modifier prices looked up from database
- [ ] Subtotal calculation includes modifier prices
- [ ] Tax calculation includes modifier prices
- [ ] Voice order total matches expected price
- [ ] Test: order with modifiers shows correct price

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From backend review - revenue loss bug |

---

## Resources

- [Realtime Menu Tools](server/src/ai/functions/realtime-menu-tools.ts)
- [Menu Schema](supabase/migrations/)
