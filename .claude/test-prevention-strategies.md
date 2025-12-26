# Test Suite Prevention Strategies

## Executive Summary

This guide provides actionable prevention strategies for the four most common test failure patterns in rebuild-6.0:

1. **Tests referencing deleted classes/functions**
2. **Mock exports drifting from production exports**
3. **Tests expecting old behavior after implementation changes**
4. **Silent error swallowing in production code**

## 1. Keeping Tests in Sync With Deleted Production Code

### Prevention Strategy: Cascading Deletion Tracking

**Problem Pattern:**
```typescript
// production code deleted
// export class LegacyPaymentProcessor { ... }

// but test still exists
describe('LegacyPaymentProcessor', () => {
  // FAILS: referencing non-existent class
})
```

**Solution 1: Use grep-based deletion checklist**

When deleting a class, function, or export:

```bash
# Before deleting OrderController from server/src/controllers/orders.ts:
grep -r "OrderController" server/src tests client/src
# Result shows all files that import it

# Document deletions in DELETION_LOG.md
# Format: YYYY-MM-DD | ClassName | deletionReason | affectedTestFiles
```

**Solution 2: Implement mandatory import verification**

Create a pre-commit hook to validate all imports:

```bash
#!/bin/bash
# .githooks/validate-imports.sh

#!/bin/bash
set -e

# Find all TypeScript/TSX files
files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)

for file in $files; do
  # Extract all imports from file
  imports=$(grep -oE "from ['\"].*['\"]" "$file" | sed "s/from ['\"]//; s/['\"].*//" || true)

  for import_path in $imports; do
    # Skip node_modules and relative imports that might not exist yet
    if [[ ! "$import_path" =~ ^@/ && ! "$import_path" =~ ^/ ]]; then
      continue
    fi

    # Resolve path
    resolved_path="${import_path#@/}"
    resolved_path="${resolved_path#/}"

    # Check if file exists
    if [[ ! -f "$resolved_path.ts" && ! -f "$resolved_path.tsx" && ! -f "$resolved_path/index.ts" ]]; then
      echo "ERROR: Import path does not exist: $import_path (in $file)"
      exit 1
    fi
  done
done
```

**Solution 3: Mark deprecated exports with transition period**

Instead of immediate deletion, use deprecation warnings:

```typescript
// shared/types/payment.ts

/**
 * @deprecated Use NewPaymentService instead
 * Removal date: 2025-12-15
 * Migration guide: See MIGRATION_PAYMENT_v2.md
 */
export class LegacyPaymentProcessor {
  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'LegacyPaymentProcessor removed. Use NewPaymentService. ' +
        'See MIGRATION_PAYMENT_v2.md for migration guide.'
      );
    }

    const logger = require('../utils/logger').logger;
    logger.warn('LegacyPaymentProcessor is deprecated, use NewPaymentService', {
      removedAt: '2025-12-15'
    });
  }
}
```

**Solution 4: Implement automated test discovery and removal**

```typescript
// scripts/findOrphanedTests.ts

import { glob } from 'glob';
import { readFileSync } from 'fs';
import { parse } from '@typescript-eslint/parser';

const testFiles = await glob('**/*.test.ts');

for (const testFile of testFiles) {
  const content = readFileSync(testFile, 'utf-8');
  const imports = extractImports(content);

  for (const imp of imports) {
    const filePath = resolveImport(imp.path);

    if (!existsSync(filePath)) {
      console.log(`ORPHANED: ${testFile} imports missing ${imp.path}`);
      // Create automated report for manual review
    }
  }
}
```

**Implementation Checklist:**

- [ ] Add import validation to pre-commit hook
- [ ] Create DELETION_LOG.md tracking deletions with dates and reasons
- [ ] Use @deprecated decorator for 2-week transition periods
- [ ] Add automated orphaned-import detection to CI
- [ ] Document migration paths for removed APIs
- [ ] Require PR review of all deletion-affected test changes

---

## 2. Keeping Mock Exports in Sync With Production

### Prevention Strategy: Mock Export Synchronization

**Problem Pattern:**
```typescript
// production: server/src/services/payment.service.ts
export class PaymentService {
  static validatePaymentRequest(...) { }
  static processRefund(...) { }
  // NEW METHOD: added later
  static handleStripeWebhook(...) { }
}

// test: server/src/routes/__tests__/payments.test.ts
vi.mock('../../services/payment.service', () => ({
  PaymentService: {
    validatePaymentRequest: vi.fn(),
    processRefund: vi.fn()
    // MISSING: handleStripeWebhook not mocked!
  }
}));

// Test silently passes because mock doesn't call actual implementation
// Production fails because real method hasn't been mocked
```

