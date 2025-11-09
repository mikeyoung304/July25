# Supabase Migration Tracking - Evidence Catalog

This document catalogs all concrete evidence for how migrations are tracked.

---

## EVIDENCE 1: Source of Truth is Remote Database

### Proof Location
File: `/scripts/deploy-migration.sh` lines 34-52

### The Code
```bash
is_migration_applied() {
  local version="$1"

  log_info "Checking if migration '$version' has been applied..."

  # Query schema_migrations table
  local result=$(psql "$DATABASE_URL" -t -c \
    "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = '$version';" \
    2>/dev/null || echo "0")

  result=$(echo "$result" | tr -d ' ')

  if [ "$result" -gt 0 ]; then
    return 0  # Already applied
  else
    return 1  # Not applied
  fi
}
```

### What This Proves
1. Migration status is determined by querying `supabase_migrations.schema_migrations` table
2. The version field is the migration filename (without .sql extension)
3. This is the ONLY way the script checks if a migration is applied
4. This is the ONLY source of truth for production

### How to Verify
```bash
# Direct query to production database
psql "$DATABASE_URL" -t -c \
  "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = 'MIGRATION_VERSION';"
```

---

## EVIDENCE 2: GitHub Deployment Workflow Detects & Deploys

### Proof Location
File: `.github/workflows/deploy-migrations.yml` lines 54-123

### Detection Logic (lines 54-89)
```bash
# Auto-trigger case: detect new/modified migrations from last commit
NEW_MIGRATIONS=$(git diff --name-only HEAD~1 HEAD | grep '^supabase/migrations/.*\.sql$' | grep -v 'README' || true)
```

### Deployment Logic (lines 104-123)
```bash
for migration in $MIGRATIONS; do
  echo ""
  echo "================================================"
  echo "Deploying: $migration"
  echo "================================================"

  if ./scripts/deploy-migration.sh "$migration"; then
    EXIT_CODE=$?
    if [ "$EXIT_CODE" -eq 2 ]; then
      echo "Migration already applied (skipped)"
      SKIPPED_MIGRATIONS+=("$migration")
    else
      echo "Migration deployed successfully"
      SUCCESSFUL_MIGRATIONS+=("$migration")
    fi
  else
    echo "Migration deployment failed"
    FAILED_MIGRATIONS+=("$migration")
  fi
done
```

### What This Proves
1. New migrations are detected by git diff (comparing commits)
2. Each migration is deployed via `./scripts/deploy-migration.sh`
3. The script returns exit code 2 if already applied (idempotent)
4. Workflow records successes/failures/skipped
5. Failed migrations cause the entire workflow to fail

### How to Verify
1. Push a new migration file to main branch
2. Check GitHub Actions > deploy-migrations workflow
3. See it detecting and deploying the migration

---

## EVIDENCE 3: Drift Detection Introspects Actual Schema

### Proof Location
File: `.github/workflows/drift-check.yml` lines 39-73

### The Introspection (line 48)
```yaml
- name: Introspect production database
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
  run: |
    echo "::group::Introspecting Production Database"
    npx prisma db pull
    echo "::endgroup::"
```

### The Comparison (lines 52-73)
```yaml
- name: Check for drift
  id: drift-check
  run: |
    echo "::group::Comparing Schemas"

    if diff /tmp/schema-before.prisma prisma/schema.prisma > /tmp/schema-diff.txt; then
      echo "✅ No schema drift detected"
      echo "Production database matches git schema"
      echo "drift=false" >> "$GITHUB_OUTPUT"
    else
      echo "❌ Schema drift detected!"
      echo ""
      echo "Differences found between production and git:"
      cat /tmp/schema-diff.txt
      echo ""
      echo "drift=true" >> "$GITHUB_OUTPUT"
```

### What This Proves
1. Drift detection INTROSPECTS the actual database schema (using `prisma db pull`)
2. It does NOT check migration history
3. It does NOT query schema_migrations table
4. It compares Prisma schemas (before = what's in git, after = what's in database)
5. A GitHub issue is created if drift is detected

### Important Limitation
The drift-check does NOT detect:
- Abandoned local migration files that were never applied
- Migration history corruption (duplicate entries in schema_migrations)
- Inconsistencies in the schema_migrations table itself

