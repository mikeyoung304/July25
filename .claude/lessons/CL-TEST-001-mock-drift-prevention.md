# CL-TEST-001: Test Mock Drift Prevention Strategies

**Status:** Active Prevention Pattern
**Updated:** 2025-11-28
**Related Issues:** Mock objects becoming out of sync with TypeScript interfaces, test failures from interface changes

## Problem Statement

When interfaces and types change during development, test mocks can become stale and no longer match the actual contract, leading to:
- False test passes (mocks hide real issues)
- Runtime errors caught too late in development
- Type-checking gaps in test code
- Wasted debugging time chasing phantom issues

### Real Example from Codebase

```typescript
// ✅ Order interface updated
export interface Order {
  id: string;
  restaurant_id: string;  // Added new required field
  order_number: string;
  // ... other fields
}

// ❌ Test mock not updated
const mockOrders = [
  {
    id: '1',
    order_number: '001',  // Missing restaurant_id!
    // ... other fields
  }
];
```

The test still passes but real production code fails at runtime.

## Prevention Strategies

### 1. TypeScript Strict Mode in Tests

**Goal:** Catch mock drift at compile time, not runtime

**Implementation:**

```typescript
// ✅ CORRECT: Properly typed mock using 'as const' assertion
const mockOrder: Order = {
  id: '1',
  restaurant_id: 'rest-1',
  order_number: '001',
  table_number: '5',
  items: [],
  status: 'new',
  type: 'online',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subtotal: 10.00,
  tax: 0.80,
  total: 10.80,
  payment_status: 'pending'
}

// ❌ WRONG: No type annotation
const mockOrder = {
  id: '1',
  order_number: '001'
  // Missing fields go undetected!
}

// ❌ WRONG: Using 'any' type
const mockOrder: any = { /* ... */ }
```

**Enforcement:**

- Never use `any` for mock objects in tests
- Always provide explicit type annotations from shared types
- Enable strict TypeScript checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "strictBindCallApply": true,
    "strictFunctionTypes": true,
    "alwaysStrict": true
  }
}
```

**Check Existing Tests:**

```bash
# Find mocks without type annotations
grep -r "vi.fn()" client/src --include="*.test.ts" | grep -v ": vi.Mock"

# Find any usage in tests
grep -r ": any" client/src --include="*.test.ts"
```

---

### 2. Centralized Mock Factories

**Goal:** Single source of truth for mock creation

**Implementation:**

Create factory functions in a dedicated `tests/factories/` directory:

```typescript
// tests/factories/order.factory.ts
import { Order, OrderItem } from 'shared/types/order.types';

export function createMockOrder(overrides?: Partial<Order>): Order {
  const now = new Date().toISOString();
  return {
    id: '1',
    restaurant_id: 'rest-1',
    order_number: '001',
    table_number: '5',
    items: [createMockOrderItem()],
    status: 'new',
    type: 'online',
    created_at: now,
    updated_at: now,
    subtotal: 10.00,
    tax: 0.80,
    total: 10.80,
    payment_status: 'pending',
    ...overrides
  };
}

export function createMockOrderItem(overrides?: Partial<OrderItem>): OrderItem {
  return {
    id: '1',
    menu_item_id: '1',
    name: 'Test Item',
    quantity: 1,
    price: 10,
    subtotal: 10,
    ...overrides
  };
}

// tests/factories/index.ts - export all factories
export * from './order.factory';
export * from './user.factory';
export * from './restaurant.factory';
```

**Usage in Tests:**

```typescript
import { createMockOrder, createMockOrderItem } from 'tests/factories';

describe('OrderService', () => {
  it('should filter orders by status', async () => {
    const mockOrders = [
      createMockOrder({ status: 'new' }),
      createMockOrder({ status: 'preparing', order_number: '002' })
    ];

    (httpClient.get as vi.Mock).mockResolvedValue(mockOrders);
    const result = await orderService.getOrders({ status: 'new' });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('new');
  });
});
```

**Benefits:**

- Update one place when interface changes
- Ensures all mocks stay in sync
- Easy to override specific properties for test cases
- Self-documenting test data

---

### 3. Mock-to-Type Compatibility Audit

**Goal:** Verify mocks match interfaces at code review time

**Implementation:**

Add to your PR review checklist:

```markdown
## Pre-commit: Mock Audit

When updating interfaces in `shared/types/`:

1. Search for all uses of that type in tests:
   ```bash
   grep -r "CreateOrderDTO\|Order\|OrderItem" \
     client/src --include="*.test.ts" \
     server/tests --include="*.test.ts"
   ```

2. Review each mock object:
   - [ ] All required fields are present
   - [ ] No extra properties that don't exist in interface
   - [ ] Optional fields are correctly optional

3. Run type-checking:
   ```bash
   npm run typecheck
   npm run test:quick  # Ensure tests compile
   ```
```

**Automated Detection:**

```typescript
// tests/utils/mockValidation.ts
/**
 * Validates that a mock object matches its interface
 * Fails at compile time if types don't match
 */
export function validateMock<T>(mock: T, _interface: T): T {
  return mock;
}

// Usage example:
import { Order } from 'shared/types';
const mockOrder = { /* ... */ };
validateMock(mockOrder, {} as Order); // TS error if mismatch
```

---

### 4. Class-Based Mock Pattern for Browser APIs

**Goal:** Properly simulate constructors for ResizeObserver, IntersectionObserver, etc.

**Problem:**

```typescript
// ❌ WRONG: vi.fn().mockImplementation() doesn't work for constructors
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Test will fail when code does: new ResizeObserver(() => {})
```

**Solution:**

```typescript
// ✅ CORRECT: Use actual class implementation
class MockResizeObserver {
  callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Similar patterns for other Browser APIs:
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
```

**Location:** See `/Users/mikeyoung/CODING/rebuild-6.0/client/test/setup.ts` lines 93-103 for correct implementation

**Testing Browser API Mocks:**

```typescript
describe('ResizeObserver usage', () => {
  it('should call constructor with callback', () => {
    const callback = vi.fn();
    const observer = new ResizeObserver(callback);

    expect(observer.observe).toBeDefined();
    expect(typeof observer.observe).toBe('function');
  });
});
```

---

### 5. Time Testing Pattern

**Goal:** Avoid flaky tests and maintain deterministic behavior

**Problem:**

```typescript
// ❌ WRONG: Date changes every test run
const now = new Date().toISOString();
const mockOrder = { created_at: now, ... };

// Tests become non-deterministic and hard to debug
```

**Solution A: Static Time for Assertions**

```typescript
import { describe, it, beforeEach, afterEach, vi } from 'vitest';

const FIXED_TIME = new Date('2025-11-28T12:00:00Z').getTime();

describe('Order timestamps', () => {
  beforeEach(() => {
    vi.setSystemTime(FIXED_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set created_at to current time', async () => {
    const order = await orderService.createOrder({
      restaurant_id: 'rest-1',
      items: [{ menu_item_id: '1', quantity: 1 }]
    });

    expect(order.created_at).toBe(new Date(FIXED_TIME).toISOString());
  });
});
```

**Solution B: Timer-Based Logic**

```typescript
import { vi } from 'vitest';

describe('Order timeout handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should cancel order after 5 minutes', async () => {
    const order = await orderService.createOrder(/* ... */);

    // Advance time by 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(order.status).toBe('cancelled');
  });

  it('should not cancel order within 5 minutes', async () => {
    const order = await orderService.createOrder(/* ... */);

    // Advance time by 3 minutes only
    vi.advanceTimersByTime(3 * 60 * 1000);

    expect(order.status).toBe('new');
  });
});
```

**Factory Pattern for Timestamps:**

```typescript
// tests/factories/timestamps.ts
export class TimestampFactory {
  static readonly NOW = new Date('2025-11-28T12:00:00Z').toISOString();
  static readonly PAST = new Date('2025-11-27T12:00:00Z').toISOString();
  static readonly FUTURE = new Date('2025-11-29T12:00:00Z').toISOString();
}

// Use consistent timestamps across all mocks
const mockOrder = createMockOrder({
  created_at: TimestampFactory.NOW,
  updated_at: TimestampFactory.NOW
});
```

---

### 6. Service Mock Pattern

**Goal:** Properly mock service dependencies with correct shapes

**Problem:**

```typescript
// ❌ WRONG: Incomplete mock definition
vi.mock('@/services/http/httpClient', () => ({
  httpClient: {
    get: vi.fn()
    // Missing post, patch, delete methods!
  }
}));
```

**Solution: Centralized Service Mocks**

```typescript
// tests/mocks/httpClient.mock.ts
import { vi } from 'vitest';

export const createMockHttpClient = () => ({
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  head: vi.fn().mockResolvedValue({})
});

