import { useEffect } from 'react'
import { Order } from '../types'
import { orderService } from '@/services'
import { orderSubscription } from '@/services/realtime/orderSubscription'

export interface UseOrderSubscriptionOptions {
  onOrderCreated?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
  onOrderStatusChanged?: (orderId: string, newStatus: Order['status'], previousStatus: Order['status']) => void
}

export const useOrderSubscription = (options: UseOrderSubscriptionOptions): void => {
  const { onOrderCreated, onOrderUpdated, onOrderStatusChanged } = options
  
  useEffect(() => {
    const unsubscribers: (() => void)[] = []
    
    if (onOrderCreated) {
      unsubscribers.push(
        orderSubscription.on('orderCreated', onOrderCreated)
      )
    }
    
    if (onOrderUpdated) {
      unsubscribers.push(
        orderSubscription.on('orderUpdated', onOrderUpdated)
      )
    }
    
    if (onOrderStatusChanged) {
      unsubscribers.push(
        orderSubscription.on('orderStatusChanged', onOrderStatusChanged)
      )
    }
    
    // Subscribe to new orders coming in
    const unsubscribeFromNewOrders = orderService.subscribeToOrders(() => {
      // This is already handled by the orderCreated event
    })
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe())
      unsubscribeFromNewOrders()
    }
  }, [onOrderCreated, onOrderUpdated, onOrderStatusChanged])
}