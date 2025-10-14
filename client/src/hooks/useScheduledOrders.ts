import { useMemo } from 'react'
import type { Order } from '@rebuild/shared'

export interface ScheduledOrderGroup {
  scheduled_time: string
  fire_time: string
  minutes_until_fire: number
  orders: Order[]
  order_count: number
}

/**
 * Separates orders into active (ready to cook) and scheduled (future orders)
 * Groups scheduled orders by fire time for better organization
 */
export const useScheduledOrders = (orders: Order[]) => {
  return useMemo(() => {
    // Separate active from scheduled
    const active = orders.filter(o => !o.is_scheduled)
    const scheduled = orders.filter(o => o.is_scheduled)

    // Group scheduled orders by fire time
    const scheduledGroupsMap = scheduled.reduce((groups, order) => {
      const fireTime = order.auto_fire_time || order.scheduled_pickup_time
      if (!fireTime) return groups

      const key = fireTime

      if (!groups[key]) {
        const minutesUntilFire = Math.floor(
          (new Date(fireTime).getTime() - Date.now()) / 60000
        )

        groups[key] = {
          scheduled_time: order.scheduled_pickup_time!,
          fire_time: fireTime,
          minutes_until_fire: minutesUntilFire,
          orders: [],
          order_count: 0
        }
      }

      groups[key].orders.push(order)
      groups[key].order_count++
      return groups
    }, {} as Record<string, ScheduledOrderGroup>)

    // Convert to array and sort by fire time (earliest first)
    const scheduledGroups = Object.values(scheduledGroupsMap).sort(
      (a, b) => new Date(a.fire_time).getTime() - new Date(b.fire_time).getTime()
    )

    return {
      active,
      scheduled: scheduledGroups,
      activeCount: active.length,
      scheduledCount: scheduled.length
    }
  }, [orders])
}
