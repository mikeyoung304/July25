# Epic 2: Order Status Flow Consolidation - New Chat Summary

**Purpose**: Standalone brief for executing Epic 2 in a new Claude Code chat with no prior context

**Created**: 2025-01-24
**Repository**: `/Users/mikeyoung/CODING/rebuild-6.0`
**Estimated Time**: 8-12 hours (1-1.5 days)

---

## Quick Context

You are working on **Epic 2** of a multi-phase audit remediation project. The codebase is a TypeScript/React monorepo for a restaurant ordering system.

**Phases 1-5 Complete**:
- ✅ Phase 5 just finished: Eliminated security vulnerability (client could override order totals)
- ✅ System health: C+ (69/100) → B+ (85/100)
- ✅ Production readiness: 65% → 95%

**Your Task (Epic 2)**: Fix order status flow divergence and enforce state machine validation.

---

## The Problem

**Audit Finding** (Line 135 of ARCHITECTURAL_AUDIT_REPORT_V2.md):
> "Status Flow Divergence - 3 different status definitions (server: 7 states, client1: 8 states, client2: 9 states)"

**Reality** (discovered by scouts):
- 6 different OrderStatus type definitions scattered across codebase
- State machine exists (`orderStateMachine.ts`) but is **NOT enforced**
- 4 critical bypass patterns allow invalid state transitions
- Example: An order can go from `completed` → `pending` (should be impossible)

---

## The Solution

**Phase 1: Consolidate** (2-3 hours)
1. Delete deprecated `unified-order.types.ts` (7-state version missing 'picked-up')
2. Move client helpers to `shared/utils/orderStatus.ts`
3. Update all imports to use canonical `shared/types/order.types.ts`

**Phase 2: Enforce** (4-5 hours)
4. Add `orderStateMachine.canTransition()` validation to `orders.service.ts`
5. Add validation to `scheduledOrders.service.ts` (auto-fire + manual fire)
6. Fix `orders.routes.ts` PATCH endpoint (remove hardcoded validation)
7. Fix `orders.routes.ts` DELETE endpoint (validate cancellation rules)

**Phase 3: Document** (1-2 hours)
8. Update ORDER_FLOW.md (7 states → 8 states)
9. Update API documentation
10. Create ADR-015: State Machine Enforcement

**Phase 4: Test** (2-3 hours)
11. Type checks, unit tests, integration tests, manual QA

---

## Canonical 8-State Flow

```
new → pending → confirmed → preparing → ready → picked-up → completed
  ↓       ↓          ↓           ↓         ↓         ↓
  └───────┴──────────┴───────────┴─────────┴─────────→ cancelled
```

**Valid Transitions** (from `orderStateMachine.ts:30-39`):
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

---

## Critical Files to Modify

**Delete (2 files)**:
1. `/Users/mikeyoung/CODING/rebuild-6.0/shared/types/unified-order.types.ts`
2. `/Users/mikeyoung/CODING/rebuild-6.0/client/src/utils/orderStatusValidation.ts`

**Create (2 files)**:
1. `/Users/mikeyoung/CODING/rebuild-6.0/shared/utils/orderStatus.ts` (move helpers here)
2. `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-015-order-status-state-machine-enforcement.md`

**Modify (5 files)**:
1. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/orders.service.ts` (Lines 364-477)
2. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/services/scheduledOrders.service.ts` (Lines 60, 97)
3. `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/orders.routes.ts` (Lines 237-260, 262-282)
4. ORDER_FLOW.md (find in docs/ directory)
5. API documentation (openapi.yaml or similar)

**Plus**: All files importing deleted files (use Glob to find)

---

## Key Code Pattern (Copy-Paste Ready)

**Before** (`orders.service.ts` Line 364-477):
```typescript
async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  return await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus }  // ❌ Allows invalid transitions
  });
}
```

**After** (Epic 2):
```typescript
async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, restaurant_id: true }
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (!orderStateMachine.canTransition(order.status, newStatus)) {
    throw new Error(
      `Invalid state transition: ${order.status} → ${newStatus}. ` +
      `Valid next states: ${orderStateMachine.getNextValidStatuses(order.status).join(', ')}`
    );
  }

  return await orderStateMachine.transition(order.status, newStatus, {
    orderId: order.id,
    restaurantId: order.restaurant_id
  });
}
```

---

## Commands to Run

**Start Epic 2**:
```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
git checkout -b epic-2-order-status-consolidation
```

**After each phase**:
```bash
npm run typecheck  # Must pass before proceeding
```

**Before committing**:
```bash
npm run typecheck
npm run test:server
npm run test:e2e
```