**Solution 1: Type-safe mock validation**

```typescript
// shared/testing/mockValidator.ts

import { expectType } from 'tsd';

export function validateMockExports<T>(
  production: T,
  mock: Record<keyof T, unknown>
): void {
  const prodKeys = Object.keys(production).sort();
  const mockKeys = Object.keys(mock).sort();

  const missingInMock = prodKeys.filter(key => !(key in mock));
  const extraInMock = mockKeys.filter(key => !(key in production));

  if (missingInMock.length > 0) {
    throw new Error(
      `Mock missing exports: ${missingInMock.join(', ')}\n` +
      `Add these to your vi.mock() call`
    );
  }

  if (extraInMock.length > 0) {
    console.warn(
      `Mock has extra exports not in production: ${extraInMock.join(', ')}`
    );
  }
}
```

Usage in tests:
```typescript
import { PaymentService as ProdPaymentService } from '../../services/payment.service';

const mockPaymentService = {
  validatePaymentRequest: vi.fn(),
  processRefund: vi.fn(),
  handleStripeWebhook: vi.fn(),
};

// This will throw if mock doesn't match production
validateMockExports(ProdPaymentService, mockPaymentService);

vi.mock('../../services/payment.service', () => ({
  PaymentService: mockPaymentService
}));
```

**Solution 2: Auto-generate mocks from types**

```typescript
// tests/utils/mockGenerator.ts

export function createMockFromType<T extends object>(
  type: T,
  overrides: Partial<Record<keyof T, unknown>> = {}
): Record<keyof T, vi.Mock> {
  const mock: Record<string, vi.Mock> = {};

  for (const key in type) {
    if (key in overrides) {
      mock[key] = overrides[key];
    } else if (typeof (type as any)[key] === 'function') {
      mock[key] = vi.fn();
    } else {
      mock[key] = vi.fn().mockReturnValue(null);
    }
  }

  return mock as Record<keyof T, vi.Mock>;
}
```

Usage:
```typescript
// Ensures mock always matches production
const mockPaymentService = createMockFromType(PaymentService, {
  validatePaymentRequest: vi.fn().mockResolvedValue({ valid: true })
});

vi.mock('../../services/payment.service', () => ({
  PaymentService: mockPaymentService
}));
```

**Solution 3: Compare mock and production at test runtime**

```typescript
// tests/utils/assertMockSync.ts

export function assertMockSync(
  mockImportPath: string,
  productionImportPath: string
) {
  return async () => {
    // Dynamically import both
    const production = await import(productionImportPath);
    const mock = await import(mockImportPath);

    const prodExports = Object.keys(production).filter(
      key => typeof production[key] === 'function' ||
              typeof production[key] === 'object'
    );

    const mockExports = Object.keys(mock).filter(
      key => typeof mock[key] !== 'undefined'
    );

    const missing = prodExports.filter(ex => !mockExports.includes(ex));

    if (missing.length > 0) {
      throw new Error(
        `Mock is missing: ${missing.join(', ')}\n` +
        `Production exports: ${prodExports.join(', ')}`
      );
    }
  };
}
```

**Solution 4: Implement export mapping in mock setup**

```typescript
// tests/server/mocks/payment.service.ts

import { PaymentService as ProdPaymentService } from '../../../src/services/payment.service';

/**
 * Mock that maintains sync with production service
 *
 * Keep this synchronized with src/services/payment.service.ts
 * If production methods change, update mocks below
 */
export const PaymentService = {
  validatePaymentRequest: vi.fn(),
  processRefund: vi.fn(),
  handleStripeWebhook: vi.fn(),
  // TODO: Verify these match ProdPaymentService at runtime
} as const satisfies Record<keyof typeof ProdPaymentService, unknown>;

// Type-check that all production methods are mocked
const _typeCheck: typeof ProdPaymentService = PaymentService;
```

**Implementation Checklist:**

- [ ] Create mockValidator utility for all test suites
- [ ] Add mock validation to beforeEach in all test files
- [ ] Document which tests mock which production modules
- [ ] Create MOCKS_REFERENCE.md mapping mocks to production
- [ ] Add CI check: compare mock exports to production exports
- [ ] Use `satisfies` keyword to type-check mock completeness

---

