---
title: Database Constraint Drift - TypeScript Enum vs CHECK Constraint
category: database-issues
severity: P1
cost: $5K
duration: 4 hours
symptoms:
  - "ERROR 23514: CHECK constraint violation"
  - Works with some values but fails with others
  - TypeScript compiles, but runtime DB operations fail
root_cause: TypeScript had 8 order statuses, database CHECK constraint only had 5
tags: [database, constraints, enums, typescript]
created_date: 2025-11-27
---

# Database Constraint Drift

## Problem

TypeScript state machine had 8 order statuses, database CHECK constraint only had 5. KDS failed with error 23514 when trying to set `status = 'confirmed'`.

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
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IS NULL OR status IN (
    'new', 'pending', 'confirmed', 'preparing',
    'ready', 'picked-up', 'completed', 'cancelled'
  ));
```

## Prevention

- When adding enum values, check for matching DB constraints
- Search: `grep -r "CHECK.*status" supabase/migrations/`
- Query: `SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass`
- Add integration test that inserts each valid enum value

## Key Insight

**TypeScript types and DB constraints are separate sources of truth.** Changes to one don't automatically update the other.
