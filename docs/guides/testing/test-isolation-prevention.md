# Test Isolation Prevention Guide

## Problem Definition

Tests fail due to **shared module-level state persisting across tests** when using the same identifiers. This occurs because modules are cached by Vitest/Jest between tests, causing Maps, Sets, arrays, and objects defined at module scope to accumulate state.

**Symptom**: A test passes in isolation but fails when run with other tests using the same identifiers.

```
npm run test                    # FAIL - state pollution
npm run test -- mytest.test.ts  # PASS - isolated run
```

**Root Cause**: Module-level mutable state is created once and reused across all tests.

```typescript
// DANGEROUS - This Map persists across all tests
const cartCache = new Map<string, Cart>();

export function addToCart(sessionId: string, item: Item) {
  const cart = cartCache.get(sessionId) || { items: [] };
  cart.items.push(item);
  cartCache.set(sessionId, cart);
  return cart;
}
```

When Test A uses sessionId "session-1", it adds to the Map. When Test B also uses "session-1", it reads the polluted state from Test A.

---

## 1. Detection Checklist

Use this checklist to identify module-level state pollution in your codebase:

### Immediate Red Flags

- [ ] Module-level `const map = new Map()` declaration
- [ ] Module-level `const set = new Set()` declaration
- [ ] Module-level `const storage = {}` or `const cache = {}`
- [ ] Module-level `let counter = 0` or similar mutable variable
- [ ] Module-level `const sessions = []` or array-like structure
- [ ] Singleton pattern without reset method: `export const instance = new Cache()`

### Test Behavior Patterns

- [ ] Test passes when run alone: `npm run test -- specific.test.ts`
- [ ] Test fails when run with suite: `npm run test`
- [ ] Failure involves duplicated data from previous tests
- [ ] Error messages reference IDs from other tests (e.g., "sessionId-from-previous-test found")
- [ ] Tests fail in different order depending on execution sequence
- [ ] Memory usage grows with each test run (sign of accumulated state)

### Code Review Questions

When reviewing code for test isolation issues, ask:

1. **Is state created at module scope?**
   ```typescript
   // Bad - at module scope
   const cache = new Map();

   // Good - created per instance or in tests
   class MyService {
     private cache = new Map();
   }
   ```

2. **Can tests reuse the same identifiers?**
   ```typescript
   // Bad - hardcoded test identifiers across tests
   const sessionId = "test-session-1";
   const sessionId = "test-session-1"; // Another test using same ID

   // Good - unique per test
   let sessionId: string;
   beforeEach(() => {
     sessionId = `test-session-${Date.now()}-${Math.random()}`;
   });
   ```

3. **Is there a reset mechanism?**
   ```typescript
   // Bad - no way to reset
   const cache = new Map();
   export function getCache() { return cache; }

   // Good - export reset function
   const cache = new Map();
   export function getCache() { return cache; }
   export function resetCache() { cache.clear(); }
   ```

4. **Are module-level mocks properly cleared between tests?**
   ```typescript
   // Bad - mock persists across tests
   vi.mock('dependency', () => ({
     getData: vi.fn().mockResolvedValue(mockData)
   }));

   // Good - clear mocks between tests
   beforeEach(() => {
     vi.clearAllMocks();
     vi.resetAllMocks();
   });
   ```

---

## 2. Prevention Best Practices

### Pattern A: Unique Identifiers Per Test

The simplest and most robust solution: **never reuse identifiers across tests**.

```typescript
describe('CartService', () => {
  let testCounter = 0;
  let sessionId: string;

  beforeEach(() => {
    // Generate unique ID combining counter + timestamp + random
    sessionId = `session-${++testCounter}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  it('should add item to cart', async () => {
    const result = await cartService.addToCart(sessionId, item);
    expect(result.items).toHaveLength(1);
  });

  it('should maintain separate carts for different sessions', async () => {
    // sessionId is automatically unique from previous test
    const result = await cartService.addToCart(sessionId, item);
    expect(result.items).toHaveLength(1);
  });
});
```

**Benefits:**
- No manual cache clearing needed
- Guaranteed isolation
- Works with any storage mechanism (Map, database, cache)

**Tradeoffs:**
- Slightly more verbose test setup
- Requires intentional ID generation pattern

---

### Pattern B: Reset Function for Module State

If you control the module with state, export a reset function:

```typescript
// src/services/cartCache.ts
const cartsBySession = new Map<string, Cart>();

export function getCart(sessionId: string): Cart | undefined {
  return cartsBySession.get(sessionId);
}

