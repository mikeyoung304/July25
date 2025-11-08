# Archived Migrations

**Last Updated:** 2025-11-08

## Why These Migrations Were Archived

This archive contains migrations that were created locally but never deployed to production, or were superseded by alternative implementations. All archived migrations are documented with rationale and recovery instructions if needed.

### Archived Files

---

## November 2025 Archives (Date Archived: 2025-11-08)

**Reason:** Duplicate migrations with invalid 8-digit timestamps, superseded by proper 14-digit versions

These 4 migrations violate Supabase's required naming convention (14-digit `YYYYMMDDHHmmss` format) and have proper 14-digit equivalents that were deployed to production.

#### `20251019_add_create_order_with_audit_rpc.sql` (October 19, 2025)
**Status:** SUPERSEDED by `20251019180800_add_create_order_with_audit_rpc.sql`
**Why archived:** 8-digit timestamp violates Supabase naming convention (requires 14 digits)
**Deployed equivalent:** `20251019180800_*` (deployed to production)
**Safe to archive:** Yes - proper version deployed

#### `20251019_add_batch_update_tables_rpc.sql` (October 19, 2025)
**Status:** SUPERSEDED by `20251019202700_add_batch_update_tables_rpc.sql`
**Why archived:** 8-digit timestamp violates naming convention
**Deployed equivalent:** `20251019202700_*` (deployed to production)
**Safe to archive:** Yes - proper version deployed

#### `20251019_add_tax_rate_to_restaurants.sql` (October 19, 2025)
**Status:** SUPERSEDED by `20251019180000_add_tax_rate_to_restaurants.sql`
**Why archived:** 8-digit timestamp violates naming convention
**Deployed equivalent:** `20251019180000_*` (deployed to production)
**Safe to archive:** Yes - proper version deployed

#### `20251019_add_version_to_orders.sql` (October 19, 2025)
**Status:** SUPERSEDED by `20251019183600_add_version_to_orders.sql`
**Why archived:** 8-digit timestamp violates naming convention
**Deployed equivalent:** `20251019183600_*` (deployed to production)
**Safe to archive:** Yes - proper version deployed

**Recovery:** Do NOT restore - use the 14-digit equivalents already in production

---

## October 2025 Archives (Date Archived: 2025-10-20)

**Reason:** Schema conflict with remote database migrations during July-September 2025 bifurcation

#### `20250130_auth_tables.sql` (January 30, 2025)
**Status:** SUPERSEDED by remote migrations
**Remote equivalent:** Sept 4, 2025 auth core migrations (20250904121523-20250904121834)

**Why archived:**
- Remote database already has `user_pins`, `api_scopes`, and `role_scopes` tables
- Remote schema uses different column names than this migration expected
- Remote uses composite unique constraint `(user_id, restaurant_id)` instead of single `user_id`
- Remote has `is_member_of_restaurant()` RLS function (more advanced than this migration)

**Safe to archive:** Yes - Remote has superior implementation

#### `20250201_payment_audit_logs.sql` (February 1, 2025)
**Status:** OPTIONAL FEATURE, not deployed

**Why archived:**
- Feature creates `payment_audit_logs` table
- This feature is not currently used in production
- Can be re-applied later if payment audit logging is needed
- No blocking dependencies for other migrations

**Safe to archive:** Yes - Optional feature, can be restored if needed

## Context: July 2025 Migration Bifurcation

**What Happened:**

1. **July 13, 2025:** Project switched to "cloud-first" workflow
   - Empty migration `20250713130722_remote_schema.sql` created as reset point

2. **July 30 - Sept 4, 2025:** Schema changes made via Supabase Dashboard UI
   - 11 migrations applied directly to remote database
   - These were never committed to git or pulled locally

3. **Jan 30 - Oct 19, 2025:** Local migrations created in git
   - 10 migrations created (including these 2)
   - These were never pushed to remote database

**Result:** Two parallel timelines that never merged

## Reconciliation Strategy (Oct 20, 2025)

**Decision:** Archive conflicting local migrations, mark remote migrations as applied

**Rationale:**
- Remote database is production-ready and functional
- Remote schema is more advanced than these local migrations
- October P0 audit migrations are safe to apply to remote schema
- Preserves production functionality while deploying critical fixes

## Recovery (If Needed)

If these features need to be restored:

```bash
# For auth tables - DO NOT restore (use remote version)
# Remote has superior implementation

# For payment audit logs - safe to restore if feature needed
mv supabase/migrations/.archive/20250201_payment_audit_logs.sql supabase/migrations/
supabase db push --linked
```

## References

- **Migration Reconciliation Doc:** `MIGRATION_RECONCILIATION_2025-10-20.md`
- **Original Investigation:** `ORDER_FAILURE_INCIDENT_REPORT.md`
- **Source of Truth:** Remote Supabase database (xiwfhcikfdoshxwbtjxt.supabase.co)

---

**Archived by:** Claude Code (automated migration reconciliation)
**Reviewed by:** [To be filled by developer]
