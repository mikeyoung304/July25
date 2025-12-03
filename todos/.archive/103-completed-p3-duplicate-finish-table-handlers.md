---
status: complete
priority: p3
issue_id: "103"
tags: [code-review, simplicity, dry, pr-148]
dependencies: []
---

# Duplicate handleFinishTable Callbacks in ServerView

## Problem Statement

Two identical callbacks `handleFinishTable` and `handleFinishTableFromSeatModal` exist in ServerView.tsx with exactly the same implementation.

**Why it matters:** Code duplication increases maintenance burden and potential for divergence.

## Findings

### Code Simplicity Reviewer
- **File:** `client/src/pages/ServerView.tsx:99-111`
- **Evidence:**
```typescript
const handleFinishTable = useCallback(() => {
  voiceOrder.handleFinishTable()
  setSelectedTableId(null)
  setSelectedSeat(null)
  setShowSeatSelection(false)
}, [voiceOrder, setSelectedTableId])

const handleFinishTableFromSeatModal = useCallback(() => {
  voiceOrder.handleFinishTable()
  setSelectedTableId(null)
  setSelectedSeat(null)
  setShowSeatSelection(false)
}, [voiceOrder, setSelectedTableId])
```

These are **100% identical**.

## Proposed Solutions

### Option A: Remove Duplicate (Recommended)
**Pros:** DRY, one function to maintain
**Cons:** None
**Effort:** Small (2 minutes)
**Risk:** Low

Delete `handleFinishTableFromSeatModal` and use `handleFinishTable` in both places.

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx:99-111`
- **Line Savings:** 6 lines

## Acceptance Criteria

- [ ] Single handleFinishTable callback
- [ ] Both usages reference same function

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
