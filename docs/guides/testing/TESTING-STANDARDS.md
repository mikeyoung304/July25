# Testing Standards for rebuild-6.0

Official testing standards and requirements for the rebuild-6.0 project.

---

## Executive Summary

All tests must prevent module-level state pollution. Use these three rules:

1. **Generate unique test IDs** - Never reuse the same identifier across tests
2. **Clear mocks globally** - Automatically in `afterEach` hook
3. **Export reset functions** - For any service with module-level state

**Compliance**: All new tests must follow these standards before merging.

---

## Rule 1: Generate Unique Test IDs

### Requirement
Every test that creates or modifies state must use a unique identifier.

### Implementation (Copy-Paste Ready)
```typescript
describe('YourService', () => {
  let testCounter = 0;
  let testId: string;

  beforeEach(() => {
    testId = `test-${++testCounter}-${Date.now()}`;
  });

  it('should work', () => {
    // testId is guaranteed unique
  });
});
```

### Why This Matters
- **Prevents collisions**: Each test gets unique ID
- **Simple**: No complex setup needed
- **Works everywhere**: Maps, databases, caches, any storage

### Violation Examples

❌ **BAD - Hardcoded IDs**
```typescript
const userId = 'user-123';       // Reused in every test!
const sessionId = 'session-abc'; // Reused in every test!

it('test 1', () => {
  await addUser(userId); // Pollutes cart/session storage
});

it('test 2', () => {
  await addUser(userId); // Sees data from test 1!
});
```

✅ **GOOD - Unique IDs**
```typescript
let testCounter = 0;
let userId: string;

beforeEach(() => {
  userId = `user-${++testCounter}-${Date.now()}`;
});

it('test 1', () => {
  await addUser(userId); // "user-1-1700956234567"
});

it('test 2', () => {
  await addUser(userId); // "user-2-1700956234568" - different!
});
```

### Applies To
- Order IDs
- Session IDs
- User IDs
- Table IDs
- Cart IDs
- Any identifier used in tests

---

## Rule 2: Clear Mocks in afterEach

### Requirement
Every test file must clear mocks after each test (unless using global setup).

### Implementation - Option A: Per-Test
```typescript
import { beforeEach, afterEach, vi } from 'vitest';

describe('MyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Tests here
});
```

### Implementation - Option B: Global Setup (Recommended)

Already configured in rebuild-6.0. Verify this exists:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['tests/setup.ts', 'tests/bootstrap.ts'], // ← REQUIRED
    isolate: true,                                        // ← REQUIRED
    poolOptions: { threads: { singleThread: true } },    // ← REQUIRED
  },
});
```

```typescript
// tests/bootstrap.ts (should exist)
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.clearAllTimers();    // Clear setTimeout/setInterval
  vi.clearAllMocks();     // Clear call history
  vi.resetAllMocks();     // Reset implementations
});
```

**If global setup is in place, you don't need `beforeEach`/`afterEach` in individual tests.**

### Violation Examples

❌ **BAD - No Mock Clearing**
```typescript
describe('Service', () => {
  // No afterEach hook
  it('test 1', () => {
    vi.mockImplementation(...); // Mock persists!
  });

  it('test 2', () => {
    // Sees mock from test 1!
  });
});
```

✅ **GOOD - Global Cleanup**
```typescript
// In tests/bootstrap.ts (runs for all tests)
afterEach(() => {
  vi.clearAllMocks();
});

// No need to repeat in each test file
describe('Service', () => {
  it('test 1', () => {
    vi.mockImplementation(...);
  });

  it('test 2', () => {
    // Mocks cleared automatically
  });
});
```

### Applies To
- All `vi.mock()` calls
- All `vi.spyOn()` calls
- All `vi.fn()` mocks
- All mock implementations

---

## Rule 3: Export Reset Functions

### Requirement
If a service/module has module-level state (Map, Set, array, cache), export a reset function.

### Implementation

**Step 1: Add reset function to service**
```typescript
// src/services/cartCache.ts

const carts = new Map<string, Cart>();

export function getCart(sessionId: string): Cart | undefined {
  return carts.get(sessionId);
}

