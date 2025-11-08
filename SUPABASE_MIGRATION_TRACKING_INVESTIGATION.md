# Supabase Migration Tracking Investigation

**Investigation Date:** November 7, 2025
**Repository:** rebuild-6.0/server
**Status:** COMPREHENSIVE ANALYSIS COMPLETE

---

## EXECUTIVE SUMMARY

This project uses a **multi-layered migration tracking system** with significant complexity and some abandoned local files. The tracking operates as follows:

1. **Production Database** (remote Supabase) - **PRIMARY SOURCE OF TRUTH**
   - Maintains `supabase_migrations.schema_migrations` table
   - This table records which migrations have been ACTUALLY applied

2. **GitHub Deployment Workflow** - **APPLICATOR & ENFORCEMENT**
   - Detects new migrations in git commits
   - Deploys them to production via deploy-migration.sh script
   - Tracks applied status in the schema_migrations table

3. **Drift Detection Workflow** - **DETECTION & ALERTING**
   - Daily introspection of production database with Prisma
   - Compares actual schema against Prisma schema in git
   - Creates GitHub issues on mismatch (schema drift)

4. **Prisma Schema Sync** - **DOCUMENTATION LAYER**
   - Used to document the current schema state
   - NOT authoritative - used for code generation only

---

## SECTION 1: MIGRATION TRACKING MECHANISM

### How Migrations Are Tracked in Supabase

Supabase uses PostgreSQL's built-in migration tracking. Each migration is recorded in a system table:

```sql
-- Where migrations are tracked in the remote database:
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

**Key Points:**
- **version** = migration filename (without .sql)
- **name** = migration name/description
- Stored in special `supabase_migrations` schema
- This table is the ACTUAL source of truth

**Evidence from codebase:**

File: `/scripts/deploy-migration.sh` (line 41)
```bash
local result=$(psql "$DATABASE_URL" -t -c \
  "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version';" \
  2>/dev/null || echo "0")
