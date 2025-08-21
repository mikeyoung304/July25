import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useRestaurant } from '@/core'
import { webSocketService } from '@/services/websocket'
import { api } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { PageLayout, PageContent } from '@/components/ui/PageLayout'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WifiOff, Wifi, RefreshCw, Search } from 'lucide-react'
import { toCamelCase } from '@/services/utils/caseTransform'
import type { Order } from '@rebuild/shared'

/**
 * Simplified Kitchen Display System
 * Based on industry standards (Toast/Square): Simple, direct, no over-engineering
 */
function KitchenDisplaySimple() {
  const { toast } = useToast()
  const { restaurant, isLoading: restaurantLoading, error: restaurantError } = useRestaurant()
  
  // Single state for orders - no complex hooks
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  
  // Simple filtering - industry standard
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready' | 'all'>('active')
  const [searchQuery, setSearchQuery] = useState('')

  // Load orders from API
  const loadOrders = useCallback(async () => {
    console.log('[KDS] Starting to load orders...')
    try {
      setIsLoading(true)
      const result = await api.getOrders()
      console.log('[KDS] API returned:', result)
      
      // api.getOrders returns an array directly
      if (Array.isArray(result)) {
        setOrders(result)
        console.log('[KDS] Set orders:', result.length, 'orders')
      } else {
        console.warn('[KDS] Unexpected result format:', result)
        setOrders([])
      }
    } catch (error) {
      console.error('[KDS] Error loading orders:', error)
      toast.error('Failed to load orders')
      setOrders([])
    } finally {
      console.log('[KDS] Setting loading to false')
      setIsLoading(false)
    }
  }, [toast])

  // Handle order status change
  const handleStatusChange = useCallback(async (orderId: string, status: 'preparing' | 'ready') => {
    try {
      await api.updateOrderStatus(orderId, status)
      
      // Update local state optimistically
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status } : order
      ))
      
      // Simple notification
      if (status === 'ready') {
        const order = orders.find(o => o.id === orderId)
        if (order) {
          toast.success(`Order #${order.order_number} is ready!`)
        }
      }
    } catch (error) {
      toast.error('Failed to update order status')
    }
  }, [orders, toast])

  // Initial load on mount
  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // Direct WebSocket subscription - no wrapper classes
  useEffect(() => {

    // Check connection status
    setIsConnected(webSocketService.isConnected())

    // Subscribe to WebSocket events directly
    const unsubscribeCreated = webSocketService.subscribe('order:created', (payload: any) => {
      const rawOrder = payload.order || payload
      if (rawOrder) {
        const order = toCamelCase(rawOrder) as Order
        setOrders(prev => [order, ...prev])
        
        // Play sound if available
        const audio = new Audio('/sounds/new-order.mp3')
        audio.play().catch(() => {})
        
        toast.success(`New order #${order.order_number}`)
      }
    })

    const unsubscribeUpdated = webSocketService.subscribe('order:updated', (payload: any) => {
      const rawOrder = payload.order || payload
      if (rawOrder) {
        const order = toCamelCase(rawOrder) as Order
        setOrders(prev => prev.map(o => o.id === order.id ? order : o))
      }
    })

    const unsubscribeDeleted = webSocketService.subscribe('order:deleted', (payload: any) => {
      const orderId = payload.orderId || payload.id
      if (orderId) {
        setOrders(prev => prev.filter(o => o.id !== orderId))
      }
    })

    const unsubscribeStatusChanged = webSocketService.subscribe('order:status_changed', (payload: any) => {
      if (payload.orderId && payload.status) {
        setOrders(prev => prev.map(o => 
          o.id === payload.orderId ? { ...o, status: payload.status } : o
        ))
        
        if (payload.status === 'ready') {
          const audio = new Audio('/sounds/order-ready.mp3')
          audio.play().catch(() => {})
        }
      }
    })

    // Connection status listeners
    const handleConnected = () => setIsConnected(true)
    const handleDisconnected = () => setIsConnected(false)
    
    webSocketService.on('connected', handleConnected)
    webSocketService.on('disconnected', handleDisconnected)

    // Cleanup
    return () => {
      unsubscribeCreated()
      unsubscribeUpdated()
      unsubscribeDeleted()
      unsubscribeStatusChanged()
      webSocketService.off('connected', handleConnected)
      webSocketService.off('disconnected', handleDisconnected)
    }
  }, []) // Empty deps - we only want this to run once

  // Simple filtering logic - no complex hooks
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Status filter (industry standard)
    if (statusFilter === 'active') {
      filtered = filtered.filter(o => 
        o.status !== 'ready' && o.status !== 'completed' && o.status !== 'cancelled'
      )
    } else if (statusFilter === 'ready') {
      filtered = filtered.filter(o => o.status === 'ready')
    }

    // Search by order number
    if (searchQuery) {
      filtered = filtered.filter(o => 
        o.order_number?.toString().includes(searchQuery)
      )
    }

    // Sort by creation time (oldest first)
    return filtered.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [orders, statusFilter, searchQuery])

  // Handle restaurant context errors
  if (restaurantError) {
    return (
      <PageLayout centered>
        <div className="text-center">
          <p className="text-destructive">Failed to load restaurant context</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </div>
      </PageLayout>
    )
  }

  if (restaurantLoading || isLoading) {
    return (
      <PageLayout centered>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading kitchen display...</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Simple Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Kitchen Display</h1>
            <p className="text-sm text-gray-600">{restaurant?.name}</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {/* Refresh Button */}
            <Button
              onClick={loadOrders}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <PageContent maxWidth="6xl" className="mt-6">
        {/* Simple Filters - Industry Standard */}
        <div className="flex gap-4 mb-6">
          {/* Status Filter Buttons */}
          <div className="flex gap-2">
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
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({orders.length})
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search order #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Orders Grid - Simple CSS Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">
              {searchQuery ? 'No orders match your search' : 'No active orders'}
            </p>
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
      </PageContent>
    </PageLayout>
  )
}

export default KitchenDisplaySimple