# KDS Prevention Strategies: Quick Reference

**Use this for rapid code reviews. Full details in `KDS_PREVENTION_STRATEGIES.md`**

---

## Accessibility (5-minute checklist)

```
☐ Icons have aria-hidden="true"
☐ Allergies have sr-only + visible text
☐ No role="alert" on static content
☐ Buttons have aria-label
☐ Min 44×44px touch targets
☐ Heading hierarchy correct (h1→h2→h3, no gaps)
```

**Failure = WCAG violation + failing audit**

---

## Performance (3-minute checklist)

```
☐ List components are memoized (React.memo)
☐ Callbacks use useCallback
☐ Objects/arrays use useMemo
☐ Effect dependencies correct ([])
☐ No inline object creation: const data = {} in render
☐ Virtualization: rowHeight matches card height
```

**Failure = 60+ unnecessary re-renders/second on large order lists**

---

## Code Consistency (2-minute checklist)

```
☐ KDS_THRESHOLDS, not hardcoded 10/15/5
☐ getOrderUrgency(), not inline if statements
☐ getModifierType(), not inline keyword matching
☐ KDS_TYPE_COLORS, not hardcoded color strings
☐ MODIFIER_ICONS, not hardcoded Unicode
☐ MODIFIER_STYLES, not inline Tailwind classes
```

**All imports from: `@rebuild/shared/config/kds`**

**Failure = Threshold change requires code redeploy**

---

## Testing (10-minute checklist)

### For ModifierList
```typescript
✓ Allergy detection (must pass)
✓ Screen reader text (must pass)
✓ Icon styling (must pass)
✓ Icon aria-hidden (must pass)
✓ Edge cases: empty, undefined, duplicates
✓ Case insensitivity

✗ Missing: Multiple allergies in one item
✗ Missing: Allergy priority verification
```

### For OrderCard / ScheduledOrdersSection
```
✗ NO TESTS FOUND - Required before shipping
  - Urgency calculation with thresholds
  - Display logic (table/name/number)
  - Memoization behavior
  - CSS class application
```

### For VirtualizedOrderGrid
```
✗ NO TESTS FOUND - Required before shipping
  - Virtualization (only visible items render)
  - Dimension calculation
  - ResizeObserver cleanup
  - Grid layout math
```

---

## Files to Audit

**Core Components** (must pass checklist):
- ✓ `client/src/components/kitchen/ModifierList.tsx` - Good
- ✓ `client/src/components/kitchen/OrderCard.tsx` - Good
- ✓ `client/src/components/kitchen/ScheduledOrdersSection.tsx` - Good
- ✓ `shared/config/kds.ts` - Single source of truth

**Need Testing**:
- ✗ `client/src/components/kitchen/VirtualizedOrderGrid.tsx` - No tests
- ✗ `client/src/components/kitchen/TouchOptimizedOrderCard.tsx` - Needs audit (hardcoded thresholds)

**Config Audit** (2025-11-27):
- ✓ Thresholds consolidated
- ✓ Modifier types centralized
- ✓ Icons and styles defined
- ✓ Display type logic in shared function

---

## Common Violations & Fixes

### ❌ Hardcoded Threshold
```typescript
if (elapsedMinutes >= 15) return 'urgent'
```
✅ **Fix**: Import `KDS_THRESHOLDS`, use `getOrderUrgency()`

---

### ❌ Inline Modifier Detection
```typescript
const isAllergy = modName.toLowerCase().includes('allergy')
```
✅ **Fix**: Use `getModifierType(modName) === 'allergy'`

---

### ❌ Hardcoded Colors
```typescript
const color = urgency === 'urgent' ? 'text-red-600' : 'text-green-700'
```
✅ **Fix**: Use `getUrgencyColorClass(urgency)`

---

### ❌ Missing aria-hidden
```tsx
<Clock className="w-5 h-5" />  {/* ❌ Announces "clock" */}
```
✅ **Fix**: Add `aria-hidden="true"`
```tsx
<Clock className="w-5 h-5" aria-hidden="true" />
```

---

