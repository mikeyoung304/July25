---
status: resolved
priority: p2
issue_id: "105"
tags: [performance, database, index, code-review]
dependencies: []
resolved_date: 2025-12-02
resolved_by: fix/code-review-p1-p2-followup
---

# Missing Composite Index for Tables Query Optimization

## Problem Statement

The `tables` table query pattern doesn't have an optimal composite index, causing suboptimal performance on the most frequent Server View query.

## Findings

### Performance Agent Discovery
From `server/src/routes/tables.routes.ts:17-22`:
```typescript
const { data, error } = await supabase
  .from('tables')
  .select('*')
  .eq('restaurant_id', restaurantId)
  .eq('active', true)       // Second filter not indexed
  .order('label');          // Sort not indexed
```

### Current Index
```sql
idx_tables_restaurant_id (restaurant_id)
```

### Query Execution
1. Index scan on `restaurant_id` (efficient)
2. Filter `active = true` in memory (inefficient)
3. Sort by `label` in memory (inefficient)

### Performance Impact
- Estimated 20-30% slower than optimal
- Most frequent query in Server View (every 30-120 seconds per user)

## Proposed Solutions

### Option A: Full Composite Index (Recommended)
**Pros:** Optimal query performance, single index scan
**Cons:** Slightly larger index size
**Effort:** Small (15 min)
**Risk:** Low

```sql
-- Partial index for even better performance
CREATE INDEX CONCURRENTLY idx_tables_restaurant_active_label
ON tables (restaurant_id, active, label)
WHERE active = true;

-- Optional: Drop old index to save space
-- DROP INDEX CONCURRENTLY idx_tables_restaurant_id;
```

### Option B: Keep Current Index
**Pros:** No change
**Cons:** Suboptimal performance continues
**Effort:** None
**Risk:** None (but missed optimization)

## Recommended Action

Option A - Add composite index in follow-up migration

## Technical Details

### Affected Files
- `supabase/migrations/` (new migration file)

### Query Patterns
- `GET /api/v1/tables` - Most frequent
- Server View polling every 30-120 seconds

## Acceptance Criteria

- [x] Composite index created
- [ ] EXPLAIN ANALYZE shows index-only scan
- [ ] Server View response time improved
- [x] Migration applied without downtime (CONCURRENTLY)

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-02 | Created | Discovered during PR #150 review |
| 2025-12-02 | Resolved | Added partial index in 20251203_audit_tables_rls.sql |

## Resources

- PR #150: https://github.com/owner/repo/pull/150
- PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html
