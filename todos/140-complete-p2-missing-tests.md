---
status: complete
priority: p2
issue_id: "140"
tags: [code-review, testing, kitchen]
dependencies: []
---

# TODO-140: No test coverage for ExpoTabContent component

## Problem Statement

New `ExpoTabContent.tsx` (176 lines) has no test file, while 10 other kitchen components have tests in `__tests__/` directory. The component contains complex logic that should be tested.

## Findings

### Untested functionality
- Empty order arrays rendering
- Urgency color calculations (20+ minutes)
- Order type mapping (online→Dine-In, pickup→Takeout)
- Button click handlers
- Error boundary integration
- Sorting logic

### Existing test patterns
`client/src/components/kitchen/__tests__/` contains tests for:
- OrderCard.test.tsx
- OrderGroupCard.test.tsx
- TableGroupCard.test.tsx
- FocusOverlay.test.tsx
- etc.

## Proposed Solutions

### Solution 1: Create comprehensive test file (Recommended)
**Effort:** Medium | **Risk:** Low

Create `ExpoTabContent.test.tsx` with tests for all edge cases.

## Technical Details

**Affected Files:**
- CREATE: `client/src/components/kitchen/__tests__/ExpoTabContent.test.tsx`

## Acceptance Criteria

- [ ] Test file created following existing patterns
- [ ] Empty state rendering tested
- [ ] Urgency calculations tested
- [ ] Order type mapping tested
- [ ] Button handlers tested
- [ ] Error boundary tested
- [ ] Sorting tested

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Test coverage gap identified |
