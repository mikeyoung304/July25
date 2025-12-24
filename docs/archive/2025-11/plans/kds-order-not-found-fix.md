# Plan: Fix KDS Order Status Update (500 Error) - RESOLVED

## Status: FIXED ✅

**Root Cause**: `orders_status_check` database constraint was missing `confirmed`, `new`, and `picked-up` statuses.

**Fix Applied**: Migration `20251127155000_fix_orders_status_check_constraint.sql` - updated constraint to include all valid statuses.

**Tested**: All status transitions work:
- `pending → confirmed` ✅
- `confirmed → preparing` ✅
- `preparing → ready` ✅
- `ready → completed` ✅

---

## Problem Summary (Original)

Kitchen Display System (KDS) returns "Internal server error" (code: 23514) when trying to mark orders as ready. Error code `23514` is PostgreSQL CHECK constraint violation.

## Root Cause Analysis

### Testing Results (Production)
1. **Login works**: Kitchen user successfully authenticates with UUID restaurant
2. **Fetch orders works**: Orders load correctly with proper `restaurant_id: 11111111-...`
3. **Status update fails**: `PATCH /api/v1/orders/:id/status` returns 500 error
4. **Error code 23514**: PostgreSQL CHECK constraint violation

### Database State
- All orders have correct UUID: `restaurant_id: 11111111-1111-1111-1111-111111111111`
- Orders table `status` column has no CHECK constraint (TEXT type)
- `payment_status` column HAS CHECK constraint: `IN ('unpaid', 'paid', 'failed', 'refunded')`

### Code Flow Analysis
1. Server receives PATCH request with `{status: "confirmed"}`
2. Auth middleware validates JWT, extracts `restaurant_id` from token
3. `OrdersService.updateOrderStatus()` validates state machine transition
4. Supabase update query executes with service role key (bypasses RLS)
5. **ERROR occurs during DB update** - 23514 constraint violation

### Likely Cause
The 23514 error is occurring in the `logStatusChange` function which inserts into `order_status_history` table. Need to check if that table has a CHECK constraint on `to_status` that doesn't include all valid statuses.

## Investigation Steps

### Step 1: Check order_status_history constraints
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'order_status_history'::regclass;
```

### Step 2: Check Render logs for full error details
The server is swallowing the actual constraint name. Need to see:
- Which column has the constraint
- What values are allowed vs what's being inserted

### Step 3: Check if there's a constraint on orders.status
May have been added outside of tracked migrations.

## Proposed Fixes

### Option A: Drop/Update the CHECK Constraint
If there's a CHECK constraint limiting valid statuses, update it to include all statuses from the state machine:
- `new`, `pending`, `confirmed`, `preparing`, `ready`, `picked-up`, `completed`, `cancelled`

### Option B: Workaround in Code
If the constraint is on `order_status_history.to_status`, ensure we only log valid values or add try-catch to prevent failing the main operation.

## Order Status State Machine (Reference)
```
new → pending → confirmed → preparing → ready → picked-up → completed
                                    ↘ completed (direct)
Any state → cancelled
```

## Implementation

### Migration SQL (if needed)
```sql
-- Check existing constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'orders'::regclass AND contype = 'c';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'order_status_history'::regclass AND contype = 'c';

-- If constraint exists on orders.status, update it:
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'));

-- If constraint exists on order_status_history.to_status, update it:
ALTER TABLE order_status_history DROP CONSTRAINT IF EXISTS order_status_history_to_status_check;
ALTER TABLE order_status_history ADD CONSTRAINT order_status_history_to_status_check
  CHECK (to_status IN ('new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'));
```

## Testing Plan
1. Run migration to fix constraint
2. Test status transitions via API:
   - `pending → confirmed`
   - `confirmed → preparing`
   - `preparing → ready`
   - `ready → completed`
3. Verify WebSocket broadcasts work
4. Test KDS UI end-to-end

## Questions
1. Do you have access to Render logs to see the full error?
2. Can we run SQL directly against Supabase to check constraints?
