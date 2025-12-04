---
status: ready
priority: p2
issue_id: "166"
tags: [code-review, performance, database, 86-item-management]
dependencies: []
created_date: 2025-12-04
source: pr-152-review
---

# Missing Database Indexes for Menu Queries

## Problem Statement

Menu queries filter on multiple columns but only `restaurant_id` has an index. Missing composite indexes will cause performance degradation on large menus.

## Findings

### Agent Discovery

**Performance Oracle:** Identified missing indexes as P1 performance issue

### Evidence

```sql
-- Current: Only single-column index exists
CREATE INDEX idx_menu_items_restaurant_id ON menu_items (restaurant_id);

-- Queries filter on BOTH restaurant_id AND active
.eq('restaurant_id', restaurantId)
.eq('active', true)  -- No index support for this filter
```

### Performance Impact

- With 1,000 menu items: ~5-10ms query time
- With 10,000 items (multi-restaurant): ~50-100ms query time
- Sequential scans on `active` column after index lookup

## Proposed Solutions

### Solution A: Add Composite Indexes (Recommended)

**Effort:** Small (30 min) | **Risk:** Low (online index creation)

```sql
-- Create composite indexes for optimal query performance
CREATE INDEX CONCURRENTLY idx_menu_items_restaurant_active
  ON menu_items (restaurant_id, active)
  WHERE active = true;

CREATE INDEX CONCURRENTLY idx_menu_categories_restaurant_active
  ON menu_categories (restaurant_id, active)
  WHERE active = true;

-- Optional: Add is_available for customer-facing queries
CREATE INDEX CONCURRENTLY idx_menu_items_availability
  ON menu_items (restaurant_id, active, available)
  WHERE active = true AND available = true;
```

## Recommended Action

Create migration with composite indexes using CONCURRENTLY to avoid table locks.

## Technical Details

**Migration File:** `supabase/migrations/20251204_menu_composite_indexes.sql`

**Affected Queries:**
- `getFullMenu()`: Lines 69-84
- `getItems()`: Lines 119-124
- `getCategories()`: Lines 187-191

## Acceptance Criteria

- [ ] Migration file created
- [ ] Indexes created with CONCURRENTLY
- [ ] Query performance improved (measure before/after)
- [ ] No table locks during deployment

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-04 | Created | From PR #152 multi-agent review |

## Resources

- PostgreSQL partial indexes documentation
- PR #152: feat(menu): implement 86-item management
