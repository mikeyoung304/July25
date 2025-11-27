# TODO-072: ModifierList Component Has No Tests (Safety Critical)

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 072
- **Tags**: testing, kds, safety, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Test Coverage Analyst

---

## Problem Statement

The `ModifierList` component renders safety-critical allergy information but has **zero test coverage**. This component uses `role="alert"`, screen reader text, and visual styling that must work correctly to protect customers with food allergies.

---

## Findings

### Evidence Location

**Missing file**: `client/src/components/kitchen/__tests__/ModifierList.test.tsx`

### Current Coverage
- Unit tests exist for `getModifierType()` in shared config
- No component tests verify React rendering behavior
- No accessibility tests verify ARIA implementation

### Risk
- Allergy warnings could fail silently
- Accessibility features could break without detection
- Visual styling regression could go unnoticed

---

## Proposed Solutions

### Option A: Create comprehensive component tests (RECOMMENDED)
**Pros:** Full coverage, safety assurance
**Cons:** Time investment
**Effort:** Medium (1-2 hours)
**Risk:** None

Test cases to include:
1. Allergy modifiers render with proper styling
2. Screen reader text is present for allergies
3. Empty/undefined modifiers handled correctly
4. Size prop applies correct classes
5. Non-allergy modifiers render without role="alert"

### Example Test File
```typescript
import { render, screen } from '@testing-library/react'
import { ModifierList } from '../ModifierList'

describe('ModifierList', () => {
  describe('allergy safety (CRITICAL)', () => {
    it('renders visible ALLERGY label for allergy modifiers', () => {
      const mods = [{ name: 'Peanut allergy', price: 0 }]
      render(<ModifierList modifiers={mods} />)
      expect(screen.getByText('ALLERGY:')).toBeInTheDocument()
    })

    it('provides screen reader text for allergy warnings', () => {
      const mods = [{ name: 'Gluten allergy', price: 0 }]
      render(<ModifierList modifiers={mods} />)
      expect(screen.getByText(/ALLERGY WARNING/i)).toHaveClass('sr-only')
    })
  })

  describe('edge cases', () => {
    it('returns null for empty modifier list', () => {
      const { container } = render(<ModifierList modifiers={[]} />)
      expect(container.firstChild).toBeNull()
    })
  })
})
```

---

## Recommended Action

Option A - Create comprehensive component tests

---

## Technical Details

### Affected Files
- NEW: `client/src/components/kitchen/__tests__/ModifierList.test.tsx`

### Test Framework
- Vitest + React Testing Library (existing setup)

---

## Acceptance Criteria

- [ ] Component test file created
- [ ] All allergy rendering scenarios tested
- [ ] Accessibility features tested
- [ ] Edge cases (empty, undefined) tested
- [ ] Tests pass in CI

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review test coverage findings |
