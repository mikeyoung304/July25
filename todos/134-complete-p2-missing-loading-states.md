---
status: pending
priority: p2
issue_id: "134"
tags: [code-review, ux, kitchen, accessibility]
dependencies: ["133"]
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
- `client/src/components/kitchen/ExpoTabContent.tsx:90-97`

## Acceptance Criteria

- [ ] Button disabled during async operation
- [ ] Loading indicator shown (spinner or text)
- [ ] Re-enabled after success or failure
- [ ] No duplicate API calls possible

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | UX pattern missing |
