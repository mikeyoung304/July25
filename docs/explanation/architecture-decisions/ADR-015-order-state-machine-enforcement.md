# ADR-015: Server-Side Order State Machine Enforcement

**Date**: 2025-11-24
**Status**: ✅ ACCEPTED
**Epic**: Epic 2 - Order Status Flow Consolidation
**Authors**: Development Team
**Supersedes**: Multiple hardcoded status validation arrays

---

## Context

The Restaurant OS 6.0 order management system had **6 different OrderStatus definitions** scattered across the codebase, despite having a well-designed state machine (`orderStateMachine.ts`) that was never enforced. This created multiple failure modes:

### Problem Discovery (EPIC 2 Investigation)

**Architectural Audit Report v2** (Line 135) identified "Status Flow Divergence":
- **Initial finding**: "3 different status definitions"
- **Actual discovery**: **6 different status definitions** across the codebase

#### Status Definition Locations Found

1. **order.types.ts** (8 states) - Canonical type definition
2. **unified-order.types.ts** (7 states) - Deprecated, missing 'picked-up'
3. **orderStatusValidation.ts** (client) (8 states) - Duplicate helper functions
4. **order.schema.ts** (8 states) - Validation schema mirror
5. **orderStateMachine.ts** (8 states) - State machine with transition rules
6. **orders.routes.ts** (8 states) - Hardcoded validation array

### Bypass Patterns Discovered

Despite having `orderStateMachine.ts` with complete transition validation logic, **4 critical code paths bypassed it entirely**:

#### 1. **orders.service.ts** - Direct Database Updates
```typescript
// BEFORE: No validation
const { data: order } = await supabase
  .from('orders')
  .update({ status: newStatus }) // Any status accepted
  .eq('id', orderId);
```

**Impact**: Allowed impossible transitions (e.g., `completed → pending`)

#### 2. **scheduledOrders.service.ts** - Auto-Fire
```typescript
// BEFORE: Direct assignment
.update({
  status: 'preparing', // Hardcoded, no validation
  is_scheduled: false
})
```

**Impact**: Scheduled orders could fire from ANY state

#### 3. **scheduledOrders.service.ts** - Manual Fire
```typescript
// BEFORE: Same as auto-fire
.update({ status: 'preparing' }) // No state machine check
```

#### 4. **orders.routes.ts** - Route Validation
```typescript
// BEFORE: Only whitelist check
const validStatuses: OrderStatus[] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];
if (!validStatuses.includes(status)) {
  throw BadRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
}
// No transition validation - any valid status allowed
```

**Impact**: Route accepted any valid status without checking if transition was legal

### Symptoms

- Orders could skip states (e.g., `new → completed` directly)
- Completed orders could regress to active states
- Scheduled orders could fire from invalid states
- No audit trail for invalid transition attempts
- Defensive code scattered across clients (`getSafeOrderStatus()`)
- Expo page had custom fallback logic for unexpected states

---

## Decision

**Enforce order state machine validation server-side for ALL status updates.**

All status transitions MUST validate against `OrderStateMachine.canTransition()` before being applied to the database. Server is the single source of truth for business logic.

---

## Rationale

### Why Server-Side Enforcement?

1. **Trust Boundary**: Client code can be modified, inspected, or bypassed. Server is authoritative.
2. **Data Integrity**: Prevents invalid state transitions from corrupting order lifecycle
3. **Multi-Client Support**: KDS, Expo, Admin panels, API clients all use same rules
4. **Audit Trail**: All validation failures logged with context for debugging
5. **Future-Proof**: Adding new statuses or transition rules updates one place

### Why State Machine Pattern?

1. **Explicitness**: All valid transitions documented in `VALID_TRANSITIONS` table
2. **Testability**: State machine logic isolated and unit testable
3. **Clarity**: Visual flow diagram documents business rules
4. **Extensibility**: Hooks support for future logging, webhooks, analytics

### Alternative Considered: Client-Side Validation Only

**Pros**:
- Faster UI feedback
- Reduces server load
- Simpler server code

**Cons**:
- Not secure - client can be modified
- Multi-client inconsistency risk
- No guarantee of enforcement
- Defensive code scattered across clients