export function setCart(sessionId: string, cart: Cart): void {
  cartsBySession.set(sessionId, cart);
}

// CRITICAL: Export reset for testing
export function resetForTesting(): void {
  cartsBySession.clear();
}
```

Then in your test:

```typescript
import { getCart, setCart, resetForTesting } from '../cartCache';

describe('CartCache', () => {
  afterEach(() => {
    // Clean up state between tests
    resetForTesting();
  });

  it('should store and retrieve cart', () => {
    setCart('session-1', { items: [item1] });
    expect(getCart('session-1')?.items).toHaveLength(1);
  });

  it('should not leak to next test', () => {
    // resetForTesting() in afterEach ensures clean state
    expect(getCart('session-1')).toBeUndefined();
  });
});
```

**Benefits:**
- Explicit cleanup
- Clear testing contract
- No need for unique IDs

**Tradeoffs:**
- Exposes testing-only API
- Requires module modification
- Manual cleanup in each test file

**Best practice**: Combine with `afterEach` hook:

```typescript
afterEach(() => {
  resetForTesting();
  vi.clearAllMocks();
});
```

---

### Pattern C: vi.resetModules() for Complete Isolation

For critical tests or when module state can't be easily cleared:

```typescript
describe('Critical Auth Tests', () => {
  // Option 1: Reset before each test
  beforeEach(() => {
    vi.resetModules(); // Reload all modules
  });

  // Option 2: Reset only when needed
  beforeEach(async () => {
    vi.resetModules();
    // Re-import after reset
    const module = await import('../auth');
    authService = module.authService;
  });

  it('should validate JWT with fresh state', () => {
    // Module is fresh, no previous state
  });
});
```

**Benefits:**
- Complete isolation
- No state leaks possible
- Works with any module design

**Tradeoffs:**
- ~50-100ms slower per test (module reloading)
- Can't be called after vi.mock() calls
- Must re-import modules after reset
- Use sparingly

**When to use:**
- Security-critical tests
- Tests for global configuration
- Tests where you must ensure zero state inheritance

---

### Pattern D: Clear Mocks in Bootstrap

Vitest has a global setup file. Configure aggressive mock clearing:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    isolate: true,                              // Run each test in isolated environment
    poolOptions: { threads: { singleThread: true } }, // Single thread prevents race conditions
    setupFiles: ['tests/setup.ts'],             // Global setup
    hookTimeout: 15000,
  }
});
```

```typescript
// tests/setup.ts (or tests/bootstrap.ts)
import { afterEach, beforeEach, vi } from 'vitest';

// Clear ALL mocks between every test
afterEach(() => {
  vi.clearAllMocks();     // Clear call counts and implementations
  vi.resetAllMocks();     // Reset to default implementations
  vi.clearAllTimers();    // Clear any pending timers
  // Consider: vi.resetModules() for integration tests
});

beforeEach(() => {
  // Optional: Setup fresh environment for each test
  // Some teams reset modules here for maximum isolation
});
```

**Current config in rebuild-6.0:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    isolate: true,                              // GOOD
    hookTimeout: 15000,
    testTimeout: 15000,
    poolOptions: { threads: { singleThread: true } }, // GOOD
    setupFiles: ['tests/setup.ts'],             // GOOD
  },
});
```

**Recommendation**: Already well-configured. Ensure `tests/bootstrap.ts` is loaded:

```typescript
// vitest.config.ts - add bootstrap to setupFiles
setupFiles: ['tests/setup.ts', 'tests/bootstrap.ts'],
```

---

## 3. Code Patterns to Watch For

### DANGEROUS Patterns

**Pattern 1: Module-level cache**
```typescript
// ❌ DANGEROUS
const cache = new Map<string, any>();

export function getFromCache(key: string) {
  return cache.get(key);
}

export function setInCache(key: string, value: any) {
  cache.set(key, value);
}
```

**Fix:**
```typescript
// ✅ SAFE - Reset function exposed
const cache = new Map<string, any>();

export function getFromCache(key: string) {
  return cache.get(key);
}

export function setInCache(key: string, value: any) {
  cache.set(key, value);
}

export function clearCache() {
  cache.clear();
}
```

---

**Pattern 2: Singleton with hardcoded state**
```typescript
// ❌ DANGEROUS - State persists across tests
export const sessionStore = {
  sessions: new Map<string, Session>(),

  addSession(id: string, session: Session) {
    this.sessions.set(id, session);
  },

  getSession(id: string) {
    return this.sessions.get(id);
  }
};

