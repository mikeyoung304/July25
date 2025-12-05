---
status: ready
priority: p3
issue_id: "174"
tags: [code-review, performance, react, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Missing React Memoization for Derived State

## Problem Statement

The MenuManagement component re-computes `groupedItems` and `unavailableCount` on every render instead of using `useMemo`.

## Findings

### Agent Discovery

**Performance Oracle:** Identified unnecessary re-computation

### Evidence

```typescript
// MenuManagement.tsx:117-124 - Runs on EVERY render
const groupedItems = items.reduce((acc, item) => {
  const categoryName = item.category?.name || 'Uncategorized'
  if (!acc[categoryName]) {
    acc[categoryName] = []
  }
  acc[categoryName].push(item)
  return acc
}, {} as Record<string, MenuItem[]>)

// Line 126 - Also runs on every render
const unavailableCount = items.filter(item => item.isAvailable === false).length
```

### Performance Impact

- With 50 items: ~1-2ms per render (negligible)
- With 500 items: ~10-20ms per render (noticeable)
- Triggers on: loading states, toasts, hover effects

## Proposed Solutions

### Solution A: Add useMemo (Recommended)

**Effort:** Small (10 min) | **Risk:** None

```typescript
const groupedItems = useMemo(() => {
  return items.reduce((acc, item) => {
    const categoryName = item.category?.name || 'Uncategorized'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)
}, [items])

const unavailableCount = useMemo(() =>
  items.filter(item => item.isAvailable === false).length,
  [items]
)
```

## Recommended Action

Implement Solution A - simple optimization.

## Technical Details

**Affected File:** `client/src/modules/menu-management/components/MenuManagement.tsx:117-126`

## Acceptance Criteria

- [ ] groupedItems wrapped in useMemo
- [ ] unavailableCount wrapped in useMemo
- [ ] Only recomputes when items array changes

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- React useMemo documentation
- PR #152: feat(menu): implement 86-item management
