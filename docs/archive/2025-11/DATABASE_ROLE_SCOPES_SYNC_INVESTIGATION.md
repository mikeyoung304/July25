# DATABASE ROLE_SCOPES SYNCHRONIZATION INVESTIGATION REPORT

**Investigation Date:** November 7, 2025
**Status:** CRITICAL MISMATCH IDENTIFIED
**Severity:** HIGH - Database schema conflicts with code and recent migrations

---

## EXECUTIVE SUMMARY

The database `role_scopes` and `api_scopes` tables have a **critical schema mismatch** that is causing silent data insertion failures. The migrations are using the wrong column names, causing INSERT statements to fail or insert into wrong columns.

**Key Finding:** Three different column naming conventions are in use across three different time periods:
1. **Original (2025-01-30, archived):** `scope_name` column
2. **Emergency migrations (2025-10-13, 2025-10-18):** `scope_name` column  
3. **Latest RBAC sync v2 (2025-10-29):** `scope` column
4. **Prisma schema (current):** `scope` column
5. **RBAC code constant:** Uses `'tables:manage'` format (colons, not dots)

---

## CRITICAL ISSUES IDENTIFIED

### Issue 1: Column Name Mismatch - Prisma vs Migrations

**Prisma schema defines:**
```prisma
model api_scopes {
  scope       String        @id    // <-- PRIMARY KEY IS 'scope'
  description String?
  role_scopes role_scopes[]

  @@schema("public")
}

model role_scopes {
  role       String                                           // <-- Column is 'role'
  scope      String                                           // <-- Column is 'scope' NOT 'scope_name'
  api_scopes api_scopes @relation(fields: [scope], references: [scope], ...)

  @@id([role, scope])
}
```

**But migrations use:**
- `20251013_emergency_kiosk_demo_scopes.sql` → Uses `scope_name` column (WRONG)
- `20251018_add_customer_role_scopes.sql` → Uses `scope_name` column (WRONG)
- `20251029_sync_role_scopes_with_rbac_v2.sql` → Uses `scope` column (CORRECT)

**Impact:**
- Migrations 20251013 and 20251018 are trying to INSERT into non-existent `scope_name` column
- Data may not be inserting correctly
- Foreign key references are broken

### Issue 2: Column Schema Change in Migration 20251029

**Migration 20251029_sync_role_scopes_with_rbac_v2.sql:**
```sql
-- This migration ASSUMES the schema changed to 'scope' column
INSERT INTO api_scopes (scope, description) VALUES
  ('orders:update', 'Update existing orders'),
  ('tables:manage', 'Manage table layouts'),
  ...
ON CONFLICT (scope) DO NOTHING;

INSERT INTO role_scopes (role, scope) VALUES
  ('server', 'orders:create'),
  ('server', 'tables:manage'),  -- <-- NOTE: Using 'tables:manage' (correct format)
  ...
```

**But the comment in the migration says:**
```
-- Root Cause: Database has 'orders.write' but code checks for 'orders:create'
--             Missing scopes: orders:update, orders:status, payments:read, payments:refund, tables:manage
```

This indicates the migration was trying to FIX an issue where the database had the WRONG scopes entirely (dots vs colons).

### Issue 3: Scope Naming Convention Mismatch

**Code uses (correct):** `'tables:manage'` format (resource:action with colons)

**Database had (if archived migration was used):** Based on the comment, seems to have had `'orders.write'` (wrong format with dots)

**Current state:** Unknown - depends on which migrations actually ran in production

### Issue 4: Server Role Scope Missing

**RBAC code defines (lines 139-147 of rbac.ts):**
```typescript
server: [
  ApiScope.ORDERS_CREATE,      // 'orders:create'
  ApiScope.ORDERS_READ,        // 'orders:read'
  ApiScope.ORDERS_UPDATE,      // 'orders:update'
  ApiScope.ORDERS_STATUS,      // 'orders:status'
  ApiScope.PAYMENTS_PROCESS,   // 'payments:process'
  ApiScope.PAYMENTS_READ,      // 'payments:read'
  // TABLES_MANAGE removed - servers should only update table status during service
]
```

