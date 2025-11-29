# TODO-061: KDS New Utilities Missing Unit Tests

## Metadata
- **Status**: complete
- **Priority**: P2 (Important)
- **Issue ID**: 061
- **Tags**: testing, kds, quality, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Completed**: 2025-11-28
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

The new KDS utilities added to `shared/config/kds.ts` have **no unit test coverage**:
- `formatOrderNumber()` - Order number formatting
- `getModifierType()` - Modifier type detection (includes **allergy detection**)
- `getCardSize()` - Card sizing calculation

The `getModifierType()` function is **safety-critical** as it detects food allergies. A bug in allergy detection could have serious consequences.

---

## Findings

### Evidence Location

**shared/config/kds.ts (lines 176-266)** - New untested functions:

```typescript
// No tests for these functions:
export function getCardSize(itemCount: number, modifierCount: number): CardSize
export function formatOrderNumber(orderNumber: string): string
export function getModifierType(modifierName: string): ModifierType
```

### Existing Test File
- `shared/config/__tests__/kds.test.ts` may not exist
- Need to verify and create if missing

### Risk Assessment
| Function | Risk if Bug | Coverage Needed |
|----------|-------------|-----------------|
| `getModifierType()` | HIGH - Food safety | Critical |
| `formatOrderNumber()` | LOW - Display only | Standard |
| `getCardSize()` | LOW - Layout only | Standard |

---

## Proposed Solutions

### Option A: Comprehensive Test Suite (Recommended)
**Pros**: Full coverage, documents expected behavior
**Cons**: Time investment
**Effort**: Medium (2-3 hours)
**Risk**: None - only adds tests

### Option B: Minimal Tests for Safety-Critical Only
**Pros**: Faster, covers highest risk
**Cons**: Incomplete coverage
**Effort**: Small (1 hour)
**Risk**: Low - partial coverage

---

## Recommended Action

**Option A** - Create comprehensive test suite:

