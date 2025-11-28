/**
 * Order Status Utilities (Client-Side)
 *
 * REFACTORED: Now imports from shared utilities - single source of truth.
 * The server enforces state transitions via OrderStateMachine.
 *
 * @see shared/utils/orderStatus.ts (canonical definitions)
 * @see server/src/services/orderStateMachine.ts (transition enforcement)
 */

import type { OrderStatus } from '@rebuild/shared';
import {
  STATUS_GROUPS,
  isStatusInGroup as sharedIsStatusInGroup,
  getStatusLabel,
  getStatusColor,
  isValidStatusTransition,
  getNextValidStatuses,
  isFinalStatus,
  canCancel
} from '@rebuild/shared';

// Re-export from shared - single source of truth
export { STATUS_GROUPS, getStatusLabel, getStatusColor, isValidStatusTransition, getNextValidStatuses, isFinalStatus, canCancel };

/**
 * Check if a status belongs to a specific group
 */
export function isStatusInGroup(
  status: OrderStatus,
  group: keyof typeof STATUS_GROUPS
): boolean {
  return sharedIsStatusInGroup(status, group);
}

/**
 * Get order status directly - server enforces state machine
 * Previously had defensive code for unknown statuses, but that's now handled server-side
 */
export function getOrderStatus(order: { status: OrderStatus }): OrderStatus {
  return order.status;
}
