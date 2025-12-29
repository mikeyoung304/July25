# Vitest Mocking Prevention - Implementation Checklist

**Timeline:** 2-3 days

**Effort:** 4-6 hours implementation + 2 hours review + ongoing maintenance

**Outcome:** 0 test failures due to mocking issues, clear error messages when they occur

---

## Phase 1: Audit Current Tests (3 hours)

### Step 1.1: Find Problematic Patterns

```bash
# Find all clearAllMocks (should use resetAllMocks)
grep -r "vi.clearAllMocks" server/tests/ client/src/

# Find module-level require() calls
grep -r "const.*= require(" server/src/ | grep -v node_modules | grep -v "\.test\|\.spec"

# Find tests with mocks but no resetAllMocks
grep -l "vi.mock" server/tests/*.ts | while read f; do
  if ! grep -q "vi.resetAllMocks" "$f"; then
    echo "$f - MISSING vi.resetAllMocks"
  fi
done
```

### Step 1.2: Document Findings

Create file: `.claude/prevention/CL-TEST-004-AUDIT-RESULTS.md`

```markdown
# Vitest Mocking Audit Results

## Files Using vi.clearAllMocks() (Should be resetAllMocks)
- [ ] server/tests/services/payment-idempotency.test.ts (Line 50)
- [ ] server/tests/services/orderStateMachine.test.ts (Line 48)

## Files with Module-Level require() (Need lazy init or vi.resetModules)
- [ ] server/src/services/orderStateMachine.ts (Line 15)
- [ ] server/src/middleware/auth.ts (Line 8)

## Files with Loose Test Expectations
- [ ] server/tests/security/payment-p0-fixes.proof.test.ts (Line 176)
- [ ] server/tests/services/payment-audit.test.ts (Line 220)

## Test Files Missing Proper Cleanup
- [ ] client/src/services/orders/__tests__/OrderService.test.ts
- [ ] client/src/modules/voice/services/__tests__/VoiceCheckoutOrchestrator.test.ts
```

### Step 1.3: Prioritize

Mark as:
- **P0 (Critical):** Payment tests, security tests, Stripe-related
- **P1 (High):** Order state, auth-related
- **P2 (Medium):** UI tests, other services

---

## Phase 2: Create Test Utilities (2 hours)

### Step 2.1: Create Mock Helpers

File: `server/src/test-utils/mock-helpers.ts`

```typescript
import { vi } from 'vitest';
import Stripe from 'stripe';

/**
 * Standard Stripe mock factory
 * Use in every test that touches payment services
 */
export function createStripeMock(): Stripe {
  return {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'cs_test_secret',
        amount: 2550,
        currency: 'usd',
        status: 'requires_confirmation',
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 2550,
        currency: 'usd',
      }),
      confirm: vi.fn().mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
      }),
    },
    refunds: {
      create: vi.fn().mockResolvedValue({
        id: 're_test_123',
        status: 'succeeded',
        amount: 2550,
      }),
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: {} },
      }),
    },
  } as any as Stripe;
}

/**
 * Standard reset pattern for tests with Stripe
 */
export function resetStripeMocks(): void {
  vi.resetAllMocks();  // Keep factory, reset call history
}

/**
 * Full cleanup after tests
 */
export function cleanupStripeMocks(): void {
  vi.restoreAllMocks();
}

export function setupOrderServiceMocks() {
  vi.mock('../../src/services/orders.service', () => ({
    OrdersService: {
      getOrder: vi.fn(),
      updateOrderPayment: vi.fn(),
      setWebSocketServer: vi.fn(),
    }
  }));
}

export function setupPaymentServiceMocks() {
  vi.mock('../../src/services/payment.service', () => ({
    PaymentService: {
      validatePaymentRequest: vi.fn(),
      logPaymentAttempt: vi.fn(),
      updatePaymentAuditStatus: vi.fn(),
    }
  }));
}

export function setupLoggerMocks() {
  vi.mock('../../src/utils/logger', () => ({
    logger: {
      child: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      }),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }
  }));
}
```

File: `server/src/test-utils/expected-formats.ts`

