import React, { useState, useEffect, useCallback } from 'react'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useToast } from '@/hooks/useToast'
import { useAsyncState } from '@/hooks/useAsyncState'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { useOrderFilters } from '@/hooks/useOrderFilters'
import { useOrderSubscription } from '@/hooks/useOrderSubscription'
import { api } from '@/services/api'
import type { Order } from '@/services/api'
import type { LayoutMode } from '@/modules/kitchen/components/KDSLayout'
import { performanceMonitor } from '@/services/performance/performanceMonitor'
import { applyFilters, sortOrders, getTimeRangeFromPreset } from '@/types/filters'
import { stationRouting } from '@/services/stationRouting'

// Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FilterPanel } from '@/components/shared/filters/FilterPanel'
import { SortControl } from '@/components/shared/filters/SortControl'
import { SoundControl } from '@/components/shared/controls/SoundControl'
import { KDSLayout } from '@/modules/kitchen/components/KDSLayout'
import { AnimatedKDSOrderCard } from '@/modules/kitchen/AnimatedKDSOrderCard'
import { KDSOrderListItem } from '@/modules/kitchen/KDSOrderListItem'

export function KitchenDisplay() {
  const { restaurant, isLoading: restaurantLoading } = useRestaurant()
  const [orders, setOrders] = useState<Order[]>([])
  const { loading: isLoading, execute } = useAsyncState()
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
  const { toast } = useToast()
  const { 
    playNewOrderSound, 
    playOrderReadySound, 
    toggleSound, 
    setVolume, 
    soundEnabled, 
    volume 
  } = useSoundNotifications()
  const {
    filters,
    updateStatusFilter,
    updateStationFilter,
    updateTimeRange,
    updateSearchQuery,
    updateSort,
    toggleSortDirection,
    resetFilters,
    hasActiveFilters
  } = useOrderFilters()

  // Subscribe to real-time order events
  useOrderSubscription({
    onOrderCreated: async (order) => {
      setOrders(prev => [order, ...prev])
      toast.success(`New order #${order.orderNumber} received!`)
      await playNewOrderSound()
    },
    onOrderStatusChanged: (orderId, newStatus) => {
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      )
      // Only toast for ready status
      if (newStatus === 'ready') {
        const order = orders.find(o => o.id === orderId)
        if (order) {
          toast.success(`Order #${order.orderNumber} is ready!`)
          playOrderReadySound()
        }
      }
    }
  })

  const loadOrders = useCallback(async () => {
    const startTime = performance.now()
    
    try {
      const result = await execute(api.getOrders())
      const orders = result.orders
      const duration = performance.now() - startTime
      performanceMonitor.trackAPICall('getOrders', duration, 'success')
      setOrders(orders)
    } catch {
      performanceMonitor.trackAPICall('getOrders', performance.now() - startTime, 'error')
      toast.error('Failed to load orders')
    }
  }, [execute, toast])

  const handleStatusChange = async (orderId: string, status: 'preparing' | 'ready') => {
    const startTime = performance.now()
    
    try {
      await api.updateOrderStatus(orderId, status)
      const duration = performance.now() - startTime
      performanceMonitor.trackAPICall('updateOrderStatus', duration, 'success')
      
      setOrders(prev => 
        prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      )
      
      toast.success(`Order status updated to ${status}`)
    } catch {
      performanceMonitor.trackAPICall('updateOrderStatus', performance.now() - startTime, 'error')
      toast.error('Failed to update order status')
    }
  }

  useEffect(() => {
    loadOrders()
    
    // Start real-time simulation
    const unsubscribe = api.subscribeToOrders(() => {
      // The callback is handled by useOrderSubscription hook
    })

    return () => unsubscribe()
  }, [loadOrders])

  // Apply all filters and sorting
  const filteredAndSortedOrders = React.useMemo(() => {
    let result = [...orders]
    
    // Apply time range filter if set
    if (filters.timeRange.preset) {
      const { start, end } = getTimeRangeFromPreset(filters.timeRange.preset)
      result = result.filter(order => {
        const orderDate = new Date(order.orderTime)
        return orderDate >= start && orderDate <= end
      })
    }
    
    // Apply other filters
    result = applyFilters(result, filters)
    
    // Apply station filter
    if (!filters.stations.includes('all')) {
      result = result.filter(order => 
        order.items.some(item => {
          const itemStation = stationRouting.getStationTypeForItem(item)
          return itemStation && filters.stations.includes(itemStation)
        })
      )
    }
    
    // Apply sorting
    result = sortOrders(result, filters.sortBy, filters.sortDirection)
    
    return result
  }, [orders, filters])

  if (restaurantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading kitchen display...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto" role="region" aria-label="Kitchen Display System">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{restaurant?.name || 'Restaurant'} - Kitchen Display</h1>
              <p className="text-muted-foreground">Real-time order management system</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {filteredAndSortedOrders.filter(o => o.status !== 'ready').length} Active Orders
              </Badge>
              <SortControl
                sortBy={filters.sortBy}
                sortDirection={filters.sortDirection}
                onSortChange={updateSort}
                onDirectionToggle={toggleSortDirection}
              />
              <SoundControl
                enabled={soundEnabled}
                volume={volume}
                onToggle={toggleSound}
                onVolumeChange={setVolume}
              />
              <Button onClick={loadOrders} variant="outline">
                Refresh
              </Button>
            </div>
          </div>
        </header>
        
        <div className="mb-6">
          <section role="search" aria-label="Order filters">
            <FilterPanel
              filters={filters}
              onStatusChange={updateStatusFilter}
              onStationChange={updateStationFilter}
              onTimeRangeChange={updateTimeRange}
              onSearchChange={updateSearchQuery}
              onResetFilters={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </section>
        </div>

        {filteredAndSortedOrders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {hasActiveFilters
                  ? 'No orders match your filters. Try adjusting your search criteria.'
                  : 'No orders yet. Orders will appear here in real-time.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <section id="orders" role="region" aria-label="Active orders" aria-live="polite">
            <KDSLayout
              mode={layoutMode}
              onModeChange={setLayoutMode}
            >
              {filteredAndSortedOrders.map(order => (
              layoutMode === 'grid' ? (
                <AnimatedKDSOrderCard
                  key={order.id}
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  tableNumber={order.tableNumber}
                  items={order.items}
                  status={order.status as 'new' | 'preparing' | 'ready'}
                  orderTime={new Date(order.orderTime)}
                  onStatusChange={(status) => handleStatusChange(order.id, status)}
                />
              ) : (
                <KDSOrderListItem
                  key={order.id}
                  orderNumber={order.orderNumber}
                  tableNumber={order.tableNumber}
                  items={order.items}
                  status={order.status as 'new' | 'preparing' | 'ready'}
                  orderTime={new Date(order.orderTime)}
                  onStatusChange={(status) => handleStatusChange(order.id, status)}
                />
              )
            ))}
            </KDSLayout>
          </section>
        )}

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Demo Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This is a demo of the Kitchen Display System. In production, orders would come from real customer orders through the kiosk or drive-thru interfaces.
              </p>
              <Button 
                onClick={async () => {
                  const mockOrder = {
                    tableNumber: String(Math.floor(Math.random() * 20) + 1),
                    items: [
                      { 
                        id: String(Date.now()), 
                        name: ['Pizza Margherita', 'Pasta Carbonara', 'Caesar Salad', 'Grilled Burger'][Math.floor(Math.random() * 4)],
                        quantity: Math.floor(Math.random() * 3) + 1,
                        modifiers: Math.random() > 0.5 ? ['Extra cheese', 'No onions'][Math.floor(Math.random() * 2)].split(',') : undefined
                      }
                    ],
                    totalAmount: Math.random() * 50 + 10,
                  }
                  
                  try {
                    const result = await api.submitOrder(mockOrder)
                    if (result.order) {
                      setOrders(prev => [result.order, ...prev])
                      toast.success('Test order created!')
                    }
                  } catch {
                    toast.error('Failed to create test order')
                  }
                }}
              >
                Create Test Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}