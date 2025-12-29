# Vitest Mocking Quick Reference

**Last Updated:** 2025-12-29

**For code reviews and test debugging** - 5 minute read

Bookmark this when reviewing tests with mocks.

---

## Critical Mocking Rules

### Rule 1: Mock Clearing

```
☐ beforeEach: vi.resetAllMocks()  ← Resets call history, keeps factory
☐ afterEach: vi.restoreAllMocks()  ← Full cleanup
☐ NOT vi.clearAllMocks() in tests  ← This clears factory functions!
```

**If wrong:** "Cannot read property 'create' of undefined" - mock is undefined

---

### Rule 2: Module Initialization Order

```
☐ All vi.mock() calls BEFORE imports
☐ Modules use ES6 import, not top-level require()
☐ If top-level require() exists: add vi.resetModules() + re-import
☐ Import modules AFTER mocks are defined
```

**If wrong:** Module initializes with real Stripe, not mock

---

### Rule 3: Mock Factory Structure

```typescript
// ❌ WRONG - Missing nested structure
vi.mock('stripe', () => ({
  default: vi.fn()
}));

// ✅ CORRECT - Complete object hierarchy
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
```

**If wrong:** "Cannot read property 'create' of undefined" when code calls stripe.refunds.create()

---

### Rule 4: Test Expectations Must Match Implementation

```typescript
// ❌ WRONG - Expects old format, code changed it
expect(idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);  // Old UUID format
// Code now does: `${orderId}-${timestamp}`

// ✅ CORRECT - Validate actual implementation format
expect(idempotencyKey).toMatch(/^[a-z0-9]+-\d+$/);  // Matches new code
```

**If wrong:** Test passes but doesn't test what's actually happening

---

## Red Flags - Fix These Immediately

| Red Flag | Example | Fix |
|----------|---------|-----|
| `vi.clearAllMocks()` in beforeEach | `vi.clearAllMocks()` | Change to `vi.resetAllMocks()` |
| Imports before mocks | Import then vi.mock() | Move vi.mock() to top |
| Module-level require() | `const stripe = require('stripe')(key)` | Use lazy getter or ES6 import |
| No re-import after resetModules | vi.resetModules(); (no re-import) | Add `const mod = await import(...)` |
| Loose expectations | `expect.anything()` | Use `expect.objectContaining()` |
| Expects old format | Test checks UUID but code generates timestamp | Update regex to match current code |

---

## Quick Fixes by Symptom

### "Cannot read property of undefined"

```typescript
// Problem: beforeEach uses clearAllMocks instead of resetAllMocks
beforeEach(() => {
  vi.clearAllMocks();  // ← WRONG
});

// Solution: Use resetAllMocks
beforeEach(() => {
  vi.resetAllMocks();  // ← CORRECT
});
```

---

### "Network call made in test (shouldn't happen)"

Module uses top-level require before vi.mock intercepts:

```typescript
// orderStateMachine.ts (WRONG)
const stripe = require('stripe')(key);  // ← Initializes immediately

// Solution: Change to lazy
let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) stripeClient = require('stripe')(key);
  return stripeClient;
}

// Test: Reset modules
vi.resetModules();
const { OrderStateMachine } = await import('...');
```

---

### "Test passes but doesn't match implementation"

Test expectation is too loose or outdated:

```typescript
// ❌ WRONG - Too loose
expect(PaymentService.log).toHaveBeenCalled();

// ✅ CORRECT - Validate actual format
const [call] = vi.mocked(PaymentService.log).mock.calls[0];
expect(call.idempotencyKey).toMatch(/^order-\d+-\d+$/);
```

---

## Perfect Test Template

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock BEFORE imports
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: { create: vi.fn() },
    refunds: { create: vi.fn() },
  }))
}));

vi.mock('../../src/services/payment.service', () => ({
  PaymentService: {
    validatePaymentRequest: vi.fn(),
    logPaymentAttempt: vi.fn(),
  }
}));

