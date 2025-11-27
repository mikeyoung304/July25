# CL-DB-002: Database Constraint Drift

**Severity:** P1 | **Cost:** $5K | **Duration:** 4 hours | **Commits:** 20251127

## Problem

TypeScript state machine had 8 order statuses, database CHECK constraint only had 5. KDS failed with error 23514 when trying to set `status = 'confirmed'`. Constraint drift was invisible until production broke.

## Bug Pattern

```typescript
// TypeScript defines valid statuses
type OrderStatus = 'new' | 'pending' | 'confirmed' | 'preparing' |
                   'ready' | 'picked-up' | 'completed' | 'cancelled';

// But database constraint only allows 5
// CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled'))
// Missing: 'new', 'confirmed', 'picked-up'
// Result: ERROR 23514 when code tries to use valid TypeScript status
```

## Fix Pattern

```sql
-- When modifying TypeScript enums/unions with DB constraints:
-- 1. Update shared/types/*.ts
-- 2. Update server/src/services/*StateMachine.ts
-- 3. Create migration:
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IS NULL OR status IN (
    'new', 'pending', 'confirmed', 'preparing',
    'ready', 'picked-up', 'completed', 'cancelled'
  ));
```

## Prevention Checklist

- [ ] When adding enum/union values, check for matching DB constraints
- [ ] Search codebase: `grep -r "CHECK.*status" supabase/migrations/`
- [ ] Query production: `SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass`
- [ ] Add integration test that inserts each valid enum value
- [ ] PR checklist item: "Did you update DB constraints for enum changes?"

## Detection

- ERROR 23514: CHECK constraint violation
- Error message: "violates check constraint [table]_[column]_check"
- Works with some values but fails with others
- TypeScript compiles, but runtime DB operations fail

## Key Insight

**TypeScript types and DB constraints are separate sources of truth.** Changes to one don't automatically update the other. Always grep for CHECK constraints when modifying enums.