// tests/mocks/logger.mock.ts
export const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
});

// Usage in tests:
import { createMockHttpClient } from 'tests/mocks/httpClient.mock';

vi.mock('@/services/http/httpClient', () => ({
  httpClient: createMockHttpClient()
}));
```

---

### 7. Periodic Mock Audit Schedule

**Goal:** Prevent drift over time

**Implementation:**

```typescript
// scripts/audit-mocks.ts
import fs from 'fs';
import path from 'path';

/**
 * Audits all test files for potential mock drift
 * Run: npx ts-node scripts/audit-mocks.ts
 */

const testFiles = [
  'client/src/**/*.test.ts',
  'server/tests/**/*.test.ts'
];

const issues = {
  missingTypeAnnotations: [],
  anyType: [],
  hardcodedDates: [],
  incompleteMocks: []
};

// Check for missing type annotations on mocks
// Check for 'any' usage
// Check for hardcoded Date values
// Check for incomplete mock definitions

process.stdout.write('Mock Audit Results:\n');
process.stdout.write(JSON.stringify(issues, null, 2) + '\n');
```

**Add to Pre-commit Hook:**

```bash
# .husky/pre-commit
#!/bin/bash

# Validate mocks don't have 'any'
if grep -r ": any" client/src server/tests --include="*.test.ts" | grep -v node_modules; then
  echo "ERROR: Found 'any' type in test files"
  exit 1
fi

# Validate required type annotations
if grep -r "const mock" client/src server/tests --include="*.test.ts" | grep -v ": " | grep -v "// "; then
  echo "WARNING: Consider adding type annotations to mocks"
fi

exit 0
```

---

### 8. Pattern-Based Mock Generation

**Goal:** Reduce repetition and increase consistency

**Implementation:**

```typescript
// tests/utils/mockBuilder.ts
import { Order, OrderItem } from 'shared/types';

export class OrderMockBuilder {
  private data: Partial<Order> = {};

  static create() {
    return new OrderMockBuilder();
  }

  withRestaurant(restaurantId: string) {
    this.data.restaurant_id = restaurantId;
    return this;
  }

  withStatus(status: Order['status']) {
    this.data.status = status;
    return this;
  }

  withItems(items: OrderItem[]) {
    this.data.items = items;
    return this;
  }

  withTotal(amount: number) {
    this.data.total = amount;
    this.data.subtotal = Math.round(amount / 1.08 * 100) / 100;
    this.data.tax = amount - this.data.subtotal;
    return this;
  }

  build(): Order {
    const now = new Date().toISOString();
    return {
      id: '1',
      restaurant_id: 'rest-1',
      order_number: '001',
      status: 'new',
      type: 'online',
      items: [],
      subtotal: 10.00,
      tax: 0.80,
      total: 10.80,
      payment_status: 'pending',
      created_at: now,
      updated_at: now,
      ...this.data
    };
  }
}

// Usage:
const order = OrderMockBuilder
  .create()
  .withStatus('preparing')
  .withTotal(50.00)
  .build();
```

---

### 9. Runtime Mock Validation

**Goal:** Catch mock drift in CI/CD

**Implementation:**

```typescript
// tests/utils/validateMockShape.ts
export function validateMockShape<T>(
  mock: unknown,
  requiredFields: (keyof T)[]
): asserts mock is T {
  if (typeof mock !== 'object' || mock === null) {
    throw new Error('Mock must be an object');
  }

  const mockObj = mock as Record<string, unknown>;
  const missing = requiredFields.filter(field => !(field in mockObj));

  if (missing.length > 0) {
    throw new Error(`Mock missing required fields: ${missing.join(', ')}`);
  }
}

// Usage in tests:
it('validates mock order structure', () => {
  const mock = { id: '1', order_number: '001' };

  expect(() => {
    validateMockShape<Order>(mock, [
      'id',
      'restaurant_id',
      'order_number',
      'status'
    ]);
  }).toThrow('Mock missing required fields: restaurant_id, status');
});
```

---

### 10. Documentation Standards

**Goal:** Make mock intent and structure clear

**Implementation:**

```typescript
/**
 * Test mocks for Order type
 *
 * SYNC REQUIREMENT: Keep in sync with shared/types/order.types.ts
 * Last synced: 2025-11-28
 *
 * Required fields (must always be present):
 * - id: string
 * - restaurant_id: string (CRITICAL: multi-tenancy)
 * - order_number: string
 * - status: OrderStatus
 * - type: OrderType
 * - items: OrderItem[]
 * - subtotal: number
 * - tax: number
 * - total: number
 * - payment_status: PaymentStatus
 * - created_at: string (ISO 8601)
 * - updated_at: string (ISO 8601)
 */

