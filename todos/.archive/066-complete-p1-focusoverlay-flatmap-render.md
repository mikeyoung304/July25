# TODO-066: FocusOverlay Creates New Array on Every Render

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 066
- **Tags**: performance, kds, react, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Performance Oracle

---

## Problem Statement

The `FocusOverlay` component calls `flatMap` on every render to build the items array, creating a new array reference each time. This breaks referential equality and can trigger unnecessary re-renders in child components.

For order groups with multiple orders, this is O(n*m) complexity executed on every render cycle.

---

## Findings

### Evidence Location

**client/src/components/kitchen/FocusOverlay.tsx (line 32)**:
```typescript
const items = displayOrder?.items ?? displayGroup?.orders.flatMap(o => o.items) ?? []
```

### Impact
- Creates new array on every render
- Child components receiving `items` as prop will re-render
- Performance degradation on complex orders
- Could cause jank on slower kitchen tablets

---

## Proposed Solutions

### Option A: Memoize items array (RECOMMENDED)
**Pros:** Simple fix, maintains existing structure
**Cons:** Adds useMemo overhead
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
const items = useMemo(() => {
  return displayOrder?.items ?? displayGroup?.orders.flatMap(o => o.items) ?? []
}, [displayOrder?.items, displayGroup?.orders])
```

### Option B: Pre-compute items in useOrderGrouping hook
**Pros:** Centralizes computation, benefits all consumers
**Cons:** Increases OrderGroup interface size
**Effort:** Medium
**Risk:** Low

---

## Recommended Action

Option A - Memoize items array

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/FocusOverlay.tsx`

### Performance Impact
- Estimated 15-20% reduction in render time for complex order groups

---

## Acceptance Criteria

- [ ] items array wrapped in useMemo
- [ ] Dependencies correctly specified
- [ ] React DevTools profiler shows stable reference
- [ ] No visual regressions

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review performance findings |
