# Schema-Type Safety Prevention Checklist

**Date Created:** 2025-12-03
**Incidents Fixed:** TODO-142 (Table Schema Mismatch), TODO-143 (Type Assertion Safety)
**Related Issues:** Data integrity, type safety, runtime errors

---

## Problem Summary

Two critical issues discovered in commit 0728e1ee that allow silent data mismatches:

1. **Schema Field Mismatch:** API responses use different field names than shared types (e.g., `capacity` vs `seats`)
2. **Unsafe Type Assertions:** `as any` bypasses TypeScript type safety, hiding invalid values

**Impact:** Both issues allow invalid data to pass through the type system, causing hard-to-debug runtime errors in production.

---

## Prevention Framework

### Phase 1: Code Review Checklist

Use this checklist during ALL code reviews involving:
- API route transformations
- Shared type definitions
- Type transformations (client ↔ server ↔ database)
- Payment/financial data handling

#### Schema Alignment Check

- [ ] **Database Field Names Match Shared Types**
  ```typescript
  // ✅ CORRECT: Database, types, and API all use the same field name
  // Database: seats INT
  // Shared type: seats: number
  // API: { seats: table['seats'] }

  // ❌ WRONG: Mismatch between layers
  // Database: seats INT
  // API: { capacity: table['seats'] }  <- Field renamed!
  // Shared type: { seats: number }      <- Type doesn't match API
  ```

- [ ] **Field Name Transformations Documented**
  - If transforming field names (e.g., `x_pos` → `x`), it MUST be:
    - Documented in type comments
    - Consistent across all transformation functions
    - Reflected in corresponding type definitions
  ```typescript
  // Good: Clear documentation of transformation
  /**
   * Database uses x_pos/y_pos but API/client use x/y
   */
  export interface Table {
    x: number;      // Stored as x_pos in DB
    y: number;      // Stored as y_pos in DB
  }
  ```

- [ ] **API Response Matches Type Definition**
  - For each field in shared type, verify API returns that exact field
  - Use type-safe mapping, not string literals
  ```typescript
  // ✅ CORRECT: Type-safe field mapping
  const transformedData = data.map((row) => ({
    seats: row.seats,      // Maps shared type field
    x: row.x_pos,          // DB-specific transform
    y: row.y_pos,          // DB-specific transform
  }));

  // ❌ WRONG: Field name mismatch
  const transformedData = data.map((row) => ({
    capacity: row.seats,   // Wrong field name!
  }));
  ```

- [ ] **Verification Test Exists**
  - Type integration test validates API response shape
  - Catches mismatches at compile time and runtime
  ```typescript
  // Good: Test validates schema consistency
  it('API response matches shared types', () => {
    const table: Table = apiResponse; // Type check
    expect(table.seats).toBeDefined(); // Runtime check
  });
  ```

#### Type Assertion Review

- [ ] **No `as any` Without Documentation**
  - EVERY `as any` or `as unknown` requires:
    - A comment explaining why
    - An associated issue/TODO
    - A plan to remove it
  ```typescript
  // ✅ CORRECT: Documented assertion with reason
  // TODO-XXX: Replace with proper type mapping when OpenAI API updates
  voice: (options?.voice as any) || 'nova'

  // ❌ WRONG: Undocumented assertion
  decoded = jwt.verify(token, jwtSecret) as any;
  ```

- [ ] **Union Types Used Instead of `any`**
  - Use specific type unions for transformations
  ```typescript
  // ✅ CORRECT: Specific union type
  paymentStatus: order.payment_status === 'paid'
    ? 'completed'
    : (order.payment_status as 'pending' | 'failed' | 'refunded')

  // ❌ WRONG: Generic assertion
  paymentStatus: order.payment_status as any
  ```

- [ ] **Type Mapping Functions for Complex Transformations**
  - Use reusable, testable functions instead of inline assertions
  ```typescript
  // ✅ CORRECT: Type-safe mapping function
  function mapPaymentStatus(
    status: SharedOrder['payment_status']
  ): ClientOrder['paymentStatus'] {
    const map: Record<SharedOrder['payment_status'], ClientOrder['paymentStatus']> = {
      'paid': 'completed',
      'pending': 'pending',
      'processing': 'processing',
      'failed': 'failed',
      'refunded': 'refunded'
    };
    return map[status];
  }

  // ❌ WRONG: Inline assertion with conversion logic
  paymentStatus: order.payment_status === 'paid' ? 'completed' : order.payment_status as any
  ```

