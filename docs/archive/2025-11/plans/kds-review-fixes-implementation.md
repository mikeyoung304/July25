# feat(kds): Address Code Review Findings - Accessibility, Performance, and Architecture

## Overview

This plan addresses 10 findings from the KDS declutter implementation code review. The work is organized into 3 phases to minimize risk and maximize efficiency through strategic ordering of changes.

**Total Effort Estimate:** 8-10 hours
**Files Affected:** 6 files
**Test Files:** 1 new test file

## Problem Statement

The KDS declutter implementation introduced several improvements but also:
1. **Accessibility gaps** - FocusOverlay modal lacks keyboard navigation and allergy indicators rely on color-only
2. **Code duplication** - Same logic repeated in 3+ files (~90 lines duplicated)
3. **Performance issues** - Missing memoization and expensive render-time calculations
4. **Missing tests** - Safety-critical allergy detection has no test coverage

## Implementation Phases

### Phase 1: Foundation & Shared Utilities (2-3 hours)

Build the foundation that other fixes depend on. This phase creates shared components and utilities that eliminate duplication.

#### 1.1 Add Helper Functions to kds.ts
**Todo:** 058, 064

```typescript
// shared/config/kds.ts - Add these exports

// Constants for card sizing (addresses magic numbers)
export const CARD_SIZING_CONFIG = {
  MODIFIER_WEIGHT: 0.3,
  STANDARD_MAX_COMPLEXITY: 5,
  WIDE_MAX_COMPLEXITY: 10,
} as const;

// Guest name constant and helpers
export const GUEST_CUSTOMER_NAME = 'Guest';

export function getDisplayCustomerName(customerName: string | null | undefined): string | null {
  if (!customerName) return null;
  const trimmed = customerName.trim();
  if (trimmed === GUEST_CUSTOMER_NAME) return null;
  const parts = trimmed.split(' ');
  return parts.length > 1 ? parts[parts.length - 1]! : trimmed;
}

export function getOrderPrimaryLabel(
  tableNumber: number | string | null | undefined,
  customerName: string | null | undefined,
  orderNumber: string
): string {
  if (tableNumber) return `Table ${tableNumber}`;
  const displayName = getDisplayCustomerName(customerName);
  if (displayName) return displayName;
  return `Order #${formatOrderNumber(orderNumber)}`;
}

// Screen reader text for modifiers
export const MODIFIER_TEXT_PREFIX = {
  removal: 'Remove',
  addition: 'Add',
  allergy: 'ALLERGY',
  temperature: 'Temp',
  substitution: 'Sub',
  default: '',
} as const;
```

#### 1.2 Create ModifierList Component
**Todo:** 057

```typescript
// client/src/components/kitchen/ModifierList.tsx (NEW FILE)

interface ModifierListProps {
  modifiers: Array<{ name: string; price?: number }> | undefined
  size?: 'sm' | 'base' | 'lg' | 'xl'
  className?: string
}

export function ModifierList({ modifiers, size = 'sm', className }: ModifierListProps)
```

#### 1.3 Write Unit Tests for kds.ts
**Todo:** 061

```typescript
// shared/config/__tests__/kds.test.ts (NEW FILE)

// Test suites for:
// - formatOrderNumber() edge cases
// - getModifierType() - ALL allergy keywords (SAFETY CRITICAL)
// - getCardSize() boundary conditions
// - getDisplayCustomerName() null handling
// - getOrderPrimaryLabel() priority logic
```

**Acceptance Criteria Phase 1:**
- [ ] All new functions exported from kds.ts
- [ ] ModifierList component created with props for size/className
- [ ] 100% test coverage for new kds.ts functions
- [ ] Allergy keyword tests cover all 8 keywords
- [ ] TypeScript compiles without errors

---

### Phase 2: Accessibility Fixes (2-3 hours)

Address P1 critical accessibility issues that could block merge.

#### 2.1 Fix FocusOverlay Accessibility
**Todo:** 055

```typescript
// client/src/components/kitchen/FocusOverlay.tsx

