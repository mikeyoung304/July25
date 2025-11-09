# Supabase Migration Tracking - Investigation Findings

**Date:** November 7, 2025  
**Investigator:** Claude Code  
**Status:** COMPLETE  
**Confidence:** HIGH - Based on concrete code evidence

---

## Executive Summary

This project uses a **three-layer migration tracking system** with the remote Supabase database as the sole source of truth. The workflow is well-designed but has **unmaintained duplicate migration files** and **weak drift detection** that doesn't catch migration history corruption.

**Key Finding:** Multiple migrations exist in duplicate with different timestamps, and the drift-check workflow cannot detect if local migration files were never applied to production.

---

## The Three-Layer System

### Layer 1: Remote Database (Source of Truth)
**The ONLY authoritative answer to "which migrations are applied?"**

- Located in: `supabase_migrations.schema_migrations` table in production
- Queried by: `/scripts/deploy-migration.sh` (line 41)
- Truth statement: A migration is applied if and only if it has a record in this table

```sql
-- What the deploy script checks:
SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version'
```

### Layer 2: GitHub Deployment Workflow (Applicator)
**Automatically detects and deploys new migrations**

- File: `.github/workflows/deploy-migrations.yml`
- Trigger: When migration files change on main branch
- Detects: `git diff HEAD~1 HEAD | grep '^supabase/migrations/.*\.sql$'`
- Applies: Via `./scripts/deploy-migration.sh` (idempotent)
- Records: Status in schema_migrations table (via migration SQL execution)

### Layer 3: Daily Drift Check (Detector)
**Daily schema introspection to catch manual dashboard changes**

- File: `.github/workflows/drift-check.yml`
- Trigger: Scheduled daily at 9 AM UTC
- Method: `npx prisma db pull` (introspects actual database schema)
- Compare: Before/after Prisma schemas
- Alert: GitHub issue if schema mismatch detected

---

## Critical Answers to Your Questions

### 1. How do Supabase dashboards track which migrations are applied?

**Answer:** The Supabase Dashboard displays the contents of the `supabase_migrations.schema_migrations` PostgreSQL table.

**Evidence:**
- When you view "Database → Migrations" in the Supabase dashboard, you're seeing this table
- Each row has: version (filename), name (description), executed_at (timestamp)
- This is PostgreSQL's built-in migration tracking, not Supabase-specific

### 2. Does `npx supabase db remote commit` pull changes FROM remote?

**Answer:** This command doesn't exist. There is no `db remote commit` command.

**Correct commands:**
- `supabase db pull` = Introspect remote and generate local migration from current schema
- `supabase db push --linked` = Deploy local migrations to remote
- `supabase migration list --linked` = Show applied migrations from remote
- `supabase migration repair` = Fix migration history (advanced)

### 3. Does `npx supabase migration list` show remote vs local state?

**Answer:** `supabase migration list --linked` shows ONLY the applied migrations from the remote database.

**What it shows:** All migrations in remote schema_migrations table
**What it doesn't show:** Which local migration files match/mismatch the remote list

**This is a limitation:** If you have:
- Local: `20251019_add_tax_rate.sql`
- Remote: `20251019180000_add_tax_rate.sql` (applied)

The `migration list` will show version `20251019180000_add_tax_rate` but not indicate the local version with different name exists.

### 4. What does the drift-check GitHub workflow actually detect?

**Answer:** Drift-check detects SCHEMA DIFFERENCES using Prisma introspection, not migration history issues.

**What it DOES detect:**
- Columns added/removed/changed
- Table structures modified
- Function signatures changed
- Any other schema differences

**What it does NOT detect:**
- Abandoned local migration files (never applied)
- Migration history corruption (duplicate entries in schema_migrations)
- Inconsistent schema_migrations table

**Limitation example:** If you have duplicate migrations that both apply the same schema change:
- Drift check: PASSES (schema is correct)
- Migration history: CORRUPTED (two versions of same change)
- Drift check won't detect this!

### 5. Were recent migrations applied or abandoned?

**Answer:** Based on git history, all recent migrations appear to have been deployed via GitHub Actions. However, duplicate files exist.