- [ ] **Validation Functions Used for Safety-Critical Data**
  - Payment status, table capacity, order totals require validation
  ```typescript
  // ✅ CORRECT: Validates before transformation
  const validatePaymentStatus = (status: unknown): ClientOrder['paymentStatus'] => {
    if (!['paid', 'pending', 'processing', 'failed', 'refunded'].includes(status as string)) {
      throw new TypeTransformationError(
        `Invalid payment status: ${status}`,
        'payment_status',
        status
      );
    }
    return status as ClientOrder['paymentStatus'];
  };
  ```

---

### Phase 2: Automated Checks

#### TypeScript Compiler Settings (Enforced)

**Config: `/tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "strict": true,              // Enable all strict type-checking options
    "noUncheckedIndexedAccess": true,  // Prevent unsafe indexed access
    "noImplicitOverride": true,  // Require override keyword in inherited members
    "noImplicitAny": true        // (part of strict) Error on implicit any
  }
}
```

**Run before every commit:**
```bash
npm run typecheck        # Full workspace type check
npm run typecheck:quick  # Fast check (pre-commit)
```

**What it catches:**
- Missing type definitions
- Incompatible type assignments
- Implicit `any` usage
- Unsafe indexed access

#### ESLint Rules (Recommended)

**To be added to ESLint config:**

```javascript
// Catch unsafe type assertions
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',  // Ban explicit any
    '@typescript-eslint/no-unsafe-assignment': 'warn', // Warn on unsafe assigns
    '@typescript-eslint/no-unsafe-member-access': 'warn', // Warn on unsafe access
    '@typescript-eslint/no-unsafe-call': 'warn',  // Warn on unsafe function calls
  }
}
```

**Run regularly:**
```bash
npm run lint
```

#### CI/CD Checks

**Recommended GitHub Actions addition:**

```yaml
- name: Type Safety Check
  run: npm run typecheck

- name: ESLint Type Rules
  run: npm run lint -- --rule '@typescript-eslint/no-explicit-any: error'

- name: Schema Consistency Test
  run: npm run test -- transformers.test.ts
```

---

### Phase 3: Testing Strategy

#### Unit Test Requirements

**File: `shared/types/__tests__/transformers.test.ts`**

Test every transformation function with:

1. **Valid Data Test**
   ```typescript
   describe('transformSharedOrderToClient', () => {
     it('transforms all fields correctly', () => {
       const shared: SharedOrder = {
         id: '123',
         order_number: 'ORD-001',
         payment_status: 'paid',
         // ... all required fields
       };

       const client = transformSharedOrderToClient(shared);

       // Verify exact field mappings
       expect(client.id).toBe(shared.id);
       expect(client.orderNumber).toBe(shared.order_number);
       expect(client.paymentStatus).toBe('completed'); // 'paid' → 'completed'
     });
   });
   ```

2. **Schema Consistency Test**
   ```typescript
   it('maps all database fields without loss', () => {
     const shared = createMockSharedOrder();
     const transformed = transformSharedOrderToClient(shared);

     // Every database field must have a client equivalent
     expect(Object.keys(transformed)).toContain('paymentStatus');
     expect(transformed.paymentStatus).toBeDefined();

     // No undefined values for required fields
     expect(transformed.totalAmount).not.toBeUndefined();
   });
   ```

3. **Invalid Value Handling**
   ```typescript
   it('throws on invalid payment status', () => {
     const invalid = {
       ...validOrder,
       payment_status: 'invalid_status' as any
     };

     expect(() => transformSharedOrderToClient(invalid))
       .toThrow(TypeTransformationError);
   });
   ```

4. **Round-Trip Transformation**
   ```typescript
   it('survives round-trip transformation', () => {
     const original: SharedOrder = createMockSharedOrder();

     const toClient = transformSharedOrderToClient(original);
     const backToShared = transformClientOrderToShared(toClient);

     // Key fields should survive round-trip
     expect(backToShared.payment_status).toBe(original.payment_status);
     expect(backToShared.order_number).toBe(original.order_number);
   });
   ```

