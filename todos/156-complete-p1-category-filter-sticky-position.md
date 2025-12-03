---
status: pending
priority: p1
issue_id: "156"
tags: [css, layout, ux, ui-ux-review]
dependencies: []
created_date: 2025-12-03
source: ui-ux-plan-review
---

# CRITICAL: Category Filter Sticks Behind Header

## Problem Statement

CategoryFilter uses `sticky top-0` but CustomerOrderPage has a 144px header stack. The filter sticks at viewport top (0px), which is BEHIND the header, making it invisible when scrolling.

## Findings

### UX Expert Agent Discovery

**Layout Stack:**
1. Sticky header at `top-0` with `h-20 md:h-24` (80-96px)
2. Search/filters at `top-20 md:top-24` (additional 80-96px)
3. CategoryFilter at `sticky top-0` (should be ~144px)

**Problem:**
- `sticky top-0` positions element at viewport top
- Header occupies first 144px of viewport
- CategoryFilter slides UNDER the header when scrolling

**Server Workflow Impact:**
1. Server opens tablet POS
2. Scrolls to see menu items
3. Category buttons disappear behind header
4. Must scroll back up to change categories
5. Severe efficiency loss

### Code Location

**CategoryFilter.tsx line 26:**
```tsx
<div className="sticky top-0 z-10 bg-white shadow-sm">
```

Should be:
```tsx
<div className="sticky top-20 md:top-24 z-10 bg-white shadow-sm">
```

## Proposed Solutions

### Solution A: Fix Sticky Offset (Recommended)

**Effort:** 5 minutes | **Risk:** None

```tsx
// CategoryFilter.tsx
<div className="sticky top-20 md:top-24 z-10 bg-white shadow-sm">
```

This accounts for the header height on mobile (80px) and desktop (96px).

### Solution B: Use CSS Custom Property

**Effort:** 15 minutes | **Risk:** Low

```css
/* design-tokens.css */
:root {
  --header-height: 5rem;  /* 80px */
}
@media (min-width: 768px) {
  :root {
    --header-height: 6rem;  /* 96px */
  }
}
```

```tsx
<div className="sticky z-10 bg-white shadow-sm"
     style={{ top: 'var(--header-height)' }}>
```

## Recommended Action

Solution A - simpler, matches existing pattern.

## Technical Details

**Affected Files:**
- `client/src/modules/order-system/components/CategoryFilter.tsx`

**Verification:**
1. Open customer order page on tablet viewport
2. Scroll down past first row of items
3. Verify category filter remains visible below header

## Acceptance Criteria

- [ ] Category filter stays visible when scrolling
- [ ] Filter appears directly below header, not overlapping
- [ ] Works on mobile (top-20) and desktop (top-24)
- [ ] z-index prevents filter from going under other elements

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan UX expert review |

## Resources

- CustomerOrderPage layout structure
- Tailwind sticky positioning docs
