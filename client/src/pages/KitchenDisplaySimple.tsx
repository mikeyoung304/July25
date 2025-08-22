import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRestaurant } from '@/core'
import { webSocketService } from '@/services/websocket'
import { api } from '@/services/api'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { Button } from '@/components/ui/button'
import { toCamelCase } from '@/services/utils/caseTransform'
import type { Order } from '@rebuild/shared'

/**
 * Minimal Kitchen Display System
 * Core function: Display orders and update their status
 */
function KitchenDisplaySimple() {
  const { isLoading: restaurantLoading, error: restaurantError } = useRestaurant()
  
  // Single state for orders
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Simple filtering - active or ready only
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready'>('active')

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const result = await api.getOrders()
      
      // api.getOrders returns an array directly
      if (Array.isArray(result)) {
        setOrders(result)
      } else {
        setOrders([])
      }
    } catch {
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle order status change
  const handleStatusChange = useCallback(async (orderId: string, status: 'ready') => {
    try {
      await api.updateOrderStatus(orderId, status)
      
      // Update local state optimistically
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ))
    } catch {
      // Silent failure - order will sync via WebSocket
    }
  }, [])

  // Initial load on mount
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    // Subscribe to WebSocket events
    const unsubscribeCreated = webSocketService.subscribe('order:created', (payload: unknown) => {
      const data = payload as { order?: unknown } | unknown
      const rawOrder = (data as { order?: unknown })?.order || data
      if (rawOrder) {
        const order = toCamelCase(rawOrder) as Order
        setOrders(prev => [order, ...prev])
      }
    })

    const unsubscribeUpdated = webSocketService.subscribe('order:updated', (payload: unknown) => {
      const data = payload as { order?: unknown } | unknown
      const rawOrder = (data as { order?: unknown })?.order || data
      if (rawOrder) {
        const order = toCamelCase(rawOrder) as Order
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

    // Cleanup
    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
      unsubscribeStatusChanged()
    }
  }, [])

  // Simple filtering logic
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(o => 
        o.status !== 'ready' && o.status !== 'completed' && o.status !== 'cancelled'
      )
    } else if (statusFilter === 'ready') {
      filtered = filtered.filter(o => o.status === 'ready')
    }

    // Sort by creation time (oldest first)
    return filtered.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [orders, statusFilter])

  // Handle restaurant context errors
  if (restaurantError) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load restaurant context</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Reload Page
        </Button>
      </div>
    )
  }

  if (restaurantLoading || isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading kitchen display...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="bg-white border-b px-4 py-2">
        <BackToDashboard />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Minimal Filters - Active/Ready only */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active ({orders.filter(o => o.status !== 'ready' && o.status !== 'completed' && o.status !== 'cancelled').length})
          </Button>
          <Button
            variant={statusFilter === 'ready' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ready')}
          >
            Ready ({orders.filter(o => o.status === 'ready').length})
          </Button>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">No active orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default KitchenDisplaySimple