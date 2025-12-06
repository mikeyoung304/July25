---
status: complete
priority: p1
issue_id: "108"
tags: [security, rls, database, code-review, data-integrity]
dependencies: []
created_date: 2025-12-02
source: pr-151-review
---

# CRITICAL: INSERT Policy Missing IS NOT NULL Check (order_status_history)

## Problem Statement

The `order_status_history` INSERT policy does not validate `restaurant_id IS NOT NULL`, creating policy asymmetry that allows orphaned, unreachable rows.

## Findings

### Data Integrity Agent Discovery

**SELECT Policy** (lines 22-26):
```sql
FOR SELECT USING (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);
```

**INSERT Policy** (lines 29-30):
```sql
FOR INSERT WITH CHECK (restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid);
```

### The Problem

- SELECT requires: `restaurant_id IS NOT NULL`
- INSERT allows: NULL values (comparison `NULL = X` evaluates falsy but doesn't prevent insertion)

### Impact

1. Tenants can INSERT rows with NULL `restaurant_id`
2. Those rows immediately become invisible to ALL tenants
3. Creates "orphaned" audit data that wastes storage
4. Violates least surprise principle - write succeeds but read fails
5. Audit trail gaps - missing status history entries

### Evidence

- Prisma schema confirms nullable: `restaurant_id String? @db.Uuid`
- voice_order_logs correctly has NOT NULL constraint and no asymmetry

## Proposed Solutions

### Option A: Fix INSERT Policy (Recommended)
**Pros:** Matches SELECT policy, prevents orphaned data
**Cons:** None
**Effort:** Small (5 min)
**Risk:** Low

```sql
CREATE POLICY "tenant_insert_order_status_history" ON order_status_history
FOR INSERT WITH CHECK (
  restaurant_id IS NOT NULL
  AND restaurant_id = (auth.jwt() ->> 'restaurant_id')::uuid
);
```

### Option B: Leave As-Is
**Pros:** None
**Cons:** Allows data integrity violations
**Effort:** None
**Risk:** HIGH - orphaned rows accumulate

## Recommended Action

Option A - Fix INSERT policy immediately

## Technical Details

### Affected Files
- `supabase/migrations/20251203_audit_tables_rls.sql` (lines 29-30)

### Related Policies
- UPDATE policy (lines 33-38) also needs `IS NOT NULL` in USING clause
- DELETE policy (lines 41-44) also needs `IS NOT NULL` in USING clause

## Acceptance Criteria

- [ ] INSERT policy includes `restaurant_id IS NOT NULL` check
- [ ] UPDATE policy includes `IS NOT NULL` in USING clause
- [ ] DELETE policy includes `IS NOT NULL` in USING clause
- [ ] Policies are symmetric with SELECT policy
- [ ] Test: INSERT with NULL restaurant_id fails with RLS error

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #151 review |

## Resources

- PR #151: https://github.com/mikeyoung304/July25/pull/151
- Related: TODO-103 (original RLS migration)
