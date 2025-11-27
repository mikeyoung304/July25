# TODO-060: KDS Card Size Calculation in Render Loop - Performance Issue

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 060
- **Tags**: performance, kds, react, optimization, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

The `KitchenDisplayOptimized.tsx` component calculates card size for every order group **inside the render loop** on every render. This includes expensive nested `reduce()` operations that iterate through all orders and items.

For a busy kitchen with 20 order groups, each with 3 orders and 5 items per order, this executes **300+ array iterations** per render cycle.

---

## Findings

### Evidence Location

**KitchenDisplayOptimized.tsx (lines 264-271)**:
```typescript
{sortedOrderGroups.map(orderGroup => {
  // Calculate total modifiers across all orders in the group - EVERY RENDER
  const totalMods = orderGroup.orders.reduce((sum, order) =>
    sum + order.items.reduce((itemSum, item) =>
      itemSum + (item.modifiers?.length || 0), 0), 0)
  const totalItems = orderGroup.orders.reduce((sum, order) =>
    sum + order.items.length, 0)
  const cardSize = getCardSize(totalItems, totalMods)
  // ...
})}
```

### Impact
- **Nested reduce operations** on every render
- Recalculated even when order data hasn't changed
- Blocks main thread during rendering
- Causes jank when scrolling or filtering orders

### Calculation Complexity
For 20 orders with 3 items each:
- `totalMods` reduce: 20 × 3 = 60 iterations
- `totalItems` reduce: 20 iterations
- Total: 80 iterations per render
- With modifiers: potentially 200+ iterations

---

## Proposed Solutions

### Option A: Pre-calculate in useOrderGrouping Hook (Recommended)
**Pros**: Single calculation when data changes, stored in OrderGroup
**Cons**: Requires hook modification
**Effort**: Medium (2-3 hours)
**Risk**: Low - calculation moves to data layer

### Option B: Memoize with useMemo in Component
**Pros**: No hook changes needed
**Cons**: Still in render phase, more memory
**Effort**: Small (1 hour)
**Risk**: Low

### Option C: Calculate in Server Response
**Pros**: Zero client-side calculation
**Cons**: API change, server load increase
**Effort**: High (4+ hours)
**Risk**: Medium - API change

---

## Recommended Action

**Option A** - Pre-calculate in `useOrderGrouping` hook:

1. **Add fields to OrderGroup interface** (`client/src/hooks/useOrderGrouping.ts`):
```typescript
export interface OrderGroup {
  // ... existing fields
  total_items: number
  total_modifiers: number
  card_size: CardSize  // Add import from @rebuild/shared/config/kds
}
```

2. **Calculate during grouping** (in `useOrderGrouping`):
```typescript
import { getCardSize, type CardSize } from '@rebuild/shared/config/kds'

// Inside the grouping logic, after creating orderGroup:
const totalItems = orderGroup.orders.reduce((sum, order) =>
  sum + order.items.length, 0)
const totalModifiers = orderGroup.orders.reduce((sum, order) =>
  sum + order.items.reduce((itemSum, item) =>
    itemSum + (item.modifiers?.length || 0), 0), 0)

orderGroup.total_items = totalItems
orderGroup.total_modifiers = totalModifiers
orderGroup.card_size = getCardSize(totalItems, totalModifiers)
```

3. **Simplify KitchenDisplayOptimized.tsx**:
```typescript
{sortedOrderGroups.map(orderGroup => (
  <div key={orderGroup.order_id} className={CARD_SIZE_CLASSES[orderGroup.card_size]}>
    <OrderGroupCard
      orderGroup={orderGroup}
      onStatusChange={handleStatusChange}
      onFocusMode={handleFocusMode}
      variant="kitchen"
    />
  </div>
))}
```

---

## Technical Details

### Affected Files
- `client/src/hooks/useOrderGrouping.ts` - Add calculation during grouping
- `client/src/pages/KitchenDisplayOptimized.tsx` - Remove inline calculation

### Performance Improvement
- **Before**: 80-200 iterations per render
- **After**: 0 iterations per render (pre-calculated)
- **Calculation timing**: Once when order data changes (via useMemo in hook)

### Memory Trade-off
- Adds 3 fields to each OrderGroup object (~24 bytes)
- For 20 orders: ~480 bytes (negligible)

---

## Acceptance Criteria

- [ ] `OrderGroup` interface extended with `total_items`, `total_modifiers`, `card_size`
- [ ] `useOrderGrouping` calculates values during grouping
- [ ] `KitchenDisplayOptimized` uses pre-calculated `card_size`
- [ ] No inline reduce calculations in render
- [ ] Visual layout unchanged
- [ ] React Profiler shows reduced render time

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |

---

## Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit#optimizing-performance)
- [Expensive Calculations in Render](https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render)
