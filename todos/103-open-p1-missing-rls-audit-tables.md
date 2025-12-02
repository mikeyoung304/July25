---
status: resolved
priority: p1
issue_id: "103"
tags: [security, rls, code-review, database]
dependencies: []
resolved_date: 2025-12-02
resolved_by: fix/code-review-p1-p2-followup
---

# Missing RLS on Audit Tables (order_status_history, voice_order_logs)

## Problem Statement

Two multi-tenant tables with `restaurant_id` columns lack Row Level Security policies:
- `order_status_history` - Order state transition audit trail
- `voice_order_logs` - Voice ordering transcriptions and session data

Without RLS, client-side Supabase queries using anon key could access cross-tenant data from these tables.

## Findings

### Security Agent Discovery
- The comprehensive RLS migration (20251202) covers 6 tables but misses these 2
- `order_status_history.restaurant_id` is nullable (additional risk)
- `voice_order_logs.restaurant_id` is NOT NULL
- Both tables contain sensitive operational data

### Evidence
```sql
-- Tables with restaurant_id but NO RLS from migration:
order_status_history  -- Order audit trail
voice_order_logs      -- Voice transcriptions
```

### Attack Vector
1. Attacker authenticates with Restaurant A credentials
2. Uses Supabase client-side queries directly against these tables
3. Can read order transitions and voice transcriptions from ALL restaurants

## Proposed Solutions

### Option A: Add Full RLS Policies (Recommended)
**Pros:** Complete protection, consistent with other tables
**Cons:** Additional migration file
**Effort:** Small (30 min)
**Risk:** Low

```sql
-- order_status_history (handle nullable restaurant_id)
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access_order_status_history" ON order_status_history
FOR ALL
USING (restaurant_id IS NOT NULL AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_order_status_history" ON order_status_history
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- voice_order_logs
ALTER TABLE voice_order_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access_voice_order_logs" ON voice_order_logs
FOR ALL
USING (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid)
WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);

CREATE POLICY "service_role_voice_order_logs" ON voice_order_logs
FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Option B: Server-Only Access Pattern
**Pros:** No RLS complexity
**Cons:** Relies on application layer only, violates defense-in-depth
**Effort:** Small
**Risk:** High (single layer of protection)

## Recommended Action

Option A - Add full RLS policies in follow-up migration

## Technical Details

### Affected Files
- `supabase/migrations/` (new migration file)

### Related Tables
- `order_status_history` - prisma/schema.prisma
- `voice_order_logs` - prisma/schema.prisma

## Acceptance Criteria

- [x] RLS enabled on `order_status_history`
- [x] RLS enabled on `voice_order_logs`
- [x] Service role bypass policies added
- [ ] Integration tests verify tenant isolation
- [ ] Migration applied to production

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #150 review |
| 2025-12-02 | Resolved | Migration added in 20251203_audit_tables_rls.sql |

## Resources

- PR #150: https://github.com/owner/repo/pull/150
- Related: TODO-093 (tables RLS - resolved)
- Supabase RLS docs: https://supabase.com/docs/guides/database/postgres/row-level-security