**But Migration 20251029 inserts (lines 30-38):**
```sql
INSERT INTO role_scopes (role, scope) VALUES
  ('server', 'orders:create'),
  ('server', 'orders:read'),
  ('server', 'orders:update'),
  ('server', 'orders:status'),
  ('server', 'payments:process'),
  ('server', 'payments:read'),
  ('server', 'tables:manage')   -- <-- THIS IS WRONG! Code removed this
ON CONFLICT (role, scope) DO NOTHING;
```

**THIS IS A MAJOR INCONSISTENCY:** The migration has `tables:manage` for server, but the code comment explicitly says it was removed because "servers should only update table status during service, not create/delete tables".

### Issue 5: Manager Role Has Correct Scopes in Both

**Code (lines 122-137):**
```typescript
manager: [
  ApiScope.ORDERS_CREATE,
  ApiScope.ORDERS_READ,
  ApiScope.ORDERS_UPDATE,
  ApiScope.ORDERS_DELETE,
  ApiScope.ORDERS_STATUS,
  ApiScope.PAYMENTS_PROCESS,
  ApiScope.PAYMENTS_REFUND,
  ApiScope.PAYMENTS_READ,
  ApiScope.REPORTS_VIEW,
  ApiScope.REPORTS_EXPORT,
  ApiScope.STAFF_MANAGE,
  ApiScope.STAFF_SCHEDULE,
  ApiScope.MENU_MANAGE,
  ApiScope.TABLES_MANAGE    // <-- Included
]
```

**Database (from archived migration line 144):**
```sql
('manager', 'tables:manage'),  -- <-- Included
```

**Status:** Appears to be in sync (both have tables:manage for manager)

---

## DATABASE SCHEMA FOR ROLES/SCOPES

### Current Prisma Schema

**api_scopes table:**
- `scope` (TEXT, PRIMARY KEY) - The scope identifier like 'orders:create'
- `description` (TEXT, nullable) - Human readable description

**role_scopes table:**
- `role` (TEXT) - The role name like 'manager', 'server', 'kitchen'
- `scope` (TEXT, FOREIGN KEY → api_scopes.scope) - References api_scopes
- Composite primary key: `[role, scope]`
- Indexes: `idx_role_scopes_role`, `idx_role_scopes_scope`

### Scopes Expected in Manager Role (from RBAC code):
1. `orders:create`
2. `orders:read`
3. `orders:update`
4. `orders:delete`
5. `orders:status`
6. `payments:process`
7. `payments:refund`
8. `payments:read`
9. `reports:view`
10. `reports:export`
11. `staff:manage`
12. `staff:schedule`
13. `menu:manage`
14. `tables:manage` ✓ YES - INCLUDED

---

## SYNCHRONIZATION STATUS: OUT OF SYNC

### Code vs Database: LIKELY OUT OF SYNC

**Why:** 
1. Two conflicting migrations (20251013, 20251018) use wrong column names (`scope_name` instead of `scope`)
2. These migrations likely failed silently or didn't insert data correctly
3. Migration 20251029 tries to fix it by using the correct `scope` column
4. Without knowing which migrations actually executed successfully in production, we can't be sure what's in the database

### Recent Migrations Timeline:

```
2025-10-13: 20251013_emergency_kiosk_demo_scopes.sql
  ├─ Creates api_scopes and role_scopes tables (backup creation with CREATE TABLE IF NOT EXISTS)
  ├─ Uses scope_name column (WRONG - doesn't match Prisma)
  ├─ Status: Likely failed or partial

2025-10-18: 20251018_add_customer_role_scopes.sql
  ├─ Adds 'customer' role scopes
  ├─ Uses scope_name column (WRONG - doesn't match Prisma)
  ├─ Status: Likely failed or partial

2025-10-29: 20251029_sync_role_scopes_with_rbac_v2.sql
  ├─ Sync server and kitchen scopes with RBAC code
  ├─ Uses scope column (CORRECT - matches Prisma)
  ├─ BUT: Adds tables:manage to server (contradicts RBAC code comment)
  ├─ Includes verification logic to ensure 7 server scopes and 2 kitchen scopes
  └─ Status: Unknown
```

