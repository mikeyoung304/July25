# TODO-070: Green Urgency Text Fails WCAG AA Contrast

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 070
- **Tags**: accessibility, wcag, kds, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Accessibility Specialist

---

## Problem Statement

The `text-green-600` color used for "normal" urgency timers has a contrast ratio of 3.45:1 against white, which **fails WCAG AA** (requires 4.5:1 for normal text).

This affects kitchen staff who may have visual impairments or work in challenging lighting conditions.

---

## Findings

### Evidence Location

**shared/config/kds.ts (line 89)**:
```typescript
case 'normal':
default:
  return 'text-green-600';
```

### Color Contrast Analysis
| Color | Hex | Ratio vs White | WCAG AA |
|-------|-----|----------------|---------|
| text-green-600 | #16A34A | 3.45:1 | FAILS |
| text-green-700 | #15803D | 4.73:1 | PASSES |

### Impact
- Accessibility compliance failure
- Kitchen staff may miss time information
- Legal liability for accessibility violations

---

## Proposed Solutions

### Option A: Use text-green-700 (RECOMMENDED)
**Pros:** Simple change, passes WCAG AA
**Cons:** Slightly darker green
**Effort:** Small (5 minutes)
**Risk:** None

```typescript
case 'normal':
default:
  return 'text-green-700';
```

### Option B: Add font-weight for better visibility
**Pros:** Maintains color, improves visibility
**Cons:** Doesn't fix contrast ratio
**Effort:** Small
**Risk:** Still fails WCAG

---

## Recommended Action

Option A - Use text-green-700

---

## Technical Details

### Affected Files
- `shared/config/kds.ts` (getUrgencyColorClass function)

### Testing
- Use browser contrast checker extension
- Manual verification of timer visibility

---

## Acceptance Criteria

- [ ] text-green-700 used for normal urgency
- [ ] Contrast ratio >= 4.5:1
- [ ] WCAG AA compliance achieved
- [ ] Visual verification in kitchen lighting

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review accessibility findings |
