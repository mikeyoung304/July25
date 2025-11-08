# Supabase Migration Tracking - Quick Reference

## The Three-Layer System

### Layer 1: Source of Truth (Production Database)
```sql
-- Where "applied" migrations are tracked:
SELECT version FROM supabase_migrations.schema_migrations;
```
**This is the ONLY authoritative answer to "which migrations are applied?"**

### Layer 2: Deployment Engine (GitHub Actions)
- Workflow: `.github/workflows/deploy-migrations.yml`
- Detects: New files in `supabase/migrations/`
- Executes: `./scripts/deploy-migration.sh <file>`
- Records: Migration version in schema_migrations table (in production)

### Layer 3: Drift Detection (Daily Check)
- Workflow: `.github/workflows/drift-check.yml`
- Method: `npx prisma db pull` (introspect actual schema)
- Compare: Before/after Prisma schemas
- Alert: GitHub issue if they differ
- **Limitation:** Doesn't check migration history or schema_migrations table

---

## Quick Answers

**Q: Is migration X applied to production?**
A: Query production: `SELECT COUNT(*) FROM supabase_migrations.schema_migrations WHERE version = 'X'`

**Q: Does the drift-check detect if a local migration was never applied?**
A: No. Drift-check only cares if actual schema matches. Abandoned local files don't cause drift.

**Q: What does `supabase db remote commit` do?**
A: This command doesn't exist. The correct commands are:
  - `supabase db pull` = introspect remote schema
  - `supabase migration list --linked` = show applied migrations
  - `supabase db push --linked` = deploy pending migrations

**Q: Which local migration files are abandoned?**
A: Likely these (need verification in production):
  - 20251019_add_create_order_with_audit_rpc.sql (duplicate)
  - 20251019_add_batch_update_tables_rpc.sql (duplicate)
  - 20251019_add_version_to_orders.sql (duplicate)

---

## File Locations & Key Code

| Item | Location | Purpose |
|------|----------|---------|
| Deployment workflow | `.github/workflows/deploy-migrations.yml` | Auto-deploys migrations on git push |
| Deploy script | `./scripts/deploy-migration.sh` | Executes single migration to production |
| Drift detection | `.github/workflows/drift-check.yml` | Daily schema check |
| Sync script | `./scripts/post-migration-sync.sh` | Updates Prisma schema after deployment |
| Migration docs | `./supabase/migrations/README.md` | Naming convention & workflow |
| Connection guide | `./docs/SUPABASE_CONNECTION_GUIDE.md` | How to connect/manage migrations |
| History doc | `./docs/MIGRATION_RECONCILIATION_2025-10-20.md` | July 2025 bifurcation story |

---

## The Duplicates Problem

### Identical Content (PROBABLY ABANDONED):
- `20251019_add_create_order_with_audit_rpc.sql` (8-digit name)
- `20251019180800_add_create_order_with_audit_rpc.sql` (14-digit name) ← PROBABLY THE ONE APPLIED

### Different Content (NEEDS INVESTIGATION):
- `20251019_add_tax_rate_to_restaurants.sql` (default 0.0825)
- `20251019180000_add_tax_rate_to_restaurants.sql` (default 0.08) ← DIFFERENT!

### Intentional Files (DO NOT DELETE):
- `20251029145721_rollback_add_seat_number_to_orders.sql` (emergency rollback)
- `20251029155239_rollback_add_payment_fields_to_orders.sql` (emergency rollback)

---

## How to Verify Current State

```bash
# 1. See what's actually in production
psql "$DATABASE_URL" -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"

# 2. List local migration files
ls supabase/migrations/*.sql | grep -v rollback | sort

# 3. Compare (anything in #1 but not in #2 = remote-only)
# Anything in #2 but not in #1 = abandoned local file

# 4. Check drift status
npx prisma db pull  # pulls current schema
# If it differs from prisma/schema.prisma → DRIFT DETECTED
```

---

## Critical Insights

1. **Remote is canonical** - schema_migrations table is the source of truth
2. **Drift-check is partial** - only detects schema differences, not migration history issues
3. **Duplicates exist** - need manual audit to confirm which version was applied
4. **Naming inconsistent** - some files use 8-digit, some 14-digit timestamps (convention requires 14)
5. **Past divergence resolved** - July 2025 bifurcation was documented and fixed

---

## When to Use Which Tool

| Task | Tool | Command |
|------|------|---------|
| Deploy new migrations | GitHub (automated) | Just push to main |
| Check if migration is applied | psql | Query schema_migrations |
| See all applied migrations | supabase CLI | `supabase migration list --linked` |
| Update Prisma schema | Script | `./scripts/post-migration-sync.sh` |
| Check for drift | GitHub (daily) | Drift-check workflow or manual `prisma db pull` |
| Emergency rollback | Script | `./scripts/rollback-migration.sh <name>` |