// Add:
// 1. useEffect for focus trap
// 2. Escape key handler
// 3. Auto-focus close button on mount
// 4. role="dialog", aria-modal="true", aria-labelledby
// 5. aria-hidden="true" on icons
```

**Implementation Steps:**
1. Add `useRef` for modal container and close button
2. Add `useEffect` with keydown listener for Escape
3. Add focus trap logic for Tab/Shift+Tab
4. Add ARIA attributes to container div
5. Add `aria-hidden="true"` to X icon
6. Add `id` to modal title, reference with `aria-labelledby`

#### 2.2 Fix Allergy Color-Only Indicators
**Todo:** 056

Update ModifierList (created in Phase 1) to handle allergies:

```typescript
// In ModifierList.tsx

{modifiers.map((mod, i) => {
  const modType = getModifierType(mod.name);
  const isAllergy = modType === 'allergy';

  return (
    <div
      key={`${mod.name}-${i}`}
      className={cn(sizeClass, MODIFIER_STYLES[modType])}
      role={isAllergy ? 'alert' : undefined}
    >
      <span aria-hidden="true">{MODIFIER_ICONS[modType]} </span>
      {isAllergy && <span className="sr-only">ALLERGY WARNING: </span>}
      {isAllergy && <span className="font-bold uppercase mr-1">ALLERGY:</span>}
      {mod.name}
    </div>
  );
})}
```

**Acceptance Criteria Phase 2:**
- [ ] Modal traps focus - Tab cycles within modal
- [ ] Escape key closes modal
- [ ] First element auto-focused on open
- [ ] ARIA attributes present on modal
- [ ] Allergy modifiers have visible "ALLERGY:" label
- [ ] Screen reader announces allergy warnings
- [ ] Manual test: Navigate modal with keyboard only
- [ ] Manual test: Identify allergy in grayscale mode

---

### Phase 3: Performance & Cleanup (3-4 hours)

Optimize performance and clean up remaining code issues.

#### 3.1 Add React.memo to OrderGroupCard
**Todo:** 059

```typescript
// client/src/components/kitchen/OrderGroupCard.tsx

// Rename function to OrderGroupCardComponent
// Add at end of file:
export const OrderGroupCard = React.memo(OrderGroupCardComponent, (prev, next) => {
  return (
    prev.orderGroup.order_id === next.orderGroup.order_id &&
    prev.orderGroup.status === next.orderGroup.status &&
    prev.orderGroup.completion_percentage === next.orderGroup.completion_percentage &&
    prev.orderGroup.age_minutes === next.orderGroup.age_minutes &&
    prev.variant === next.variant
  )
})
```

#### 3.2 Move Card Size Calculation to useOrderGrouping
**Todo:** 060

```typescript
// client/src/hooks/useOrderGrouping.ts

// Update OrderGroup interface:
export interface OrderGroup {
  // ... existing fields
  total_modifiers: number
  card_size: CardSize
}

