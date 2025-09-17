import type { OrderStatus } from '@rebuild/shared'

/**
 * Complete list of all 7 order statuses to ensure exhaustive handling
 * and prevent runtime errors from missing status checks
 */
export const ALL_ORDER_STATUSES: OrderStatus[] = [
  'new',
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
] as const

/**
 * Active order statuses that should be displayed in kitchen/expo displays
 */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'new',
  'pending',
  'confirmed',
  'preparing',
  'ready'
] as const

/**
 * Final order statuses that should typically be hidden from active views
 */
export const FINAL_ORDER_STATUSES: OrderStatus[] = [
  'completed',
  'cancelled'
] as const

/**
 * Check if an order is in an active state
 */
export function isActiveOrder(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.includes(status)
}

/**
 * Check if an order is in a final state
 */
export function isFinalOrder(status: OrderStatus): boolean {
  return FINAL_ORDER_STATUSES.includes(status)
}