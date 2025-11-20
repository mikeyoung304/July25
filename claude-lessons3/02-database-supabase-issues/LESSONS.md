# Lessons: database supabase issues

> **💡 Debugging Unknown Issues?** If you're encountering an error not documented here, check the [Debugging Protocols](../00-debugging-protocols/) for systematic troubleshooting methods (HTF, EPL, CSP, DDT, PIT).

## Key Incidents

# Major Database Incidents - Detailed Reports

**Last Updated:** 2025-11-19
**Total Documented Incidents:** 6 major + 18 minor = 24 total

---

## Table of Contents
1. [Schema Drift Cascade (Oct 21-22, 2025)](#schema-drift-cascade)
2. [Migration Bifurcation (July 13 - Oct 20, 2025)](#migration-bifurcation)
3. [RPC Function Evolution Failures](#rpc-function-evolution)
4. [Timestamp Type Mismatches](#timestamp-type-mismatches)
5. [Migration Timestamp Collisions](#migration-timestamp-collisions)

---

<a id="schema-drift-cascade"></a>
## Schema Drift Cascade (Oct 21-22, 2025)

### Overview
- **Classification:** P0 - Complete production outage
- **Total Duration:** 4.5 hours (3 cascading incidents)
- **Business Impact:** ~$67,500 in lost revenue
- **Root Cause:** Migrations committed to git but never deployed to production
- **Pattern:** All 3 incidents = RPC/code expects schema that doesn't exist

---

### Incident #1: Missing tax_rate Column

**Timeline:**
```
Oct 21 19:00  User tests ServerView on production Vercel
Oct 21 19:05  All order submissions fail with 403/500 errors
Oct 21 19:30  Investigation discovers schema drift
Oct 21 20:00  Emergency migration deployment via psql
Oct 21 21:00  Import path errors fixed, code redeployed
Oct 21 22:00  Incident resolved, production functional
```

**Duration:** 3 hours
**Impact:** $45,000 estimated lost revenue (peak dinner service)

#### Error Messages
```
PostgreSQL Error:
ERROR: 42703: column "tax_rate" does not exist
LINE 42: SELECT tax_rate FROM restaurants WHERE id = $1
```

```
API Response:
{
  "error": "Internal server error",
  "message": "Database query failed",
  "code": 500
}
```

#### Root Cause Analysis

**What Happened:**
1. **Oct 19:** Developer created migration `20251019180000_add_tax_rate_to_restaurants.sql`
2. Developer committed migration to git
3. Developer pushed to GitHub
4. **MISSING STEP:** Never ran `supabase db push --linked` to deploy to production
5. **Oct 21:** Code deployed expecting `tax_rate` column
6. Production database didn't have column → 500 errors

**Why It Happened:**
- Conflicting documentation: Old guide said migrations "reference only"
- No deployment checklist enforcing migration deployment
- No CI/CD step to deploy migrations automatically
- Developer tested locally (where migration was applied) but not production

#### The Missing Migration

```sql
-- File: supabase/migrations/20251019180000_add_tax_rate_to_restaurants.sql
-- Status: Committed to git Oct 19, deployed to production Oct 21 (48 hour lag)

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(4,4) DEFAULT 0.0825;

COMMENT ON COLUMN restaurants.tax_rate IS
'Sales tax rate for this restaurant (e.g. 0.0825 = 8.25%)';

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'restaurants' AND column_name = 'tax_rate'
  ) THEN
    RAISE EXCEPTION 'Migration failed: tax_rate column not created';
  END IF;
  RAISE NOTICE 'Migration successful: tax_rate column added';
END $$;
```

#### Code That Failed

```typescript
// server/src/services/orders.service.ts:84
const restaurant = await this.prisma.restaurants.findUnique({
  where: { id: restaurantId },
  select: { tax_rate: true }  // ← Column doesn't exist in production!
});

const taxRate = restaurant?.tax_rate ?? 0.08;  // Fallback never reached
```

**Why Fallback Didn't Help:**
- Query fails BEFORE reaching fallback logic
- PostgreSQL returns error 42703
- Express error handler catches, returns 500 to client

#### Resolution Steps

```bash
# Step 1: Deploy migration directly via psql
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres" \
  -f supabase/migrations/20251019180000_add_tax_rate_to_restaurants.sql

# Output:
# ALTER TABLE
# COMMENT
# DO
# NOTICE: Migration successful: tax_rate column added

# Step 2: Verify schema updated
psql [...] -c "SELECT tax_rate FROM restaurants LIMIT 1;"
# Result: 0.0825 (default applied)

# Step 3: Fix code import paths (unrelated but discovered)
# Fixed: client/src/modules/supabase import
# Fixed: client/src/contexts/useRestaurant import

# Step 4: Deploy code fixes
git add -A && git commit -m "fix(p0): resolve schema drift..."
git push origin main

# Step 5: Verify production
curl -X POST https://api.rebuild6.com/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id":"...","items":[...]}'
# Result: 200 OK, order created successfully
```

#### Lessons Learned

1. **Migration deployment is NOT automatic** - Committing to git ≠ deployed to production
2. **Test on production-like environment** - Local dev uses different database
3. **Deployment checklist needed** - Verify migrations deployed before code deploy
4. **CI/CD gap** - Should automate migration deployment

---

### Incident #2: Missing created_at in order_status_history

**Timeline:**
```
Oct 21 23:00  User reports voice orders failing in production
Oct 21 23:05  Check Render logs: 500 errors on POST /api/v1/orders
Oct 21 23:10  Error analysis: "column created_at does not exist"
Oct 21 23:19  Create + deploy hotfix migration
Oct 21 23:20  Production testing: voice orders functional
Oct 21 23:30  Incident resolved
```

**Duration:** 30 minutes (learned from Incident #1)
**Impact:** $15,000 estimated lost revenue

#### Error Messages

```
PostgreSQL Error:
ERROR: 42703: column "created_at" of relation "order_status_history" does not exist
LINE 8: INSERT INTO order_status_history (order_id, restaurant_id, from_status, to_status, notes, created_at)
                                                                                                   ^
```

```
Render Production Logs:
2025-10-21T23:02:15.847Z [ERROR] POST /api/v1/orders
  Error: Database error: column "created_at" does not exist
  Stack: at create_order_with_audit (RPC function)
  Code: 42703
```

#### Root Cause Analysis

**What Happened:**
1. **Oct 19:** RPC function `create_order_with_audit` created with INSERT statement:
   ```sql
   INSERT INTO order_status_history (
     order_id, restaurant_id, from_status, to_status, notes, created_at
   ) VALUES (
     v_order_id, p_restaurant_id, NULL, p_status, 'Order created', v_created_at
   );
   ```
2. RPC migration deployed successfully
3. **MISSING:** No migration to ADD `created_at` column to `order_status_history` table
4. Table structure:
   ```sql
   CREATE TABLE order_status_history (
     id UUID PRIMARY KEY,
     order_id UUID NOT NULL,
     restaurant_id UUID NOT NULL,
     from_status TEXT,
     to_status TEXT NOT NULL,
     notes TEXT
     -- created_at column MISSING!
   );
   ```
5. Voice orders call RPC → RPC tries to INSERT into non-existent column → 500 error

**Why It Happened:**
- RPC function migration didn't validate table schema
- Assumption: `created_at` was added in earlier migration (it wasn't)
- No automated check for RPC INSERT column dependencies

#### The Hotfix Migration

```sql
-- File: supabase/migrations/20251021231910_add_created_at_to_order_status_history.sql
-- Created: Oct 21, 23:19 (10 minutes after discovery)
-- Deployed: Oct 21, 23:19 (immediately via psql)

-- Add created_at column
ALTER TABLE order_status_history
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Add comment
COMMENT ON COLUMN order_status_history.created_at IS
'Timestamp when this status change was recorded.';

-- Backfill existing records
UPDATE order_status_history
SET created_at = now()
WHERE created_at IS NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_status_history'
    AND column_name = 'created_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: created_at column not created';
  END IF;
  RAISE NOTICE 'Migration successful: created_at column added';
END $$;
```

#### Resolution

```bash
# Deployed same way as Incident #1 (psql direct)
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres" \
  -f supabase/migrations/20251021231910_add_created_at_to_order_status_history.sql

# Verified RPC function now works
psql [...] -c "SELECT * FROM create_order_with_audit(...);"
# Result: Order created successfully with audit log

# Committed migration to git
git add supabase/migrations/20251021231910_add_created_at_to_order_status_history.sql
git commit -m "fix(schema): resolve order_status_history schema drift"
git push origin main
```

#### Lessons Learned (Enhanced from Incident #1)

1. **RPC validation needed** - Before deploying RPC, check ALL referenced columns exist
2. **Migration dependency order** - Table columns MUST be deployed BEFORE RPC functions using them
3. **Faster incident response** - 30 min vs 3 hours (learned the pattern)
4. **Same root cause** - Code/RPC expects schema that doesn't exist

---

### Incident #3: VARCHAR vs TEXT Type Mismatch

**Timeline:**
```
Oct 22 03:00  All order creation failing (online, voice, server)
Oct 22 03:05  Check logs: PostgreSQL type mismatch error
Oct 22 03:10  Identify RPC function uses VARCHAR, table uses TEXT
Oct 22 03:20  Create + deploy type fix migration
Oct 22 03:30  Incident resolved
```

**Duration:** 30 minutes
**Impact:** $7,500 estimated lost revenue

#### Error Messages

```
PostgreSQL Error:
ERROR: 42804: Returned type text does not match expected type character varying in column 3
DETAIL: Type text does not match character varying.
CONTEXT: PL/pgSQL function create_order_with_audit(...) line 28 at RETURN QUERY
```

**Error Code Breakdown:**
- `42804` = datatype mismatch
- Column 3 = `order_number` in RETURNS TABLE
- RPC declared: `order_number VARCHAR`
- Table has: `order_number TEXT`

#### Root Cause Analysis

**Why VARCHAR ≠ TEXT in this context:**

PostgreSQL treats VARCHAR and TEXT identically for storage, BUT:
- In `RETURNS TABLE`, return type must EXACTLY match table column type
- No automatic casting between VARCHAR and TEXT in this context
- Type mismatch = function execution failure

**How It Happened:**
1. Original RPC used VARCHAR for string columns (common PostgreSQL practice)
2. `orders` table created with TEXT columns (Supabase default)
3. No one noticed until RPC function executed
4. RETURN QUERY tried to return TEXT as VARCHAR → error

#### The Type Fix Migration

```sql
-- File: supabase/migrations/20251022033200_fix_rpc_type_mismatch.sql

DROP FUNCTION IF EXISTS create_order_with_audit(...);

CREATE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number TEXT,      --  Changed from VARCHAR
  p_type TEXT,               --  Changed from VARCHAR
  p_status TEXT DEFAULT 'pending',
  -- ... other params
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number TEXT,         --  Changed from VARCHAR
  type TEXT,                 --  Changed from VARCHAR
  status TEXT,               --  Changed from VARCHAR
  -- ... other columns
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Function body unchanged
  RETURN QUERY SELECT ... FROM orders WHERE id = v_order_id;
END;
$$;

-- Validation checks for TEXT (not VARCHAR)
DO $$
DECLARE
  v_function_result TEXT;
BEGIN
  SELECT pg_get_function_result(oid) INTO v_function_result
  FROM pg_proc WHERE proname = 'create_order_with_audit';

  IF v_function_result LIKE '%character varying%' THEN
    RAISE EXCEPTION 'Migration failed: Function still uses VARCHAR';
  END IF;

  RAISE NOTICE 'Migration successful: RPC function uses TEXT types';
END $$;
```

#### All Columns Changed (VARCHAR → TEXT)

| Column | Old Type | New Type | Reason |
|--------|----------|----------|--------|
| order_number | VARCHAR | TEXT | Match orders.order_number |
| type | VARCHAR | TEXT | Match orders.type |
| status | VARCHAR | TEXT | Match orders.status |
| customer_name | VARCHAR | TEXT | Match orders.customer_name |
| table_number | VARCHAR | TEXT | Match orders.table_number |
| payment_status | VARCHAR | TEXT | Match orders.payment_status (added later) |
| payment_method | VARCHAR | TEXT | Match orders.payment_method (added later) |
| payment_id | VARCHAR | TEXT | Match orders.payment_id (added later) |

#### Resolution

```bash
# Same deployment pattern as previous incidents
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres" \
  -f supabase/migrations/20251022033200_fix_rpc_type_mismatch.sql

# Test all order flows
curl -X POST .../orders -d '...'  # Online orders 
# Voice orders via WebRTC 
# Server orders via API 

# All flows functional
```

#### Lessons Learned

1. **Type exactness matters** - VARCHAR ≠ TEXT in RETURNS TABLE context
2. **Verify types before deployment** - Check `\d table_name` output
3. **Use TEXT consistently** - Restaurant OS standard: TEXT for all strings
4. **3rd incident same day** - Urgency of comprehensive prevention measures

---

<a id="migration-bifurcation"></a>
## Migration Bifurcation (July 13 - Oct 20, 2025)

### Overview
- **Classification:** P1 - Deployment blocking (no active outage)
- **Duration:** 97 days diverged state, 16 days blocked deployment, 6 hours to reconcile
- **Business Impact:** P0 audit fixes delayed 16 days
- **Root Cause:** Remote migrations never pulled locally, local migrations never deployed

---

### The Fork in the Road (July 13, 2025)

**Decision Point:**
```sql
-- File: supabase/migrations/20250713130722_remote_schema.sql
-- Content: Empty (placeholder migration)

-- This migration marks transition to "cloud-first" workflow
-- From this point: Schema changes via Supabase Dashboard UI
```

**What Should Have Happened:**
1. Make schema changes in Supabase Dashboard
2. Run `supabase db pull` to get migration SQL
3. Commit migrations to git
4. Deploy to other environments

**What Actually Happened:**
1. Made schema changes in Supabase Dashboard (11 migrations)
2. Never ran `supabase db pull`
3. Never committed to git
4. Meanwhile, created local migrations (10) never deployed

**Result: Parallel Timelines**

```
July 13: Reset Point (20250713130722_remote_schema.sql)
         │
         ├── TIMELINE A: Remote Database (Production)
         │   ├── 20250730094240 (Dashboard)
         │   ├── 20250730094405 (Dashboard)
         │   ├── 20250730121121 (Dashboard)
         │   ├── ... 8 more Dashboard migrations
         │   └── [Used by production for 97 days]
         │
         └── TIMELINE B: Local Git Repository
             ├── 20250130_auth_tables (never deployed)
             ├── 20250201_payment_audit_logs (never deployed)
             ├── 20251013_emergency_kiosk_demo_scopes (never deployed)
             ├── ... 7 more local migrations
             └── [Committed but never reached production]
```

---

### Discovery (Oct 20, 2025)

**Trigger:** Investigating ORDER_FAILURE_INCIDENT_REPORT.md

**Initial Symptom:**
```sql
SELECT tax_rate FROM restaurants WHERE id = '...';
-- ERROR: 42703: column "tax_rate" does not exist
```

**Initial Assumption (WRONG):**
> "The migration file must be buggy or have syntax errors."

**Investigation Led To:**

```bash
$ ls supabase/migrations/ | grep tax_rate
20251019_add_tax_rate_to_restaurants.sql  #  File exists

$ supabase migration list --linked
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20250713130722 | 20250713130722 | 2025-07-13 13:07:22
   20250130       |                |  ← LOCAL ONLY
   20250201       |                |  ← LOCAL ONLY
                  | 20250730094240 |  ← REMOTE ONLY
                  | 20250730094405 |  ← REMOTE ONLY
                  | ... (9 more remote-only)
   20251013       |                |  ← LOCAL ONLY
   20251014       |                |  ← LOCAL ONLY
   ... (6 more local-only October migrations)
```

**Realization:**
> "We have TWO migration histories that diverged 97 days ago."

---

### Reconciliation Strategy (16 Days to Execute)

#### Phase 1: Understand What Exists (Oct 20, Day 1)

```bash
# Remote migrations (in production, not in git):
20250730094240 - Unknown (Dashboard UI, no documentation)
20250730094405 - Unknown (Dashboard UI, no documentation)
... 9 more unknown remote migrations

# Local migrations (in git, not in production):
20250130_auth_tables.sql - Auth tables (user_pins, api_scopes, role_scopes)
20250201_payment_audit_logs.sql - Payment audit logging
... 8 more October P0 audit migrations
```

**Challenge:** How to merge without destroying either timeline?

#### Phase 2: Archive Conflicting Local Migrations (Oct 20, Day 1)

**Decision:** Remote migrations are superior (already battle-tested in production)

```bash
$ mkdir -p supabase/migrations/.archive

# Archive superseded auth migration
$ mv supabase/migrations/20250130_auth_tables.sql \
     supabase/migrations/.archive/

# Archive optional payment audit feature
$ mv supabase/migrations/20250201_payment_audit_logs.sql \
     supabase/migrations/.archive/

# Document why archived
$ cat supabase/migrations/.archive/README.md
```

**Archive Documentation:**
```markdown
## 20250130_auth_tables.sql
Status: SUPERSEDED by remote Sept 4 auth migrations
Remote equivalent: 20250904121523 through 20250904121834
Why archived: Remote has superior implementation with:
- Composite unique constraint (user_id, restaurant_id)
- is_member_of_restaurant() RLS function
- More mature auth system

## 20250201_payment_audit_logs.sql
Status: OPTIONAL FEATURE, not deployed
Why archived: Feature not used in production
Can restore: Yes, if payment audit logging needed
```

#### Phase 3: Mark Remote Migrations as "Handled" (Oct 20, Day 2-3)

**Problem:** Supabase requires all migrations in `schema_migrations` to exist as local files

**Solution:** Mark remote migrations as "reverted" (tells Supabase to ignore)

```bash
$ supabase migration repair --status reverted 20250730094240
$ supabase migration repair --status reverted 20250730094405
$ supabase migration repair --status reverted 20250730121121
... (repeat for all 11 remote migrations)

# Verify
$ supabase migration list --linked
# Remote-only migrations should now be gone from the list
```

#### Phase 4: Fix Schema Compatibility (Oct 20, Day 4-7)

**Problem:** Local migrations expect different schema than what's in production

**Example:**
```sql
-- Local migration expects:
INSERT INTO api_scopes (scope_name, description) VALUES (...)

-- Remote schema has:
api_scopes (
  scope TEXT PRIMARY KEY,  -- Not "scope_name"
  description TEXT
)
```

**Fix:** Update local migrations to match remote schema

```sql
-- File: 20251013_emergency_kiosk_demo_scopes.sql
-- BEFORE:
INSERT INTO api_scopes (scope_name, description) VALUES (...)

-- AFTER:
INSERT INTO api_scopes (scope, description) VALUES (...)
```

**Other Schema Differences Found:**
- `api_scopes.scope` (not `scope_name`)
- `user_pins` composite unique on `(user_id, restaurant_id)` (not just `user_id`)
- `role_scopes` table structure more complex than local expected

#### Phase 5: Timestamp Collision Resolution (Oct 20, Day 8-12)

**Problem:** 4 October migrations used same timestamp

```
20251019_add_tax_rate_to_restaurants.sql
20251019_add_create_order_with_audit_rpc.sql
20251019_add_version_to_orders.sql
20251019_add_batch_update_tables_rpc.sql
```

**Why This Fails:**
```sql
-- schema_migrations table:
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY  -- Must be unique!
);

-- All 4 migrations try to insert '20251019' → duplicate key error
```

**Fix:** Rename with unique 14-digit timestamps

```bash
# Use git log to find actual creation times
$ git log --format="%H %aI" --name-only | grep 20251019

# Rename based on actual creation times
$ mv 20251019_add_tax_rate_to_restaurants.sql \
     20251019180000_add_tax_rate_to_restaurants.sql  # 6:00 PM

$ mv 20251019_add_create_order_with_audit_rpc.sql \
     20251019180800_add_create_order_with_audit_rpc.sql  # 6:08 PM

$ mv 20251019_add_version_to_orders.sql \
     20251019183600_add_version_to_orders.sql  # 6:36 PM

$ mv 20251019_add_batch_update_tables_rpc.sql \
     20251019202700_add_batch_update_tables_rpc.sql  # 8:27 PM
```

#### Phase 6: Deployment (Oct 20, Day 13-16)

```bash
# Pre-deployment check
$ supabase migration list --linked
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20250713130722 | 20250713130722 | 2025-07-13 13:07:22
   20251013       |                | ← Ready to deploy
   20251014       |                | ← Ready to deploy
   20251015       |                | ← Ready to deploy
   20251018       |                | ← Ready to deploy
   20251019180000 |                | ← Ready to deploy
   20251019180800 |                | ← Ready to deploy
   20251019183600 |                | ← Ready to deploy
   20251019202700 |                | ← Ready to deploy

# Deploy all October migrations
$ echo "Y" | supabase db push --linked

Applying migration 20251013...
NOTICE: Migration successful

Applying migration 20251014...
NOTICE: Migration successful

... (all 8 October migrations deployed)

Finished supabase db push.

# Verify alignment
$ supabase migration list --linked
   Local          | Remote         | Time (UTC)
  ----------------|----------------|---------------------
   20250713130722 | 20250713130722 | 2025-07-13 13:07:22
   20251013       | 20251013       | 2025-10-13 00:00:00 
   20251014       | 20251014       | 2025-10-14 00:00:00 
   ... (all aligned)
```

---

### Lessons Learned from Bifurcation

1. **Remote database is reality** - Git is documentation, database is truth
2. **`supabase db pull` is mandatory** - After ANY Dashboard change
3. **Migration list check** - Should be in deployment checklist
4. **Document workflow transitions** - "Cloud-first" decision was never documented
5. **97 days is too long** - Should have detected within days, not months

---

<a id="rpc-function-evolution"></a>
## RPC Function Evolution Failures

### create_order_with_audit: 6 Fixes in 17 Days

#### Failure #1: Missing version Column (Oct 20)
**File:** 20251020221553_fix_create_order_with_audit_version.sql
**Error:** Orders returned without `version` field
**Impact:** Optimistic locking broken, concurrent updates not detected
**Fix:** Added `version INTEGER` to RETURNS TABLE and SELECT

#### Failure #2: Still VARCHAR Types (Oct 22)
**File:** 20251022033200_fix_rpc_type_mismatch.sql
**Error:** 42804 - VARCHAR vs TEXT mismatch
**Impact:** ALL order creation failing
**Fix:** Changed all VARCHAR → TEXT in RETURNS TABLE

#### Failure #3: Missing seat_number (Oct 29)
**File:** 20251029150000_add_seat_number_to_create_order_rpc.sql
**Error:** Dine-in orders failed validation (missing seat_number)
**Impact:** Server orders failing
**Fix:** Added seat_number parameter and return column

#### Failure #4: Missing payment_* Fields (Oct 30)
**File:** 20251030010000_add_payment_fields_to_create_order_rpc.sql
**Error:** Online checkout orders missing payment fields
**Impact:** Payment audit logs incomplete
**Fix:** Added payment_status, payment_method, payment_amount, etc.

#### Failure #5: Consolidated Type Fix Attempt (Oct 30)
**File:** 20251030020000_fix_rpc_type_mismatch.sql
**Error:** Still had TIMESTAMPTZ vs TIMESTAMP mismatch
**Impact:** Orders with closed checks failing
**Fix:** Consolidated all TEXT fixes (incomplete)

#### Failure #6: check_closed_at Type (Nov 5)
**File:** 20251105003000_fix_check_closed_at_type.sql
**Error:** 42804 - TIMESTAMPTZ vs TIMESTAMP in column 32
**Impact:** Closed check orders failing
**Fix:** Changed check_closed_at from TIMESTAMPTZ → TIMESTAMP

### Pattern Analysis

**Every failure followed this pattern:**
1. Table schema changed (new column added)
2. RPC function not updated
3. Production code calls RPC → 500 error
4. Emergency hotfix migration

**Prevention:** RPC functions should be co-located with table changes in SAME migration

---

<a id="timestamp-type-mismatches"></a>
## Timestamp Type Mismatches

### Incident: check_closed_at Type Error (Nov 5, 2025)

**Error:**
```
ERROR: 42804: Returned type timestamp without time zone does not match
expected type timestamp with time zone in column 32
```

**Root Cause:**
```sql
-- Table definition:
CREATE TABLE orders (
  check_closed_at TIMESTAMP  -- WITHOUT time zone
);

-- RPC function:
RETURNS TABLE (
  check_closed_at TIMESTAMPTZ  -- WITH time zone
)
```

**Why It Matters:**
- TIMESTAMP = local time (no timezone info)
- TIMESTAMPTZ = UTC time with timezone conversion
- PostgreSQL treats them as incompatible types in RETURNS TABLE

**Fix:**
```sql
RETURNS TABLE (
  check_closed_at TIMESTAMP  -- Match table type exactly
)
```

### Prevention Rule

**Before deploying RPC function:**
```bash
# Check EVERY timestamp column type
psql "$DATABASE_URL" -c "
SELECT
  column_name,
  data_type,
  datetime_precision
FROM information_schema.columns
WHERE table_name = 'orders'
AND data_type LIKE '%timestamp%';
"

# Verify RPC RETURNS TABLE matches exactly
```

---

<a id="migration-timestamp-collisions"></a>
## Migration Timestamp Collisions

### Incident: Duplicate Key Error (Oct 20, 2025)

**Error:**
```
ERROR: 23505: duplicate key value violates unique constraint "schema_migrations_pkey"
DETAIL: Key (version)=(20251019) already exists.
```

**Root Cause:**
4 migrations used same 8-digit date stamp:
- `20251019_add_tax_rate_to_restaurants.sql`
- `20251019_add_create_order_with_audit_rpc.sql`
- `20251019_add_version_to_orders.sql`
- `20251019_add_batch_update_tables_rpc.sql`

**Why This Fails:**
```sql
-- schema_migrations table structure:
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,  -- Must be unique!
  statements TEXT[],
  name TEXT
);

-- First migration:
INSERT INTO schema_migrations (version) VALUES ('20251019');  -- OK

-- Second migration:
INSERT INTO schema_migrations (version) VALUES ('20251019');  -- ERROR!
```

### The Fix Process

```bash
# Step 1: Find actual creation times from git
$ git log --format="%H %aI %s" --name-only | grep 20251019
302cb9a 2025-10-21T22:11:44-04:00 fix(p0): resolve schema drift...
  supabase/migrations/20251019_add_tax_rate_to_restaurants.sql
44d1f48 2025-10-21T20:00:00-04:00 ...
  supabase/migrations/20251019_add_create_order_with_audit_rpc.sql
... (other commits)

# Step 2: Rename with unique 14-digit timestamps
$ mv 20251019_add_tax_rate_to_restaurants.sql \
     20251019180000_add_tax_rate_to_restaurants.sql

$ mv 20251019_add_create_order_with_audit_rpc.sql \
     20251019180800_add_create_order_with_audit_rpc.sql

$ mv 20251019_add_version_to_orders.sql \
     20251019183600_add_version_to_orders.sql

$ mv 20251019_add_batch_update_tables_rpc.sql \
     20251019202700_add_batch_update_tables_rpc.sql

# Step 3: Mark old timestamp as reverted
$ supabase migration repair --status reverted 20251019

# Step 4: Deploy migrations with unique timestamps
$ supabase db push --linked
# All 4 migrations now deploy successfully
```

### Prevention

**Always use 14-digit timestamps:**
```bash
# WRONG (8 digits):
TIMESTAMP=$(date +"%Y%m%d")
echo $TIMESTAMP  # 20251119

# CORRECT (14 digits):
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
echo $TIMESTAMP  # 20251119143022
```

**Add to pre-commit hook:**
```bash
# Check for 8-digit migration timestamps
if ls supabase/migrations/*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]_*.sql 2>/dev/null; then
  echo "ERROR: Migration timestamp must be 14 digits (YYYYMMDDHHmmss)"
  exit 1
fi
```

---

## Summary of All Major Incidents

| Date | Incident | Duration | Impact | Error Code | Root Cause |
|------|----------|----------|--------|------------|------------|
| Oct 21 19:00 | Missing tax_rate | 3 hrs | $45K | 42703 | Migration not deployed |
| Oct 21 23:00 | Missing created_at | 30 min | $15K | 42703 | RPC INSERT missing column |
| Oct 22 03:00 | VARCHAR vs TEXT | 30 min | $7.5K | 42804 | RPC type mismatch |
| Oct 20 | Migration bifurcation | 16 days | Blocked P0 fixes | N/A | Remote/local divergence |
| Oct 20-Nov 5 | RPC evolution | 17 days | 6 hotfixes | 42804, 42703 | Table schema changes |
| Oct 20 | Timestamp collision | Blocked deploy | Delayed 4 hours | 23505 | Non-unique versions |

**Total Business Impact:** $100,000+ (lost revenue + engineering time + customer trust)

---

## Related Documentation

- **README.md** - Executive summary and quick diagnosis
- **PREVENTION.md** - How to prevent these incidents
- **PATTERNS.md** - Deep dive on technical patterns
- **QUICK-REFERENCE.md** - Emergency response commands

---

**Maintained by:** Engineering Team
**Last Updated:** 2025-11-19
**Review:** After each new incident (to add lessons learned)


## Solution Patterns

# Database Patterns - Remote-First Architecture

**Last Updated:** 2025-11-19

---

## Table of Contents
1. [Remote-First Architecture](#remote-first-architecture)
2. [RPC Signature Sync Requirements](#rpc-signature-sync-requirements)
3. [Migration Dependency Ordering](#migration-dependency-ordering)
4. [VARCHAR vs TEXT Type Issues](#varchar-vs-text-type-issues)
5. [Timestamp Format Requirements](#timestamp-format-requirements)
6. [Idempotent Migration Patterns](#idempotent-migration-patterns)

---

## Remote-First Architecture

### The Core Principle (ADR-010)

```
┌──────────────────────────────────────────────────────┐
│  Remote Supabase Database = SINGLE SOURCE OF TRUTH   │
│                                                       │
│  Everything else is DERIVED:                         │
│  • Prisma schema (GENERATED via db pull)             │
│  • TypeScript types (GENERATED from Prisma)          │
│  • API contracts (DERIVED from types)                │
└──────────────────────────────────────────────────────┘
```

### What This Means in Practice

####  WRONG: Treating Prisma Schema as Source of Truth
```typescript
// Step 1: Edit prisma/schema.prisma
model Order {
  id String @id @default(uuid())
  version Int @default(1)  // ← Manually added
}

// Step 2: Run prisma db push
$ npx prisma db push

// Step 3: Assume database now has version column
```

**Why This Fails:**
- Prisma `db push` bypasses Supabase migration system
- No migration history recorded
- RLS policies not updated
- Triggers not created
- Next `prisma db pull` overwrites your changes

####  CORRECT: Remote-First Workflow
```bash
# Step 1: Create SQL migration file
$ TIMESTAMP=$(date +"%Y%m%d%H%M%S")
$ touch "supabase/migrations/${TIMESTAMP}_add_version_to_orders.sql"

# Step 2: Write idempotent SQL
$ cat supabase/migrations/${TIMESTAMP}_add_version_to_orders.sql
```

```sql
-- Add version column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN orders.version IS
'Optimistic locking version. Incremented on every update.';

-- Backfill existing records
UPDATE orders SET version = 1 WHERE version IS NULL;

-- Validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: version column not created';
  END IF;
  RAISE NOTICE 'Migration successful: version column added to orders';
END $$;
```

```bash
# Step 3: Deploy to remote database
$ supabase db push --linked

# Step 4: CRITICAL - Pull schema back to Prisma
$ npx prisma db pull

# Step 5: Fix @ignore attributes (known Prisma limitation)
$ ./scripts/post-migration-sync.sh

# Step 6: Verify Prisma schema updated
$ git diff prisma/schema.prisma
```

**Why This Works:**
- Migration recorded in `supabase_migrations.schema_migrations` table
- Remote database updated atomically
- Prisma schema generated from actual database state
- No risk of schema drift

---

## RPC Signature Sync Requirements

### The Dual Signature Problem

RPC functions have TWO signatures that must stay in sync:
1. **Parameters** - What calling code sends
2. **RETURNS TABLE** - What calling code expects back

**If EITHER signature drifts from actual table schema → 500 errors**

### Anatomy of RPC Function Sync

```sql
CREATE FUNCTION create_order_with_audit(
  -- SIGNATURE #1: Parameters
  -- These must match what API/client code sends
  p_restaurant_id UUID,
  p_order_number TEXT,       --  Must match orders.order_number type
  p_type TEXT,                --  Must match orders.type type
  p_status TEXT DEFAULT 'pending',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_subtotal DECIMAL DEFAULT 0,
  p_tax DECIMAL DEFAULT 0,
  p_total_amount DECIMAL DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_table_number TEXT DEFAULT NULL,
  p_seat_number INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  -- SIGNATURE #2: Return columns
  -- These must EXACTLY match orders table column types
  id UUID,
  restaurant_id UUID,
  order_number TEXT,          --  VARCHAR here = production error
  type TEXT,                  --  Must match EXACTLY
  status TEXT,
  items JSONB,
  subtotal DECIMAL,
  tax DECIMAL,
  total_amount DECIMAL,
  notes TEXT,
  customer_name TEXT,
  table_number TEXT,
  seat_number INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ,     --  TIMESTAMP here = production error
  updated_at TIMESTAMPTZ,
  version INTEGER              --  Missing this = production error
  -- ... all other columns from orders table
)
```

### The 6 RPC Failures (Oct-Nov 2025)

**Each failure = different sync issue:**

| Migration Date | Issue | Error Code | Fix |
|----------------|-------|------------|-----|
| 20251019180800 | Missing `version` in RETURNS TABLE | 500 (column not returned) | Added version to SELECT |
| 20251020221553 | Fixed version, but still VARCHAR types | 42804 | Not yet fixed |
| 20251022033200 | VARCHAR vs TEXT mismatch | 42804 | Changed all VARCHAR→TEXT |
| 20251029150000 | Added seat_number, types still wrong | 42804 | Not yet fixed |
| 20251030010000 | Added payment fields, consolidated types | 42804 | Not yet fixed |
| 20251105003000 | TIMESTAMPTZ vs TIMESTAMP | 42804 | Changed check_closed_at→TIMESTAMP |

**Pattern:** Every time orders table changed, RPC function needed update

### RPC Sync Verification Script

```bash
#!/bin/bash
# Verify RPC function signature matches table schema

FUNCTION_NAME="create_order_with_audit"
TABLE_NAME="orders"

echo "Checking RPC function: $FUNCTION_NAME"
echo "Against table: $TABLE_NAME"
echo ""

# Get table column types
echo "=== Table Column Types ==="
psql "$DATABASE_URL" -c "
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = '$TABLE_NAME'
ORDER BY ordinal_position;
"

# Get RPC function return types
echo ""
echo "=== RPC Function Return Types ==="
psql "$DATABASE_URL" -c "
SELECT
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = '$FUNCTION_NAME';
"

# Check for common mismatches
echo ""
echo "=== Common Type Mismatches to Check ==="
echo "1. VARCHAR vs TEXT (most common failure)"
echo "2. TIMESTAMPTZ vs TIMESTAMP (2nd most common)"
echo "3. Missing columns added to table after RPC creation"
```

### RPC Creation Checklist

Before deploying an RPC function that reads from a table:

```bash
# 1. Get exact table schema
psql "$DATABASE_URL" -c "\d orders"

# 2. For EVERY column in RETURNS TABLE, verify:
#    - Column exists in table 
#    - Type EXACTLY matches (not just "compatible") 
#    - NOT NULL matches 
#    - Default value handled 

# 3. Test RPC function locally first
psql "$DATABASE_URL" -c "
SELECT * FROM create_order_with_audit(
  '11111111-1111-1111-1111-111111111111'::UUID,
  'TEST-001',
  'online',
  'pending'
);
"

# 4. Check for type mismatch errors
# Look for: 42804 (type mismatch)
# Look for: 42703 (column missing)
```

---

## Migration Dependency Ordering

### The RPC-Before-Table Trap

**WRONG Order (Caused Incident #2):**
```
1. Deploy RPC function that INSERTs into order_status_history.created_at
2. (Never created created_at column in order_status_history table)
3. Production calls RPC → ERROR 42703
```

**CORRECT Order:**
```
1. Add created_at column to order_status_history table
2. Deploy table migration first
3. Then deploy RPC function that uses created_at
4. Both operations succeed
```

### Migration Ordering Rules

#### Rule 1: Table Columns Before RPC Functions

```sql
-- Migration 1: 20251019180000_add_created_at_column.sql
ALTER TABLE order_status_history
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
```

```sql
-- Migration 2: 20251019180800_add_rpc_using_created_at.sql
-- This can now safely reference created_at
CREATE FUNCTION log_order_status(...)
RETURNS void AS $$
BEGIN
  INSERT INTO order_status_history (order_id, from_status, to_status, created_at)
  VALUES (p_order_id, p_from, p_to, now());
END;
$$ LANGUAGE plpgsql;
```

#### Rule 2: Drop Dependencies Before Dropping Tables

```sql
-- Migration 1: Drop RPC functions using the table
DROP FUNCTION IF EXISTS get_order_stats;
DROP FUNCTION IF EXISTS create_order_with_audit;

-- Migration 2: Now safe to drop/modify table
DROP TABLE IF EXISTS orders;
```

#### Rule 3: Rename Columns in 3 Steps (Zero-Downtime)

```sql
-- Step 1: Add new column
ALTER TABLE orders ADD COLUMN customer_email TEXT;

-- Step 2: Backfill data + Deploy code using both columns
UPDATE orders SET customer_email = user_email WHERE customer_email IS NULL;
-- Code deployed that writes to BOTH user_email and customer_email

-- Step 3: After all traffic migrated, drop old column
ALTER TABLE orders DROP COLUMN user_email;
```

### Dependency Chain Example (Real from Restaurant OS)

**Correct deployment order for audit logging feature:**

```
20251019180000_add_tax_rate_to_restaurants.sql
  ↓ (tax_rate column exists)
20251019180800_add_create_order_with_audit_rpc.sql
  ↓ (RPC function uses tax_rate from restaurants)
20251019183600_add_version_to_orders.sql
  ↓ (version column exists)
20251020221553_fix_create_order_with_audit_version.sql
  ↓ (RPC function returns version)
20251021231910_add_created_at_to_order_status_history.sql
  ↓ (created_at column exists)
20251022033200_fix_rpc_type_mismatch.sql
  ↓ (RPC types match table types)
```

**If any step skipped or reordered → production failure**

---

## VARCHAR vs TEXT Type Issues

### The PostgreSQL Type Compatibility Trap

**What Developers Expect (WRONG):**
> "VARCHAR and TEXT are basically the same in PostgreSQL, so using either should work."

**PostgreSQL Reality:**
> "RETURNS TABLE type must EXACTLY match table column type. VARCHAR ≠ TEXT."

### Error Message Anatomy

```
ERROR: 42804: Returned type text does not match expected type character varying in column 3
CONTEXT: PL/pgSQL function create_order_with_audit(...) line 28 at RETURN QUERY
```

**Translation:**
- Column 3 of RETURNS TABLE = `order_number`
- RPC declared: `order_number VARCHAR`
- Table has: `order_number TEXT`
- PostgreSQL refuses to cast automatically in RETURNS TABLE context

### Type Mismatch Detection

```sql
-- Check what types your table actually uses
SELECT
  column_name,
  data_type,
  udt_name,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('order_number', 'type', 'status', 'customer_name', 'table_number');

-- Common results in Restaurant OS:
-- order_number:   text (not character varying)
-- type:           text
-- status:         text
-- customer_name:  text
-- table_number:   text
```

### The Fix Pattern

```sql
-- BEFORE (causes 42804 errors):
CREATE FUNCTION create_order_with_audit(
  p_order_number VARCHAR,  --  Wrong type
  p_type VARCHAR           --  Wrong type
)
RETURNS TABLE (
  order_number VARCHAR,    --  Wrong type
  type VARCHAR             --  Wrong type
)
```

```sql
-- AFTER (matches table schema):
CREATE FUNCTION create_order_with_audit(
  p_order_number TEXT,     --  Matches table
  p_type TEXT              --  Matches table
)
RETURNS TABLE (
  order_number TEXT,       --  Matches table
  type TEXT                --  Matches table
)
```

### Why Restaurant OS Uses TEXT Everywhere

**Decision:** Use `TEXT` for all string columns (no VARCHAR)

**Rationale:**
1. PostgreSQL treats TEXT and VARCHAR identically for storage/performance
2. TEXT has no length limit (no arbitrary VARCHAR(255) decisions)
3. Eliminates type mismatch errors between RPC and tables
4. Simpler mental model (one string type, not two)

**Exception:** Legacy columns in auth schema (Supabase managed)

---

## Timestamp Format Requirements

### Two Different Timestamp Issues

#### Issue 1: Migration Filename Timestamps

**WRONG (8 digits):**
```
supabase/migrations/20251019_add_feature.sql  
```

**Why It Fails:**
```sql
-- Supabase schema_migrations table:
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY  -- Must be unique!
);

-- Two migrations with same date = duplicate key error:
INSERT INTO schema_migrations VALUES ('20251019');  -- First succeeds
INSERT INTO schema_migrations VALUES ('20251019');  -- ERROR 23505: duplicate key
```

**CORRECT (14 digits):**
```
supabase/migrations/20251019143022_add_feature.sql  
supabase/migrations/20251019143100_add_other.sql    
```

**Generation:**
```bash
# Always use full timestamp with time component
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
echo "New migration: ${TIMESTAMP}_description.sql"
# Example output: 20251119143022_description.sql
```

#### Issue 2: Column Timestamp Types (TIMESTAMPTZ vs TIMESTAMP)

**Error Message:**
```
ERROR: 42804: Returned type timestamp without time zone does not match
expected type timestamp with time zone in column 32
```

**Root Cause:**
```sql
-- Table definition:
CREATE TABLE orders (
  check_closed_at TIMESTAMP  -- WITHOUT time zone
);

-- RPC function:
RETURNS TABLE (
  check_closed_at TIMESTAMPTZ  -- WITH time zone 
)
```

**The Fix:**
```sql
-- Query table schema first:
SELECT
  column_name,
  data_type,
  datetime_precision
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'check_closed_at';

-- Result: timestamp without time zone

-- Match RPC to table:
RETURNS TABLE (
  check_closed_at TIMESTAMP  -- WITHOUT time zone 
)
```

### Timestamp Type Decision Matrix

| Use Case | Type | Rationale |
|----------|------|-----------|
| Order timestamps (created_at, updated_at) | TIMESTAMPTZ | Cross-timezone ordering system |
| Scheduled events (auto_fire_time) | TIMESTAMPTZ | Restaurant may serve multiple timezones |
| Check closed (check_closed_at) | TIMESTAMP | Local restaurant time only |
| Migration versions | TEXT (YYYYMMDDHHmmss) | Unique identifier, not a date |

**Restaurant OS Standard:** Use TIMESTAMPTZ unless there's a specific reason for local time

---

## Idempotent Migration Patterns

### Why Idempotency Matters

**Scenario:** Migration partially deploys, then fails
- Without idempotency: Migration can't be re-run (error on 2nd attempt)
- With idempotency: Migration can be re-run safely

**Real Example from Oct 20 Reconciliation:**
```sql
-- NON-IDEMPOTENT (fails on re-run):
CREATE TABLE api_scopes (
  scope TEXT PRIMARY KEY
);
-- Second run: ERROR: relation "api_scopes" already exists

-- IDEMPOTENT (safe to re-run):
CREATE TABLE IF NOT EXISTS api_scopes (
  scope TEXT PRIMARY KEY
);
-- Second run: NOTICE: relation "api_scopes" already exists, skipping
```

### Idempotent Pattern Library

#### Pattern 1: CREATE TABLE
```sql
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Pattern 2: ADD COLUMN
```sql
-- Check if column exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'version'
  ) THEN
    ALTER TABLE orders ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

-- Or use simpler IF NOT EXISTS (PostgreSQL 9.6+):
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
```

#### Pattern 3: INSERT REFERENCE DATA
```sql
INSERT INTO api_scopes (scope, description) VALUES
  ('menu:read', 'View menu items'),
  ('orders:create', 'Create new orders')
ON CONFLICT (scope) DO NOTHING;  -- Key: ON CONFLICT DO NOTHING
```

#### Pattern 4: CREATE INDEX
```sql
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id
ON orders(restaurant_id);
```

#### Pattern 5: CREATE FUNCTION
```sql
-- Always use CREATE OR REPLACE for functions
CREATE OR REPLACE FUNCTION create_order_with_audit(...)
RETURNS TABLE (...) AS $$
BEGIN
  -- Function body
END;
$$ LANGUAGE plpgsql;

-- Or drop first if changing signature:
DROP FUNCTION IF EXISTS create_order_with_audit(UUID, TEXT, TEXT);
CREATE FUNCTION create_order_with_audit(...) ...
```

#### Pattern 6: UPDATE EXISTING DATA (Backfill)
```sql
-- Idempotent backfill pattern
UPDATE orders
SET version = 1
WHERE version IS NULL;  -- Key: WHERE clause prevents re-running on same rows

-- Count affected rows for validation
DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE orders SET version = 1 WHERE version IS NULL;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Backfilled % orders with version=1', v_updated;
END $$;
```

#### Pattern 7: DROP (Always Idempotent)
```sql
DROP TABLE IF EXISTS old_table;
DROP FUNCTION IF EXISTS old_function(...);
DROP INDEX IF EXISTS old_index;
```

### Complete Migration Template

```sql
-- Migration: [Description]
-- Date: YYYY-MM-DD
-- Related: Issue #XXX, ADR-XXX

-- Step 1: Create/modify table structure
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 2: Add columns to existing tables
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_version ON orders(version);

-- Step 4: Backfill existing data
UPDATE orders SET version = 1 WHERE version IS NULL;

-- Step 5: Create/update RPC functions
CREATE OR REPLACE FUNCTION get_order_stats(p_restaurant_id UUID)
RETURNS TABLE (...) AS $$
BEGIN
  -- Function body
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION get_order_stats TO authenticated;

-- Step 7: Add comments for documentation
COMMENT ON COLUMN orders.version IS
'Optimistic locking version. Incremented on every update.';

-- Step 8: Notify PostgREST to reload schema (if using PostgREST)
NOTIFY pgrst, 'reload schema';

-- Step 9: Validation block
DO $$
BEGIN
  -- Check table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'new_table'
  ) THEN
    RAISE EXCEPTION 'Migration failed: new_table not created';
  END IF;

  -- Check column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'version'
  ) THEN
    RAISE EXCEPTION 'Migration failed: version column not created';
  END IF;

  -- Check function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_order_stats'
  ) THEN
    RAISE EXCEPTION 'Migration failed: get_order_stats function not created';
  END IF;

  RAISE NOTICE 'Migration successful: [feature description]';
END $$;
```

---

## Related Documentation

- **README.md** - Executive summary, quick diagnosis
- **INCIDENTS.md** - Real incident reports demonstrating these patterns
- **PREVENTION.md** - How to apply these patterns in practice
- **/docs/SUPABASE_CONNECTION_GUIDE.md** - Complete workflow guide
- **/supabase/migrations/.template.sql** - Starter template

---

**Maintained by:** Engineering Team
**Last Updated:** 2025-11-19


## Quick Reference

# Quick Reference - Emergency Database Commands

**Last Updated:** 2025-11-19
**Use When:** Production is down RIGHT NOW

---

## Emergency Triage (First 60 Seconds)

### Check Production Logs

```bash
# Render logs (backend)
https://dashboard.render.com/web/[service-id]/logs

# Vercel logs (frontend)
https://vercel.com/[project]/deployments/[deployment-id]

# Look for these error codes:
# 42703 - column does not exist → Missing migration
# 42804 - type mismatch → RPC function wrong types
# 42P01 - relation does not exist → Table migration not deployed
# 23505 - duplicate key → Data integrity or migration timestamp collision
```

### Quick Diagnosis Commands

```bash
# 1. Check migration sync status (30 seconds)
supabase migration list --linked

# Output interpretation:
# Local | Remote | Time → GOOD: Both columns filled
# 20251119 |        | → BAD: Migration not deployed
#          | 20251119 | → BAD: Unknown remote migration

# 2. Check recent migrations (30 seconds)
supabase migration list --linked | tail -5

# 3. Check database connection (10 seconds)
psql "$DATABASE_URL" -c "SELECT 1;"

# Expected:
#  ?column?
# ----------
#         1
```

---

## Error Code Playbooks

### 42703: Column Does Not Exist

**Example Error:**
```
ERROR: 42703: column "tax_rate" of relation "restaurants" does not exist
```

**Diagnosis:**
```bash
# Check if migration file exists
ls supabase/migrations/*tax_rate*.sql

# Check if deployed to remote
supabase migration list --linked | grep tax_rate
```

**Quick Fix (5 minutes):**
```bash
# Option A: Deploy existing migration
supabase db push --linked

# Option B: Deploy via psql directly (faster)
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres" \
  -f supabase/migrations/[TIMESTAMP]_add_tax_rate.sql

# Verify
psql "$DATABASE_URL" -c "\d restaurants" | grep tax_rate
```

**Real Incident:** Oct 21, 19:00 - 3 hours (see INCIDENTS.md)

---

### 42804: Type Mismatch

**Example Error:**
```
ERROR: 42804: Returned type text does not match expected type character varying in column 3
```

**Diagnosis:**
```bash
# Get table schema
psql "$DATABASE_URL" -c "\d orders"

# Get RPC function signature
psql "$DATABASE_URL" -c "\df+ create_order_with_audit"

# Look for mismatches:
# - VARCHAR vs TEXT
# - TIMESTAMPTZ vs TIMESTAMP
# - INTEGER vs BIGINT
```

**Quick Fix (10 minutes):**
```sql
-- Create hotfix migration
cat > "supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_rpc_types.sql" << 'EOF'
DROP FUNCTION IF EXISTS create_order_with_audit(...);

CREATE FUNCTION create_order_with_audit(
  -- Change all VARCHAR → TEXT
  p_order_number TEXT,  -- Was VARCHAR
  p_type TEXT           -- Was VARCHAR
)
RETURNS TABLE (
  order_number TEXT,    -- Was VARCHAR
  type TEXT             -- Was VARCHAR
)
...
EOF

# Deploy immediately
supabase db push --linked

# Or faster via psql:
psql "$DATABASE_URL" -f supabase/migrations/[TIMESTAMP]_fix_rpc_types.sql
```

**Real Incident:** Oct 22, 03:00 - 30 minutes (see INCIDENTS.md)

---

### 42P01: Relation Does Not Exist

**Example Error:**
```
ERROR: 42P01: relation "order_status_history" does not exist
```

**Quick Fix:**
```bash
# This means table migration never deployed
# Deploy the table creation migration first:
supabase db push --linked

# If that fails, check for the specific migration:
ls supabase/migrations/*order_status_history*.sql
psql "$DATABASE_URL" -f supabase/migrations/[TIMESTAMP]_create_table.sql
```

---

### 23505: Duplicate Key

**Example Error:**
```
ERROR: 23505: duplicate key value violates unique constraint "schema_migrations_pkey"
DETAIL: Key (version)=(20251019) already exists.
```

**Cause:** Multiple migrations with same 8-digit timestamp

**Quick Fix:**
```bash
# Mark old timestamp as reverted
supabase migration repair --status reverted 20251019

# Rename migrations with unique 14-digit timestamps
mv 20251019_migration1.sql 20251019100000_migration1.sql
mv 20251019_migration2.sql 20251019100100_migration2.sql

# Deploy with unique timestamps
supabase db push --linked
```

---

## Common Production Fixes

### Deploy Missing Migration

```bash
# Fastest way (5 minutes):
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres" \
  -f supabase/migrations/[TIMESTAMP]_migration.sql

# Standard way (10 minutes):
supabase db push --linked

# Verify deployment
supabase migration list --linked | tail -3
```

### Fix RPC Type Mismatch

```bash
# 1. Get current RPC signature
psql "$DATABASE_URL" -c "
SELECT
  p.proname,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
WHERE p.proname = 'create_order_with_audit';
"

# 2. Get table schema
psql "$DATABASE_URL" -c "\d orders"

# 3. Create fix migration (change types to match table)
# See "42804: Type Mismatch" section above

# 4. Deploy fix
psql "$DATABASE_URL" -f supabase/migrations/[TIMESTAMP]_fix_types.sql
```

### Add Missing Column

```bash
# Create emergency migration
cat > "supabase/migrations/$(date +%Y%m%d%H%M%S)_add_missing_column.sql" << 'EOF'
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;

COMMENT ON COLUMN table_name.column_name IS 'Description';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'table_name' AND column_name = 'column_name'
  ) THEN
    RAISE EXCEPTION 'Migration failed: column not created';
  END IF;
  RAISE NOTICE 'Migration successful: column added';
END $$;
EOF

# Deploy immediately
psql "$DATABASE_URL" -f supabase/migrations/[TIMESTAMP]_add_missing_column.sql

# Verify
psql "$DATABASE_URL" -c "\d table_name" | grep column_name
```

---

## Rollback Procedures

### Rollback Last Migration

```bash
# WARNING: This will undo migration changes
# Data added by migration will be lost

# Step 1: Identify migration to rollback
supabase migration list --linked | tail -3
# Note the timestamp of last migration

# Step 2: Mark as reverted
supabase migration repair --status reverted [TIMESTAMP]

# Step 3: Manually undo changes
psql "$DATABASE_URL" << 'EOF'
BEGIN;

-- Drop added columns
ALTER TABLE table_name DROP COLUMN IF EXISTS new_column;

-- Drop added functions
DROP FUNCTION IF EXISTS function_name;

-- Drop added tables
DROP TABLE IF EXISTS new_table CASCADE;

COMMIT;
EOF

# Step 4: Verify rollback
psql "$DATABASE_URL" -c "\d table_name"

# Step 5: Update Prisma schema
npx prisma db pull
./scripts/post-migration-sync.sh
```

### Rollback Multiple Migrations

```bash
# If multiple related migrations need rollback:

# Step 1: Identify all migrations to rollback
supabase migration list --linked | tail -5

# Step 2: Mark all as reverted (newest to oldest)
supabase migration repair --status reverted 20251119143022
supabase migration repair --status reverted 20251119142015
supabase migration repair --status reverted 20251119141008

# Step 3: Undo changes in reverse order
# (Write SQL script undoing changes in reverse)

# Step 4: Verify and sync
npx prisma db pull
./scripts/post-migration-sync.sh
```

---

## Schema Inspection Commands

### Check Table Structure

```bash
# Full table description
psql "$DATABASE_URL" -c "\d orders"

# Just column names and types
psql "$DATABASE_URL" -c "
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
"

# Check if specific column exists
psql "$DATABASE_URL" -c "
SELECT 1
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'version';
"
# Returns "1" if exists, empty if not
```

### Check RPC Functions

```bash
# List all RPC functions
psql "$DATABASE_URL" -c "\df+"

# Check specific function
psql "$DATABASE_URL" -c "\df+ create_order_with_audit"

# Get function signature
psql "$DATABASE_URL" -c "
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS parameters,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'create_order_with_audit';
"
```

### Check Indexes

```bash
# List all indexes on table
psql "$DATABASE_URL" -c "\di+ orders*"

# Check specific index
psql "$DATABASE_URL" -c "
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'orders';
"
```

### Check Recent Migrations

```bash
# From Supabase
supabase migration list --linked

# From database directly
psql "$DATABASE_URL" -c "
SELECT
  version,
  name,
  applied_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
"
```

---

## Emergency Contacts & Resources

### Quick Links

```bash
# Supabase Dashboard
https://supabase.com/dashboard/project/xiwfhcikfdoshxwbtjxt

# Database Direct Connection (Studio)
https://supabase.com/dashboard/project/xiwfhcikfdoshxwbtjxt/editor

# Render Dashboard
https://dashboard.render.com/web/[service-id]

# Vercel Dashboard
https://vercel.com/[project]

# Incident Documentation
/Users/mikeyoung/CODING/rebuild-6.0/claude-lessons3/02-database-supabase-issues/INCIDENTS.md
```

### Environment Variables

```bash
# Production database URL
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@[host]/postgres"

# Supabase connection details
SUPABASE_DB_PASSWORD="[password]"
SUPABASE_PROJECT_REF="xiwfhcikfdoshxwbtjxt"
SUPABASE_API_URL="https://xiwfhcikfdoshxwbtjxt.supabase.co"
```

### Emergency psql Connection

```bash
# Quick connection
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres"

# Or use DATABASE_URL directly
psql "$DATABASE_URL"

# For read-only queries (safer)
psql "$DATABASE_URL" -c "SELECT * FROM orders LIMIT 1;"
```

---

## Post-Incident Checklist

After fixing production issue:

```bash
# ☐ 1. Verify production functional
curl -X POST https://api.rebuild6.com/api/v1/orders -d '...'

# ☐ 2. Update Prisma schema
npx prisma db pull
./scripts/post-migration-sync.sh

# ☐ 3. Commit emergency fixes
git add -A
git commit -m "fix(p0): [description of emergency fix]"
git push origin main

# ☐ 4. Verify migration sync
supabase migration list --linked

# ☐ 5. Monitor for 15 minutes
# Check logs for any new errors

# ☐ 6. Document incident
# Add to INCIDENTS.md with:
# - Timeline
# - Error messages
# - Fix applied
# - Prevention measures

# ☐ 7. Post-mortem (if P0 incident)
# Schedule team review within 24 hours
```

---

## Common RPC Fixes (Copy-Paste Ready)

### Fix VARCHAR → TEXT Types

```sql
-- supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_rpc_varchar_to_text.sql

DROP FUNCTION IF EXISTS create_order_with_audit(UUID, VARCHAR, VARCHAR, VARCHAR, JSONB, DECIMAL, DECIMAL, DECIMAL, TEXT, VARCHAR, VARCHAR, JSONB);

CREATE FUNCTION create_order_with_audit(
  p_restaurant_id UUID,
  p_order_number TEXT,           -- Changed from VARCHAR
  p_type TEXT,                    -- Changed from VARCHAR
  p_status TEXT DEFAULT 'pending',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_subtotal DECIMAL DEFAULT 0,
  p_tax DECIMAL DEFAULT 0,
  p_total_amount DECIMAL DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_table_number TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number TEXT,              -- Changed from VARCHAR
  type TEXT,                      -- Changed from VARCHAR
  status TEXT,                    -- Changed from VARCHAR
  -- ... rest of columns with correct types
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Function body unchanged
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_with_audit TO authenticated;
GRANT EXECUTE ON FUNCTION create_order_with_audit TO anon;
NOTIFY pgrst, 'reload schema';
```

### Fix TIMESTAMPTZ → TIMESTAMP

```sql
-- supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_timestamp_types.sql

DROP FUNCTION IF EXISTS create_order_with_audit(...);

CREATE FUNCTION create_order_with_audit(...)
RETURNS TABLE (
  created_at TIMESTAMPTZ,      -- This one uses TIMESTAMPTZ
  check_closed_at TIMESTAMP    -- This one uses TIMESTAMP (no TZ)
)
AS $$
BEGIN
  -- Function body
END;
$$;
```

### Add Missing Column to RPC Return

```sql
-- supabase/migrations/$(date +%Y%m%d%H%M%S)_add_version_to_rpc.sql

DROP FUNCTION IF EXISTS create_order_with_audit(...);

CREATE FUNCTION create_order_with_audit(...)
RETURNS TABLE (
  -- ... existing columns ...
  version INTEGER  -- ← Added missing column
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- ... existing columns ...
    o.version  -- ← Added to SELECT
  FROM orders o
  WHERE o.id = v_order_id;
END;
$$;
```

---

## When to Call for Help

### Call Immediately If:

-  Data corruption detected (orders missing/incorrect)
-  Cannot connect to database at all
-  Error rate > 50% of requests
-  Rollback made things worse
-  Unsure what migration to rollback

### Try Self-Fix First If:

-  Clear error message (42703, 42804)
-  Migration file exists but not deployed
-  RPC type mismatch (can create fix migration)
-  Error rate < 10% of requests
-  No data corruption

---

## Time Estimates

| Task | Time | Skill Level |
|------|------|-------------|
| Deploy missing migration | 5 min | Junior |
| Fix RPC type mismatch | 10 min | Mid-level |
| Rollback last migration | 15 min | Senior |
| Rollback multiple migrations | 30 min | Senior + Review |
| Fix data corruption | 1+ hours | Senior + DBA |
| Restore from backup | 2+ hours | Senior + DBA |

---

## Related Documentation

- **README.md** - Overview and metrics
- **INCIDENTS.md** - Detailed incident reports
- **PREVENTION.md** - How to prevent issues
- **AI-AGENT-GUIDE.md** - Rules for AI assistants

---

**Maintained by:** Engineering Team
**Last Updated:** 2025-11-19
**Print This:** Keep copy near on-call engineer's desk


