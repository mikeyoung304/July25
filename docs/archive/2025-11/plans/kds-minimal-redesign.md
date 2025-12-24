# feat: KDS Minimal View Mode

## Overview

Simplify the existing KDS by modifying `KitchenDisplayOptimized.tsx` and `OrderCard.tsx` to support a minimal, clean aesthetic. Color-code cards by type (drive-thru = blue, dine-in = teal) with subtle left-border urgency accents. Show items always visible, keep a minimal view toggle.

**Approach**: Modify existing files, no new components. One PR, ship fast.

## Problem Statement

The current KDS screen is cluttered:
- 3 view modes (Orders, Tables, Grid) create cognitive overload
- Cards show too much info (customer names, phone numbers, progress bars)
- No clear visual distinction between drive-thru and dine-in orders

## Solution

Modify existing components to add:
1. **Type color coding**: Blue background for drive-thru, teal for dine-in
2. **Left border urgency accent**: Subtle 4px left border (green/yellow/red) based on elapsed time
3. **Minimal card content**: Order #, table/seat (dine-in), time, items (always visible), single action button
4. **Simplified views**: Keep Orders/Tables toggle, remove Grid view

## Technical Approach

### Files to Modify (No New Files)

| File | Changes |
|------|---------|
| `client/src/components/kitchen/OrderCard.tsx` | Add type colors, left border urgency, hide customer info |
| `client/src/pages/KitchenDisplayOptimized.tsx` | Remove Grid view, simplify filters, add minimal toggle |
| `shared/config/kds.ts` | Add `getKDSDisplayType()` helper |
| `shared/utils/order-constants.ts` | Fix order type classification bug |

### Bug Fix: Order Type Classification

**Current bug** in `OrderCard.tsx`: All 'online' orders display as "Dine-In" regardless of table assignment.

```typescript
// BEFORE (buggy)
switch (order.type) {
  case 'online': return 'Dine-In'  // Wrong! Should check table_number
}

// AFTER (fixed)
function getKDSDisplayType(order: Order): 'drive-thru' | 'dine-in' {
  // Dine-in only if order has table assignment
  if (order.table_number) return 'dine-in'
  // Everything else is drive-thru (online, pickup, delivery)
  return 'drive-thru'
}
```

### Color System

**Type colors** (card background):
```typescript
const typeColors = {
  'drive-thru': 'bg-blue-50 border-blue-200',
  'dine-in': 'bg-teal-50 border-teal-200'
}
```

**Urgency accent** (subtle 4px left border):
```typescript
const urgencyAccent = {
  normal: 'border-l-4 border-l-green-400',
  warning: 'border-l-4 border-l-yellow-400',  // 10-15 min
  urgent: 'border-l-4 border-l-red-500'       // 15+ min
}
```

### Card Layout

```
┌────────────────────────────────────────┐
│ ▎ [DRIVE-THRU]           12m           │  ← Left border accent + badge + time
│ ▎                                      │
│ ▎ Order #1234                          │  ← Order number always shown
│ ▎                                      │
│ ▎ 2x Burger                            │  ← Items always visible
│ ▎ 1x Fries                             │
│ ▎ 1x Drink                             │
│ ▎                                      │
│ ▎ [       Mark Ready       ]           │  ← Single action button
└────────────────────────────────────────┘

For dine-in (shows both table AND order #):
┌────────────────────────────────────────┐
│ ▎ [DINE-IN]               8m           │
│ ▎                                      │
│ ▎ Table 5, Seat 2                      │  ← Table/seat prominent
│ ▎ Order #1234                          │  ← Order # also shown
│ ▎                                      │
│ ▎ 1x Salad                             │
│ ▎ 1x Steak                             │
│ ▎                                      │
│ ▎ [       Mark Ready       ]           │
└────────────────────────────────────────┘
```

## Implementation Tasks

### Task 1: Fix Order Type Classification Bug
**File**: `shared/config/kds.ts`

- [ ] Add `getKDSDisplayType(order: Order)` function
- [ ] Returns 'dine-in' if `order.table_number` exists, otherwise 'drive-thru'
- [ ] Export for use in OrderCard

### Task 2: Update OrderCard with Type Colors & Urgency Accent
**File**: `client/src/components/kitchen/OrderCard.tsx`

- [ ] Import `getKDSDisplayType` from shared config
- [ ] Add type-based background color (blue-50 or teal-50)
- [ ] Add subtle left border urgency accent (green/yellow/red)
- [ ] Hide customer name and phone number
- [ ] Show table/seat prominently for dine-in orders
- [ ] Show order number for all orders (including dine-in)
- [ ] Keep items always visible (no collapse)
- [ ] Memoize component with `React.memo`

### Task 3: Simplify KitchenDisplayOptimized
**File**: `client/src/pages/KitchenDisplayOptimized.tsx`

- [ ] Remove Grid view option (keep Orders + Tables toggle only)
- [ ] Hide stats panel by default
- [ ] Simplify filters to Active | Ready
- [ ] Remove customer info display from header/filters
- [ ] Keep connection status bar (already exists)

### Task 4: Update Order Type Display in OrderGroupCard
**File**: `client/src/components/kitchen/OrderGroupCard.tsx`

- [ ] Use same `getKDSDisplayType` function for consistency
- [ ] Apply matching type colors and urgency accent

## Acceptance Criteria

### Functional
- [ ] Drive-thru orders have blue background (`bg-blue-50`)
- [ ] Dine-in orders (with table) have teal background (`bg-teal-50`)
- [ ] Left border accent shows urgency: green (0-10min), yellow (10-15min), red (15+min)
- [ ] Dine-in shows: "Table 5, Seat 2" + "Order #1234"
- [ ] Items always visible on card (no expand/collapse)
- [ ] Orders/Tables toggle works, Grid view removed
- [ ] Customer name/phone hidden from cards
- [ ] Mark Ready button works

### Non-Functional
- [ ] No performance regression with 50+ orders
- [ ] Touch targets remain 44px+ minimum
- [ ] Existing E2E tests pass

## Testing

- [ ] Update existing KDS E2E test to verify mark-ready workflow
- [ ] Verify type color classification with table vs no-table orders
- [ ] Test urgency accent transitions (manually verify colors at 10min, 15min marks)

## References

### Internal
- Current KDS: `client/src/pages/KitchenDisplayOptimized.tsx`
- Order card: `client/src/components/kitchen/OrderCard.tsx`
- KDS config: `shared/config/kds.ts`
- Order types: `shared/types/order.types.ts`

### Existing Patterns
- Urgency thresholds: `KDS_THRESHOLDS` in `shared/config/kds.ts`
- Type mapping: `shared/utils/order-constants.ts`

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