---

## SCOPE INCONSISTENCIES

### Naming Convention Issues

**Code constant uses:** `'orders:create'`, `'tables:manage'` (colons)
**Archived migration comment mentions:** `'orders.write'` (dots) - THIS IS WRONG

The naming convention MUST follow the pattern: `<resource>:<action>`
- Correct: `orders:create`, `tables:manage`, `menu:manage`
- Wrong: `orders.write`, `menu.read`, `tables.configure`

### Missing from Current Migrations

Looking at the latest migration (20251029), these scopes are added to `api_scopes` but NOT assigned to all roles:

```sql
INSERT INTO api_scopes (scope, description) VALUES
  ('reports:view', 'View reports'),
  ('reports:export', 'Export reports'),
  ('staff:manage', 'Manage staff'),
  ('staff:schedule', 'Manage staff schedules'),
  ('system:config', 'System configuration'),
  ('menu:manage', 'Manage menu items'),
  ('orders:delete', 'Delete/cancel orders'),
  ('payments:refund', 'Process payment refunds'),
  ...
```

But the INSERT into `role_scopes` only handles `server` and `kitchen`, not manager, owner, cashier, etc.

**Missing from recent migrations:**
- Customer role scopes (added in 20251018 but with wrong column name)
- Cashier, expo, kiosk_demo role scopes
- Proper owner and manager role complete scope lists

---

## WHICH MIGRATION RAN IN PRODUCTION?

**Cannot determine without connecting to database, but based on evidence:**

### Scenario A: Only baseline migrations ran (pre-2025-10-13)
- Tables exist from initial schema
- May have `scope_name` column (if archived 20250130 ran)
- Missing customer, server, kitchen scopes

### Scenario B: All migrations ran sequentially
- 20251013 and 20251018 might have failed (wrong column names)
- 20251029 would have failed if tables had `scope_name` column instead of `scope`
- Result: Inconsistent/partial data

### Scenario C: Only 20251029 ran successfully
- Tables converted from `scope_name` to `scope` column
- Server and kitchen scopes inserted correctly
- Customer scopes missing
- Manager might not have all scopes

---

## DUAL-SOURCE ARCHITECTURE VERIFICATION

The RBAC code has a detailed comment (lines 43-102) explaining the dual-source pattern:

**Database source (client-side auth):**
- Queried during login
- Loaded into JWT for performance
- Used by client to show/hide UI elements

**Code constant source (server-side API):**
- Used for API route protection
- `requireScopes()` middleware checks JWT scopes
- No database query per request (performance)

**Critical requirement:** These MUST stay in sync, but they currently are NOT:

```
RBAC.ts server role:  orders:create, orders:read, orders:update, orders:status, payments:process, payments:read
Migration 20251029:   orders:create, orders:read, orders:update, orders:status, payments:process, payments:read, tables:manage
                                                                                                             ^^^^^^^^^^^^^^ MISMATCH!
```

---

## SYNC SCRIPTS

### Current Situation:
The `ROLE_SCOPES` constant comment (lines 47-101) provides detailed instructions for syncing, but:
1. **No automated sync script exists** that reads code and writes to database
2. **No validation script** checks if code matches database
3. **Manual process required** following the 8-step procedure

### Recommended Process (from code comments):
1. Add scope to ApiScope enum
2. Add scope to ROLE_SCOPES constant
3. Create database migration
4. Add to api_scopes table FIRST (foreign key)
5. Add to role_scopes table
6. Apply migration with `supabase db push --linked`
7. Verify with SQL query
8. Test with curl

