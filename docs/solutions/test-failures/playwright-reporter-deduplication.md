---
title: "Playwright Reporter Deduplication - Flaky Tracker Recording Duplicate Entries"
category: test-failures
severity: low
component: testing-infrastructure
date_solved: 2025-12-24
symptoms:
  - Same flaky test appearing multiple times in summary
  - Inflated flaky test counts
  - Inconsistent status reporting (same test showing different statuses)
  - Summary showing 3 entries for a test that only retried 3 times
tags:
  - playwright
  - testing
  - reporters
  - deduplication
  - flaky-tests
  - custom-reporters
related_files:
  - tests/reporters/flaky-tracker.ts
---

# Playwright Reporter Deduplication - Flaky Tracker Fix

## Problem

The custom Playwright reporter `FlakyTracker` was recording duplicate entries for the same flaky test. When a test retried multiple times, each retry created a separate entry in the summary, leading to inflated counts and confusing output.

### Symptoms Observed

1. **Inflated flaky test count**: A single flaky test appeared 3 times if it retried 3 times
2. **Multiple status entries**: Same test showed different statuses (failed, failed, passed)
3. **Confusing summary output**:
   ```
   === FLAKY TEST SUMMARY ===
   Total flaky tests: 6  // Actually only 2 unique tests!

     X order-flow.spec.ts > should complete checkout
       Attempts: 1, Final: failed
     X order-flow.spec.ts > should complete checkout
       Attempts: 2, Final: failed
     V order-flow.spec.ts > should complete checkout
       Attempts: 3, Final: passed
   ```

## Root Cause

The reporter used an array to store flaky test information, and `onTestEnd` is called for **every test attempt**, not just the final one.

### The Bug

```typescript
// BEFORE: Array-based storage creates duplicates
class FlakyTracker implements Reporter {
  private flakyTests: FlakyTestInfo[] = [];

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.retry > 0) {
      // This runs on EVERY retry attempt!
      // Test retries 3 times = 3 entries pushed
      this.flakyTests.push({
        title: test.title,
        file: test.location.file,
        attempts: result.retry + 1,
        finalStatus: result.status,  // Different on each call
      });
    }
  }

  onEnd(result: FullResult): void {
    // Array contains duplicates with varying statuses
    console.log(`Total flaky tests: ${this.flakyTests.length}`);  // WRONG!
  }
}
```

### Playwright Reporter Lifecycle

Understanding when `onTestEnd` fires is critical:

| Event | When Called | retry value |
|-------|-------------|-------------|
| First attempt fails | After initial run | 0 (no retry yet) |
| Retry 1 fails | After first retry | 1 |
| Retry 2 fails | After second retry | 2 |
| Retry 3 passes | After third retry | 3 |

Each call to `onTestEnd` represents a completed attempt. For flaky test tracking, we only care about tests that required retries (`retry > 0`) and their **final** status.

## Solution

Use a `Map` with a composite key to ensure only one entry per unique test. The final call to `onTestEnd` overwrites previous entries, naturally capturing the final status.

### The Fix

```typescript
// AFTER: Map-based storage deduplicates automatically
class FlakyTracker implements Reporter {
  private flakyTests: Map<string, FlakyTestInfo> = new Map();

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.retry > 0) {
      // Composite key ensures uniqueness
      const key = `${test.location.file}:${test.title}`;

      // Map.set() overwrites previous entry
      // Final call has final status and highest attempt count
      this.flakyTests.set(key, {
        title: test.title,
        file: test.location.file,
        attempts: result.retry + 1,
        finalStatus: result.status,
      });
    }
  }

  onEnd(result: FullResult): void {
    // Convert Map values to array for iteration
    const tests = Array.from(this.flakyTests.values());
    console.log(`Total flaky tests: ${tests.length}`);  // CORRECT!
  }
}
```

### Why Map-Based Deduplication Works

1. **Natural overwrite semantics**: `Map.set()` replaces existing entries with the same key
2. **Final state captured**: Last call has highest `retry` value and final `status`
3. **Unique key pattern**: `file:title` guarantees one entry per test
4. **No manual deduplication**: No need for `filter()`, `reduce()`, or `Set` conversions
5. **O(1) lookup**: Checking if a test exists is constant time

### Correct Output After Fix

```
=== FLAKY TEST SUMMARY ===
Total flaky tests: 2

  V order-flow.spec.ts > should complete checkout
    Attempts: 3, Final: passed
  X payment.spec.ts > should handle timeout
    Attempts: 2, Final: failed
```

## Pattern for Similar Reporters

When building custom Playwright reporters that track per-test state across retries:

