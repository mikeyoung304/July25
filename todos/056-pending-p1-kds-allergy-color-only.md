# TODO-056: KDS Allergy Indicators Use Color-Only - Food Safety Risk

## Metadata
- **Status**: complete
- **Priority**: P1 (Critical)
- **Issue ID**: 056
- **Tags**: accessibility, kds, wcag, food-safety, allergy
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

Allergy warnings in the KDS modifier display rely **solely on color** (`bg-red-100 text-red-800`) to convey critical food safety information. Kitchen staff with color vision deficiency cannot distinguish allergy modifiers from other types.

This creates a **food safety hazard** and violates WCAG 1.4.1 (Level A) - Use of Color.

---

## Findings

### Evidence Location
- `shared/config/kds.ts:247-254` - MODIFIER_STYLES definition
- `shared/config/kds.ts:259-266` - MODIFIER_ICONS definition
- `client/src/components/kitchen/OrderCard.tsx:120-127` - Modifier rendering
- `client/src/components/kitchen/OrderGroupCard.tsx:186-193` - Modifier rendering
- `client/src/components/kitchen/FocusOverlay.tsx:101-108` - Modifier rendering

### Current Implementation
```typescript
// Allergy relies on red background color only
export const MODIFIER_STYLES = {
  allergy: 'bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold',
  // ... other types
} as const;

// Icon exists but provides no screen reader context
export const MODIFIER_ICONS = {
  allergy: '\u26A0\uFE0F', // ⚠️ - purely visual
  // ...
} as const;
```

### Impact
- **Food safety risk**: Colorblind staff may miss allergy warnings
- **Legal liability**: ADA compliance issues in food service
- **Screen readers**: No indication that modifier is allergy-related
- Approximately 8% of males have some form of color blindness

---

## Proposed Solutions

### Option A: Add Screen Reader Text + Visual Label (Recommended)
**Pros**: Full accessibility, clear to all users
**Cons**: Requires component changes
**Effort**: Small (1-2 hours)
**Risk**: Low - additive change

### Option B: Use Pattern/Icon Instead of Color
**Pros**: Visual distinction without color
**Cons**: May be less visually prominent
**Effort**: Medium (2-3 hours)
**Risk**: Low

---

## Recommended Action

**Option A** - Add explicit screen reader support and visual label:

1. Add text prefix constant in `shared/config/kds.ts`:
```typescript
export const MODIFIER_TEXT_PREFIX = {
  removal: 'Remove',
  addition: 'Add',
  allergy: 'ALLERGY',
  temperature: 'Temp',
  substitution: 'Sub',
  default: '',
} as const;
```

2. Create shared `ModifierItem` component:
```typescript
// client/src/components/kitchen/ModifierItem.tsx
interface ModifierItemProps {
  modifier: { name: string };
  size?: 'sm' | 'xl';
}

export function ModifierItem({ modifier, size = 'sm' }: ModifierItemProps) {
  const modType = getModifierType(modifier.name);
  const isAllergy = modType === 'allergy';

  return (
    <div
      className={cn(`text-${size}`, MODIFIER_STYLES[modType])}
      role={isAllergy ? 'alert' : undefined}
    >
      <span aria-hidden="true">{MODIFIER_ICONS[modType]} </span>
      {isAllergy && <span className="sr-only">ALLERGY WARNING: </span>}
      {isAllergy && <span className="font-bold uppercase mr-1">ALLERGY:</span>}
      {modifier.name}
    </div>
  );
}
```

3. Add `.sr-only` utility class if not present:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Technical Details

### Affected Files
- `shared/config/kds.ts` - Add text prefix constant
- `client/src/components/kitchen/ModifierItem.tsx` - New shared component
- `client/src/components/kitchen/OrderCard.tsx` - Use new component
- `client/src/components/kitchen/OrderGroupCard.tsx` - Use new component
- `client/src/components/kitchen/FocusOverlay.tsx` - Use new component

### WCAG Criteria Affected
- 1.4.1 Use of Color (Level A) - FAIL → PASS

---

## Acceptance Criteria

- [ ] Allergy modifiers have visible "ALLERGY:" text label
- [ ] Screen readers announce "ALLERGY WARNING:" before modifier text
- [ ] Allergy modifiers use `role="alert"` for screen readers
- [ ] All modifier icons have `aria-hidden="true"`
- [ ] Manual test: Identify allergy in grayscale mode
- [ ] Manual test: Screen reader announces allergy clearly

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |

---

## Resources

- [WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html)
- [FDA Food Allergen Labeling](https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/food-allergen-labeling-and-consumer-protection-act-2004-falcpa)
