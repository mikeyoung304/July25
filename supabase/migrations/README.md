# Supabase Migrations

This directory contains SQL migration files that modify the Supabase database schema.

## Directory Structure

```
migrations/
├── .archive/              # Deprecated/historical migrations
├── .template.sql         # Template for new migrations
└── YYYYMMDDHHMMSS_*.sql  # Active migrations (applied to production)
```

## Naming Convention

**Format:** `YYYYMMDDHHMMSS_verb_object.sql`

**Examples:**
- `20251019180000_add_tax_rate_to_restaurants.sql` ✅
- `20251021000000_update_tax_rate_to_0_08.sql` ✅
- `fix_orders.sql` ❌ (missing timestamp and verb)

## Migration Workflow

**⚠️ CRITICAL: Migrations must be tested locally BEFORE pushing to main.**

**Modern Workflow (CI/CD Automated):**
- Test locally → Commit to git → Push to main → CI/CD auto-deploys to Supabase

### Step-by-Step Process:

1. **Create migration:**
   ```bash
   supabase migration new add_column_to_table
   ```

2. **Write SQL** in generated file using idempotent patterns:
   ```sql
   ALTER TABLE restaurants
   ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.08;
   ```

3. **Test locally (REQUIRED):**
   ```bash
   ./scripts/deploy-migration.sh supabase/migrations/XXXXX_*.sql
   ```

4. **Verify local deployment:**
   ```bash
   supabase db diff --linked  # Should show no changes
   psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='restaurants' AND column_name='tax_rate';"
   ```

5. **Sync Prisma schema:**
   ```bash
   ./scripts/post-migration-sync.sh
   ```

6. **Commit to git:**
   ```bash
   git add supabase/migrations/XXXXX_*.sql prisma/schema.prisma
   git commit -m "feat(db): add tax_rate column to restaurants"
   ```

7. **Push to main:**
   ```bash
   git push origin main
   ```

   **GitHub Actions will automatically:**
   - Deploy migration to production Supabase
   - Run schema validation
   - Deploy updated code to Vercel/Render

8. **Never edit deployed migrations** - Create new ones instead

## Visual Workflow Diagram

For a complete visual representation of the migration workflow from local testing through production deployment:

**→ See: [Migration Workflow Diagram](../docs/explanation/architecture/diagrams/migration-workflow.md)**

## Authoritative Guide

For complete workflow, troubleshooting, and best practices:

**→ See: [/docs/SUPABASE_CONNECTION_GUIDE.md](../docs/SUPABASE_CONNECTION_GUIDE.md)**

## Common Issues

- **Schema drift:** Migrations committed but not deployed → Run `supabase db push --linked`
- **Conflicts:** Migration already applied → Use idempotent SQL (`IF NOT EXISTS`)
- **Rollback needed:** Create new migration to undo changes (never delete deployed migrations)

## Template

Copy `.template.sql` when creating migrations to include metadata headers.

---

**Last Updated:** 2025-10-21
**See Also:** [CONTRIBUTING.md](../CONTRIBUTING.md), [RUNBOOKS.md](../docs/RUNBOOKS.md)