```typescript
import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface TestMetrics {
  title: string;
  file: string;
  // Add your tracking fields
}

class CustomReporter implements Reporter {
  // Always use Map when tracking per-test state
  private testMetrics: Map<string, TestMetrics> = new Map();

  private getTestKey(test: TestCase): string {
    // Include enough context to be unique
    // Options:
    // - Simple: `${test.location.file}:${test.title}`
    // - With line: `${test.location.file}:${test.location.line}`
    // - Full path: `${test.titlePath().join(' > ')}`
    return `${test.location.file}:${test.title}`;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const key = this.getTestKey(test);

    // Decide: overwrite or accumulate?
    // Overwrite (final state matters):
    this.testMetrics.set(key, { ... });

    // Accumulate (all attempts matter):
    const existing = this.testMetrics.get(key) || { attempts: [] };
    existing.attempts.push(result);
    this.testMetrics.set(key, existing);
  }

  onEnd(): void {
    const metrics = Array.from(this.testMetrics.values());
    // Process unique test entries
  }
}
```

### Key Composition Strategies

| Strategy | Key Pattern | Use When |
|----------|-------------|----------|
| File + Title | `${file}:${title}` | Titles are unique per file |
| File + Line | `${file}:${line}` | Multiple tests might have same title |
| Full Title Path | `titlePath().join('>')` | Nested describes with same test names |
| Test ID | `test.id` | Playwright assigns unique IDs |

## Testing Custom Reporters

Custom reporters require specific testing approaches since they're invoked by Playwright's test runner, not called directly.

### Unit Testing the Logic

Extract pure functions for testable logic:

```typescript
// flaky-tracker.ts
export function createTestKey(file: string, title: string): string {
  return `${file}:${title}`;
}

export function formatFlakyTest(info: FlakyTestInfo): string {
  const icon = info.finalStatus === 'passed' ? 'V' : 'X';
  return `${icon} ${info.title} (${info.attempts} attempts)`;
}

// flaky-tracker.test.ts
describe('FlakyTracker helpers', () => {
  it('creates unique keys from file and title', () => {
    const key = createTestKey('order.spec.ts', 'should checkout');
    expect(key).toBe('order.spec.ts:should checkout');
  });

  it('handles special characters in title', () => {
    const key = createTestKey('test.ts', 'handles $100 payment');
    expect(key).toBe('test.ts:handles $100 payment');
  });
});
```

### Integration Testing with Playwright

Create a test project that uses the reporter:

```typescript
// playwright.reporter-test.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/reporter-fixtures',
  retries: 2,
  reporter: [
    ['./tests/reporters/flaky-tracker.ts'],
    ['json', { outputFile: 'test-results/output.json' }],
  ],
});
```

```typescript
// tests/reporter-fixtures/intentionally-flaky.spec.ts
import { test, expect } from '@playwright/test';

let attemptCount = 0;

test('flaky test for reporter testing', async () => {
  attemptCount++;
  // Fail first attempt, pass on retry
  expect(attemptCount).toBeGreaterThan(1);
});
```

### Verifying Deduplication

```bash
# Run the test and capture output
npx playwright test --config=playwright.reporter-test.config.ts 2>&1 | tee output.log

# Verify only one entry per test
grep -c "intentionally-flaky.spec.ts" output.log
# Should output: 1 (not 2 or more)
```

## Prevention Checklist

When creating Playwright reporters that track test state:

- [ ] Use `Map<string, T>` instead of `Array<T>` for per-test storage
- [ ] Create a composite key that uniquely identifies each test
- [ ] Decide upfront: overwrite (final state) or accumulate (all attempts)
- [ ] Remember `onTestEnd` fires for EVERY attempt, not just final
- [ ] Test with `retries: 2` to verify deduplication works
- [ ] Use `Array.from(map.values())` when iterating for output

## Files Modified

| File | Change |
|------|--------|
| `tests/reporters/flaky-tracker.ts` | Changed `flakyTests` from `FlakyTestInfo[]` to `Map<string, FlakyTestInfo>` |

## Related Documentation

- [Playwright Custom Reporters](https://playwright.dev/docs/test-reporters#custom-reporters)
- [Test Debugging Guide](../../../.github/TEST_DEBUGGING.md)
- [E2E Infrastructure Overhaul](./e2e-infrastructure-overhaul-2025-12.md)

## Key Takeaway

> **Playwright's `onTestEnd` fires for every attempt, not just the final one.** When tracking per-test state across retries, always use a `Map` with a unique key to ensure deduplication. The final call naturally overwrites with the final state.
