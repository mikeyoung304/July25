# CI/CD Workflows for Database Migrations

[Home](../../../index.md) > [Docs](../../README.md) > [How-To](../README.md) > [Development](./README.md) > CI/CD Workflows

**Part of:** Phase 2 - Stable CI/CD Automation
**Created:** 2025-10-22
**Last Updated:** October 30, 2025
**Purpose:** Automate database migrations to prevent schema drift incidents

---

## 🤖 AI Agent Quick Start

**TL;DR:** This system auto-deploys database migrations **before** code deploys.

### The Complete Flow:
```
git push origin main → GitHub Actions detects migrations → Deploy migrations (1-2 min)
                                                                     ↓
                                                         Render/Vercel deploy code (3-5 min)
```

**What happens automatically:**
1. ✅ GitHub Actions detects new .sql files in `supabase/migrations/`
2. ✅ Runs `scripts/deploy-migration.sh` for each migration
3. ✅ Syncs Prisma schema via `scripts/post-migration-sync.sh`
4. ✅ Render and Vercel auto-deploy after migrations complete
5. ✅ Creates GitHub issue if migration fails

**Your workflow:**
1. Create migration: Add `.sql` file to `supabase/migrations/`
2. Test locally: `./scripts/deploy-migration.sh supabase/migrations/your-file.sql`
3. Sync Prisma: `./scripts/post-migration-sync.sh`
4. Commit changes: `git add . && git commit -m "feat: add migration"`
5. Push to main: `git push origin main`
6. Done! CI/CD handles the rest.

**Related Documentation:**
- Standard deployment → [DEPLOYMENT.md](../operations/DEPLOYMENT.md)
- Database connection/troubleshooting → [SUPABASE_CONNECTION_GUIDE.md](../../SUPABASE_CONNECTION_GUIDE.md)
- Migration system → [../supabase/MIGRATION_BASELINE.md](../../../supabase/MIGRATION_BASELINE.md)

---

## Overview

This system automates database migration deployment to ensure the database schema is always updated **before** application code deploys. This prevents production incidents caused by code expecting schema changes that haven't been applied yet (Incidents #1, #2, #3).

### Key Principle: Database-First Deployment

```
Merge to main → Deploy DB migrations (1-2 min) → Deploy code (3-5 min)
                        ↑                              ↑
                  Database ready              Code finds schema ready
```

---

## Workflows

### 1. PR Validation (`.github/workflows/pr-validation.yml`)

**Trigger:** Pull request modifies migrations or Prisma schema
**Purpose:** Catch errors before merge
**Duration:** ~2 minutes

**Checks performed:**
- ✅ Prisma schema validity
- ✅ Migration file naming convention
- ✅ Schema sync (Prisma matches database)
- ✅ Migration history verification
- ✅ Basic SQL syntax validation

**Output:** Comment on PR with results

**What it prevents:**
- Invalid migration SQL reaching production
- Forgotten `post-migration-sync.sh` runs
- Schema drift merging to main

**Example:**
```yaml
# Triggered when PR modifies these paths:
- 'supabase/migrations/**'
- 'prisma/schema.prisma'
```

---

### 2. Migration Deployment (`.github/workflows/deploy-migrations.yml`)

**Trigger:** Push to main branch (auto), or manual dispatch
**Purpose:** Auto-deploy migrations immediately after merge
**Duration:** ~1-2 minutes

**Process:**
1. Detect new/modified migration files
2. For each migration:
   - Check if already applied (idempotent)
   - Apply via `scripts/deploy-migration.sh`
   - Verify recorded in tracking table
3. Run `post-migration-sync.sh` to update Prisma
4. Create deployment summary
5. On failure: Create GitHub issue with rollback instructions

**Critical timing:**
- Completes in 1-2 minutes
- Vercel/Render take 3-5 minutes to build
- **Guarantee:** Database is always ready before code

**Manual trigger:**
```bash
# Via GitHub UI: Actions → Deploy Database Migrations → Run workflow
# Specify migration file path if needed
```

**What it prevents:**
- Forgetting to deploy migrations manually
- Race condition where code deploys before database
- Silent failures (creates GitHub issues)

---

### 3. Drift Detection (`.github/workflows/drift-check.yml`)

**Trigger:** Daily at 9 AM UTC, or manual dispatch
**Purpose:** Detect manual schema changes
**Duration:** ~1 minute

**Process:**
1. Introspect production database
2. Compare with `prisma/schema.prisma` in git
3. If different:
   - Create/update GitHub issue with diff
   - Include remediation steps
4. If same:
   - Close any open drift issues

**What it catches:**
- Manual changes via Supabase Dashboard
- Migrations deployed but not committed to git
- Direct SQL changes via psql

