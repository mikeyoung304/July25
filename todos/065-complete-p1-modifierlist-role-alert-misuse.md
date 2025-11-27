# TODO-065: ModifierList Misuses role="alert" for Static Content

## Metadata
- **Status**: pending
- **Priority**: P1 (Critical)
- **Issue ID**: 065
- **Tags**: accessibility, kds, wcag, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Accessibility Specialist

---

## Problem Statement

The `ModifierList` component applies `role="alert"` to every allergy modifier. The ARIA `alert` role is intended for **dynamic** content that requires immediate attention and triggers screen reader interruptions. Using it on static list items creates excessive announcements that degrade the user experience for screen reader users.

This violates WCAG 4.1.3 (Status Messages) - alerts should be reserved for time-sensitive information.

---

## Findings

### Evidence Location

**client/src/components/kitchen/ModifierList.tsx (line 45)**:
```typescript
<div
  key={`${mod.name}-${i}`}
  className={cn(sizeClass, MODIFIER_STYLES[modType])}
  role={isAllergy ? 'alert' : undefined}
>
```

### Impact
- Screen reader users hear repeated interruptions when viewing orders
- Diminishes the impact of actual urgent alerts
- Can cause accessibility audit failures

---

## Proposed Solutions

### Option A: Remove role="alert" entirely (RECOMMENDED)
**Pros:** Simple fix, correct ARIA usage, maintains visual accessibility
**Cons:** None - the visible "ALLERGY:" label and sr-only text are sufficient
**Effort:** Small (5 minutes)
**Risk:** Low

```typescript
<div
  key={`${mod.name}-${i}`}
  className={cn(sizeClass, MODIFIER_STYLES[modType])}
>
  <span aria-hidden="true">{MODIFIER_ICONS[modType]} </span>
  {isAllergy && <span className="sr-only">Allergy warning: </span>}
  {isAllergy && <span className="font-bold uppercase mr-1">ALLERGY:</span>}
  {mod.name}
</div>
```

### Option B: Use aria-live region at parent level
**Pros:** Properly handles dynamic updates
**Cons:** More complex, requires parent component changes
**Effort:** Medium
**Risk:** Medium

---

## Recommended Action

Option A - Remove role="alert" entirely

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/ModifierList.tsx`

### Testing
- Manual screen reader testing (VoiceOver, NVDA)
- Verify allergy text is still announced when navigating list

---

## Acceptance Criteria

- [ ] role="alert" removed from modifier items
- [ ] Screen reader still announces "Allergy warning:" text
- [ ] No WCAG 4.1.3 violations
- [ ] Manual VoiceOver testing passes

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review accessibility findings |
