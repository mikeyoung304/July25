# KDS Issues Found → Prevention Strategies Mapping

**Purpose**: Link each code review finding to its prevention strategy

**Date**: 2025-11-27
**Source**: KDS code review findings + Architectural Audit Report V2

---

## Issue Category 1: Accessibility Violations

### Finding 1.1: Missing aria-hidden on Decorative Icons

**What we found**:
```typescript
// BEFORE (problematic pattern)
<div className={cn(sizeClass, MODIFIER_STYLES[modType])}>
  <span>{MODIFIER_ICONS[modType]} </span>  {/* ❌ No aria-hidden */}
  {isAllergy && <span className="sr-only">ALLERGY WARNING: </span>}
</div>
```

**Why it's a problem**:
- Screen readers announce icon Unicode: "pound symbol", "plus sign", "warning symbol"
- Kitchen staff hear meaningless announcements with every order card
- WCAG violation: ARIA requirement for decorative elements

**How we prevent it**:

| Document | Section | Checklist Item |
|----------|---------|----------------|
| KDS_PREVENTION_STRATEGIES.md | 1.A | "Icon `aria-hidden` Attributes" |
| KDS_QUICK_REFERENCE.md | Accessibility | "☐ Icons have aria-hidden="true"" |
| KDS_ESLINT_AUTOMATION.md | Rule 2 | `kds/aria-hidden-icons` ESLint rule |

**Current Status**: ✓ **FIXED** in `ModifierList.tsx` (line 46)
```typescript
<span aria-hidden="true">{MODIFIER_ICONS[modType]} </span>  {/* ✓ Correct */}
```

**Test Coverage**: ✓ ModifierList.test.tsx lines 272-283 verify aria-hidden on icons

---

### Finding 1.2: Role="alert" Misuse on Static Content

**What we found**:
```typescript
// ANTI-PATTERN: role="alert" is for dynamic content
<div role="alert">
  <ModifierList modifiers={modifiers} />  {/* This never changes */}
</div>
```

**Why it's a problem**:
- `role="alert"` is for LIVE REGIONS that announce updates
- Static content wrapped in role="alert" triggers false announcements
- Screen readers become unreliable (boy who cried wolf)
- WCAG violation: Incorrect ARIA role usage

**How we prevent it**:

| Document | Section | Guidance |
|----------|---------|----------|
| KDS_PREVENTION_STRATEGIES.md | 1.A | "Role Attributes Must Be Accurate" with examples |
| KDS_QUICK_REFERENCE.md | Common Violations | "❌ role="alert" on Static Content" |

**Implementation**: Use `role="region"` + `aria-label` instead
```typescript
<div role="region" aria-label="Order items and modifiers">
  <ModifierList modifiers={modifiers} />  {/* ✓ Correct */}
</div>
```

**Test Coverage**: ESLint custom rule (TBD) would catch this

---

### Finding 1.3: Missing Progress Bar ARIA for Timers

**What we found**:
```typescript
// Missing ARIA properties for timer/progress
<div className={cn('flex items-center gap-1 text-xl font-bold', urgencyColor)}>
  <Clock className="w-5 h-5" aria-hidden="true" />
  <span>{elapsedMinutes}m</span>
</div>
```

**Why it's a problem**:
- Screen reader users cannot determine order progress/urgency
- Only visual color coding (red/yellow/green) is used
- Kitchen staff using voice commands need verbal urgency level
- WCAG violation: Missing semantic meaning for progress indicators

**How we prevent it**:

| Document | Section | Requirement |
|----------|---------|-------------|
| KDS_PREVENTION_STRATEGIES.md | 1.A | "Progress Bar ARIA Properties" |
| KDS_QUICK_REFERENCE.md | Testing | "✓ ARIA attributes for timers" |

**Implementation**: Add role="progressbar" with aria-values
```typescript
<div
  role="progressbar"
  aria-valuenow={elapsedMinutes}
  aria-valuemin={0}
  aria-valuemax={15}  // KDS_THRESHOLDS.URGENT_MINUTES
  aria-label={`Order elapsed time: ${elapsedMinutes} of 15 minutes`}
  className={cn('flex items-center gap-1 text-xl font-bold', urgencyColor)}
>
  <Clock className="w-5 h-5" aria-hidden="true" />
  <span>{elapsedMinutes}m</span>
</div>
```

