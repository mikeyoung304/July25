# Test State Isolation Patterns - Copy & Paste Reference

Quick reference guide with ready-to-use patterns for preventing test isolation issues.

---

## Pattern 1: Unique Identifier Generator (Recommended)

**Use this for 90% of test isolation issues.**

### Basic Version
```typescript
// Copy directly into your test file

describe('MyService', () => {
  let testCounter = 0;
  let testId: string;

  beforeEach(() => {
    testId = `test-${++testCounter}-${Date.now()}`;
  });

  it('should work', () => {
    // testId is unique: "test-1-1700956234567"
  });

  it('should not leak state', () => {
    // testId is unique: "test-2-1700956234568"
  });
});
```

### Advanced Version with Multiple Test IDs
```typescript
describe('OrderService', () => {
  let testCounter = 0;

  // Helper to generate unique IDs
  const generateTestId = (prefix: string = 'test') => {
    return `${prefix}-${++testCounter}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  let sessionId: string;
  let userId: string;
  let orderId: string;

  beforeEach(() => {
    sessionId = generateTestId('session');
    userId = generateTestId('user');
    orderId = generateTestId('order');
  });

  it('should create order for user session', () => {
    expect(sessionId).toMatch(/^session-\d+-\d+-[a-z0-9]+$/);
    expect(userId).toMatch(/^user-\d+-\d+-[a-z0-9]+$/);
  });
});
```

### With Multiple Test Suites
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

// Shared counter at module level (safe because it's never read in tests)
let globalTestCounter = 0;

describe('ServiceA', () => {
  let testId: string;

  beforeEach(() => {
    testId = `serviceA-${++globalTestCounter}-${Date.now()}`;
  });

  it('test 1', () => {
    // "serviceA-1-1700956234567"
  });
});

describe('ServiceB', () => {
  let testId: string;

  beforeEach(() => {
    testId = `serviceB-${++globalTestCounter}-${Date.now()}`;
  });

  it('test 1', () => {
    // "serviceB-2-1700956234568"
  });
});
```

---

## Pattern 2: Service Reset Function

**Use when you control the service being tested.**

### Step 1: Export Reset Function from Service
```typescript
// src/services/cartCache.ts

const cartsBySession = new Map<string, Cart>();

export function getCart(sessionId: string): Cart | undefined {
  return cartsBySession.get(sessionId);
}

export function addToCart(sessionId: string, item: Item): Cart {
  const cart = cartsBySession.get(sessionId) || { items: [] };
  cart.items.push(item);
  cartsBySession.set(sessionId, cart);
  return cart;
}

// CRITICAL: Export this for testing
export function resetCartCache(): void {
  cartsBySession.clear();
}
```

### Step 2: Use Reset in Tests
```typescript
import { getCart, addToCart, resetCartCache } from '../cartCache';
import { describe, it, expect, afterEach } from 'vitest';

describe('CartCache', () => {
  afterEach(() => {
    // Clean up after every test
    resetCartCache();
  });

  it('should add item to cart', () => {
    const cart = addToCart('session-1', { id: 'item-1', name: 'Burger' });
    expect(cart.items).toHaveLength(1);
  });

  it('should start with clean cart', () => {
    // resetCartCache() was called in afterEach from previous test
    const cart = getCart('session-1');
    expect(cart).toBeUndefined();
  });
});
```

### Step 3: Optional - Reset Multiple Services
```typescript
// src/test-utils/resetAllServices.ts

import { resetCartCache } from '../services/cartCache';
import { resetSessionStore } from '../services/sessionStore';
import { resetOrderQueue } from '../services/orderQueue';

export function resetAllServices(): void {
  resetCartCache();
  resetSessionStore();
  resetOrderQueue();
}
```

```typescript
import { resetAllServices } from '../test-utils/resetAllServices';
import { afterEach } from 'vitest';

describe('Integration', () => {
  afterEach(() => {
    resetAllServices();
  });

  // Tests here
});
```

---

## Pattern 3: Complete Mock Reset

**Use for tests with heavy mocking.**

### Minimal Setup
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ServiceWithMocks', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Clear call counts
  });

  afterEach(() => {
    vi.resetAllMocks();  // Reset mock implementations
  });

  // Tests here
});
```

### Full Setup (Copy from rebuild-6.0)
```typescript
// Based on server/tests/bootstrap.ts

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

describe('ComplexMockingScenario', () => {
  // Reset modules before importing (use sparingly)
  beforeAll(async () => {
    vi.resetModules();
    // Re-import your service here
  });

  // Clear mock data between tests
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Full cleanup after tests
  afterEach(() => {
    vi.clearAllTimers();    // Clear setTimeout/setInterval
    vi.clearAllMocks();     // Clear call history
    vi.resetAllMocks();     // Reset implementations
  });

  it('test 1', () => {
    // Test code
  });

  it('test 2', () => {
    // Test code
  });

  // Final cleanup
  afterAll(() => {
    vi.restoreAllMocks();   // Restore original implementations
  });
});
```

---

## Pattern 4: Global Setup (Recommended for All Tests)

**Add this to your `vitest.config.ts` to automatically apply to all tests.**

### Update vitest.config.ts
```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    watch: false,
    isolate: true,                              // Important: isolate tests
    hookTimeout: 15000,
    testTimeout: 15000,
    poolOptions: {
      threads: {
        singleThread: true                      // Prevent race conditions
      }
    },
    setupFiles: ['tests/setup.ts', 'tests/bootstrap.ts'], // ← Add both
  },
});
```

### Create tests/bootstrap.ts
```typescript
// tests/bootstrap.ts

