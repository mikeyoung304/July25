---
status: done
priority: p2
issue_id: "250"
tags: [code-review, testing, architecture]
dependencies: []
---

# P2: Dynamic Import Pattern Creates Module Loading Inconsistency

## Problem Statement

Multiple tests in `payment-idempotency.test.ts` use `await import()` inside test bodies, creating a different module instance than the top-level `vi.mock()`.

**Why it matters:**
1. Inconsistent mock state between tests
2. Module caching issues where some tests get real modules, others get mocked
3. Harder to reason about which mock is being used
4. Pattern is used ~8 times in this file, creating potential for flaky tests

## Findings

**Location:** `payment-idempotency.test.ts` lines 379, 407, 435, etc.

```typescript
it('should reject payment for cancelled orders', async () => {
  // Dynamic import inside test - problematic
  const { OrdersService } = await import('../../src/services/orders.service');
  (OrdersService.getOrder as any).mockResolvedValue({...});
```

The module is already mocked at the top level (lines 30-33):
```typescript
vi.mock('../../src/services/orders.service', () => ({
  OrdersService: { getOrder: vi.fn() },
  getRestaurantTaxRate: vi.fn()
}));
```

## Proposed Solutions

### Option A: Use Top-Level Import (Recommended)

Remove dynamic imports and use the already-imported mock reference:

```typescript
// At top of file, after vi.mock():
import { OrdersService, getRestaurantTaxRate } from '../../src/services/orders.service';

// In tests:
it('should reject payment for cancelled orders', async () => {
  // No dynamic import needed
  vi.mocked(OrdersService.getOrder).mockResolvedValue({...});
```

**Pros:** Simpler, consistent, no module loading issues
**Cons:** Slightly different mock syntax
**Effort:** Small (8 places to update)
**Risk:** Low

### Option B: Import Once in beforeEach

```typescript
describe('payment validation', () => {
  let OrdersService: typeof import('../../src/services/orders.service').OrdersService;

  beforeEach(async () => {
    OrdersService = (await import('../../src/services/orders.service')).OrdersService;
  });
});
```

**Pros:** Ensures fresh import each test
**Cons:** Still using dynamic import, more complex
**Effort:** Medium
**Risk:** Low

## Recommended Action

_Awaiting triage decision._

## Technical Details

**Affected Files:**
- `server/tests/services/payment-idempotency.test.ts` (lines 379, 407, 435, 461, 487, 520, 553, 599)

## Acceptance Criteria

- [ ] No dynamic imports inside test bodies
- [ ] All tests use consistent mock reference
- [ ] Tests pass deterministically

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review architecture analysis |

## Resources

- Vitest mocking documentation
- payment-idempotency.test.ts