```typescript
/**
 * Expected formats for test assertions
 * Update when implementation changes format
 * Reference in tests to catch implementation drift
 */

export const EXPECTED_FORMATS = {
  // Idempotency key format
  idempotencyKey: {
    pattern: /^[a-z0-9]+-\d+$/,
    description: 'Format: orderId-timestamp (e.g., order-123-1234567890)',
  },

  // Stripe payment intent IDs
  paymentIntentId: {
    pattern: /^pi_test_/,
    description: 'Stripe test payment intent (pi_test_...)',
  },

  // Restaurant/Order IDs (UUIDs)
  uuid: {
    pattern: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
    description: 'UUID format',
  },

  // ISO 8601 timestamps
  isoTimestamp: {
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    description: 'ISO 8601 format (2025-12-29T10:30:45)',
  },

  // Order numbers
  orderNumber: {
    pattern: /^ORD-\d{4}-\d+$/,
    description: 'Order number format (ORD-2025-0042)',
  },
};

/**
 * Helper to validate against format
 */
export function validateFormat(
  value: string,
  formatKey: keyof typeof EXPECTED_FORMATS
): boolean {
  const format = EXPECTED_FORMATS[formatKey];
  return format.pattern.test(value);
}
```

### Step 2.2: Create Test Setup Template

File: `server/src/test-utils/test-template.ts`

```typescript
/**
 * Copy this template for new test files with mocks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  resetStripeMocks,
  cleanupStripeMocks,
  setupPaymentServiceMocks,
  setupOrderServiceMocks,
} from './mock-helpers';
import { EXPECTED_FORMATS, validateFormat } from './expected-formats';

// Step 1: Setup mocks BEFORE imports
setupPaymentServiceMocks();
setupOrderServiceMocks();

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  })),
}));

// Step 2: Import AFTER mocks
import { PaymentService } from '../../src/services/payment.service';
import { OrdersService } from '../../src/services/orders.service';

describe('Payment Processing', () => {
  // Step 3: Reset before each test
  beforeEach(() => {
    resetStripeMocks();
  });

  // Step 4: Cleanup after each test
  afterEach(() => {
    cleanupStripeMocks();
  });

  it('should validate format of critical fields', async () => {
    // Step 5: Set mock return values
    vi.mocked(PaymentService.validatePaymentRequest).mockResolvedValue({
      amount: 2550,
      idempotencyKey: 'order-123-1234567890',  // Must match format
      orderTotal: 25.50,
      tax: 2.04,
      subtotal: 23.46,
    });

    // Step 6: Call code
    // ... your test

    // Step 7: Validate with format
    expect(PaymentService.validatePaymentRequest).toHaveBeenCalled();

    // If you need to assert on the actual format:
    const calls = vi.mocked(PaymentService.validatePaymentRequest).mock.calls;
    if (calls.length > 0) {
      const [arg] = calls[0];
      if (arg.idempotencyKey) {
        expect(validateFormat(arg.idempotencyKey, 'idempotencyKey')).toBe(true);
      }
    }
  });
});
```

---

## Phase 3: Fix High-Risk Tests (1-2 days)

### Step 3.1: Payment Tests (P0)

**Files to fix:**
- [ ] `server/tests/security/payment-p0-fixes.proof.test.ts`
- [ ] `server/tests/services/payment-audit.test.ts`
- [ ] `server/tests/services/payment-idempotency.test.ts`
- [ ] `server/tests/services/payment-calculation.test.ts`
- [ ] `server/src/routes/__tests__/payments.test.ts`

**Checklist for each file:**
- [ ] Replace `vi.clearAllMocks()` with `vi.resetAllMocks()`
- [ ] Add `vi.restoreAllMocks()` in afterEach
- [ ] Update expectations to match actual implementation format
- [ ] Use `EXPECTED_FORMATS` from test-utils
- [ ] Verify mock structure is complete
- [ ] Run test: `npm test -- <filename>`

**Example fix:**

```typescript
// BEFORE
beforeEach(() => {
  vi.clearAllMocks();  // ❌ Wrong
});

expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
  expect.objectContaining({
    idempotencyKey: /^[a-f0-9-]{36}$/,  // ❌ Old format
  })
);

// AFTER
beforeEach(() => {
  vi.resetAllMocks();  // ✅ Correct
});

afterEach(() => {
  vi.restoreAllMocks();  // ✅ Added cleanup
});

expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
  expect.objectContaining({
    idempotencyKey: expect.stringMatching(EXPECTED_FORMATS.idempotencyKey.pattern),  // ✅ New format
  })
);
```

