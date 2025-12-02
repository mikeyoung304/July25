---
status: pending
priority: p2
issue_id: "133"
tags: [code-review, error-handling, ux, kitchen]
dependencies: []
---

# TODO-133: No error handling in ExpoTabContent async handlers

## Problem Statement

The `handleMarkReady` and `handleMarkSold` functions in `ExpoTabContent.tsx` call async `onStatusChange` without try/catch blocks. If the API call fails, users get no feedback and the error is silently swallowed.

## Findings

### Current Implementation (lines 104-110)
```typescript
const handleMarkReady = async (orderId: string) => {
  await onStatusChange(orderId, 'ready')
  // No error handling!
}

const handleMarkSold = async (orderId: string) => {
  await onStatusChange(orderId, 'completed')
  // No error handling!
}
```

### Comparison with other components
`OrderGroupCard.tsx:52-62` properly handles errors with loading states and user feedback.

## Proposed Solutions

### Solution 1: Add try/catch with toast notifications (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
const handleMarkSold = async (orderId: string) => {
  try {
    await onStatusChange(orderId, 'completed')
  } catch (error) {
    logger.error('Failed to mark order as sold', { orderId, error })
    // Show toast notification to user
  }
}
```

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:104-110`

## Acceptance Criteria

- [ ] All async handlers wrapped in try/catch
- [ ] Errors logged with context
- [ ] User sees feedback on failure (toast/alert)
- [ ] Button shows loading state during operation

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Pattern missing from new component |