**Example issue created:**
```markdown
## 🚨 Database Schema Drift Detected

Changes detected: 12 lines different

<diff output>

Remediation steps:
1. Accept drift and update git
2. Revert production to match git
3. Document as known drift
```

---

## Scripts

### `scripts/deploy-migration.sh`

**Purpose:** Idempotent migration deployment with verification

**Usage:**
```bash
./scripts/deploy-migration.sh supabase/migrations/20251023_add_column.sql
```

**Features:**
- Checks if already applied (safe to retry)
- Applies migration via psql
- Verifies tracking table updated
- Returns proper exit codes:
  - `0` = Success
  - `1` = Failure
  - `2` = Already applied (idempotent success)

**Used by:** CI/CD deployment workflow, manual deployments

---

### `scripts/rollback-migration.sh`

**Purpose:** Emergency rollback capability

**Usage:**
```bash
./scripts/rollback-migration.sh 20251023_add_column
```

**Process:**
1. Find migration file
2. Look for `.rollback.sql` file
3. If found: Apply with confirmation
4. If not found: Show Supabase backup instructions

**Rollback file convention:**
```
supabase/migrations/20251023_add_column.sql
supabase/migrations/20251023_add_column.rollback.sql  ← Create this
```

**When to create rollback files:**
- Migrations that drop columns/tables
- Migrations that modify data
- Complex schema changes
- Production-critical migrations

**Example rollback:**
```sql
-- Migration: 20251023_add_column.sql
ALTER TABLE restaurants ADD COLUMN new_feature text;

-- Rollback: 20251023_add_column.rollback.sql
ALTER TABLE restaurants DROP COLUMN IF EXISTS new_feature;
DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20251023_add_column';
```

---

### `scripts/post-migration-sync.sh`

**Purpose:** Sync Prisma schema after database changes

**Usage:**
```bash
./scripts/post-migration-sync.sh
```

**Process:**
1. Run `prisma db pull` to introspect
2. Run `prisma generate` to create types
3. Show git diff of changes

**When to run:**
- After deploying migrations manually
- After creating new migrations
- Before committing migration PRs

**Note:** CI/CD runs this automatically after deployment

---

### `scripts/verify-migration-history.sh`

**Purpose:** Validate local and remote migrations match

**Usage:**
```bash
./scripts/verify-migration-history.sh
```

**Checks:**
- Lists local migration files
- Queries remote tracking table
- Compares counts and identifies mismatches

---

## Developer Workflow

### Creating a New Migration

1. **Create migration file:**
   ```bash
   # Naming convention: YYYYMMDDHHMMSS_description.sql
   touch supabase/migrations/20251023140000_add_user_preferences.sql
   ```

2. **Write migration SQL:**
   ```sql
   -- Add user preferences table
   CREATE TABLE IF NOT EXISTS user_preferences (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     preferences JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT now(),
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- Add to migration tracking
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('20251023140000', 'add_user_preferences')
   ON CONFLICT DO NOTHING;
   ```

3. **Sync Prisma schema:**
   ```bash
   ./scripts/post-migration-sync.sh
   ```

4. **Create PR:**
   ```bash
   git checkout -b feat/user-preferences
   git add supabase/migrations/20251023140000_add_user_preferences.sql
   git add prisma/schema.prisma  # Updated by post-migration-sync.sh
   git commit -m "feat(db): add user preferences table"
   git push
   ```

5. **PR validation runs automatically:**
   - Checks migration validity
   - Verifies Prisma schema is in sync
   - Posts results as PR comment

6. **Merge to main:**
   - CI/CD deploys migration automatically
   - Database updated in 1-2 minutes
   - Vercel/Render deploy code afterwards (3-5 min)
   - Code finds database ready

---

## Production Deployment Flow

```
Developer                     GitHub Actions                 Production
    |                               |                              |
    |--- git push origin main ----->|                              |
    |                               |                              |
    |                        Detect migration files               |
    |                               |                              |
    |                        Deploy to database ------------------>|
    |                         (1-2 minutes)                        |
    |                               |                              |
    |                               |<-------- Migration applied --|
    |                               |                              |
    |                        Post success notification            |
    |<------------------------      |                              |
    |                               |                              |
    |                         Meanwhile...                         |
    |                               |                              |
    |                        Vercel/Render build                   |
    |                         (3-5 minutes)                        |
    |                               |                              |
    |                               |------ Deploy code ---------->|
    |                               |                              |
    |                               |     (Database already ready) |
```

**Key guarantee:** Database migration completes before code deployment starts.

---

## Troubleshooting

### PR Validation Failed

**Symptom:** PR check shows ❌ red X

**Common causes:**
1. **Prisma schema not in sync:**
   - **Fix:** Run `./scripts/post-migration-sync.sh` locally and commit
2. **Invalid migration naming:**
   - **Fix:** Rename to `YYYYMMDDHHMMSS_description.sql`