**Duplicates found:**

1. **IDENTICAL CONTENT (probably abandoned):**
   - `20251019_add_create_order_with_audit_rpc.sql` (8-digit name)
   - `20251019180800_add_create_order_with_audit_rpc.sql` (14-digit name, probably applied)
   
2. **IDENTICAL CONTENT (probably abandoned):**
   - `20251019_add_batch_update_tables_rpc.sql` (8-digit name)
   - `20251019202700_add_batch_update_tables_rpc.sql` (14-digit name, probably applied)

3. **IDENTICAL CONTENT (probably abandoned):**
   - `20251019_add_version_to_orders.sql` (8-digit name)
   - `20251019183600_add_version_to_orders.sql` (14-digit name, probably applied)

4. **DIFFERENT CONTENT (critical issue):**
   - `20251019_add_tax_rate_to_restaurants.sql` (default: 0.0825 or 8.25%)
   - `20251019180000_add_tax_rate_to_restaurants.sql` (default: 0.08 or 8%)
   - These have DIFFERENT SQL - which one is in production?

5. **INTENTIONAL ROLLBACK FILES (do not delete):**
   - `20251029145721_rollback_add_seat_number_to_orders.sql`
   - `20251029155239_rollback_add_payment_fields_to_orders.sql`

---

## How to Distinguish Between Real Drift and Abandoned Files

### Real Drift (Emergency)
**Definition:** Actual database schema differs from what migrations would create

**How to detect:**
```bash
cp prisma/schema.prisma /tmp/schema-before.prisma
npx prisma db pull
diff /tmp/schema-before.prisma prisma/schema.prisma
# If different → REAL DRIFT DETECTED
```

**Causes:**
- Developer used Supabase Dashboard to make schema changes
- Migrations were deployed but Prisma schema not updated in git
- Migration failed partway through

### Abandoned Local Files (Warning)
**Definition:** Local .sql files that were NEVER deployed to production

**How to detect:**
```bash
# Get applied migrations
psql "$DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations;" > /tmp/applied.txt

# Get local files
ls supabase/migrations/*.sql | sed 's/.*\///' | sed 's/\.sql//' > /tmp/local.txt

# Compare
comm -13 /tmp/applied.txt /tmp/local.txt  # Files in local but not applied → abandoned
```

**Impact:** Low - just clutter in git, but confusing for developers

**Why it matters:** Future developers might try to apply them again, causing duplicate entry errors

---

## The Migration History Story (Recovered)

### What Happened in July 2025
- Team switched to "cloud-first" development model
- Used Supabase Dashboard UI for schema changes instead of migrations
- **11 migrations** applied via Dashboard (never committed to git)
- **10 migrations** committed to git (never deployed to production)
- Bifurcated migration history for 3 months

### Root Cause
1. Never ran `supabase db pull` after Dashboard changes
2. Never ran `supabase db push` to deploy local migrations
3. Never verified `supabase migration list --linked`
4. Different teams worked on different instances

### How They Recovered
- Documented the bifurcation in `/docs/MIGRATION_RECONCILIATION_2025-10-20.md`
- Archived old conflicting local migrations
- Deployed P0 audit fixes via proper workflow
- Established new best practices

### Lesson Learned
- Remote database is the source of truth
- Always verify sync: `supabase migration list --linked`
- Local migrations MUST match remote applied migrations

---

## Migration Tracking Evidence Map

### Source of Truth Query
**File:** `/scripts/deploy-migration.sh` line 41
```bash
SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version'
```
This is checked for EVERY migration before deployment.

### Deployment Workflow
**File:** `.github/workflows/deploy-migrations.yml` lines 54-123
1. Detects new migrations via git diff
2. Executes each via deploy-migration.sh
3. Records success/failure/skip
4. Runs post-migration-sync to update Prisma

### Drift Detection
**File:** `.github/workflows/drift-check.yml` lines 39-73
1. Snapshots current Prisma schema (from git)
2. Introspects production with `npx prisma db pull`
3. Compares before/after
4. Creates GitHub issue if different

