---
status: complete
priority: p2
issue_id: "075"
tags: [code-review, database, testing, constraint-drift]
dependencies: []
---

# Add Automated Test for DB Constraint Alignment

## Problem Statement

The `orders_status_check` database constraint drifted out of sync with the TypeScript state machine, causing KDS to fail with error 23514 (CHECK constraint violation). This was only discovered when production broke.

**Why it matters**: No automated test validates that database CHECK constraints match the TypeScript type definitions, allowing silent drift that manifests as production errors.

## Findings

### Discovery
- Constraint originally had 5 statuses: `pending, preparing, ready, completed, cancelled`
- State machine and types had 8 statuses: added `new, confirmed, picked-up`
- No CI/CD check caught this drift
- Discovered only when KDS tried to set `status = 'confirmed'`

### Evidence
- Migration `20251127155000_fix_orders_status_check_constraint.sql` fixed the issue
- `server/src/services/orderStateMachine.ts` defines 8 valid statuses
- `shared/types/order.types.ts` defines `OrderStatus` with 8 values

### Related Files
- `server/tests/services/orderStateMachine.test.ts` - Tests state machine but NOT DB constraint
- `prisma/schema.prisma` - No constraint documented

## Proposed Solutions

### Option A: Integration Test (Recommended)
**Description**: Add test that attempts to insert each valid status into orders table
**Pros**:
- Catches drift at test time
- Tests actual database behavior
**Cons**:
- Requires database connection in tests
- Slower than unit tests
**Effort**: Small (2-4 hours)
**Risk**: Low

### Option B: Schema Validation Script
**Description**: Query pg_constraint and compare to TypeScript enum
**Pros**:
- Can run in CI without full database
- Fast execution
**Cons**:
- Requires parsing SQL constraint definition
- More complex implementation
**Effort**: Medium (4-8 hours)
**Risk**: Low

### Option C: Pre-commit Hook
**Description**: Validate constraint alignment before every commit
**Pros**:
- Prevents drift at source
- Immediate feedback
**Cons**:
- Slows down commits
- Requires database access locally
**Effort**: Medium (4-8 hours)
**Risk**: Low

## Recommended Action
<!-- To be filled during triage -->

## Technical Details

### Affected Files
- `server/tests/integration/orderStatusConstraint.test.ts` (new)
- `server/tests/services/orderStateMachine.test.ts` (extend)

### Test Implementation Sketch
```typescript
describe('Database Constraint Alignment', () => {
  const validStatuses = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];

  it.each(validStatuses)('should allow status "%s" in orders table', async (status) => {
    const result = await supabase.from('orders').insert({
      restaurant_id: TEST_RESTAURANT_ID,
      order_number: `TEST-${Date.now()}`,
      status,
      items: []
    });
    expect(result.error).toBeNull();
  });

  it('should reject invalid status', async () => {
    const result = await supabase.from('orders').insert({
      restaurant_id: TEST_RESTAURANT_ID,
      order_number: `TEST-${Date.now()}`,
      status: 'invalid_status',
      items: []
    });
    expect(result.error?.code).toBe('23514');
  });
});
```

## Acceptance Criteria
- [ ] Test exists that validates all 8 statuses are accepted by DB
- [ ] Test fails if constraint is missing any status from state machine
- [ ] Test runs in CI/CD pipeline
- [ ] Documentation updated with constraint sync requirements

## Work Log
| Date | Action | Learnings |
|------|--------|-----------|
| 2025-11-27 | Created from code review | Constraint drift caused P1 production issue |

## Resources
- Migration fix: `supabase/migrations/20251127155000_fix_orders_status_check_constraint.sql`
- State machine: `server/src/services/orderStateMachine.ts`
- Types: `shared/types/order.types.ts`
