import { useState, useEffect, useCallback } from 'react'
import { useRestaurant } from '@/core'
import { webSocketService } from '@/services/websocket'
import { api } from '@/services/api'
import { useOrderActions } from '@/modules/orders/hooks/useOrderActions'
import type { Order } from '@rebuild/shared'

interface UseKitchenOrdersRealtimeReturn {
  orders: Order[]
  isLoading: boolean
  error: string | null
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<boolean>
}

/**
 * Shared hook for real-time order management
 * Extracted from KitchenDisplaySimple to enable DRY principle
 * Used by both Kitchen Display and Expo Station
 */
export const useKitchenOrdersRealtime = (): UseKitchenOrdersRealtimeReturn => {
  const { isLoading: restaurantLoading, error: restaurantError } = useRestaurant()
  const { updateOrderStatus: updateOrderStatusAction } = useOrderActions()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load orders from API
  const loadOrders = useCallback(async () => {
    console.log('[useKitchenOrdersRealtime] 🔄 Starting loadOrders...')
    try {
      setIsLoading(true)
      setError(null)
      console.log('[useKitchenOrdersRealtime] Calling api.getOrders()...')
      const result = await api.getOrders()
      console.log('[useKitchenOrdersRealtime] Got result:', { 
        isArray: Array.isArray(result), 
        length: Array.isArray(result) ? result.length : 'N/A',
        result: Array.isArray(result) ? result.slice(0, 2) : result
      })
      
      if (Array.isArray(result)) {
        setOrders(result)
        console.log('[useKitchenOrdersRealtime] ✅ Set orders state with', result.length, 'orders')
      } else {
        setOrders([])
        console.log('[useKitchenOrdersRealtime] ⚠️ Result was not array, set empty orders')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load orders'
      console.error('[useKitchenOrdersRealtime] ❌ loadOrders failed:', err)
      setError(errorMessage)
      setOrders([])
    } finally {
      setIsLoading(false)
      console.log('[useKitchenOrdersRealtime] 🏁 loadOrders finished')
    }
  }, [])

  // Handle order status change with proper backend sync
  const updateOrderStatus = useCallback(async (orderId: string, status: Order['status']) => {
    try {
      const success = await updateOrderStatusAction(orderId, status)
      
      if (success) {
        // Update local state optimistically
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        ))
      }
      
      return success
    } catch (err) {
      // Error already handled by useOrderActions hook
      return false
    }
  }, [updateOrderStatusAction])

  // Initial load on mount
  useEffect(() => {
    console.log('[useKitchenOrdersRealtime] useEffect - initial load check:', {
      restaurantLoading,
      restaurantError: restaurantError ? 'has error' : 'no error'
    })
    if (!restaurantLoading && !restaurantError) {
      console.log('[useKitchenOrdersRealtime] ✅ Conditions met, triggering loadOrders()')
      loadOrders()
    } else {
      console.log('[useKitchenOrdersRealtime] ⏳ Waiting for restaurant context...')
    }
  }, [loadOrders, restaurantLoading, restaurantError])

  // WebSocket connection and subscriptions for real-time updates
  useEffect(() => {
    if (restaurantLoading || restaurantError) return

    // Connect to WebSocket first
    console.log('🔌 [KDS] Attempting WebSocket connection...')
    webSocketService.connect().then(() => {
      console.log('✅ [KDS] WebSocket connected successfully')
    }).catch((error) => {
      console.error('❌ [KDS] WebSocket connection failed:', error)
    })

    const unsubscribeCreated = webSocketService.subscribe('order:created', (payload: unknown) => {
      const data = payload as { order?: unknown } | unknown
      const rawOrder = (data as { order?: unknown })?.order || data
      if (rawOrder) {
        const order = rawOrder as Order
        setOrders(prev => [order, ...prev])
      }
    })

    const unsubscribeUpdated = webSocketService.subscribe('order:updated', (payload: unknown) => {
      const data = payload as { order?: unknown } | unknown
      const rawOrder = (data as { order?: unknown })?.order || data
      if (rawOrder) {
        const order = rawOrder as Order
        setOrders(prev => prev.map(o => o.id === order.id ? order : o))
      }
    })

    const unsubscribeDeleted = webSocketService.subscribe('order:deleted', (payload: unknown) => {
      const data = payload as { orderId?: string; id?: string }
      const orderId = data.orderId || data.id
      if (orderId) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
      }
    })

    const unsubscribeStatusChanged = webSocketService.subscribe('order:status_changed', (payload: unknown) => {
      const data = payload as { orderId?: string; status?: string }
      if (data.orderId && data.status) {
        setOrders(prev => prev.map(o => 
          o.id === data.orderId ? { ...o, status: data.status as Order['status'] } : o
        ))
      }
    })

    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
      unsubscribeStatusChanged()
    }
  }, [restaurantLoading, restaurantError])

  return {
    orders,
    isLoading: restaurantLoading || isLoading,
    error: (restaurantError instanceof Error ? restaurantError.message : restaurantError) || error,
    updateOrderStatus
  }
}