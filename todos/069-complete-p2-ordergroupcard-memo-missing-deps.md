# TODO-069: OrderGroupCard React.memo Missing Key Dependencies

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 069
- **Tags**: performance, react, kds, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Performance Oracle

---

## Problem Statement

The `OrderGroupCard` memo comparison function is missing several key dependencies, which could cause the component to not re-render when it should.

---

## Findings

### Evidence Location

**client/src/components/kitchen/OrderGroupCard.tsx (lines 255-263)**:
```typescript
export const OrderGroupCard = memo(OrderGroupCardComponent, (prev, next) => {
  return (
    prev.orderGroup.order_id === next.orderGroup.order_id &&
    prev.orderGroup.status === next.orderGroup.status &&
    prev.orderGroup.completion_percentage === next.orderGroup.completion_percentage &&
    prev.orderGroup.age_minutes === next.orderGroup.age_minutes &&
    prev.variant === next.variant
  )
})
```

### Missing Comparisons
- `onStatusChange` callback reference
- `onNotifyCustomer` callback reference
- `onFocusMode` callback reference
- `orderGroup.notes` changes
- `orderGroup.customer_phone` changes (affects notify button visibility)

### Impact
- Component won't re-render if callbacks change
- Notes changes won't display
- Phone number changes won't update notify button visibility

---

## Proposed Solutions

### Option A: Add missing dependencies (RECOMMENDED)
**Pros:** Correct behavior
**Cons:** More comparisons
**Effort:** Small (10 minutes)
**Risk:** Low

```typescript
export const OrderGroupCard = memo(OrderGroupCardComponent, (prev, next) => {
  return (
    prev.orderGroup.order_id === next.orderGroup.order_id &&
    prev.orderGroup.status === next.orderGroup.status &&
    prev.orderGroup.completion_percentage === next.orderGroup.completion_percentage &&
    prev.orderGroup.age_minutes === next.orderGroup.age_minutes &&
    prev.orderGroup.notes === next.orderGroup.notes &&
    prev.orderGroup.customer_phone === next.orderGroup.customer_phone &&
    prev.variant === next.variant &&
    prev.onStatusChange === next.onStatusChange &&
    prev.onNotifyCustomer === next.onNotifyCustomer &&
    prev.onFocusMode === next.onFocusMode
  )
})
```

### Option B: Remove custom comparator (use shallow compare)
**Pros:** Simpler, React handles it
**Cons:** May cause more re-renders
**Effort:** Small
**Risk:** Low

---

## Recommended Action

Option A - Add missing dependencies

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/OrderGroupCard.tsx`

---

## Acceptance Criteria

- [ ] All used props included in memo comparison
- [ ] Component re-renders when notes change
- [ ] Component re-renders when callbacks change
- [ ] No visual regressions

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review performance findings |