### Step 3.2: Order State Tests (P1)

**Files to fix:**
- [ ] `server/tests/services/orderStateMachine.test.ts`
- [ ] `server/src/routes/__tests__/orders.rctx.test.ts`

**Module-level require() in `orderStateMachine.ts`:**
- Add `vi.resetModules()` in beforeEach
- Add re-import of module in beforeEach after resetModules

```typescript
// BEFORE
beforeEach(() => {
  vi.clearAllMocks();
});

// AFTER
beforeEach(async () => {
  vi.resetAllMocks();
  vi.resetModules();  // Clear require() cache

  // Re-import module with mocked dependencies
  const { OrderStateMachine } = await import('../../src/services/orderStateMachine');
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

### Step 3.3: Auth Tests (P1)

**Files to fix:**
- [ ] `server/tests/security/auth-security.test.ts`
- [ ] `server/src/middleware/__tests__/auth.test.ts`

**Checklist:**
- [ ] vi.resetAllMocks() in beforeEach
- [ ] vi.restoreAllMocks() in afterEach
- [ ] All mocks defined before imports

---

## Phase 4: Standardize All Tests (1 day)

### Step 4.1: Apply Consistent Pattern

For each test file:
1. Move all `vi.mock()` to top
2. Move all imports after mocks
3. Add `beforeEach: vi.resetAllMocks()`
4. Add `afterEach: vi.restoreAllMocks()`
5. Replace any `vi.clearAllMocks()` with `vi.resetAllMocks()`

### Step 4.2: Create Test Setup Docs

File: `.claude/TEST-SETUP-GUIDE.md`

```markdown
# Test Setup Guide for Mocks

## Quick Start

Copy this template for new test files:

\`\`\`typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mocks FIRST
vi.mock('../../src/services/payment.service');

// 2. Imports AFTER
import { PaymentService } from '../../src/services/payment.service';

describe('Feature', () => {
  // 3. Reset before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // 4. Cleanup after each test
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should work', () => {
    // Your test
  });
});
\`\`\`

## Key Rules

1. **Mock order:** Always mocks before imports
2. **Reset strategy:** beforeEach uses resetAllMocks, afterEach uses restoreAllMocks
3. **Factory functions:** Use vi.fn().mockImplementation()
4. **Expectations:** Use objectContaining + validate format
5. **Module reset:** Only if module has top-level side effects

See CL-TEST-004-QUICK-REFERENCE.md for troubleshooting.
```

### Step 4.3: Add to Pre-commit Hooks

Update `.husky/pre-commit` or similar to check:

```bash
# Check for clearAllMocks
if grep -r "vi\.clearAllMocks()" server/src server/tests client/src; then
  echo "ERROR: Found vi.clearAllMocks() - must use vi.resetAllMocks()"
  exit 1
fi

# Check for mocks after imports
# This is harder to automate, mention in PR guidelines
```

---

## Phase 5: Documentation & Validation (4 hours)

### Step 5.1: Update CLAUDE.md

Add quick links to CLAUDE.md:

```markdown
### Test Mocking

| Problem | Solution |
|---------|----------|
| Tests fail with "Cannot read property" | `CL-TEST-004-QUICK-REFERENCE.md` (5 min) |
| Understanding Vitest mocking patterns | `CL-TEST-004-VITEST-MOCKING-PREVENTION.md` (40 min) |
| Fixing existing mocks | `CL-TEST-004-IMPLEMENTATION-CHECKLIST.md` (2-3 days) |
```

### Step 5.2: Create PR Checklist

File: `.claude/PR-CHECKLIST-TESTS-WITH-MOCKS.md`

```markdown
# PR Review Checklist: Tests with Mocks

## Setup Section
- [ ] All `vi.mock()` calls appear BEFORE imports
- [ ] Mocks have complete object structure
- [ ] Factory functions use `vi.fn().mockImplementation()`

## Assertion Section
- [ ] Uses `expect.objectContaining()`, not exact match
- [ ] Variable values use regex: `expect.stringMatching()`
- [ ] Validates BOTH presence and format
- [ ] No `expect.anything()` for critical fields

## Cleanup Section
- [ ] `beforeEach()` uses `vi.resetAllMocks()`
- [ ] `afterEach()` uses `vi.restoreAllMocks()`
- [ ] If `vi.resetModules()` used, module re-imported

## Common Issues
- [ ] No `vi.clearAllMocks()` in test files
- [ ] No module-level `require()` without lazy init
- [ ] Expectations match current implementation format
```

