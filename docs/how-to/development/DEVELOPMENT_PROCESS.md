# Development Process Guide

**Last Updated:** 2025-10-31

[Home](../../../index.md) > [Docs](../../README.md) > [How-To](../README.md) > [Development](./README.md) > Development Process

## Database Migration Best Practices

### Overview

This guide establishes best practices for database schema changes based on lessons learned from the Oct 28-30, 2025 migration cycle, where 6 consecutive migrations were required to fully implement multi-seat ordering and payment features.

### The Problem: Migration Churn

**Example from Oct 28-30, 2025:**
- ✅ Migration 1: Add `seat_number` to orders table
- ⚠️ Migration 2: Update `create_order_with_audit` RPC (forgot to include seat_number initially)
- ✅ Migration 3: Add 8 payment fields to orders table
- ⚠️ Migration 4: Update `create_order_with_audit` RPC for payment fields
- ⚠️ Migration 5: Fix VARCHAR vs TEXT type mismatch
- ⚠️ Migration 6: Convert payment columns to TEXT

**Result**: 6 migrations over 2 days, 4 of which were fixes.

**Ideal**: 1-2 migrations with complete planning upfront.

---

## Migration Planning Checklist

Before creating any database migration, complete this checklist:

### 1. Schema Design Phase

- [ ] List ALL table changes (columns, indexes, constraints)
- [ ] List ALL affected RPC functions/stored procedures
- [ ] List ALL affected database views
- [ ] Identify type consistency (prefer TEXT over VARCHAR in Postgres)
- [ ] Consider backward compatibility with deployed code
- [ ] Document rollback strategy

### 2. Impact Analysis

- [ ] Which API endpoints will be affected?
- [ ] Which client components consume this data?
- [ ] Are TypeScript types auto-generated? (Update after migration)
- [ ] Will existing queries break? (Add indexes if needed)
- [ ] Test queries against similar production data volume

### 3. Batch Related Changes

**DO**: Group logically related changes in ONE migration
```sql
-- ✅ GOOD: Single migration with table + RPC update
ALTER TABLE orders ADD COLUMN seat_number INTEGER;
DROP FUNCTION create_order_with_audit(...); -- Old signature
CREATE FUNCTION create_order_with_audit(..., p_seat_number INTEGER, ...) -- Updated
```

**DON'T**: Split table and RPC changes into separate migrations
```sql
-- ❌ BAD: Migration 1 - only table
ALTER TABLE orders ADD COLUMN seat_number INTEGER;

-- ❌ BAD: Migration 2 (next day) - forgot RPC update
DROP FUNCTION create_order_with_audit(...);
```

### 4. Type Consistency Checklist

PostgreSQL best practices:
- [ ] Use `TEXT` instead of `VARCHAR` (no performance difference, more flexible)
- [ ] Use `DECIMAL` for money (not FLOAT)
- [ ] Use `TIMESTAMPTZ` (with timezone) not `TIMESTAMP`
- [ ] Use `JSONB` (binary) not `JSON` (text)
- [ ] Ensure RPC parameter types EXACTLY match table column types

**Common Pitfall**: RPC returns `VARCHAR` but table uses `TEXT`
```sql
-- ❌ ERROR: "Returned type text does not match expected type character varying"
CREATE FUNCTION my_func() RETURNS TABLE (name VARCHAR) AS $$
  SELECT name FROM users; -- users.name is TEXT
$$;

-- ✅ CORRECT: Types match
CREATE FUNCTION my_func() RETURNS TABLE (name TEXT) AS $$
  SELECT name FROM users;
$$;
```

### 5. Testing Checklist

- [ ] Test migration on local database
- [ ] Test migration rollback locally
- [ ] Run `supabase db diff` to verify changes
- [ ] Test affected API endpoints
- [ ] Test with realistic data volume (not empty tables)
- [ ] Check for query performance regressions (EXPLAIN ANALYZE)
- [ ] Verify Supabase PostgREST schema cache reloads

### 6. Documentation Requirements

Every migration must include:
- [ ] Purpose comment at top of file
- [ ] Related tasks/tickets
- [ ] Rollback instructions
- [ ] Validation checks (DO $$ block at end)
- [ ] Updated comments on new columns/functions

---

## Migration File Template

