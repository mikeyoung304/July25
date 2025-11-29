# Mock Drift Prevention: PR Review Checklist

Use this checklist when reviewing PRs that modify interfaces or add tests.

## Trigger Conditions

Use this checklist if the PR:
- [ ] Modifies any interface/type in `shared/types/`
- [ ] Adds new test files (*.test.ts, *.test.tsx)
- [ ] Changes mock data in existing tests
- [ ] Updates service interfaces

---

## Part 1: Type Annotations

### Requirement: All mocks must have explicit TypeScript types

**Check for:**

```bash
# Command to find violations
grep -n "const mock" <changed-files> | grep -v ": "
```

**Examples:**

```typescript
// ❌ FAIL: No type annotation
const mockOrder = { id: '1', order_number: '001' };

// ❌ FAIL: Using 'any' type
const mockOrder: any = { /* ... */ };

// ✅ PASS: Explicit type from shared
const mockOrder: Order = { /* ... */ };
```

**For Each Violation:**

1. Identify what type this mock should be
2. Check the definition in `shared/types/`
3. Add type annotation: `const mock<Name>: <Type> = { ... }`
4. Ensure all required fields from the type are present
5. If too many fields, suggest using factory function

**Approval Criteria:** Zero untyped mocks

---

## Part 2: Factory Function Usage

### Requirement: Repeated mock patterns should use factories

**Check for:**

```typescript
// Pattern to identify: Same mock structure appears 2+ times
describe('OrderService', () => {
  it('test 1', () => {
    const mockOrder = { /* 10 lines */ };
  });

  it('test 2', () => {
    const mockOrder = { /* 10 lines, same as above */ };
  });
});
```

**Action Items:**

1. If the same mock appears in multiple tests:
   - [ ] Suggest creating factory in `/tests/factories/`
   - [ ] Show example: `createMockOrder(overrides?)`
   - [ ] Request update to use: `createMockOrder()`

2. If factories already exist but aren't used:
   - [ ] Request usage: `import { createMockOrder } from 'tests/factories'`
   - [ ] Remove inline mock definitions

3. Validate factory includes all required fields:
   ```typescript
   // ✅ Good factory
   export function createMockOrder(overrides?) {
     return {
       id: '1',
       restaurant_id: 'rest-1',
       order_number: '001',
       status: 'new',
       type: 'online',
       items: [],
       subtotal: 10,
       tax: 0.80,
       total: 10.80,
       payment_status: 'pending',
       created_at: '2025-11-28T12:00:00Z',
       updated_at: '2025-11-28T12:00:00Z',
       ...overrides
     };
   }
   ```

**Approval Criteria:** Repeated mocks use factories, or are justified as one-off test data

---

## Part 3: Missing Required Fields

### Requirement: All required interface fields must be present

**Check for:**

Look at each mock and compare to interface definition in `shared/types/`:

```bash
# Get interface definition
grep -A 30 "export interface Order" shared/types/order.types.ts

# Check each mock in the test file
```

**Critical Multi-Tenant Field:**

```typescript
// ❌ FAIL: Missing restaurant_id (critical for multi-tenancy)
const mockOrder = { id: '1', order_number: '001', /* ... */ };

// ✅ PASS: Includes restaurant_id
const mockOrder = {
  id: '1',
  restaurant_id: '11111111-1111-1111-1111-111111111111',
  order_number: '001',
  // ...
};
```

**For Each Required Field Not Present:**

1. Determine if it's truly optional (check interface: `field?`)
2. If required (no `?`), request addition to mock
3. If optional, document why it's omitted

**Approval Criteria:** All required fields are present or clearly documented as intentional omission

---

## Part 4: Timestamp Handling

### Requirement: Use fixed, deterministic timestamps

**Check for:**

```typescript
// ❌ FAIL: Non-deterministic
created_at: new Date().toISOString()
updated_at: new Date().toISOString()

// ✅ PASS: Fixed ISO string
created_at: '2025-11-28T12:00:00Z'
updated_at: '2025-11-28T12:00:00Z'

// ✅ PASS: Using vi.setSystemTime()
beforeEach(() => vi.setSystemTime('2025-11-28T12:00:00Z'));
```

**Action Items:**

1. Replace `new Date().toISOString()` with fixed string
2. Use consistent timestamp across all mocks: `'2025-11-28T12:00:00Z'`
3. For timer-based tests, use `vi.setSystemTime()` pattern

**Approval Criteria:** All timestamps are deterministic ISO 8601 strings

---

## Part 5: Service Mock Completeness

### Requirement: Service mocks include all public methods

**Check for:**

```typescript
// ❌ FAIL: Only mocks one method
vi.mock('@/services/http/httpClient', () => ({
  httpClient: {
    get: vi.fn()
    // Missing post, patch, delete, etc.
  }
}));

// ✅ PASS: All methods mocked
const mockHttpClient = {
  get: vi.fn().mockResolvedValue({}),
  post: vi.fn().mockResolvedValue({}),
  patch: vi.fn().mockResolvedValue({}),
  put: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
  head: vi.fn().mockResolvedValue({})
};
```

**For Each Service Mock:**

1. Check the actual service file for all public methods
2. Verify mock includes all of them
3. Each method should return appropriate mock response
4. Suggest centralizing in `/tests/mocks/`

**Approval Criteria:** All public service methods are mocked

---

## Part 6: Browser API Mocks

### Requirement: Browser constructors use class-based pattern

**Check for:**

```typescript
// ❌ FAIL: Function-based mock for constructor
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// ✅ PASS: Class-based pattern
class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
```

**For Each Browser API Mock:**