**Verdict**: Rejected. Client-side validation is **UI-only** (enable/disable buttons). Server ALWAYS enforces authoritative rules.

---

## Implementation (Epic 2 - Phases 1-2)

### Phase 1: Consolidation ✅ (2025-11-24)

**Goal**: Single source of truth for status definitions and helpers

#### Files Created

**`shared/utils/orderStatus.ts`**
```typescript
// Consolidated helper functions from orderStatusValidation.ts

export const STATUS_GROUPS = {
  ACTIVE: ['new', 'pending', 'confirmed', 'preparing'] as const,
  READY: ['ready', 'picked-up'] as const,
  FINISHED: ['completed', 'cancelled'] as const,
  KITCHEN_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready'] as const,
  EXPO_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up'] as const,
} as const;

export function isStatusInGroup(status: OrderStatus, group: keyof typeof STATUS_GROUPS): boolean;
export function getStatusLabel(status: OrderStatus): string;
export function getStatusColor(status: OrderStatus): string;
export function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean; // UI-only
export function getNextValidStatuses(status: OrderStatus): OrderStatus[];
export function isFinalStatus(status: OrderStatus): boolean;
export function canCancel(status: OrderStatus): boolean;
```

**Purpose**: Centralized helpers for display and UI validation (NOT enforcement)

#### Files Deleted

1. **`shared/types/unified-order.types.ts`**
   - Reason: Deprecated 7-state version missing 'picked-up' state
   - No imports found (verified with grep)

2. **`client/src/utils/orderStatusValidation.ts`**
   - Reason: Duplicate of shared type definition
   - Helpers moved to `shared/utils/orderStatus.ts`

#### Files Modified

**`client/src/pages/ExpoPage.tsx`**
```typescript
// BEFORE: Defensive normalization
const safeOrders = orders.map(order => ({
  ...order,
  status: getSafeOrderStatus(order)
}));

// AFTER: Trust server data
const filteredActive = orders.filter(o => isStatusInGroup(o.status, 'ACTIVE'));
const filteredReady = orders.filter(o => isStatusInGroup(o.status, 'READY'));
```

**Impact**: Removed defensive code - server guarantees valid states

#### Result

- **6 definitions → 1 canonical** (shared/types/order.types.ts)
- Single source of truth for 8-state flow
- Centralized display helpers
- Zero transformation overhead

---

### Phase 2: State Machine Enforcement ✅ (2025-11-24)

**Goal**: Enforce state machine at all update points

#### 1. **orders.service.ts** (Lines 378-392)

**Added**:
```typescript
import OrderStateMachine from './orderStateMachine';

// Fetch current order state
const { data: currentOrder } = await supabase
  .from('orders')
  .select('status')
  .eq('id', orderId)
  .eq('restaurant_id', restaurantId)
  .single();

// EPIC 2: Enforce state machine transition validation
if (!OrderStateMachine.canTransition(currentOrder.status, newStatus)) {
  const validNextStatuses = OrderStateMachine.getNextValidStatuses(currentOrder.status);
  ordersLogger.warn('Invalid order status transition attempted', {
    orderId,
    restaurantId,
    currentStatus: currentOrder.status,
    attemptedStatus: newStatus,
    validNextStatuses
  });
  throw new Error(
    `Invalid state transition: ${currentOrder.status} → ${newStatus}. ` +
    `Valid next states: ${validNextStatuses.join(', ')}`
  );
}
```

**Impact**: All calls to `updateOrderStatus()` now validate transitions

#### 2. **scheduledOrders.service.ts** (Lines 59-68, 123-130)

**Auto-Fire Validation**:
```typescript
// EPIC 2: Validate state transitions before firing
const updates = ordersToFire
  .filter((order: Order) => {
    // Validate transition is allowed
    if (!OrderStateMachine.canTransition(order.status, 'preparing')) {
      logger.warn('Cannot auto-fire scheduled order: invalid transition', {
        orderId: order.id,
        currentStatus: order.status,
        attemptedStatus: 'preparing',
        restaurantId
      });
      return false; // Skip this order
    }
    return true; // Proceed with fire
  })
  .map((order: Order) =>
    supabase
      .from('orders')
      .update({
        is_scheduled: false,
        manually_fired: false,
        status: 'preparing',
        updated_at: now
      })
      .eq('id', order.id)
      .eq('restaurant_id', restaurantId)
  );
```

