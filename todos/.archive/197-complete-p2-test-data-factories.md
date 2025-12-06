---
status: complete
priority: p2
issue_id: "197"
tags: [testing, architecture, code-quality, code-review]
dependencies: ["193"]
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# Missing Test Data Factories

## Problem Statement

Test files create inline mock data objects, leading to inconsistent test data, difficulty updating schemas, and verbose test setup.

## Findings

### Pattern Recognition Agent Discovery

**Current Approach:**
```typescript
// Each test creates its own mock data
const mockOrder = {
  id: 'test-123',
  restaurant_id: '11111111-1111-1111-1111-111111111111',
  status: 'pending',
  total_amount: 29.99,
  // ... repeated in every test
};
```

**Problems:**
- Data shape changes require updates across many files
- Inconsistent field values between tests
- Hard to create variations (paid vs unpaid, with items vs empty)

## Proposed Solution

**Effort:** 3-4 hours | **Risk:** Low

Create factory functions for test data:

```typescript
// client/src/test/factories/order.factory.ts
import { Order } from '@rebuild/shared/types';

const defaultOrder: Order = {
  id: 'test-order-1',
  restaurant_id: '11111111-1111-1111-1111-111111111111',
  status: 'pending',
  total_amount: 0,
  items: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function createOrder(overrides: Partial<Order> = {}): Order {
  return { ...defaultOrder, ...overrides };
}

export function createPaidOrder(overrides: Partial<Order> = {}): Order {
  return createOrder({
    status: 'completed',
    payment_status: 'paid',
    total_amount: 29.99,
    ...overrides,
  });
}
```

**Usage:**
```typescript
import { createOrder, createPaidOrder } from '@/test/factories/order.factory';

test('displays order total', () => {
  const order = createOrder({ total_amount: 49.99 });
  // ...
});
```

## Technical Details

**Factories to Create:**
- `order.factory.ts` - Orders with items
- `menu-item.factory.ts` - Menu items with modifiers
- `user.factory.ts` - Users with roles
- `restaurant.factory.ts` - Restaurant configs
- `payment.factory.ts` - Payment intents

## Acceptance Criteria

- [x] Factory functions created for main domain entities
- [x] Factories use correct types from shared package
- [ ] Test files updated to use factories (future migration)
- [x] README added explaining factory usage

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review |
| 2025-12-05 | Completed | Created client/src/test/factories/ with order, menu-item, user, restaurant factories |

## Resources

- Pattern Recognition agent findings
- [Factory Pattern for Tests](https://kentcdodds.com/blog/test-data-bot)
