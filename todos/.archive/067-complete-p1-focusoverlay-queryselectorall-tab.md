# TODO-067: FocusOverlay Runs querySelectorAll on Every Tab Keypress

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 067
- **Tags**: performance, accessibility, kds, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Performance Oracle

---

## Problem Statement

The focus trap implementation in `FocusOverlay` runs `querySelectorAll` on every Tab key event. This DOM query is expensive and could cause noticeable jank on slower devices when users navigate the modal.

---

## Findings

### Evidence Location

**client/src/components/kitchen/FocusOverlay.tsx (lines 61-63)**:
```typescript
const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
)
```

### Impact
- DOM query executed on every Tab keypress
- O(n) scan of modal DOM tree
- Potential for visible jank on large overlays
- Kitchen tablets may have slower processors

---

## Proposed Solutions

### Option A: Cache focusable elements in ref (RECOMMENDED)
**Pros:** Eliminates repeated DOM queries
**Cons:** Requires update when items change
**Effort:** Small (15 minutes)
**Risk:** Low

```typescript
const focusableElementsRef = useRef<HTMLElement[]>([])

useEffect(() => {
  if (modalRef.current) {
    focusableElementsRef.current = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    )
  }
}, [items.length]) // Recompute when items change

// In handleKeyDown:
const focusableElements = focusableElementsRef.current
```

### Option B: Use focus-trap-react library
**Pros:** Battle-tested, handles edge cases
**Cons:** Adds dependency
**Effort:** Medium
**Risk:** Low

### Option C: Use native <dialog> element
**Pros:** Built-in focus trapping, no JS needed
**Cons:** Different styling approach, browser support
**Effort:** Large
**Risk:** Medium

---

## Recommended Action

Option A - Cache focusable elements in ref

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/FocusOverlay.tsx`

### Performance Impact
- Estimated 10-15ms saved per Tab keypress

---

## Acceptance Criteria

- [ ] querySelectorAll only runs on mount/item changes
- [ ] Focus trap still works correctly
- [ ] Tab cycling functions as before
- [ ] Shift+Tab cycling functions as before

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review performance findings |