// In test:
sessionStore.addSession('test-1', testSession); // Pollutes other tests
```

**Fix:**
```typescript
// ✅ SAFE - Instance per test
class SessionStore {
  private sessions = new Map<string, Session>();

  addSession(id: string, session: Session) {
    this.sessions.set(id, session);
  }

  getSession(id: string) {
    return this.sessions.get(id);
  }

  clear() { // Reset for testing
    this.sessions.clear();
  }
}

// In test:
let store: SessionStore;

beforeEach(() => {
  store = new SessionStore();
});
```

---

**Pattern 3: Module-level accumulator**
```typescript
// ❌ DANGEROUS - Accumulates across tests
let requestCount = 0;

export function handleRequest() {
  requestCount++;
  return { requestId: requestCount };
}
```

**Fix:**
```typescript
// ✅ SAFE - Class-based with unique IDs
class RequestHandler {
  private requestCount = 0;

  handleRequest() {
    return { requestId: ++this.requestCount };
  }

  reset() {
    this.requestCount = 0;
  }
}

// In test:
let handler: RequestHandler;

beforeEach(() => {
  handler = new RequestHandler();
});
```

---

**Pattern 4: Hardcoded test identifiers**
```typescript
// ❌ DANGEROUS - Same ID reused across tests
describe('UserService', () => {
  const userId = 'user-123'; // Reused everywhere

  it('should fetch user', async () => {
    const user = await userService.getUser(userId);
    expect(user).toBeDefined();
  });

  it('should update user', async () => {
    await userService.updateUser(userId, { name: 'New' });
    const user = await userService.getUser(userId);
    expect(user.name).toBe('New');
  });
});
```

**Fix:**
```typescript
// ✅ SAFE - Unique ID per test
describe('UserService', () => {
  let testCounter = 0;
  let userId: string;

  beforeEach(() => {
    userId = `user-${++testCounter}-${Date.now()}`;
  });

  it('should fetch user', async () => {
    const user = await userService.getUser(userId);
    expect(user).toBeDefined();
  });

  it('should update user', async () => {
    await userService.updateUser(userId, { name: 'New' });
    const user = await userService.getUser(userId);
    expect(user.name).toBe('New');
  });
});
```

---

### SAFE Patterns

**Pattern 1: Instance variables**
```typescript
// ✅ SAFE - Each instance has its own state
class OrderCart {
  private items: CartItem[] = [];

  addItem(item: CartItem) {
    this.items.push(item);
  }

  getItems() {
    return this.items;
  }
}

// In test:
let cart: OrderCart;

beforeEach(() => {
  cart = new OrderCart(); // Fresh instance
});
```

---

**Pattern 2: Dependency injection**
```typescript
// ✅ SAFE - Dependencies injected per test
class OrderService {
  constructor(private cache: Cache) {}

  addOrder(id: string, order: Order) {
    this.cache.set(id, order);
  }

  getOrder(id: string) {
    return this.cache.get(id);
  }
}

// In test:
let mockCache: Cache;
let service: OrderService;

beforeEach(() => {
  mockCache = new Map(); // Fresh cache
  service = new OrderService(mockCache);
});
```

---

**Pattern 3: Factory functions with state clearing**
```typescript
// ✅ SAFE - Factory creates instances, reset available
export function createSessionManager() {
  const sessions = new Map<string, Session>();

  return {
    addSession: (id: string, session: Session) => sessions.set(id, session),
    getSession: (id: string) => sessions.get(id),
    clear: () => sessions.clear() // Reset for testing
  };
}

// In test:
let manager: ReturnType<typeof createSessionManager>;

beforeEach(() => {
  manager = createSessionManager();
});

afterEach(() => {
  manager.clear();
});
```

---

**Pattern 4: Unique identifiers for every test**
```typescript
// ✅ SAFE - IDs are unique, no collision
let sessionCounter = 0;

