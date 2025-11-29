# Mock Drift Prevention Implementation Guide

Step-by-step guide to implement CL-TEST-001 patterns in the codebase.

## Phase 1: Foundation (Week 1)

### Step 1.1: Create Mock Factories Directory

```bash
mkdir -p tests/factories
touch tests/factories/index.ts
```

### Step 1.2: Create Order Factory

Create `/tests/factories/order.factory.ts`:

```typescript
import { Order, OrderItem, OrderStatus, PaymentStatus } from 'shared/types';

/**
 * Factory for creating consistent mock Order objects.
 * SYNC REQUIREMENT: Keep in sync with shared/types/order.types.ts
 * Last synced: 2025-11-28
 */

const DEFAULT_TIMESTAMP = '2025-11-28T12:00:00Z';

export function createMockOrderItem(
  overrides?: Partial<OrderItem>
): OrderItem {
  return {
    id: '1',
    menu_item_id: '1',
    name: 'Test Item',
    quantity: 1,
    price: 10.00,
    subtotal: 10.00,
    ...overrides
  };
}

export function createMockOrder(overrides?: Partial<Order>): Order {
  return {
    id: '1',
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    order_number: '001',
    table_number: '5',
    status: 'new' as OrderStatus,
    type: 'online',
    items: [createMockOrderItem()],
    subtotal: 10.00,
    tax: 0.80,
    total: 10.80,
    payment_status: 'pending' as PaymentStatus,
    created_at: DEFAULT_TIMESTAMP,
    updated_at: DEFAULT_TIMESTAMP,
    ...overrides
  };
}

/**
 * Builder pattern for complex order scenarios
 */
export class OrderMockBuilder {
  private data: Partial<Order> = {};

  static create() {
    return new OrderMockBuilder();
  }

  withRestaurant(restaurantId: string) {
    this.data.restaurant_id = restaurantId;
    return this;
  }

  withStatus(status: OrderStatus) {
    this.data.status = status;
    return this;
  }

  withItems(items: OrderItem[]) {
    this.data.items = items;
    return this;
  }

  withTotal(amount: number) {
    this.data.total = amount;
    this.data.subtotal = Math.round((amount / 1.08) * 100) / 100;
    this.data.tax = amount - (this.data.subtotal || 0);
    return this;
  }

  withPaymentStatus(status: PaymentStatus) {
    this.data.payment_status = status;
    return this;
  }

  build(): Order {
    return createMockOrder(this.data);
  }
}
```

### Step 1.3: Export Factories

Update `/tests/factories/index.ts`:

```typescript
/**
 * Central export for all mock factories
 * Import from: import { createMockOrder } from 'tests/factories'
 */

export { createMockOrder, createMockOrderItem, OrderMockBuilder } from './order.factory';
// Add more as you create them
```

### Step 1.4: Update Existing Tests

Update order service tests to use factory:

```typescript
// BEFORE
const mockOrders = [
  {
    id: '1',
    restaurant_id: 'rest-1',
    order_number: '001',
    // ... many lines repeated
  }
];

// AFTER
import { createMockOrder } from 'tests/factories';

const mockOrders = [
  createMockOrder({ order_number: '001' }),
  createMockOrder({ order_number: '002', status: 'preparing' })
];
```

---

## Phase 2: Service Mocks (Week 1)

### Step 2.1: Centralize HTTP Client Mock

Create `/tests/mocks/httpClient.mock.ts`:

```typescript
import { vi } from 'vitest';

/**
 * Centralized mock for httpClient service
 * Ensures all HTTP methods are mocked consistently
 */

export const createMockHttpClient = () => ({
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  head: vi.fn().mockResolvedValue({})
});

export const createMockHttpError = (status: number, message: string) => ({
  response: { status, data: { message } }
});
```

### Step 2.2: Centralize Logger Mock

Create `/tests/mocks/logger.mock.ts`:

```typescript
import { vi } from 'vitest';

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
```

### Step 2.3: Update Tests to Use Service Mocks

```typescript
import { createMockHttpClient } from 'tests/mocks/httpClient.mock';

vi.mock('@/services/http/httpClient', () => ({
  httpClient: createMockHttpClient()
}));
```

---

## Phase 3: Documentation (Week 2)

### Step 3.1: Add Mock Sync Comments to Interfaces

In `shared/types/order.types.ts`:

```typescript
/**
 * Unified Order Types
 *
 * MOCK SYNC POINTS:
 * - tests/factories/order.factory.ts (createMockOrder)
 * - tests/mocks/* (any service mocks using Order)
 * - Update these when adding/removing required fields
 */
export interface Order {
  // ... fields
}
```

### Step 3.2: Update CLAUDE.md

Add to project CLAUDE.md:

```markdown
## Testing Standards

### Mock Data Management

All test mocks must:
1. Have explicit TypeScript type annotations (no `any`)
2. Use factory functions from `tests/factories/`
3. Include all required fields from shared types
4. Use fixed timestamps: `'2025-11-28T12:00:00Z'`
5. Update when interfaces in `shared/types/` change

### Mock Updates Required When:
- Adding required fields to interfaces in `shared/types/`
- Changing field types
- Removing fields

### Quick Commands:
```bash
# Find outdated mocks
grep -r "const mock" client/src server/tests --include="*.test.ts" | grep -v "Mock\|createMock"

# Check for 'any' usage
grep -r ": any" --include="*.test.ts"

# Run type-checking
npm run typecheck
```
```

---

## Phase 4: CI/CD Integration (Week 2)

### Step 4.1: Create Mock Audit Script

