import { useEffect, useState, useCallback, useRef } from 'react'
import { Order } from '@/services/api'
import { orderSubscription, OrderEvent } from '@/services/realtime/orderSubscription'

interface UseOrderSubscriptionOptions {
  onOrderCreated?: (order: Order) => void
  onOrderUpdated?: (order: Order) => void
  onOrderStatusChanged?: (orderId: string, status: Order['status'], previousStatus: Order['status']) => void
  onOrderDeleted?: (orderId: string) => void
  enabled?: boolean
}

export const useOrderSubscription = (options: UseOrderSubscriptionOptions = {}) => {
  const { 
    onOrderCreated,
    onOrderUpdated,
    onOrderStatusChanged,
    onOrderDeleted,
    enabled = true 
  } = options
  
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<OrderEvent | null>(null)
  const subscriptionIdRef = useRef<string | undefined>(undefined)
  
  const handleEvent = useCallback((event: OrderEvent) => {
    setLastEvent(event)
    
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
      case 'ORDER_DELETED':
        onOrderDeleted?.(event.orderId)
        break
    }
  }, [onOrderCreated, onOrderUpdated, onOrderStatusChanged, onOrderDeleted])
  
  useEffect(() => {
    if (!enabled) return
    
    // Generate unique subscription ID
    subscriptionIdRef.current = `subscription-${Date.now()}-${Math.random()}`
    
    // Subscribe to order events
    const unsubscribe = orderSubscription.subscribe(
      subscriptionIdRef.current,
      handleEvent
    )
    
    setIsConnected(true)
    
    return () => {
      unsubscribe()
      setIsConnected(false)
    }
  }, [enabled, handleEvent])
  
  return {
    isConnected,
    lastEvent
  }
}