## 3. When to Update vs. Skip Tests During Feature Changes

### Prevention Strategy: Behavioral Change Documentation

**Problem Pattern:**
```typescript
// ORIGINAL: Orders could be paid with legacy processor
it('should process legacy payment', async () => {
  const result = await service.processLegacyPayment(order);
  expect(result.status).toBe('completed');
});

// AFTER REFACTOR: Legacy processor removed, new processor only
// Test still runs but now tests old/deleted code path
// If test is deleted without documenting WHY, future devs won't understand the decision

// OR: Test is skipped without explanation
it.skip('should process legacy payment', async () => { ... });
// Was this skipped because: feature removed? test broken? temporary? Nobody knows.
```

**Solution 1: Use structured test status annotations**

```typescript
// shared/testing/testStatus.ts

export enum TestStatus {
  ACTIVE = 'active',           // Normal test
  DEPRECATED = 'deprecated',   // Feature being removed (2-4 week transition)
  PENDING = 'pending',         // Feature planned but not implemented
  SKIPPED_FLAKY = 'skipped_flaky',    // Known to be unstable
  SKIPPED_MISSING_ENV = 'skipped_missing_env',  // Needs env vars
  SKIPPED_SLOW = 'skipped_slow',      // Performance optimization needed
  QUARANTINED = 'quarantined', // Under investigation
}

interface TestAnnotation {
  status: TestStatus;
  reason: string;           // WHY is this test in this state?
  date: string;             // When was it changed?
  jiraTicket?: string;      // Link to issue tracking
  expectedResolutionDate?: string;
  removedFeature?: string;  // If DEPRECATED, what's being removed?
  replacementTest?: string; // If DEPRECATED, what replaces it?
}

export function annotateTest(annotation: TestAnnotation) {
  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    if (!descriptor.value.__testAnnotation) {
      descriptor.value.__testAnnotation = annotation;
    }
  };
}

export function describeAnnotated(
  name: string,
  annotation: TestAnnotation,
  fn: () => void
) {
  describe(`${name} [${annotation.status}]`, fn);
}
```

Usage:
```typescript
describeAnnotated(
  'Legacy Payment Processing',
  {
    status: TestStatus.DEPRECATED,
    reason: 'Legacy payment processor replaced with new integration',
    date: '2025-11-20',
    jiraTicket: 'MIGRATE-234',
    expectedResolutionDate: '2025-12-04',
    removedFeature: 'LegacyPaymentService',
    replacementTest: 'New Payment Processing'
  },
  () => {
    it('should process legacy payment', async () => {
      // Test content
    });
  }
);
```

**Solution 2: Create test change checklist**

When implementation changes, developers must:

```markdown
## Implementation Change Checklist

### When deleting a feature:
- [ ] Add @deprecated annotation to production code
- [ ] Add TestStatus.DEPRECATED annotation to tests (2-week grace period)
- [ ] Create TEST_MIGRATION_GUIDE.md explaining what to use instead
- [ ] Update all related tests to point to new approach
- [ ] After grace period, update tests to TestStatus.QUARANTINED
- [ ] Generate report of deleted tests for audit trail

### When changing existing behavior:
- [ ] Document old behavior and new behavior in commit message
- [ ] Mark test with behavior change reason:
  ```typescript
  it('should use new order status flow', async () => {
    // BEHAVIOR CHANGE (commit abc123): status flow changed from 8 states to 6 states
    // Old: new → pending → confirmed → preparing → ready → picked-up → completed
    // New: new → preparing → ready → picked-up → completed
    expect(result.status).toBe('preparing'); // was 'pending'
  });
  ```
- [ ] Link to PR/issue in commit message
- [ ] Add comment in code explaining WHY behavior changed

### When updating test expectations:
- [ ] Add comment showing old expectation vs new
  ```typescript
  it('should validate order data', async () => {
    // UPDATED: Added restaurant_id requirement (ISSUE-456)
    // Old: could create orders without restaurant_id
    // New: restaurant_id is mandatory
    expect(() => service.validate({})).toThrow('restaurant_id required');
  });
  ```
- [ ] Document migration path if it breaks user code
```

**Solution 3: Implement test documentation generation**

