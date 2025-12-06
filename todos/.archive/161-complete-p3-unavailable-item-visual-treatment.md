---
status: complete
priority: p3
issue_id: "161"
tags: [ux, visual-design, menu, ui-ux-review]
dependencies: ["155"]
created_date: 2025-12-03
completed_date: 2025-12-03
source: ui-ux-plan-review
---

# Add Visual Treatment for Unavailable Menu Items

## Problem Statement

When items are marked unavailable (86'd), customers have no visual indication. They click items that won't add to cart, leading to confusion and frustration.

## Findings

### UX Expert Agent Discovery

**Current State:**
- `is_available` field exists in MenuItem types
- No visual distinction in MenuItemCard for unavailable items
- Only feedback: Nothing happens when clicking unavailable item

**Customer Journey (Current):**
1. Customer clicks "Soul Bowl"
2. Nothing happens (item is 86'd)
3. Customer clicks again
4. Still nothing
5. Customer frustrated, may abandon order

**Expected Experience:**
1. Customer sees "Soul Bowl" with "Sold Out" badge
2. Card is visually muted (grayed out)
3. Customer understands and picks another item

## Proposed Solutions

### Solution A: Badge + Opacity (Recommended)

**Effort:** 30 minutes | **Risk:** None

```tsx
// MenuItemCard.tsx
<div className={`relative ${!item.is_available && 'opacity-60'}`}>
  {!item.is_available && (
    <div className="absolute top-4 right-4 z-10">
      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
        Sold Out
      </span>
    </div>
  )}
  {/* existing card content */}
</div>
```

### Solution B: Full Overlay

**Effort:** 45 minutes | **Risk:** Low

```tsx
{!item.is_available && (
  <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center rounded-2xl z-10">
    <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold">
      Currently Unavailable
    </span>
  </div>
)}
```

### Solution C: Strike-through + Badge

**Effort:** 30 minutes | **Risk:** Low

```tsx
<h3 className={`... ${!item.is_available && 'line-through text-gray-400'}`}>
  {item.name}
</h3>
{!item.is_available && <Badge variant="destructive">86'd</Badge>}
```

## Recommended Action

Solution A - clear visual indication without completely hiding the item.

## Technical Details

**Affected Files:**
- `client/src/modules/order-system/components/MenuItemCard.tsx`
- Possibly `client/src/components/shared/MenuItemGrid.tsx`

**Design Considerations:**
- Red badge for urgency/attention
- Opacity reduction shows it's still there but unavailable
- "Sold Out" is customer-friendly; "86'd" is industry jargon

## Acceptance Criteria

- [ ] Unavailable items show "Sold Out" badge
- [ ] Card visually muted (opacity or grayscale)
- [ ] Add button disabled or hidden for unavailable items
- [ ] Click on unavailable item shows toast explaining unavailability
- [ ] Works on both customer and server views

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-03 | Created | From UI/UX plan UX expert review |

## Resources

- SharedMenuItem.is_available field
- Existing Badge component patterns