#### Integration Test Requirements

**Test API Response Shape**

```typescript
describe('Table API Response Schema', () => {
  it('returns table.seats not table.capacity', async () => {
    const response = await httpClient.get('/tables', { params: { restaurant_id: testRestaurantId } });

    // Verify field name matches shared types
    expect(response[0]).toHaveProperty('seats');
    expect(response[0]).not.toHaveProperty('capacity');

    // Type check works
    const table: Table = response[0];
    expect(table.seats).toBeGreaterThan(0);
  });
});
```

#### Property-Based Testing (Optional but Recommended)

```typescript
import fc from 'fast-check';

describe('Payment Status Transformation', () => {
  it('handles all valid payment statuses', () => {
    const validStatuses = ['paid', 'pending', 'processing', 'failed', 'refunded'] as const;

    fc.assert(
      fc.property(fc.constantFrom(...validStatuses), (status) => {
        const order: SharedOrder = { ...mockOrder, payment_status: status };
        const transformed = transformSharedOrderToClient(order);

        // Must always have a valid paymentStatus
        expect(transformed.paymentStatus).toBeDefined();
        expect(['pending', 'processing', 'completed', 'failed', 'refunded'])
          .toContain(transformed.paymentStatus);
      })
    );
  });
});
```

---

### Phase 4: Code Patterns

#### Correct Pattern: Table Field Transformation

```typescript
// ✅ CORRECT: Database fields clearly documented and transformed

/**
 * Database uses x_pos/y_pos/shape, but client API uses x/y/type
 */
export interface Table {
  id: string;
  seats: number;        // Direct from DB, no transformation
  x: number;           // Stored as x_pos in DB
  y: number;           // Stored as y_pos in DB
  type: TableShape;    // Stored as shape in DB
}

// In API route:
const transformedData = (data || []).map((table: any) => ({
  id: table.id,
  seats: table.seats,        // Keep as-is: matches type
  x: table['x_pos'],         // Transform: DB → API field
  y: table['y_pos'],         // Transform: DB → API field
  type: table['shape'],      // Transform: DB → API field
  width: table.width,        // Keep as-is
  height: table.height,      // Keep as-is
  // ... other fields
}));

// TypeScript ensures this matches Table interface
const result: Table[] = transformedData;
```

#### Correct Pattern: Unsafe Type Assertions

```typescript
// ❌ BAD: Using `as any` without reason
const decoded = jwt.verify(token, jwtSecret) as any;

// ✅ GOOD: Using specific union type
interface JWTPayload {
  sub: string;
  iat: number;
  exp: number;
  restaurant_id: string;
}

const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
// TypeScript now checks all properties exist

// ✅ ALTERNATIVE: Using type guard function
function verifyJWT(token: string): JWTPayload {
  const decoded = jwt.verify(token, jwtSecret);

  if (
    typeof decoded !== 'object' ||
    !decoded ||
    !('sub' in decoded) ||
    !('restaurant_id' in decoded)
  ) {
    throw new Error('Invalid JWT structure');
  }

  return decoded as JWTPayload;
}
```

#### Correct Pattern: Payment Status Transformation

```typescript
// ❌ BAD: Using `as any`
paymentStatus: order.payment_status === 'paid'
  ? 'completed'
  : order.payment_status as any,

// ✅ GOOD: Explicit union type
paymentStatus: order.payment_status === 'paid'
  ? 'completed'
  : (order.payment_status as 'pending' | 'processing' | 'failed' | 'refunded'),

// ✅ BETTER: Using a mapping function
export const mapPaymentStatus = (
  dbStatus: SharedOrder['payment_status']
): ClientOrder['paymentStatus'] => {
  const statusMap: Record<SharedOrder['payment_status'], ClientOrder['paymentStatus']> = {
    'paid': 'completed',
    'pending': 'pending',
    'processing': 'processing',
    'failed': 'failed',
    'refunded': 'refunded'
  };

  const mapped = statusMap[dbStatus];
  if (!mapped) {
    throw new Error(`Unknown payment status: ${dbStatus}`);
  }
  return mapped;
};
```

