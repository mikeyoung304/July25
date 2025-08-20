import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/services/logger'
import { useAsyncState } from '@/hooks/useAsyncState'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { useAriaLive } from '@/hooks/keyboard/useAriaLive'
import { useToast } from '@/hooks/useToast'
import { api } from '@/services/api'
import { performanceMonitor } from '@/services/performance/performanceMonitor'
import { orderUpdatesHandler, type OrderUpdatePayload } from '@/services/websocket'
import type { Order } from '@rebuild/shared'

export function useKitchenOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const { loading: isLoading, execute } = useAsyncState<Order[]>()
  const { playNewOrderSound, playOrderReadySound } = useSoundNotifications()
  const announce = useAriaLive()
  const { toast } = useToast()
  
  const updateOrdersRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const batchOrderUpdate = useCallback((updateFn: (prev: Order[]) => Order[]) => {
    if (updateOrdersRef.current) {
      clearTimeout(updateOrdersRef.current)
    }
    
    updateOrdersRef.current = setTimeout(() => {
      setOrders(updateFn)
    }, 50)
  }, [])

  const handleOrderUpdate = useCallback(async (update: OrderUpdatePayload) => {
    logger.info('[useKitchenOrders] Handling order update:', update.action, update.order?.id)
    
    switch (update.action) {
      case 'created':
        if (update.order) {
          logger.info('[useKitchenOrders] Adding new order to state:', update.order.id)
          // Direct state update to ensure UI refresh
          setOrders(prev => {
            logger.info('[useKitchenOrders] Previous orders count:', prev.length)
            const newOrders = [update.order!, ...prev]
            logger.info('[useKitchenOrders] New orders count:', newOrders.length)
            return newOrders
          })
          await playNewOrderSound()
          // Handle order type for announcements
          const orderType = update.order.type === 'delivery' ? 'delivery' : update.order.type === 'pickup' ? 'pickup' : 'online'
          // Order uses snake_case format
          const orderNumber = update.order.order_number
          announce({
            message: `New ${orderType} order ${orderNumber} received`,
            priority: 'assertive'
          })
        }
        break
      
      case 'updated':
        if (update.order) {
          batchOrderUpdate(prev => 
            prev.map(order => order.id === update.order!.id ? update.order! : order)
          )
        }
        break
        
      case 'deleted':
        if (update.orderId) {
          batchOrderUpdate(prev => prev.filter(order => order.id !== update.orderId))
        }
        break
        
      case 'status_changed':
        if (update.orderId && update.status) {
          batchOrderUpdate(prev => {
            const updatedOrders = prev.map(order => 
              order.id === update.orderId ? { ...order, status: update.status as Order['status'] } : order
            )
            
            if (update.status === 'ready') {
              const order = updatedOrders.find(o => o.id === update.orderId)
              if (order) {
                playOrderReadySound()
                const location = order.type === 'delivery' ? 'delivery' : 
                               order.table_number ? `table ${order.table_number}` : 'pickup counter'
                const orderNumber = order.order_number
                announce({
                  message: `Order ${orderNumber} is ready for pickup at ${location}`,
                  priority: 'assertive'
                })
              }
            }
            
            return updatedOrders
          })
        }
        break
    }
  }, [batchOrderUpdate, playNewOrderSound, announce, playOrderReadySound])

  const loadOrders = useCallback(async () => {
    const startTime = performance.now()
    
    try {
      const result = await execute(api.getOrders())
      if (result) {
        const duration = performance.now() - startTime
        performanceMonitor.trackAPICall('getOrders', duration, 'success')
        logger.info('[useKitchenOrders] Loaded orders from API:', result.length)
        logger.info('[useKitchenOrders] First order sample:', result[0])
        setOrders(result)
      }
    } catch (error) {
      performanceMonitor.trackAPICall('getOrders', performance.now() - startTime, 'error')
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    }
  }, [execute])

  const handleStatusChange = useCallback(async (orderId: string, status: 'preparing' | 'ready') => {
    const startTime = performance.now()
    
    try {
      await api.updateOrderStatus(orderId, status)
      performanceMonitor.trackAPICall('updateOrderStatus', performance.now() - startTime, 'success')
      
      batchOrderUpdate(prev => {
        const updatedOrders = prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
        
        const order = updatedOrders.find(o => o.id === orderId)
        if (status === 'ready' && order) {
          const orderType = order.type || 'dine-in'
          const tableNumber = order.table_number
          const location = orderType === 'delivery' ? 'delivery' : `table ${tableNumber}`
          const orderNumber = order.order_number
          toast.success(`Order #${orderNumber} ready for ${location}!`)
        }
        
        return updatedOrders
      })
    } catch {
      performanceMonitor.trackAPICall('updateOrderStatus', performance.now() - startTime, 'error')
      toast.error('Failed to update order status')
    }
  }, [batchOrderUpdate])

  useEffect(() => {
    loadOrders()
    const unsubscribe = orderUpdatesHandler.onOrderUpdate(handleOrderUpdate)
    
    return () => {
      unsubscribe()
      if (updateOrdersRef.current) {
        clearTimeout(updateOrdersRef.current)
      }
    }
  }, [loadOrders, handleOrderUpdate])

  return {
    orders,
    isLoading,
    loadOrders,
    handleStatusChange
  }
}