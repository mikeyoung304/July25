import { supabase } from '../config/database'
import { logger } from '../utils/logger'
import type { Order } from '@rebuild/shared'

/**
 * Calculate when to auto-fire a scheduled order
 * Formula: scheduled_pickup_time - prep_time_minutes
 *
 * @param scheduledPickupTime - ISO timestamp when customer wants to pick up
 * @param prepTimeMinutes - Estimated prep time (default: 15 minutes)
 * @returns ISO timestamp when kitchen should start preparing
 */
export function calculateAutoFireTime(
  scheduledPickupTime: string,
  prepTimeMinutes: number = 15
): string {
  const pickupTime = new Date(scheduledPickupTime)
  const fireTime = new Date(pickupTime.getTime() - (prepTimeMinutes * 60000))
  return fireTime.toISOString()
}

/**
 * Check for scheduled orders that should be fired now
 * Run this periodically (e.g., every minute via cron job)
 *
 * @param restaurantId - Restaurant UUID
 * @returns Array of orders that were fired
 */
export async function checkAndFireScheduledOrders(
  restaurantId: string
): Promise<Order[]> {
  const now = new Date().toISOString()

  try {
    // Find scheduled orders whose auto_fire_time has passed
    const { data: ordersToFire, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_scheduled', true)
      .eq('manually_fired', false)
      .lte('auto_fire_time', now)

    if (error) {
      logger.error('Failed to fetch scheduled orders:', error)
      throw error
    }

    if (!ordersToFire || ordersToFire.length === 0) {
      return []
    }

    // Mark orders as fired (move to active queue)
    const updates = ordersToFire.map((order: Order) =>
      supabase
        .from('orders')
        .update({
          is_scheduled: false,
          manually_fired: false,
          status: 'preparing',
          updated_at: now
        })
        .eq('id', order.id)
        .eq('restaurant_id', restaurantId) // Multi-tenancy guard
    )

    await Promise.all(updates)

    logger.info(`Auto-fired ${ordersToFire.length} scheduled orders for restaurant ${restaurantId}`)
    return ordersToFire as Order[]
  } catch (error) {
    logger.error('Error in checkAndFireScheduledOrders:', error)
    return []
  }
}

/**
 * Manually fire a scheduled order early
 * Called when kitchen staff clicks "Fire Early" button
 *
 * @param orderId - Order UUID
 * @param restaurantId - Restaurant UUID (for security check)
 * @returns Updated order or null if failed
 */
export async function manuallyFireScheduledOrder(
  orderId: string,
  restaurantId: string
): Promise<Order | null> {
  const now = new Date().toISOString()

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .update({
        is_scheduled: false,
        manually_fired: true,
        status: 'preparing',
        updated_at: now
      })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId) // Security: only fire own orders
      .eq('is_scheduled', true) // Only fire if actually scheduled
      .select()
      .single()

    if (error) {
      logger.error('Failed to manually fire scheduled order:', error)
      return null
    }

    logger.info(`Manually fired scheduled order ${orderId}`)
    return order as Order
  } catch (error) {
    logger.error('Error in manuallyFireScheduledOrder:', error)
    return null
  }
}

/**
 * Get all scheduled orders for a restaurant
 *
 * @param restaurantId - Restaurant UUID
 * @returns Array of scheduled orders
 */
export async function getScheduledOrders(
  restaurantId: string
): Promise<Order[]> {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_scheduled', true)
      .order('scheduled_pickup_time', { ascending: true })

    if (error) {
      logger.error('Failed to fetch scheduled orders:', error)
      return []
    }

    return (orders || []) as Order[]
  } catch (error) {
    logger.error('Error in getScheduledOrders:', error)
    return []
  }
}
