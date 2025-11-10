# Lesson: Database Schema vs Application Mismatches

**Date:** 2025-11-10
**Severity:** CRITICAL
**Time to Find:** 5+ days (across multiple incidents)
**Fix Complexity:** Schema migrations + code changes

---

## The Bug Patterns

### 1. Demo Users vs UUID Constraints

```sql
-- ❌ WRONG - UUID constraint doesn't support demo users
CREATE TABLE payment_audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),  -- Assumes all users have UUIDs
  amount DECIMAL(10,2),
  status TEXT
);
```

```typescript
// Application code - Demo users use string IDs
const demoUser = {
  id: "demo:server:abc123",  // Not a UUID!
  type: "demo"
}

// Attempt to log payment
await db.insert('payment_audit_logs', {
  user_id: demoUser.id,  // ERROR: invalid input syntax for type uuid
  amount: 50.00,
  status: 'pending'
})
```

**Why It Breaks:**
- Demo users use string IDs like `"demo:server:xyz"`
- Database expects UUID format
- PostgreSQL rejects insert with "invalid input syntax for type uuid"
- Transaction aborts, payment marked as failed
- **100% of demo online orders blocked**

---

### 2. RPC Functions Not Updated After Migrations

```sql
-- Migration adds new column
ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50);

-- But RPC function signature not updated
CREATE OR REPLACE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_table_id UUID,
  p_items JSONB
  -- Missing: p_payment_method parameter
) RETURNS UUID AS $$
BEGIN
  INSERT INTO orders (restaurant_id, table_id, items, payment_method)
  VALUES (p_restaurant_id, p_table_id, p_items, NULL);  -- Always NULL!
  -- ...
END;
$$ LANGUAGE plpgsql;
```

**Why It Breaks:**
- Table has new column, RPC doesn't accept it
- RPC inserts NULL for payment_method
- Application expects payment_method to be set
- 500 errors on order creation
- **Recurring issue: multiple incidents**

---

### 3. Inconsistent Data Type Definitions

```typescript
// Service A
const TAX_RATE = 8.0  // 8.0%

// Service B
const TAX_RATE = 8.25  // 8.25%

// Database
CREATE TABLE restaurants (
  tax_rate DECIMAL(5,2) DEFAULT 8.00
);
```

**Why It Breaks:**
- Three different sources of truth
- Calculations inconsistent across modules
- Reports don't match actual charges
- Customer confusion, potential legal issues

---

### 4. VARCHAR vs TEXT Type Mismatches

```sql
-- Migration A
ALTER TABLE orders ADD COLUMN notes VARCHAR(255);

-- Migration B (months later)
CREATE OR REPLACE FUNCTION create_order(..., p_notes TEXT) ...
  -- Expects TEXT, table has VARCHAR
```

**Why It Breaks:**
- Type mismatch between RPC parameter and table column
- Implicit casting usually works but can fail
- Length limits differ (VARCHAR(255) vs TEXT unlimited)
- Subtle bugs when notes exceed 255 characters

---

## The Fixes

### 1. Make user_id Nullable for Demo Users

```sql
-- ✅ CORRECT - Support both demo and regular users
CREATE TABLE payment_audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),  -- Nullable for demo users
  demo_user_info JSONB,  -- Store demo user metadata separately
  amount DECIMAL(10,2),
  status TEXT
);
```

```typescript
// Application code
const auditLog = user.type === 'demo'
  ? {
      user_id: null,  // No UUID for demo users
      demo_user_info: {
        id: user.id,  // String ID stored as metadata
        session: user.session,
        created_at: user.created_at
      },
      amount: 50.00,
      status: 'pending'
    }
  : {
      user_id: user.id,  // Regular UUID
      demo_user_info: null,
      amount: 50.00,
      status: 'pending'
    }

await db.insert('payment_audit_logs', auditLog)
```

**Prevention:**
- Always account for special user types in schema design
- Check ADR-006 dual authentication pattern
- Add assertions for demo users in tests
- Validate at application startup

---

### 2. RPC Update Workflow

```sql
-- ✅ CORRECT - Always update RPC when table changes
-- Step 1: Add column to table
ALTER TABLE orders ADD COLUMN payment_method TEXT;

-- Step 2: Update RPC function signature
CREATE OR REPLACE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_table_id UUID,
  p_items JSONB,
  p_payment_method TEXT  -- New parameter
) RETURNS UUID AS $$
BEGIN
  INSERT INTO orders (
    restaurant_id,
    table_id,
    items,
    payment_method
  ) VALUES (
    p_restaurant_id,
    p_table_id,
    p_items,
    p_payment_method  -- Pass it through
  );
  -- ...
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update all callers
```

**RPC Sync Checklist:**
```bash
# When modifying a table:
# 1. Find all RPC functions that touch it
SELECT routine_name
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_body = 'SQL'
  AND routine_definition LIKE '%table_name%';

# 2. Update each RPC signature
# 3. Update all application code calling the RPC
# 4. Test with actual database (not mocks)
# 5. Verify in production after deployment
```

---

### 3. Centralize Constants

