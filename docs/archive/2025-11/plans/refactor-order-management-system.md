# ♻️ Refactor: Order Management System (Simplified)

## Overview

Align order status types between client and server, and implement the three stub notification hooks in the state machine. This is a focused 2-3 day effort addressing the most critical technical debt.

**Type:** Improvement / Refactoring
**Priority:** Medium
**Estimated Effort:** 2-3 days
**Complexity:** Low-Medium

## Problem Statement / Motivation

The order management system has two specific issues that should be addressed:

1. **Incomplete Notification Hooks**: The state machine defines hooks for kitchen notifications, customer notifications, and refund processing (`orderStateMachine.ts:258-269`) but they remain as TODO stubs. Orders transition correctly but nothing happens downstream.

2. **Client-Server Type Drift**: `client/src/utils/orderStatusUtils.ts` contains hardcoded status groups with non-existent statuses (`in_progress`, `ready_for_pickup`, `delivered`) that don't match the canonical 8-state flow. This causes UI bugs where orders don't appear in the correct status groups.

3. **Loose WebSocket Typing**: `OrderUpdatePayload.status` uses `string` instead of `OrderStatus`, bypassing TypeScript's type safety.

## Non-Goals (Explicitly Deferred)

Based on reviewer feedback, the following are **out of scope** for this refactor:

- ❌ `useOrderSubmission` hook (write when needed, not premature abstraction)
- ❌ `useOrderVersionConflict` hook (version conflicts are < 0.5%, handle in existing error flows)
- ❌ Voice order confidence score persistence (no business case yet - log to monitoring if needed)
- ❌ Database migrations (no schema changes required)
- ❌ Full notification service (stub with logs first, build real service when needed)

## Proposed Solution

### Phase 1: Type Alignment (4 hours)

1. Update `orderStatusUtils.ts` to import from shared types
2. Fix `OrderUpdatePayload` to use strict `OrderStatus` typing
3. Remove `getSafeOrderStatus()` defensive code (server enforces state machine)

### Phase 2: Notification Hooks (1-2 days)

1. Implement `notifyKitchen()` hook with logging + WebSocket broadcast
2. Implement `notifyCustomer()` hook with logging (real SMS/email deferred)
3. Implement `processRefund()` hook with logging (real refund integration deferred)
4. Add basic error handling to prevent hooks from blocking transitions

## Technical Considerations

### Key Files Affected

**Client-Side:**
- `client/src/utils/orderStatusUtils.ts` - Import from shared, remove fake statuses
- `client/src/services/websocket/orderUpdates.ts` - Strict `OrderStatus` typing

**Server-Side:**
- `server/src/services/orderStateMachine.ts:258-269` - Implement hook stubs

### Architecture Impacts
- **No Breaking Changes**: All changes are internal refactoring
- **No Database Changes**: No migrations required
- **Backward Compatible**: Existing behavior unchanged, just adding notifications

## Acceptance Criteria

### Functional Requirements
- [x] Client status utilities import from `shared/utils/orderStatus.ts`
- [x] No hardcoded status values in `orderStatusUtils.ts`
- [x] `OrderUpdatePayload.status` uses `OrderStatus` type (not `string`)
- [x] Kitchen hook logs when order transitions to `confirmed`
- [x] Customer hook logs when order transitions to `ready`
- [x] Refund hook logs when paid order transitions to `cancelled`
- [x] Hook failures do not block order status transitions

### Testing Requirements
- [x] Unit test for each notification hook (15 new tests in `orderStateMachine.test.ts`)
- [x] Verify TypeScript compilation catches wrong status values
- [ ] Manual test: order flow works end-to-end with hooks logging

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Type errors from status drift | 0 | TypeScript compilation |
| Hook execution (logged) | Works | Server logs |
| Order transitions | No regression | Existing tests pass |

## MVP Implementation

### Phase 1: Type Alignment

#### orderStatusUtils.ts

```typescript
// client/src/utils/orderStatusUtils.ts
import { OrderStatus } from 'shared/types/order.types';
import { STATUS_GROUPS } from 'shared/utils/orderStatus';

// Re-export from shared - single source of truth
export { STATUS_GROUPS };

// With server-side state machine enforcement, just return the status directly
export function getOrderStatus(order: { status: OrderStatus }): OrderStatus {
  return order.status;
}

export function isStatusInGroup(
  status: OrderStatus,
  group: keyof typeof STATUS_GROUPS
): boolean {
  return STATUS_GROUPS[group].includes(status);
}
```

