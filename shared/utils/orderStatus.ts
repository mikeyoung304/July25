/**
 * Order Status Utilities
 *
 * EPIC 2: Consolidated helper functions for order status display and validation.
 * Single source of truth for status-related operations across client and server.
 *
 * Type definition: @see shared/types/order.types.ts (OrderStatus)
 * State machine: @see server/src/services/orderStateMachine.ts (transition rules)
 */

import type { OrderStatus } from '../types/order.types';

/**
 * Status groups for different operational views
 * Used by KDS, Expo, and Server views to filter orders
 */
export const STATUS_GROUPS = {
  // Orders actively being worked on (Kitchen Display focus)
  ACTIVE: ['new', 'pending', 'confirmed', 'preparing'] as const,

  // Orders ready for fulfillment (Expo focus)
  READY: ['ready', 'picked-up'] as const,

  // Orders that are finished
  FINISHED: ['completed', 'cancelled'] as const,

  // Orders visible to kitchen staff
  KITCHEN_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready'] as const,

  // Orders visible to expo staff
  EXPO_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready', 'picked-up'] as const,
} as const;

/**
 * Validates if a status belongs to a specific group
 */
export function isStatusInGroup(
  status: OrderStatus,
  group: keyof typeof STATUS_GROUPS
): boolean {
  return (STATUS_GROUPS[group] as readonly string[]).includes(status);
}

/**
 * Get display label for order status
 * Returns human-readable text for UI display
 */
export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    new: 'New Order',
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    'picked-up': 'Picked Up',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return labels[status] || 'Unknown Status';
}

/**
 * Get status color for UI display (Tailwind CSS classes)
 * Returns background and text color classes
 */
export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    new: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-orange-100 text-orange-800',
    preparing: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    'picked-up': 'bg-teal-100 text-teal-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Client-side validation for status transitions
 *
 * NOTE: This is for UI validation only. Server ALWAYS enforces transitions
 * via orderStateMachine.canTransition() (Epic 2 Phase 2).
 *
 * @see server/src/services/orderStateMachine.ts for authoritative rules
 */
export function isValidStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    new: ['pending', 'cancelled'],
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked-up', 'completed', 'cancelled'],
    'picked-up': ['completed', 'cancelled'],
    completed: [], // Final state
    cancelled: [], // Final state
  };

  return validTransitions[from]?.includes(to) || false;
}

/**
 * Get next valid statuses for a given status
 * Useful for rendering UI buttons/options
 */
export function getNextValidStatuses(status: OrderStatus): OrderStatus[] {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    new: ['pending', 'cancelled'],
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['picked-up', 'completed', 'cancelled'],
    'picked-up': ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  return validTransitions[status] || [];
}

/**
 * Check if a status is a final state (no more transitions possible)
 */
export function isFinalStatus(status: OrderStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * Check if a status allows cancellation
 */
export function canCancel(status: OrderStatus): boolean {
  return !isFinalStatus(status);
}
