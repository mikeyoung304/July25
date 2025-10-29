# Migration Baseline Documentation

**Date:** 2025-10-22
**Last Updated:** 2025-10-29
**Baseline Migration:** `20250713130722_remote_schema.sql`
**Purpose:** Document the migration history baseline to resolve forked migration tracking

---

## 🤖 AI Agent Quick Start

**TL;DR:** Prisma schema is the source of truth. Migration files are history.

**Key Principles:**
1. 🎯 **Prisma = Current State** - `prisma/schema.prisma` reflects actual production database
2. 📜 **Migrations = History** - `.sql` files in `supabase/migrations/` are a changelog
3. ⚡ **Auto-Sync Required** - Always run `./scripts/post-migration-sync.sh` after migrations
4. 🚫 **Don't Use Archived Migrations** - Pre-baseline migrations in `.archive/` are for reference only

**Normal Workflow:**
1. Create migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Test locally: `./scripts/deploy-migration.sh supabase/migrations/your-file.sql`
3. Sync Prisma: `./scripts/post-migration-sync.sh` ⚠️ CRITICAL - Don't skip this!
4. Commit both: Migration + updated Prisma schema
5. Push to main: CI/CD deploys to production

**Why This Matters:**
- Before October 2025: Manual Dashboard changes + inconsistent migrations = chaos
- After October 2025: Prisma introspection + automated sync + CI/CD = stability

**Related Documentation:**
- Deployment workflow → [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)
- CI/CD automation → [../docs/CI_CD_WORKFLOWS.md](../docs/CI_CD_WORKFLOWS.md)
- Connection/troubleshooting → [../docs/SUPABASE_CONNECTION_GUIDE.md](../docs/SUPABASE_CONNECTION_GUIDE.md)

---

## Background

Prior to October 2025, Restaurant OS database schema was managed primarily through Supabase Dashboard changes, with migrations created in git but not consistently deployed. This created a "forked" migration history where:

- **Local git** contained migrations that were never deployed to production
- **Remote Supabase** contained schema created via Dashboard with some migrations tracked

This made `supabase db push --linked` fail with conflicts about migrations being inserted before the last remote migration.

## The Fork

### Pre-Baseline Migrations (Archived)

These migrations were created in git but **never deployed** to production Supabase:

- `20250130_auth_tables.sql` - User profiles, user_restaurants, user_pins tables
- `20250201_payment_audit_logs.sql` - Payment audit logs table

**Status:** Moved to `.archive/` folder on 2025-10-22 during Phase 1.3 cleanup.

The tables these migrations attempted to create either:
1. Already exist in production (created via Dashboard)
2. Were created in different migrations with different schemas
3. Are not needed

## Baseline

**Migration:** `20250713130722_remote_schema.sql`
**Date:** July 13, 2025
**Significance:** First migration in Supabase remote tracking table

This represents the "ground truth" baseline. All migrations from this point forward are tracked in both:
- Local git repository (`supabase/migrations/`)
- Remote Supabase tracking table (`supabase_migrations.schema_migrations`)

## Migration History After Baseline

All migrations after `20250713130722` are tracked and deployed:

```
20250713130722  remote_schema (baseline)
20251013        emergency_kiosk_demo_scopes
20251014        scheduled_orders
20251015        multi_tenancy_rls_and_pin_fix
20251018        add_customer_role_scopes
20251019180000  add_tax_rate_to_restaurants
20251019180800  add_create_order_with_audit_rpc
20251019183600  add_version_to_orders
20251019202700  add_batch_update_tables_rpc
20251020221553  fix_create_order_with_audit_version
20251021000000  update_tax_rate_to_0_08
20251021231910  add_created_at_to_order_status_history
20251022033200  fix_rpc_type_mismatch
```

## Resolution Steps (Phase 1.3)

1. **Removed pre-baseline migrations** from `supabase/migrations/`:
   - Deleted `20250130_auth_tables.sql` (already in .archive)
   - Deleted `20250201_payment_audit_logs.sql` (already in .archive)

2. **Established Prisma as source of truth**:
   - Introspected entire production schema into `prisma/schema.prisma`
   - Captures actual table structures with correct types
   - Generates TypeScript types for compile-time safety

3. **Created post-migration sync script**:
   - `scripts/post-migration-sync.sh`
   - Automatically syncs Prisma schema after migrations
   - Prevents future schema drift

## Current State

- **Local git**: Clean migration history from baseline forward
- **Prisma schema**: Represents actual production schema
- **Workflow**: Migrations deployed via psql directly, then synced to Prisma

## Future: Proper Migration Workflow

Once migration history is fully repaired:

1. Create migration: `supabase migration new <name>`
2. Write SQL changes
3. Deploy: `supabase db push --linked`
4. Sync Prisma: `./scripts/post-migration-sync.sh`
5. Commit all changes to git

This workflow is being automated in Phase 2 (CI/CD) and Phase 3 (Claude Code commands).

## Verification

To verify migration history is in sync:

```bash
# Check local migrations
ls -1 supabase/migrations/*.sql

# Check remote migrations (requires connection)
echo "SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;" | \
  psql "$DATABASE_URL" -t

# Check schema matches
npx prisma db pull
git diff prisma/schema.prisma  # Should show no changes
```

## Related Documentation

- `POST_MORTEM_SCHEMA_DRIFT_2025-10-21.md` - Incidents that led to Phase 1.3
- `SUPABASE_CONNECTION_GUIDE.md` - Authoritative guide for Supabase workflows
- `scripts/post-migration-sync.sh` - Post-migration Prisma sync script
- `prisma/schema.prisma` - Single source of truth for database schema