```typescript
// shared/config/__tests__/kds.test.ts (add to existing or create)

import {
  formatOrderNumber,
  getModifierType,
  getCardSize,
  GUEST_CUSTOMER_NAME,
  getDisplayCustomerName,
  getOrderPrimaryLabel
} from '../kds'

describe('formatOrderNumber', () => {
  it('extracts last segment from hyphenated order number', () => {
    expect(formatOrderNumber('20251105-0004')).toBe('0004')
    expect(formatOrderNumber('ABC-123-0042')).toBe('0042')
  })

  it('pads short numbers to 4 digits', () => {
    expect(formatOrderNumber('20251105-4')).toBe('0004')
    expect(formatOrderNumber('20251105-42')).toBe('0042')
  })

  it('handles order numbers without hyphens', () => {
    expect(formatOrderNumber('0004')).toBe('0004')
    expect(formatOrderNumber('42')).toBe('0042')
  })

  it('returns 0000 for empty/null input', () => {
    expect(formatOrderNumber('')).toBe('0000')
    expect(formatOrderNumber(null as unknown as string)).toBe('0000')
    expect(formatOrderNumber(undefined as unknown as string)).toBe('0000')
  })
})

describe('getModifierType', () => {
  describe('allergy detection (SAFETY CRITICAL)', () => {
    it('detects explicit allergy keywords', () => {
      expect(getModifierType('Gluten allergy')).toBe('allergy')
      expect(getModifierType('PEANUT ALLERGY')).toBe('allergy')
      expect(getModifierType('allergic to dairy')).toBe('allergy')
    })

    it('detects common allergens', () => {
      expect(getModifierType('No gluten')).toBe('allergy') // gluten keyword
      expect(getModifierType('dairy free')).toBe('allergy')
      expect(getModifierType('nut free please')).toBe('allergy')
      expect(getModifierType('no peanuts')).toBe('allergy')
      expect(getModifierType('shellfish allergy')).toBe('allergy')
      expect(getModifierType('celiac disease')).toBe('allergy')
    })

    it('prioritizes allergy over other types', () => {
      // "No gluten" could be removal, but allergy takes priority
      expect(getModifierType('No gluten - allergy')).toBe('allergy')
      expect(getModifierType('Extra careful - nut allergy')).toBe('allergy')
    })
  })

  describe('removal detection', () => {
    it('detects removal keywords at start', () => {
      expect(getModifierType('No onions')).toBe('removal')
      expect(getModifierType('without pickles')).toBe('removal')
      expect(getModifierType('remove tomato')).toBe('removal')
      expect(getModifierType('hold the mayo')).toBe('removal')
    })

    it('does not match removal in middle of string', () => {
      expect(getModifierType('say no to waste')).toBe('default')
    })
  })

  describe('addition detection', () => {
    it('detects addition keywords at start', () => {
      expect(getModifierType('Extra cheese')).toBe('addition')
      expect(getModifierType('Add bacon')).toBe('addition')
      expect(getModifierType('Double meat')).toBe('addition')
      expect(getModifierType('Triple shot')).toBe('addition')
    })
  })

  describe('temperature detection', () => {
    it('detects cooking temperatures', () => {
      expect(getModifierType('Medium rare')).toBe('temperature')
      expect(getModifierType('Well done')).toBe('temperature')
      expect(getModifierType('Rare steak')).toBe('temperature')
      expect(getModifierType('Extra hot')).toBe('temperature')
    })
  })

  describe('substitution detection', () => {
    it('detects substitution keywords', () => {
      expect(getModifierType('Sub fries for salad')).toBe('substitution')
      expect(getModifierType('Substitute oat milk')).toBe('substitution')
      expect(getModifierType('Swap bun for lettuce')).toBe('substitution')
    })
  })

  describe('default fallback', () => {
    it('returns default for unrecognized modifiers', () => {
      expect(getModifierType('Light ice')).toBe('default')
      expect(getModifierType('On the side')).toBe('default')
      expect(getModifierType('Split in half')).toBe('default')
    })
  })
})

describe('getCardSize', () => {
  it('returns standard for simple orders (complexity <= 5)', () => {
    expect(getCardSize(1, 0)).toBe('standard')
    expect(getCardSize(3, 2)).toBe('standard') // 3 + 0.6 = 3.6
    expect(getCardSize(5, 0)).toBe('standard')
  })

  it('returns wide for medium orders (complexity 5-10)', () => {
    expect(getCardSize(6, 0)).toBe('wide')
    expect(getCardSize(5, 5)).toBe('wide')  // 5 + 1.5 = 6.5
    expect(getCardSize(8, 5)).toBe('wide')  // 8 + 1.5 = 9.5
  })

  it('returns large for complex orders (complexity > 10)', () => {
    expect(getCardSize(10, 5)).toBe('large')  // 10 + 1.5 = 11.5
    expect(getCardSize(15, 0)).toBe('large')
    expect(getCardSize(8, 10)).toBe('large') // 8 + 3 = 11
  })

  it('weights modifiers at 0.3x items', () => {
    // 5 items + 0 mods = 5.0 (standard)
    // 5 items + 1 mod = 5.3 (wide)
    expect(getCardSize(5, 0)).toBe('standard')
    expect(getCardSize(5, 1)).toBe('wide')
  })
})
```

---

## Technical Details

### Affected Files
- `shared/config/__tests__/kds.test.ts` (create or extend)

### Test Categories
1. **Safety Critical**: `getModifierType()` allergy detection
2. **Data Formatting**: `formatOrderNumber()` edge cases
3. **Layout Logic**: `getCardSize()` threshold boundaries

### Test Coverage Goals
- 100% line coverage for new functions
- Edge case coverage for null/undefined inputs
- Boundary testing for thresholds (5, 10)

---

## Acceptance Criteria

- [ ] Test file exists at `shared/config/__tests__/kds.test.ts`
- [ ] `formatOrderNumber()` tests cover edge cases
- [ ] `getModifierType()` tests cover ALL allergy keywords
- [ ] `getModifierType()` tests verify priority order
- [ ] `getCardSize()` tests cover threshold boundaries
- [ ] All tests pass
- [ ] Coverage report shows 100% for new functions

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |
| 2025-11-28 | Verified Complete | Comprehensive test suite exists in shared/config/__tests__/kds.test.ts with 249 lines covering: formatOrderNumber (4 tests), getModifierType (42 tests including FDA Top 9 allergens), getCardSize (4 tests), getDisplayCustomerName (5 tests), getOrderPrimaryLabel (4 tests). All safety-critical allergy detection paths tested. |

---

## Resources

- [Jest Testing Framework](https://jestjs.io/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