Create `scripts/audit-mocks.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Audits test files for mock drift issues
 * Run: npx ts-node scripts/audit-mocks.ts
 */

async function auditMocks() {
  const testFiles = await glob([
    'client/src/**/*.test.ts',
    'client/src/**/*.test.tsx',
    'server/tests/**/*.test.ts'
  ]);

  const issues = {
    noTypeAnnotations: [] as string[],
    anyType: [] as string[],
    noFactory: [] as string[]
  };

  for (const file of testFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileName = path.basename(file);

    // Check for 'any' type in mocks
    if (content.match(/const mock\w*\s*:\s*any/)) {
      issues.anyType.push(file);
    }

    // Check for untyped mocks
    if (content.match(/const mock\w*\s*=\s*\{/) &&
        !content.match(/const mock\w*\s*:\s*\w+.*=\s*\{/)) {
      issues.noTypeAnnotations.push(file);
    }
  }

  process.stdout.write('\n=== Mock Audit Results ===\n\n');

  if (issues.anyType.length > 0) {
    process.stdout.write('❌ Files with "any" type:\n');
    issues.anyType.forEach(f => process.stdout.write(`   ${f}\n`));
  }

  if (issues.noTypeAnnotations.length > 0) {
    process.stdout.write('\n⚠️  Mocks without type annotations:\n');
    issues.noTypeAnnotations.forEach(f => process.stdout.write(`   ${f}\n`));
  }

  if (issues.anyType.length === 0 && issues.noTypeAnnotations.length === 0) {
    process.stdout.write('✅ All mocks properly typed!\n\n');
  }

  process.exit(issues.anyType.length > 0 ? 1 : 0);
}

auditMocks().catch(e => process.stderr.write(String(e)));
```

### Step 4.2: Add to package.json

```json
{
  "scripts": {
    "audit:mocks": "ts-node scripts/audit-mocks.ts",
    "test:strict": "npm run typecheck && npm run audit:mocks && npm test"
  }
}
```

### Step 4.3: Add to Pre-commit Hook

Create `.husky/pre-commit` validation:

```bash
#!/bin/bash

# Check for 'any' in test files
if grep -r ": any" client/src server/tests --include="*.test.ts" 2>/dev/null | grep -v node_modules; then
  echo "❌ ERROR: Found 'any' type in test mocks"
  echo "Mock drift prevention requires explicit types"
  exit 1
fi

# Check for untyped mock objects
echo "Auditing mock types..."
npm run audit:mocks

exit 0
```

---

## Phase 5: Team Training (Week 3)

### Step 5.1: Update PR Template

Add to `.github/pull_request_template.md`:

```markdown
## Mock Data Checklist

If this PR modifies `shared/types/`:
- [ ] Updated tests/factories/* with new/removed fields
- [ ] All test mocks have explicit type annotations
- [ ] Ran `npm run audit:mocks` (should pass)
- [ ] Ran `npm run typecheck` (should pass)
- [ ] No `any` types in test files

If this PR adds new tests:
- [ ] Used factory functions from `tests/factories/`
- [ ] No hardcoded Date objects (use ISO strings)
- [ ] All mocks properly typed from shared/types
```

### Step 5.2: Create Developer Guide

Create `.claude/guides/TESTING.md`:

```markdown
# Testing Guide

## Mock Data Best Practices

### Use Factories

```typescript
import { createMockOrder } from 'tests/factories';

const order = createMockOrder({ status: 'preparing' });
```

### Always Type Mocks

```typescript
const mockService: HttpClient = {
  get: vi.fn(),
  // ... all methods
};
```

### Fixed Timestamps

```typescript
// ✅ Good
created_at: '2025-11-28T12:00:00Z'

// ❌ Bad
created_at: new Date().toISOString()
```

See `/claude/lessons/CL-TEST-001-mock-drift-prevention.md` for full details.
```

---

## Validation Checklist

After implementation, verify:

- [ ] All Order mocks use `createMockOrder()` factory
- [ ] No test files have `const mock.*: any`
- [ ] Service mocks include all required methods
- [ ] Browser API mocks use class-based pattern
- [ ] Tests pass with `npm run typecheck && npm test`
- [ ] Pre-commit hook blocks `any` types
- [ ] Mock audit script runs in CI/CD
- [ ] Team trained on patterns

---

## Rollout Timeline

**Week 1:**
- Day 1-2: Create factories and service mocks
- Day 3-4: Update existing tests
- Day 5: Internal review

**Week 2:**
- Day 1-2: Add documentation and audit script
- Day 3-4: CI/CD integration
- Day 5: Testing

**Week 3:**
- Day 1-2: Team training sessions
- Day 3-5: Enforce in code reviews

---

## Common Pitfalls & Solutions

### Pitfall 1: Circular Dependencies

If factories import from test files:

```typescript
// ❌ Creates circular dep: tests → factories → tests
import { mockService } from './mocks/service.mock';

// ✅ Keep factories pure, compose in tests
export function createOrder() { /* ... */ }

// In tests:
const order = createMockOrder();
const service = createMockHttpClient();
```

### Pitfall 2: Over-Engineering

```typescript
// ❌ Too complex
export class ComplexOrderFactory {
  private data = {};
  private validators = [];
  // 100+ lines
}

// ✅ Simple and focused
export function createMockOrder(overrides) {
  return { ...defaults, ...overrides };
}
```

### Pitfall 3: Forgetting All Methods

```typescript
// ❌ Only mocks one method
vi.mock('@/services/orders', () => ({
  OrderService: { getOrders: vi.fn() }
}));

// ✅ Include all public methods
export const createMockOrderService = () => ({
  getOrders: vi.fn(),
  getOrderById: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn()
});
```

---

**Next Steps:** Start with Phase 1, validate with Phase 5, maintain with ongoing code review.
