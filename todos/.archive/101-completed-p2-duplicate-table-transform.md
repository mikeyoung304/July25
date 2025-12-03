---
status: complete
priority: p2
issue_id: "101"
tags: [code-review, performance, dry, pr-148]
dependencies: []
---

# DRY Violation: Repeated Table Object Transformation (3x)

## Problem Statement

The same table object transformation appears 3 times in ServerView.tsx render method. This violates DRY principle and creates unnecessary object allocations on every render.

**Why it matters:** Code duplication increases maintenance burden and forces re-renders of child components due to new object references.

## Findings

### Performance Oracle & Code Simplicity Reviewer
- **File:** `client/src/pages/ServerView.tsx:251-260, 272-281, 293-301`
- **Evidence:** Identical transformation repeated 3 times:
```typescript
// Lines 251-260, 272-281, 293-301 - EXACT SAME CODE
table={selectedTable ? {
  id: selectedTable.id,
  restaurant_id: selectedTable.restaurant_id || '',
  table_number: selectedTable.label,
  capacity: selectedTable.seats,
  status: selectedTable.status === 'unavailable' ? 'cleaning' : selectedTable.status as 'available' | 'occupied' | 'reserved',
  current_order_id: selectedTable.current_order_id,
  created_at: selectedTable.created_at || '',
  updated_at: selectedTable.updated_at || ''
} : null}
```

### Impact
- 27 lines of duplicated code (9 lines × 3)
- New object created on each render, breaking referential equality
- Child components (SeatSelectionModal, VoiceOrderModal, PostOrderPrompt) re-render unnecessarily

## Proposed Solutions

### Option A: Extract to useMemo Hook (Recommended)
**Pros:** Single source of truth, stable reference
**Cons:** Minor refactor
**Effort:** Small (10 minutes)
**Risk:** Low

```typescript
const transformedTable = useMemo(() =>
  selectedTable ? {
    id: selectedTable.id,
    restaurant_id: selectedTable.restaurant_id || '',
    table_number: selectedTable.label,
    capacity: selectedTable.seats,
    status: selectedTable.status === 'unavailable' ? 'cleaning' : selectedTable.status as 'available' | 'occupied' | 'reserved',
    current_order_id: selectedTable.current_order_id,
    created_at: selectedTable.created_at || '',
    updated_at: selectedTable.updated_at || ''
  } : null,
  [selectedTable]
);

// Use in render
<SeatSelectionModal table={transformedTable} ... />
<VoiceOrderModal table={transformedTable} ... />
<PostOrderPrompt table={transformedTable} ... />
```

**Line Savings:** 27 lines → 12 lines (save 15 lines)

### Option B: Create Type-Safe Helper Function
**Pros:** Reusable across components
**Cons:** Function call overhead (minimal)
**Effort:** Small
**Risk:** Low

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/pages/ServerView.tsx`
- **Lines:** 251-260, 272-281, 293-301
- **Components:** ServerView

## Acceptance Criteria

- [ ] Single table transformation with useMemo
- [ ] All 3 modal components use same reference
- [ ] No breaking changes to modal props

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
