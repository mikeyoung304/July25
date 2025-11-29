# TODO-073: Allergy Detection Tests Incomplete (Safety Critical)

## Metadata
- **Status**: pending
- **Priority**: P2 (Important)
- **Issue ID**: 073
- **Tags**: testing, kds, safety, food-safety, code-review
- **Dependencies**: None
- **Created**: 2025-11-27
- **Source**: Code Review - Test Coverage Analyst

---

## Problem Statement

The allergy keyword detection tests only cover 8 basic cases. For a **food safety critical** feature, this coverage is dangerously incomplete. Missing tests for:

- FDA Top 9 allergens (milk, eggs, fish, shellfish, tree nuts, peanuts, wheat, soybeans, sesame)
- Case sensitivity variations
- Partial word matches that should NOT trigger (e.g., "gallery")
- International terms (coeliac, lactose intolerant)

---

## Findings

### Evidence Location

**shared/config/__tests__/kds.test.ts (lines 41-51)**:
```typescript
it('detects all common allergens', () => {
  // Only 8 keywords tested
  expect(getModifierType('allergy warning')).toBe('allergy')
  expect(getModifierType('allergic reaction')).toBe('allergy')
  expect(getModifierType('gluten free please')).toBe('allergy')
  expect(getModifierType('no dairy - intolerant')).toBe('allergy')
  expect(getModifierType('nut free')).toBe('allergy')
  expect(getModifierType('no peanuts')).toBe('allergy')
  expect(getModifierType('shellfish allergy')).toBe('allergy')
  expect(getModifierType('celiac disease')).toBe('allergy')
})
```

### Missing Test Coverage
1. **FDA Top 9**: milk, eggs, fish, soy/soybeans, sesame not explicitly tested
2. **Case variations**: No mixed case tests (e.g., "PEANUT ALLERGY")
3. **False positives**: No tests for words containing allergen substrings ("gallery", "peanut butter flavor")
4. **International**: "coeliac" spelled differently than "celiac"

---

## Proposed Solutions

### Option A: Expand allergy test suite (RECOMMENDED)
**Pros:** Comprehensive safety coverage
**Cons:** More tests to maintain
**Effort:** Small (30 minutes)
**Risk:** None

```typescript
describe('allergy detection - comprehensive (FOOD SAFETY CRITICAL)', () => {
  const FDA_TOP_9 = [
    'milk', 'eggs', 'fish', 'shellfish', 'tree nuts',
    'peanuts', 'wheat', 'soybeans', 'sesame'
  ]

  it.each(FDA_TOP_9)('detects FDA allergen: %s', (allergen) => {
    expect(getModifierType(`No ${allergen}`)).toBe('allergy')
    expect(getModifierType(`${allergen} free`)).toBe('allergy')
    expect(getModifierType(`${allergen} allergy`)).toBe('allergy')
  })

  it('handles case insensitivity', () => {
    expect(getModifierType('PEANUT ALLERGY')).toBe('allergy')
    expect(getModifierType('Gluten Free')).toBe('allergy')
    expect(getModifierType('NUT ALLERGY')).toBe('allergy')
  })

  it('does NOT match non-allergen words', () => {
    expect(getModifierType('art gallery')).toBe('default')
    expect(getModifierType('metallurgy class')).toBe('default')
  })

  it('detects international spellings', () => {
    expect(getModifierType('coeliac disease')).toBe('allergy')
  })
})
```

---

## Recommended Action

Option A - Expand allergy test suite

---

## Technical Details

### Affected Files
- `shared/config/__tests__/kds.test.ts`
- Possibly `shared/config/kds.ts` (if ALLERGY_KEYWORDS needs expansion)

### Current ALLERGY_KEYWORDS
```typescript
const ALLERGY_KEYWORDS = ['allergy', 'allergic', 'gluten', 'dairy', 'nut', 'peanut', 'shellfish', 'celiac']
```

May need to add: 'milk', 'egg', 'fish', 'soy', 'wheat', 'sesame', 'coeliac', 'intolerant'

---

## Acceptance Criteria

- [ ] All FDA Top 9 allergens have explicit tests
- [ ] Case sensitivity tested
- [ ] False positive tests added
- [ ] ALLERGY_KEYWORDS expanded if needed
- [ ] All tests pass

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-27 | Created | From code review test coverage findings |
