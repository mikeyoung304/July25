---
status: ready
priority: p2
issue_id: "013"
tags: [test-infrastructure, playwright, flaky-tests]
dependencies: []
---

# TODO: Flaky Tracker May Record Duplicate Entries

**Priority:** P2 - Important
**Category:** Test Infrastructure
**Detected:** 2025-12-24 (Code Review)
**Commits:** b325e910

## Problem

The flaky tracker records a test on every retry attempt, potentially recording the same test multiple times:

```typescript
onTestEnd(test: TestCase, result: TestResult): void {
  if (result.retry > 0) {
    // This runs on EVERY retry, not just the final one
    this.flakyTests.push({
      title: test.title,
      file: test.location.file,
      attempts: result.retry + 1,
      finalStatus: result.status,
    });
  }
}
```

If a test retries 3 times:
- Retry 1: records with `attempts: 2, finalStatus: 'failed'`
- Retry 2: records with `attempts: 3, finalStatus: 'failed'`
- Retry 3: records with `attempts: 4, finalStatus: 'passed'`

Result: 3 entries for the same test in `flakyTests` array.

## Impact

- Inflated flaky test counts in summary
- Confusing output showing same test multiple times
- Incorrect metrics for flakiness tracking

## Proposed Fix

Only record on final retry or use a Map to dedupe:

```typescript
private flakyTests: Map<string, FlakyTestInfo> = new Map();

onTestEnd(test: TestCase, result: TestResult): void {
  if (result.retry > 0) {
    const key = `${test.location.file}:${test.title}`;
    // Always update - final call will have final status
    this.flakyTests.set(key, {
      title: test.title,
      file: test.location.file,
      attempts: result.retry + 1,
      finalStatus: result.status,
    });
  }
}

onEnd(result: FullResult): void {
  const tests = Array.from(this.flakyTests.values());
  if (tests.length > 0) {
    // ... summary output
  }
}
```

## Files

- `tests/reporters/flaky-tracker.ts`

## Testing

- Run test that retries 3 times
- Verify only 1 entry appears in summary
- Verify final status is correct