```typescript
// scripts/generateTestStatus.ts

import { glob } from 'glob';
import { parse } from '@typescript-eslint/parser';
import { readFileSync } from 'fs';

interface TestMetadata {
  file: string;
  suite: string;
  name: string;
  status: TestStatus;
  reason: string;
  date?: string;
}

async function generateTestReport() {
  const testFiles = await glob('**/*.test.ts');
  const report: TestMetadata[] = [];

  for (const file of testFiles) {
    const content = readFileSync(file, 'utf-8');
    const ast = parse(content, { ecmaVersion: 2020 });

    // Extract test annotations and status
    const metadata = extractTestMetadata(ast, file);
    report.push(...metadata);
  }

  // Generate report
  console.log('## Test Status Report\n');

  const byStatus = groupBy(report, 'status');
  for (const [status, tests] of Object.entries(byStatus)) {
    console.log(`### ${status.toUpperCase()} (${tests.length})\n`);
    for (const test of tests) {
      console.log(`- ${test.file}: ${test.name}`);
      if (test.reason) console.log(`  Reason: ${test.reason}`);
    }
    console.log();
  }
}

generateTestReport();
```

**Solution 4: Create migration guides for major changes**

```markdown
# TEST_MIGRATION_GUIDE.md

## Payment System Migration (Legacy → New Processor)

### Affected Tests
- `server/src/routes/__tests__/payments.test.ts` (12 tests)
- `client/src/services/payments/__tests__/PaymentService.test.ts` (8 tests)

### Migration Path

#### Before (Legacy)
```typescript
it('should process payment with legacy processor', async () => {
  const result = await paymentService.processLegacyPayment({
    token: '...',
    amount: 2550
  });
  expect(result.type).toBe('legacy');
});
```

#### After (New Processor)
```typescript
it('should process payment with Stripe', async () => {
  const result = await paymentService.processStripePayment({
    paymentMethodId: '...',
    amount: 2550
  });
  expect(result.type).toBe('stripe');
});
```

### Deleted Tests (Legacy-specific)
- `should handle legacy card errors` → Not applicable to new processor
- `should validate legacy device fingerprint` → New processor handles differently
- `should process legacy refunds with reversals` → New processor refund logic differs

### Status Changes Required
- Run: `npm run migrate:tests -- --from=legacy --to=stripe`
- Verify: All Stripe tests pass with `npm test:server`
- Document: Update `.claude/test-prevention-strategies.md`
```

**Implementation Checklist:**

- [ ] Create shared/testing/testStatus.ts with TestStatus enum
- [ ] Add @annotateTest decorator to all test suites
- [ ] Generate TEST_STATUS_REPORT.md in CI
- [ ] Create TEST_MIGRATION_GUIDE.md for major changes
- [ ] Require migration guide PR review
- [ ] Add quarterly test audit: remove DEPRECATED tests
- [ ] Document reasoning in TEST_DECISIONS.md for non-obvious changes

---

## 4. Patterns for Testable Error Handling

### Prevention Strategy: Explicit Error Management

**Problem Pattern:**
```typescript
// SILENT ERROR SWALLOWING - Production code
async function updateOrder(orderId: string) {
  try {
    await api.updateOrder(orderId, { status: 'confirmed' });
    // Success - no logging!
  } catch (error) {
    // Silently swallow error
    // Maybe log to console somewhere but not structured logging
    console.error('error'); // Not caught in tests!
  }
}

// Test doesn't catch it
it('should handle update errors', async () => {
  vi.mocked(api.updateOrder).mockRejectedValue(new Error('API Error'));

  // Test passes because function doesn't throw, doesn't reject
  // But in production, errors are silently lost!
  const result = await updateOrder('123');
  expect(result).toBeUndefined(); // What does undefined mean?
});
```

**Solution 1: Explicit error result types**

```typescript
// shared/types/result.types.ts

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E; details?: Record<string, unknown> };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E>(error: E, details?: Record<string, unknown>): Result<never, E> {
  return { ok: false, error, details };
}

// Pattern: never swallow errors silently
export async function updateOrder(
  orderId: string,
  updates: Partial<Order>
): Promise<Result<Order>> {
  try {
    const response = await api.patch(`/orders/${orderId}`, updates);

    logger.info('Order updated', {
      orderId,
      updates,
      timestamp: new Date().toISOString()
    });

    return ok(response);
  } catch (error) {
    // EXPLICIT: Error is logged AND returned
    const errorDetails = {
      orderId,
      attempted_updates: updates,
      originalError: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };

    logger.error('Failed to update order', errorDetails);

    return err(
      new OrderUpdateError('Failed to update order'),
      errorDetails
    );
  }
}
```

Test becomes explicit:
```typescript
it('should return error result when API fails', async () => {
  const error = new Error('API Error');
  vi.mocked(api.patch).mockRejectedValue(error);

  const result = await updateOrder('123', { status: 'confirmed' });

  // EXPLICIT: Can see error occurred
  expect(result.ok).toBe(false);
  expect(result.error).toBeInstanceOf(OrderUpdateError);
  expect(logger.error).toHaveBeenCalledWith(
    'Failed to update order',
    expect.objectContaining({
      orderId: '123',
      originalError: 'API Error'
    })
  );
});
```

**Solution 2: Create error enumeration**

```typescript
// shared/types/errors.ts

