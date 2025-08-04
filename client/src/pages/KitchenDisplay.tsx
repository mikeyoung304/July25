import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useToast } from '@/hooks/useToast'
import { useAsyncState } from '@/hooks/useAsyncState'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { useOrderFilters } from '@/hooks/useOrderFilters'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useAriaLive } from '@/hooks/keyboard/useAriaLive'
import { api } from '@/services/api'
import type { Order } from '@/services/api'
import type { LayoutMode } from '@/modules/kitchen/components/KDSLayout'
import type { Station, StationType } from '@/types/station'
import { performanceMonitor } from '@/services/performance/performanceMonitor'
import { applyFilters, sortOrders, getTimeRangeFromPreset as _getTimeRangeFromPreset, type SortBy, type OrderStatus } from '@/types/filters'
import { stationRouting } from '@/services/stationRouting'
import { orderUpdatesHandler, type OrderUpdatePayload, webSocketService } from '@/services/websocket'
import { RoleGuard } from '@/components/auth/RoleGuard'

// Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterPanel } from '@/components/shared/filters/FilterPanel'
import { SortControl } from '@/components/shared/filters/SortControl'
import { SoundControl } from '@/components/shared/controls/SoundControl'
import { KDSLayout } from '@/modules/kitchen/components/KDSLayout'
import { AnimatedKDSOrderCard } from '@/modules/kitchen/components/AnimatedKDSOrderCard'
import { KDSOrderListItem } from '@/modules/kitchen/components/KDSOrderListItem'