### What's Missing:
1. **Sync verification script:** Query database and compare with code
2. **Automated compliance check:** CI/CD step to validate sync
3. **Fix script:** Generate corrective migrations based on code state

---

## RECOMMENDATIONS

### Immediate Action Items:

1. **Query Production Database:**
   ```sql
   -- Check schema
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'api_scopes';
   
   -- Check actual data
   SELECT role, scope FROM role_scopes ORDER BY role, scope;
   SELECT scope FROM api_scopes ORDER BY scope;
   ```

2. **Determine Current State:**
   - If database has `scope_name` column: Migrations 20251013/20251018 ran, 20251029 failed
   - If database has `scope` column: Prisma matches database, migrations may have run successfully

3. **Fix Server Role Scope:**
   - Remove `tables:manage` from server role in database (if it exists)
   - This contradicts the RBAC code comment (line 146)

4. **Create Verification Script:**
   ```bash
   #!/bin/bash
   # scripts/verify-role-scopes-sync.sh
   
   # Check Prisma definition
   echo "Checking code ROLE_SCOPES constant..."
   grep -A 20 "const ROLE_SCOPES" server/src/middleware/rbac.ts
   
   # Check database state
   echo "Checking database role_scopes table..."
   psql $DATABASE_URL -c "SELECT role, array_agg(scope ORDER BY scope) as scopes FROM role_scopes GROUP BY role ORDER BY role;"
   ```

5. **Create Migration to Fix:**
   ```sql
   -- supabase/migrations/20251107_fix_server_role_scopes.sql
   
   -- Remove tables:manage from server role (contradicts code comment)
   DELETE FROM role_scopes 
   WHERE role = 'server' AND scope = 'tables:manage';
   
   -- Verify server has exactly 6 scopes
   SELECT COUNT(*) FROM role_scopes WHERE role = 'server';
   -- Should be 6, not 7
   ```

6. **Add Missing Role Scopes:**
   - Add complete scope lists for all roles (cashier, expo, kiosk_demo, customer, owner)
   - Update 20251029 migration to include all roles, not just server/kitchen

7. **Update Documentation:**
   - Update RBAC comment if procedures changed
   - Document the conflict between code and migrations
   - Add schema validation to CI/CD

---

## CODE REFERENCES

### RBAC File Location:
`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts`

**Key sections:**
- Lines 12-41: ApiScope enum definitions
- Lines 43-102: Dual-source architecture explanation and sync procedure
- Lines 103-181: ROLE_SCOPES constant with all role definitions

### Prisma Schema Location:
`/Users/mikeyoung/CODING/rebuild-6.0/prisma/schema.prisma`

**Key sections:**
- Lines 403-409: api_scopes model (uses `scope` column as @id)
- Lines 595-604: role_scopes model (composite key on [role, scope])

### Migration Files:
- `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/20251013_emergency_kiosk_demo_scopes.sql` (PROBLEMATIC - uses scope_name)
- `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/20251018_add_customer_role_scopes.sql` (PROBLEMATIC - uses scope_name)
- `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql` (CORRECT - uses scope, but incomplete)

---

## CONCLUSION

**Current Status:** DATABASE AND CODE ARE OUT OF SYNC

**Root Causes:**
1. Column naming changed from `scope_name` to `scope` but not all migrations updated
2. Server role includes `tables:manage` in database but code explicitly removed it
3. Missing comprehensive role scope migration (only server/kitchen in 20251029)
4. No automated verification or sync mechanism

**Risk Level:** HIGH
- API authorization may fail silently if JWT scopes don't match expectations
- Database scopes may not match code expectations
- Some roles may be missing required scopes
- Some roles may have extra scopes they shouldn't have

**Next Steps:**
1. Connect to production database and query actual state
2. Create corrective migration based on actual findings
3. Implement automated sync verification in CI/CD
4. Update RBAC documentation with reconciliation details