```sql
-- ============================================================================
-- Migration: YYYYMMDD_HHMMSS_descriptive_name
-- ============================================================================
-- Purpose: [What this migration does and why]
-- Author: [Your name or team]
-- Created: YYYY-MM-DD
-- Related:
--   - Task/Ticket: [Reference]
--   - Depends on: [Previous migrations if any]
-- Rollback: See rollback section at end
-- ============================================================================

-- UP MIGRATION
-- ============================================================================

-- 1. Table changes
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col TEXT;
COMMENT ON COLUMN my_table.new_col IS 'Description of purpose';

-- 2. Index changes
CREATE INDEX IF NOT EXISTS idx_my_table_new_col ON my_table(new_col);

-- 3. RPC/Function updates (if table changes affect functions)
DROP FUNCTION IF EXISTS my_function(old_signature);
CREATE FUNCTION my_function(new_signature) RETURNS ... AS $$
  -- Updated implementation
$$ LANGUAGE plpgsql;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION my_function TO authenticated;

-- 5. Notify PostgREST
NOTIFY pgrst, 'reload schema';

-- VALIDATION
-- ============================================================================
DO $$
DECLARE
  v_column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'my_table' AND column_name = 'new_col'
  ) INTO v_column_exists;

  IF NOT v_column_exists THEN
    RAISE EXCEPTION 'Migration validation failed: new_col not found';
  END IF;

  RAISE NOTICE '✓ Migration successful';
END $$;

-- ROLLBACK
-- ============================================================================
-- To rollback this migration:
--
-- DROP FUNCTION IF EXISTS my_function(new_signature);
-- CREATE FUNCTION my_function(old_signature) ... -- Restore old version
-- DROP INDEX IF EXISTS idx_my_table_new_col;
-- ALTER TABLE my_table DROP COLUMN IF EXISTS new_col;
```

---

## When to Create Multiple Migrations

It's acceptable to split migrations when:

1. **Feature flags**: Schema change ships before feature is enabled
2. **Large data migrations**: Separate DDL from data backfill
3. **High-risk changes**: Test table changes before function updates
4. **Cross-team coordination**: Different teams own different parts

**Always coordinate**: If you split migrations, document dependencies clearly.

---

## Migration Approval Process

For changes affecting >2 tables or >5 columns:

1. Create design doc in `docs/migrations/`
2. Run `supabase db diff` and attach to PR
3. Peer review schema changes
4. Test on staging environment
5. Schedule deployment window (if breaking)

---

## Emergency Rollback Procedure

If a migration causes production issues:

```bash
# 1. Identify the migration
supabase migration list

# 2. Rollback (if rollback file exists)
psql $DATABASE_URL < supabase/migrations/YYYYMMDD_rollback_name.sql

# 3. Repair Supabase migration history
supabase migration repair YYYYMMDD --status reverted

# 4. Notify team and create incident report
```

---

## Tools and Resources

- `supabase db diff`: Generate migration from local schema changes
- `supabase db push`: Apply migrations to remote database
- `supabase migration repair`: Fix migration history mismatches
- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Type Best Practices](https://wiki.postgresql.org/wiki/Don%27t_Do_This)

---

## Success Metrics

Track these metrics to measure improvement:

- **Fix-to-feature ratio**: Target 2:1 or lower (currently 8.5:1)
- **Migrations per feature**: Target 1-2 (currently averaging 3-4)
- **Type mismatch errors**: Target 0 (occurred 2x in Oct 28-30)
- **Rollbacks in production**: Target 0

---

## Questions?

When in doubt:
1. Review recent migrations for patterns
2. Ask for peer review BEFORE creating migration
3. Test locally with production-like data
4. Batch related changes when possible

**Remember**: Taking 30 minutes to plan a migration saves hours of fixing break-fix cycles.

---

## Related Documentation

- [CI/CD Workflows](./CI_CD_WORKFLOWS.md) - Automation and deployment
- [Supabase Connection Guide](../../SUPABASE_CONNECTION_GUIDE.md) - Database workflows
- [Database Schema](../../reference/schema/DATABASE.md) - Schema reference
- [Getting Started](../../tutorials/GETTING_STARTED.md) - Development setup
- [Contributing Guide](./CONTRIBUTING.md) - Development standards

---

**Last Updated:** October 30, 2025
**Version:** 6.0.14