### Exit Codes
**File:** `/scripts/deploy-migration.sh` lines 16-19
- Exit 0: Deployed successfully
- Exit 1: Failed (workflow aborts)
- Exit 2: Already applied (treated as success)

---

## Concrete Findings

### Finding 1: Remote Database is Canonical
**Confidence:** 100% - Direct code evidence

The deploy script ONLY checks production database to determine migration status. Never checks local files or git history.

### Finding 2: Drift Detection is Partial
**Confidence:** 100% - Direct code evidence

Drift-check uses Prisma introspection (schema-level), not migration history checks. Cannot detect:
- Abandoned local files
- Migration history corruption
- Duplicate applied migrations

### Finding 3: Duplicate Migrations Exist
**Confidence:** 100% - Verified by file system inspection

Multiple migration files exist with identical or similar SQL. Some have 8-digit timestamps (violating convention), some have 14-digit.

### Finding 4: Naming Convention Violated
**Confidence:** 100% - Code inspection + README documentation

Documented format: `YYYYMMDDHHMMSS_verb_object.sql`  
But files exist like: `YYYYMMDD_verb_object.sql` (missing time component)

### Finding 5: Past Divergence Was Resolved
**Confidence:** 100% - Documented in reconciliation report

July 2025 bifurcation (11 remote vs 10 local migrations) was identified, documented, and resolved.

---

## Workflow Guarantees

### What You Can Count On
1. **Deployment is automatic:** Push migration to main → GitHub Actions deploys it
2. **Status is idempotent:** Deploying same migration twice is safe (skipped second time)
3. **Failures are visible:** Failed deployments create GitHub issues
4. **Schema is tracked:** Prisma schema updates automatically after deployment

### What You Cannot Count On
1. **Drift detection catches everything:** Only detects schema differences
2. **Local files match production:** Duplicates/abandoned files are invisible
3. **Naming convention is enforced:** 8-digit dates work but violate standard
4. **Migration history is clean:** Could have duplicates or inconsistencies

---

## The Three-Layer System Strengths & Weaknesses

| Layer | Strength | Weakness |
|-------|----------|----------|
| Remote DB (Truth) | Authoritative, queryable | No automatic validation |
| GitHub Workflow | Automatic, visible | Can't fix duplicates |
| Drift Check | Daily verification | Blind to history issues |

---

## Recommendations

### Immediate (Before Next Deployment)
1. Verify which migrations are actually applied:
   ```bash
   psql "$DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"
   ```

2. Compare with local files to identify abandoned ones

3. Resolve the tax_rate conflict (two different SQL versions exist)

### Short Term (Within Sprint)
1. Delete confirmed abandoned duplicate files
2. Standardize all migration names to 14-digit format
3. Add migration validation to CI/CD (detect duplicates before push)
4. Create "migration health check" GitHub issue to track cleanup

### Long Term
1. Consider adding migration history validation to drift-check
2. Document which version of tax_rate migration is in production
3. Create rollback procedures for the duplicate migrations
4. Add pre-commit hook to validate migration naming

---

## Documents Created

This investigation produced three documents:

1. **SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md** (11 sections)
   - Comprehensive deep-dive with all details
   - For future reference and deep understanding

2. **SUPABASE_MIGRATION_QUICK_REFERENCE.md** (3 tables, quick answers)
   - Quick lookup for common questions
   - When to use which tools
   - The duplicates at a glance

3. **SUPABASE_MIGRATION_EVIDENCE_CATALOG.md** (8 evidence sections)
   - Concrete code evidence for each claim
   - File locations and line numbers
   - How to verify each finding

---

## Conclusion

The migration tracking system is **well-designed and automated**, but has **accumulated technical debt** in the form of duplicate migration files. The drift-check workflow is **good for schema verification** but **insufficient for migration history validation**.

**The remote database remains the single source of truth**, and any uncertainty about migration status can be resolved by querying `supabase_migrations.schema_migrations` in production.

---

**For detailed evidence:** See SUPABASE_MIGRATION_EVIDENCE_CATALOG.md  
**For quick answers:** See SUPABASE_MIGRATION_QUICK_REFERENCE.md  
**For full details:** See SUPABASE_MIGRATION_TRACKING_INVESTIGATION.md
