---
status: complete
priority: p3
issue_id: "076"
tags: [code-review, database, migrations, documentation]
dependencies: []
---

# Create Rollback Migration File for orders_status_check Fix

## Problem Statement

The migration `20251127155000_fix_orders_status_check_constraint.sql` includes rollback instructions as comments but does not have a corresponding rollback migration file, which is inconsistent with project conventions.

**Why it matters**: Other migrations in the project follow the pattern of having companion rollback files (e.g., `20251029145721_rollback_add_seat_number_to_orders.sql`). Consistency aids maintainability.

## Findings

### Current State
- Rollback SQL exists in comments (lines 64-68 of migration)
- No separate rollback file created
- Project has 3 other rollback files following the pattern

### Evidence
```sql
-- From migration lines 64-68:
-- To rollback, run:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check
--   CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));
```

### Project Pattern
- `20251029145721_add_seat_number_to_orders.sql` has matching rollback file
- `20251029155239_add_payment_fields_to_orders.sql` has matching rollback file

## Proposed Solutions

### Option A: Create Rollback File (Recommended)
**Description**: Create `20251127155000_rollback_fix_orders_status_check_constraint.sql`
**Pros**:
- Follows project conventions
- Easy to execute if needed
**Cons**:
- Additional file to maintain
**Effort**: Tiny (15 minutes)
**Risk**: None

### Option B: Document in ADR
**Description**: Add note explaining why rollback file not needed for this case
**Pros**:
- Documents decision
**Cons**:
- Inconsistent with other migrations
**Effort**: Tiny (15 minutes)
**Risk**: None

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `supabase/migrations/20251127155000_rollback_fix_orders_status_check_constraint.sql` (new)

### Rollback File Content
```sql
-- Rollback: Restore original orders_status_check constraint
-- WARNING: Only use if the new constraint causes issues
-- This will REMOVE support for 'new', 'confirmed', 'picked-up' statuses

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'));

-- Note: Before running, ensure no orders have status values that will be invalid
-- SELECT COUNT(*) FROM orders WHERE status IN ('new', 'confirmed', 'picked-up');
```

## Acceptance Criteria
- [x] Rollback file created following project naming convention
- [x] Rollback SQL is valid and tested
- [x] Warning comments included about data implications

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-27 | Created from code review | Nice-to-have for consistency |
| 2025-11-27 | Rollback file created with pre-flight checks | Added comprehensive safety checks and validation |

## Resources
- Main migration: `supabase/migrations/20251127155000_fix_orders_status_check_constraint.sql`
- Pattern example: `supabase/migrations/20251029145721_rollback_add_seat_number_to_orders.sql`
