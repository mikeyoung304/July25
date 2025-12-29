# Vitest Mocking Prevention Guide

**Purpose:** Prevent common Vitest mocking mistakes that cause test failures related to mock clearing, module loading, and test expectations drift.

**Time to read:** 40-50 minutes

**Based on:** Issues discovered in payment service tests where mock clearing, module initialization timing, and stale expectations caused failures.

---

## The Core Problem

Vitest mocking failures typically stem from three interconnected issues:

```
Mock implementation gets cleared
    ↓ (vi.clearAllMocks() affects factory functions)
Module already initialized with real client
    ↓ (require() happens at load time, before vi.mock interceptor)
Test expectations don't match implementation
    ↓ (Code changes but tests still expect old format)

Result: Cryptic failures - "Cannot read property of undefined"
```

When any ONE of these goes wrong, tests fail mysteriously. When ALL THREE go wrong together, you spend hours debugging.

---

## Issue 1: Mock Clearing Clears Factory Functions

### The Problem

`vi.clearAllMocks()` doesn't just reset return values—it **clears the entire mock implementation** including factory functions:

```typescript
// ❌ WRONG - Factory function gets cleared
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: { create: vi.fn() }
  }))
}));

describe('Payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();  // ← Clears the factory function!
    // Now vi.mock('stripe') returns empty mock, not the factory
  });
});
```

Why? `vi.clearAllMocks()` clears all mocks in the module cache. The **factory function becomes undefined**, not just its return value.

### Solution Pattern 1: Use `vi.resetAllMocks()` Instead

```typescript
// ✅ CORRECT - Keeps factory function, resets return values
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    }
  }))
}));

describe('Payment', () => {
  beforeEach(() => {
    vi.resetAllMocks();  // ← Keeps factory, resets call counts & return values
  });

  afterEach(() => {
    vi.restoreAllMocks();  // ← Full cleanup after test
  });
});
```

**Key Difference:**
- `vi.clearAllMocks()` → Removes the mock entirely (clears factory)
- `vi.resetAllMocks()` → Keeps the mock, resets call history and return values
- `vi.restoreAllMocks()` → Use in afterEach, full cleanup

### When to Use Each

| Scenario | Use | Why |
|----------|-----|-----|
| Module initialization at load (factory function) | `vi.resetAllMocks()` | Preserves factory for each test |
| Service mocks with resolved values | `vi.resetAllMocks()` | Keeps implementation, resets return values |
| Side effects between tests | `vi.resetAllMocks()` | Clears all state safely |
| Final cleanup after test suite | `vi.restoreAllMocks()` | Complete teardown |
| Testing different mock return values | `vi.resetAllMocks()` + re-set mocks | Reset then configure fresh |

---

## Issue 2: Module Initialization Timing (require() at Load Time)

### The Problem

If a module uses `require()` at the top level instead of ES6 `import`, the module initializes **before** `vi.mock()` can intercept:

```typescript
// orderStateMachine.ts - Module load time
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);  // ← Happens immediately!

export class OrderStateMachine {
  static refund(orderId: string) {
    // stripe client is ALREADY initialized with real value
    // vi.mock('stripe') never intercepts this
  }
}

// Test file
vi.mock('stripe', () => ({  // ← Too late! Module already loaded
  default: vi.fn()
}));

import { OrderStateMachine } from '../../src/services/orderStateMachine';
```

The module loads with the **real Stripe client** because `require()` happens at the top level, before test setup.

### Solution Pattern 1: Use ES6 `import` with Mocking

```typescript
// ✅ CORRECT - Use import, not require
// orderStateMachine.ts
import Stripe from 'stripe';

export class OrderStateMachine {
  static refund(orderId: string) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    // Now stripe can be mocked
  }
}

// Test file
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    refunds: { create: vi.fn() }
  }))
}));

import { OrderStateMachine } from '../../src/services/orderStateMachine';
```

**Why this works:** ES6 `import` hoists to top of file but Vitest's `vi.mock()` runs in correct order.

### Solution Pattern 2: Lazy Initialize if Must Use require()