```typescript
// ✅ CORRECT - Single source of truth
// shared/constants/tax.ts
export const TAX_RATE = 8.25  // Canonical value

// All services import from here
import { TAX_RATE } from '@/shared/constants/tax'

// Database migration
ALTER TABLE restaurants ALTER COLUMN tax_rate SET DEFAULT 8.25;
```

**Enforcement:**
```typescript
// tests/consistency/constants.test.ts
import { TAX_RATE } from '@/shared/constants/tax'

test('tax rate consistency', async () => {
  // Check database default
  const dbDefault = await db.query(`
    SELECT column_default
    FROM information_schema.columns
    WHERE table_name = 'restaurants'
      AND column_name = 'tax_rate'
  `)

  expect(parseFloat(dbDefault)).toBe(TAX_RATE)
})
```

---

### 4. Standardize Data Types

```sql
-- ✅ CORRECT - Use TEXT everywhere, not VARCHAR
ALTER TABLE orders ADD COLUMN notes TEXT;  -- Not VARCHAR(255)

CREATE OR REPLACE FUNCTION create_order(..., p_notes TEXT) ...

-- Type standardization rules:
-- - Always TEXT (never VARCHAR with arbitrary limits)
-- - Always TIMESTAMPTZ (never TIMESTAMP without timezone)
-- - Always JSONB (never JSON for storage)
-- - Always UUID (never TEXT for IDs, except demo users)
```

---

## Key Lessons

### 1. Schema Design Must Account for ALL User Types
**Problem:** Designed for normal users, forgot demo users exist

**Solution:**
- Review ADR-006 before any user-related schema changes
- Demo users use string IDs, not UUIDs
- Test with BOTH user types on every new feature
- Add startup validation for edge cases

### 2. Database Migrations Are Not Complete Until RPCs Updated
**Problem:** Added column to table, forgot to update RPC

**Solution:**
- Step-by-step RPC sync workflow (see above)
- Search for all RPCs touching the modified table
- Update signatures to match new schema
- No "I'll do it later" - must be atomic with migration
- **Most recurring issue in codebase - 3+ incidents**

### 3. Multiple Sources of Truth = Bugs
**Problem:** Tax rate defined in 3 different places

**Solution:**
- Centralize constants in `shared/constants/`
- Database defaults must match code constants
- Add consistency tests (code vs DB)
- Single import path for all services

### 4. Type Mismatches Are Subtle and Dangerous
**Problem:** VARCHAR vs TEXT seems harmless until it breaks

**Solution:**
- Standardize on one type (TEXT not VARCHAR)
- Document type standards in schema guidelines
- Use ORM/type generator (Prisma) to catch mismatches at compile time
- No mixing TIMESTAMP and TIMESTAMPTZ

---

## Quick Reference Card

### Schema Change Checklist

When modifying database schema:
- [ ] Identify ALL tables affected
- [ ] Find ALL RPC functions touching those tables
- [ ] Update RPC function signatures
- [ ] Update ALL application code calling RPCs
- [ ] Check for special cases (demo users, null values)
- [ ] Update TypeScript types if using codegen
- [ ] Add migration to version control
- [ ] Test with actual database (not mocks)
- [ ] Deploy migration BEFORE code changes
- [ ] Verify in production after deployment
- [ ] Add regression test for the change

### Demo User Schema Pattern

```sql
-- Any table with user_id needs demo support
CREATE TABLE table_name (
  user_id UUID REFERENCES users(id),  -- Nullable
  demo_user_info JSONB,  -- For demo user metadata
  -- other columns
);

-- Application code must handle both
if (user.type === 'demo') {
  // Use demo_user_info column
} else {
  // Use user_id column
}
```

### RPC Function Discovery

```sql
-- Find all RPCs touching a table
SELECT
  r.routine_name,
  r.routine_definition
FROM information_schema.routines r
WHERE r.routine_type = 'FUNCTION'
  AND r.routine_definition LIKE '%table_name%'
ORDER BY r.routine_name;
```

### Type Standards

```sql
-- ✅ Preferred types
TEXT          -- Not VARCHAR
TIMESTAMPTZ   -- Not TIMESTAMP
JSONB         -- Not JSON
UUID          -- For real IDs (not demo)
DECIMAL(p,s)  -- For money
BOOLEAN       -- Not CHAR(1)

-- ❌ Avoid
VARCHAR(n)    -- Arbitrary limits
TIMESTAMP     -- No timezone
JSON          -- Slower than JSONB
TEXT          -- For UUIDs (except demo users)
```

---

## When to Reference This Lesson

**Symptoms:**
- ✅ "invalid input syntax for type uuid" errors
- ✅ Demo users can't complete checkout/payments
- ✅ 500 errors on order creation after migration
- ✅ NULL values appearing in required fields
- ✅ Type mismatch errors in RPC calls
- ✅ Inconsistent calculations across services
- ✅ Payment amounts don't match totals

**Error Messages:**
- "invalid input syntax for type uuid"
- "column X does not exist in function Y"
- "function X(args) does not exist"
- "null value in column X violates not-null constraint"

