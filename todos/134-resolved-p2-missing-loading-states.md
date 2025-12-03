---
status: completed
priority: p2
issue_id: "134"
tags: [code-review, ux, kitchen, accessibility]
dependencies: ["133"]
completed_at: "2025-12-03"
---

# TODO-134: No loading states during status transitions

## Problem Statement

The "Mark Sold" button in `ReadyOrderCard` and "Mark Ready" in `OrderCard` don't disable during async operations. Users can spam-click buttons, potentially causing duplicate API calls or race conditions.

## Findings

### Current Implementation (ExpoTabContent.tsx:90-97)
```typescript
<Button
  onClick={() => onMarkSold(order.id)}
  className="w-full bg-green-600 hover:bg-green-700 text-white"
  size="lg"
>
  <CheckCircle className="w-4 h-4 mr-2" />
  Mark Sold
</Button>
// No disabled state, no loading indicator
```

### Comparison
`OrderGroupCard.tsx:50-74` uses `isUpdating` state with `disabled={isUpdating}`.

## Proposed Solutions

### Solution 1: Add loading state to ReadyOrderCard (Recommended)
**Effort:** Small | **Risk:** Low

```typescript
const [isUpdating, setIsUpdating] = useState(false)

const handleClick = async () => {
  setIsUpdating(true)
  try {
    await onMarkSold(order.id)
  } finally {
    setIsUpdating(false)
  }
}

<Button disabled={isUpdating} onClick={handleClick}>
  {isUpdating ? <Spinner /> : <CheckCircle />}
  {isUpdating ? 'Updating...' : 'Mark Sold'}
</Button>
```

## Technical Details

**Affected Files:**
- `client/src/components/kitchen/ExpoTabContent.tsx:26,60-68,115,119-129`

## Resolution

### Implementation (Lines 26, 60-68, 115, 119-129)

The `ReadyOrderCard` component now has full loading state management:

```typescript
// State
const [isUpdating, setIsUpdating] = useState(false)

// Handler with race condition prevention
const handleClick = async () => {
  if (isUpdating) return // Prevent double-clicks
  setIsUpdating(true)
  try {
    await onMarkSold(order.id)
  } finally {
    setIsUpdating(false)
  }
}

// Button with loading state
<Button
  onClick={handleClick}
  disabled={isUpdating}
  className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
  size="lg"
>
  {isUpdating ? (
    <>
      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
      Updating...
    </>
  ) : (
    <>
      <CheckCircle className="w-4 h-4 mr-2" />
      Mark Sold
    </>
  )}
</Button>
```

## Acceptance Criteria

- [x] Button disabled during async operation
- [x] Loading indicator shown (spinner animation + "Updating..." text)
- [x] Re-enabled after success or failure (finally block)
- [x] No duplicate API calls possible (early return if isUpdating)

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | UX pattern missing |
| 2025-12-03 | Verified implementation complete | Loading states with spinner animation already implemented |
