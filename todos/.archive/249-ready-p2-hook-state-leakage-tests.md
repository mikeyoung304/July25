---
status: done
priority: p2
issue_id: "249"
tags: [code-review, testing, architecture]
dependencies: []
---

# P2: Hook Registration State Leakage in Tests

## Problem Statement

The `registerHook` tests in `orderStateMachine.test.ts` register hooks without cleanup. Registered hooks persist across tests because `OrderStateMachine` maintains internal state.

**Why it matters:**
1. Hook accumulation across tests
2. Non-deterministic behavior if tests run in different orders
3. Potential false positives in later tests (e.g., `expect(mockLogger.error).toHaveBeenCalled()` may pass due to hooks from previous tests)

## Findings

**Location:** `orderStateMachine.test.ts` lines 366-402

```typescript
it('should execute registered hooks on transition', async () => {
  const hookFn = vi.fn();
  OrderStateMachine.registerHook('pending->confirmed', hookFn);
  // ... no cleanup - hook remains registered
});
```

**Impact:** Later tests in the file may execute hooks registered by earlier tests, causing:
- Unexpected logger calls
- Spurious errors
- Test interdependence

## Proposed Solutions

### Option A: Add clearHooks Method (Recommended)

Add a method to OrderStateMachine for clearing registered hooks:

```typescript
// In OrderStateMachine
private static hooks: Map<string, Function[]> = new Map();

public static clearHooks(): void {
  this.hooks.clear();
}

// In test afterEach
afterEach(() => {
  OrderStateMachine.clearHooks();
  vi.restoreAllMocks();
});
```

**Pros:** Clean solution, explicit cleanup
**Cons:** Adds public method only used in tests
**Effort:** Small
**Risk:** Low

### Option B: Use Test-Scoped Instance

Refactor to use dependency injection so each test gets a fresh instance:

```typescript
const stateMachine = new OrderStateMachine();
stateMachine.registerHook('pending->confirmed', hookFn);
```

**Pros:** Better isolation, more testable design
**Cons:** Larger refactor, changes public API
**Effort:** Medium
**Risk:** Medium

### Option C: Reset Hooks Array Directly in Test

Access internal state for cleanup (less clean but quick):

```typescript
afterEach(() => {
  (OrderStateMachine as any).hooks = new Map();
});
```

**Pros:** Quick fix, no production code changes
**Cons:** Relies on internal implementation, fragile
**Effort:** Trivial
**Risk:** Medium (fragile)

## Recommended Action

_Awaiting triage decision._

## Technical Details

**Affected Files:**
- `server/tests/services/orderStateMachine.test.ts` (lines 366-402)
- `server/src/services/orderStateMachine.ts` (if adding clearHooks)

## Acceptance Criteria

- [ ] Hooks are cleaned up between tests
- [ ] Tests pass regardless of execution order
- [ ] No hook accumulation across test runs

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-29 | Created | Found during /workflows:review architecture analysis |

## Resources

- Vitest test isolation best practices
- orderStateMachine.test.ts lines 366-402