**Related Issues:**
- ADR-006 dual authentication pattern
- Demo user failures (always check UUID constraints)
- Payment/order processing failures after migrations

---

## Prevention

### 1. Startup Validation for Demo Users

```typescript
// server/src/startup/validate-schema.ts
export async function validateDemoUserSupport() {
  // Find all tables with user_id UUID NOT NULL
  const tables = await db.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE column_name = 'user_id'
      AND is_nullable = 'NO'
      AND data_type = 'uuid'
  `)

  if (tables.length > 0) {
    console.error('⚠️  Tables with non-nullable UUID user_id (breaks demo users):')
    tables.forEach(t => console.error(`   - ${t.table_name}`))
    throw new Error('Schema not compatible with demo users')
  }
}
```

### 2. RPC Sync Test

```typescript
// tests/database/rpc-sync.test.ts
describe('RPC Function Schema Sync', () => {
  it('create_order_with_audit matches orders table', async () => {
    // Get table columns
    const tableColumns = await getTableColumns('orders')

    // Get RPC parameters
    const rpcParams = await getRPCParameters('create_order_with_audit')

    // Verify critical columns are in RPC
    const criticalColumns = ['payment_method', 'tax_rate', 'notes']
    criticalColumns.forEach(col => {
      expect(rpcParams).toContain(`p_${col}`)
    })
  })
})
```

### 3. Consistency Test for Constants

```typescript
// tests/consistency/database-constants.test.ts
describe('Database vs Code Constant Consistency', () => {
  it('tax rate matches between code and DB', async () => {
    const dbDefault = await getColumnDefault('restaurants', 'tax_rate')
    expect(parseFloat(dbDefault)).toBe(TAX_RATE)
  })

  it('payment methods enum matches', async () => {
    const dbEnum = await getEnumValues('payment_method_enum')
    expect(dbEnum.sort()).toEqual(PAYMENT_METHODS.sort())
  })
})
```

### 4. Migration Template

```sql
-- migrations/template.sql
-- Template for schema changes with RPC updates

-- 1. Modify table
ALTER TABLE table_name ADD COLUMN new_column TEXT;

-- 2. Find affected RPCs (run this manually first)
SELECT routine_name
FROM information_schema.routines
WHERE routine_definition LIKE '%table_name%';

-- 3. Update each RPC found above
CREATE OR REPLACE FUNCTION rpc_name(
  -- existing params...
  p_new_column TEXT  -- Add new parameter
) RETURNS return_type AS $$
BEGIN
  -- Update INSERT/UPDATE to include new column
  INSERT INTO table_name (..., new_column)
  VALUES (..., p_new_column);
END;
$$ LANGUAGE plpgsql;

-- 4. Add comment documenting the change
COMMENT ON COLUMN table_name.new_column IS
  'Added in migration YYYYMMDD - purpose of column';
```

---

## Code Review Checklist

When reviewing schema changes:
- [ ] Migration includes both table AND RPC updates
- [ ] All RPCs touching modified table are updated
- [ ] Demo user support checked (no UUID NOT NULL on user_id)
- [ ] Type consistency (TEXT not VARCHAR, TIMESTAMPTZ not TIMESTAMP)
- [ ] Constants centralized (not duplicated across services)
- [ ] Integration tests with actual database
- [ ] Both normal and demo user test cases
- [ ] Migration is idempotent (can run multiple times)
- [ ] Rollback plan documented
- [ ] Production verification steps defined

---

## Related ADRs

- **ADR-006:** Dual Authentication Pattern
  - Demo users use string IDs, not UUIDs
  - Schema must accommodate both user types
- **ADR-001:** Snake Case Naming Convention
  - All database columns use snake_case
  - Consistency across tables and RPCs

---

## Related Lessons

- [Auth & Multi-Tenancy Security](./auth-multi-tenancy-security.md) - Demo user auth patterns
- [Configuration & Environment Errors](./configuration-environment-errors.md) - Square Location ID typo

---

## TL;DR

**Problem:** Database schema and application logic out of sync
**Solutions:**
1. **Demo users:** Make user_id nullable, use demo_user_info JSONB
2. **RPC sync:** Always update RPC functions when table changes
3. **Constants:** Centralize values, test DB vs code consistency
4. **Types:** Standardize on TEXT, TIMESTAMPTZ, JSONB, UUID

**Remember:**
- Demo users break UUID constraints - always make user_id nullable
- Table migration without RPC update = 500 errors in production
- Multiple sources of truth = bugs (centralize constants)
- RPC schema mismatches are the #1 recurring issue (3+ incidents)

**Quick Fix Pattern:**
```sql
-- ✅ Demo-compatible user_id
user_id UUID REFERENCES users(id)  -- Nullable

-- ✅ Update RPC with table
ALTER TABLE orders ADD COLUMN payment_method TEXT;
-- Then immediately:
CREATE OR REPLACE FUNCTION create_order(..., p_payment_method TEXT) ...

-- ✅ Standardize types
TEXT not VARCHAR, TIMESTAMPTZ not TIMESTAMP
```