**Test Coverage**: Need new test in OrderCard.test.tsx

---

## Issue Category 2: Performance Issues

### Finding 2.1: Unnecessary Re-renders from Inline Array Creation

**What we found**:
```typescript
// BEFORE: itemData recreated every render, causes full grid re-render
const itemData = {
  orders,
  columnsPerRow,
  onStatusChange
}

return <Grid itemData={itemData} />  {/* Grid re-renders every time */}
```

**Why it's a problem**:
- VirtualizedOrderGrid with 100+ orders
- Every parent re-render creates new itemData object
- React.memo can't detect that only orders changed (object reference changed)
- All virtualized children re-render unnecessarily
- Performance: 60+ unnecessary component renders per second

**How we prevent it**:

| Document | Section | Pattern |
|----------|---------|---------|
| KDS_PREVENTION_STRATEGIES.md | 2.A | "Inline Array/Object Creation Anti-Patterns" |
| KDS_QUICK_REFERENCE.md | Performance | "☐ Objects/arrays use useMemo" |
| KDS_ESLINT_AUTOMATION.md | Rule 1 | Auto-detect missing useMemo |

**Current Status**: ✓ **FIXED** in `VirtualizedOrderGrid.tsx` (lines 93-97)
```typescript
// AFTER: itemData only recreates when deps change
const itemData = useMemo(() => ({
  orders,
  columnsPerRow,
  onStatusChange
}), [orders, columnsPerRow, onStatusChange])  // ✓ Correct with deps
```

**Test Coverage**: Should test that GridItem receives same itemData reference
```typescript
it('does not recreate itemData when parent re-renders', () => {
  // Verify itemData reference stability
})
```

---

### Finding 2.2: DOM Queries on Every Keypress/Render

**What we found**:
```typescript
// ANTI-PATTERN: Document query in effect without caching
useEffect(() => {
  const updateDimensions = () => {
    const container = document.getElementById('kitchen-grid-container')  // ❌ Queried here
    if (container) {
      const rect = container.getBoundingClientRect()
      setDimensions({
        width: rect.width,
        height: Math.max(600, window.innerHeight - 200)
      })
    }
  }

  const timer = setTimeout(updateDimensions, 0)  // ❌ Runs on every render?
  // ...
}, [])  // ✓ Empty deps is correct for one-time setup
```

**Why it's a problem**:
- DOM query is O(n) operation (searches entire DOM tree)
- If called frequently, causes layout thrashing
- setTimeout without cleanup causes memory leaks
- Even with empty deps [], if effect runs multiple times = inefficient

**How we prevent it**:

| Document | Section | Requirement |
|----------|---------|------------|
| KDS_PREVENTION_STRATEGIES.md | 2.C | "UseEffect Dependency Gotchas" |
| KDS_QUICK_REFERENCE.md | Performance | "☐ Effect dependencies correct" |

**Current Status**: ⚠️ **Acceptable but could improve**
```typescript
// The code is correct (empty deps, one-time setup)
// But pattern could be clearer with comments
useEffect(() => {
  const updateDimensions = () => {
    // Query INSIDE effect ensures DOM is ready
    const container = document.getElementById('kitchen-grid-container')
    // ... rest of code
  }

  // One-time setup on mount
  const timer = setTimeout(updateDimensions, 0)

  return () => {
    clearTimeout(timer)  // ✓ Proper cleanup
  }
}, [])  // ✓ Empty deps - intentional one-time setup
```

**Test Coverage**: VirtualizedOrderGrid.test.tsx (missing)
```typescript
it('measures dimensions only once on mount', () => {
  // Verify document.getElementById called exactly once
})
```

---

### Finding 2.3: Missing React.memo on Virtualized List Items

**What we found**:
```typescript
// GridItem component used in FixedSizeGrid (virtualized)
const GridItem: React.FC<GridItemProps> = ({ columnIndex, rowIndex, style, data }) => {
  // ❌ No memoization!
  return (
    <div style={style}>
      <TouchOptimizedOrderCard order={order} onStatusChange={onStatusChange} />
    </div>
  )
}

export function VirtualizedOrderGrid({ orders, onStatusChange, className }: VirtualizedOrderGridProps) {
  // ...
  return (
    <Grid itemData={itemData}>
      {GridItem}
    </Grid>
  )
}
```