---

### Phase 5: Common Pitfalls to Avoid

1. **Renaming Fields Without Updating All Layers**
   - Issue: Changed field name in API without updating shared types
   - Prevention: Search codebase for all usages before renaming
   - Check: `grep -r "capacity\|seats" --include="*.ts" --include="*.tsx"`

2. **Using `any` "Just for Now"**
   - Issue: Temporary assertions left in production code
   - Prevention: All `as any` must have a TODO comment
   - Check: `grep -r "as any" --include="*.ts" --include="*.tsx" | grep -v "TODO"`

3. **Different Field Names in Database vs API**
   - Issue: API returns `capacity`, database has `seats`
   - Prevention: Document field name transformations in type comments
   - Check: Verify API response shape in integration tests

4. **Missing Validation on Type Boundaries**
   - Issue: Invalid data passes through transformation functions
   - Prevention: Use validation functions for safety-critical data
   - Check: All transformation functions should have error handling

5. **Round-Trip Data Loss**
   - Issue: Transforming from shared → client → shared loses information
   - Prevention: Unit tests must verify round-trip integrity
   - Check: Test both directions of transformation

6. **Forgetting to Update Type Assertions When Enum Changes**
   - Issue: Type assertion lists valid values, but actual values change
   - Prevention: Use type definitions instead of literal assertions
   - Check: Reference the actual type union, don't hardcode values

---

## Verification Checklist

### Before Merging Any PR

- [ ] **Schema Alignment**
  - [ ] All field names in API match shared types (or documented transformation)
  - [ ] No undocumented field renamings
  - [ ] Type integration tests pass

- [ ] **Type Safety**
  - [ ] No new `as any` assertions added
  - [ ] All new assertions have documentation
  - [ ] TypeScript strict mode passes (`npm run typecheck`)
  - [ ] ESLint passes (`npm run lint`)

- [ ] **Transformation Functions**
  - [ ] All transformations have unit tests
  - [ ] Tests verify:
    - [ ] Valid data transforms correctly
    - [ ] Invalid data throws appropriate error
    - [ ] Round-trip transformation works
  - [ ] Error messages are clear

- [ ] **Documentation**
  - [ ] Type comments explain DB ↔ API field mappings
  - [ ] Transformation logic is documented
  - [ ] Any special handling is explained

---

## Automation Suggested Improvements

### GitHub Actions Check (Add to CI/CD)

```yaml
name: Schema Type Safety

on: [pull_request]

jobs:
  schema-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: TypeScript Strict Check
        run: npm run typecheck

      - name: Test Transformers
        run: npm run test -- transformers.test.ts

      - name: Check for `as any`
        run: |
          if grep -r "as any" shared/types transformers.ts --include="*.ts" --include="*.tsx" | grep -v "TODO"; then
            echo "Found unvetted 'as any' assertions"
            exit 1
          fi
```

### Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for unsafe type assertions
if git diff --cached --name-only | grep -E '\.(ts|tsx)$' | xargs grep -l "as any" 2>/dev/null; then
  echo "Error: Unvetted 'as any' found. Add TODO comment or remove."
  exit 1
fi

# Check that transformers tests pass
npm run test -- transformers.test.ts --bail || exit 1
```

---

## Key Takeaways

1. **Schema mismatches are silent bugs** - Field name differences don't cause TypeScript errors, only runtime issues
2. **`as any` is a code smell** - Every assertion should be documented and have a removal plan
3. **Transformations are critical** - Test round-trip transformations and validate at boundaries
4. **Union types > `any`** - Use specific type unions instead of generic assertions
5. **Prevent at code review** - These issues are caught by careful review, not automation alone

---

## References

- TypeScript strict mode: https://www.typescriptlang.org/tsconfig#strict
- ADR-001: Snake Case Convention (CLAUDE.md)
- CLAUDE.md: No `any` rule
- TODO-142: Table Schema Mismatch (resolved)
- TODO-143: Type Assertions (resolved)

---

**Document Status:** Active Prevention Framework
**Last Updated:** 2025-12-03
**Review Cycle:** After each type safety incident