### How to Verify
```bash
# What drift-check runs:
npx prisma db pull  # Generates schema from actual database

# Then compares with:
git show HEAD:prisma/schema.prisma  # Schema from repo

# If different → DRIFT
```

---

## EVIDENCE 4: Duplicate Migrations with Different Timestamps

### Identical Content Duplicates

**File 1:** `/supabase/migrations/20251019_add_create_order_with_audit_rpc.sql`
- Modified: Oct 20, 23:11
- Lines: 195

**File 2:** `/supabase/migrations/20251019180800_add_create_order_with_audit_rpc.sql`
- Modified: Oct 19, 18:08
- Lines: 195

### Verification Command
```bash
diff supabase/migrations/20251019_add_create_order_with_audit_rpc.sql \
     supabase/migrations/20251019180800_add_create_order_with_audit_rpc.sql
# Returns: (no output = files are identical)
```

### Different Content Duplicates

**File 1:** `/supabase/migrations/20251019_add_tax_rate_to_restaurants.sql`
- Tax rate default: 0.0825 (8.25%)
- Modified: Oct 20, 23:11

**File 2:** `/supabase/migrations/20251019180000_add_tax_rate_to_restaurants.sql`
- Tax rate default: 0.08 (8%)
- Modified: Oct 21, 08:37

### Verification Command
```bash
diff supabase/migrations/20251019_add_tax_rate_to_restaurants.sql \
     supabase/migrations/20251019180000_add_tax_rate_to_restaurants.sql
```

### Output
```diff
@@ -4,12 +4,13 @@
 -- Solution: Per-restaurant configuration (ADR-007)
 -- Date: 2025-10-19
 
--- Add tax_rate column with 8.25% default (standard California combined rate)
--- Using DECIMAL(5,4) to support rates like 0.0825 (8.25%)
+-- Add tax_rate column with 8% default (per user requirement)
+-- Using DECIMAL(5,4) to support rates like 0.08 (8%) or 0.0825 (8.25%)
 -- Precision: 5 total digits, 4 after decimal point
 -- Range: 0.0000 to 9.9999 (0% to 999.99%)
+-- Each restaurant tenant can configure their own rate
 ALTER TABLE restaurants
-ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0825;
+ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) NOT NULL DEFAULT 0.08;
```

### What This Proves
1. Multiple migration files exist for same change
2. Some have identical SQL (probably one was abandoned)
3. Some have DIFFERENT SQL (critical - which one is applied?)
4. Naming convention changed mid-stream (8-digit vs 14-digit timestamps)
5. Git history shows 8-digit versions committed AFTER 14-digit versions

---

## EVIDENCE 5: Post-Migration Sync Uses Prisma Introspection

### Proof Location
File: `/scripts/post-migration-sync.sh` lines 28-37

### The Code
```bash
# Step 1: Pull latest schema from database
echo "📥 Introspecting database schema..."
npx prisma db pull

if [ $? -ne 0 ]; then
  echo "❌ Schema introspection failed"
  exit 1
fi

echo "✓ Schema introspection complete"
```

### What This Proves
1. After deployment, the script introspects the actual database
2. Updates prisma/schema.prisma to match actual state
3. Not based on migration files, but on what's actually in database
4. This is run AFTER deploy-migration.sh, ensuring schema is in sync

### Called From
- `.github/workflows/deploy-migrations.yml` (lines 151-158)
- Manual execution after deploying migrations locally

---

## EVIDENCE 6: Historical Migration Bifurcation (Resolved)

### Proof Location
File: `/docs/MIGRATION_RECONCILIATION_2025-10-20.md`

### The Evidence (excerpt)
```
On October 20, 2025, we discovered that the Restaurant OS database 
migration history had bifurcated into two parallel timelines since July 13, 2025.

Timeline Divergence:
- **Remote database**: 11 migrations applied via Supabase Dashboard (July-Sept 2025), never committed to git
- **Local git repo**: 10 migrations committed to git (Jan-Oct 2025), never deployed to production
```

