# Epic 2 Execution Brief: Order Status Flow Consolidation

**Date**: 2025-01-24
**Priority**: P0 (Critical - Must Fix)
**Effort**: 8-12 hours (1-1.5 days)
**Complexity**: Medium
**Risk**: Low (TypeScript catches import issues)

---

## Executive Summary

**Problem**: The codebase has 6 different OrderStatus type definitions and the existing state machine is NOT enforced. This allows invalid state transitions (e.g., completed → pending) and creates data integrity risks.

**Solution**: Consolidate to 1 canonical definition and enforce the existing orderStateMachine in all status update paths.

**Impact**: Eliminates audit finding Line 135 "Status Flow Divergence", prevents invalid state transitions, and establishes single source of truth.

---

## Current State Analysis

### Status Definitions Found (6 total)

| File | Location | States | Status | Issue |
|------|----------|--------|--------|-------|
| **order.types.ts** | `/shared/types/order.types.ts` | 8 | ✅ CANONICAL | Single source of truth |
| **unified-order.types.ts** | `/shared/types/unified-order.types.ts` | 7 | ❌ DEPRECATED | Missing 'picked-up' state |
| **orderStatusValidation.ts** | `/client/src/utils/orderStatusValidation.ts` | 8 | ❌ DUPLICATE | Client-side mirror |
| **order.schema.ts** | `/shared/validation/order.schema.ts` | 8 | ⚠️ VALIDATION | Mirror for validation |
| **orderStateMachine.ts** | `/server/src/services/orderStateMachine.ts` | 8 | ✅ ENFORCEMENT | State machine engine |
| **orders.routes.ts** | `/server/src/routes/orders.routes.ts` | 8 | ❌ HARDCODED | Hardcoded array |

### Canonical 8-State Flow

```
new → pending → confirmed → preparing → ready → picked-up → completed
  ↓       ↓          ↓           ↓         ↓         ↓
  └───────┴──────────┴───────────┴─────────┴─────────→ cancelled
```

**Valid Transitions** (from orderStateMachine.ts):
```typescript
{
  'new':       ['pending', 'cancelled'],
  'pending':   ['confirmed', 'cancelled'],
  'confirmed': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready':     ['picked-up', 'completed', 'cancelled'],
  'picked-up': ['completed', 'cancelled'],
  'completed': [],  // Final state
  'cancelled': []   // Final state
}
```

### Critical Bypass Patterns Identified

#### **Bypass 1: orders.service.ts (Line 364-477)**
```typescript
// CURRENT: Direct database update, NO state machine validation
async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  return await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus }  // ❌ Allows invalid transitions
  });
}
```

#### **Bypass 2: scheduledOrders.service.ts (Lines 60, 97)**
```typescript
// CURRENT: Direct assignment to 'preparing'
await prisma.order.update({
  where: { id: order.id },
  data: { status: 'preparing' }  // ❌ No validation if transition is valid
});
```

#### **Bypass 3: orders.routes.ts PATCH endpoint (Line 237-260)**
```typescript
// CURRENT: Only whitelist check, not transition validation
const validStatuses: OrderStatus[] = ['new', 'pending', ...];
if (!validStatuses.includes(newStatus)) {
  return res.status(400).json({ error: 'Invalid status' });
}
// ❌ Allows completed → pending (valid status but invalid transition)
```

#### **Bypass 4: orders.routes.ts DELETE endpoint (Line 262-282)**
```typescript
// CURRENT: Always cancels without checking if cancellation allowed
await prisma.order.update({
  where: { id: orderId },
  data: { status: 'cancelled' }  // ❌ Can cancel completed orders
});
```

---

## Epic 2 Execution Plan

### **Phase 1: Consolidation** (2-3 hours)

#### **Task 1.1: Delete Deprecated Definition**
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/unified-order.types.ts`
- **Action**: Delete entire file (7-state version missing 'picked-up')
- **Impact**: Must update all imports

#### **Task 1.2: Move Client Helpers to Shared**
- **Source**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/utils/orderStatusValidation.ts`
- **Target**: `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/orderStatus.ts` (NEW FILE)
- **Action**:
  1. Create new shared/utils/orderStatus.ts
  2. Move STATUS_GROUPS, getStatusLabel, getStatusColor, isValidStatusTransition
  3. Delete client/src/utils/orderStatusValidation.ts
  4. Update all client imports

