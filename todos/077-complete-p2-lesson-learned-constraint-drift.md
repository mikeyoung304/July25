---
status: complete
priority: p2
issue_id: "077"
tags: [code-review, documentation, lessons-learned, database]
dependencies: []
---

# Create Lesson Learned Document for Constraint Drift

## Problem Statement

A production P1 incident occurred because the database CHECK constraint on `orders.status` drifted out of sync with the TypeScript state machine. This pattern should be documented to prevent recurrence.

**Why it matters**: The project has a lessons-learned system (`.claude/lessons/`) but no lesson exists for database constraint drift. Future developers need guidance on maintaining constraint-type alignment.

## Findings

### Incident Summary
- **Error**: PostgreSQL 23514 (CHECK constraint violation)
- **Impact**: KDS could not update order status
- **Root Cause**: Constraint had 5 statuses, code had 8
- **Resolution**: Migration to update constraint

### Related Lessons
- `CL-DB-001-migration-sync.md` - Migration sync process (different issue)
- No existing lesson for constraint drift

### Pattern to Document
1. TypeScript types define valid values
2. Database constraints enforce those values
3. Changes to types require matching constraint updates
4. No automated validation catches drift

## Proposed Solutions

### Option A: Create CL-DB-002 Lesson (Recommended)
**Description**: Document constraint drift pattern with detection and prevention
**Pros**:
- Follows established lessons format
- Prevents future incidents
**Cons**:
- None
**Effort**: Small (1-2 hours)
**Risk**: None

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `.claude/lessons/CL-DB-002-constraint-drift-prevention.md` (new)
- `.claude/lessons/README.md` (update index)

### Lesson Content Outline
```markdown
# CL-DB-002: Database Constraint Drift Prevention

## Problem Pattern
TypeScript types and database CHECK constraints can drift out of sync...

## Detection
- PostgreSQL error 23514 (CHECK constraint violation)
- Error message: "violates check constraint X"

## Prevention
1. When modifying TypeScript enums/union types that have DB constraints:
   - Update shared/types/*.ts
   - Update server/src/services/*StateMachine.ts
   - Create migration to update CHECK constraint
   - Run constraint alignment test

2. Add to PR checklist: "Did you update DB constraints?"

## Example
The `OrderStatus` type has 8 values that must match `orders_status_check` constraint.
```

## Acceptance Criteria
- [ ] Lesson file created in `.claude/lessons/`
- [ ] README.md updated with lesson reference
- [ ] CLAUDE.md references lesson for DB work

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-27 | Created from code review | Document incident for future prevention |

## Resources
- Migration fix: `supabase/migrations/20251127155000_fix_orders_status_check_constraint.sql`
- Existing lesson: `.claude/lessons/CL-DB-001-migration-sync.md`
