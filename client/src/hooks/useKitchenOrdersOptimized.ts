import { useMemo } from 'react'
import { useKitchenOrdersRealtime } from './useKitchenOrdersRealtime'
import type { Order as _Order } from '@rebuild/shared'

export interface ConnectionState {
  isConnected: boolean
  lastHeartbeat?: Date
  reconnectAttempts: number
}

/**
 * Optimized Kitchen Orders Hook
 * Extends the real-time hook with prioritization and filtering
 */
export const useKitchenOrdersOptimized = () => {
  const { orders, isLoading, error, updateOrderStatus } = useKitchenOrdersRealtime()
  
  // Prioritized orders (sorted by urgency)
  const prioritizedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      // First, sort by status priority
      const statusPriority: Record<string, number> = {
        'preparing': 1,
        'confirmed': 2,
        'pending': 3,
        'new': 4,
        'ready': 5,
        'completed': 6,
        'cancelled': 7
      }
      
      const statusDiff = (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99)
      if (statusDiff !== 0) return statusDiff
      
      // Then sort by age (older first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [orders])
  
  // Active orders (excluding completed/cancelled)
  const activeOrders = useMemo(() => {
    return orders.filter(order => 
      !['completed', 'cancelled'].includes(order.status)
    )
  }, [orders])
  
  // Ready orders
  const readyOrders = useMemo(() => {
    return orders.filter(order => order.status === 'ready')
  }, [orders])
  
  // Pending orders
  const pendingOrders = useMemo(() => {
    return orders.filter(order => 
      ['new', 'pending', 'confirmed'].includes(order.status)
    )
  }, [orders])
  
  // Preparing orders
  const preparingOrders = useMemo(() => {
    return orders.filter(order => order.status === 'preparing')
  }, [orders])
  
  // Connection state (simplified for now)
  const connectionState: ConnectionState = {
    isConnected: !error,
    lastHeartbeat: new Date(),
    reconnectAttempts: 0
  }
  
  return {
    // All orders
    orders,
    
    // Filtered collections
    prioritizedOrders,
    activeOrders,
    readyOrders,
    pendingOrders,
    preparingOrders,
    
    // Status
    isLoading,
    error,
    connectionState,
    
    // Actions
    updateOrderStatus,
    
    // Statistics
    stats: {
      total: orders.length,
      active: activeOrders.length,
      ready: readyOrders.length,
      pending: pendingOrders.length,
      preparing: preparingOrders.length
    }
  }
}