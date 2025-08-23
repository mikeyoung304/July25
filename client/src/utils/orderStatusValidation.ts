import type { Order } from '@rebuild/shared'

/**
 * Complete list of all valid order statuses
 * CRITICAL: Must handle ALL 7 statuses to prevent runtime errors
 */
export const ORDER_STATUSES = [
  'new',
  'pending', 
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
] as const

export type OrderStatus = typeof ORDER_STATUSES[number]

/**
 * Status groups for different operational views
 */
export const STATUS_GROUPS = {
  // Orders actively being worked on (Kitchen Display focus)
  ACTIVE: ['new', 'pending', 'confirmed', 'preparing'] as const,
  
  // Orders ready for fulfillment (Expo focus)
  READY: ['ready'] as const,
  
  // Orders that are finished
  FINISHED: ['completed', 'cancelled'] as const,
  
  // Orders visible to kitchen staff
  KITCHEN_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready'] as const,
  
  // Orders visible to expo staff
  EXPO_VISIBLE: ['new', 'pending', 'confirmed', 'preparing', 'ready'] as const
} as const

/**
 * Validates if a status is a valid order status
 */
export function isValidOrderStatus(status: string): status is Order['status'] {
  return ORDER_STATUSES.includes(status as Order['status'])
}

/**
 * Validates if a status belongs to a specific group
 */
export function isStatusInGroup(
  status: Order['status'], 
  group: keyof typeof STATUS_GROUPS
): boolean {
  return STATUS_GROUPS[group].includes(status as any)
}

/**
 * Get display label for order status
 */
export function getStatusLabel(status: Order['status']): string {
  const labels: Record<Order['status'], string> = {
    'new': 'New Order',
    'pending': 'Pending',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready': 'Ready',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }
  
  return labels[status] || 'Unknown Status'
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: Order['status']): string {
  const colors: Record<Order['status'], string> = {
    'new': 'bg-blue-100 text-blue-800',
    'pending': 'bg-yellow-100 text-yellow-800',
    'confirmed': 'bg-orange-100 text-orange-800',
    'preparing': 'bg-purple-100 text-purple-800',
    'ready': 'bg-green-100 text-green-800',
    'completed': 'bg-gray-100 text-gray-800',
    'cancelled': 'bg-red-100 text-red-800'
  }
  
  return colors[status] || 'bg-gray-100 text-gray-800'
}

/**
 * Validates order status transitions
 */
export function isValidStatusTransition(
  from: Order['status'], 
  to: Order['status']
): boolean {
  const validTransitions: Record<Order['status'], Order['status'][]> = {
    'new': ['pending', 'confirmed', 'cancelled'],
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['preparing', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['completed', 'cancelled'],
    'completed': [], // Final state
    'cancelled': [] // Final state
  }
  
  return validTransitions[from]?.includes(to) || false
}

/**
 * Runtime validation for order objects
 */
export function validateOrderStatus(order: unknown): order is Order {
  if (!order || typeof order !== 'object') {
    return false
  }
  
  const orderObj = order as Record<string, unknown>
  
  return (
    typeof orderObj.status === 'string' &&
    isValidOrderStatus(orderObj.status)
  )
}

/**
 * Safe status access with fallback
 */
export function getSafeOrderStatus(order: unknown): Order['status'] {
  if (validateOrderStatus(order)) {
    return order.status
  }
  
  console.warn('Invalid order status detected, defaulting to "new"', order)
  return 'new'
}