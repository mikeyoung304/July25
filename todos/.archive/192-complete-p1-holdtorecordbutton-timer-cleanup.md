---
status: complete
priority: p1
issue_id: "192"
tags: [testing, vitest, client, memory-leak, code-review]
dependencies: []
created_date: 2025-12-05
completed_date: 2025-12-05
source: multi-agent-code-review
---

# CRITICAL: HoldToRecordButton Tests Missing Timer Cleanup

## Problem Statement

The `HoldToRecordButton.test.tsx` file uses fake timers but doesn't properly clean them up, which can cause test pollution and flaky tests in the test suite.

## Findings

### Code Quality Agent Discovery

**Location:** `client/src/components/voice/__tests__/HoldToRecordButton.test.tsx`

**Current Implementation:**
```typescript
beforeEach(() => {
  vi.useFakeTimers();
  // ... mock setup
});

afterEach(() => {
  vi.clearAllMocks();
  // Missing: vi.useRealTimers()
});
```

**Problem:**
- `vi.useFakeTimers()` called in beforeEach
- `vi.useRealTimers()` NOT called in afterEach
- Other tests in the suite may inherit fake timers unexpectedly
- Can cause cascading test failures and flakiness

### Impact Assessment

- **Test Reliability**: Tests may fail randomly due to timer state leakage
- **Debugging Difficulty**: Hard to trace failures to timer cleanup
- **CI Flakiness**: Different test execution order may produce different results

## Proposed Solution

**Effort:** 15 minutes | **Risk:** None

Add proper timer cleanup:

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  // ... existing mock setup
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers(); // ADD THIS LINE
});
```

Also consider adding `vi.runOnlyPendingTimers()` before cleanup if there are pending timers:

```typescript
afterEach(() => {
  vi.runOnlyPendingTimers(); // Flush pending timers
  vi.useRealTimers();
  vi.clearAllMocks();
});
```

## Technical Details

**Affected Files:**
- `client/src/components/voice/__tests__/HoldToRecordButton.test.tsx`

**Pattern to Apply:**
This pattern should be applied to ALL test files using fake timers.

**Search for other affected files:**
```bash
grep -r "useFakeTimers" client/src --include="*.test.ts*"
```

## Acceptance Criteria

- [ ] `vi.useRealTimers()` added to afterEach in HoldToRecordButton.test.tsx
- [ ] All other test files using fake timers verified for proper cleanup
- [ ] Test suite passes consistently in CI (no timer-related flakiness)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | From multi-agent code review of commit 3b463dcb |

## Resources

- Code Quality agent findings
- [Vitest Timer Mocks](https://vitest.dev/guide/mocking.html#timers)