**Manual Fire Validation**:
```typescript
// EPIC 2: Fetch current order to validate transition
const { data: currentOrder, error: fetchError } = await supabase
  .from('orders')
  .select('id, status, is_scheduled')
  .eq('id', orderId)
  .eq('restaurant_id', restaurantId)
  .eq('is_scheduled', true)
  .single();

if (fetchError || !currentOrder) {
  logger.error('Failed to fetch scheduled order for manual fire:', fetchError);
  return null;
}

// Validate transition is allowed
if (!OrderStateMachine.canTransition(currentOrder.status, 'preparing')) {
  logger.warn('Cannot manually fire scheduled order: invalid transition', {
    orderId,
    currentStatus: currentOrder.status,
    attemptedStatus: 'preparing',
    restaurantId
  });
  return null;
}
```

**Impact**: Scheduled orders skip firing if in invalid state (with warnings logged)

#### 3. **orders.routes.ts** (Lines 238-257)

**Removed**:
```typescript
// BEFORE: Hardcoded whitelist
const validStatuses: OrderStatus[] = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up', 'completed', 'cancelled'];
if (!validStatuses.includes(status as OrderStatus)) {
  throw BadRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
}
```

**After**:
```typescript
// EPIC 2: Removed hardcoded status validation - now handled by orderStateMachine in service layer
// Service layer enforces state machine validation
const order = await OrdersService.updateOrderStatus(restaurantId, id!, status, notes);
```

**Impact**: Route delegates validation to service layer (single enforcement point)

---

## Consequences

### Positive

- ✅ **Data Integrity**: Invalid transitions impossible (e.g., `completed → pending`)
- ✅ **Audit Trail**: All invalid attempts logged with context
- ✅ **Single Enforcement Point**: One place to update business rules
- ✅ **Maintainability**: No scattered validation logic
- ✅ **Testability**: State machine isolated and unit testable
- ✅ **Documentation**: Visual flow diagram in ORDER_FLOW.md
- ✅ **Type Safety**: TypeScript enforces valid status strings
- ✅ **Performance**: Minimal overhead (one status lookup per update)

### Negative

- ⚠️ **Extra Query**: Must fetch current order status before updating (1 additional SELECT per update)
- ⚠️ **Breaking Change Risk**: Existing code relying on invalid transitions will now fail (GOOD - exposes bugs)

### Neutral

- Client-side validation (`isValidStatusTransition()`) remains for UI button states
- Scheduled orders gracefully skip invalid states instead of forcing transitions
- Error messages include valid next states for debugging

---

## Validation & Testing

### Success Criteria ✅

**Implementation**:
- [x] Type checks pass (0 errors)
- [x] All status updates validate transitions
- [x] Scheduled orders handle invalid states
- [x] Route layer delegates to service
- [x] ORDER_FLOW.md updated with enforcement documentation
- [x] ADR-015 created

**Production** (To verify):
- [ ] Invalid transitions return 400 errors with helpful messages
- [ ] Audit logs capture invalid transition attempts
- [ ] KDS/Expo UI buttons respect valid transitions
- [ ] Scheduled orders skip invalid states gracefully
- [ ] Integration tests pass

### Test Cases

**Valid Transitions** (Should succeed):
```typescript
new → pending ✅
pending → confirmed ✅
confirmed → preparing ✅
preparing → ready ✅
ready → picked-up ✅
picked-up → completed ✅
any non-final → cancelled ✅
```

**Invalid Transitions** (Should fail with error):
```typescript
completed → pending ❌ (final state)
completed → preparing ❌ (final state)
cancelled → ready ❌ (final state)
new → completed ❌ (skips states)
preparing → pending ❌ (regression)
```

### Manual Testing Workflow

1. **Create Order**: `POST /api/v1/orders` → status: `pending` ✅
2. **Valid Transition**: `PATCH /api/v1/orders/:id/status` body: `{ status: 'confirmed' }` ✅
3. **Invalid Transition**: `PATCH /api/v1/orders/:id/status` body: `{ status: 'completed' }` → 400 error ✅
4. **Check Error Message**: Should include "Valid next states: preparing, cancelled" ✅
5. **Scheduled Order**: Verify auto-fire skips orders in invalid states ✅

