import { useState, useEffect, useCallback, useRef } from 'react'
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
    switch (update.action) {
      case 'created':
        if (update.order) {
          batchOrderUpdate(prev => [update.order!, ...prev])
          await playNewOrderSound()
          const orderType = update.order.type === 'drive-thru' ? 'drive-thru' : 'dine-in'
          announce({
            message: `New ${orderType} order ${update.order.orderNumber} received`,
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
                const location = order.type === 'drive-thru' ? 'drive-thru window' : 
                               order.tableNumber ? `table ${order.tableNumber}` : 'pickup counter'
                announce({
                  message: `Order ${order.orderNumber} is ready for pickup at ${location}`,
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
          const location = orderType === 'drive-thru' ? 'drive-thru window' : `table ${order.tableNumber}`
          toast.success(`Order #${order.orderNumber} ready for ${location}!`)
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