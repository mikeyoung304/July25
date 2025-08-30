import { useEffect } from 'react'
import { Order } from '@/services/types'
// import { orderService } from '@/services' // Not currently used
import { orderSubscription, OrderEvent } from '@/services/realtime/orderSubscription'
import { useRestaurant } from '@/core'

export interface UseOrderSubscriptionOptions {
  onOrderCreated?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
  onOrderStatusChanged?: (orderId: string, newStatus: Order['status'], previousStatus: Order['status']) => void
}

export const useOrderSubscription = (options: UseOrderSubscriptionOptions): void => {
  const { onOrderCreated, onOrderUpdated, onOrderStatusChanged } = options
  const { restaurant } = useRestaurant()
  
  useEffect(() => {
    // const restaurantId = restaurant?.id || 'rest-1' // Not currently used
    
    // Create a unique subscription ID
    const subscriptionId = `order-subscription-${Date.now()}`
    
    // Subscribe to order events
    const unsubscribe = orderSubscription.subscribe(subscriptionId, (event: OrderEvent) => {
      switch (event.type) {
        case 'ORDER_CREATED':
          onOrderCreated?.(event.order)
          break
        case 'ORDER_UPDATED':
          onOrderUpdated?.(event.order)
          break
        case 'ORDER_STATUS_CHANGED':
          onOrderStatusChanged?.(event.orderId, event.status, event.previousStatus)
          break
      }
    })
    
    // Subscribe to new orders coming in - disabled until implemented
    // const unsubscribeFromNewOrders = orderService.subscribeToOrders(restaurantId, () => {
    //   // This is already handled by the ORDER_CREATED event
    // })
    
    return () => {
      unsubscribe()
      // unsubscribeFromNewOrders()
    }
  }, [onOrderCreated, onOrderUpdated, onOrderStatusChanged, restaurant?.id])
}