**New File Structure** (shared/utils/orderStatus.ts):
```typescript
import { OrderStatus } from '../types/order.types';

// Status groupings for UI
export const STATUS_GROUPS = {
  ACTIVE: ['new', 'pending', 'confirmed', 'preparing'] as const,
  READY: ['ready', 'picked-up'] as const,
  FINISHED: ['completed', 'cancelled'] as const,
  KITCHEN_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready'] as const,
  EXPO_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up'] as const,
} as const;

// Display helpers
export function getStatusLabel(status: OrderStatus): string { /* ... */ }
export function getStatusColor(status: OrderStatus): string { /* ... */ }
export function isStatusInGroup(status: OrderStatus, group: keyof typeof STATUS_GROUPS): boolean { /* ... */ }
```

#### **Task 1.3: Update All Imports**
- **Tool**: Use Glob to find all files importing unified-order.types.ts
- **Action**: Replace with import from order.types.ts
- **Verification**: Run `npm run typecheck`

---

### **Phase 2: State Machine Enforcement** (4-5 hours)

#### **Task 2.1: Enforce in orders.service.ts**
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts`
- **Lines**: 364-477
- **Current**:
```typescript
async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  return await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus }
  });
}
```

- **Change To**:
```typescript
async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  // Fetch current order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, restaurant_id: true }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Validate transition
  if (!orderStateMachine.canTransition(order.status, newStatus)) {
    throw new Error(
      `Invalid state transition: ${order.status} → ${newStatus}. ` +
      `Valid next states: ${orderStateMachine.getNextValidStatuses(order.status).join(', ')}`
    );
  }

  // Execute transition (this calls hooks and updates database)
  return await orderStateMachine.transition(order.status, newStatus, {
    orderId: order.id,
    restaurantId: order.restaurant_id
  });
}
```

- **Benefits**:
  - Invalid transitions rejected with clear error messages
  - State machine hooks executed (WebSocket notifications, logging)
  - Single code path for all status updates

#### **Task 2.2: Enforce in scheduledOrders.service.ts**
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/scheduledOrders.service.ts`
- **Lines**: 60 (auto-fire), 97 (manual fire)
- **Current**:
```typescript
// Auto-fire (Line 60)
await prisma.order.update({
  where: { id: order.id },
  data: { status: 'preparing', fired_at: new Date() }
});

// Manual fire (Line 97)
await prisma.order.update({
  where: { id: order.id },
  data: { status: 'preparing', fired_at: new Date() }
});
```

- **Change To**:
```typescript
// Auto-fire (Line 60)
if (orderStateMachine.canTransition(order.status, 'preparing')) {
  await orderStateMachine.transition(order.status, 'preparing', {
    orderId: order.id,
    restaurantId: order.restaurant_id
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { fired_at: new Date() }
  });
} else {
  logger.warn('Cannot fire scheduled order: invalid transition', {
    orderId: order.id,
    currentStatus: order.status,
    attemptedStatus: 'preparing'
  });
}

// Manual fire (Line 97) - Same pattern
```

- **Edge Case Handling**:
  - If order was manually cancelled before fire time, skip firing
  - Log warning instead of throwing error (scheduled jobs should be fault-tolerant)

#### **Task 2.3: Remove Hardcoded Validation from orders.routes.ts**
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`
- **Lines**: 237-260 (PATCH endpoint)
- **Current**:
```typescript
const validStatuses: OrderStatus[] = ['new', 'pending', 'confirmed', ...];
if (!validStatuses.includes(newStatus)) {
  return res.status(400).json({ error: 'Invalid status' });
}
await ordersService.updateOrderStatus(orderId, newStatus);
```

- **Change To**:
```typescript
try {
  const result = await ordersService.updateOrderStatus(orderId, newStatus);
  res.json(result);
} catch (error) {
  if (error.message.includes('Invalid state transition')) {
    return res.status(400).json({
      error: error.message,
      current_status: result?.status,
      attempted_status: newStatus
    });
  }
  throw error;
}
```

- **Benefits**:
  - Remove hardcoded status list (Line 248)
  - Delegate validation to service layer
  - Return clear error messages to client

#### **Task 2.4: Add Cancellation Validation to DELETE Endpoint**
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts`
- **Lines**: 262-282 (DELETE endpoint)
- **Current**:
```typescript
await prisma.order.update({
  where: { id: orderId },
  data: { status: 'cancelled' }
});
```