// Calculate during grouping instead of render
```

Then simplify KitchenDisplayOptimized.tsx to use pre-calculated values.

#### 3.3 Update Components to Use Shared Utilities

**OrderCard.tsx:**
- Use `getDisplayCustomerName()` for customer name logic
- Use `ModifierList` component for modifiers

**OrderGroupCard.tsx:**
- Use `getDisplayCustomerName()` for customer name logic
- Use `ModifierList` component for modifiers
- Use `getUrgencyColorClass()` instead of inline ternary (Todo 062)
- Remove unused `statusColors` object (Todo 063)

**FocusOverlay.tsx:**
- Use `getOrderPrimaryLabel()` for primary label
- Use `ModifierList` component for modifiers

#### 3.4 Update KitchenDisplayOptimized.tsx
- Remove inline card size calculations
- Use `orderGroup.card_size` from hook

**Acceptance Criteria Phase 3:**
- [ ] OrderGroupCard wrapped in React.memo
- [ ] Card size pre-calculated in useOrderGrouping hook
- [ ] All 3 components use ModifierList
- [ ] All 3 components use helper functions
- [ ] Unused statusColors removed
- [ ] React DevTools shows memoized components
- [ ] Profiler shows reduced render times

---

## File Change Summary

| File | Changes |
|------|---------|
| `shared/config/kds.ts` | Add CARD_SIZING_CONFIG, GUEST_CUSTOMER_NAME, helper functions, MODIFIER_TEXT_PREFIX |
| `shared/config/__tests__/kds.test.ts` | NEW - Comprehensive test suite |
| `client/src/components/kitchen/ModifierList.tsx` | NEW - Shared modifier rendering |
| `client/src/components/kitchen/FocusOverlay.tsx` | Add accessibility features |
| `client/src/components/kitchen/OrderCard.tsx` | Use shared utilities |
| `client/src/components/kitchen/OrderGroupCard.tsx` | Use shared utilities, add memo, cleanup |
| `client/src/hooks/useOrderGrouping.ts` | Add card_size calculation |
| `client/src/pages/KitchenDisplayOptimized.tsx` | Remove inline calculations |

---

## Dependency Graph

```
Phase 1 (Foundation)
├── 1.1 kds.ts helpers ─────────────────────┐
├── 1.2 ModifierList component ─────────────┼──► Phase 2 & 3 depend on these
└── 1.3 Unit tests ─────────────────────────┘

Phase 2 (Accessibility) - Can run after Phase 1
├── 2.1 FocusOverlay accessibility
└── 2.2 Allergy indicators (uses ModifierList from 1.2)

Phase 3 (Performance) - Can run after Phase 1
├── 3.1 OrderGroupCard memo
├── 3.2 useOrderGrouping card size
├── 3.3 Component updates (uses helpers from 1.1, ModifierList from 1.2)
└── 3.4 KitchenDisplayOptimized cleanup
```

---

## Testing Strategy

### Unit Tests (Phase 1)
```bash
npm run test:server -- shared/config/__tests__/kds.test.ts
```

### Component Tests
```bash
npm run test:client -- --testPathPattern="kitchen"
```

### Manual Testing Checklist
- [ ] Open KDS page, verify cards display correctly
- [ ] Test focus mode overlay with keyboard only
- [ ] Test Escape key closes overlay
- [ ] Verify allergy modifiers show "ALLERGY:" label
- [ ] Test with screen reader (VoiceOver on Mac)
- [ ] View in grayscale mode to verify color isn't only indicator
- [ ] Profile renders with React DevTools

### E2E Tests
```bash
npm run test:e2e -- --grep "kitchen"
```

---

## Rollback Plan

If issues arise after deployment:
1. All changes are additive except removing unused code
2. ModifierList is a new component - can revert to inline rendering
3. Helper functions don't change existing behavior, just centralize it
4. Memo optimization can be reverted by removing React.memo wrapper

---

## Success Metrics

- [ ] Zero WCAG Level A violations in FocusOverlay
- [ ] 100% test coverage for new kds.ts functions
- [ ] ~90 lines of duplicate code eliminated
- [ ] 80%+ reduction in unnecessary re-renders (measured with React Profiler)
- [ ] All 10 review todos addressed

---

## References

### Todo Files
- `todos/055-pending-p1-kds-focus-modal-accessibility.md`
- `todos/056-pending-p1-kds-allergy-color-only.md`
- `todos/057-pending-p2-kds-modifier-rendering-duplication.md`
- `todos/058-pending-p2-kds-guest-name-duplication.md`
- `todos/059-pending-p2-kds-ordergroupcard-missing-memo.md`
- `todos/060-pending-p2-kds-card-size-calculation-in-render.md`
- `todos/061-pending-p2-kds-missing-unit-tests.md`
- `todos/062-pending-p3-kds-urgency-color-duplication.md`
- `todos/063-pending-p3-kds-unused-status-colors.md`
- `todos/064-pending-p3-kds-magic-numbers-card-sizing.md`

### External Resources
- [WAI-ARIA Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [WCAG 1.4.1 Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html)
- [React.memo Documentation](https://react.dev/reference/react/memo)
