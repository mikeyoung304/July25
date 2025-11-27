# KDS Prevention Strategies
## Based on Code Review Findings

**Last Updated**: 2025-11-27
**Scope**: Kitchen Display System (KDS) accessibility, performance, code consistency, and test coverage
**Related**: docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md (KDS Grade: B, 15 findings)

---

## 1. Accessibility Checklist for KDS Code Reviews

### A. ARIA and Semantic HTML Requirements

**Before merging ANY accessibility-related KDS code, verify:**

- [ ] **Icon `aria-hidden` Attributes**
  - All decorative icons MUST have `aria-hidden="true"` attribute
  - This prevents screen readers from announcing icon Unicode characters
  - **File Examples**:
    - `OrderCard.tsx` ✓ (line 72: `Clock icon aria-hidden="true"`)
    - `ModifierList.tsx` ✓ (line 46: `MODIFIER_ICONS[modType] aria-hidden="true"`)
  - **Test**: Run screen reader (NVDA/JAWS) and verify no icon announcements
  - **Failure Mode**: Users hear "pound symbol" "plus sign" "warning symbol" on every order card

- [ ] **Screen Reader Text for Decorative Elements**
  - Add `sr-only` class for screen reader-only announcements where icons have meaning
  - Example: Allergy warnings MUST have visible + screen reader text
  - **File Examples**:
    - `ModifierList.tsx` ✓ (lines 47-48: allergy gets sr-only + visible label)
    - `OrderCard.tsx` ✓ (line 83: focus button has `aria-label="Expand order details"`)
  - **Test**: Browser DevTools → Inspect → Check computed styles for `sr-only` (position: absolute; width: 1px)
  - **Failure Mode**: Accessibility scanning tools report missing screen reader context

