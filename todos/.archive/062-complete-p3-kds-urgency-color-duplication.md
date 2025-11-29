# TODO-062: OrderGroupCard Duplicates Urgency Color Logic

## Metadata
- **Status**: complete
- **Priority**: P3 (Nice-to-Have)
- **Issue ID**: 062
- **Tags**: architecture, kds, dry, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

`OrderGroupCard.tsx` manually calculates urgency colors inline instead of using the existing `getUrgencyColorClass()` function from `shared/config/kds.ts`. This duplicates logic and risks inconsistency.

---

## Findings

### Evidence Location

**OrderGroupCard.tsx (lines 118-122)** - Inline urgency colors:
```typescript
<div className={cn(
  'flex items-center gap-1 text-xl font-bold',
  urgencyLevel === 'urgent' || urgencyLevel === 'critical' ? 'text-red-600' :
  urgencyLevel === 'warning' ? 'text-yellow-600' : 'text-green-600'
)}>
```

**OrderCard.tsx (line 39)** - Correctly uses centralized function:
```typescript
const urgencyColor = getUrgencyColorClass(urgency)
```

**shared/config/kds.ts (lines 80-91)** - Existing centralized function:
```typescript
export function getUrgencyColorClass(urgencyLevel: KDSUrgencyLevel): string {
  switch (urgencyLevel) {
    case 'critical':
    case 'urgent':
      return 'text-red-600';
    case 'warning':
      return 'text-yellow-600';
    case 'normal':
    default:
      return 'text-green-600';
  }
}
```

### Impact
- Minor inconsistency risk if urgency colors change
- Violates DRY principle
- Extra code complexity

---

## Recommended Action

Update `OrderGroupCard.tsx` to use the centralized function:

```typescript
// At top of component, after urgencyLevel calculation:
const urgencyColor = getUrgencyColorClass(urgencyLevel)

// In JSX:
<div className={cn('flex items-center gap-1 text-xl font-bold', urgencyColor)}>
  <Clock className="w-5 h-5" />
  <span>{orderGroup.age_minutes}m</span>
</div>
```

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/OrderGroupCard.tsx`

### Import Already Exists
The file already imports from `@rebuild/shared/config/kds`:
```typescript
import {
  getOrderUrgency,
  getUrgencyAccentClass,
  KDS_TYPE_COLORS,
  // Just add: getUrgencyColorClass
} from '@rebuild/shared/config/kds'
```

---

## Acceptance Criteria

- [ ] `getUrgencyColorClass` imported in OrderGroupCard
- [ ] Inline ternary replaced with function call
- [ ] Visual appearance unchanged
- [ ] TypeScript compiles without errors

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |
| 2025-11-28 | Verified complete | OrderGroupCard.tsx already uses getUrgencyColorClass() - fixed in earlier refactor |