import { afterEach, beforeEach, beforeAll, afterAll, vi } from 'vitest';

// Configure test timeouts
beforeAll(() => {
  vi.setConfig({ testTimeout: 30000 });
});

// Clear environment between tests
beforeEach(() => {
  // Optional: Reset modules for complete isolation
  // vi.resetModules();
});

// Aggressive cleanup after every test
afterEach(() => {
  vi.clearAllTimers();      // Clear pending timers
  vi.clearAllMocks();       // Clear mock call history
  vi.resetAllMocks();       // Reset mock implementations
  // Note: Intentionally NOT calling vi.resetModules()
  // That's per-test if needed, not global
});

// Final cleanup
afterAll(() => {
  vi.restoreAllMocks();
});
```

---

## Pattern 5: Test Data Factory

**Use for creating test objects without polluting state.**

### Basic Factory
```typescript
// test/factories/createTestOrder.ts

let orderIdCounter = 0;

export interface TestOrder {
  id: string;
  restaurant_id: string;
  customer_name: string;
  items: Array<{ id: string; name: string; quantity: number }>;
  status: 'pending' | 'confirmed' | 'completed';
}

export function createTestOrder(overrides: Partial<TestOrder> = {}): TestOrder {
  return {
    id: `order-${++orderIdCounter}-${Date.now()}`, // Unique ID
    restaurant_id: '11111111-1111-1111-1111-111111111111',
    customer_name: 'Test Customer',
    items: [
      { id: 'item-1', name: 'Burger', quantity: 1 }
    ],
    status: 'pending',
    ...overrides,
  };
}
```

### Usage
```typescript
import { createTestOrder } from './factories/createTestOrder';

describe('OrderService', () => {
  it('should create order', () => {
    const order1 = createTestOrder();
    const order2 = createTestOrder();

    // IDs are guaranteed unique
    expect(order1.id).not.toBe(order2.id);
  });

  it('should override fields', () => {
    const order = createTestOrder({
      customer_name: 'Custom Name',
      status: 'completed'
    });

    expect(order.customer_name).toBe('Custom Name');
    expect(order.status).toBe('completed');
    expect(order.id).toMatch(/^order-/);
  });
});
```

---

## Pattern 6: Fixture Cleanup

**For tests that modify shared fixtures/databases.**

### With afterEach Cleanup
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('DatabaseService', () => {
  let testRecordId: string;

  beforeEach(async () => {
    // Generate unique ID
    testRecordId = `record-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  afterEach(async () => {
    // Clean up after test
    try {
      await database.delete('records').where('id', '=', testRecordId);
    } catch (error) {
      // Ignore if already deleted
    }
  });

  it('should create record', async () => {
    await database.insert('records', {
      id: testRecordId,
      data: 'test data'
    });

    const record = await database.select('records').where('id', '=', testRecordId);
    expect(record).toBeDefined();
  });

  it('should update record', async () => {
    // testRecordId is unique - no collision with previous test
    await database.insert('records', {
      id: testRecordId,
      data: 'original'
    });

    await database.update('records')
      .set({ data: 'updated' })
      .where('id', '=', testRecordId);

    const record = await database.select('records').where('id', '=', testRecordId);
    expect(record.data).toBe('updated');
  });
});
```

---

## Pattern 7: Module-Level State with Reset

**For modules you don't fully control.**

### Create Wrapper
```typescript
// src/services/sessionStore.ts

const SESSIONS = new Map<string, Session>();

export const SessionStore = {
  add(id: string, session: Session) {
    SESSIONS.set(id, session);
  },

  get(id: string) {
    return SESSIONS.get(id);
  },

  clear() {
    SESSIONS.clear();
  }
};
```

### Test It
```typescript
import { SessionStore } from '../sessionStore';
import { afterEach } from 'vitest';

describe('SessionStore', () => {
  afterEach(() => {
    SessionStore.clear(); // Clean up
  });

  it('should store session', () => {
    const session = { userId: 'user-1', token: 'token-123' };
    SessionStore.add('session-1', session);

    expect(SessionStore.get('session-1')).toEqual(session);
  });

  it('should start fresh', () => {
    // Clear was called in afterEach
    expect(SessionStore.get('session-1')).toBeUndefined();
  });
});
```

---

## Pattern 8: Spy on Module-Level State (Advanced)

**For debugging state pollution.**

### Detect Leaks
```typescript
import { vi } from 'vitest';

