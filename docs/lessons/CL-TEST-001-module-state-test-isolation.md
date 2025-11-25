---
id: CL-TEST-001
title: "Test Isolation Failure: Module-Level State Pollution"
category: test-failures
severity: P2
date_solved: 2025-11-25
component: voice-ordering
sub_component: realtime-menu-tools
tags:
  - test-isolation
  - module-level-state
  - vitest
  - flaky-tests
  - cart-storage
---

# CL-TEST-001: Test Isolation Failure - Module-Level State Pollution

## Symptom

Test passes when run in isolation but fails when run with other tests:

```bash
# PASSES alone
npm test -- -t "trim whitespace"
✓ should accept valid modifier names and trim whitespace

# FAILS when run with suite
npm test realtime-menu-tools.test.ts
✗ should accept valid modifier names and trim whitespace
  → expected [] to have a length of 1 but got +0
```

## Root Cause

Module-level mutable state (`Map`, `Set`, arrays, objects) persists across tests in Vitest/Jest because **modules are cached**.

**The problematic code in `realtime-menu-tools.ts`:**
```typescript
// Line 127 - Module-level Map persists across ALL tests
const cartStorage = new Map<string, Cart>();
```

**The problematic test setup:**
```typescript
// All tests shared the SAME sessionId
const mockSessionId = 'session-test-123';  // ❌ Static
```

**What happened:**
1. Test A runs → adds item to cart with key `'session-test-123'`
2. `cartStorage` Map stores: `{'session-test-123': cartWithItem}`
3. Test B runs → calls `getCart('session-test-123')`
4. **Cache hit!** → Returns Test A's stale cart data
5. Test B's assertions fail because cart has unexpected items

## Solution

Generate **unique identifiers per test** in `beforeEach`:

```typescript
// BEFORE - shared static sessionId
const mockSessionId = 'session-test-123';

// AFTER - unique sessionId per test
let mockSessionId: string;
let testCounter = 0;

beforeEach(() => {
  mockSessionId = `session-test-${++testCounter}-${Date.now()}`;
  vi.clearAllMocks();
  // ... other setup
});
```

**Why it works:** Each test gets a fresh cache key, so `cartStorage.get(sessionId)` always returns `undefined` (cache miss) for each test.

## Prevention Checklist

Before writing tests for modules with state, check:

- [ ] Does the module have `const map = new Map()` or similar at module level?
- [ ] Does the module have `const cache = {}` or arrays?
- [ ] Does the module have `let counter = 0` or other mutable variables?
- [ ] Are tests using hardcoded identifiers (sessionId, userId, etc.)?

**If yes to any:** Use unique identifiers per test.

## Code Patterns

### Dangerous Patterns (in tested modules)
```typescript
// ❌ These persist across tests
const cache = new Map();
const storage = {};
let counter = 0;
const sessions = new Set();
```

### Safe Test Patterns
```typescript
// ✅ Unique IDs per test
let testId: string;
let testCounter = 0;

beforeEach(() => {
  testId = `test-${++testCounter}-${Date.now()}`;
});

// ✅ Or export reset function from module
// In module:
export function resetForTesting() { cache.clear(); }

// In test:
beforeEach(() => {
  resetForTesting();
});
```

## Alternative Approaches (and why they don't work)

| Approach | Problem |
|----------|---------|
| `vi.resetModules()` | Breaks module mocking, slow |
| Access private Map directly | Not exported, requires refactoring |
| Clear Map in afterEach | Can't access module-private state |
| **Unique IDs per test** | ✅ Works without refactoring |

## Affected Files

- `server/tests/ai/functions/realtime-menu-tools.test.ts` - Fixed
- `server/src/ai/functions/realtime-menu-tools.ts` - Has `cartStorage` Map

## Related

- Similar pattern: Memory leaks from module-level intervals
- See also: `server/tests/config/env-validation.test.ts` for proper `vi.resetModules()` usage

## Verification

```bash
# After fix - all tests pass together
npm test realtime-menu-tools.test.ts
✓ 19 tests passed
```
