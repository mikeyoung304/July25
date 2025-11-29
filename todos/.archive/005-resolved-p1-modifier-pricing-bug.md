# TODO-005: Fix Modifier Pricing in Voice Orders

## Metadata
- **Status**: resolved
- **Priority**: P1 (Critical)
- **Issue ID**: 005
- **Tags**: business-logic, voice, pricing, revenue
- **Dependencies**: None
- **Created**: 2025-11-24
- **Resolved**: 2025-11-28
- **Source**: Code Review - Backend Analyst Agent

---

## Problem Statement

Voice orders do NOT charge for modifiers (extra toppings, size upgrades, etc.). The CartItem interface stores modifiers as `string[]` (names only), and the price calculation ignores them entirely.

**This is a direct revenue loss bug.**

## Resolution

**VERIFIED: This issue has already been fixed.** The current implementation correctly handles modifier pricing.

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

- [x] CartItem interface includes modifier prices
- [x] Modifier prices looked up from database
- [x] Subtotal calculation includes modifier prices
- [x] Tax calculation includes modifier prices
- [x] Voice order total matches expected price
- [x] Test: order with modifiers shows correct price

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-24 | Created | From backend review - revenue loss bug |
| 2025-11-28 | Verified | Code already implements full modifier pricing solution |

## Implementation Details

The fix was already implemented with the following components:

### 1. CartModifier Interface (lines 25-28)
```typescript
export interface CartModifier {
  name: string;
  price: number; // Price adjustment (can be negative)
}
```

### 2. Updated CartItem Interface (lines 30-38)
```typescript
export interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers?: CartModifier[];  // ✅ Full objects with prices
  notes?: string;
}
```

### 3. Modifier Price Lookup (lines 222-344)
The `lookupModifierPrices()` function:
- Queries `voice_modifier_rules` table
- Matches modifier names against trigger phrases
- Returns CartModifier[] with prices in cents
- Includes validation and caching
- Graceful degradation if database fails (price: 0)

### 4. Price Calculation (lines 476-488)
Uses cents-based arithmetic to avoid floating-point errors:
```typescript
const subtotalCents = cart.items.reduce((sumCents, item) => {
  const itemPriceCents = Math.round(item.price * 100);
  const modifierPriceCents = Math.round(
    (item.modifiers || []).reduce((modSum, mod) => {
      const modPrice = sanitizePrice(mod.price);
      return modSum + modPrice;
    }, 0) * 100
  );
  const itemTotalCents = (itemPriceCents + modifierPriceCents) * item.quantity;
  return sumCents + itemTotalCents;
}, 0);
```

### 5. Add to Cart Integration (lines 801-825)
```typescript
// Look up modifier prices from database
const modifiersWithPrices = await lookupModifierPrices(
  context.restaurantId,
  _args.modifiers || [],
  _args.id
);

// Add new item with modifier prices
const newItem: CartItem = {
  id: `${Date.now()}_${Math.random()}`,
  menu_item_id: _args.id,
  name: menuItem.name,
  quantity: quantity,
  price: menuItem.price,
  modifiers: modifiersWithPrices  // ✅ Prices included
};
```

### Additional Features Implemented
- **Input validation**: Modifier names sanitized (max 100 chars, whitelist pattern)
- **DoS protection**: Max 20 modifiers per item
- **Caching**: 5-minute TTL for modifier rules
- **Error handling**: Graceful fallback to $0 if database fails
- **Cents arithmetic**: Prevents floating-point rounding errors (TODO-051/P1-080)
- **NaN/Infinity validation**: Sanitizes prices before calculation (TODO-082)

---

## Resources

- [Realtime Menu Tools](server/src/ai/functions/realtime-menu-tools.ts)
- [Menu Schema](supabase/migrations/)