- **Change To**:
```typescript
const order = await prisma.order.findUnique({
  where: { id: orderId },
  select: { id: true, status: true }
});

if (!order) {
  return res.status(404).json({ error: 'Order not found' });
}

if (!orderStateMachine.canTransition(order.status, 'cancelled')) {
  return res.status(400).json({
    error: `Cannot cancel order in ${order.status} state`,
    current_status: order.status
  });
}

await ordersService.updateOrderStatus(orderId, 'cancelled');
```

- **Cancellation Rules** (from orderStateMachine.ts):
  - Can cancel from: new, pending, confirmed, preparing, ready, picked-up
  - Cannot cancel from: completed, cancelled

---

### **Phase 3: Documentation Updates** (1-2 hours)

#### **Task 3.1: Update ORDER_FLOW.md**
- **File**: Find ORDER_FLOW.md in docs/ directory
- **Current**: Claims 7 statuses with 'served'
- **Change**: Update to 8 statuses with 'picked-up'
- **Add Section**: State machine enforcement rules

#### **Task 3.2: Update API Documentation**
- **File**: Find API docs (likely openapi.yaml or similar)
- **Endpoint**: PATCH /api/v1/orders/:id/status
- **Add**:
  - Valid state transitions table
  - 400 error response examples
  - Transition validation rules

#### **Task 3.3: Create ADR-015**
- **File**: `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-015-order-status-state-machine-enforcement.md` (NEW)
- **Content**:
```markdown
# ADR-015: Order Status State Machine Enforcement

## Status
Accepted (Epic 2)

## Context
Order status updates were not validated against state machine rules,
allowing invalid transitions (e.g., completed → pending). This created
data integrity risks and inconsistent order flows.

## Decision
All status updates MUST go through orderStateMachine.canTransition()
validation. Direct database assignments are prohibited.

## Consequences
- Invalid transitions rejected with clear error messages
- State machine hooks execute consistently (WebSocket, logging)
- Single code path for all status updates
- API clients receive 400 errors for invalid transitions

## Implementation
See: docs/reports/EPIC_2_EXECUTION_BRIEF.md
```

---

### **Phase 4: Testing & Validation** (2-3 hours)

#### **Task 4.1: Type Checks**
```bash
npm run typecheck
```
- Verify no import errors
- Verify OrderStatus type consistency

#### **Task 4.2: Unit Tests**
Create new test file: `server/src/services/__tests__/orderStateMachine.test.ts`

**Test Cases**:
```typescript
describe('OrderStateMachine Enforcement', () => {
  describe('Valid Transitions', () => {
    test('new → pending', async () => { /* ... */ });
    test('pending → confirmed', async () => { /* ... */ });
    test('confirmed → preparing', async () => { /* ... */ });
    test('preparing → ready', async () => { /* ... */ });
    test('ready → picked-up', async () => { /* ... */ });
    test('picked-up → completed', async () => { /* ... */ });
    test('any non-final → cancelled', async () => { /* ... */ });
  });

  describe('Invalid Transitions', () => {
    test('completed → pending (reject)', async () => { /* ... */ });
    test('cancelled → confirmed (reject)', async () => { /* ... */ });
    test('new → completed (reject - skipped states)', async () => { /* ... */ });
    test('completed → cancelled (reject - already final)', async () => { /* ... */ });
  });

  describe('Scheduled Orders', () => {
    test('auto-fire validates transition', async () => { /* ... */ });
    test('cannot fire cancelled order', async () => { /* ... */ });
  });

  describe('Cancellation Rules', () => {
    test('can cancel new order', async () => { /* ... */ });
    test('can cancel ready order', async () => { /* ... */ });
    test('cannot cancel completed order', async () => { /* ... */ });
  });
});
```

#### **Task 4.3: Integration Tests**
```bash
npm run test:e2e
```
- Test full order lifecycle: new → completed
- Test cancellation at various stages
- Test scheduled order firing
- Test invalid transition rejection (API returns 400)

#### **Task 4.4: Manual QA in Staging**
- Create order via API
- Update status through each valid transition
- Attempt invalid transition (verify 400 error)
- Cancel order at various stages
- Test scheduled order auto-fire

---

## Files to Modify (Complete List)

### **Delete (2 files)**
1. `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/unified-order.types.ts`
2. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/utils/orderStatusValidation.ts`

### **Create (2 files)**
1. `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/orderStatus.ts`
2. `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-015-order-status-state-machine-enforcement.md`

### **Modify (5+ files)**
1. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts` (Lines 364-477)
2. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/scheduledOrders.service.ts` (Lines 60, 97)
3. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts` (Lines 237-260, 262-282)
4. ORDER_FLOW.md (location TBD)
5. API documentation (openapi.yaml or similar)
6. All files importing unified-order.types.ts (find via Glob)
7. All files importing client/src/utils/orderStatusValidation.ts (find via Glob)

