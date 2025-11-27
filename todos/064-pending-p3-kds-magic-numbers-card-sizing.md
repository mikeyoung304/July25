# TODO-064: KDS Card Sizing Uses Magic Numbers Without Documentation

## Metadata
- **Status**: pending
- **Priority**: P3 (Nice-to-Have)
- **Issue ID**: 064
- **Tags**: documentation, kds, maintainability, code-review
- **Dependencies**: None
- **Created**: 2025-11-26
- **Source**: Code Review - KDS Declutter Implementation

---

## Problem Statement

The `getCardSize()` function uses magic numbers without clear documentation:
- `0.3` multiplier for modifiers
- `5` threshold for standard
- `10` threshold for wide

It's unclear why these specific values were chosen or how to tune them.

---

## Findings

### Evidence Location

**shared/config/kds.ts (lines 176-182)**:
```typescript
export function getCardSize(itemCount: number, modifierCount: number): CardSize {
  const complexity = itemCount + (modifierCount * 0.3);  // Why 0.3?

  if (complexity <= 5) return 'standard';   // Why 5?
  if (complexity <= 10) return 'wide';      // Why 10?
  return 'large';
}
```

### Questions
1. Why is a modifier worth 30% of an item?
2. What's the rationale for 5 and 10 as thresholds?
3. How would someone tune these for different kitchen layouts?

---

## Recommended Action

Extract to named constants with documentation:

```typescript
/**
 * Card sizing configuration for adaptive KDS layout
 *
 * Rationale:
 * - Each item = 1 unit of complexity (primary content)
 * - Each modifier = 0.3 units (secondary content, less visual impact)
 *
 * Thresholds tuned based on:
 * - Standard (1 col): Typical simple order (1-3 items, few mods)
 * - Wide (2 cols): Medium complexity (4-7 items or heavy mods)
 * - Large (2 cols tall): Complex orders (8+ items, full table)
 *
 * Adjust thresholds based on screen size and kitchen workflow.
 */
export const CARD_SIZING_CONFIG = {
  /** Weight applied to modifier count (0.3 = modifiers are 30% as important as items) */
  MODIFIER_WEIGHT: 0.3,
  /** Maximum complexity for standard (1-column) card */
  STANDARD_MAX_COMPLEXITY: 5,
  /** Maximum complexity for wide (2-column) card */
  WIDE_MAX_COMPLEXITY: 10,
} as const;

/**
 * Calculate card size based on order complexity
 *
 * @param itemCount - Number of items in the order
 * @param modifierCount - Total number of modifiers across all items
 * @returns CardSize for grid layout
 */
export function getCardSize(itemCount: number, modifierCount: number): CardSize {
  const { MODIFIER_WEIGHT, STANDARD_MAX_COMPLEXITY, WIDE_MAX_COMPLEXITY } = CARD_SIZING_CONFIG;

  const complexity = itemCount + (modifierCount * MODIFIER_WEIGHT);

  if (complexity <= STANDARD_MAX_COMPLEXITY) return 'standard';
  if (complexity <= WIDE_MAX_COMPLEXITY) return 'wide';
  return 'large';
}
```

---

## Technical Details

### Affected Files
- `shared/config/kds.ts`

### Benefits
- Self-documenting code
- Easy to tune thresholds
- Clear rationale for future maintainers
- Constants can be exported for testing

---

## Acceptance Criteria

- [ ] Magic numbers extracted to `CARD_SIZING_CONFIG` constant
- [ ] JSDoc comment explains rationale
- [ ] Function uses named constants
- [ ] Existing tests still pass (if any)
- [ ] No visual changes to card sizing behavior

---

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-11-26 | Created | From KDS declutter code review |
