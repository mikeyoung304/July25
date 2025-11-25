---
id: CL-TEST-002
title: "Vitest Mock Import Timing: beforeAll vs beforeEach"
category: test-failures
severity: P2
date_solved: 2025-11-25
component: testing
sub_component: vitest-mocking
tags:
  - vitest
  - mocking
  - dynamic-import
  - beforeAll
  - beforeEach
---

# CL-TEST-002: Vitest Mock Import Timing - beforeAll vs beforeEach

## Symptom

Tests fail with `ReferenceError: menuFunctionTools is not defined` when using dynamic imports with `vi.mock()`:

```bash
npm test realtime-menu-tools.test.ts
❯ 23 tests failed
  → menuFunctionTools is not defined
```

## Root Cause

When using `vi.mock()` with dynamic imports, the timing of imports matters:

**The problematic pattern:**
```typescript
vi.mock('node-cache', () => ({ default: vi.fn(() => mockCache) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabase) }));

let menuFunctionTools: any;

describe('Tests', () => {
  beforeEach(async () => {
    vi.resetModules();  // ❌ Clears module cache INCLUDING mocks
    const module = await import('../src/module');
    menuFunctionTools = module.menuFunctionTools;  // ❌ May not resolve before tests run
  });

  it('test', () => {
    menuFunctionTools.doSomething();  // ❌ ReferenceError: menuFunctionTools is not defined
  });
});
```

**Problems:**
1. `vi.resetModules()` clears the module cache, but **mocks may not re-register correctly**
2. `beforeEach` is async, but nested `describe` blocks may not wait for it
3. First test runs before the import resolves

## Solution

Use `beforeAll` for module import (once), `beforeEach` only for clearing mock call history:

```typescript
vi.mock('node-cache', () => ({ default: vi.fn(() => mockCache) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabase) }));

let menuFunctionTools: any;

describe('Tests', () => {
  // ✅ Import ONCE after mocks are set up
  beforeAll(async () => {
    const module = await import('../src/module');
    menuFunctionTools = module.menuFunctionTools;
  });

  // ✅ Only clear call counts, don't reset modules
  beforeEach(() => {
    vi.clearAllMocks();  // Clears call history, keeps implementations
  });

  it('test', () => {
    menuFunctionTools.doSomething();  // ✅ Works
  });
});
```

## Key Differences

| Method | What it does | When to use |
|--------|--------------|-------------|
| `vi.clearAllMocks()` | Clears call history only | In `beforeEach` - between tests |
| `vi.resetAllMocks()` | Clears history + implementations | Rarely - breaks custom implementations |
| `vi.resetModules()` | Clears module cache | Rarely - for env variable testing |
| `vi.restoreAllMocks()` | Restores original implementations | In `afterEach` if using `spyOn` |

## Pattern for Multiple NodeCache Instances

When a module creates multiple instances of a mocked class:

```typescript
// Module creates 3 caches:
const menuCache = new NodeCache();
const restaurantCache = new NodeCache();
const modifierCache = new NodeCache();
```

**Solution:** Factory mock that tracks all instances:

```typescript
const createFreshMockCache = () => ({
  get: vi.fn().mockReturnValue(undefined),
  set: vi.fn(),
  del: vi.fn(),
});

const mockCaches: ReturnType<typeof createFreshMockCache>[] = [];

vi.mock('node-cache', () => ({
  default: vi.fn(() => {
    const cache = createFreshMockCache();
    mockCaches.push(cache);  // Track all instances
    return cache;
  }),
}));

beforeEach(() => {
  // Clear all cache mock instances
  mockCaches.forEach(cache => {
    cache.get.mockClear();
    cache.set.mockClear();
  });
});
```

## Supabase Query Builder Mocking

Supabase queries are **thenable** - they can be awaited directly:

```typescript
// This works in Supabase:
const { data, error } = await supabase.from('table').select().eq('id', 1);
```

**Mock must be thenable too:**

```typescript
const createMockQueryBuilder = (mockData: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(mockData),
  // ✅ Make it thenable for direct await
  then: (resolve: (value: any) => void) => resolve(mockData),
});
```

## Complete Working Pattern

```typescript
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// 1. Create mock instances BEFORE vi.mock()
const mockCache = {
  get: vi.fn().mockReturnValue(undefined),
  set: vi.fn(),
};

const mockSupabase = {
  from: vi.fn(),
};

// 2. Set up mocks (hoisted to top of file)
vi.mock('node-cache', () => ({ default: vi.fn(() => mockCache) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => mockSupabase) }));

// 3. Module reference
let myModule: typeof import('../src/my-module');

describe('MyModule', () => {
  // 4. Import once in beforeAll
  beforeAll(async () => {
    myModule = await import('../src/my-module');
  });

  // 5. Reset mock state between tests (not implementations)
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();  // Reset implementation for this mock
  });

  it('works', async () => {
    mockSupabase.from.mockReturnValue(createMockQueryBuilder({ data: [...], error: null }));
    const result = await myModule.doSomething();
    expect(result).toBeDefined();
  });
});
```

## Debugging Tips

1. **"X is not defined"** → Check `beforeAll` vs `beforeEach` for imports
2. **Mock not working** → Check if `vi.resetModules()` is clearing your mocks
3. **Inconsistent results** → Check if mocks share state between tests
4. **Thenable errors** → Add `then` method to Supabase query builder mocks

## Affected Files

- `server/tests/ai/functions/realtime-menu-tools.test.ts` - Fixed

## Related

- [CL-TEST-001](./CL-TEST-001-module-state-test-isolation.md) - Module-level state pollution
- Vitest docs: https://vitest.dev/api/vi.html#vi-mock
