# TODO-226: CONCURRENTLY Keyword May Fail in Migration Context

**Priority:** P3 (Minor - Operational)
**Category:** Database
**Source:** Code Review - Data Integrity Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)

## Observation

The migration uses `CONCURRENTLY`:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_restaurant_status
ON orders (restaurant_id, status);
```

## Potential Issue

`CREATE INDEX CONCURRENTLY` cannot run inside a transaction, but Supabase migrations may run in transactions by default.

Symptoms:
```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

## Resolution Options

### Option 1: Remove CONCURRENTLY
```sql
-- Simpler, works in transactions
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status
ON orders (restaurant_id, status);
```

Trade-off: Table is locked during creation (brief for small tables)

### Option 2: Separate Script
Run index creation outside migrations using a separate script.

### Option 3: Supabase CLI Option
```bash
# Some tools support non-transactional migrations
supabase db push --include-all
```

## Files Affected

- `supabase/migrations/20251226_orders_composite_indexes.sql`

## Verification

```bash
# Test migration locally
supabase db reset --local
```

## Impact

- Migration may fail on first attempt
- Easy to fix if it occurs
- Low priority since indexes already exist
