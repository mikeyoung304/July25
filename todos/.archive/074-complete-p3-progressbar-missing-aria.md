# TODO-074: Progress Bar Missing ARIA Attributes

## Metadata
- **Status**: pending
- **Priority**: P3 (Nice-to-Have)
- **Issue ID**: 074
- **Tags**: accessibility, wcag, kds, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Accessibility Specialist

---

## Problem Statement

The progress bar in `OrderGroupCard` uses visual representation only without proper ARIA attributes. Screen reader users cannot determine order completion progress.

WCAG 1.3.1 (Info and Relationships) recommends using `role="progressbar"` with appropriate value attributes.

---

## Findings

### Evidence Location

**client/src/components/kitchen/OrderGroupCard.tsx (lines 188-202)**:
```typescript
<div className="mb-3">
  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
    <span>Progress</span>
    <span>{orderGroup.completed_items}/{orderGroup.total_items} items</span>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className={cn(...)}
      style={{ width: `${orderGroup.completion_percentage}%` }}
    />
  </div>
</div>
```

### Impact
- Screen readers cannot determine completion progress
- Reduces accessibility for visually impaired kitchen staff
- Enhancement, not a blocker

---

## Proposed Solutions

### Option A: Add role="progressbar" with ARIA (RECOMMENDED)
**Pros:** Full accessibility
**Cons:** More verbose markup
**Effort:** Small (10 minutes)
**Risk:** None

```typescript
<div
  className="w-full bg-gray-200 rounded-full h-2"
  role="progressbar"
  aria-valuenow={orderGroup.completion_percentage}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-label={`${orderGroup.completed_items} of ${orderGroup.total_items} items complete`}
>
```

---

## Recommended Action

Option A - Add role="progressbar" with ARIA

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/OrderGroupCard.tsx`

---

## Acceptance Criteria

- [ ] Progress bar has role="progressbar"
- [ ] aria-valuenow, aria-valuemin, aria-valuemax set
- [ ] aria-label provides context
- [ ] Screen reader announces progress correctly

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review accessibility findings |