### **Test Files to Create**
1. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/__tests__/orderStateMachine.test.ts`

---

## Migration Strategy (Zero-Downtime)

### **Phase A: Log Warnings (Non-Breaking)**
1. Add orderStateMachine.canTransition() checks
2. Log warnings for invalid transitions (don't reject yet)
3. Deploy to production
4. Monitor logs for 48 hours
5. Identify edge cases in real-world usage

### **Phase B: Enable Enforcement (Breaking)**
1. Change warnings to errors (return 400)
2. Deploy to staging
3. Run full integration test suite
4. Deploy to production
5. Monitor 400 error rate on status endpoint

**Recommended**: Execute Phase A first, gather data, then proceed to Phase B.

---

## Success Metrics

### **Before Epic 2**
- ❌ 6 different OrderStatus definitions
- ❌ State machine exists but not enforced
- ❌ Invalid transitions possible (completed → pending)
- ❌ Scheduled orders bypass validation
- ❌ Client has duplicate type definitions

### **After Epic 2**
- ✅ 1 canonical OrderStatus definition (order.types.ts)
- ✅ 100% state machine enforcement on all updates
- ✅ Invalid transitions rejected with clear errors
- ✅ Scheduled orders validated before state changes
- ✅ Client imports from shared (zero duplication)
- ✅ API documentation updated with transition rules

### **Measurable Outcomes**
- Zero duplicate OrderStatus type definitions (currently 6 → target 1)
- Zero direct status assignments (all via state machine)
- Zero 500 errors from invalid transitions
- 100% test coverage for transition validation

---

## Risk Assessment & Mitigation

| Risk | Severity | Mitigation | Rollback |
|------|----------|-----------|----------|
| **Breaking existing workflows** | HIGH | Two-phase rollout (log warnings first) | Feature flag to disable enforcement |
| **Import changes break client build** | MEDIUM | TypeScript compilation catches all issues | Git revert import changes |
| **Scheduled orders fail to fire** | MEDIUM | Comprehensive logging, fallback logic | Keep old assignment as fallback |
| **Race conditions on concurrent updates** | LOW | Add database optimistic locking (future) | N/A (no breaking change) |

### **Rollback Strategy**
- Git revert of Epic 2 commits
- Redeploy previous version
- **Time to rollback**: < 5 minutes

### **Monitoring**
- Track 400 error rate on PATCH /api/v1/orders/:id/status
- Monitor scheduled order fire success rate
- Alert on orderStateMachine.canTransition() failures

---

## Execution Checklist

### **Pre-Flight**
- [ ] Create feature branch: `epic-2-order-status-consolidation`
- [ ] Read this entire brief
- [ ] Review orderStateMachine.ts to understand transition rules
- [ ] Backup production database (if deploying to production)

### **Phase 1: Consolidation**
- [ ] Delete shared/types/unified-order.types.ts
- [ ] Create shared/utils/orderStatus.ts with helpers
- [ ] Find all imports of unified-order.types.ts (use Glob)
- [ ] Update imports to order.types.ts
- [ ] Delete client/src/utils/orderStatusValidation.ts
- [ ] Find all imports of orderStatusValidation.ts (use Glob)
- [ ] Update imports to shared/utils/orderStatus.ts
- [ ] Run `npm run typecheck` (must pass)

### **Phase 2: Enforcement**
- [ ] Modify orders.service.ts updateOrderStatus()
- [ ] Modify scheduledOrders.service.ts (auto-fire)
- [ ] Modify scheduledOrders.service.ts (manual fire)
- [ ] Modify orders.routes.ts PATCH endpoint
- [ ] Modify orders.routes.ts DELETE endpoint
- [ ] Run `npm run typecheck` (must pass)

### **Phase 3: Documentation**
- [ ] Update ORDER_FLOW.md
- [ ] Update API documentation
- [ ] Create ADR-015
- [ ] Update ARCHITECTURAL_AUDIT_REPORT_V2.md (mark Epic 2 complete)

### **Phase 4: Testing**
- [ ] Run `npm run typecheck`
- [ ] Create unit tests for orderStateMachine enforcement
- [ ] Run `npm run test:server`
- [ ] Run `npm run test:e2e`
- [ ] Manual QA in staging environment
- [ ] Verify invalid transitions return 400 errors
- [ ] Verify scheduled orders validate transitions

### **Phase 5: Deployment**
- [ ] Commit changes with semantic message
- [ ] Create PR with link to this brief
- [ ] Code review (if applicable)
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production (Phase A: log warnings)
- [ ] Monitor logs for 48 hours
- [ ] Deploy Phase B: enable enforcement
- [ ] Monitor 400 error rate

### **Post-Deployment**
- [ ] Update AUDIT_PROGRESS_SUMMARY.md (1 more item resolved)
- [ ] Generate Epic 2 completion report
- [ ] Retrospective: What went well? What could improve?

---

## Key Code Snippets (Copy-Paste Ready)

### **Snippet 1: Import Statement (Use Everywhere)**
```typescript
import { OrderStatus } from '@rebuild/shared/types/order.types';
import { getStatusLabel, getStatusColor, STATUS_GROUPS } from '@rebuild/shared/utils/orderStatus';
```

### **Snippet 2: Validate Transition (Use in Services)**
```typescript
import { orderStateMachine } from '../services/orderStateMachine';

