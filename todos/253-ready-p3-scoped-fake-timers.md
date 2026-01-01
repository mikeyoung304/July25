---
status: done
priority: p3
issue_id: "253"
tags: [code-review, testing, performance]
dependencies: []
---

# P3: Scope Fake Timers to Tests That Need Them

## Problem Statement

Every test in `payment-idempotency.test.ts` pays the cost of `vi.useFakeTimers()` and `vi.useRealTimers()`, even tests that don't use time-based features.

**Why it matters:**
- Fake timer setup has measurable overhead
- Most tests in "audit logging" and "order status validation" describe blocks don't use `vi.setSystemTime()`
- If a test throws before `afterEach`, fake timers could leak

## Findings

**Location:** `payment-idempotency.test.ts` lines 54-65

```typescript
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();  // Called 25+ times, many tests don't need it
});

afterEach(() => {
  vi.useRealTimers();  // Called 25+ times
});
```

Tests that actually USE fake timers: ~5 tests in "idempotency key generation" section
Tests that DON'T need fake timers: ~20 tests in other sections

## Proposed Solutions

### Option A: Scope to Describe Blocks (Recommended)

```typescript
describe('idempotency key generation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate key with timestamp', async () => {
    vi.setSystemTime(1700000000000);
    // ...
  });
});

describe('audit logging', () => {
  // No fake timers - runs faster
});
```

**Pros:** Tests run faster, cleaner separation of concerns
**Cons:** Need to restructure test file slightly
**Effort:** Small
**Risk:** None

### Option B: Use Per-Test Setup

Only enable fake timers in tests that need them:

```typescript
it('should generate key with timestamp', async () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(1700000000000);
    // ...
  } finally {
    vi.useRealTimers();
  }
});
```

**Pros:** Most explicit about timer usage
**Cons:** More boilerplate per test
**Effort:** Small
**Risk:** None

## Recommended Action

_Awaiting triage decision._

## Technical Details

**Affected Files:**
- `server/tests/services/payment-idempotency.test.ts`

## Acceptance Criteria

- [ ] Fake timers only enabled for tests that need them
- [ ] No timer leakage between test files
- [ ] Test execution time unchanged or improved

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review performance analysis |

## Resources

- Vitest timer documentation