### Timeline Visual
```
July 13, 2025 - RESET POINT
├─ Migration: 20250713130722_remote_schema.sql created (empty)
├─ Decision: "Use Supabase Dashboard for schema changes"
└─ DIVERGENCE BEGINS

Remote Database (Supabase)              Local Git Repository
═══════════════════════════             ════════════════════

July 30 - Sept 4, 2025                  Jan 30 - Oct 19, 2025
11 migrations via Dashboard UI          10 migrations committed to git
├─ 20250730094240                       ├─ 20250130_auth_tables
├─ 20250730094405                       ├─ 20250201_payment_audit_logs
... more remote migrations ...          ... more local migrations ...
└─ 20250904121834                       └─ 20251019_add_batch_update_tables_rpc

NEVER pulled to local                   NEVER deployed to remote
NEVER in git                            NOT in remote database
```

### What This Proves
1. Remote database is the source of truth (Dashboard changes were never pulled)
2. Local migrations weren't enforced (never deployed via CI/CD)
3. The problem was resolved by reconciling both sides
4. New workflow was established to prevent recurrence

---

## EVIDENCE 7: Naming Convention Violation

### Correct Format (14-digit timestamps)
```
✅ 20251019180800_add_create_order_with_audit_rpc.sql (YYYYMMDDHHMMSS)
✅ 20251021231910_add_created_at_to_order_status_history.sql
✅ 20251105003000_fix_check_closed_at_type.sql
```

### Incorrect Format (8-digit dates)
```
✗ 20251013_emergency_kiosk_demo_scopes.sql (YYYYMMDD only)
✗ 20251014_scheduled_orders.sql
✗ 20251015_multi_tenancy_rls_and_pin_fix.sql
✗ 20251018_add_customer_role_scopes.sql
✗ 20251029_sync_role_scopes_with_rbac_v2.sql
```

### Documented Convention
File: `/supabase/migrations/README.md` lines 15-21

```
## Naming Convention

**Format:** `YYYYMMDDHHMMSS_verb_object.sql`

**Examples:**
- `20251019180000_add_tax_rate_to_restaurants.sql` ✅
- `20251021000000_update_tax_rate_to_0_08.sql` ✅
- `fix_orders.sql` ❌ (missing timestamp and verb)
```

### What This Proves
1. Naming convention is defined but not consistently followed
2. 8-digit files still work (Supabase accepts them)
3. But they create confusion and don't follow the standard
4. Should be standardized across all migrations

---

## EVIDENCE 8: The Deploy-Migration Script Exit Codes

### Proof Location
File: `/scripts/deploy-migration.sh` lines 16-19

```bash
# Exit codes
EXIT_SUCCESS=0
EXIT_FAILURE=1
EXIT_ALREADY_APPLIED=2
```

### Usage in Workflow
File: `.github/workflows/deploy-migrations.yml` lines 110-118

```bash
if ./scripts/deploy-migration.sh "$migration"; then
  EXIT_CODE=$?
  if [ "$EXIT_CODE" -eq 2 ]; then
    echo "Migration already applied (skipped)"
    SKIPPED_MIGRATIONS+=("$migration")
  else
    echo "Migration deployed successfully"
    SUCCESSFUL_MIGRATIONS+=("$migration")
  fi
```

### What This Proves
1. Exit code 0 = successful deployment
2. Exit code 1 = failure (stops the workflow)
3. Exit code 2 = already applied (treated as success - idempotent)
4. The workflow distinguishes between "deployed now" and "already was deployed"

---

## Summary of Tracking Mechanisms

| Mechanism | Type | Authoritative | Checked By |
|-----------|------|---------------|-----------|
| schema_migrations table | Historical Record | ✅ YES | deploy-migration.sh, Supabase CLI |
| GitHub workflow | Deployment Trigger | ✅ YES | deploy-migrations.yml |
| Drift detection | Schema Verification | ✅ YES | drift-check.yml, prisma db pull |
| Local migration files | Version Control | ❌ NO | Documentation only |
| Migration naming | Convention | ❌ NO (not enforced) | README.md |

---

## How to Find the Truth

To answer any question about migration state:

1. **"Is migration X applied?"**
   - Answer: Query production database
   - Command: `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = 'X'"`

2. **"Why wasn't migration X deployed?"**
   - Answer: Check deploy-migrations.yml workflow run
   - Check: GitHub Actions history for the commit that added X

3. **"Is there schema drift?"**
   - Answer: Run drift-check manually or wait for scheduled run
   - Command: `npx prisma db pull` then compare with `prisma/schema.prisma`

4. **"Are there abandoned local files?"**
   - Answer: Compare local files with applied migrations
   - Command: Compare output of steps 1 and `ls supabase/migrations/`