const mockOrder: Order = {
  // Identifiers
  id: '1',
  restaurant_id: 'rest-1', // ← REQUIRED for multi-tenancy
  order_number: '001',

  // State
  status: 'new',
  type: 'online',
  payment_status: 'pending',

  // Items & Pricing
  items: [],
  subtotal: 10.00,
  tax: 0.80,
  total: 10.80,

  // Timestamps
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

---

## Integration with Current Codebase

### Current Good Practices (Maintain)

1. **Test Setup File:** `/Users/mikeyoung/CODING/rebuild-6.0/client/test/setup.ts`
   - Properly uses class-based mocks for ResizeObserver
   - Centralized browser API mocking
   - Good cleanup in afterEach hook

2. **Mock Factories:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/server/mocks/auth.ts`
   - Centralized auth mock
   - Should be extended for other services

3. **Type-Safe Mocks:** OrderService tests use proper Order typing
   - Good example at `/Users/mikeyoung/CODING/rebuild-6.0/client/src/services/orders/__tests__/OrderService.test.ts`

### Areas to Improve

1. Create `/tests/factories/` directory with factory functions
2. Add mock audit script to CI/CD
3. Enforce type annotations in PR checklist
4. Document mock sync requirements in CLAUDE.md

---

## Checklist for PR Reviews

When reviewing PRs that modify interfaces in `shared/types/`:

- [ ] All test mocks updated for new/removed fields
- [ ] Type annotations present on all mocks (no `any`)
- [ ] Factory functions or mock builders used consistently
- [ ] Timestamps use fixed values with `vi.setSystemTime()`
- [ ] Service mocks include all required methods
- [ ] Mock documentation updated with sync date
- [ ] Tests still pass after interface changes

---

## Common Mistakes to Avoid

### Mistake 1: Missing Required Fields

```typescript
// ❌ WRONG
const mockOrder = {
  id: '1',
  order_number: '001'
  // Missing restaurant_id (CRITICAL for multi-tenancy)
};

// ✅ CORRECT
const mockOrder: Order = {
  id: '1',
  restaurant_id: 'rest-1', // ← Explicitly required
  order_number: '001',
  // ... all other required fields
};
```

### Mistake 2: Using 'any' Type

```typescript
// ❌ WRONG
const mockService: any = { get: vi.fn() };

// ✅ CORRECT
const mockService = { get: vi.fn().mockResolvedValue({}) };
// or
const mockService: HttpClient = createMockHttpClient();
```

### Mistake 3: Non-Deterministic Timestamps

```typescript
// ❌ WRONG
const mockOrder = {
  created_at: new Date().toISOString(), // Changes every run!
  // ...
};

// ✅ CORRECT
const mockOrder = {
  created_at: '2025-11-28T12:00:00Z', // Fixed for testing
  // ...
};
```

### Mistake 4: Incomplete Service Mocks

```typescript
// ❌ WRONG
vi.mock('@/services/http/httpClient', () => ({
  httpClient: { get: vi.fn() } // Missing other methods
}));

// ✅ CORRECT
vi.mock('@/services/http/httpClient', () => ({
  httpClient: createMockHttpClient() // Includes all methods
}));
```

---

## References

- **TypeScript Strict Mode:** https://www.typescriptlang.org/tsconfig#strict
- **Vitest Mock Documentation:** https://vitest.dev/api/vi.html
- **Testing Library:** https://testing-library.com/
- **Codebase Type Definitions:** `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/`
- **Test Setup:** `/Users/mikeyoung/CODING/rebuild-6.0/client/test/setup.ts`

---

## Related Lessons

- **CL-AUTH-001:** STRICT_AUTH drift between implementation and tests
- **CL-TEST-002:** (Future) Mock reset patterns and lifecycle management
- **CL-TEST-003:** (Future) E2E test data factories

---

## Implementation Priority

1. **Week 1:** Add mock factories for Order, User, Restaurant types
2. **Week 2:** Add mock audit script to CI/CD
3. **Week 3:** Update PR review checklist
4. **Ongoing:** Enforce in code review

---

**Last Updated:** 2025-11-28
**Maintainer:** Architecture Team
**Status:** Active Pattern - All new tests must follow these strategies