// Validate before update
if (!orderStateMachine.canTransition(currentStatus, newStatus)) {
  throw new Error(
    `Invalid state transition: ${currentStatus} → ${newStatus}. ` +
    `Valid next states: ${orderStateMachine.getNextValidStatuses(currentStatus).join(', ')}`
  );
}

// Execute transition
await orderStateMachine.transition(currentStatus, newStatus, { orderId, restaurantId });
```

### **Snippet 3: API Error Handling (Use in Routes)**
```typescript
try {
  const result = await ordersService.updateOrderStatus(orderId, newStatus);
  res.json(result);
} catch (error) {
  if (error.message.includes('Invalid state transition')) {
    return res.status(400).json({
      error: error.message,
      current_status: currentStatus,
      attempted_status: newStatus
    });
  }
  throw error;
}
```

---

## Timeline Estimate

| Task Group | Duration | Dependencies |
|------------|----------|--------------|
| **Phase 1: Consolidation** | 2-3 hours | None (can start immediately) |
| **Phase 2: Enforcement** | 4-5 hours | After Phase 1 (imports must be fixed) |
| **Phase 3: Documentation** | 1-2 hours | Parallel with Phase 2 |
| **Phase 4: Testing** | 2-3 hours | After Phase 2 (code must be complete) |
| **Total** | **8-12 hours** | **(1-1.5 days of focused work)** |

**Original Audit Estimate**: 1 week, 1 engineer ✅ **On Track**

---

## Questions & Answers

**Q: Why not delete order.schema.ts validation schema?**
A: It's used for runtime validation of API requests. We need both TypeScript types (order.types.ts) and runtime validation (order.schema.ts). This is a common pattern (Zod, Joi, etc.).

**Q: Can we run Phases 1 and 2 in parallel?**
A: No. Phase 2 depends on Phase 1 imports being fixed. TypeScript will error if imports point to deleted files.

**Q: What if we find orders in production with invalid states?**
A: The state machine enforcement is forward-looking (prevents new invalid transitions). Existing invalid states will remain until updated. We can run a data migration script if needed.

**Q: Should we add a version field for optimistic locking?**
A: Not in Epic 2 scope. This is a future enhancement (Epic 8 candidate). Current Prisma transactions provide basic concurrency safety.

**Q: What about the 7th state 'served' mentioned in audit?**
A: 'served' was deprecated and replaced with 'picked-up' in Phase 2 (before Epic 2). ORDER_FLOW.md just hasn't been updated yet. Epic 2 fixes this documentation drift.

---

## Related Documentation

- **Audit Finding**: `docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md` (Line 135)
- **State Machine**: `server/src/services/orderStateMachine.ts`
- **Canonical Type**: `shared/types/order.types.ts`
- **Validation Schema**: `shared/validation/order.schema.ts`

---

## Contact & Support

If you encounter issues during execution:
1. Check TypeScript errors with `npm run typecheck`
2. Review orderStateMachine.ts transition rules
3. Check this brief's troubleshooting section
4. Rollback using git revert if critical issue

---

**Report Generated**: 2025-01-24
**Ready for Execution**: Yes ✅
**Estimated Completion**: 1-1.5 days
**Next Epic**: Epic 3 (Checkout Consolidation)
