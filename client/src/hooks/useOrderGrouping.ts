import { useMemo } from 'react'
import type { Order, OrderStatus } from '@rebuild/shared'

export interface OrderGroup {
  order_id: string                  // UUID
  order_number: string              // "20251014-0022"
  customer_name: string             // "John Doe"
  customer_phone?: string           // For SMS
  order_type: 'online' | 'pickup' | 'delivery'
  pickup_type: 'drive-thru' | 'counter' | 'curbside' | 'delivery'

  // Items (all from this order)
  orders: Order[]                  // Raw order objects
  total_items: number              // Count of items
  completed_items: number          // Items ready
  preparing_items: number          // Items in progress

  // Status
  status: OrderStatus
  completion_percentage: number     // 0-100

  // Timing
  created_at: string
  oldest_item_time: string
  newest_item_time: string
  estimated_ready?: string

  // Urgency
  urgency_level: 'normal' | 'warning' | 'urgent' | 'critical'
  age_minutes: number

  // Optional metadata
  notes?: string
  customer_car?: string             // "Blue Honda"
  notified?: boolean               // SMS sent?
}

/**
 * Groups orders by order_number (single customer order)
 * Similar to table grouping but for online/pickup orders
 */
export const useOrderGrouping = (orders: Order[]) => {
  return useMemo(() => {
    const orderMap = new Map<string, OrderGroup>()

    // Process each order
    orders.forEach(order => {
      // Skip completed/cancelled/picked-up orders
      if (['completed', 'cancelled', 'picked-up'].includes(order.status)) {
        return
      }

      const order_number = order.order_number

      // Initialize group if not exists
      if (!orderMap.has(order_number)) {
        orderMap.set(order_number, {
          order_id: order.id,
          order_number: order.order_number,
          customer_name: order.customer_name || 'Guest',
          customer_phone: order.customer_phone,
          order_type: order.type,
          pickup_type: determinePickupType(order),

          orders: [],
          total_items: 0,
          completed_items: 0,
          preparing_items: 0,

          status: 'pending',
          completion_percentage: 0,

          created_at: order.created_at,
          oldest_item_time: order.created_at,
          newest_item_time: order.created_at,

          urgency_level: 'normal',
          age_minutes: 0,

          notes: order.notes,
        })
      }

      const group = orderMap.get(order_number)!
      group.orders.push(order)

      // Count items by status
      order.items.forEach(() => {
        group.total_items++

        switch (order.status) {
          case 'ready':
          case 'completed':
            group.completed_items++
            break
          case 'preparing':
          case 'confirmed':
            group.preparing_items++
            break
        }
      })

      // Update timing
      if (new Date(order.created_at) < new Date(group.oldest_item_time)) {
        group.oldest_item_time = order.created_at
      }
      if (new Date(order.created_at) > new Date(group.newest_item_time)) {
        group.newest_item_time = order.created_at
      }
    })

    // Calculate group statistics
    orderMap.forEach(group => {
      // Completion percentage
      if (group.total_items > 0) {
        group.completion_percentage = Math.round(
          (group.completed_items / group.total_items) * 100
        )
      }

      // Overall status
      if (group.completed_items === group.total_items) {
        group.status = 'ready'
      } else if (group.preparing_items > 0) {
        group.status = 'preparing'
      } else {
        group.status = 'pending'
      }

      // Calculate age and urgency
      const age_minutes = Math.floor(
        (Date.now() - new Date(group.oldest_item_time).getTime()) / 60000
      )
      group.age_minutes = age_minutes

      if (age_minutes >= 25) {
        group.urgency_level = 'critical'
      } else if (age_minutes >= 18) {
        group.urgency_level = 'urgent'
      } else if (age_minutes >= 12) {
        group.urgency_level = 'warning'
      } else {
        group.urgency_level = 'normal'
      }

      // Estimated ready time (simple calculation)
      if (group.status !== 'ready') {
        const remaining_items = group.total_items - group.completed_items
        const estimated_minutes = Math.max(8, remaining_items * 3) // 3 min per item, min 8
        const estimated_time = new Date(Date.now() + estimated_minutes * 60000)
        group.estimated_ready = estimated_time.toISOString()
      }
    })

    return Array.from(orderMap.values())
  }, [orders])
}

/**
 * Determine pickup type from order metadata
 */
function determinePickupType(order: Order): OrderGroup['pickup_type'] {
  // Check metadata or order notes
  const notes = order.notes?.toLowerCase() || ''

  if (notes.includes('drive-thru') || notes.includes('drive thru')) {
    return 'drive-thru'
  }
  if (notes.includes('curbside')) {
    return 'curbside'
  }
  if (notes.includes('delivery')) {
    return 'delivery'
  }

  // Default: assume drive-thru for online orders
  return order.type === 'online' ? 'drive-thru' : 'counter'
}

/**
 * Sort order groups
 */
export const sortOrderGroups = (
  groups: OrderGroup[],
  sortBy: 'urgency' | 'age' | 'completion' | 'order_number' = 'urgency'
): OrderGroup[] => {
  switch (sortBy) {
    case 'urgency':
      return [...groups].sort((a, b) => {
        const urgencyOrder = { critical: 0, urgent: 1, warning: 2, normal: 3 }
        const urgencyDiff = urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level]
        if (urgencyDiff !== 0) return urgencyDiff

        // If same urgency, sort by age
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })

    case 'age':
      return [...groups].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

    case 'completion':
      return [...groups].sort((a, b) => a.completion_percentage - b.completion_percentage)

    case 'order_number':
      return [...groups].sort((a, b) => a.order_number.localeCompare(b.order_number))

    default:
      return groups
  }
}
