# TODO: Add bounds validation for modifier price_adjustment

**Priority**: P3 (Nice-to-have)
**Status**: Pending
**Created**: 2025-11-24
**Category**: Data Validation

## Problem

The `price_adjustment` field in modifier options is not validated for reasonable bounds, creating risk of precision loss or unrealistic prices with extreme values.

**Location**: `server/src/features/voice/realtime/tools/realtime-menu-tools.ts:170`

```typescript
price_adjustment: option.price_adjustment || 0
```

## Current Behavior

- No validation on price_adjustment magnitude
- Extreme values could cause:
  - Floating-point precision loss
  - Unrealistic menu prices
  - Potential database storage issues

## Proposed Solution

### 1. Add Database Constraint

```sql
ALTER TABLE modifier_options
ADD CONSTRAINT price_adjustment_bounds
CHECK (price_adjustment >= -100 AND price_adjustment <= 100);
```

### 2. Add Runtime Validation

```typescript
// In realtime-menu-tools.ts
const MAX_PRICE_ADJUSTMENT = 100;
const MIN_PRICE_ADJUSTMENT = -100;

function validatePriceAdjustment(adjustment: number): number {
  if (adjustment < MIN_PRICE_ADJUSTMENT || adjustment > MAX_PRICE_ADJUSTMENT) {
    logger.warn('Price adjustment out of bounds', {
      adjustment,
      min: MIN_PRICE_ADJUSTMENT,
      max: MAX_PRICE_ADJUSTMENT
    });
    return Math.max(MIN_PRICE_ADJUSTMENT, Math.min(MAX_PRICE_ADJUSTMENT, adjustment));
  }
  return adjustment;
}

// Usage
price_adjustment: validatePriceAdjustment(option.price_adjustment || 0)
```

## Acceptance Criteria

- [ ] Database CHECK constraint added to modifier_options table
- [ ] Runtime validation in realtime-menu-tools.ts
- [ ] Validation constants defined (±$100 range)
- [ ] Warning logged for out-of-bounds values
- [ ] Migration tested with existing data
- [ ] Unit tests for edge cases (±100, ±1000)

## Files to Modify

- `server/src/features/voice/realtime/tools/realtime-menu-tools.ts`
- `supabase/migrations/NNNN_add_modifier_price_bounds.sql`

## Testing Strategy

```typescript
describe('Modifier price validation', () => {
  it('accepts valid adjustments within ±$100', () => {
    expect(validatePriceAdjustment(50)).toBe(50);
    expect(validatePriceAdjustment(-50)).toBe(-50);
  });

  it('clamps extreme positive values', () => {
    expect(validatePriceAdjustment(500)).toBe(100);
  });

  it('clamps extreme negative values', () => {
    expect(validatePriceAdjustment(-500)).toBe(-100);
  });

  it('handles boundary values', () => {
    expect(validatePriceAdjustment(100)).toBe(100);
    expect(validatePriceAdjustment(-100)).toBe(-100);
  });
});
```

## Notes

- ±$100 range chosen as reasonable maximum for restaurant modifiers
- Database constraint ensures data integrity at storage level
- Runtime validation provides defensive programming
- Logging helps identify problematic data sources

## References

- Code review finding: P3 data validation issues
- Related: Database schema validation patterns