// 2. Import AFTER mocks
import { OrderStateMachine } from '../../src/services/orderStateMachine';
import { PaymentService } from '../../src/services/payment.service';

describe('Payment Processing', () => {
  // 3. Reset before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 4. Full cleanup after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process payment', async () => {
    // 5. Set mock return values
    vi.mocked(PaymentService.validatePaymentRequest).mockResolvedValue({
      amount: 2550,
      idempotencyKey: 'order-123-1234567890',
      orderTotal: 25.50,
      tax: 2.04,
      subtotal: 23.46,
    });

    // 6. Call code
    await OrderStateMachine.processPayment('order-123');

    // 7. Validate: use objectContaining for partial match
    expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-123',
        status: 'initiated',
        // Validate format of variable values
        idempotencyKey: expect.stringMatching(/^[a-z0-9]+-\d+$/),
      })
    );
  });
});
```

---

## Testing Different Scenarios

```typescript
describe('Payment scenarios', () => {
  beforeEach(() => {
    vi.resetAllMocks();  // Reset before each test
  });

  it('should handle success', async () => {
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

  it('should handle error', async () => {
    vi.mocked(PaymentService.validatePaymentRequest).mockRejectedValue(
      new Error('Validation failed')
    );

    const result = await processPayment('order-456');
    expect(result.success).toBe(false);
  });
});
```

---

## Checklist for Code Review

When you see tests with mocks, check:

### Setup (Must Have)
- [ ] `vi.mock()` calls appear BEFORE any imports
- [ ] All mocked objects have complete structure matching code usage
- [ ] Factory functions use `vi.fn().mockImplementation()`

### Assertions (Must Have)
- [ ] Uses `expect.objectContaining()`, not exact match
- [ ] Variable values matched with regex: `expect.stringMatching(/.../)`
- [ ] Validates BOTH presence and FORMAT of critical fields
- [ ] Expectations match current implementation (not old code)

### Cleanup (Must Have)
- [ ] `beforeEach()` calls `vi.resetAllMocks()` (NOT clearAllMocks)
- [ ] `afterEach()` calls `vi.restoreAllMocks()`
- [ ] If `vi.resetModules()` used, module re-imported in beforeEach

---

## Module Initialization Patterns

### Pattern A: ES6 Import (Preferred)
```typescript
// Code
import Stripe from 'stripe';

const stripe = new Stripe(key);

// Test - Just mock it
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({ ... }))
}));
```
**Best for:** New code

---

### Pattern B: Lazy Initialization
```typescript
// Code
let stripe: Stripe | null = null;
function getStripe() {
  if (!stripe) stripe = require('stripe')(key);
  return stripe;
}

// Test - Mock intercepts lazy require
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({ ... }))
}));
```
**Best for:** Can't change to import

---

### Pattern C: Reset Modules
```typescript
// Test
beforeEach(async () => {
  vi.resetModules();  // Clear require() cache
  const mod = await import('../../src/services/service');
  Service = mod.Service;
});
```
**Best for:** Module has top-level side effects

---

## Expected Format Constants

Define formats your code uses, validate in tests:

```typescript
// test/constants.ts
export const EXPECTED_FORMATS = {
  idempotencyKey: /^[a-z0-9]+-\d+$/,     // order-123-1234567890
  paymentId: /^pi_test_/,                 // pi_test_...
  orderId: /^[a-z0-9-]{36}$/,            // UUID
  timestamp: /^\d{4}-\d{2}-\d{2}T/,      // ISO 8601
};

// test file
import { EXPECTED_FORMATS } from '../test/constants';

expect(result.idempotencyKey).toMatch(EXPECTED_FORMATS.idempotencyKey);
```

---

## When Tests Mysteriously Fail

1. **Check symptom in table above** ← Tells you what's wrong
2. **Read the fix** ← Shows solution
3. **Apply to code** ← Copy pattern
4. **Re-run test** ← Should pass

---

**See Also:** `CL-TEST-004-VITEST-MOCKING-PREVENTION.md` for full guide
