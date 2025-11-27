# TODO-057: KDS Modifier Rendering Logic Duplicated in 3 Components

## Metadata
- **Status**: complete
- **Priority**: P2 (Important)
- **Issue ID**: 057
- **Tags**: architecture, kds, dry, refactor, code-review
- **Dependencies**: 056 (allergy accessibility)
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

The modifier rendering logic is duplicated across 3 components with nearly identical code (~10 lines each):
- `OrderCard.tsx` (lines 118-129)
- `OrderGroupCard.tsx` (lines 184-195)
- `FocusOverlay.tsx` (lines 99-110)

This violates DRY principle and creates maintenance burden - any change to modifier display requires updating 3 files.

---

## Findings

### Evidence Location

**OrderCard.tsx (lines 118-129)**:
```typescript
{item.modifiers && item.modifiers.length > 0 && (
  <div className="ml-4 mt-1">
    {item.modifiers.map((mod, i) => {
      const modType = getModifierType(mod.name)
      return (
        <div key={i} className={cn('text-sm', MODIFIER_STYLES[modType])}>
          {MODIFIER_ICONS[modType]} {mod.name}
        </div>
      )
    })}
  </div>
)}
```

**OrderGroupCard.tsx (lines 184-195)**: Nearly identical code

**FocusOverlay.tsx (lines 99-110)**: Same pattern, different text size

### Issues
1. **Duplicate code**: ~30 lines duplicated across 3 files
2. **Index as key**: Using array index `i` as React key (anti-pattern)
3. **Inconsistent styling**: Different wrapper classes (`ml-4`, `ml-6`)
4. **No centralized testing**: Each usage must be tested separately

---

## Proposed Solutions

### Option A: Extract ModifierList Component (Recommended)
**Pros**: Single source of truth, testable, type-safe
**Cons**: New component file
**Effort**: Small (1-2 hours)
**Risk**: Low - extraction refactor

### Option B: Keep Inline, Extract Render Function
**Pros**: No new file
**Cons**: Still need to import into each component
**Effort**: Small (1 hour)
**Risk**: Low

---

## Recommended Action

**Option A** - Create shared `ModifierList` component:

```typescript
// client/src/components/kitchen/ModifierList.tsx
import { cn } from '@/utils'
import {
  getModifierType,
  MODIFIER_STYLES,
  MODIFIER_ICONS
} from '@rebuild/shared/config/kds'

interface ModifierListProps {
  modifiers: Array<{ name: string; price?: number }> | undefined
  size?: 'sm' | 'base' | 'lg' | 'xl'
  className?: string
}

/**
 * Displays order modifiers with color-coded types
 * Centralizes modifier rendering for OrderCard, OrderGroupCard, FocusOverlay
 */
export function ModifierList({ modifiers, size = 'sm', className }: ModifierListProps) {
  if (!modifiers?.length) return null

  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }[size]

  return (
    <div className={className}>
      {modifiers.map((mod, i) => {
        const modType = getModifierType(mod.name)
        return (
          <div key={`${mod.name}-${i}`} className={cn(sizeClass, MODIFIER_STYLES[modType])}>
            {MODIFIER_ICONS[modType]} {mod.name}
          </div>
        )
      })}
    </div>
  )
}
```

**Usage in components**:
```typescript
// OrderCard.tsx
<ModifierList modifiers={item.modifiers} size="sm" className="ml-4 mt-1" />

// OrderGroupCard.tsx
<ModifierList modifiers={item.modifiers} size="sm" className="ml-6 mt-1" />

// FocusOverlay.tsx
<ModifierList modifiers={item.modifiers} size="xl" className="ml-6 mt-2 space-y-1" />
```

---

## Technical Details

### Affected Files
- `client/src/components/kitchen/ModifierList.tsx` (new)
- `client/src/components/kitchen/OrderCard.tsx`
- `client/src/components/kitchen/OrderGroupCard.tsx`
- `client/src/components/kitchen/FocusOverlay.tsx`

### Lines Saved
- ~30 lines of duplicate code removed
- Single location for future modifier display changes

---

## Acceptance Criteria

- [ ] New `ModifierList.tsx` component created
- [ ] Component accepts `modifiers`, `size`, and `className` props
- [ ] Uses stable keys (`${mod.name}-${i}` instead of just `i`)
- [ ] All 3 components updated to use `ModifierList`
- [ ] Visual appearance unchanged
- [ ] Unit tests for `ModifierList` component
- [ ] TypeScript compiles without errors

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |

---

## Resources

- [React Keys Documentation](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key)
- [DRY Principle](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