```typescript
// ✅ CORRECT - Lazy initialization (if stuck with require)
// orderStateMachine.ts
let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const Stripe = require('stripe');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

export class OrderStateMachine {
  static async refund(orderId: string) {
    const stripe = getStripeClient();
    // Now stripe can be mocked (vi.mock intercepts require call)
  }
}

// Test file
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    refunds: { create: vi.fn() }
  }))
}));

import { OrderStateMachine } from '../../src/services/orderStateMachine';
```

### Solution Pattern 3: Use `vi.resetModules()` for Full Reset

```typescript
// ✅ CORRECT - Reset module cache between tests
describe('OrderStateMachine', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();  // ← Clears require() cache

    // Re-import after mock is set up
    const { OrderStateMachine } = await import('../../src/services/orderStateMachine');
    // Now module loads with mocked Stripe
  });
});
```

**When to use:**
- Module uses top-level `require()` and you can't change it
- Module has global state that needs fresh initialization
- Testing different environment variables per test
- Stripe or other clients initialized at module load

### Best Practices for Module Initialization

| Pattern | Use When | Example |
|---------|----------|---------|
| ES6 `import` | Starting new code | `import Stripe from 'stripe'` |
| Lazy require | Can't change to import, external module | Function that calls `require()` once |
| `vi.resetModules()` | Module has top-level side effects | Stripe client at module top level |
| Dependency injection | Full control needed | Pass client as parameter |

---

## Issue 3: Test Expectations Drift from Implementation

### The Problem

Code changes format (e.g., idempotency key generation), but tests still expect the old format:

```typescript
// Implementation changed from random UUID to ordered format
function generateIdempotencyKey(orderId: string, timestamp: number): string {
  return `${orderId}-${timestamp}`;  // ← New format!
}

// But test still expects old format
it('should include idempotency key in audit log', async () => {
  expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: /^[a-f0-9-]{36}$/,  // ← Old UUID format!
    })
  );
  // Test passes but doesn't validate the actual implementation
});
```

Result: Test passes but doesn't test what's actually happening. The assertion is **too loose**.

### Solution Pattern 1: Use Loose Matchers During Development

```typescript
// ✅ CORRECT - Use matchers that match implementation
it('should include idempotency key in audit log', async () => {
  expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: expect.any(String),  // ← Loose: just check it's a string
    })
  );
});
```

### Solution Pattern 2: Capture and Validate in Test

```typescript
// ✅ CORRECT - Capture actual value and validate format
it('should include idempotency key in audit log', async () => {
  await request(app)
    .post('/api/v1/payments/create-payment-intent')
    .set('Authorization', 'Bearer test-token')
    .set('x-restaurant-id', 'test-restaurant-id')
    .send({ order_id: 'order-123' });

  // Capture the actual call
  const calls = vi.mocked(PaymentService.logPaymentAttempt).mock.calls;
  expect(calls.length).toBeGreaterThan(0);

  // Validate against actual implementation format
  const [firstCall] = calls;
  const { idempotencyKey } = firstCall[0];

  // Should be: `${orderId}-${timestamp}`
  expect(idempotencyKey).toMatch(/^order-\d+$/);
});
```

### Solution Pattern 3: Use Snapshot Tests for Complex Objects

```typescript
// ✅ CORRECT - Snapshot for complex structures
it('should log payment attempt with correct structure', async () => {
  vi.mocked(PaymentService.logPaymentAttempt).mockResolvedValue();

  await request(app)
    .post('/api/v1/payments/create-payment-intent')
    .set('Authorization', 'Bearer test-token')
    .set('x-restaurant-id', 'test-restaurant-id')
    .send({ order_id: 'order-123' });

  expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
    expect.objectContaining({
      orderId: 'order-123',
      status: 'initiated',
      paymentMethod: 'card',
    })
  );

  // For idempotency key specifically, validate the format matches current implementation
  const [call] = vi.mocked(PaymentService.logPaymentAttempt).mock.calls[0];
  expect(call.idempotencyKey).toMatch(/^[a-z0-9\-]+$/);  // General format
});
```

