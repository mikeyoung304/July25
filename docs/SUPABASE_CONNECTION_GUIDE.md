# Supabase Connection Guide

**Last Updated:** 2025-10-29
**Status:** ⚠️ REFERENCE & TROUBLESHOOTING ONLY
**Audience:** Developers, DevOps, Claude Code AI

---

## ⚠️ Important: Read This First

**🤖 AI Agents:** If you're looking for deployment instructions, you want **[DEPLOYMENT.md](./how-to/operations/DEPLOYMENT.md)** instead. This document is for **troubleshooting and manual database access only**.

### Normal Workflow (What You Probably Want):
1. Test migrations locally: `./scripts/deploy-migration.sh <file>`
2. Sync Prisma: `./scripts/post-migration-sync.sh`
3. Push to main: `git push origin main`
4. CI/CD auto-deploys everything

**📖 This guide is for:**
- Manual database diagnostics
- Troubleshooting connection issues
- Running one-off queries
- Understanding connection methods
- Emergency manual operations

**🚀 For normal deployment, see:**
- [DEPLOYMENT.md](./how-to/operations/DEPLOYMENT.md) - Standard deployment workflow
- [CI_CD_WORKFLOWS.md](./how-to/development/CI_CD_WORKFLOWS.md) - CI/CD automation
- [../supabase/MIGRATION_BASELINE.md](../supabase/MIGRATION_BASELINE.md) - Migration system overview

---

## Executive Summary

This guide documents all supported methods for connecting to our Supabase instance, establishes **remote database as the single source of truth**, and provides best practices for schema management and migrations.

**Critical Principle:**
> The remote Supabase database (`xiwfhcikfdoshxwbtjxt.supabase.co`) is the **canonical source of truth** for schema state. Local migration files document the history of changes but do not define the current schema state.

---

## Table of Contents

