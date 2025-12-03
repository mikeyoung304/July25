---
status: pending
priority: p2
issue_id: "160"
tags: [accessibility, wcag, touch-targets, ui-ux-review]
dependencies: []
created_date: 2025-12-03
source: ui-ux-plan-review
---

# CategoryFilter Buttons Below WCAG Touch Target Size

## Problem Statement

CategoryFilter category buttons use `px-4 py-2` which results in ~40px height. WCAG 2.5.5 requires minimum 44x44px touch targets.

## Findings

### UX Expert Agent Discovery

**Current Implementation:**
```tsx
// CategoryFilter.tsx
<button className="px-4 py-2 rounded-full font-medium ...">
  {category.name}
</button>
```

**Size Calculation:**
- `py-2` = 8px padding top + 8px bottom = 16px
- Font size ~14px with line-height ~20px
- Total height: ~36-40px (below 44px minimum)

**WCAG 2.5.5 Target Size:**
- Minimum: 44x44 CSS pixels
- Recommended: 48x48 CSS pixels

**Other Components Already Fixed:**
- MenuItemCard quantity buttons: `w-11 h-11` (44px) ✅
- Login password toggle: `min-w-[44px] min-h-[44px]` ✅

## Proposed Solutions

### Solution A: Add min-height (Recommended)

**Effort:** 5 minutes | **Risk:** None

```tsx
<button className="px-4 py-2 min-h-[44px] rounded-full font-medium ...">
```

### Solution B: Use design token class

**Effort:** 5 minutes | **Risk:** None

```tsx
<button className="px-4 py-2 touch-target-min rounded-full font-medium ...">
```

Where `touch-target-min` is defined in design-tokens.css as:
```css
.touch-target-min { min-width: 44px; min-height: 44px; }
```

## Recommended Action

Solution A - simpler, keeps existing class structure.

## Technical Details

**Affected Files:**
- `client/src/modules/order-system/components/CategoryFilter.tsx`

**Verification:**
1. Open DevTools Elements panel
2. Select category button
3. Check computed height is ≥44px
4. Test touch accuracy on actual tablet

## Acceptance Criteria

- [ ] All category buttons have min-h-[44px]
- [ ] Computed height verified in DevTools
- [ ] Touch tested on actual tablet device
- [ ] axe DevTools shows no target size violations

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan accessibility review |

## Resources

- WCAG 2.5.5 Target Size: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- design-tokens.css touch-target-min class
