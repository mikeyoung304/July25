# TODO-059: OrderGroupCard Missing React.memo - Performance Issue

## Metadata
- **Status**: complete
- **Priority**: P2 (Important)
- **Issue ID**: 059
- **Tags**: performance, kds, react, memoization, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Completed**: 2025-11-28
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

`OrderGroupCard` component is NOT memoized, while the similar `OrderCard` component IS memoized (lines 139-144). This causes unnecessary re-renders when:
- Parent state changes (focus mode, filters)
- Sibling order groups update
- WebSocket events trigger order list updates

In a busy kitchen displaying 20+ orders, this wastes significant CPU cycles.

---

## Findings

### Evidence Location

**OrderCard.tsx (lines 139-144)** - HAS memoization:
```typescript
export const OrderCard = React.memo(OrderCardComponent, (prevProps, nextProps) => {
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.status === nextProps.order.status &&
         prevProps.order.updated_at === nextProps.order.updated_at
})
```

**OrderGroupCard.tsx** - NO memoization:
```typescript
export function OrderGroupCard({
  orderGroup,
  onStatusChange,
  onNotifyCustomer,
  onFocusMode,
  variant = 'kitchen'
}: OrderGroupCardProps) {
  // Component re-renders on every parent update
}
```

### Impact
- With 20 order groups, if one updates, **all 20 re-render**
- Each re-render recalculates:
  - `getOrderUrgency()`
  - `getModifierType()` for each modifier
  - `cn()` class merging
- Estimated 15-30ms wasted per unnecessary re-render
- Cascading effect on child components

---

## Proposed Solutions

### Option A: Add React.memo with Custom Comparison (Recommended)
**Pros**: Consistent with OrderCard pattern, targeted optimization
**Cons**: Must maintain comparison function
**Effort**: Small (30 minutes)
**Risk**: Low - standard React optimization

### Option B: Use useMemo for Expensive Calculations Only
**Pros**: More granular control
**Cons**: Doesn't prevent re-renders, just computation
**Effort**: Small (30 minutes)
**Risk**: Low

---

## Recommended Action

**Option A** - Add React.memo matching OrderCard pattern:

```typescript
// At end of OrderGroupCard.tsx

// Rename existing export to internal component
function OrderGroupCardComponent({
  orderGroup,
  onStatusChange,
  onNotifyCustomer,
  onFocusMode,
  variant = 'kitchen'
}: OrderGroupCardProps) {
  // ... existing implementation
}

// Memoize with custom comparison
export const OrderGroupCard = React.memo(OrderGroupCardComponent, (prevProps, nextProps) => {
  // Only re-render if order group data meaningfully changed
  return (
    prevProps.orderGroup.order_id === nextProps.orderGroup.order_id &&
    prevProps.orderGroup.status === nextProps.orderGroup.status &&
    prevProps.orderGroup.completion_percentage === nextProps.orderGroup.completion_percentage &&
    prevProps.orderGroup.age_minutes === nextProps.orderGroup.age_minutes &&
    prevProps.variant === nextProps.variant
  )
})

OrderGroupCard.displayName = 'OrderGroupCard'
```

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/OrderGroupCard.tsx`

### Performance Improvement
- **Before**: All 20 cards re-render on any state change
- **After**: Only changed cards re-render
- **Expected improvement**: 80-90% reduction in unnecessary re-renders

### Comparison Function Logic
The comparison returns `true` (skip re-render) when:
- Same order ID (same order)
- Same status (no status change)
- Same completion percentage (no item completion)
- Same age (timer hasn't changed bucket)
- Same variant (kitchen vs expo)

---

## Acceptance Criteria

- [ ] `OrderGroupCard` wrapped in `React.memo`
- [ ] Custom comparison function checks relevant props
- [ ] `displayName` set for debugging
- [ ] React DevTools shows memoized component
- [ ] No visual changes to component behavior
- [ ] Verify re-renders reduced with React DevTools Profiler

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |
| 2025-11-28 | Verified Complete | OrderGroupCard wrapped in React.memo (lines 262-275) with comprehensive prop comparison including order_id, status, completion_percentage, age_minutes, notes, customer_phone, variant, and callbacks |

---

## Resources

- [React.memo Documentation](https://react.dev/reference/react/memo)
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback)
