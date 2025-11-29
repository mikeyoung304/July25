---
status: pending
priority: p2
issue_id: "100"
tags: [code-review, performance, react, pr-148]
dependencies: []
---

# Performance: Unnecessary Recalculations in TipSelector

## Problem Statement

TipSelector performs repeated calculations on every render: tip amounts for 4 preset buttons are recalculated in the map loop, and derived values run without memoization.

**Why it matters:** The payment modal re-renders frequently during user interaction. Unnecessary calculations impact responsiveness.

## Findings

### Performance Oracle
- **File:** `client/src/components/payments/TipSelector.tsx:33-38, 40-46, 107-128`
- **Issues:**

1. **Tip calculation in render loop (lines 107-128):**
```typescript
{TIP_PRESETS.map(({ percentage, label }) => {
  const amount = calculate_tip(percentage);  // ❌ Called 4x per render
  // ...
})}
```

2. **Derived state on every render (lines 40-46):**
```typescript
const current_tip = is_custom
  ? parseFloat(custom_amount) || 0
  : selected_preset
    ? calculate_tip(selected_preset)
    : 0;

const total = subtotal + tax + current_tip;  // ❌ Recalculated every render
```

## Proposed Solutions

### Option A: Pre-calculate Tip Amounts with useMemo (Recommended)
**Pros:** Single calculation, efficient
**Cons:** Minor code change
**Effort:** Small (10 minutes)
**Risk:** Low

```typescript
// Pre-calculate all tip amounts once
const tipAmounts = useMemo(() =>
  TIP_PRESETS.reduce((acc, { percentage }) => ({
    ...acc,
    [percentage]: Math.round(subtotal * (percentage / 100) * 100) / 100
  }), {} as Record<number, number>),
  [subtotal]
);

// Use in render
{TIP_PRESETS.map(({ percentage, label }) => {
  const amount = tipAmounts[percentage];  // ✅ O(1) lookup
  // ...
})}
```

### Option B: Memoize Derived Values
**Pros:** React-idiomatic
**Cons:** More code
**Effort:** Small
**Risk:** Low

```typescript
const current_tip = useMemo(() =>
  is_custom
    ? parseFloat(custom_amount) || 0
    : selected_preset
      ? calculate_tip(selected_preset)
      : 0,
  [is_custom, custom_amount, selected_preset, calculate_tip]
);
```

## Recommended Action

<!-- Filled during triage -->

## Technical Details

- **Affected Files:** `client/src/components/payments/TipSelector.tsx`
- **Lines:** 33-38, 40-46, 107-128
- **Components:** TipSelector

## Acceptance Criteria

- [ ] Tip amounts pre-calculated with useMemo
- [ ] Derived values (current_tip, total) memoized
- [ ] No performance regression in React DevTools profiler

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-28 | Created | Code review finding from PR #148 |

## Resources

- **PR:** https://github.com/mikeyoung304/July25/pull/148
- **React Docs:** useMemo best practices