1. Check if code uses `new` operator: `new ResizeObserver()`
2. If yes, must use class-based implementation
3. Verify constructor properly handles callback
4. Check setup is in `/client/test/setup.ts` (centralized)

**Approval Criteria:** All constructor-based APIs use class pattern

---

## Part 7: Type Checking

### Requirement: Tests must pass TypeScript strict mode

**Check for:**

```bash
# Run in the PR
npm run typecheck

# If fails, look for:
# - Implicit any types
# - Type mismatches in mocks
# - Missing required fields
```

**Action Items:**

1. Request `npm run typecheck` passes with zero errors
2. Request `npm test` passes (tests compile)
3. Note any type errors in PR comments

**Approval Criteria:** `npm run typecheck` exits with code 0

---

## Part 8: Changes to `shared/types/`

### Special Review for Type Modifications

**If PR modifies interfaces in `shared/types/`:**

1. [ ] **Added required field?**
   - Search for all mocks using this type
   - [ ] Add field to all mock definitions
   - [ ] Update factory functions if used

2. [ ] **Removed field?**
   - [ ] Remove from all mocks
   - [ ] Remove from factory functions
   - [ ] Verify tests still pass

3. [ ] **Changed field type?**
   - [ ] Check all mocks for type compatibility
   - [ ] Update mock values if needed
   - [ ] Run type-checking

4. [ ] **Renamed field?**
   - [ ] Update all mocks
   - [ ] Update factory functions
   - [ ] Check tests that reference old name

**Command to Find Affected Mocks:**

```bash
# Find all test files that might use the changed type
grep -r "TypeName" client/src server/tests \
  --include="*.test.ts" \
  --include="*.test.tsx"

# Check each file for impacts
```

**Approval Criteria:** All mocks updated to match new interface definition

---

## Part 9: Documentation

### Requirement: Mock changes documented

**Check for:**

```typescript
// ✅ PASS: Documented sync point
/**
 * Mock Order data
 *
 * SYNC REQUIREMENT: Keep in sync with shared/types/order.types.ts
 * Last synced: 2025-11-28
 *
 * Required fields:
 * - id, restaurant_id, order_number, status, type
 * - items, subtotal, tax, total, payment_status
 * - created_at, updated_at (ISO 8601)
 */
const mockOrder: Order = { /* ... */ };
```

**For Each Mock Update:**

1. Add or update documentation comment
2. Note sync date
3. List required fields
4. Document any special considerations

**Approval Criteria:** Complex mocks have documentation headers

---

## Quick Review Workflow

### For Simple PR (no type changes)

```
1. Search for "const mock" and "vi.fn()" in changes
2. Check for ": any" and "new Date()"
3. Verify types match interfaces
4. Request factory usage if repeated
5. Approve if no violations
```

### For Complex PR (modifies `shared/types/`)

```
1. List all interface changes (added/removed/changed fields)
2. Find all affected mocks (grep for type names)
3. For each mock:
   - [ ] Has type annotation
   - [ ] Includes all required fields
   - [ ] Uses factory if available
   - [ ] Fixed timestamps
4. Verify npm run typecheck passes
5. Request updates or approve
```

---

## Approval Decision Matrix

| Scenario | Action |
|----------|--------|
| All mocks typed, all fields present, factories used | ✅ Approve |
| Untyped mocks but simple PR | 🔄 Request changes |
| Missing required field | 🚫 Block |
| `any` type used | 🚫 Block |
| Hardcoded `new Date()` | 🔄 Request changes |
| Type-checking fails | 🚫 Block |
| Changes to `shared/types/` but mocks not updated | 🚫 Block |

---

## Common Approval Comments

### For Type Annotations

```markdown
Please add type annotation to mock:

```typescript
const mockOrder: Order = {
  // ...
};
```

This ensures TypeScript catches drift if Order interface changes.
```

### For Missing Fields

```markdown
Mock is missing required field `restaurant_id` from Order interface.

This is critical for multi-tenancy - all orders must include:
```typescript
restaurant_id: '11111111-1111-1111-1111-111111111111'
```
```

### For Factory Usage

```markdown
This mock pattern appears in multiple tests. Please create a factory:

```typescript
// tests/factories/order.factory.ts
export function createMockOrder(overrides?: Partial<Order>): Order {
  return { /* ... */ };
}
```

Then use in tests:
```typescript
const order = createMockOrder({ status: 'preparing' });
```
```

### For Timestamps

```markdown
Mock uses non-deterministic timestamps. Change to fixed ISO string:

```typescript
// Instead of:
created_at: new Date().toISOString()

// Use:
created_at: '2025-11-28T12:00:00Z'
```
```

---

## Questions to Ask

1. **If mock looks incomplete:** "Does this match the interface in `shared/types/`?"
2. **If pattern repeated:** "Should we create a factory function?"
3. **If new mock added:** "Is this used multiple times? Consider a factory."
4. **If changes to interfaces:** "Were all affected mocks updated?"
5. **If type checking fails:** "Can we fix the type annotations?"

---

## References

- Full lesson: `.claude/lessons/CL-TEST-001-mock-drift-prevention.md`
- Quick reference: `.claude/lessons/TEST_MOCK_QUICK_REFERENCE.md`
- Implementation guide: `.claude/lessons/MOCK_DRIFT_IMPLEMENTATION_GUIDE.md`
- Type definitions: `shared/types/`
- Example factories: `tests/factories/` (to be created)

---

## Sign Off

**Reviewer Name:** _______________
**Review Date:** _______________
**All Checks Passed:** ☐ Yes ☐ No
**Comments:**

---

*Last Updated: 2025-11-28*
*See CL-TEST-001 for complete context*
