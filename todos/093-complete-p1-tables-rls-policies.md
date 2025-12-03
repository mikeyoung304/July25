---
status: complete
priority: p1
issue_id: "093"
tags: [security, database, rls, multi-tenancy]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
source: code-review-security-agent
resolution: Already implemented in supabase/migrations/20251202_comprehensive_rls.sql
---

# CRITICAL: Missing RLS Policies on `tables` Table

## Problem

The `tables` database table lacks Row Level Security (RLS) policies. This creates a critical security vulnerability where:

1. Any authenticated user could potentially access/modify tables from other restaurants
2. Multi-tenant isolation is not enforced at the database level
3. The defense-in-depth security model has a gap at the data layer

## Risk Assessment

- **Severity:** CRITICAL
- **Impact:** Cross-tenant data access possible
- **Likelihood:** Medium (requires authenticated user + API knowledge)
- **CVSS Estimate:** 7.5+ (High)

## Current State

```sql
-- tables table has NO RLS policies
-- Compare to orders table which has proper RLS:
-- CREATE POLICY "Users can only see their restaurant's orders" ON orders
--   FOR SELECT USING (auth.uid() = user_id OR restaurant_id = current_restaurant_id());
```

## Required Fix

Add RLS policies to the `tables` table:

```sql
-- Enable RLS on tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their restaurant's tables
CREATE POLICY "tenant_isolation_select" ON tables
  FOR SELECT
  USING (restaurant_id = auth.jwt() ->> 'restaurant_id');

-- Policy: Users can only update their restaurant's tables
CREATE POLICY "tenant_isolation_update" ON tables
  FOR UPDATE
  USING (restaurant_id = auth.jwt() ->> 'restaurant_id');

-- Policy: Users can only insert into their restaurant
CREATE POLICY "tenant_isolation_insert" ON tables
  FOR INSERT
  WITH CHECK (restaurant_id = auth.jwt() ->> 'restaurant_id');

-- Policy: Users can only delete from their restaurant
CREATE POLICY "tenant_isolation_delete" ON tables
  FOR DELETE
  USING (restaurant_id = auth.jwt() ->> 'restaurant_id');

-- Service role bypass for admin operations
CREATE POLICY "service_role_bypass" ON tables
  USING (auth.role() = 'service_role');
```

## Verification Steps

1. Create migration file in `supabase/migrations/`
2. Apply to local Supabase: `supabase db push`
3. Test with multi-tenant test suite
4. Deploy to production Supabase

## Files to Modify

- `supabase/migrations/YYYYMMDD_add_tables_rls.sql` (new)
- Verify existing tables API endpoints respect RLS

## References

- OWASP: Broken Access Control (A01:2021)
- Related: TODO 092 (multi-tenant tests missing)
- ADR-004: Multi-tenancy architecture