### Solution Pattern 4: Document Expected Formats as Constants

```typescript
// ✅ CORRECT - Document format expectations
// test/constants.ts
export const EXPECTED_FORMATS = {
  idempotencyKey: /^[a-z0-9]+-\d+$/,  // Format: "order-123-1234567890"
  paymentId: /^pi_test_/,  // Format: "pi_test_..."
  timestamp: /^\d{4}-\d{2}-\d{2}T/,  // ISO 8601
};

// test file
it('should include idempotency key in audit log', async () => {
  expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
    expect.objectContaining({
      idempotencyKey: expect.stringMatching(EXPECTED_FORMATS.idempotencyKey),
    })
  );
});
```

### When Test Expectations Drift: How to Fix

```
1. Run test → Fails with cryptic error
2. Check test output for ACTUAL value received
3. Check implementation for what it SHOULD be
4. Update test expectation to match implementation
5. Re-run test
6. If implementation changed, update constants/documentation
```

---

## Prevention Checklist: Before Writing Tests

### Setup Phase
- [ ] All `vi.mock()` calls before any imports
- [ ] Module uses ES6 `import`, not top-level `require()`
- [ ] If top-level `require()` exists, add `vi.resetModules()` in beforeEach
- [ ] Factory functions use `vi.fn().mockImplementation()`
- [ ] Mock returns proper object structure

### Assertion Phase
- [ ] Expectations match current implementation format
- [ ] Use `expect.objectContaining()` for partial matches
- [ ] Use `expect.any(String)` or `expect.stringMatching()` for variable values
- [ ] Document expected formats in constants
- [ ] Test the format (regex) along with presence

### Cleanup Phase
- [ ] `beforeEach`: `vi.resetAllMocks()` (NOT `clearAllMocks()`)
- [ ] `afterEach`: `vi.restoreAllMocks()`
- [ ] `beforeEach` after `vi.resetModules()`: re-import module

### Red Flags - Avoid These

| Wrong Pattern | Correct Pattern | Why |
|---------------|-----------------|-----|
| `vi.clearAllMocks()` in beforeEach | `vi.resetAllMocks()` | Preserves factory functions |
| Module-level `require('external')` | `import` or lazy getter | Allows vi.mock to intercept |
| Loose expectations: `expect.anything()` | `expect.objectContaining()` + validate | Actually tests the implementation |
| Snapshots without format validation | Named matcher: `EXPECTED_FORMATS.foo` | Format changes are caught |
| No re-imports after `vi.resetModules()` | Re-import in beforeEach | Module gets fresh mocks |

---

## Common Scenarios and Solutions

### Scenario 1: "Cannot read property of undefined"

**Symptoms:**
- Mock is undefined
- Factory function not called
- Test passes locally, fails in CI sometimes

**Root Cause:**
- Using `vi.clearAllMocks()` instead of `vi.resetAllMocks()`

**Fix:**
```typescript
beforeEach(() => {
  vi.resetAllMocks();  // ← Not clearAllMocks
});
```

---

### Scenario 2: "Module initializes with real client, not mock"

