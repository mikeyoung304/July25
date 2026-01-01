---
status: done
priority: p2
issue_id: "251"
tags: [code-review, testing, quality]
dependencies: []
---

# P2: DRY Violation - Repeated Supabase Mock Setup

## Problem Statement

The same deeply-nested Supabase mock factory chain is duplicated **24+ times** across payment test files:

- `payment-calculation.test.ts`: 15 occurrences
- `payment-idempotency.test.ts`: 9 occurrences

**Why it matters:**
1. ~200 lines of duplicated code
2. Maintenance burden - if Supabase API changes, all 24 places need updating
3. Makes tests harder to read
4. Inconsistent setup could lead to subtle bugs

## Findings

**Duplicated Pattern:**
```typescript
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { tax_rate: 0.0825 },
        error: null
      })
    })
  })
});
(supabase.from as any) = mockFrom;
```

**Locations:**
- payment-calculation.test.ts: lines 70-80, 111-121, 158-166, 225-236, 293-303, 325-335, 359-369, 391-401, 423-434, 457-467, 489-500, 529-539, 564-575, 704-714, 745-756
- payment-idempotency.test.ts: lines 70-80, 141-151, 482-492, 524-534, 569-580, 617-627, 663-673, 704-714

## Proposed Solutions

### Option A: Extract to Helper Function in Each File (Recommended)

```typescript
// At top of test file
function setupTaxRateMock(taxRate = 0.0825, error: any = null) {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: error ? null : { tax_rate: taxRate },
          error
        })
      })
    })
  });
  (supabase.from as any) = mockFrom;
  return mockFrom;
}

// In tests
it('should calculate total', async () => {
  setupTaxRateMock(0.0825);
  // ... rest of test
});
```

**Pros:** Simple, no new files, immediate improvement
**Cons:** Helper still duplicated between files
**Effort:** Small
**Risk:** None

### Option B: Create Shared Test Utilities Module

```typescript
// server/tests/utils/payment-test-helpers.ts
export const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
export const TEST_ORDER_ID = '22222222-2222-2222-2222-222222222222';

export function setupSupabaseTaxRateMock(taxRate = 0.0825, error = null) { ... }
export function createTestOrder(items: OrderItem[], overrides?: Partial<Order>) { ... }
```

**Pros:** Single source of truth, consistent across all tests
**Cons:** More files, need to maintain exports
**Effort:** Medium
**Risk:** Low

### Option C: Use Vitest Setup Files

Configure global test utilities in vitest.config.ts:

```typescript
// vitest.setup.ts
globalThis.setupTaxRateMock = (taxRate) => { ... };
```

**Pros:** Available everywhere automatically
**Cons:** Implicit dependency, harder to discover
**Effort:** Medium
**Risk:** Low

## Recommended Action

_Awaiting triage decision. Option A is quickest, Option B is most maintainable long-term._

## Technical Details

**Affected Files:**
- `server/tests/services/payment-calculation.test.ts`
- `server/tests/services/payment-idempotency.test.ts`
- (New) `server/tests/utils/payment-test-helpers.ts` if Option B

## Acceptance Criteria

- [ ] No more than 1 copy of Supabase mock chain per file
- [ ] Helper function is well-documented
- [ ] All existing tests still pass
- [ ] Reduces test file line count by ~100 lines each

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review code quality analysis |

## Resources

- payment-calculation.test.ts
- payment-idempotency.test.ts
- Vitest setup files documentation