export function KitchenDisplay() {
  const { restaurant, isLoading: restaurantLoading } = useRestaurant()
  const [orders, setOrders] = useState<Order[]>([])
  const { loading: isLoading, execute } = useAsyncState<{ orders: Order[]; total: number }>()
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
  const announce = useAriaLive()
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
  
  // Debounce order updates to prevent rapid re-renders
  const updateOrdersRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Batch order updates
  const batchOrderUpdate = useCallback((updateFn: (prev: Order[]) => Order[]) => {
    if (updateOrdersRef.current) {
      clearTimeout(updateOrdersRef.current)
    }
    
    updateOrdersRef.current = setTimeout(() => {
      setOrders(updateFn)
    }, 50) // 50ms debounce
  }, [])
  
  // Handle WebSocket order updates
  const handleOrderUpdate = useStableCallback(async (update: OrderUpdatePayload) => {
    switch (update.action) {
      case 'created':
        if (update.order) {
          batchOrderUpdate(prev => [update.order!, ...prev])
          await playNewOrderSound()
          // Announce to screen readers
          const orderType = update.order.orderType === 'drive-thru' ? 'drive-thru' : 'dine-in'
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
                // Announce ready orders to screen readers
                const location = order.orderType === 'drive-thru' ? 'drive-thru window' : 
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
        
      case 'item_status_changed':
        // Handle individual item status changes if needed
        break
    }
  })

  const loadOrders = useCallback(async () => {
    const startTime = performance.now()
    
    try {
      const result = await execute(api.getOrders())
      if (result && result.orders) {
        const duration = performance.now() - startTime
        performanceMonitor.trackAPICall('getOrders', duration, 'success')
        setOrders(result.orders)
      }
    } catch (error) {
      performanceMonitor.trackAPICall('getOrders', performance.now() - startTime, 'error')
      console.error('Error loading orders:', error)
      // Use console.error instead of toast to avoid dependency issues
    }
  }, [execute])

  const handleStatusChange = useCallback(async (orderId: string, status: 'preparing' | 'ready') => {
    const startTime = performance.now()
    
    try {
      await api.updateOrderStatus(orderId, status)
      const duration = performance.now() - startTime
      performanceMonitor.trackAPICall('updateOrderStatus', duration, 'success')
      
      batchOrderUpdate(prev => {
        const updatedOrders = prev.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
        
        // Find order for toast notification
        const order = updatedOrders.find(o => o.id === orderId)
        if (status === 'ready' && order) {
          const orderType = order.orderType || 'dine-in'
          const location = orderType === 'drive-thru' ? 'drive-thru window' : `table ${order.tableNumber}`
          toast.success(`Order #${order.orderNumber} ready for ${location}!`)
        } else {
          toast.success(`Order status updated to ${status}`)
        }
        
        return updatedOrders
      })
    } catch {
      performanceMonitor.trackAPICall('updateOrderStatus', performance.now() - startTime, 'error')
      toast.error('Failed to update order status')
    }
  }, [toast, batchOrderUpdate])

  useEffect(() => {
    loadOrders()
    
    // Subscribe to WebSocket order updates
    const unsubscribe = orderUpdatesHandler.onOrderUpdate(handleOrderUpdate)

    return () => {
      unsubscribe()
      // Clean up any pending updates
      if (updateOrdersRef.current) {
        clearTimeout(updateOrdersRef.current)
      }
    }
  }, []) // Remove dependencies to prevent infinite loop - loadOrders and handleOrderUpdate should be stable

  // Convert OrderFilterState to OrderFilters format
  const adaptedFilters = React.useMemo(() => {
    const statusArray: OrderStatus[] = filters.status === 'all' 
      ? ['new', 'preparing', 'ready']
      : [filters.status]
    
    // Map station types to include 'all'
    const stationArray = filters.stations.length === 0 
      ? ['all'] as (StationType | 'all')[]
      : filters.stations.map(s => s.type) as (StationType | 'all')[]
    
    // Map time range to TimeRange format
    const timeRangeMap = {
      'today': 'today' as const,
      'week': 'today' as const, // Fallback, week not supported in TimeRange preset
      'month': 'today' as const, // Fallback, month not supported in TimeRange preset
      'all': 'today' as const // Fallback
    }
    
    return {
      status: statusArray,
      stations: stationArray,
      timeRange: { preset: timeRangeMap[filters.timeRange] },
      searchQuery: filters.searchQuery,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection
    }
  }, [filters])

  // Apply all filters and sorting
  const filteredAndSortedOrders = React.useMemo(() => {
    let result = [...orders]
    
    // Apply time range filter based on original filter value
    if (filters.timeRange !== 'all') {
      const now = new Date()
      const start = new Date()
      
      switch (filters.timeRange) {
        case 'today':
          start.setHours(0, 0, 0, 0)
          break
        case 'week':
          start.setDate(now.getDate() - 7)
          break
        case 'month':
          start.setDate(now.getDate() - 30)
          break
      }
      
      result = result.filter(order => {
        const orderDate = new Date(order.orderTime)
        return orderDate >= start && orderDate <= now
      })
    }
    
    // Apply other filters using adapted filters
    result = applyFilters(result, adaptedFilters)
    
    // Apply station filter
    if (filters.stations.length > 0) {
      result = result.filter(order => 
        order.items.some(item => {
          const itemStation = stationRouting.getStationTypeForItem(item)
          return filters.stations.some(s => s.type === itemStation)
        })
      )
    }
    
    // Apply sorting
    result = sortOrders(result, filters.sortBy, filters.sortDirection)
    
    return result
  }, [orders, filters, adaptedFilters])

  if (restaurantLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-macon-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading kitchen display...</p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard 
      suggestedRoles={['kitchen', 'admin']} 
      pageTitle="Kitchen Display System"
    >
      <div className="min-h-screen bg-gradient-to-br from-macon-background via-white to-macon-navy/5 p-6">
      <div className="max-w-7xl mx-auto" role="region" aria-label="Kitchen Display System">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-macon-navy">{restaurant?.name || 'Restaurant'} - Kitchen Display</h1>
              <p className="text-neutral-600 mt-2">Real-time order management system</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-4 py-1.5 text-sm">
                <span className="font-semibold">{filteredAndSortedOrders.filter(o => o.status !== 'ready' && o.status !== 'completed').length}</span>
                <span className="ml-1.5">Active Orders</span>
              </Badge>
              <Badge 
                variant={webSocketService.isConnected() ? "default" : "destructive"} 
                className="px-3 py-1.5 text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                {webSocketService.isConnected() ? 'Live Updates' : 'Manual Refresh'}
              </Badge>
              <SortControl
                sortBy={filters.sortBy as SortBy}
                sortDirection={filters.sortDirection}
                onSortChange={(sortBy) => {
                  // Only update if it's a supported sort field
                  if (sortBy === 'orderTime' || sortBy === 'orderNumber' || sortBy === 'status') {
                    updateSort(sortBy)
                  }
                }}
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
              filters={adaptedFilters}
              onStatusChange={(statuses) => {
                if (statuses.length === 0 || statuses.length === 3) {
                  updateStatusFilter('all')
                } else {
                  updateStatusFilter(statuses[0])
                }
              }}
              onStationChange={(stations) => {
                const stationObjects = stations.map(s => {
                  if (s === 'all') return s
                  return { type: s, id: s, name: s, isActive: true, currentOrders: [] }
                })
                updateStationFilter(stationObjects as Station[])
              }}
              onTimeRangeChange={(timeRange) => {
                // Map TimeRange preset to our simple string format
                if (timeRange.preset === 'today') {
                  updateTimeRange('today')
                } else if (timeRange.preset === 'last1hour' || timeRange.preset === 'last30min' || timeRange.preset === 'last15min') {
                  updateTimeRange('today') // These are more granular than our filter supports
                }
              }}
              onSearchChange={updateSearchQuery}
              onResetFilters={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </section>
        </div>

        {filteredAndSortedOrders.length === 0 ? (
          <Card className="border-0 shadow-large">
            <CardContent className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-macon-navy/10 flex items-center justify-center">
                  <Utensils className="h-10 w-10 text-macon-navy/40" />
                </div>
                <p className="text-neutral-600 text-lg leading-relaxed">
                  {hasActiveFilters
                    ? 'No orders match your filters. Try adjusting your search criteria.'
                    : 'No orders yet. Orders will appear here in real-time.'
                  }
                </p>
              </div>
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
                  orderType={order.orderType}
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

        <div className="mt-12">
          <Card className="border-0 shadow-large bg-gradient-to-br from-white to-macon-orange/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-macon-orange" />
                Demo Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
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
                        modifiers: Math.random() > 0.5 ? [['Extra cheese'], ['No onions']][Math.floor(Math.random() * 2)] : undefined
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
    </RoleGuard>
  )
}