# Test Mock Quick Reference (CL-TEST-001)

Quick patterns to prevent mock drift from TypeScript interfaces.

## The Problem

```typescript
// Interface changes...
export interface Order {
  id: string;
  restaurant_id: string;  // ← NEW REQUIRED FIELD
  order_number: string;
  // ...
}

// But tests still use old mock without restaurant_id
const mockOrder = { id: '1', order_number: '001' }; // ✅ Test passes!
// ❌ But production code fails at runtime
```

## Core Prevention Patterns

### 1. Always Type Your Mocks

```typescript
// ❌ Wrong
const mockOrder = { id: '1', order_number: '001' };

// ✅ Correct
const mockOrder: Order = {
  id: '1',
  restaurant_id: 'rest-1',  // TypeScript catches if missing
  order_number: '001',
  // ... all required fields
};
```

### 2. Use Mock Factories

```typescript
// ✅ Single source of truth
export function createMockOrder(overrides?: Partial<Order>): Order {
  return {
    id: '1',
    restaurant_id: 'rest-1',
    order_number: '001',
    items: [],
    status: 'new',
    type: 'online',
    subtotal: 10.00,
    tax: 0.80,
    total: 10.80,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  };
}

// Use everywhere
const order = createMockOrder({ status: 'preparing' });
```

### 3. Class-Based Mocks for Browser APIs

```typescript
// ✅ Correct for constructors
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

// ❌ Wrong (doesn't support `new ResizeObserver()`)
global.ResizeObserver = vi.fn().mockImplementation(() => ({...}));
```

### 4. Fixed Timestamps

```typescript
// ❌ Wrong - non-deterministic
const mockOrder = { created_at: new Date().toISOString() };

// ✅ Correct - fixed
const mockOrder = { created_at: '2025-11-28T12:00:00Z' };

// Or with system time mocking
beforeEach(() => vi.setSystemTime('2025-11-28T12:00:00Z'));
afterEach(() => vi.useRealTimers());
```

### 5. Complete Service Mocks

```typescript
// ❌ Wrong - missing methods
vi.mock('@/services/http/httpClient', () => ({
  httpClient: { get: vi.fn() }
}));

// ✅ Correct
export const createMockHttpClient = () => ({
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  head: vi.fn().mockResolvedValue({})
});
```

## PR Review Checklist

When modifying `shared/types/`:

- [ ] All test mocks have type annotations (no `any`)
- [ ] No hardcoded Date values (use fixed ISO strings)
- [ ] Mock factories used consistently
- [ ] Service mocks include all methods
- [ ] Browser API mocks use class-based pattern
- [ ] Tests still pass with new interface

## Quick Commands

```bash
# Find mocks without types
grep -r "const mock" client/src --include="*.test.ts" | grep -v ": "

# Find 'any' in tests
grep -r ": any" client/src --include="*.test.ts"

# Find hardcoded dates
grep -r "new Date()" client/src --include="*.test.ts"

# Type-check tests
npm run typecheck
```

## Where to Find Examples

- Factories: Need to create in `/tests/factories/`
- Setup: `/client/test/setup.ts` (good patterns)
- Full lesson: `/CL-TEST-001-mock-drift-prevention.md`

---

**Remember:** If the test passes but production fails, you probably have mock drift!