describe('CartSession', () => {
  let sessionId: string;

  beforeEach(() => {
    // Guaranteed unique
    sessionId = `session-${++sessionCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  });

  it('should work', () => {
    // No collision with other tests
  });
});
```

---

## 4. Test Case Suggestions

Use these test cases to catch module-level state pollution in your codebase:

### Test A: Isolation Verification

```typescript
describe('Module State Isolation - DETECTION TEST', () => {
  let testIdCounter = 0;
  let testId: string;

  beforeEach(() => {
    testId = `test-${++testIdCounter}-${Date.now()}`;
  });

  it('Test 1: Add to cache with ID 1', async () => {
    await service.addToCache(testId, { value: 'test1' });
    const result = await service.getFromCache(testId);
    expect(result?.value).toBe('test1');
  });

  it('Test 2: Cache should be empty for new ID', async () => {
    // If this fails with "found value from Test 1", state is leaking!
    const result = await service.getFromCache(testId);
    expect(result).toBeUndefined();
  });

  it('Test 3: Multiple entries should not interfere', async () => {
    await service.addToCache(testId, { value: 'test3' });
    const result = await service.getFromCache(testId);
    expect(result?.value).toBe('test3');
    // Other test IDs should not be found
  });
});
```

**What this catches:**
- Module-level Maps/Sets persisting across tests
- Singleton patterns without reset
- Hardcoded test IDs

---

### Test B: Concurrent Execution Test

```typescript
describe('Module State Under Concurrent Load', () => {
  const createUniqueId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  it('should handle concurrent operations without crosstalk', async () => {
    const ids = Array.from({ length: 10 }, createUniqueId);

    // Simulate 10 concurrent operations with different IDs
    const results = await Promise.all(
      ids.map(id =>
        service.addToCache(id, { id }).then(() =>
          service.getFromCache(id)
        )
      )
    );

    // Each operation should only see its own data
    results.forEach((result, index) => {
      expect(result?.id).toBe(ids[index]);
    });
  });

  it('should not leak between sequential operations', async () => {
    const operations = Array.from({ length: 5 }, async (_, i) => {
      const id = `seq-${i}-${Date.now()}`;
      await service.addToCache(id, { iteration: i });
      return service.getFromCache(id);
    });

    const results = await Promise.all(operations);

    results.forEach((result, index) => {
      expect(result?.iteration).toBe(index);
    });
  });
});
```

---

### Test C: Reset Function Verification

```typescript
describe('Test Cleanup - RESET FUNCTION VERIFICATION', () => {
  it('should clear state when reset function is called', async () => {
    const testId = 'cleanup-test';

    // Add data
    await service.addToCache(testId, { value: 'before' });
    let result = await service.getFromCache(testId);
    expect(result).toBeDefined();

    // Reset
    service.clearCache(); // or service.reset() or similar

    // Verify cleared
    result = await service.getFromCache(testId);
    expect(result).toBeUndefined();
  });

  it('should have clean state after reset in previous test', async () => {
    // Without proper reset, this would find data from previous test
    const testId = 'cleanup-test';
    const result = await service.getFromCache(testId);
    expect(result).toBeUndefined();
  });
});
```

---

### Test D: Memory Leak Detection

```typescript
describe('Module State - MEMORY LEAK DETECTION', () => {
  it('should not accumulate state across test iterations', async () => {
    // Simulate what happens when same test runs multiple times
    for (let iteration = 0; iteration < 100; iteration++) {
      const testId = `iteration-${iteration}`;
      await service.addToCache(testId, { iteration, data: 'x'.repeat(1000) });
    }

    // Get initial memory
    const initialMemory = process.memoryUsage().heapUsed;

    // Run "test again" 10 times - memory should not grow exponentially
    for (let run = 0; run < 10; run++) {
      for (let iteration = 0; iteration < 100; iteration++) {
        const testId = `iteration-${iteration}`;
        await service.addToCache(testId, { iteration, data: 'x'.repeat(1000) });
      }
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = finalMemory - initialMemory;

    // Memory should not grow more than 5MB
    // (indicates state is being reused, not accumulated)
    expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
  });
});
```

---

## 5. Real-World Examples from rebuild-6.0

### Example 1: Good Pattern - Unique Session IDs (realtime-menu-tools.test.ts)

```typescript
// From: server/tests/ai/functions/realtime-menu-tools.test.ts

describe('Realtime Menu Tools - Critical Functions', () => {
  let mockSessionId: string;
  let testCounter = 0;

  beforeEach(() => {
    // GOOD: Generate unique session ID for each test
    mockSessionId = `session-test-${++testCounter}-${Date.now()}`;
    vi.clearAllMocks();
  });

  it('should validate modifier names', async () => {
    const context = { sessionId: mockSessionId, restaurantId: mockRestaurantId };
    const args = { id: 'item-1', quantity: 1, modifiers: [null as any] };

    const result = await menuFunctionTools.add_to_order.handler(args, context);
    expect(result.success).toBe(true);
  });

  it('should create separate cart items for different modifiers', async () => {
    // GOOD: New session ID automatically created in beforeEach
    const context = { sessionId: mockSessionId, restaurantId: mockRestaurantId };
    // ... test code
  });
});
```

**Why this works:**
- `mockSessionId` is regenerated with counter + timestamp
- Each test gets unique session
- No state pollution between tests

---

### Example 2: Proper Mock Clearing (bootstrap.ts)

```typescript
// From: server/tests/bootstrap.ts

import { afterEach, beforeAll, vi } from 'vitest';

// GOOD: Clear all mocks after every test
afterEach(() => {
  vi.clearAllTimers();
  vi.clearAllMocks();
});

beforeAll(() => {
  vi.setConfig({ testTimeout: 30000 });
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

**Why this works:**
- `vi.clearAllMocks()` removes all call history
- `vi.restoreAllMocks()` resets implementations
- Runs automatically after every test

---

### Example 3: Test Utils with Reset (test-utils/index.ts)

```typescript
// From: server/src/test-utils/index.ts

export const cleanupTestEnv = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

export const testData = {
  order: (overrides = {}) => ({
    id: 'test-order-id',
    // ... unique data per call
    ...overrides,
  }),
};
```

**Why this works:**
- Exposes `cleanupTestEnv()` for manual cleanup
- `testData` factory creates new instances
- Can be imported in any test

---

## 6. Debugging Workflow

When you encounter a test isolation issue:

### Step 1: Reproduce the Problem
```bash
# Run all tests - fails
npm run test

# Run specific test - passes
npm run test -- src/services/cart.test.ts
```

### Step 2: Identify the Culprit
```bash
# Run tests in different order
npm run test -- --reporter=verbose

# Look for failures that depend on test execution order
# If "Test B" fails when "Test A" runs first, Test A is leaking state
```

### Step 3: Check Module-Level State
```typescript
// Search for these patterns in the modules being tested
const cache = new Map();  // ← SUSPICIOUS
const storage = {};       // ← SUSPICIOUS
let counter = 0;          // ← SUSPICIOUS

// Check for hardcoded test IDs
const testId = 'test-1';  // ← REUSED? Check across multiple tests
```

### Step 4: Apply Fix
```typescript
// Option A: Generate unique IDs
let testCounter = 0;
beforeEach(() => {
  testId = `test-${++testCounter}-${Date.now()}`;
});

// Option B: Clear state
afterEach(() => {
  service.reset();
  vi.clearAllMocks();
});

// Option C: Use resetModules()
beforeEach(() => {
  vi.resetModules();
});
```

### Step 5: Verify Fix
```bash
# Run all tests
npm run test

# Run in random order
npm run test -- --reporter=verbose

# Run specific test that was failing
npm run test -- test-name.test.ts
```

---

## 7. CI/CD Considerations

### GitHub Actions Best Practices

```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3

    - run: npm run test:server
      env:
        NODE_ENV: test
        # Disable any caching that might persist state
        NODE_OPTIONS: --max-old-space-size=3072

    # Run tests multiple times to catch isolation issues
    - run: npm run test:server
    - run: npm run test:server
```

### Local Testing Before Commit

```bash
# Run tests 3 times to catch intermittent failures
npm run test && npm run test && npm run test

# Or use test:healthy to exclude quarantined tests
npm run test:healthy
```

---

## 8. Summary: Prevention Checklist

When writing tests or adding features that need testing:

- [ ] **Use unique test IDs** - Counter + timestamp + random
- [ ] **Export reset functions** - For module-level state
- [ ] **Clear mocks between tests** - `vi.clearAllMocks()` in `afterEach`
- [ ] **Avoid hardcoded identifiers** - Generate IDs dynamically
- [ ] **Check module-level declarations** - No persistent `const` collections
- [ ] **Run tests multiple times** - Catch intermittent failures
- [ ] **Review test order dependency** - Tests should not rely on execution sequence
- [ ] **Document state management** - Especially for shared test utilities

---

## References

- **Vitest Docs**: https://vitest.dev/
- **Jest Best Practices**: https://jestjs.io/docs/setup-teardown
- **Rebuild-6.0 Test Infrastructure**:
  - `/server/vitest.config.ts` - Vitest configuration
  - `/server/tests/bootstrap.ts` - Global test setup
  - `/server/src/test-utils/index.ts` - Test utilities
  - `/server/tests/ai/functions/realtime-menu-tools.test.ts` - Example pattern

---

**Last Updated**: 2025-11-25
**Author**: Claude Code
**Status**: Ready for use
