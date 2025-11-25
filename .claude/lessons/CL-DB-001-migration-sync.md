# CL-DB-001: Migration Bifurcation & Schema Drift

**Severity:** P0 | **Cost:** $67K | **Duration:** 97 days diverged | **Commits:** 20251021, 20251022

## Problem

Remote migrations (Supabase Dashboard) and local migrations (git) diverged for 3 months. Code deployed expecting columns that didn't exist in production. Three cascading incidents in 24 hours.

## Bug Pattern

```sql
-- ERROR 42703: column "tax_rate" does not exist
-- Migration was in git but NEVER deployed to production

-- ERROR 42804: VARCHAR vs TEXT type mismatch
-- RPC function used VARCHAR, table used TEXT
RETURNS TABLE (order_number VARCHAR)  -- WRONG
-- Table has: order_number TEXT
```

## Fix Pattern

```bash
# After ANY Supabase Dashboard change:
npx prisma db pull              # Sync Prisma schema from remote
supabase db pull                # Get migration SQL

# Before deploying code that uses new columns:
supabase migration list --linked  # Check alignment
supabase db push --linked         # Deploy pending migrations

# Migration timestamps MUST be 14 digits:
20251119143022_add_column.sql    # CORRECT (YYYYMMDDHHmmss)
20251119_add_column.sql          # WRONG (causes duplicate key error)
```

## Prevention Checklist

- [ ] Remote database is TRUTH, git is documentation
- [ ] Run `prisma db pull` after ANY Dashboard change
- [ ] Use 14-digit timestamps (YYYYMMDDHHmmss) for migrations
- [ ] RPC RETURNS TABLE types must EXACTLY match table column types
- [ ] Deploy migrations BEFORE deploying code that uses new columns
- [ ] Check `supabase migration list --linked` before production deploy

## Detection

- ERROR 42703: column does not exist
- ERROR 42804: type mismatch (VARCHAR vs TEXT, TIMESTAMP vs TIMESTAMPTZ)
- ERROR 23505: duplicate key (timestamp collision)
- Works locally, 500 errors in production

## Key Insight

**Committing to git ≠ deployed to production.** Always verify with `supabase migration list --linked`.