---

## Rollback Strategy

If this decision needs to be reversed:

### Immediate Rollback
```bash
git revert 4b6bd36e  # Epic 2 Phases 1-2 commit
```

**Restores**:
- Hardcoded validation in `orders.routes.ts`
- Defensive `getSafeOrderStatus()` in ExpoPage.tsx
- `orderStatusValidation.ts` client helpers
- No state machine enforcement

### Partial Rollback (Keep Consolidation, Remove Enforcement)

1. Remove `OrderStateMachine.canTransition()` checks from:
   - `orders.service.ts` (lines 378-392)
   - `scheduledOrders.service.ts` (lines 59-68, 123-130)

2. Restore hardcoded validation in `orders.routes.ts`

3. Keep consolidated helpers in `shared/utils/orderStatus.ts`

**Risk Assessment**: Low risk for rollback. Changes are server-side only; no database schema changes.

---

## Related Documentation

- **[ORDER_FLOW.md](../concepts/ORDER_FLOW.md)** - Complete order lifecycle documentation (updated 2025-11-24)
- **[orderStateMachine.ts](../../../server/src/services/orderStateMachine.ts)** - State machine implementation
- **[orderStatus.ts](../../../shared/utils/orderStatus.ts)** - Display helper functions
- **[order.types.ts](../../../shared/types/order.types.ts)** - Canonical OrderStatus type
- **[ARCHITECTURAL_AUDIT_REPORT_V2.md](../../reports/ARCHITECTURAL_AUDIT_REPORT_V2.md)** - Line 135 finding
- **[EPIC_2_EXECUTION_BRIEF.md](../../reports/EPIC_2_EXECUTION_BRIEF.md)** - Full Epic 2 planning document
- **[ADR-001: Snake Case Convention](./ADR-001-snake-case-convention.md)** - Naming conventions

---

## Lessons Learned

1. **State Machines Need Enforcement**: Having well-designed business logic means nothing if it's never called
2. **Trust Boundaries Matter**: Client-side validation is UI convenience, not security
3. **Single Enforcement Point**: Centralizing validation reduces bugs and maintenance burden
4. **Documentation Drift**: 6 status definitions emerged from lack of canonical source
5. **Audit Trails Are Critical**: Logging invalid attempts helps debug integration issues
6. **Defensive Code Smells**: If clients have defensive normalization, server validation is missing
7. **Consolidation Before Enforcement**: Phase 1 (consolidation) made Phase 2 (enforcement) trivial

---

## Future Enhancements

### Transition Hooks (Already Supported)

`orderStateMachine.ts` includes hook support for future features:

```typescript
interface TransitionHook {
  beforeTransition?: (from: OrderStatus, to: OrderStatus) => Promise<void>;
  afterTransition?: (from: OrderStatus, to: OrderStatus) => Promise<void>;
}
```

**Potential Use Cases**:
- **Logging**: Track all status changes to audit table
- **Webhooks**: Notify external systems (POS, inventory, analytics)
- **Business Rules**: Auto-assign orders to stations based on status
- **Notifications**: Alert kitchen when order moves to 'preparing'
- **Metrics**: Track time in each status for analytics

### State Machine Visualization

Add GraphQL/REST endpoint to expose state machine graph:

```typescript
GET /api/v1/orders/state-machine
{
  "current_status": "preparing",
  "valid_transitions": ["ready", "cancelled"],
  "all_transitions": { /* full VALID_TRANSITIONS table */ }
}
```

**Use Cases**:
- Dynamic UI rendering (disable invalid buttons)
- Admin tools visualization
- Developer documentation
- Testing frameworks

---

## Approval

This ADR documents the architectural decisions made in **Epic 2: Order Status Flow Consolidation** (Phases 1-2). The decision was validated through:

- Zero TypeScript errors after implementation
- Elimination of duplicate status definitions
- Enforcement of business logic at trust boundary
- Alignment with audit findings (Line 135)
- Code review and architectural analysis

**Status**: ✅ ACCEPTED and IMPLEMENTED (2025-11-24)

---

**Revision History**:
- 2025-11-24: Initial version (v1.0) - Epic 2 Phases 1-2 complete
