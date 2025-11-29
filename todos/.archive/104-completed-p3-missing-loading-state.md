---
status: pending
priority: p3
issue_id: "104"
tags: [code-review, ux, loading-state, pr-148]
dependencies: []
---

# Missing Loading State for Order Fetch in Close Table

## Problem Statement

`handleCloseTable` performs async fetch but doesn't show loading indicator. User might click "Close Table" multiple times if fetch is slow.

**Why it matters:** Better UX prevents duplicate requests and gives user feedback.

## Findings

### Architecture Strategist
- **File:** `client/src/pages/ServerView.tsx:120-174`
- **Issue:** No loading state during order fetch
- **Risk:** User confusion, potential duplicate API calls

## Proposed Solutions

### Option A: Add Loading State
**Pros:** Better UX, prevents duplicate clicks
**Cons:** Minor state addition
**Effort:** Small (10 minutes)
**Risk:** Low

```typescript
const [isLoadingPayment, setIsLoadingPayment] = useState(false);

const handleCloseTable = useCallback(async () => {
  if (isLoadingPayment) return; // Prevent duplicate clicks

  setIsLoadingPayment(true);
  try {
    // ... existing logic
  } finally {
    setIsLoadingPayment(false);
  }
}, [isLoadingPayment, ...]);

// Pass to PostOrderPrompt
<PostOrderPrompt
  isLoadingCloseTable={isLoadingPayment}
  onCloseTable={handleCloseTable}
/>
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:**
  - `client/src/pages/ServerView.tsx:120-174`
  - `client/src/pages/components/PostOrderPrompt.tsx`

## Acceptance Criteria

- [ ] Loading state shown during order fetch
- [ ] Button disabled while loading
- [ ] Loading spinner or visual feedback

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