**Commit with**:
```bash
git add .
git commit -m "refactor(orders): consolidate status flow and enforce state machine

Epic 2: Order Status Flow Consolidation

Phase 1: Consolidation
- Deleted unified-order.types.ts (deprecated 7-state version)
- Created shared/utils/orderStatus.ts with display helpers
- Updated X imports to use canonical order.types.ts

Phase 2: Enforcement
- Added orderStateMachine validation to orders.service.ts
- Added validation to scheduledOrders.service.ts
- Fixed orders.routes.ts to use service validation
- Added cancellation validation to DELETE endpoint

Phase 3: Documentation
- Updated ORDER_FLOW.md (7 states → 8 states)
- Updated API docs with transition rules
- Created ADR-015: State Machine Enforcement

Impact:
- Eliminates audit finding Line 135 (Status Flow Divergence)
- Prevents invalid state transitions (completed → pending)
- Data integrity guaranteed by state machine

Resolves: ARCHITECTURAL_AUDIT_REPORT_V2.md Line 135

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

**Before**:
- ❌ 6 different OrderStatus definitions
- ❌ State machine not enforced
- ❌ Invalid transitions possible

**After**:
- ✅ 1 canonical OrderStatus definition
- ✅ 100% state machine enforcement
- ✅ Invalid transitions rejected with clear errors
- ✅ All tests passing
- ✅ Documentation updated

---

## What to Tell Claude in New Chat

**Paste this**:

```
I need you to execute Epic 2: Order Status Flow Consolidation for this codebase.

Current context:
- Working directory: /Users/mikeyoung/CODING/rebuild-6.0/server
- Repository structure: monorepo (client/, server/, shared/, supabase/)
- We're on Phase 5 complete, starting Epic 2 next
- System health: B+ (85/100), 95% production ready

Your task:
Read docs/reports/EPIC_2_EXECUTION_BRIEF.md - this has the complete plan.

The problem:
- 6 different OrderStatus type definitions scattered across codebase
- State machine exists but is NOT enforced
- Invalid state transitions are possible (e.g., completed → pending)

The solution (in order):
1. Delete deprecated unified-order.types.ts
2. Move client helpers to shared/utils/orderStatus.ts
3. Update all imports to canonical order.types.ts
4. Add orderStateMachine validation to orders.service.ts
5. Add validation to scheduledOrders.service.ts
6. Fix orders.routes.ts PATCH and DELETE endpoints
7. Update documentation (ORDER_FLOW.md, API docs, ADR-015)
8. Run tests (typecheck, unit, integration, E2E)

Timeline: 8-12 hours (1-1.5 days)
Risk: Low (TypeScript catches import issues)

Please start by reading the execution brief, then execute the plan phase by phase. Use TodoWrite to track progress.
```

---

## Important Notes

1. **OrderStateMachine already exists** at `server/src/services/orderStateMachine.ts` - it's fully implemented, just not enforced
2. **Use TodoWrite tool** to track progress through phases
3. **Run typecheck after each phase** to catch import issues early
4. **Two-phase rollout recommended**:
   - Phase A: Log warnings for invalid transitions (don't reject)
   - Phase B: Enable enforcement (return 400 errors)
5. **Don't delete order.schema.ts** - it's used for runtime validation (Zod/Joi pattern)
6. **Snake_case convention** (ADR-001): ALL fields use snake_case, never camelCase

---

## Reference Documents

**Full execution plan**:
- `docs/reports/EPIC_2_EXECUTION_BRIEF.md` (29 pages, comprehensive)

**Audit context**:
- `docs/reports/ARCHITECTURAL_AUDIT_REPORT_V2.md` (Line 135)
- `docs/reports/AUDIT_PROGRESS_SUMMARY.md` (Phase 5 status)

**State machine**:
- `server/src/services/orderStateMachine.ts` (existing implementation)

**Canonical type**:
- `shared/types/order.types.ts` (single source of truth)

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing workflows | Two-phase rollout (log warnings → enforce) |
| Import changes break build | TypeScript catches all issues at compile time |
| Scheduled orders fail to fire | Add comprehensive logging, validate before fire |
| Race conditions | Add logging, consider optimistic locking (future) |

**Rollback**: Git revert Epic 2 commits, redeploy previous version (< 5 minutes)

---

## After Epic 2 Complete

**Update these docs**:
1. ARCHITECTURAL_AUDIT_REPORT_V2.md (mark Epic 2 complete)
2. AUDIT_PROGRESS_SUMMARY.md (9 of 169 items resolved)
3. Create EPIC_2_COMPLETION_REPORT.md (follow Phase 5 report pattern)

**Next Epic**:
- Epic 3: Checkout Flow Consolidation (3 weeks)
- OR Phase 6: Price Validation (2 weeks) - similar security fix to Phase 5

---

**Report Generated**: 2025-01-24
**Ready for New Chat**: Yes ✅
**Full Details**: `docs/reports/EPIC_2_EXECUTION_BRIEF.md`