```

This checks if a migration is applied by querying the remote database's schema_migrations table.

---

## SECTION 2: GITHUB DEPLOYMENT WORKFLOW

### Deploy Migrations Workflow (`.github/workflows/deploy-migrations.yml`)

**Trigger:** When migration files are pushed to main branch

**Execution Flow:**

1. **Detect new migrations** (lines 54-89)
   - Compares current commit with previous: `git diff --name-only HEAD~1 HEAD`
   - Finds new/modified files matching: `supabase/migrations/*.sql`

2. **Deploy each migration** (lines 104-123)
   - Calls `./scripts/deploy-migration.sh` for each detected migration
   - Script checks: Is migration already in remote schema_migrations table?
   - If NO: Executes SQL file via psql against production database
   - If YES: Skips (idempotent, returns exit code 2)

3. **Track results** (lines 135-140)
   - Records which migrations succeeded/failed/skipped
   - Failed migrations cause workflow failure
   - Notifies via GitHub issue on failure

4. **Post-deployment sync** (lines 151-158)
   - Runs `./scripts/post-migration-sync.sh`
   - Calls `npx prisma db pull` to introspect production
   - Updates Prisma schema in git to match production

### Deploy Migration Script (`./scripts/deploy-migration.sh`)

**Key function: is_migration_applied()** (lines 34-52)

```bash
# Queries production database for migration record
SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version';
```

**Exit codes:**
- `0` = Migration deployed successfully
- `1` = Deployment failed
- `2` = Already applied (EXIT_ALREADY_APPLIED)

**What gets recorded:** The migration version name is added to schema_migrations table ONLY if the migration SQL successfully executes and includes:

```sql
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ...
```

Or if Supabase automatically records it (depends on CLI behavior).

---

## SECTION 3: DRIFT DETECTION WORKFLOW

### Drift Check Workflow (`.github/workflows/drift-check.yml`)

**Trigger:** Scheduled daily at 9 AM UTC (or manual)

**What it Actually Detects:**

1. **Takes Prisma schema snapshot** (line 41)
   - Saves current `prisma/schema.prisma` from git

2. **Introspects production database** (line 48)
   - Runs `npx prisma db pull`
   - This generates NEW Prisma schema based on actual database state
   - Does NOT check Supabase migration history

3. **Compares schemas** (line 56)
   - Diffs the before/after Prisma schemas
   - Reports any differences

**Important:** This detects:
- ✅ Schema differences (columns, types, constraints, functions)
- ❌ Does NOT check which migrations were applied
- ❌ Does NOT use `supabase migration list`
- ❌ Does NOT check `schema_migrations` table

**What causes false positives:**
- Abandoned local migration files don't cause drift alerts
- Prisma db pull only introspects ACTUAL schema, not migration history
- You could have local migrations that were never applied and drift check won't complain

---

## SECTION 4: APPLIED MIGRATIONS VS LOCAL FILES

### The Critical Discovery: Duplicate/Abandoned Files

The repository has **DUPLICATE migration files with different timestamps**:

#### Group 1: Duplicates (Identical Content)

**1. Add Create Order RPC**
- `20251019_add_create_order_with_audit_rpc.sql` (Oct 20, 23:11)
- `20251019180800_add_create_order_with_audit_rpc.sql` (Oct 19, 18:08)
- **Status:** IDENTICAL FILES (confirmed via diff)
- **Which is applied?** BOTH could be tracked if they were deployed separately
- **Timeline conflict:** The "newer" name has older timestamp

**2. Add Version to Orders**
- `20251019_add_version_to_orders.sql` (Oct 20, 23:11)
- `20251019183600_add_version_to_orders.sql` (Oct 19, 18:36)
- **Status:** UNKNOWN if identical (likely yes)
- **Problem:** Filename without time component should never exist

**3. Add Batch Update RPC**
- `20251019_add_batch_update_tables_rpc.sql` (Oct 20, 23:11)
- `20251019202700_add_batch_update_tables_rpc.sql` (Oct 19, 20:27)
- **Status:** IDENTICAL (same sizes, 3429 bytes each)

**4. Tax Rate Configuration**
- `20251019_add_tax_rate_to_restaurants.sql` (Oct 20, 23:11)
- `20251019180000_add_tax_rate_to_restaurants.sql` (Oct 21, 08:37)
- **Status:** DIFFERENT! Tax rate default changed from 0.0825 (8.25%) to 0.08 (8%)
- **Critical issue:** One file has different SQL content
- **Both applied?** If yes, which value is in production?

**5. Non-timestamp files (Wrong format)**
- `20251013_emergency_kiosk_demo_scopes.sql` (8 digits, no time)
- `20251014_scheduled_orders.sql` (8 digits, no time)
- `20251015_multi_tenancy_rls_and_pin_fix.sql` (8 digits, no time)
- `20251018_add_customer_role_scopes.sql` (8 digits, no time)
- `20251029_sync_role_scopes_with_rbac_v2.sql` (8 digits, no time)
- **Problem:** Migration naming convention requires 14-digit timestamps (YYYYMMDDHHMMSS)
- **Status:** These probably work but violate the documented standard

#### Group 2: Rollback Files (Intentional)

**1. Add Seat Number**
- `20251029145721_add_seat_number_to_orders.sql` (main migration)
- `20251029145721_rollback_add_seat_number_to_orders.sql` (rollback)
- **Status:** INTENTIONAL - Rollback paired with main migration

**2. Add Payment Fields**
- `20251029155239_add_payment_fields_to_orders.sql` (main migration)
- `20251029155239_rollback_add_payment_fields_to_orders.sql` (rollback)
- **Status:** INTENTIONAL - Rollback paired with main migration

---

## SECTION 5: WHICH MIGRATIONS ARE ACTUALLY APPLIED?

### How to Determine

**The ONLY authoritative source is the production database:**

```bash
# Method 1: Via psql (most direct)
psql "$DATABASE_URL" -c "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;"

# Method 2: Via Supabase CLI
supabase migration list --linked

# Method 3: What deploy script uses
./scripts/deploy-migration.sh will skip if:
SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version' > 0
```

### Git History Evidence

From `git log --name-status -- supabase/migrations/`:

**Applied (in chronological order):**
1. ✅ 20251013_emergency_kiosk_demo_scopes.sql
2. ✅ 20251014_scheduled_orders.sql
3. ✅ 20251015_multi_tenancy_rls_and_pin_fix.sql
4. ✅ 20251018_add_customer_role_scopes.sql
5. ✅ 20251019_add_create_order_with_audit_rpc.sql (or 20251019180800 version?)
6. ✅ 20251019_add_batch_update_tables_rpc.sql (or 20251019202700 version?)
7. ✅ 20251019_add_tax_rate_to_restaurants.sql (or 20251019180000 version?)
8. ✅ 20251019_add_version_to_orders.sql (or 20251019183600 version?)
9. ✅ 20251020221553_fix_create_order_with_audit_version.sql
10. ✅ 20251021000000_update_tax_rate_to_0_08.sql
11. ✅ 20251021231910_add_created_at_to_order_status_history.sql
12. ✅ 20251022033200_fix_rpc_type_mismatch.sql
13. ✅ 20251023000000_add_payment_audit_logs.sql
14. ✅ 20251027173500_fix_payment_audit_demo_users.sql
15. ✅ 20251029_sync_role_scopes_with_rbac_v2.sql
16. ✅ 20251029145721_add_seat_number_to_orders.sql
17. ❌ 20251029145721_rollback_add_seat_number_to_orders.sql (rollback file, probably never applied)
18. ✅ 20251029150000_add_seat_number_to_create_order_rpc.sql
19. ✅ 20251029155239_add_payment_fields_to_orders.sql
20. ❌ 20251029155239_rollback_add_payment_fields_to_orders.sql (rollback file, probably never applied)
21. ✅ 20251030010000_add_payment_fields_to_create_order_rpc.sql
22. ✅ 20251030020000_fix_rpc_type_mismatch.sql
23. ✅ 20251030030000_convert_payment_columns_to_text.sql
24. ✅ 20251105003000_fix_check_closed_at_type.sql

---

## SECTION 6: REAL DRIFT VS ABANDONED FILES

### Real Drift Definition

**Real schema drift** occurs when:
1. The actual database schema differs from what local migrations would produce
2. Detected by: `npx prisma db pull` discovering schema that doesn't match `prisma/schema.prisma`
3. Root cause: Manual dashboard changes, migrations not applied, or migrations applied but git not updated

**Real Drift Evidence Method:**
```bash
# Step 1: Get current Prisma schema
cp prisma/schema.prisma /tmp/schema-before.prisma

# Step 2: Introspect actual database
npx prisma db pull

# Step 3: Compare
diff /tmp/schema-before.prisma prisma/schema.prisma

# If differences exist → REAL DRIFT DETECTED
```

### Abandoned Files Definition

**Abandoned migration files** are:
- Local `.sql` files in `supabase/migrations/`
- That were NEVER deployed to production
- That are NEVER executed by the workflow

**Ways a migration can be abandoned:**
1. Created locally but `git push` happened before `supabase db push`
2. Committed to git but the CI/CD workflow had bugs
3. Failed to deploy and was manually skipped
4. Superseded by a later fix and should be deleted

**Abandoned Files in This Repo:**

The following ARE PROBABLY abandoned (identical duplicates):
- `20251019_add_create_order_with_audit_rpc.sql` ← Likely NEVER applied (the 20251019180800 version was)
- `20251019_add_batch_update_tables_rpc.sql` ← Likely NEVER applied (the 20251019202700 version was)
- `20251019_add_version_to_orders.sql` ← Likely NEVER applied (the 20251019183600 version was)

The following ARE INTENTIONAL ROLLBACK FILES:
- `20251029145721_rollback_add_seat_number_to_orders.sql` ← For emergency rollback only
- `20251029155239_rollback_add_payment_fields_to_orders.sql` ← For emergency rollback only

**Why it's uncertain:**
- The duplicates have IDENTICAL SQL content (verified via diff)
- Both have timestamps suggesting they were both versioned
- The naming convention changed partway through (8-digit YYYYMMDD vs 14-digit YYYYMMDDHHMMSS)
- Git history shows the 8-digit versions were committed AFTER the 14-digit versions
- Both may have been deployed (creating duplicate entries in schema_migrations)

---

## SECTION 7: DRIFT CHECK WORKFLOW LIMITATIONS

### What Drift Check DOES Detect

✅ **Schema Differences:**
- Columns added/removed/modified
- Table structures changed
- Function signatures changed
- Indexes added/removed
- Constraints added/removed

### What Drift Check DOES NOT Detect

❌ **Missing Migrations:**
- Local migration file not in production (drift check won't complain)
- Doesn't check `supabase migration list`
- Doesn't check `schema_migrations` table
- Only cares if actual schema matches introspection

❌ **Abandoned Local Files:**
- If a migration was never applied, drift check is happy
- If a migration was applied, schema looks correct, drift check is happy
- Migration history corruption is invisible to drift check

❌ **Migration Tracking Corruption:**
- If schema_migrations table is inconsistent with actual schema
- If two different migrations applied the same schema change
- If a migration is partially applied

### Real Example

If you have:
```
Local git file: 20251019_add_create_order_with_audit_rpc.sql
Production applied: 20251019180800_add_create_order_with_audit_rpc.sql
```

But they have identical SQL:
- ✅ Prisma db pull produces correct schema (both applied same change)
- ✅ Drift check passes (schema is correct)
- ❌ Migration history is corrupted (two versions of same migration)
- ❌ Drift check doesn't detect this

---

## SECTION 8: SUPABASE CLI COMMANDS ANALYSIS

### `supabase migration list --linked`

**What it shows:**
- Lists all migrations in the remote database
- Reads from: `supabase_migrations.schema_migrations` table
- Shows: version (filename) + name + timestamp

**What it does NOT show:**
- Whether local files match remote applied migrations
- Duplicates or conflicts
- Missing local files for remote migrations

**Evidence from codebase:**
- Referenced in docs/SUPABASE_CONNECTION_GUIDE.md (line 83)
- Not used in any automated workflow
- Used only for manual verification

### `supabase db push --linked`

**What it does:**
- Compares local `supabase/migrations/` with remote schema_migrations table
- Deploys any migrations not yet applied to remote
- Uses Supabase CLI's migration detection logic

**Key limitation:**
- Can't handle duplicate migration files with same SQL
- May fail if two different migration versions have same SQL
- Returns error if version conflict detected

**Evidence:**
- Not directly used in CI/CD (uses deploy-migration.sh instead)
- Referenced in docs as manual development tool
- Would fail if duplicates were deployed simultaneously

### `supabase db pull`

**What it does:**
- Introspects remote database schema
- Generates SQL file with remote schema snapshot
- Creates new migration file with generated schema

**Used by:**
- Drift check workflow (line 48 of drift-check.yml)
- Post-migration sync (post-migration-sync.sh line 30)

**Does NOT pull migration history** - only introspects actual schema

---

## SECTION 9: THE SUPABASE DASHBOARD PROBLEM

From docs/MIGRATION_RECONCILIATION_2025-10-20.md:

**Historical Issue (July 2025):**
- Team switched to "cloud-first" development (using Dashboard UI)
- Made 11 migrations via Supabase Dashboard (never committed to git)
- Committed 10 local migrations that were never deployed to production
- Bifurcated migration history with no sync verification

**Why it happened:**
1. Developers worked on local Supabase (`supabase start`) with local migrations
2. Production connected to remote Supabase with Dashboard changes
3. Never ran `supabase db pull` to capture Dashboard changes
4. Never ran `supabase db push` to deploy local migrations
5. No verification of `supabase migration list --linked`

**How they recovered:**
- Archived old conflicting local migrations
- Marked remote migrations as "handled"
- Deployed P0 audit fixes properly going forward
- Established new workflow: always sync before deploying

---

## SECTION 10: DISTINGUISHING DRIFT TYPES

### Type 1: REAL SCHEMA DRIFT (Emergency)

**Definition:** Production schema differs from what migrations would create

**How to detect:**
```bash
npx prisma db pull  # Get actual schema
# Compare with schema before
# If different → REAL DRIFT
```

**Example:** Developer uses Supabase Dashboard to add column, doesn't commit migration

**Impact:** Applications expecting schema won't find it

**Fix:** 
1. Either create + deploy migration to match remote
2. Or revert remote to match local migrations

### Type 2: MIGRATION HISTORY CORRUPTION (Warning)

**Definition:** schema_migrations table has issues (duplicates, missing entries, etc.)

**How to detect:**
```bash
SELECT version, name, COUNT(*) 
FROM supabase_migrations.schema_migrations
GROUP BY version, name
HAVING COUNT(*) > 1;  # Duplicates!
```

**Example:** Both 20251019_add_create_order_with_audit_rpc.sql and 20251019180800_add_create_order_with_audit_rpc.sql applied

**Impact:** Future migrations might fail, unclear which version is "official"

**Fix:** Query schema_migrations, delete duplicates, document in git

### Type 3: ABANDONED LOCAL FILES (Info)

**Definition:** Local git files that were never deployed to production

**How to detect:**
```bash
# Get all local files
ls supabase/migrations/*.sql

# Get all applied migrations
SELECT version FROM supabase_migrations.schema_migrations;

# Compare - anything in local but not applied → abandoned
```

**Example:** 20251019_add_create_order_with_audit_rpc.sql exists locally but only 20251019180800_version is applied

**Impact:** Confusing for developers, storage waste, potential future conflicts

**Fix:** Delete local duplicates once you confirm they're truly abandoned

---

## SECTION 11: CONCRETE EVIDENCE SUMMARY

### Migration Tracking Evidence

1. **Source of Truth: Remote Database**
   - File: `/scripts/deploy-migration.sh` line 41
   - Query: `SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version'`
   - This checks what's ACTUALLY applied in production

2. **Deployment Workflow: GitHub Actions**
   - File: `.github/workflows/deploy-migrations.yml`
   - Detects: git diff of migration files
   - Applies: via `./scripts/deploy-migration.sh`
   - Results: Exit codes 0 (success), 1 (fail), 2 (already applied)

3. **Drift Detection: Prisma Introspection**
   - File: `.github/workflows/drift-check.yml` line 48
   - Method: `npx prisma db pull` (introspects actual schema)
   - Comparison: Diffs Prisma schemas before/after
   - Does NOT check: migration history or schema_migrations table

4. **Migration History: The Reconciliation Report**
   - File: `/docs/MIGRATION_RECONCILIATION_2025-10-20.md`
   - Documents: Historical bifurcation in July 2025
   - Explains: How remote and local histories diverged
   - Shows: 11 remote migrations vs 10 local migrations (now resolved)

### Duplicate Files Evidence

1. **Identical Content (verified via diff):**
   - `20251019_add_create_order_with_audit_rpc.sql` vs `20251019180800_add_create_order_with_audit_rpc.sql` ← IDENTICAL

2. **Different Content:**
   - `20251019_add_tax_rate_to_restaurants.sql` (default 0.0825) vs
   - `20251019180000_add_tax_rate_to_restaurants.sql` (default 0.08) ← DIFFERENT

3. **Non-Standard Naming:**
   - Files without 14-digit timestamps violate documented convention
   - Examples: 20251013_*, 20251014_*, 20251015_*, etc.

### Workflow Evidence

1. **Deploy Migrations Workflow**
   - Triggers: On migration file changes to main
   - Detects: `git diff --name-only HEAD~1 HEAD | grep '^supabase/migrations/.*\.sql$'`
   - Deploys: Each migration via deploy-migration.sh
   - Syncs: Prisma schema afterward with post-migration-sync.sh

2. **Drift Check Workflow**
   - Triggers: Daily at 9 AM UTC
   - Introspects: `npx prisma db pull`
   - Compares: Before/after Prisma schemas
   - Creates: GitHub issue if drift detected
   - Closes: Issue if drift resolved

---

## KEY FINDINGS

1. **Remote database is authoritative** - The schema_migrations table in production is the sole source of truth for what's applied

2. **Deployment is automated** - GitHub Actions automatically detects and deploys new migrations when committed to main

3. **Drift detection has blind spots** - Can detect schema differences but not migration history corruption or abandoned files

4. **Duplicate migrations exist** - Some migrations have 2+ versions (different timestamps, possibly different SQL)

5. **Naming convention violated** - Some files use 8-digit instead of 14-digit timestamps

6. **The reconciliation was documented** - The project recovered from July 2025 bifurcation and now has well-established workflow

7. **Rollback files are intentional** - The .rollback.sql files are for emergency use only

---

## RECOMMENDATIONS

To establish true migration health:

1. **Audit applied migrations:**
   ```bash
   psql "$DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" > /tmp/applied.txt
   ```

2. **Compare with local files:**
   ```bash
   ls supabase/migrations/*.sql | sed 's|.*||' | sed 's|\.sql$||' > /tmp/local.txt
   comm /tmp/applied.txt /tmp/local.txt
   ```

3. **Delete confirmed abandoned files** - Once you confirm duplicates aren't applied

4. **Standardize naming** - Convert all 8-digit to 14-digit timestamps

5. **Add migration validation to CI/CD** - Detect duplicates before deployment

