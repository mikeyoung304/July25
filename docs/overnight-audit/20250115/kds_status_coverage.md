# KDS Status Coverage Audit Report
Generated: 2025-01-15

## Critical Finding Summary
**⚠️ MULTIPLE STATUS HANDLING GAPS DETECTED**

All 7 order statuses that MUST be handled:
- `new`
- `pending`
- `confirmed`
- `preparing`
- `ready`
- `completed`
- `cancelled`

## Status Handler Coverage Analysis

### ✅ COMPLETE Coverage (All 7 Statuses)

#### /client/src/components/kitchen/OrderCard.tsx (Lines 51-66)
```typescript
switch (order.status) {
  case 'new':        ✓
  case 'pending':    ✓
  case 'confirmed':  ✓
  case 'preparing':  ✓
  case 'ready':      ✓
  case 'completed':  ✓
  case 'cancelled':  ✓
  default:           ✓ (fallback present)
}
```
**Status: SAFE** - All statuses handled with default fallback

#### /client/src/types/unified-order.ts (Lines 90-107)
```typescript
switch (status.toLowerCase()) {
  case 'new':        ✓ → returns 'new'
  case 'pending':    ✓ → returns 'new'
  case 'preparing':  ✓ → returns 'preparing'
  case 'ready':      ✓ → returns 'ready'
  case 'completed':  ✓ → returns 'completed'
  case 'cancelled':  ✓ → returns 'cancelled'
  default:           ✓ → returns 'new'
}
```
**Status: SAFE** - Normalization function with default

#### /server/src/services/orderStateMachine.ts (Lines 25-32)
```typescript
VALID_TRANSITIONS: {
  'new':        ✓ → ['pending', 'cancelled']
  'pending':    ✓ → ['confirmed', 'cancelled']
  'confirmed':  ✓ → ['preparing', 'cancelled']
  'preparing':  ✓ → ['ready', 'cancelled']
  'ready':      ✓ → ['completed', 'cancelled']
  'completed':  ✓ → []
  'cancelled':  ✓ → []
}
```
**Status: SAFE** - State machine defines all transitions

#### /client/src/utils/orderStatusValidation.ts (All functions)
**Status: SAFE** - Comprehensive validation utilities with all 7 statuses

### ❌ INCOMPLETE Coverage (Missing Statuses)

#### /client/src/components/kitchen/StationStatusBar.tsx (Lines 137-150)
```typescript
switch (order.status) {
  case 'completed':  ✓
  case 'ready':      ✓
  case 'preparing':  ✓
  case 'confirmed':  ✓
  case 'new':        ✓
  case 'pending':    ✓
  case 'cancelled':  ✗ MISSING - no handler!
  default:           ✗ MISSING - no fallback!
}
```
**Status: DANGEROUS** - Missing 'cancelled' case, no default handler
**Impact**: Will skip cancelled orders in station status calculation

#### /client/src/hooks/useTableGrouping.ts (Lines 87-98)
```typescript
switch (order.status) {
  case 'ready':      ✓ → readyItems++
  case 'preparing':  ✓ → preparingItems++
  case 'confirmed':  ✓ → preparingItems++
  case 'completed':  ✓ → completedItems++
  case 'new':        ✗ MISSING
  case 'pending':    ✗ MISSING
  case 'cancelled':  ✗ MISSING
  default:           ✗ MISSING - no fallback!
}
```
**Status: DANGEROUS** - Missing 3 statuses, no default
**Impact**: Orders with new/pending/cancelled status won't be counted in table groups

#### /client/src/hooks/useTableGrouping.ts (Lines 248-261)
```typescript
switch (group.status) {
  case 'ready':           ✓ → readyTables++
  case 'partially-ready': ✓ → partiallyReadyTables++
  case 'in-progress':     ✓ → inProgressTables++
  case 'pending':         ✓ → pendingTables++
  default:                ✗ MISSING
}
```
**Note**: This is for table group status (not order status), but still lacks default case

#### /client/src/modules/orders/components/OrderActions/OrderActionsBar.tsx (Lines 21-30)
```typescript
switch (status) {
  case 'new':        ✓ → return 'preparing'
  case 'preparing':  ✓ → return 'ready'
  case 'ready':      ✓ → return 'completed'
  case 'pending':    ✗ MISSING
  case 'confirmed':  ✗ MISSING
  case 'completed':  ✗ MISSING
  case 'cancelled':  ✗ MISSING
  default:           ✓ → return null
}
```
**Status: PARTIALLY SAFE** - Has default but missing 4 explicit cases
**Impact**: No next action for pending/confirmed/completed/cancelled orders

### ⚠️ VALIDATION SCHEMA BUG

#### /shared/types/validation.ts (Line 92)
```typescript
orderStatus: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
```
**Status: CRITICAL BUG** - Missing 'new' status in Zod validation!
**Impact**: Will reject orders with 'new' status during validation

## Filter/Conditional Patterns

#### /client/src/pages/KitchenDisplayOptimized.tsx (Lines 86-99)
```typescript
switch (statusFilter) {
  case 'active':  → shows activeOrders
  case 'ready':   → shows readyOrders
  case 'urgent':  → filters by age, excludes completed/cancelled
  default:        ✗ MISSING
}
```
**Note**: This is a filter switch, not status switch, but lacks default case

## Server-Side Coverage

#### /server/src/dto/order.dto.ts (Line 134)
```typescript
status: z.enum(['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'])
```
**Status: SAFE** - All 7 statuses in DTO validation

#### /server/src/models/order.model.ts (Line 45)
```typescript
status: Joi.string().valid('pending', 'preparing', 'ready', 'completed', 'cancelled')
```
**Status: BUG** - Missing 'new' and 'confirmed' in Joi validation!

## Critical Issues Summary

1. **StationStatusBar.tsx**: Missing 'cancelled' handler - will cause incorrect station metrics
2. **useTableGrouping.ts**: Missing 3 status handlers - orders won't be counted properly
3. **validation.ts (shared)**: Missing 'new' in Zod schema - validation failures
4. **order.model.ts (server)**: Missing 'new' and 'confirmed' in Joi - validation failures

## Recommendations

### Immediate Actions Required:
1. Add missing status cases to all switch statements
2. ALWAYS include default/fallback cases
3. Fix validation schemas to include all 7 statuses
4. Add runtime assertions to catch missing cases

### Pattern to Enforce:
```typescript
switch (order.status) {
  case 'new':        // handle
  case 'pending':    // handle
  case 'confirmed':  // handle
  case 'preparing':  // handle
  case 'ready':      // handle
  case 'completed':  // handle
  case 'cancelled':  // handle
  default:
    console.error(`Unhandled order status: ${order.status}`)
    // fallback behavior
}
```