**Symptoms:**
- Network calls from module (shouldn't happen)
- Real Stripe errors in test
- Mock never called

**Root Cause:**
- Module uses top-level `require()` before vi.mock intercepts
- OR missing `vi.resetModules()` after mocking

**Fix:**
```typescript
// Option A: Use ES6 import
import Stripe from 'stripe';

// Option B: Use lazy initialization
let client: Stripe | null = null;
function getClient() {
  if (!client) client = require('stripe')(key);
  return client;
}

// Option C: Reset modules
vi.resetModules();  // Before import
const { Service } = await import('../../src/services/service');
```

---

### Scenario 3: "Test expects old idempotency format but code generates new format"

**Symptoms:**
- Test passes but shouldn't
- Code changed format but test unchanged
- Real data has different format than test expects

**Root Cause:**
- Test expectation too loose or outdated
- No validation of actual format in test

**Fix:**
```typescript
// Before: Too loose
expect(idempotencyKey).toBeDefined();

// After: Validates actual format
const [call] = vi.mocked(PaymentService.logPaymentAttempt).mock.calls[0];
expect(call.idempotencyKey).toMatch(/^order-\d+-\d+$/);  // Matches implementation
```

---

### Scenario 4: "Mock returns wrong structure"

**Symptoms:**
- `Cannot read property of 'create' of undefined`
- Service code expects `stripe.refunds.create()` but gets something else
- Only happens in this one test

**Root Cause:**
- Mock factory returns incomplete object
- Nested methods not mocked

**Fix:**
```typescript
// ❌ Wrong - Missing nested structure
vi.mock('stripe', () => ({
  default: vi.fn()
}));

// ✅ Correct - Complete structure
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  }))
}));
```

---

### Scenario 5: "Different behavior between test setup methods"

**Symptoms:**
- Test passes in one file, fails in another
- Same mock setup works in test A, breaks in test B
- Unclear why behavior differs

**Root Cause:**
- Inconsistent mock setup across files
- Different reset patterns

**Fix:**
Create a test helper file:

```typescript
// src/test-utils/stripe-mocks.ts
export function setupStripeMocks() {
  vi.mock('stripe', () => ({
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: {
        create: vi.fn().mockResolvedValue({
          id: 'pi_test_123',
          client_secret: 'cs_test_secret',
        }),
        retrieve: vi.fn(),
      },
      refunds: {
        create: vi.fn(),
      },
    }))
  }));
}

export function resetStripeMocks() {
  vi.resetAllMocks();
}

// Usage in every test file
setupStripeMocks();

describe('Payment', () => {
  beforeEach(() => {
    resetStripeMocks();
  });
});
```

---

## Best Practices Summary

### Pattern 1: Complete Mock Setup

```typescript
// ✅ CORRECT - Full template
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock BEFORE any imports
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  }))
}));

// Mock other services
vi.mock('../../src/services/payment.service', () => ({
  PaymentService: {
    validatePaymentRequest: vi.fn(),
    logPaymentAttempt: vi.fn(),
  }
}));

// Import AFTER mocks
import { OrderStateMachine } from '../../src/services/orderStateMachine';
import { PaymentService } from '../../src/services/payment.service';

describe('Payment Processing', () => {
  beforeEach(() => {
    // Reset mocks - keep factory functions, clear call history
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Full cleanup after all tests
    vi.restoreAllMocks();
  });

  it('should process payment with idempotency key', async () => {
    vi.mocked(PaymentService.validatePaymentRequest).mockResolvedValue({
      amount: 2550,
      idempotencyKey: 'order-123-1234567890',
      orderTotal: 25.50,
      tax: 2.04,
      subtotal: 23.46,
    });

    await OrderStateMachine.processPayment('order-123');

    expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: expect.stringMatching(/^[a-z0-9]+-\d+$/),
      })
    );
  });
});
```

### Pattern 2: Module With Top-Level require()

```typescript
// ✅ CORRECT - When must deal with top-level require
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: { create: vi.fn() }
  }))
}));

describe('Services with require()', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();  // ← Clear require() cache

    // Re-import after mocks are set up
    const module = await import('../../src/services/orderStateMachine');
    OrderStateMachine = module.OrderStateMachine;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use mocked stripe', async () => {
    // Module now has mocked Stripe
    await OrderStateMachine.refund('order-123');
    expect(/* mocked stripe called */).toBeTruthy();
  });
});
```

### Pattern 3: Testing Different Mock Responses

```typescript
// ✅ CORRECT - Reset and re-configure for each scenario
describe('Payment responses', () => {
  let paymentService: typeof PaymentService;

  beforeEach(async () => {
    vi.resetAllMocks();
  });

  it('should handle payment success', async () => {
    vi.mocked(PaymentService.validatePaymentRequest).mockResolvedValue({
      amount: 2550,
      idempotencyKey: 'key-1',
      orderTotal: 25.50,
      tax: 2.04,
      subtotal: 23.46,
    });

    const result = await processPayment('order-123');
    expect(result.success).toBe(true);
  });

  it('should handle payment failure', async () => {
    vi.mocked(PaymentService.validatePaymentRequest).mockRejectedValue(
      new Error('Insufficient funds')
    );

    const result = await processPayment('order-456');
    expect(result.success).toBe(false);
  });
});
```

---

## Code Review Checklist

When reviewing tests with mocks:

### Setup Section
- [ ] `vi.mock()` calls appear BEFORE any imports
- [ ] All external dependencies that code uses are mocked
- [ ] Mock factory uses `vi.fn().mockImplementation()` for complex objects
- [ ] Mock structure matches what code actually calls

### Assertion Section
- [ ] Expectations use `expect.objectContaining()`, not exact matching
- [ ] Variable values matched with regex or `expect.stringMatching()`
- [ ] Assert both presence AND format of critical fields
- [ ] No loose assertions like `expect.anything()`

### Cleanup Section
- [ ] `beforeEach()` uses `vi.resetAllMocks()` (not `clearAllMocks`)
- [ ] `afterEach()` uses `vi.restoreAllMocks()`
- [ ] If using `vi.resetModules()`, module re-imported in beforeEach
- [ ] No state leaking between tests

### Common Issues to Flag

```typescript
// ❌ RED FLAG - Using clearAllMocks
beforeEach(() => {
  vi.clearAllMocks();  // ← Should be resetAllMocks
});

// ❌ RED FLAG - Mock after imports
import { Service } from '../../src/services/service';
vi.mock('stripe', ...);  // ← Too late!

// ❌ RED FLAG - Too loose expectation
expect(PaymentService.log).toHaveBeenCalled();  // ← Doesn't validate format

// ❌ RED FLAG - Module-level require without lazy init
// orderStateMachine.ts
const stripe = require('stripe')(key);  // ← Can't be mocked!

// ✅ SAFE - Lazy initialization
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) stripe = require('stripe')(key);
  return stripe;
}
```

---

## Implementation Timeline

### Phase 1: Audit Current Tests (2-3 hours)
1. Find all files with `vi.clearAllMocks()`
2. Check for top-level `require()` in modules being tested
3. Identify loose test expectations
4. Document findings

### Phase 2: Create Test Utilities (2 hours)
1. Create `src/test-utils/mock-helpers.ts`
2. Create `src/test-utils/expected-formats.ts`
3. Document patterns in README

### Phase 3: Fix High-Risk Tests (1-2 days)
1. Payment-related tests (security-critical)
2. Stripe integration tests
3. Services with side effects

### Phase 4: Standardize Test Setup (1 day)
1. Update all test files to use `vi.resetAllMocks()`
2. Ensure consistent mock structure
3. Add format validation to assertions

### Phase 5: Validation & Documentation (4 hours)
1. Run full test suite
2. Document patterns in this file
3. Add to CLAUDE.md quick links
4. Team training

---

## Success Metrics

- [ ] 0 failures due to `vi.clearAllMocks()` being used incorrectly
- [ ] 0 tests with module-level `require()` that can't be mocked
- [ ] All test expectations validate actual implementation format
- [ ] All tests use `vi.resetAllMocks()` in beforeEach
- [ ] All tests use `vi.restoreAllMocks()` in afterEach
- [ ] Test failures are clear and actionable (not cryptic undefined errors)
- [ ] Mocks documented in mock-helpers.ts and re-used
- [ ] New developers can follow the patterns without confusion

---

## Related Documentation

- **Vitest Docs:** https://vitest.dev/guide/mocking.html
- **Solution:** `docs/solutions/test-failures/vitest-mocking-patterns.md`
- **CLAUDE.md:** Quick links to testing patterns

---

## Key Takeaways

1. **`vi.resetAllMocks()` not `clearAllMocks()`** - Preserves factory functions
2. **Use ES6 `import` or lazy initialization** - Allows vi.mock to intercept
3. **Reset modules between tests** - If module has top-level side effects
4. **Validate format in assertions** - Not just presence
5. **Create test utilities** - Consistent mocks across all tests

---

**Last Updated:** 2025-12-29
**Status:** Ready to use
**Maintainer:** Claude Code
**Review Cycle:** After each test failure related to mocking