export function setCart(sessionId: string, cart: Cart): void {
  carts.set(sessionId, cart);
}

// REQUIRED: Export reset for testing
export function resetCartCache(): void {
  carts.clear();
}
```

**Step 2: Use in tests**
```typescript
import { getCart, setCart, resetCartCache } from '../cartCache';
import { afterEach } from 'vitest';

describe('CartCache', () => {
  afterEach(() => {
    resetCartCache();
  });

  it('should store cart', () => {
    setCart('session-1', { items: [] });
    expect(getCart('session-1')).toBeDefined();
  });
});
```

### Naming Convention
- Primary export: `function getX() { ... }`
- Reset function: `export function resetXForTesting() { ... }` or `export function clearX() { ... }`

### Applies To
- Services with module-level Maps
- Services with module-level Sets
- Services with module-level arrays
- Caches that persist between tests
- Singletons with mutable state

### Examples from rebuild-6.0

**realtime-menu-tools.test.ts** - Uses reset through mock clearing:
```typescript
// Clear cache mocks after each test
mockCaches.forEach(cache => {
  cache.get.mockClear();
  cache.set.mockClear();
});
```

---

## Test File Template

Copy this template for new test files:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YourService } from '../YourService';

describe('YourService', () => {
  // 1. Generate unique test IDs
  let testCounter = 0;
  let testId: string;

  beforeEach(() => {
    testId = `test-${++testCounter}-${Date.now()}`;
  });

  // If not using global mock clearing, add:
  // afterEach(() => {
  //   vi.clearAllMocks();
  // });

  describe('Feature 1', () => {
    it('should do something', async () => {
      const result = await YourService.doSomething(testId);
      expect(result).toBeDefined();
    });

    it('should handle error', async () => {
      // testId is unique - no collision with previous test
      expect(async () => {
        await YourService.doSomething(testId);
      }).rejects.toThrow();
    });
  });
});
```

---

## Test Review Checklist

When reviewing test code, check for:

### ✅ Must Have
- [ ] Unique test IDs (counter + timestamp)
- [ ] Mock clearing (global setup OR per-test)
- [ ] Tests pass in isolation: `npm run test -- file.test.ts`
- [ ] Tests pass in suite: `npm run test`

### ❌ Must NOT Have
- [ ] Hardcoded test IDs (`'test-1'`, `'user-123'`, etc.)
- [ ] Shared module-level state without reset
- [ ] Tests that depend on execution order
- [ ] Missing afterEach/afterAll hooks

### ⚠️ Should Review
- [ ] Tests with mocks but no clearing
- [ ] Services with module-level Map/Set
- [ ] Tests that reuse sessionId/userId/orderId
- [ ] Tests that accumulate data

---

## Debugging Failed Tests

If a test fails mysteriously:

### Step 1: Check Test Order Dependency
```bash
# Run the failing test alone
npm run test -- test-name.test.ts  # PASS?

# Run all tests in file
npm run test -- test-file.test.ts  # PASS?

# Run full suite
npm run test  # FAIL?
```

If it passes alone but fails in suite, it's a state isolation issue.

### Step 2: Look for Hardcoded IDs
```bash
grep -r "const userId = " src/
grep -r "const sessionId = " src/
grep -r "const orderId = " src/
```

If you find hardcoded IDs, use unique ID pattern instead.

### Step 3: Check Module-Level State
```bash
grep -r "^const.*= new Map" src/
grep -r "^const.*= new Set" src/
grep -r "^const.*= \[\]" src/
grep -r "^let.*= 0" src/
```

If found, export a reset function.

### Step 4: Verify Mock Clearing
```typescript
// Add to test temporarily for debugging
afterEach(() => {
  console.log('Mocks before clear:', vi.getCallsOf(mockedFunction).length);
  vi.clearAllMocks();
  console.log('Mocks after clear:', vi.getCallsOf(mockedFunction).length);
});
```

---

## Common Violations