- [ ] **Role Attributes Must Be Accurate**
  - NEVER use `role="alert"` for static content (it's for live regions that announce updates)
  - Only use `role="alert"` when content changes dynamically and needs announcement
  - Use `role="region"` + `aria-label` for custom containers
  - **Invalid Pattern** (DO NOT DO):
    ```tsx
    <div role="alert">
      <ModifierList modifiers={modifiers} />  {/* Doesn't change, not an alert */}
    </div>
    ```
  - **Valid Pattern** (DO THIS):
    ```tsx
    <div role="region" aria-label="Order items and modifiers">
      <ModifierList modifiers={modifiers} />
    </div>
    ```
  - **Test**: Run axe DevTools or WAVE validator
  - **Failure Mode**: False alerts in screen readers, confusing UX

- [ ] **Progress Bar ARIA Properties**
  - If implementing timer progress bars, use `role="progressbar"`:
    ```tsx
    <div
      role="progressbar"
      aria-valuenow={elapsedMinutes}
      aria-valuemin={0}
      aria-valuemax={15}  // your threshold
      aria-label="Order elapsed time: 10 of 15 minutes"
    >
      {/* visual bar */}
    </div>
    ```
  - **Test**: axe DevTools should report 0 aria violations
  - **Failure Mode**: Screen reader users cannot determine order urgency

- [ ] **Heading Hierarchy**
  - KDS sections must have proper hierarchy (h1 → h2 → h3, no gaps)
  - Order cards: h3 for primary identifier (table/name)
  - Modifiers: no heading, they're list items
  - **File Examples**:
    - `OrderCard.tsx` (line 91-100): h3 for table/name → correct
    - `ScheduledOrdersSection.tsx` (line 40): h3 for "Scheduled Orders" → correct
  - **Test**: `npm run typecheck` + headings plugin in axe
  - **Failure Mode**: Screen reader users cannot navigate order structure

### B. Keyboard Navigation & Focus

- [ ] **Touch/Keyboard Interactive Elements**
  - All buttons must have min 44px × 44px hit target (mobile accessibility standard)
  - Example in `OrderCard.tsx` (line 80): `min-w-[44px] min-h-[44px]`
  - [ ] Focus visible (`:focus-visible` pseudo-class, not removed)
  - [ ] Tab order is logical (left-to-right, top-to-bottom)
  - **Test**: Press Tab 10 times, verify focus moves through order cards logically
  - **Failure Mode**: KDS cannot be operated on touch devices or with keyboard

- [ ] **Aria-label for Icon Buttons**
  - Every icon-only button must have `aria-label` describing its action
  - Example in `OrderCard.tsx` (line 81): `aria-label="Expand order details"`
  - **Test**: Remove CSS, verify button purpose is still clear from text
  - **Failure Mode**: Icon buttons are unusable via screen reader

---

## 2. Performance Patterns: React Memoization Best Practices

### A. Inline Array/Object Creation Anti-Patterns

**PROBLEM**: Creating objects/arrays in render causes unnecessary re-renders in child components

**Found in VirtualizedOrderGrid (line 93-97)**:
```tsx
// ANTI-PATTERN: itemData is recreated every render
const itemData = useMemo(() => ({
  orders,
  columnsPerRow,
  onStatusChange
}), [orders, columnsPerRow, onStatusChange])  // ✓ Correct deps
```
This is actually correct! But common mistake is missing `useMemo` entirely:
```tsx
// BAD: itemData changes every render, Grid re-renders
const itemData = { orders, columnsPerRow, onStatusChange }

// GOOD: itemData only changes when deps change
const itemData = useMemo(() => ({
  orders, columnsPerRow, onStatusChange
}), [orders, columnsPerRow, onStatusChange])
```

### B. Component Memoization Requirements

**Pattern 1: OrderCard Memoization** (correctly done in `OrderCard.tsx` line 159-163)
```tsx
// With custom equality check (strict object identity would re-render on every parent render)
export const OrderCard = React.memo(OrderCardComponent, (prevProps, nextProps) => {
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.status === nextProps.order.status &&
         prevProps.order.updated_at === nextProps.order.updated_at
})
```

**Checklist for Memoized Components**:
- [ ] Is component in a virtualized list? → MUST memoize
- [ ] Does it receive callback props? → Use `useCallback` to ensure memo works
- [ ] Does it receive object props? → Use `useMemo` for object equality
- [ ] Custom equality function? → Document why (e.g., "large order objects, only care about id/status")

**Pattern 2: Callback Memoization** (needs improvement in some components)
```tsx
// BAD: New function every render, breaks memoization
const handleClick = () => onStatusChange(order.id, 'ready')

// GOOD: Same function reference, memoization works
const handleClick = useCallback(() => {
  onStatusChange(order.id, 'ready')
}, [onStatusChange, order.id])
```

### C. UseEffect Dependency Gotchas

**Found in VirtualizedOrderGrid (line 51-80)**:
```tsx
useEffect(() => {
  const updateDimensions = () => { /* ... */ }
  // ANTI-PATTERN: document query happens INSIDE effect, not in dependency
  const container = document.getElementById('kitchen-grid-container')
  if (container) {
    resizeObserver.observe(container)
  }
}, [])  // ✓ Empty deps is correct because we want to run once
```

**Prevention Rules**:
- [ ] If you query DOM, query INSIDE the effect (not outside)
- [ ] If you call setState inside effect, include setState if it's not wrapped by useCallback
- [ ] Async operations (fetch/WebSocket)? Use AbortController for cleanup
  ```tsx
  useEffect(() => {
    const controller = new AbortController()

    fetchOrders({ signal: controller.signal })

    return () => controller.abort()  // Cancel on unmount
  }, [])
  ```

### D. Virtualization Performance Checklist

For grid/list components (VirtualizedOrderGrid), verify:
- [ ] Using `react-window` FixedSizeGrid/FixedSizeList (correct in file)
- [ ] `overscanRowCount` set (line 129: `overscanRowCount={2}`)
- [ ] `overscanColumnCount` set (line 130: `overscanColumnCount={1}`)
- [ ] Card height matches `rowHeight` config (file: 300px cards, 300px rowHeight ✓)
- [ ] Card width matches `columnWidth` config (file: 340px cards, 340px columnWidth ✓)
- [ ] Memoized GridItem component to prevent re-renders
- [ ] `itemData` is memoized (prevents all items from re-rendering)

---

## 3. Code Consistency: Shared Configuration Usage

### A. The Problem: Scattered Urgency Thresholds

**ISSUE**: Before Phase 4, urgency thresholds were defined in 3 different places with inconsistent values:
- `OrderCard.tsx`: 10/15 minutes
- `KitchenDisplayOptimized.tsx`: 15 minutes
- `ScheduledOrdersSection.tsx`: 0/5 minutes

**This caused bugs**: Orders would show different colors in different views!

### B. Solution: Central KDS Configuration

All KDS configuration now lives in **`shared/config/kds.ts`** (420 lines)

**Core constants**:
```typescript
export const KDS_THRESHOLDS = {
  WARNING_MINUTES: 10,      // GREEN → YELLOW
  URGENT_MINUTES: 15,       // YELLOW → RED
  SCHEDULED_WARNING_MINUTES: 5,    // scheduled orders
  SCHEDULED_IMMEDIATE_MINUTES: 0,  // scheduled orders fire now
}

export const MODIFIER_STYLES = {
  removal: 'text-red-600',
  addition: 'text-green-600',
  allergy: 'bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold',
  // ...
}
```

### C. Code Consistency Checklist

**Before merging any KDS changes, verify**:

- [ ] **Using shared thresholds, NOT hardcoded values**
  ```tsx
  // BAD: Hardcoded threshold
  if (elapsedMinutes >= 15) return 'urgent'

  // GOOD: Use shared config
  import { KDS_THRESHOLDS, getOrderUrgency } from '@rebuild/shared/config/kds'
  const urgency = getOrderUrgency(elapsedMinutes)
  ```
  - **Files checked**: OrderCard ✓, ScheduledOrdersSection ✓, TouchOptimizedOrderCard needs audit

- [ ] **Using shared modifier type detection**
  ```tsx
  // BAD: Inline regex or keyword matching
  if (modName.toLowerCase().includes('allergy')) { /* ... */ }

  // GOOD: Use shared function
  import { getModifierType } from '@rebuild/shared/config/kds'
  const type = getModifierType(modName)
  ```
  - **Files checked**: ModifierList ✓

- [ ] **Using shared styling functions**
  ```tsx
  // BAD: Inline color logic
  const cardColor = urgency === 'urgent' ? 'bg-red-50' : 'bg-white'

  // GOOD: Use shared function
  import { getUrgencyCardClass } from '@rebuild/shared/config/kds'
  const cardClass = getUrgencyCardClass(urgency)
  ```
  - **Files checked**: OrderCard ✓, ScheduledOrdersSection ✓

- [ ] **Modifier icons/prefixes use shared constants**
  ```tsx
  // BAD: Hardcoded Unicode
  <span>{modType === 'allergy' ? '⚠️' : '•'}</span>

  // GOOD: Use MODIFIER_ICONS constant
  import { MODIFIER_ICONS } from '@rebuild/shared/config/kds'
  <span>{MODIFIER_ICONS[modType]}</span>
  ```
  - **Files checked**: ModifierList ✓

- [ ] **Display types use KDS_TYPE_COLORS**
  ```tsx
  // BAD: Hardcoded colors per order type
  if (order.type === 'dine-in') {
    return 'bg-teal-50 border-teal-200'
  }

  // GOOD: Use shared constants
  import { getKDSDisplayType, KDS_TYPE_COLORS } from '@rebuild/shared/config/kds'
  const displayType = getKDSDisplayType(order)
  const colors = KDS_TYPE_COLORS[displayType]
  return `${colors.bg} ${colors.border}`
  ```

### D. Configuration Change Process

If urgency thresholds need to change (e.g., restaurant wants 12/18 min instead of 10/15):

1. **Edit in one place**: `shared/config/kds.ts` lines 25-49
2. **All components auto-update**: OrderCard, ScheduledOrdersSection, FocusOverlay, etc.
3. **No code deployment needed**: Just restart servers
4. **Future**: Make configurable per-restaurant in database

**Never do this**:
- Don't hardcode thresholds in components (requires code change + redeploy)
- Don't duplicate config values (causes sync bugs)
- Don't create new urgency levels without updating ALL three functions (getOrderUrgency, getUrgencyCardClass, getUrgencyAccentClass)

---

## 4. Test Coverage Requirements for Safety-Critical Components

### A. ModifierList Component (CRITICAL - Safety-Related)

**Why critical**: Allergy modifiers are life-threatening if missed. This is patient safety.

**Current Coverage**: Good (369 test lines), but has gaps

**Required Test Categories**:

#### 1. Allergy Detection Tests
```typescript
describe('allergy safety (CRITICAL)', () => {
  // Already have these ✓
  it('renders visible ALLERGY label for allergy modifiers', () => {})
  it('provides screen reader text for allergy warnings', () => {})
  it('applies allergy styling classes', () => {})
  it('renders allergy warning emoji icon', () => {})
  it('detects various allergy keywords', () => {})

  // MISSING - Add these
  it('detects allergies regardless of case (PEANUT ALLERGY, peanut allergy)', () => {})
  it('prioritizes allergy over other modifier types', () => {}) // existing ✓
  it('renders multiple allergies correctly', () => {})
  it('handles allergy with other modifiers in same order item', () => {})
  it('allergy text is NOT hidden from screen readers', () => {
    const { container } = render(<ModifierList modifiers={[{name: 'Gluten allergy'}]} />)
    const srText = screen.getByText('ALLERGY WARNING:')
    expect(srText).not.toHaveClass('hidden')  // sr-only is visible to screen readers
  })
})
```

#### 2. Modifier Type Detection Tests (Font/Color Critical for Kitchen)
```typescript
describe('modifier type detection', () => {
  // Existing tests ✓ - removal, addition, temperature, substitution, default

  // MISSING - Add edge cases
  it('detects removal keywords ONLY at start of string', () => {
    // "extra no sauce" should be addition (starts with "extra"), not removal
  })
  it('prioritizes type detection order correctly', () => {
    // allergy > removal > addition > temperature > substitution
  })
  it('handles whitespace and punctuation in modifiers', () => {
    // "  no  onions  " should still detect as removal
  })
})
```

#### 3. Accessibility Tests (WCAG Compliance)
```typescript
describe('accessibility (WCAG 2.1 AA)', () => {
  // Existing tests ✓
  it('marks icons as aria-hidden', () => {})
  it('provides semantic HTML structure', () => {})

  // MISSING - Add these
  it('maintains sufficient color contrast for all modifier types', () => {
    // ModifierList has red/green/orange/blue - verify WCAG AA passes
    // Use axe-core or manual contrast checking
  })
  it('screen reader announces all modifier content', () => {
    // Use @testing-library/user-event to navigate
  })
  it('text size is readable (min 12px recommended)', () => {
    // Check computed styles for text-xs (should be 12px), text-sm (14px)
  })
})
```

#### 4. Edge Cases (Production Safety)
```typescript
describe('edge cases', () => {
  // Existing tests ✓
  it('returns null for empty/undefined modifiers', () => {})
  it('handles modifiers without price property', () => {})

  // MISSING - Add these
  it('handles very long modifier names (100+ chars)', () => {})
  it('handles special characters in modifiers (emoji, accents)', () => {})
  it('truncates/wraps modifier text if too long for card width', () => {})
  it('does not double-announce allergies to screen readers', () => {
    // sr-only text + visible text = should announce once
  })
})
```

### B. OrderCard Component

**Current coverage**: No tests found ❌

**Required tests**:
```typescript
describe('OrderCard', () => {
  describe('urgency calculation', () => {
    it('shows green (normal) for orders 0-9 minutes old', () => {})
    it('shows yellow (warning) for orders 10-14 minutes old', () => {})
    it('shows red (urgent) for orders 15+ minutes old', () => {})
    it('uses KDS_THRESHOLDS constants, not hardcoded values', () => {
      // Verify getOrderUrgency() is called, not inline calculation
    })
  })

  describe('display logic', () => {
    it('shows table number for dine-in orders', () => {})
    it('shows customer name for drive-thru orders', () => {})
    it('shows order number as fallback', () => {})
    it('uses getKDSDisplayType() not manual logic', () => {})
  })

  describe('memoization', () => {
    it('does not re-render if order status unchanged', () => {})
    it('re-renders only when order id/status/updated_at changes', () => {})
  })
})
```

### C. VirtualizedOrderGrid Component

**Current coverage**: No tests found ❌

**Required tests**:
```typescript
describe('VirtualizedOrderGrid', () => {
  describe('virtualization performance', () => {
    it('renders only visible items (overscan buffer)', () => {})
    it('shows loading state while measuring dimensions', () => {})
    it('handles resize events without re-measuring DOM on every call', () => {})
  })

  describe('grid layout', () => {
    it('calculates columns based on container width', () => {})
    it('uses memoized itemData to prevent child re-renders', () => {})
    it('passes correct onStatusChange callback to GridItem', () => {})
  })

  describe('edge cases', () => {
    it('shows empty state when no orders', () => {})
    it('handles container width of 0 (loading state)', () => {})
    it('cleans up ResizeObserver on unmount', () => {})
  })
})
```

### D. ScheduledOrdersSection Component

**Current coverage**: No tests found ❌

**Required tests**:
```typescript
describe('ScheduledOrdersSection', () => {
  describe('scheduled urgency (critical for timing)', () => {
    it('shows FIRE NOW for orders at/past scheduled time', () => {})
    it('shows warning for orders within 5 minutes of fire time', () => {})
    it('shows normal state for orders 5+ minutes away', () => {})
    it('uses getScheduledUrgency() not hardcoded logic', () => {})
  })

  describe('manual firing', () => {
    it('calls onManualFire for each order in group when button clicked', () => {})
    it('button text changes based on urgency (Fire Now vs Fire Early)', () => {})
  })
})
```

### E. Test Coverage Requirements

**Before merging KDS components, verify**:

- [ ] All tests passing: `npm run test:quick`
- [ ] Coverage > 85% for critical components (allergy detection, urgency calc)
  ```bash
  npm run test:client -- --coverage ModifierList OrderCard ScheduledOrdersSection
  ```
- [ ] Accessibility tests included (screen reader, ARIA, keyboard)
- [ ] Performance tests (memoization, no unnecessary re-renders)
- [ ] Edge cases covered (empty, undefined, malformed data)
- [ ] Constants used from `shared/config/kds.ts`, not hardcoded

**Run comprehensive KDS test suite**:
```bash
npm run test:client -- ".*kitchen.*"  # All kitchen components
npm run test:client -- ModifierList.test
```

**WCAG Accessibility automated testing**:
```bash
npm run test:e2e -- kds  # Full accessibility scan during E2E
```

---

## 5. Code Review Checklist Template

Use this for ALL KDS code reviews:

### Pre-Merge Verification

**Accessibility**:
- [ ] Icons have `aria-hidden="true"`
- [ ] Screen reader text uses `sr-only` for announcements
- [ ] No misuse of `role="alert"` on static content
- [ ] Buttons have `aria-label` or visible text
- [ ] Min touch target 44×44px
- [ ] Heading hierarchy is correct

**Performance**:
- [ ] Components in lists are memoized
- [ ] Callbacks use `useCallback`
- [ ] Objects/arrays use `useMemo`
- [ ] Effect dependencies are correct
- [ ] No inline object/array creation in render
- [ ] Virtualization config matches card dimensions

**Code Consistency**:
- [ ] Uses `KDS_THRESHOLDS`, not hardcoded numbers
- [ ] Uses `getOrderUrgency()`, not inline logic
- [ ] Uses `getModifierType()`, not inline detection
- [ ] Uses `KDS_TYPE_COLORS`, not hardcoded colors
- [ ] Uses `MODIFIER_ICONS`, not hardcoded Unicode
- [ ] Uses `MODIFIER_STYLES`, not inline classes

**Test Coverage**:
- [ ] Allergy detection tests included
- [ ] Urgency calculation tested with thresholds
- [ ] Memoization verified with snapshots
- [ ] Edge cases covered (empty, undefined, malformed)
- [ ] Accessibility assertions included
- [ ] WCAG compliance verified (axe-core)

**Documentation**:
- [ ] New config values documented in `kds.ts` comment block
- [ ] Changes documented in commit message
- [ ] If changing thresholds, update docs/DEPLOYMENT.md#kds-configuration

---

## 6. Incident Prevention: Learning from Phase 4

### A. What Went Wrong

Before Phase 4 consolidation (Architectural Audit Report V2, line 206):
1. **3 different urgency thresholds** in different files → color conflicts
2. **No single source of truth** for KDS config → impossible to maintain
3. **Scattered modifier type detection** → allergy keywords missed in some views
4. **Performance issues from re-renders** → no memoization discipline

### B. How We Prevent Recurrence

**Process Change**: Add to pre-commit checks
```bash
# .husky/pre-commit (add this)
npm run lint:kds  # Verify all KDS files import from shared/config/kds.ts
npm run test:kds  # Run KDS tests before allowing commit
```

**Code Review Discipline**:
- Any hardcoded threshold number (10, 15, 5) → instant rejection
- Any modifier type detection logic → must use `getModifierType()`
- Any KDS colors outside `KDS_TYPE_COLORS` → instant rejection

**Architecture Lock**:
```typescript
// In shared/config/kds.ts, add this comment block
/**
 * LOCKED CONFIGURATION
 *
 * These values are single source of truth for KDS behavior.
 * DO NOT duplicate these in component files.
 * DO NOT create new KDS_*.ts files without design review.
 *
 * Add features by extending this file, not by creating new files.
 *
 * Files importing these constants (inverse dependency):
 * - client/src/components/kitchen/OrderCard.tsx
 * - client/src/components/kitchen/ModifierList.tsx
 * - client/src/components/kitchen/ScheduledOrdersSection.tsx
 * - client/src/modules/kitchen/components/KDSOrderCard.tsx
 *
 * @see docs/prevention/KDS_PREVENTION_STRATEGIES.md section 3
 */
```

---

## 7. Future: Multi-Restaurant Configuration

**Current state**: Hard-coded thresholds work for single restaurant

**Future improvement** (Post Phase 4): Make thresholds per-restaurant
```typescript
// When restaurant_id is added to KDS context:
const { restaurantConfig } = useRestaurantKDSConfig(restaurantId)
const urgency = getOrderUrgency(elapsed, {
  warningMinutes: restaurantConfig.kds_warning_minutes,  // 10 (default)
  urgentMinutes: restaurantConfig.kds_urgent_minutes,    // 15 (default)
})
```

This would require:
1. Add columns to restaurant config table
2. Update `getOrderUrgency()` signature to accept options
3. Make hook context available in all KDS components
4. No component code changes except hook invocation

---

## Summary: Prevention Guardrails

| Category | Key Prevention | Files Affected | Review Effort |
|----------|----------------|-----------------|---------------|
| **Accessibility** | Icon `aria-hidden`, allergy screen reader text, no role="alert" misuse | All KDS components | 5 min per PR |
| **Performance** | Memoization for lists, callbacks, useMemo for objects, effect deps | OrderCard, VirtualizedOrderGrid, ModifierList | 5 min per PR |
| **Consistency** | Import from `shared/config/kds.ts`, never hardcode thresholds/colors/icons | All KDS components | 3 min per PR |
| **Test Coverage** | 85%+ critical paths, allergy detection, urgency calc, accessibility tests | All KDS components | 15 min per PR |

**Total PR review time with checklist**: ~30 minutes (scalable to ~5 min with automation)

**Automation opportunity**: Create ESLint rules to catch:
- Hardcoded `KDS_THRESHOLDS` values (10, 15, 5)
- Missing `aria-hidden` on icon spans
- Direct threshold calculations instead of `getOrderUrgency()`