3. **SQL syntax error:**
   - **Fix:** Test migration locally, fix syntax

---

### Migration Deployment Failed

**Symptom:** GitHub issue created: "🚨 Migration Deployment Failed"

**Immediate actions:**
1. Check workflow logs for error details
2. Verify database state (partially applied?)
3. Decide: Fix forward or rollback

**Fix forward:**
```bash
# Fix migration file
git commit -m "fix(migration): correct SQL syntax"
git push  # CI/CD will retry
```

**Rollback:**
```bash
# If .rollback.sql exists:
./scripts/rollback-migration.sh 20251023_add_column

# Otherwise, restore from Supabase backup
```

---

### Schema Drift Detected

**Symptom:** GitHub issue created: "🚨 Database Schema Drift Detected"

**Causes:**
- Manual Dashboard changes
- Migration deployed but not committed
- Direct psql changes

**Resolution:**

**Option 1: Accept drift (intentional changes)**
```bash
./scripts/post-migration-sync.sh
git add prisma/schema.prisma
git commit -m "chore(schema): sync with production drift"
git push
```

**Option 2: Revert production (unintentional)**
```bash
# Create rollback migration to undo changes
# Deploy rollback to restore git schema
```

---

## Configuration

### GitHub Secrets Required

Add these to repository secrets (Settings → Secrets and variables → Actions):

- **`DATABASE_URL`**: Supabase connection string
  ```
  postgresql://postgres:<password>@<project-ref>.supabase.co:5432/postgres?sslmode=require
  ```

### Optional: Production Environment

Enable manual approval for production deployments:

1. Settings → Environments → New environment: "production"
2. Enable "Required reviewers"
3. Add team members who can approve deployments

The deployment workflow will wait for approval before applying migrations.

---

## Testing

### Test with Dummy Migration

Create a safe test migration:

```bash
# Create test file
cat > supabase/migrations/20251023_test_ci_cd.sql <<'EOF'
-- Test migration for CI/CD validation
-- Safe to apply and rollback

COMMENT ON TABLE restaurants IS 'CI/CD test applied';

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251023_test_ci_cd', 'test_ci_cd')
ON CONFLICT DO NOTHING;
EOF

# Create rollback
cat > supabase/migrations/20251023_test_ci_cd.rollback.sql <<'EOF'
COMMENT ON TABLE restaurants IS NULL;

DELETE FROM supabase_migrations.schema_migrations
WHERE version = '20251023_test_ci_cd';
EOF

# Test locally
./scripts/deploy-migration.sh supabase/migrations/20251023_test_ci_cd.sql

# Test rollback
./scripts/rollback-migration.sh 20251023_test_ci_cd

# If successful, test via CI/CD
git checkout -b test/ci-cd
git add supabase/migrations/20251023_test_ci_cd*
git commit -m "test: CI/CD workflows"
git push
# Create PR, verify PR validation runs
# Merge, verify deployment workflow runs
# Clean up test migration afterwards
```

---

## Monitoring

### Daily Checks

- **Drift detection:** Runs automatically at 9 AM UTC
- **Check issues:** Look for "schema-drift" or "migration-failure" labels

### After Each Deployment

- Check GitHub Actions for green ✅
- Verify no deployment failure issues created
- Monitor application logs for errors

### Weekly Review

- Review closed drift issues (were they resolved properly?)
- Check for patterns in migration failures
- Update runbooks based on lessons learned

---

## Best Practices

### DO ✅

- **Always** use migration files (never Dashboard for schema)
- **Always** run `post-migration-sync.sh` before committing
- **Always** create `.rollback.sql` for risky migrations
- **Test** migrations locally before pushing
- **Review** PR validation results before merging
- **Monitor** deployment workflow after merge

### DON'T ❌

- **Never** make schema changes via Supabase Dashboard
- **Never** commit migrations without syncing Prisma
- **Never** skip PR validation checks
- **Never** force-push to main
- **Never** manually deploy migrations after CI/CD is enabled (use the automation)

---

## Support

**Issues with workflows:** Check logs in Actions tab
**Schema drift questions:** See docs/RUNBOOKS.md
**Emergency rollback:** Use `scripts/rollback-migration.sh`
**Questions:** Create GitHub discussion or ask in #engineering channel

---

## Related Documentation

- [Deployment Guide](../operations/DEPLOYMENT.md) - Production deployment
- [Supabase Connection Guide](../../SUPABASE_CONNECTION_GUIDE.md) - Database workflows
- [Development Process](./DEVELOPMENT_PROCESS.md) - Development workflows
- [Testing Checklist](../../TESTING_CHECKLIST.md) - QA procedures
- [Post-Mortem: Schema Drift](../../archive/incidents/POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md) - Incident analysis

---

**Last Updated:** October 30, 2025
**Version:** 6.0.14