### Violation 1: Hardcoded Test ID
```typescript
// ❌ VIOLATION
const orderId = 'order-123';

it('test 1', () => {
  await orderService.create(orderId);
});

it('test 2', () => {
  // Sees same order from test 1!
  const order = await orderService.get(orderId);
});
```

**Fix:**
```typescript
// ✅ COMPLIANT
let testCounter = 0;
let orderId: string;

beforeEach(() => {
  orderId = `order-${++testCounter}-${Date.now()}`;
});

it('test 1', () => {
  await orderService.create(orderId);
});

it('test 2', () => {
  // Different order ID
  const order = await orderService.get(orderId);
});
```

---

### Violation 2: No Mock Clearing
```typescript
// ❌ VIOLATION
describe('Service', () => {
  it('test 1', () => {
    vi.mocked(dependency).mockReturnValue(value1);
  });

  it('test 2', () => {
    // Mock from test 1 still active!
  });
});
```

**Fix:**
```typescript
// ✅ COMPLIANT - If no global setup
describe('Service', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('test 1', () => {
    vi.mocked(dependency).mockReturnValue(value1);
  });

  it('test 2', () => {
    // Mock cleared
  });
});
```

---

### Violation 3: Module-Level State Without Reset
```typescript
// ❌ VIOLATION - In service
const sessionCache = new Map<string, Session>();

export function cacheSession(id: string, session: Session) {
  sessionCache.set(id, session);
}

export function getSession(id: string) {
  return sessionCache.get(id);
}
// NO RESET FUNCTION!
```

**Fix:**
```typescript
// ✅ COMPLIANT - In service
const sessionCache = new Map<string, Session>();

export function cacheSession(id: string, session: Session) {
  sessionCache.set(id, session);
}

export function getSession(id: string) {
  return sessionCache.get(id);
}

// REQUIRED: Reset function
export function clearSessionCacheForTesting() {
  sessionCache.clear();
}
```

Then in test:
```typescript
import { cacheSession, getSession, clearSessionCacheForTesting } from '../service';

describe('SessionCache', () => {
  afterEach(() => {
    clearSessionCacheForTesting();
  });

  // Tests here
});
```

---

## Performance Expectations

Well-isolated tests should have:
- **Setup time**: < 10ms per test
- **Cleanup time**: < 5ms per test
- **Total suite**: O(n) linear time scaling

If tests get slower as you add more tests, it indicates state pollution.

---

## Tools & Commands

### Run Tests (Various Modes)
```bash
# Run all tests
npm run test

# Run specific file
npm run test -- test-name.test.ts

# Run in watch mode
npm run test:watch

# Run healthy tests (exclude quarantined)
npm run test:healthy

# Quick test run
npm run test:quick
```

### Check for Violations
```bash
# Find hardcoded IDs
grep -r "const.*Id = ['\"].*['\"]" server/tests --include="*.test.ts"

# Find module-level state
grep -r "^const.*= new Map" server/src --include="*.ts"
grep -r "^const.*= new Set" server/src --include="*.ts"

# Check for missing reset functions
grep -r "vi.resetModules\|vi.clearAllMocks" server/tests --include="*.test.ts"
```

---

## Enforcement

### Pre-commit Hook
Add to `.husky/pre-commit`:
```bash
# Check for violations
npm run typecheck:quick
npm run test:quick
```

### CI/CD
```yaml
# .github/workflows/test.yml
- name: Run tests (3x to catch isolation issues)
  run: |
    npm run test
    npm run test
    npm run test
```

### Code Review
All PRs must pass:
- ✅ All tests pass in isolation and together
- ✅ No hardcoded test IDs
- ✅ Mock clearing in place
- ✅ Reset functions for stateful services

---

## References

- **Full Guide**: `/docs/guides/testing/test-isolation-prevention.md`
- **Code Patterns**: `/docs/guides/testing/state-isolation-patterns.md`
- **Vitest Config**: `/vitest.config.ts`
- **Test Bootstrap**: `/server/tests/bootstrap.ts`
- **Example Test**: `/server/tests/ai/functions/realtime-menu-tools.test.ts`

---

**Status**: Active - Enforced in all new tests
**Last Updated**: 2025-11-25
**Maintainer**: Development Team
