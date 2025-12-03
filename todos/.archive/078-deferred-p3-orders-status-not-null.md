---
status: deferred
priority: p3
issue_id: "078"
tags: [code-review, database, data-integrity]
dependencies: []
notes: |
  Deferred - Requires production database verification before implementation.
  Cannot add NOT NULL constraint without first confirming no NULL values exist.
  This is a defense-in-depth improvement, not a critical fix.
---

# Consider Adding NOT NULL Constraint to orders.status

## Problem Statement

The `orders.status` column allows NULL values (`status IS NULL OR status IN (...)`), but operationally no order should ever have a NULL status. This creates a theoretical data integrity gap.

**Why it matters**: While all code paths set status to 'pending' by default, the database allows NULL, meaning a bug or direct SQL could create orders in an undefined state.

## Findings

### Current State
- Prisma schema: `status String? @default("pending")` - nullable with default
- CHECK constraint: `status IS NULL OR status IN (...)`
- All creation paths set status explicitly
- OrderStateMachine requires valid status for all transitions

### Why NULL is Allowed
- Historical: Original schema may have needed NULL for migrations
- Flexibility: Allows data recovery scenarios
- Default handling: Relies on application-level defaults

### Risk Assessment
- **Probability**: Very low (all code paths set status)
- **Impact**: Medium (order with NULL status would be invisible to queries)
- **Current mitigation**: Application-level enforcement

## Proposed Solutions

### Option A: Add NOT NULL Constraint (Recommended if no NULL data)
**Description**: `ALTER TABLE orders ALTER COLUMN status SET NOT NULL`
**Pros**:
- Strongest data integrity
- Prevents accidental NULL values
**Cons**:
- Requires verifying no NULL values exist
- Slightly more restrictive
**Effort**: Tiny (30 minutes)
**Risk**: Low (verify no NULLs first)

### Option B: Keep Current (Acceptable)
**Description**: Leave as-is, document the design decision
**Pros**:
- No migration needed
- Flexibility preserved
**Cons**:
- Theoretical integrity gap remains
**Effort**: None
**Risk**: None

## Recommended Action
**Decision**: Keep as P3 backlog item. Requires production data verification before implementation.
**Rationale**: The CHECK constraint fix (075) was the critical path. Adding NOT NULL is defense-in-depth but not urgent.

## Technical Details

### Pre-Migration Check
```sql
-- Verify no NULL statuses exist
SELECT COUNT(*) FROM orders WHERE status IS NULL;
-- Expected: 0
```

### Migration (if proceeding)
```sql
-- First, ensure default is set
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

-- Then add NOT NULL
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;
```

### Affected Files
- `supabase/migrations/YYYYMMDDHHMMSS_add_not_null_to_orders_status.sql` (new)
- `prisma/schema.prisma` (update after `npx prisma db pull`)

## Acceptance Criteria
- [ ] Verified no NULL status values in production
- [ ] Migration created and tested
- [ ] Prisma schema updated to remove `?` from status

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-27 | Created from code review | Nice-to-have for data integrity |
| 2025-11-29 | Deferred during TODO backlog resolution | Requires production data verification before migration can be applied. Keep as backlog item for scheduled maintenance window. |

## Resources
- Current migration: `supabase/migrations/20251127155000_fix_orders_status_check_constraint.sql`
- Prisma schema: `prisma/schema.prisma` line 488
