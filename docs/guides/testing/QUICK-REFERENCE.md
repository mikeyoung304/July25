# Test Isolation Quick Reference Card

**For when your test passes alone but fails with others** - solve in 30 seconds.

---

## The Problem

```
npm run test -- mytest.test.ts    # PASS ✅
npm run test                      # FAIL ❌
```

**Root cause: Shared module-level state persisting across tests**

---

## The 3-Step Solution

### Step 1: Use Unique Test IDs (Always)

```typescript
let testCounter = 0;
let testId: string;

beforeEach(() => {
  testId = `test-${++testCounter}-${Date.now()}`;
});
```

### Step 2: Clear Mocks (Automatic)

Already setup in `tests/bootstrap.ts`. Just use it:
```bash
# Already configured ✅
npm run test
```

### Step 3: Export Reset (If Needed)

If your service has a Map/Set/array:
```typescript
// In service
export function resetServiceState() { state.clear(); }

// In test
afterEach(() => resetServiceState());
```

---

## Find & Fix Patterns

### Pattern 1: Hardcoded IDs

```typescript
❌ const userId = 'user-123';

✅ let userId: string;
   beforeEach(() => {
     userId = `user-${++counter}-${Date.now()}`;
   });
```

### Pattern 2: Module-Level State

```typescript
❌ const cache = new Map();  // At module scope

✅ export function resetCache() { cache.clear(); }
   // Then call in afterEach
```

### Pattern 3: No Mock Clearing

```typescript
❌ // No afterEach hook

✅ // Already in tests/bootstrap.ts
   // (vi.clearAllMocks() runs automatically)
```

---

## Checklist

Run this before asking for help:

- [ ] Are you using same testId in multiple tests? → Use unique IDs
- [ ] Does service have Map/Set/array? → Export reset function
- [ ] Is test passing alone? → State pollution confirmed
- [ ] Ran `npm run test` twice? → Should pass both times

---

## One-Line Fixes

### Fix #1: Unique IDs
```typescript
// Add before beforeEach
let counter = 0;
beforeEach(() => { testId = `test-${++counter}-${Date.now()}`; });
```

### Fix #2: Reset State
```typescript
// Add to test file
afterEach(() => { yourService.reset?.(); vi.clearAllMocks(); });
```

### Fix #3: Import Reset
```typescript
import { resetServiceState } from '../service';
afterEach(() => resetServiceState());
```

---

## Examples from Your Codebase

**Good example** (realtime-menu-tools.test.ts):
```typescript
let testCounter = 0;
beforeEach(() => {
  mockSessionId = `session-test-${++testCounter}-${Date.now()}`;
  vi.clearAllMocks();
});
```

**Copy this pattern** → Apply to your tests

---

## When You're Stuck

1. **Test passes alone, fails in suite?**
   → Use unique IDs (Fix #1)

2. **Same error in multiple tests?**
   → Service has shared state (Fix #2)

3. **Mocks persist between tests?**
   → Already handled by bootstrap.ts ✅

4. **Still failing?**
   → Check: Is cache/map/set defined at module scope?
   → Export reset function (Fix #3)

---

## Copy-Paste Template

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('MyService', () => {
  // Unique ID generation
  let testCounter = 0;
  let testId: string;

  beforeEach(() => {
    testId = `test-${++testCounter}-${Date.now()}`;
  });

  // Reset service state if needed
  afterEach(() => {
    MyService.reset?.(); // Call if export exists
  });

  it('should work', () => {
    // Use testId - guaranteed unique
  });
});
```

---

## One More Thing

**Run tests 3 times to catch intermittent failures:**
```bash
npm run test && npm run test && npm run test
```

If it fails on run 2 or 3, state pollution is happening.

---

**Questions?** See `/docs/guides/testing/test-isolation-prevention.md` for full details.

Last Updated: 2025-11-25
