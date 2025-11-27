# TODO-071: Decorative Icons Missing aria-hidden

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 071
- **Tags**: accessibility, wcag, kds, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Accessibility Specialist

---

## Problem Statement

Several decorative icons (Clock, Search, CheckCircle) are not marked with `aria-hidden="true"`, causing screen readers to announce them unnecessarily.

WCAG 1.1.1 (Non-text Content) requires decorative images to be hidden from assistive technologies.

---

## Findings

### Evidence Locations

**client/src/components/kitchen/OrderCard.tsx (line 72)**:
```typescript
<Clock className="w-5 h-5" />
```

**client/src/components/kitchen/OrderGroupCard.tsx (line 115)**:
```typescript
<Clock className="w-5 h-5" />
```

**client/src/components/kitchen/OrderGroupCard.tsx (line 163)**:
```typescript
<CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
```

**client/src/components/kitchen/OrderCard.tsx (line 81)**:
```typescript
<Search className="w-5 h-5" />
```

### Impact
- Screen readers announce icon names (e.g., "clock" "search")
- Clutters screen reader output
- Confusing for visually impaired users

---

## Proposed Solutions

### Option A: Add aria-hidden to all decorative icons (RECOMMENDED)
**Pros:** Correct WCAG compliance
**Cons:** Verbose
**Effort:** Small (15 minutes)
**Risk:** None

```typescript
<Clock className="w-5 h-5" aria-hidden="true" />
<Search className="w-5 h-5" aria-hidden="true" />
<CheckCircle className="w-4 h-4 text-green-600" aria-hidden="true" />
```

---

## Recommended Action

Option A - Add aria-hidden to all decorative icons

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/OrderCard.tsx`
- `client/src/components/kitchen/OrderGroupCard.tsx`

---

## Acceptance Criteria

- [ ] All decorative icons have aria-hidden="true"
- [ ] Screen reader does not announce icon names
- [ ] Manual VoiceOver testing passes

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review accessibility findings |
