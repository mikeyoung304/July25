---
title: "Test Failures After KDS Component Refactoring - Outdated Assertions"
category: test-failures
tags:
  - tests
  - kds
  - kitchen-display
  - component-updates
  - test-maintenance
severity: medium
component:
  - client/src/modules/kitchen/components/__tests__/KDSOrderCard.test.tsx
  - client/src/modules/orders/components/__tests__/OrderCard.test.tsx
symptoms:
  - Tests expect "Complete Order" button but component renders "Mark Ready"
  - Tests expect "Dine-In" badge but component renders "DINE-IN" (uppercase)
  - Tests expect "Order #001" but formatOrderNumber() pads to 4 digits "#0001"
  - Tests expect bullet points but ModifierList uses dynamic icons (aria-hidden)
  - Tests check for status badge but component shows type badge instead
root_cause: Component implementation evolved during KDS refactoring but test expectations were not updated
date_solved: 2025-11-27
related_commits:
  - 88c202e5
  - 9b659fb0
---

# Test Failures After KDS Component Refactoring

## Problem Summary

13 tests were failing in `KDSOrderCard.test.tsx` and `OrderCard.test.tsx` after component updates. The tests were outdated and didn't match the current component implementation.

## Symptoms

- `TestingLibraryElementError: Unable to find an element with the text: Complete Order`
- `TestingLibraryElementError: Unable to find an element with the text: Dine-In`
- `TestingLibraryElementError: Unable to find an element with the text: Order #001`
- `TestingLibraryElementError: Unable to find an element with the text: • Extra cheese`

## Root Cause Analysis

The OrderCard component underwent refactoring that changed several UI elements:

1. **Button text**: "Complete Order" → "Mark Ready"
2. **Type badge**: "Dine-In" → "DINE-IN" (uppercase)
3. **Order number**: Uses `formatOrderNumber()` which pads to 4 digits
4. **Modifiers**: ModifierList renders type-specific icons (aria-hidden)
5. **Display logic**: `getKDSDisplayType()` determines table vs customer display

Tests were asserting against the old UI strings rather than current implementation.

## Solution

### 1. Update Button Text Assertions

```typescript
// Before (failing)
expect(screen.getByText('Complete Order')).toBeInTheDocument()

// After (passing)
expect(screen.getByText('Mark Ready')).toBeInTheDocument()
```

### 2. Update Type Badge Assertions

```typescript
// Before (failing)
expect(screen.getByText('Dine-In')).toBeInTheDocument()

// After (passing)
expect(screen.getByText('DINE-IN')).toBeInTheDocument()
```

### 3. Update Order Number Format

```typescript
// Before (failing) - expects 3 digits
expect(screen.getByText(/Order #001/)).toBeInTheDocument()

// After (passing) - formatOrderNumber pads to 4 digits
expect(screen.getByText(/Order #0001/)).toBeInTheDocument()
```

### 4. Update Modifier Assertions

```typescript
// Before (failing) - exact text with bullet
expect(screen.getByText('• Extra cheese')).toBeInTheDocument()

// After (passing) - regex to handle aria-hidden icons
expect(screen.getByText(/Extra cheese/)).toBeInTheDocument()
```

## Files Changed

- `client/src/modules/kitchen/components/__tests__/KDSOrderCard.test.tsx`
- `client/src/modules/orders/components/__tests__/OrderCard.test.tsx`

## Verification

```bash
# Run specific tests
npx vitest --run src/modules/kitchen/components/__tests__/KDSOrderCard.test.tsx

# Run full suite
npm test
```

**Result**: 964 tests passing (605 client + 359 server)

## Prevention Strategies

### 1. Use Resilient Test Patterns

```typescript
// Fragile: exact text match
expect(screen.getByText('Complete Order')).toBeInTheDocument()

// Resilient: role-based query
expect(screen.getByRole('button', { name: /ready/i })).toBeInTheDocument()

// Resilient: data-testid
expect(screen.getByTestId('mark-ready-button')).toBeInTheDocument()

// Resilient: regex for text with icons
expect(screen.getByText(/Extra cheese/)).toBeInTheDocument()
```

### 2. Code Review Checklist

- [ ] Did UI changes include test updates?
- [ ] Are test assertions resilient to formatting changes?
- [ ] Do tests verify behavior rather than implementation details?

### 3. Workflow Improvements

- Run tests after UI changes
- Update tests in same PR as component changes
- Use regex patterns for dynamic content

## Related Resources

- Component: `client/src/components/kitchen/OrderCard.tsx`
- ModifierList: `client/src/components/kitchen/ModifierList.tsx`
- KDS Config: `shared/config/kds.ts`
- Lesson: `.claude/lessons/CL-DB-002-constraint-drift-prevention.md` (similar drift pattern)

## Key Takeaway

When refactoring UI components, **update tests immediately**. Use flexible matchers (regex, role queries) instead of exact text matches when content includes dynamic formatting or icons.
