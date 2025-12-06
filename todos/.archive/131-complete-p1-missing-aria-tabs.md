---
status: complete
priority: p1
issue_id: "131"
tags: [code-review, accessibility, a11y, kitchen]
dependencies: []
---

# TODO-131: Station tabs missing ARIA attributes for accessibility

## Problem Statement

The Kitchen/Expo tab navigation in `KitchenDisplayOptimized.tsx` lacks proper ARIA attributes for accessible tab navigation. Screen reader users cannot understand the tab interface, and keyboard navigation doesn't follow WCAG 2.1 ARIA Practices for tabs.

**Why it matters:** Kitchen staff may have accessibility needs. Proper ARIA support ensures the interface works with assistive technologies and meets accessibility requirements.

## Findings

### Current Implementation (lines 178-203)
```typescript
<div className="flex bg-gray-100 rounded-lg p-1">
  <Button
    variant={stationTab === 'kitchen' ? 'default' : 'ghost'}
    size="sm"
    onClick={() => setStationTab('kitchen')}
    className="gap-1"
  >
    <ChefHat className="w-4 h-4" />
    Kitchen
  </Button>
  // ... Expo button similar
</div>
```

### Missing Attributes
- No `role="tablist"` on container
- No `role="tab"` on buttons
- No `aria-selected` state
- No `aria-controls` linking tabs to panels
- No `role="tabpanel"` on content areas
- No arrow key navigation

## Proposed Solutions

### Solution 1: Full ARIA tab pattern (Recommended)
Implement complete ARIA tablist pattern with keyboard navigation.

**Pros:** Full accessibility, follows WCAG guidelines
**Cons:** More code, requires testing with screen readers
**Effort:** Medium
**Risk:** Low

```typescript
<div
  className="flex bg-gray-100 rounded-lg p-1"
  role="tablist"
  aria-label="Station selection"
>
  <Button
    role="tab"
    aria-selected={stationTab === 'kitchen'}
    aria-controls="kitchen-panel"
    id="kitchen-tab"
    tabIndex={stationTab === 'kitchen' ? 0 : -1}
    onClick={() => setStationTab('kitchen')}
  >
    <ChefHat className="w-4 h-4" aria-hidden="true" />
    Kitchen
  </Button>
  // ...
</div>

<div
  role="tabpanel"
  id="kitchen-panel"
  aria-labelledby="kitchen-tab"
  hidden={stationTab !== 'kitchen'}
>
  {/* Kitchen content */}
</div>
```

### Solution 2: Minimal ARIA additions
Add basic roles without full keyboard navigation.

**Pros:** Quick fix, better than nothing
**Cons:** Incomplete accessibility
**Effort:** Small
**Risk:** Low

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

**Affected Files:**
- `client/src/pages/KitchenDisplayOptimized.tsx:178-203` (tabs)
- `client/src/pages/KitchenDisplayOptimized.tsx:227-344` (panels)

**ARIA Pattern Reference:**
https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

## Acceptance Criteria

- [ ] Container has `role="tablist"`
- [ ] Tab buttons have `role="tab"` and `aria-selected`
- [ ] Panels have `role="tabpanel"` with `aria-labelledby`
- [ ] Arrow key navigation works between tabs
- [ ] Focus management on tab switch
- [ ] Screen reader announces tab selection correctly

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2025-12-02 | Created from code review | Identified during accessibility audit |

## Resources

- ARIA Tabs Pattern: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- PR: Current uncommitted changes