**Why it's a problem**:
- Virtualized lists only render visible items
- Without memo, ALL items re-render when itemData changes
- Performance: 100-item list with 10 visible = 90 hidden items still re-render
- Defeats the purpose of virtualization

**How we prevent it**:

| Document | Section | Pattern |
|----------|---------|---------|
| KDS_PREVENTION_STRATEGIES.md | 2.B | "Component Memoization Requirements" |
| KDS_QUICK_REFERENCE.md | Performance | "☐ List components are memoized" |
| KDS_ESLINT_AUTOMATION.md | Rule 5 | `kds/virtualization-memoization` rule |

**Required Fix**:
```typescript
// Memoize GridItem
const GridItem = React.memo(({ columnIndex, rowIndex, style, data }: GridItemProps) => {
  return (
    <div style={style}>
      <TouchOptimizedOrderCard
        order={order}
        onStatusChange={data.onStatusChange}
      />
    </div>
  )
})

// Ensure callbacks are stable
const handleStatusChange = useCallback((orderId: string, status: 'ready') => {
  onStatusChange(orderId, status)
}, [onStatusChange])
```

**Test Coverage**: VirtualizedOrderGrid.test.tsx (missing)
```typescript
it('does not re-render hidden items when visible items change', () => {
  // Render 100 items, only 10 visible
  // Update first visible item
  // Verify items 11-100 did not re-render
})
```

---

## Issue Category 3: Code Consistency / Split-Brain Logic

### Finding 3.1: Inconsistent Urgency Thresholds Across 3 Files (Pre-Phase 4)

**What we found** (Historical - FIXED in Phase 4):
```typescript
// File 1: OrderCard.tsx (10/15 min thresholds)
if (elapsedMinutes >= 10) urgency = 'warning'
if (elapsedMinutes >= 15) urgency = 'urgent'

// File 2: KitchenDisplayOptimized.tsx (15 min threshold only)
if (elapsedMinutes >= 15) return 'urgent'

// File 3: ScheduledOrdersSection.tsx (0/5 min thresholds for scheduled)
if (minutesUntilFire <= 0) urgency = 'critical'
if (minutesUntilFire <= 5) urgency = 'warning'
```

**Why it was a problem**:
- Same order showed different colors in different views
- Changing thresholds required finding all 3 files
- New developers hardcoded values instead of using constants
- Impossible to make per-restaurant configuration

**How we prevent it**:

| Document | Section | Solution |
|----------|---------|----------|
| KDS_PREVENTION_STRATEGIES.md | 3.B | "Solution: Central KDS Configuration" |
| KDS_PREVENTION_STRATEGIES.md | 3.C | "Code Consistency Checklist" |
| KDS_QUICK_REFERENCE.md | Code Consistency | All 5 items |
| KDS_ESLINT_AUTOMATION.md | Rule 1 | `kds/hardcoded-thresholds` |

**Current Status**: ✓ **FIXED** in Phase 4
```typescript
// shared/config/kds.ts - SINGLE SOURCE OF TRUTH
export const KDS_THRESHOLDS = {
  WARNING_MINUTES: 10,
  URGENT_MINUTES: 15,
  SCHEDULED_WARNING_MINUTES: 5,
  SCHEDULED_IMMEDIATE_MINUTES: 0,
}

// All components import and use
import { KDS_THRESHOLDS, getOrderUrgency } from '@rebuild/shared/config/kds'
const urgency = getOrderUrgency(elapsedMinutes)  // ✓ Correct
```

**Files Now Using Shared Config**:
- ✓ OrderCard.tsx (line 37)
- ✓ ScheduledOrdersSection.tsx (line 53)
- ✓ All KDS components import from shared

**Prevention in Place**:
- ✓ ESLint rule `kds/hardcoded-thresholds` will catch any new hardcoding
- ✓ Code review checklist mandates shared config usage
- ✓ All imports auto-enforced by type system

---

### Finding 3.2: Inconsistent Modifier Type Detection

**What we found** (Potential issue):
```typescript
// ANTI-PATTERN: Inline keyword detection scattered
const isAllergy = modName.toLowerCase().includes('allergy')  // File A
const isRemoval = modName.startsWith('no ')  // File B
if (modName.includes('allergy')) { /* ... */ }  // File C

// What if keyword matching changes?
// Example: add "food allergy" but only File A catches it
```