#### orderUpdates.ts

```typescript
// client/src/services/websocket/orderUpdates.ts
import { Order, OrderStatus } from 'shared/types/order.types';

export interface OrderUpdatePayload {
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'item_status_changed';
  order?: Order;
  orderId?: string;
  itemId?: string;
  status?: OrderStatus;           // Changed from string
  previousStatus?: OrderStatus;   // Changed from string
  updatedBy?: string;
}
```

### Phase 2: Notification Hooks (Stub Implementation)

#### orderStateMachine.ts

```typescript
// server/src/services/orderStateMachine.ts
// Replace the TODO stubs at lines 258-269

// Hook: Kitchen notification on order confirmation
OrderStateMachine.registerHook('*->confirmed', async (_transition, order) => {
  logger.info('Order confirmed - notifying kitchen', {
    orderId: order.id,
    restaurantId: order.restaurant_id,
    orderNumber: order.order_number,
    itemCount: order.items?.length || 0
  });

  // Broadcast via existing WebSocket to kitchen displays
  try {
    broadcastOrderUpdate(order.restaurant_id, {
      type: 'kitchen_notification',
      orderId: order.id,
      message: `New order ${order.order_number} confirmed`,
      priority: 'high'
    });
  } catch (error) {
    // Log but don't block - notifications are best-effort
    logger.error('Failed to broadcast kitchen notification', {
      orderId: order.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Hook: Customer notification when order is ready
OrderStateMachine.registerHook('*->ready', async (_transition, order) => {
  // Skip if no customer contact info
  if (!order.customer_phone && !order.customer_email) {
    logger.debug('No customer contact info, skipping ready notification', {
      orderId: order.id
    });
    return;
  }

  logger.info('Order ready - would notify customer', {
    orderId: order.id,
    orderNumber: order.order_number,
    hasPhone: !!order.customer_phone,
    hasEmail: !!order.customer_email
  });

  // TODO: Integrate with SMS/email service when available
  // For now, just log. Real notification service is a separate initiative.
});

// Hook: Process refund when paid order is cancelled
OrderStateMachine.registerHook('*->cancelled', async (_transition, order) => {
  if (order.payment_status !== 'paid') {
    logger.debug('Order not paid, skipping refund processing', {
      orderId: order.id,
      paymentStatus: order.payment_status
    });
    return;
  }

  logger.warn('Paid order cancelled - refund required', {
    orderId: order.id,
    orderNumber: order.order_number,
    total: order.total,
    paymentMethod: order.payment_method
  });

  // TODO: Integrate with Stripe refund API
  // For now, log at WARN level so operations team can process manually
});
```

## Dependencies

- [x] OrderStateMachine with hook registration - **READY**
- [x] Shared types in `shared/types/order.types.ts` - **READY**
- [x] WebSocket broadcast infrastructure - **READY**
- [ ] SMS/Email notification service - **NOT REQUIRED** (stubbed with logs)
- [ ] Stripe refund integration - **NOT REQUIRED** (stubbed with logs)

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Hook failure blocks transition | Low | High | Try/catch with logging, continue on error |
| Type import breaks build | Low | Medium | Test TypeScript compilation before merge |
| WebSocket broadcast fails | Medium | Low | Best-effort, logged on failure |

## Rollback Strategy

- All changes are internal refactoring with no external API changes
- If issues occur, revert the single PR
- Hooks are non-blocking, so even buggy hooks won't break order flow

## Future Considerations (Separate Initiatives)

When/if needed, these can be separate stories:

1. **Real Notification Service**: When customer SMS/email notifications become a priority
2. **Stripe Refund Integration**: When automated refunds are required
3. **Voice Confidence Tracking**: When there's evidence of voice order quality issues
4. **Client-Side Retry Logic**: If version conflicts become a measurable problem (currently < 0.5%)

## References

### Internal References
- Order Types: `shared/types/order.types.ts:6-14`
- Status Groups: `shared/utils/orderStatus.ts`
- State Machine: `server/src/services/orderStateMachine.ts:30-39`
- Status Utils (to fix): `client/src/utils/orderStatusUtils.ts`
- WebSocket Events (to fix): `client/src/services/websocket/orderUpdates.ts:11-19`

### Review Feedback Applied
- DHH Review: Reduced from 4 weeks to 2-3 days
- Kieran Review: Removed dependency on non-existent NotificationService
- Simplicity Review: Cut Phases 3 & 4 entirely as premature optimization

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
