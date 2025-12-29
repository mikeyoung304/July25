# TODO-211: Migration References Non-Existent table_id Column

**Priority:** P1 (Critical - Migration will fail)
**Category:** Database / Data Integrity
**Source:** Code Review - Data Integrity Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The migration `20251226_orders_composite_indexes.sql` creates an index on `table_id` column:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_table_status
ON orders (table_id, status) WHERE table_id IS NOT NULL;
```

**THE `table_id` COLUMN DOES NOT EXIST IN THE ORDERS TABLE.**

The orders table schema (from Prisma) shows:
- `id`, `restaurant_id`, `status`, `source`, `customer_name`, etc.
- NO `table_id` column

This migration WILL FAIL when deployed to production with:
```
ERROR: column "table_id" does not exist
```

## Files Affected

- `supabase/migrations/20251226_orders_composite_indexes.sql` (lines 12-14)

## Resolution

Either:
1. **Remove the index** - if table_id is not needed
2. **Add the column first** - if table_id should exist (requires separate migration)

The correct column may be `table_number` (text) which does exist, but indexing a text column for status lookups is unusual.

## Verification

```bash
# Check actual orders table schema
npx prisma db pull && grep -A 50 "model orders" prisma/schema.prisma

# Or via Supabase
supabase db dump --schema public | grep -A 30 "CREATE TABLE.*orders"
```

## Impact

- **Deployment blocker** - Migration will fail
- **No data loss risk** - Migration hasn't been applied yet