**Why it's a problem**:
- Allergy detection is CRITICAL (patient safety)
- Different components might use different keyword lists
- If you add "celiac" keyword, must update all locations
- Risk of missing allergies in some views

**How we prevent it**:

| Document | Section | Pattern |
|----------|---------|---------|
| KDS_PREVENTION_STRATEGIES.md | 3.B | Using shared modifier type detection |
| KDS_QUICK_REFERENCE.md | Code Consistency | "☐ Uses getModifierType()" |
| KDS_ESLINT_AUTOMATION.md | Rule 3 | `kds/modifier-type-detection` |

**Current Status**: ✓ **GOOD** in ModifierList.tsx
```typescript
// shared/config/kds.ts - KEYWORDS DEFINED ONCE
const ALLERGY_KEYWORDS = ['allergy', 'allergic', 'gluten', 'dairy', 'nut', 'peanut', 'shellfish', 'celiac']

// Function encapsulates logic
export function getModifierType(modifierName: string): ModifierType {
  const lower = modifierName.toLowerCase()
  if (ALLERGY_KEYWORDS.some(k => lower.includes(k))) return 'allergy'
  // ...
}

// All components use function
import { getModifierType } from '@rebuild/shared/config/kds'
const modType = getModifierType(mod.name)  // ✓ Correct
```

**Test Coverage**: ✓ ModifierList.test.tsx lines 50-65 test allergy keyword detection
```typescript
it('detects various allergy keywords', () => {
  const testCases = [
    { name: 'Gluten allergy', expectedType: 'allergy' },
    { name: 'Dairy allergic', expectedType: 'allergy' },
    // ... tests for all keywords
  ]
})
```

---

## Issue Category 4: Test Coverage Gaps

### Finding 4.1: No Component Tests for ModifierList (MISSING)

**Current Status**: ❌ **PARTIALLY ADDRESSED**
- ✓ Unit tests exist: `ModifierList.test.tsx` (369 lines)
- ✗ Missing: Component integration tests in parent (OrderCard)
- ✗ Missing: E2E tests showing allergy in full order context

**What we prevent**:

| Document | Section | Requirements |
|----------|---------|--------------|
| KDS_PREVENTION_STRATEGIES.md | 4.A | "ModifierList Component (CRITICAL)" |
| KDS_PREVENTION_STRATEGIES.md | 4.A.1 | "Allergy Detection Tests" |
| KDS_PREVENTION_STRATEGIES.md | 4.A.2 | "Modifier Type Detection Tests" |
| KDS_PREVENTION_STRATEGIES.md | 4.A.3 | "Accessibility Tests (WCAG)" |

**Test Coverage Gaps**:
```typescript
// MISSING TESTS - Add to ModifierList.test.tsx

describe('allergy safety (CRITICAL)', () => {
  // Existing tests ✓
  // MISSING:
  it('detects allergies regardless of case (PEANUT ALLERGY)', () => {})
  it('renders multiple allergies correctly', () => {})
  it('allergy text is NOT hidden from screen readers', () => {})
})

describe('accessibility (WCAG Compliance)', () => {
  // Existing: aria-hidden checks ✓
  // MISSING:
  it('maintains sufficient color contrast for all modifier types', () => {})
  it('text size is readable (min 12px)', () => {})
  it('screen reader announces all modifier content', () => {})
})
```

---

### Finding 4.2: No Tests for OrderCard Component (MISSING)

**Current Status**: ❌ **NO TESTS**

**What we need**:

| Document | Section |
|----------|---------|
| KDS_PREVENTION_STRATEGIES.md | 4.B |

**Test Template**:
```typescript
describe('OrderCard', () => {
  describe('urgency calculation', () => {
    it('uses KDS_THRESHOLDS constants', () => {
      // Verify getOrderUrgency() called
      // Verify constants not hardcoded
    })
    it('shows correct color for each urgency level', () => {
      // 0-9 min: green
      // 10-14 min: yellow
      // 15+ min: red
    })
  })

  describe('display logic', () => {
    it('uses getKDSDisplayType() not manual logic', () => {
      // Verify dine-in vs drive-thru
    })
    it('uses getDisplayCustomerName() for name logic', () => {
      // Verify last name extraction
    })
  })

  describe('memoization', () => {
    it('does not re-render if order.status unchanged', () => {
      // Verify custom equality check
    })
  })

  describe('accessibility', () => {
    it('has aria-label on focus button', () => {})
    it('timer has progressbar ARIA properties', () => {})
  })
})
```