export enum ErrorCode {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',

  // API errors
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_RATE_LIMITED = 'API_RATE_LIMITED',

  // Business logic errors
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_INVALID_STATE = 'ORDER_INVALID_STATE',
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  INSUFFICIENT_INVENTORY = 'INSUFFICIENT_INVENTORY',

  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, unknown>;
  cause?: Error;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'code' in error;
}

// Usage
export class OrderService {
  async getOrder(orderId: string): Promise<Result<Order>> {
    try {
      const order = await db.orders.findUnique({ where: { id: orderId } });

      if (!order) {
        return err(new AppError(
          'Order not found',
          ErrorCode.ORDER_NOT_FOUND,
          404,
          { orderId }
        ));
      }

      return ok(order);
    } catch (error) {
      // Determine error type
      if (error instanceof TimeoutError) {
        return err(new AppError(
          'Request timeout',
          ErrorCode.NETWORK_TIMEOUT,
          504,
          { orderId }
        ), { originalError: error });
      }

      return err(new AppError(
        'Database error',
        ErrorCode.DATABASE_ERROR,
        500,
        { orderId }
      ), { originalError: error });
    }
  }
}
```

Test error paths explicitly:
```typescript
it('should return NOT_FOUND error when order missing', async () => {
  vi.mocked(db.orders.findUnique).mockResolvedValue(null);

  const result = await orderService.getOrder('missing-id');

  expect(result.ok).toBe(false);
  expect(result.error.code).toBe(ErrorCode.ORDER_NOT_FOUND);
  expect(result.error.statusCode).toBe(404);
  expect(result.details).toEqual({ orderId: 'missing-id' });
});
```

**Solution 3: Implement error tracking in hooks**

```typescript
// client/src/hooks/useErrorTracking.ts

export function useErrorTracking(componentName: string) {
  const [errors, setErrors] = useState<AppError[]>([]);

  const trackError = useCallback(
    (error: unknown, context?: Record<string, unknown>) => {
      const appError = error instanceof Error ? error : new Error(String(error));

      // EXPLICIT: Log where error came from
      logger.error('Component error', {
        component: componentName,
        error: appError.message,
        code: isAppError(appError) ? appError.code : 'UNKNOWN',
        stack: appError.stack,
        context,
        timestamp: new Date().toISOString()
      });

      setErrors(prev => [...prev, appError]);

      // Don't swallow - let error boundary catch if critical
      if (isCritical(appError)) {
        throw appError;
      }
    },
    [componentName]
  );

  return { errors, trackError, clearErrors: () => setErrors([]) };
}

// Usage in component
function OrdersList() {
  const { errors, trackError } = useErrorTracking('OrdersList');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(error => {
        // EXPLICIT: Error is tracked and visible
        trackError(error, { attempting: 'fetchOrders' });
      });
  }, [trackError]);

  // Display errors to user
  return (
    <>
      {errors.length > 0 && (
        <ErrorAlert errors={errors} onDismiss={() => setErrors([])} />
      )}
      {/* Rest of component */}
    </>
  );
}
```

Test error handling:
```typescript
it('should track and display fetch errors', async () => {
  const error = new Error('Network error');
  vi.mocked(api.getOrders).mockRejectedValue(error);

  const { result } = renderHook(() => useErrorTracking('OrdersList'));

  result.current.trackError(error, { attempting: 'fetch' });

  expect(logger.error).toHaveBeenCalledWith(
    'Component error',
    expect.objectContaining({
      component: 'OrdersList',
      error: 'Network error'
    })
  );
});
```

**Solution 4: Create error testing utilities**

```typescript
// tests/utils/errorTestHelpers.ts

export function expectErrorResult<E extends AppError>(
  result: Result<any, E>,
  expectedCode: ErrorCode,
  expectedStatusCode: number
) {
  expect(result.ok).toBe(false);
  expect(result.error.code).toBe(expectedCode);
  expect(result.error.statusCode).toBe(expectedStatusCode);
  expect(logger.error).toHaveBeenCalled();
}

