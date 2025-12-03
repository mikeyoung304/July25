---
status: pending
priority: p2
issue_id: "136"
tags: [code-review, performance, react, kitchen]
dependencies: []
---

# TODO-136: Missing React.memo on ExpoTabContent and ReadyOrderCard

## Problem Statement

Neither `ExpoTabContent` nor `ReadyOrderCard` are wrapped with `React.memo`, causing unnecessary re-renders when the parent KitchenDisplayOptimized re-renders (which happens frequently due to WebSocket updates).

## Findings

### Components without memoization
- `ExpoTabContent` (line 103) - receives activeOrders/readyOrders props
- `ReadyOrderCard` (line 21) - child component rendered for each ready order

### Comparison
Other kitchen components use `React.memo`:
- `OrderGroupCard` - memoized
- `TableGroupCard` - memoized
- `OrderCard` - memoized

## Proposed Solutions

### Solution 1: Add React.memo to both components (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
const ReadyOrderCard = React.memo(({ order, onMarkSold }: ReadyOrderCardProps) => {
  // ...
})

export const ExpoTabContent = React.memo(({
  activeOrders,
  readyOrders,
  onStatusChange
}: ExpoTabContentProps) => {
  // ...
})
```

### Solution 2: Add custom comparison function
For more granular control over re-renders.

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:21, 103`

## Acceptance Criteria

- [ ] ReadyOrderCard wrapped with React.memo
- [ ] ExpoTabContent wrapped with React.memo
- [ ] Re-renders only when relevant props change
- [ ] No regression in functionality

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Performance optimization identified |