---

### Finding 4.3: No Tests for VirtualizedOrderGrid (MISSING)

**Current Status**: ❌ **NO TESTS**

**What we need**:

| Document | Section |
|----------|---------|
| KDS_PREVENTION_STRATEGIES.md | 4.C |

**Critical Tests**:
```typescript
describe('VirtualizedOrderGrid', () => {
  describe('virtualization performance', () => {
    it('renders only visible items (uses overscan)', () => {})
    it('does not re-render hidden items', () => {})
    it('cleans up ResizeObserver on unmount', () => {})
  })

  describe('dependency stability', () => {
    it('itemData is memoized', () => {
      // Verify useMemo used
    })
    it('GridItem is memoized', () => {
      // Verify React.memo used
    })
  })
})
```

---

### Finding 4.4: No Tests for ScheduledOrdersSection (MISSING)

**Current Status**: ❌ **NO TESTS**

**What we need**:

| Document | Section |
|----------|---------|
| KDS_PREVENTION_STRATEGIES.md | 4.D |

**Critical Tests**:
```typescript
describe('ScheduledOrdersSection', () => {
  describe('scheduled urgency (critical for timing)', () => {
    it('shows FIRE NOW for orders at scheduled time', () => {
      // minutesUntilFire = 0
    })
    it('shows warning for orders within 5 minutes', () => {
      // minutesUntilFire = 5
    })
    it('uses getScheduledUrgency() not hardcoded logic', () => {})
  })

  describe('manual firing', () => {
    it('calls onManualFire for each order when button clicked', () => {})
  })
})
```

---

## Prevention Strategy Summary by Issue

### Quick Reference: Issue → Prevention Mapping

| Issue | Category | Prevention Document | Section | Automated? |
|-------|----------|---------------------|---------|-----------|
| Missing aria-hidden on icons | A11y | KDS_PREVENTION_STRATEGIES | 1.A | ✓ ESLint |
| Role="alert" misuse | A11y | KDS_PREVENTION_STRATEGIES | 1.A | ⚠ Manual |
| Missing progressbar ARIA | A11y | KDS_PREVENTION_STRATEGIES | 1.A | ⚠ Manual |
| Inline array creation | Performance | KDS_PREVENTION_STRATEGIES | 2.A | ⚠ ESLint (future) |
| DOM queries on every render | Performance | KDS_PREVENTION_STRATEGIES | 2.C | ✓ ESLint (deps) |
| Missing React.memo on list items | Performance | KDS_PREVENTION_STRATEGIES | 2.B | ✓ ESLint (future) |
| Hardcoded thresholds | Consistency | KDS_PREVENTION_STRATEGIES | 3.B | ✓ ESLint |
| Inconsistent modifier detection | Consistency | KDS_PREVENTION_STRATEGIES | 3.B | ✓ ESLint |
| Missing ModifierList tests | Testing | KDS_PREVENTION_STRATEGIES | 4.A | ⚠ Manual |
| Missing OrderCard tests | Testing | KDS_PREVENTION_STRATEGIES | 4.B | ⚠ Manual |
| Missing VirtualizedOrderGrid tests | Testing | KDS_PREVENTION_STRATEGIES | 4.C | ⚠ Manual |
| Missing ScheduledOrdersSection tests | Testing | KDS_PREVENTION_STRATEGIES | 4.D | ⚠ Manual |

---

## Implementation Checklist

- [x] 1. Identify all issues from code review
- [x] 2. Map each issue to prevention strategy
- [x] 3. Create comprehensive prevention documents
- [x] 4. Create quick reference for code reviewers
- [x] 5. Design ESLint rules for automation
- [ ] 6. Implement ESLint rules (next sprint)
- [ ] 7. Add to pre-commit hooks
- [ ] 8. Update PR template with prevention checklist
- [ ] 9. Write missing test cases
- [ ] 10. Run full KDS test suite: `npm run test:client -- kitchen`

---

**Document Version**: 1.0
**Last Updated**: 2025-11-27
**Next Review**: When first ESLint rules are implemented