### Step 5.3: Run Full Test Suite

```bash
# Run all tests
npm test

# Report failures
npm test 2>&1 | tee test-results.log

# Check for patterns we just fixed
grep -c "Cannot read property" test-results.log  # Should be 0
grep -c "vi.clearAllMocks" test-results.log      # Should be 0
grep -c "module initializ" test-results.log      # Should be 0
```

### Step 5.4: Document Results

Create: `.claude/prevention/CL-TEST-004-IMPLEMENTATION-RESULTS.md`

```markdown
# Vitest Mocking Prevention - Implementation Results

## Completion Status

- [ ] Phase 1: Audit Complete
  - Found X files with clearAllMocks
  - Found Y files with module-level require
  - Found Z files with loose expectations

- [ ] Phase 2: Test Utilities Created
  - mock-helpers.ts ✓
  - expected-formats.ts ✓
  - test-template.ts ✓

- [ ] Phase 3: High-Risk Tests Fixed
  - Payment tests: X files fixed
  - Order state tests: Y files fixed
  - Auth tests: Z files fixed

- [ ] Phase 4: All Tests Standardized
  - Total test files updated: N
  - All using vi.resetAllMocks(): ✓

- [ ] Phase 5: Documentation Complete
  - CLAUDE.md updated ✓
  - PR checklist created ✓
  - Full test suite passes ✓

## Test Results

Before: X failures
After: 0 failures

Failures fixed:
- [ ] Cannot read property of undefined: 0
- [ ] Module initialization errors: 0
- [ ] Expectation drift errors: 0

## Team Adoption

- [ ] All developers trained on patterns
- [ ] PR template updated with checklist
- [ ] Monthly review scheduled
```

---

## Daily Checklist During Implementation

```
Phase 1: [ ] Audit complete, findings documented
Phase 2: [ ] Test utilities created and working
Phase 3: [ ] P0 tests fixed, full suite passes
          [ ] P1 tests fixed, full suite passes
Phase 4: [ ] All tests standardized
          [ ] No vi.clearAllMocks() in codebase
Phase 5: [ ] Documentation updated
          [ ] Team trained
          [ ] PR checklist in place
```

---

## Success Criteria (All Must Be True)

- [ ] 0 uses of `vi.clearAllMocks()` in tests
- [ ] All tests use `vi.resetAllMocks()` in beforeEach
- [ ] All tests use `vi.restoreAllMocks()` in afterEach
- [ ] All mocks defined before imports
- [ ] Module-level require() issues resolved
- [ ] All test expectations match actual implementation format
- [ ] Full test suite passes (npm test)
- [ ] No cryptic "Cannot read property" failures
- [ ] Failures are clear and actionable
- [ ] All developers understand the patterns

---

## Maintenance After Implementation

### Weekly
- [ ] Monitor for new `vi.clearAllMocks()` usage
- [ ] Check PR reviews for mock pattern violations
- [ ] Update EXPECTED_FORMATS if implementation changes

### Monthly
- [ ] Review all new test files for adherence
- [ ] Team training on patterns if needed
- [ ] Update documentation based on edge cases

### Quarterly
- [ ] Full audit of test suite
- [ ] Review if new patterns discovered
- [ ] Update implementation checklist

---

## Rollback Plan (If Needed)

If implementation causes issues:

1. **Revert specific files:** Git revert commits for individual test files
2. **Keep utilities:** Keep test-utils/mock-helpers.ts (it's backward compatible)
3. **Document issue:** Add to CL-TEST-004-AUDIT-RESULTS.md
4. **Root cause analysis:** Why did standardization break tests?

---

## Related Documentation

- Full guide: `CL-TEST-004-VITEST-MOCKING-PREVENTION.md`
- Quick reference: `CL-TEST-004-QUICK-REFERENCE.md`
- Vitest docs: https://vitest.dev/guide/mocking.html

---

**Estimated Total Time:** 2-3 days (spread across 1-2 weeks)

**Payoff:** Zero test failures related to mocking, clear error messages, maintainable test suite

**Status:** Ready to implement

**Last Updated:** 2025-12-29