describe('LeakDetector', () => {
  it('should detect module-level state mutations', () => {
    // Import the module
    const module = require('../services/cartCache');

    // Spy on the Map to see mutations
    const mapSet = vi.spyOn(Map.prototype, 'set');
    const mapGet = vi.spyOn(Map.prototype, 'get');

    // Run test operations
    module.addToCart('session-1', { id: 'item-1' });

    // Check if state was mutated
    expect(mapSet).toHaveBeenCalled();
    expect(mapGet).toHaveBeenCalled();

    // Verify cleanup
    module.reset?.();
    mapSet.mockClear();
    mapGet.mockClear();

    // Next test should have clean state
    expect(mapSet).not.toHaveBeenCalled();
  });
});
```

---

## Pattern 9: Quick Isolation Check

**Add this test to any file to detect isolation issues.**

```typescript
import { describe, it, expect } from 'vitest';

describe('ISOLATION CHECK - Run First', () => {
  const storageKey = 'isolation-test-marker';

  it('1st: should write marker', () => {
    // Write to shared storage
    localStorage.setItem(storageKey, 'test-1');
    expect(localStorage.getItem(storageKey)).toBe('test-1');
  });

  it('2nd: should NOT see marker from previous test', () => {
    // If this fails, state is leaking!
    const value = localStorage.getItem(storageKey);
    if (value) {
      throw new Error(
        `ISOLATION FAILURE: Found marker from previous test: "${value}". ` +
        'Module-level state is persisting across tests!'
      );
    }
  });

  it('3rd: should write new marker', () => {
    localStorage.setItem(storageKey, 'test-3');
    expect(localStorage.getItem(storageKey)).toBe('test-3');
  });
});
```

---

## Decision Tree: Which Pattern to Use?

```
Do you control the service being tested?
├─ YES
│  ├─ Simple stateless service?
│  │  └─ Use Pattern 1: Unique IDs
│  │
│  ├─ Service with internal state (Map, Set, etc.)?
│  │  └─ Use Pattern 2: Reset Function
│  │
│  └─ Service with heavy mocking?
│     └─ Use Pattern 3: Mock Reset
│
└─ NO (third-party library or framework)
   ├─ Can you modify test setup?
   │  └─ Use Pattern 4: Global Setup
   │
   └─ Temporary workaround needed?
      └─ Use Pattern 1: Unique IDs everywhere
```

---

## Checklist Before Committing Tests

```
[ ] Are any test IDs hardcoded? (❌ Bad)
[ ] Do all tests generate unique IDs? (✅ Good)
[ ] Is there an afterEach/afterAll hook? (✅ Good)
[ ] Does afterEach clean up state? (✅ Good)
[ ] Did you run tests multiple times? (✅ Good)
[ ] Did tests pass in isolation and together? (✅ Good)
[ ] Does the service have a reset/clear function? (✅ Good if service has state)
[ ] Are mocks cleared between tests? (✅ Good)
```

---

## Common Problems & Solutions

### Problem: "Same ID used in multiple tests"
```typescript
// ❌ BAD
const testId = 'user-123';
const orderId = 'order-456';

// ✅ GOOD
let testCounter = 0;
const generateId = () => `id-${++testCounter}-${Date.now()}`;
const testId = generateId();
const orderId = generateId();
```

---

### Problem: "Tests pass alone but fail together"
```typescript
// ❌ Root cause: Module-level state
const cache = new Map();

// ✅ Solution 1: Export reset
export function clearCache() { cache.clear(); }

// ✅ Solution 2: Use unique IDs
const sessionId = `session-${Date.now()}-${Math.random()}`;
```

---

### Problem: "Memory grows with each test run"
```typescript
// ❌ Root cause: State accumulation
const allSessions: Session[] = []; // Never cleared

// ✅ Solution: Clear in afterEach
afterEach(() => {
  allSessions.length = 0; // or allSessions.splice(0);
  vi.clearAllMocks();
});
```

---

### Problem: "Only happens when running full suite"
```typescript
// ❌ Likely root cause: Shared module state

// ✅ Add this test to diagnose:
it('isolation-check', () => {
  const testMarker = 'isolation-' + Math.random();
  if (typeof window !== 'undefined') {
    window.testMarkers = window.testMarkers || [];
    window.testMarkers.push(testMarker);
    // If array is too long, state is leaking!
    expect(window.testMarkers).toHaveLength(1);
  }
});
```

---

## Reference Implementation (From rebuild-6.0)

See working examples:

1. **Unique Session IDs**
   - File: `/server/tests/ai/functions/realtime-menu-tools.test.ts`
   - Lines: 81-93

2. **Mock Clearing**
   - File: `/server/tests/bootstrap.ts`
   - Lines: 26-32

3. **Test Utils**
   - File: `/server/src/test-utils/index.ts`
   - Lines: 156-159

4. **Factory Pattern**
   - File: `/server/src/test-utils/index.ts`
   - Lines: 94-144

---

**Use these patterns in your tests. 90% of isolation issues are solved by Pattern 1 (unique IDs) + Pattern 4 (global mock clearing).**

Last Updated: 2025-11-25