1. [Connection Methods](#connection-methods)
2. [Source of Truth Architecture](#source-of-truth-architecture)
3. [Migration Workflow](#migration-workflow)
4. [Common Usage Patterns](#common-usage-patterns)
5. [Troubleshooting](#troubleshooting)
6. [Security Best Practices](#security-best-practices)

---

## Connection Methods

### 1. Supabase CLI (Primary Tool)

**Use for:** Migrations, schema changes, local development, project management

**Setup:**
```bash
# Install (macOS)
brew install supabase/tap/supabase

# Link to remote project
supabase link --project-ref xiwfhcikfdoshxwbtjxt

# Verify connection
supabase migration list --linked
```

**Common Commands:**
```bash
# Deploy migrations to remote
supabase db push --linked

# Pull remote schema to local
supabase db pull

# Create new migration from schema changes
supabase db diff -f <migration_name>

# Check migration status
supabase migration list --linked

# Repair migration history (advanced)
supabase migration repair --status reverted <timestamp>
```

**When to Use:**
- ✅ Deploying schema changes to production
- ✅ Creating new migrations
- ✅ Synchronizing local and remote schemas
- ✅ Managing migration history

**When NOT to Use:**
- ❌ Running one-off diagnostic queries (use psql instead)
- ❌ Bulk data exports (use pg_dump via psql instead)

---

### 2. Direct PostgreSQL Connection (psql)

**Use for:** Diagnostics, data queries, verification scripts, direct SQL execution

**Connection String (from `.env`):**
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require"
```

**Common Patterns:**

**Single Query:**
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require" \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders';"
```

**Run SQL File:**
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require" \
  -f order_verification.sql
```

**Interactive Session:**
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require"
```

**When to Use:**
- ✅ Running verification scripts (e.g., `order_verification.sql`)
- ✅ Diagnostic queries to check schema state
- ✅ One-off data queries or exports
- ✅ Testing SQL before creating migrations

**When NOT to Use:**
- ❌ Applying schema changes (use `supabase db push` instead)
- ❌ Creating new tables/functions (use migrations instead)

---

### 3. Supabase Dashboard (UI)

**URL:** https://app.supabase.com/project/xiwfhcikfdoshxwbtjxt

**Use for:** Monitoring, RLS policy management, manual data inspection, emergency fixes

**Capabilities:**
- SQL Editor (run queries directly)
- Table Editor (view/edit data)
- Database migrations (view history)
- RLS policies (create/edit)
- Functions (view/edit)
- Logs & monitoring

**When to Use:**
- ✅ Viewing real-time database metrics
- ✅ Inspecting table data via GUI
- ✅ Testing RLS policies interactively
- ✅ Emergency hotfixes (with follow-up migration)

**When NOT to Use:**
- ❌ As primary schema management tool (use CLI + migrations)
- ❌ For changes that bypass version control (create migration instead)

**IMPORTANT:** Any schema changes made via Dashboard UI should be followed by:
```bash
# Pull changes to local
supabase db pull

# Review generated migration
cat supabase/migrations/<timestamp>_remote_schema.sql

# Commit to git
git add supabase/migrations/
git commit -m "chore(db): pull schema changes from dashboard"
```

---

### 4. Application Code (Server/Client)

**Use for:** Runtime database operations from Restaurant OS application

**Server-Side Connection (Node.js):**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service role for server
)
```

**Client-Side Connection (Browser):**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY  // Anon key for client
)
```

**When to Use:**
- ✅ All application runtime database operations
- ✅ RPC function calls (e.g., `create_order_with_audit`)
- ✅ Real-time subscriptions
- ✅ File storage operations

**Security Notes:**
- Service role key bypasses RLS (server-side only, never expose to client)
- Anon key enforces RLS (safe to expose in client code)

---

## Source of Truth Architecture

### The Remote Database is Canonical

**Rule:** Remote Supabase database is the **single source of truth** for schema state.

**What This Means:**

1. **Schema State Query:** "What columns does the `orders` table have?"
   - ✅ **Authoritative Answer:** Query remote database
   - ❌ **Not Authoritative:** Inspect local migration files

2. **Migration Conflicts:** Local migration expects column that doesn't exist remotely
   - ✅ **Resolution:** Modify or archive local migration to match remote
   - ❌ **Never:** Force local migration that breaks remote schema

3. **Schema Documentation:** Documentation says table has column X, but remote doesn't
   - ✅ **Outcome:** Documentation is wrong, update it
   - ❌ **Never:** Assume remote is wrong based on docs

### Migration Files: History, Not State

**Migration files are:**
- ✅ **Change log** - Document the history of schema changes
- ✅ **Deployment scripts** - Executable instructions for applying changes
- ✅ **Version control** - Track who changed what and when

**Migration files are NOT:**
- ❌ **Schema definition** - Do not define current state
- ❌ **Always complete** - May be missing if changes made via UI
- ❌ **Always applied** - Local files may differ from remote applied set

### Prisma Schema: Generated from Remote

The Prisma schema file (`prisma/schema.prisma`) is **automatically generated from the remote database** via `npx prisma db pull` (introspection). It provides:
- TypeScript type definitions for all database tables
- Compile-time safety for database queries
- Auto-completion in your IDE

**Key Points:**
- Prisma schema is **generated FROM remote**, not the source
- Run `./scripts/post-migration-sync.sh` after migrations to keep it in sync
- TypeScript types always match production when schema is up to date

**See:** [ADR-010: Remote Database as Source of Truth](./explanation/architecture-decisions/ADR-010-remote-database-source-of-truth.md) for architectural rationale and decision matrix.

### How to Determine Current Schema State

**Method 1: Query Remote Database (Most Reliable)**
```sql
-- Check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'version';

-- Check if function exists
SELECT proname, pronargs
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND proname = 'create_order_with_audit';

-- Check applied migrations
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version;
```

**Method 2: Use Supabase CLI**
```bash
# View migration sync status
supabase migration list --linked

# Pull current schema as SQL
supabase db pull
```

**Method 3: Supabase Dashboard**
- Navigate to Database → Tables
- Inspect schema visually

---

## Migration Workflow

### Creating New Migrations

**Step 1: Make Changes Locally (Optional)**
```bash
# Start local Supabase (for testing)
supabase start

# Apply changes via SQL or Dashboard
# OR
# Make changes directly to remote via Dashboard
```

**Step 2: Generate Migration**
```bash
# If changes made locally:
supabase db diff -f my_feature_name

# If changes made on remote:
supabase db pull
```

**Step 3: Review Generated Migration**
```bash
cat supabase/migrations/<timestamp>_my_feature_name.sql
```

**Step 4: Commit to Git**
```bash
git add supabase/migrations/<timestamp>_my_feature_name.sql
git commit -m "feat(db): add my_feature_name schema changes"
```

**Step 5: Deploy to Remote (if not already there)**
```bash
# Only needed if changes were made locally first
supabase db push --linked
```

### Migration Best Practices

**Always Use:**
- `CREATE TABLE IF NOT EXISTS` (idempotent)
- `ON CONFLICT DO NOTHING` for inserts (safe re-run)
- `CREATE INDEX IF NOT EXISTS` (no duplicate index errors)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PostgreSQL 9.6+)

**Example Idempotent Migration:**
```sql
-- Good: Can be run multiple times safely
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL
);

INSERT INTO api_scopes (scope, description) VALUES
  ('menu:read', 'View menu items')
ON CONFLICT (scope) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
```

**Avoid:**
```sql
-- Bad: Fails on second run
CREATE TABLE orders (...);  -- ERROR: relation already exists

-- Bad: Fails if already exists
INSERT INTO api_scopes VALUES (...);  -- ERROR: duplicate key

-- Bad: Fails on second run
CREATE INDEX idx_orders_status ON orders(status);  -- ERROR: already exists
```

### Keeping RPC Functions in Sync with Table Changes

**⚠️ CRITICAL:** When adding/removing columns from tables that are used by RPC functions, you MUST update the RPC's `RETURNS TABLE` clause to match.

**Common Pitfall:**
Adding columns to a table (e.g., `orders.payment_status`) without updating RPCs that return those tables leads to 500 errors when the service layer expects all columns but the RPC only returns a subset.

**Example Scenario:**
```
1. Migration A: ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20);
2. Migration B: (missing!) Update create_order_with_audit RETURNS TABLE to include payment_status
3. Result: 500 error when creating orders because RPC returns fewer columns than expected
```

**Correct Workflow:**

When adding columns to a table used in RPC functions:

1. **Identify Affected RPCs:**
```bash
# Find RPCs that reference the table
psql "$DATABASE_URL" -c "\df+ *order*"

# Check RPC definition
psql "$DATABASE_URL" -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'create_order_with_audit';"
```

2. **Update RPC in Same Migration or Immediately After:**
```sql
-- Migration: 20251030_add_payment_fields.sql

-- STEP 1: Add columns to table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- STEP 2: Update RPC RETURNS TABLE to include new columns
DROP FUNCTION IF EXISTS create_order_with_audit(...);  -- Drop with exact signature

CREATE FUNCTION create_order_with_audit(...)
RETURNS TABLE (
  id UUID,
  restaurant_id UUID,
  order_number VARCHAR,
  -- ... existing columns ...
  payment_status VARCHAR,  -- ✅ ADDED
  payment_method VARCHAR   -- ✅ ADDED
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- INSERT logic stays the same
  -- New columns use their DEFAULT values automatically

  RETURN QUERY
  SELECT
    o.id,
    o.restaurant_id,
    o.order_number,
    -- ... existing columns ...
    o.payment_status,  -- ✅ ADDED
    o.payment_method   -- ✅ ADDED
  FROM orders o
  WHERE o.id = v_order_id;
END;
$$;
```

3. **Verify RPC Signature After Deployment:**
```bash
# Check RETURNS TABLE includes all columns
psql "$DATABASE_URL" -c "
SELECT pg_get_function_result(oid)
FROM pg_proc
WHERE proname = 'create_order_with_audit'
ORDER BY oid DESC LIMIT 1;
"
```

**Validation Checklist:**
- [ ] Table columns added with `IF NOT EXISTS`
- [ ] RPC `RETURNS TABLE` updated to include new columns
- [ ] RPC `RETURN QUERY SELECT` includes new columns
- [ ] Deployed both changes atomically (same migration or consecutive)
- [ ] Verified RPC signature matches table structure
- [ ] Synced Prisma schema: `./scripts/post-migration-sync.sh`

**Related Incidents:**
- 2025-10-29: Server role 500 error - payment fields added to orders table but create_order_with_audit not updated ([#554d7d56](https://github.com/mikeyoung304/July25/commit/554d7d56))

### Handling Migration Conflicts

**Scenario:** Local migration conflicts with remote schema

**Resolution Process:**

1. **Identify Conflict:**
```bash
supabase db push --linked
# ERROR: column "foo" already exists
```

2. **Inspect Remote State:**
```bash
PGPASSWORD="..." psql "..." -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'my_table';"
```

3. **Choose Strategy:**

**Option A: Remote is Correct (Preferred)**
- Archive local migration to `.archive/`
- Document why in `.archive/README.md`
- Pull remote schema if needed

**Option B: Local is Correct (Rare)**
- Requires strong justification
- Manually fix remote via Dashboard
- Pull changes to create migration
- Document incident

**Option C: Merge Both**
- Modify local migration to complement remote
- Use `IF NOT EXISTS` clauses
- Deploy and verify

---

## Common Usage Patterns

### Pattern 1: Deploy P0 Audit Fixes

**Scenario:** October 19, 2025 audit fixes (tax_rate, version, RPCs)

```bash
# Step 1: Verify local migrations exist
ls supabase/migrations/20251019*.sql

# Step 2: Check migration sync status
supabase migration list --linked

# Step 3: Deploy all pending migrations
echo "Y" | supabase db push --linked

# Step 4: Verify deployment
PGPASSWORD="..." psql "..." -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'tax_rate';"
```

### Pattern 2: Verify Schema After Deployment

**Use the verification script:**
```bash
PGPASSWORD="bf43D86obVkgyaKJ" psql \
  "postgresql://postgres@db.xiwfhcikfdoshxwbtjxt.supabase.co:5432/postgres?sslmode=require" \
  -f order_verification.sql
```

**Expected output:**
- All checks show `PASS ✅`
- No critical issues requiring attention
- Summary shows `passed: 12, failed: 0`

### Pattern 3: Emergency Hotfix via Dashboard

**Scenario:** Critical production issue requires immediate schema change

**Process:**

1. **Apply fix via Supabase Dashboard SQL Editor:**
```sql
-- Example: Add missing index
CREATE INDEX CONCURRENTLY idx_orders_restaurant_id ON orders(restaurant_id);
```

2. **Pull changes to local:**
```bash
supabase db pull
```

3. **Review and commit generated migration:**
```bash
git add supabase/migrations/<timestamp>_remote_schema.sql
git commit -m "fix(db): emergency index for orders query performance

Applied via Dashboard during P0 incident on 2025-10-20.
See INCIDENT_REPORT.md for details."
```

4. **Document in incident report**

### Pattern 4: Reconcile Diverged Migrations

**Scenario:** Local and remote migration histories diverged (July 2025 incident)

**Resolution (October 20, 2025):**

1. **Archive conflicting local migrations:**
```bash
mkdir -p supabase/migrations/.archive
mv supabase/migrations/20250130_auth_tables.sql supabase/migrations/.archive/
mv supabase/migrations/20250201_payment_audit_logs.sql supabase/migrations/.archive/
```

2. **Mark remote migrations as handled:**
```bash
supabase migration repair --status reverted 20250730094240
# Repeat for all 11 remote-only migrations
```

3. **Fix schema mismatches in remaining migrations:**
```sql
-- Example: Fix api_scopes schema mismatch
-- Remote has: api_scopes (scope TEXT PRIMARY KEY)
-- Local expected: api_scopes (scope_name TEXT, id UUID)
-- Solution: Update local migration to match remote
```

4. **Deploy reconciled migrations:**
```bash
supabase db push --linked
```

5. **Document reconciliation:**
- Create `MIGRATION_RECONCILIATION_2025-10-20.md`
- Update `.archive/README.md`

See [`MIGRATION_RECONCILIATION_2025-10-20.md`](./MIGRATION_RECONCILIATION_2025-10-20.md) for full details.

---

## Troubleshooting

### Issue: "column does not exist" after pushing migration

**Symptoms:**
```
ERROR: 42703: column "tax_rate" does not exist
```

**Diagnosis:**
Migration was committed to git but never deployed to remote.

**Fix:**
```bash
# Verify migration is in local files
ls supabase/migrations/ | grep tax_rate

# Check if applied remotely
supabase migration list --linked
# Look for migration in "Local" column but not "Remote"

# Deploy missing migration
supabase db push --linked
```

### Issue: "duplicate key value violates unique constraint"

**Symptoms:**
```
ERROR: 23505: duplicate key value violates unique constraint "schema_migrations_pkey"
Key (version)=(20251019) already exists.
```

**Cause:**
Multiple migrations with identical timestamp.

**Fix:**
```bash
# Rename migrations to unique timestamps
mv supabase/migrations/20251019_feature1.sql supabase/migrations/20251019180000_feature1.sql
mv supabase/migrations/20251019_feature2.sql supabase/migrations/20251019183000_feature2.sql

# Mark old timestamp as reverted
supabase migration repair --status reverted 20251019

# Deploy renamed migrations
supabase db push --linked
```

### Issue: "Remote migration versions not found in local"

**Symptoms:**
```
Remote migration versions not found in local migrations directory.

Make sure your local git repo is up-to-date. If the error persists, try repairing the migration history table:
supabase migration repair --status reverted 20251019
```

**Cause:**
Remote has migrations that don't exist in local migration files (e.g., created via Dashboard).

**Options:**

**Option 1: Pull remote migrations (if you want them locally):**
```bash
supabase db pull
git add supabase/migrations/
git commit -m "chore(db): pull missing remote migrations"
```

**Option 2: Mark remote migrations as reverted (if obsolete):**
```bash
# Tell Supabase CLI to ignore these remote migrations
supabase migration repair --status reverted 20250730094240
# Repeat for each remote-only migration
```

### Issue: Schema mismatch (local migration expects different schema)

**Symptoms:**
```
ERROR: 42703: column "scope_name" of relation "api_scopes" does not exist
```

**Diagnosis:**
```bash
# Check remote schema
PGPASSWORD="..." psql "..." -c "\d api_scopes"
# Shows: scope TEXT PRIMARY KEY

# Local migration expects:
# scope_name TEXT, id UUID PRIMARY KEY
```

**Fix:**
Modify local migration to match remote schema:
```sql
-- BEFORE:
INSERT INTO api_scopes (scope_name, description) VALUES (...)

-- AFTER:
INSERT INTO api_scopes (scope, description) VALUES (...)
```

### Issue: Migration applied but changes not visible

**Diagnosis:**
```bash
# Check migration was actually applied
supabase migration list --linked
# Verify timestamp appears in both Local and Remote

# Query remote to confirm change
PGPASSWORD="..." psql "..." -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'version';"
```

**Possible Causes:**
1. Migration used `IF NOT EXISTS` and column already existed
2. Migration failed silently (check Supabase logs)
3. Querying wrong database (local vs remote)
4. Migration transaction rolled back due to error

---

## Security Best Practices

### Credential Management

**DO:**
- ✅ Store credentials in `.env` (gitignored)
- ✅ Use `PGPASSWORD` environment variable for psql
- ✅ Use service role key only on server-side
- ✅ Rotate keys regularly via Supabase Dashboard

**DON'T:**
- ❌ Commit credentials to git
- ❌ Expose service role key in client code
- ❌ Share credentials in Slack/Discord
- ❌ Use production credentials in development

### RLS (Row Level Security)

**Always enable RLS on tables with tenant data:**
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their restaurant's orders"
ON orders FOR SELECT
USING (restaurant_id = current_setting('app.current_restaurant_id')::UUID);
```

**Test RLS policies:**
```sql
-- As service role (bypasses RLS)
SELECT * FROM orders;  -- Returns all rows

-- As anon role (enforces RLS)
SET ROLE anon;
SELECT * FROM orders;  -- Returns only allowed rows
```

### Migration Security

**DO:**
- ✅ Review all migrations before applying
- ✅ Test migrations on staging first
- ✅ Use transactions for complex migrations
- ✅ Backup before major schema changes

**DON'T:**
- ❌ Run untrusted SQL from unknown sources
- ❌ Apply migrations directly to production without review
- ❌ Use `DROP TABLE` without backup
- ❌ Modify RLS policies without testing

---

## Connection Summary

| Method | Primary Use | Auth Required | When to Use |
| --- | --- | --- | --- |
| `supabase` CLI | Migrations, schema management | Project link | Deploying changes, managing migrations |
| `psql` | Diagnostics, queries | Password | Verification, one-off queries |
| Supabase Dashboard | Monitoring, manual changes | OAuth | Viewing data, emergency fixes |
| App Code (JS/TS) | Runtime operations | API keys | All application database operations |

**Remember:** Remote database is source of truth. When in doubt, query production.

---

## References

- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **Migration Guide:** https://supabase.com/docs/guides/cli/local-development#database-migrations
- **PostgreSQL Connection Strings:** https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
- **Internal Docs:**
  - [`DATABASE.md`](./reference/schema/DATABASE.md) - Schema reference
  - [`DEPLOYMENT.md`](./how-to/operations/DEPLOYMENT.md) - Deployment procedures
  - [`MIGRATION_RECONCILIATION_2025-10-20.md`](./MIGRATION_RECONCILIATION_2025-10-20.md) - July 2025 incident resolution

---

**Document Status:** Production-ready
**Maintained by:** Engineering Team
**Last Audit:** 2025-10-20 (Post P0 Audit Migration Deployment)
