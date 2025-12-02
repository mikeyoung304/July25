---
status: pending
priority: p2
issue_id: "137"
tags: [code-review, performance, react, kitchen]
dependencies: ["136"]
---

# TODO-137: Missing useCallback for async handlers in ExpoTabContent

## Problem Statement

The `handleMarkReady` and `handleMarkSold` functions are defined without `useCallback`, creating new function references on every render. This breaks memoization for child components.

## Findings

### Current Implementation (lines 104-110)
```typescript
const handleMarkReady = async (orderId: string) => {
  await onStatusChange(orderId, 'ready')
}

const handleMarkSold = async (orderId: string) => {
  await onStatusChange(orderId, 'completed')
}
```

## Proposed Solutions

### Solution 1: Wrap with useCallback (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
const handleMarkReady = useCallback(async (orderId: string) => {
  await onStatusChange(orderId, 'ready')
}, [onStatusChange])

const handleMarkSold = useCallback(async (orderId: string) => {
  await onStatusChange(orderId, 'completed')
}, [onStatusChange])
```

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:104-110`

## Acceptance Criteria

- [ ] Both handlers wrapped with useCallback
- [ ] Correct dependency arrays
- [ ] Child components don't re-render unnecessarily

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Performance pattern missing |