### ❌ role="alert" on Static Content
```tsx
<div role="alert">
  <ModifierList modifiers={mods} />  {/* Never changes */}
</div>
```
✅ **Fix**: Use `role="region"` + `aria-label`
```tsx
<div role="region" aria-label="Order modifiers">
  <ModifierList modifiers={mods} />
</div>
```

---

### ❌ Callback Without useCallback
```tsx
const handleClick = () => onStatusChange(orderId, 'ready')  // New function every render
return <GridItem {...props} onStatusChange={handleClick} />  // Child re-renders every time
```
✅ **Fix**: Wrap with useCallback
```tsx
const handleClick = useCallback(() => {
  onStatusChange(orderId, 'ready')
}, [onStatusChange, orderId])
```

---

### ❌ Object Recreation in Render
```tsx
const itemData = { orders, columnsPerRow, onStatusChange }  // New object every render
return <Grid itemData={itemData} />  // All items re-render
```
✅ **Fix**: Memoize the object
```tsx
const itemData = useMemo(() => ({
  orders, columnsPerRow, onStatusChange
}), [orders, columnsPerRow, onStatusChange])
```

---

## Testing Commands

```bash
# Run all KDS tests
npm run test:client -- "kitchen"

# ModifierList tests only
npm run test:client -- ModifierList.test

# Coverage report
npm run test:client -- --coverage ModifierList

# E2E KDS tests
npm run test:e2e -- kds

# WCAG accessibility check
npx axe https://localhost:5173/order/grow/kitchen
```

---

## When to Reject a PR

**INSTANT REJECT (Don't merge)**:
1. Hardcoded threshold value (10, 15, 5) without using `KDS_THRESHOLDS`
2. `role="alert"` on static divs (not live region)
3. Icon without `aria-hidden="true"`
4. Allergy modifier without screen reader text
5. Missing test coverage for ModifierList
6. Memoized component without custom equality check documented
7. Component expects prop that could be large object (not memoized)
8. VirtualizedOrderGrid with undefined virtualization
9. Effect dependencies incorrect (linter warning)

**REQUEST CHANGES**:
1. Inline modifier type detection instead of using `getModifierType()`
2. Hardcoded colors instead of `KDS_TYPE_COLORS`
3. Hardcoded urgency calculation instead of `getOrderUrgency()`
4. Icon span without `aria-hidden` (even if functioning)
5. No touch target min-size on interactive elements
6. Test coverage <85% for critical paths

**APPROVE WITH COMMENTS**:
1. Good use of `useMemo` for dependency stability
2. Well-documented custom `React.memo` equality
3. Comprehensive test coverage including edge cases
4. Proper accessibility implementation with rationale

---

## Key Numbers to Remember

| Metric | Value | Source |
|--------|-------|--------|
| **Warning Threshold** | 10 minutes | `KDS_THRESHOLDS.WARNING_MINUTES` |
| **Urgent Threshold** | 15 minutes | `KDS_THRESHOLDS.URGENT_MINUTES` |
| **Scheduled Warning** | 5 minutes | `KDS_THRESHOLDS.SCHEDULED_WARNING_MINUTES` |
| **Scheduled Fire** | 0 minutes | `KDS_THRESHOLDS.SCHEDULED_IMMEDIATE_MINUTES` |
| **Min Touch Target** | 44×44 px | WCAG AA standard |
| **Min Color Contrast** | 4.5:1 | WCAG AA standard |
| **Required Test Coverage** | 85% | For critical components |
| **Virtualization Overscan** | 2 rows, 1 col | Current config |

---

## Resources

- Full guide: `docs/prevention/KDS_PREVENTION_STRATEGIES.md`
- Audit findings: `docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md` (KDS section, line 203+)
- Config source: `shared/config/kds.ts`
- Test example: `client/src/components/kitchen/__tests__/ModifierList.test.tsx`
- ADR reference: `docs/architecture/ADR-001-snake-case.md`, `ADR-004-multi-tenancy.md`

---

## Last Review: 2025-11-27

For updates, search "2025-11-27" in codebase or check git log for KDS commits.
