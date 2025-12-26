# TODO-212: Duplicate Composite Indexes Already Exist

**Priority:** P1 (Critical - Technical Debt / Wasted Resources)
**Category:** Database / Performance
**Source:** Code Review - Performance Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Problem

The migration `20251226_orders_composite_indexes.sql` creates indexes that already exist:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status
ON orders (restaurant_id, status);
```

This index already exists in `20251015_multi_tenancy_rls_and_pin_fix.sql` (line 147):
```sql
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
ON orders(restaurant_id, status);
```

Using `IF NOT EXISTS` prevents errors but:
1. Indicates lack of awareness of existing indexes
2. Suggests migration wasn't validated against current schema
3. Creates confusion about index ownership

## Files Affected

- `supabase/migrations/20251226_orders_composite_indexes.sql` (lines 6-8)
- `supabase/migrations/20251015_multi_tenancy_rls_and_pin_fix.sql` (line 147)

## Resolution

1. Remove duplicate index definitions from new migration
2. Document which migration owns each index
3. Consider creating an index audit script

```bash
# Check for duplicate index definitions
grep -r "CREATE INDEX.*orders" supabase/migrations/ | sort
```

## Verification

```sql
-- Check existing indexes on orders table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'orders';
```

## Impact

- Migration will succeed (due to IF NOT EXISTS)
- Creates technical debt and confusion
- May indicate need for index management tooling