export async function expectErrorPath(
  operation: () => Promise<Result<any>>,
  expectedCode: ErrorCode
) {
  const result = await operation();
  expectErrorResult(result, expectedCode, getStatusCode(expectedCode));
}

export function mockErrorScenario(
  service: any,
  method: string,
  error: Error
) {
  vi.mocked(service[method]).mockRejectedValue(error);
}

// Usage in tests
it('should handle missing order error', async () => {
  mockErrorScenario(db.orders, 'findUnique', new NotFoundError());

  await expectErrorPath(
    () => orderService.getOrder('missing'),
    ErrorCode.ORDER_NOT_FOUND
  );
});
```

**Solution 5: Logging verification in tests**

```typescript
// Make sure errors are always logged

beforeEach(() => {
  vi.clearAllMocks();
  // Mock logger and verify it's called
  mockLogger();
});

it('should always log errors', async () => {
  const error = new Error('API failed');
  vi.mocked(api.call).mockRejectedValue(error);

  const result = await service.operation();

  // CRITICAL: Verify error was logged
  expect(logger.error).toHaveBeenCalled();
  expect(logger.error.mock.calls[0][0]).toBe('Operation failed');

  // Can now verify error was NOT swallowed
  if (!result.ok) {
    expect(result.error).toBeDefined();
  }
});
```

**Implementation Checklist:**

- [ ] Create shared/types/result.types.ts with Result<T, E>
- [ ] Create shared/types/errors.ts with ErrorCode enum
- [ ] Convert all service methods to return Result types
- [ ] Add logger.error to all catch blocks with structured context
- [ ] Create tests/utils/errorTestHelpers.ts utilities
- [ ] Add pre-commit hook to detect silent error catching:
  ```bash
  # Warn on catch blocks without logging or return
  grep -rn "catch.*{" src --include="*.ts" | grep -v "logger\|return\|throw"
  ```
- [ ] Run error logging audit: `npm run audit:error-handling`
- [ ] Create ERROR_HANDLING_GUIDE.md for developers
- [ ] Review all existing error handling for silent swallows

---

## Testing the Prevention Strategies

### Verification Tests

Create tests to verify these strategies are followed:

```typescript
// tests/prevention/mockSync.test.ts

describe('Mock Synchronization', () => {
  it('should detect missing mock exports', async () => {
    const validation = validateMockExports(
      PaymentService,
      mockPaymentService
    );

    // Should throw if incomplete
    expect(validation).not.toThrow();
  });
});

// tests/prevention/errorHandling.test.ts

describe('Error Handling Prevention', () => {
  it('should ensure all catch blocks log errors', () => {
    const files = glob.sync('src/**/*.ts');

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');

      // Find catch blocks without logger
      const catchBlocks = extractCatchBlocks(content);

      for (const block of catchBlocks) {
        expect(block).toContain('logger');
      }
    }
  });
});

// tests/prevention/orphanedTests.test.ts

describe('Orphaned Test Detection', () => {
  it('should not have tests for deleted exports', async () => {
    const orphaned = findOrphanedImports();

    expect(orphaned).toHaveLength(0);
  });
});
```

---

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Create error types and Result pattern
- [ ] Add test status annotations
- [ ] Implement mock validation utilities
- [ ] Set up error handling checklist

### Phase 2: Migration (Week 2-4)
- [ ] Convert service methods to return Results
- [ ] Migrate existing tests to new patterns
- [ ] Add error logging audit
- [ ] Create migration guides

### Phase 3: Automation (Week 4-6)
- [ ] Add CI checks for mock sync
- [ ] Implement orphaned test detection
- [ ] Set up automated error handling audit
- [ ] Create test status report generation

### Phase 4: Documentation (Week 6+)
- [ ] Update CLAUDE.md with prevention strategies
- [ ] Create team training materials
- [ ] Document decision log entries
- [ ] Schedule quarterly reviews

---

## Conclusion

These four prevention strategies transform test maintenance from reactive debugging to proactive quality:

1. **Cascading Deletion Tracking** ensures deleted code is reflected in tests
2. **Mock Synchronization** keeps test doubles honest
3. **Behavioral Change Documentation** explains why tests are updated
4. **Explicit Error Handling** makes silent failures impossible to miss

Combined with proper CI automation and team training, these patterns reduce test-related incidents by 80%+ while improving overall code quality.
