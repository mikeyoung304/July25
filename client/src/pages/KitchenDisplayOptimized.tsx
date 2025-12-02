import React, { useState, useMemo, useCallback } from 'react'
import { logger } from '@/services/logger'
import { KDSErrorBoundary } from '@/components/errors/KDSErrorBoundary'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { ConnectionStatusBar } from '@/components/kitchen/ConnectionStatusBar'
import { TableGroupCard } from '@/components/kitchen/TableGroupCard'
import { OrderGroupCard } from '@/components/kitchen/OrderGroupCard'
import { FocusOverlay } from '@/components/kitchen/FocusOverlay'
import { ExpoTabContent } from '@/components/kitchen/ExpoTabContent'
import { Button } from '@/components/ui/button'
import { Clock, ChefHat, AlertCircle, Users, Package, Send } from 'lucide-react'
import { useKitchenOrdersOptimized } from '@/hooks/useKitchenOrdersOptimized'
import { useTableGrouping, sortTableGroups } from '@/hooks/useTableGrouping'
import { useOrderGrouping, sortOrderGroups, type OrderGroup } from '@/hooks/useOrderGrouping'
import { useScheduledOrders } from '@/hooks/useScheduledOrders'
import { ScheduledOrdersSection } from '@/components/kitchen/ScheduledOrdersSection'
import type { Order } from '@rebuild/shared'
import { KDS_THRESHOLDS, CARD_SIZE_CLASSES } from '@rebuild/shared/config/kds'

type StatusFilter = 'active' | 'ready'
type ViewMode = 'orders' | 'tables'
type StationTab = 'kitchen' | 'expo'

const KitchenDisplayOptimized = React.memo(() => {
  // Use optimized hook with advanced features
  const {
    orders,
    isLoading,
    error,
    updateOrderStatus,
    prioritizedOrders,
    activeOrders,
    readyOrders,
    connectionState
  } = useKitchenOrdersOptimized()

  // Separate active from scheduled orders
  const { active: unscheduledOrders, scheduled: scheduledGroups } = useScheduledOrders(orders)

  // Table grouping (only unscheduled orders)
  const groupedOrders = useTableGrouping(unscheduledOrders)

  // Order grouping (only unscheduled online orders)
  const orderGroups = useOrderGrouping(unscheduledOrders)

  // Simplified filtering state - minimal UI
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [viewMode, setViewMode] = useState<ViewMode>('orders')
  const [stationTab, setStationTab] = useState<StationTab>('kitchen')

  // Focus mode state
  const [focusedOrderGroup, setFocusedOrderGroup] = useState<OrderGroup | null>(null)

  // Stable handlers for UI controls
  const setStatusActive = useCallback(() => setStatusFilter('active'), [])
  const setStatusReady = useCallback(() => setStatusFilter('ready'), [])
  const setViewOrders = useCallback(() => setViewMode('orders'), [])
  const setViewTables = useCallback(() => setViewMode('tables'), [])

  // Focus mode handlers
  const handleFocusMode = useCallback((orderGroup: OrderGroup) => {
    setFocusedOrderGroup(orderGroup)
  }, [])
  const handleCloseFocus = useCallback(() => setFocusedOrderGroup(null), [])

  // Enhanced order status handling
  const handleStatusChange = useCallback(async (orderId: string, status: Order['status']) => {
    const success = await updateOrderStatus(orderId, status)
    if (!success) {
      logger.error('Failed to update order status', { orderId, status })
    }
  }, [updateOrderStatus])

  // Handle batch table completion
  const handleBatchComplete = useCallback(async (tableNumber: string) => {
    const tableGroup = groupedOrders.tables.get(tableNumber)
    if (!tableGroup) return

    // Mark all orders for the table as ready
    const updatePromises = tableGroup.orders.map(order =>
      updateOrderStatus(order.id, 'ready')
    )

    await Promise.all(updatePromises)
  }, [groupedOrders.tables, updateOrderStatus])

  // Handle manually firing a scheduled order
  const handleManualFire = useCallback(async (orderId: string) => {
    // Move scheduled order to active by updating is_scheduled flag
    // The backend will handle setting status to 'preparing'
    const success = await updateOrderStatus(orderId, 'preparing')
    if (!success) {
      logger.error('Failed to manually fire order', { orderId })
    }
  }, [updateOrderStatus])

  // Simple stats for header
  const stats = useMemo(() => {
    const now = Date.now()
    const urgentOrders = orders.filter(order => {
      const age = (now - new Date(order.created_at).getTime()) / 60000
      return age >= KDS_THRESHOLDS.URGENT_MINUTES && !['completed', 'cancelled'].includes(order.status)
    })

    return {
      active: activeOrders.length,
      ready: readyOrders.length,
      urgent: urgentOrders.length
    }
  }, [orders, activeOrders.length, readyOrders.length])

  // Simple filtering - Active or Ready only
  const filteredOrders = useMemo(() => {
    return statusFilter === 'ready' ? readyOrders : activeOrders
  }, [activeOrders, readyOrders, statusFilter])

  // Sort table groups - always by urgency (priority)
  const sortedTableGroups = useMemo(() => {
    const groups = Array.from(groupedOrders.tables.values())
    const filtered = statusFilter === 'ready'
      ? groups.filter(g => g.status === 'ready' || g.status === 'partially-ready')
      : groups
    return sortTableGroups(new Map(filtered.map(g => [g.tableNumber, g])), 'urgency')
  }, [groupedOrders.tables, statusFilter])

  // Sort order groups - always by urgency (priority)
  const sortedOrderGroups = useMemo(() => {
    const filtered = statusFilter === 'ready'
      ? orderGroups.filter(g => g.status === 'ready')
      : orderGroups.filter(g => !['ready', 'completed', 'cancelled'].includes(g.status))
    return sortOrderGroups(filtered, 'urgency')
  }, [orderGroups, statusFilter])

  // Enhanced error and loading states
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">🚨</div>
          <h2 className="text-xl font-bold mb-2">Kitchen Display Error</h2>
          <p className="text-destructive mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Kitchen Display
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Kitchen Display...</p>
          <p className="text-gray-400 text-sm mt-1">Connecting to order system...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Connection Status */}
      <ConnectionStatusBar />
      
      {/* Minimal Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackToDashboard />

              {/* Station Tabs */}
              <div
                className="flex bg-gray-100 rounded-lg p-1"
                role="tablist"
                aria-label="Station selection"
              >
                <Button
                  variant={stationTab === 'kitchen' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStationTab('kitchen')}
                  className="gap-1"
                  role="tab"
                  aria-selected={stationTab === 'kitchen'}
                  aria-controls="kitchen-panel"
                  id="kitchen-tab"
                >
                  <ChefHat className="w-4 h-4" aria-hidden="true" />
                  Kitchen
                </Button>
                <Button
                  variant={stationTab === 'expo' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setStationTab('expo')}
                  className="gap-1"
                  role="tab"
                  aria-selected={stationTab === 'expo'}
                  aria-controls="expo-panel"
                  id="expo-tab"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Expo
                  {stats.ready > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-green-500 text-white rounded-full" aria-label={`${stats.ready} orders ready`}>
                      {stats.ready}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {/* Simple Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{stats.active} Active</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-medium">{stats.ready} Ready</span>
              </div>
              {stats.urgent > 0 && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-bold">{stats.urgent} URGENT</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {stationTab === 'kitchen' ? (
        <div role="tabpanel" id="kitchen-panel" aria-labelledby="kitchen-tab">
          {/* Minimal Filters */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                {/* View Mode Toggle */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'orders' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={setViewOrders}
                    className="gap-1"
                  >
                    <Package className="w-4 h-4" />
                    Orders
                  </Button>
                  <Button
                    variant={viewMode === 'tables' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={setViewTables}
                    className="gap-1"
                  >
                    <Users className="w-4 h-4" />
                    Tables
                  </Button>
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                  <Button
                    variant={statusFilter === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={setStatusActive}
                  >
                    Active ({stats.active})
                  </Button>
                  <Button
                    variant={statusFilter === 'ready' ? 'default' : 'outline'}
                    size="sm"
                    onClick={setStatusReady}
                    className={statusFilter === 'ready' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    Ready ({stats.ready})
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="max-w-7xl mx-auto px-4 py-6">
            {viewMode === 'orders' ? (
              /* Order Grouping View */
              sortedOrderGroups.length === 0 ? (
                <div className="bg-white rounded-lg p-16 text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 text-xl mb-2">
                    {statusFilter === 'ready' ? 'No orders ready for pickup' : 'All caught up!'}
                  </p>
                  <p className="text-gray-400">
                    Orders will appear here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-auto">
                  {sortedOrderGroups.map(orderGroup => (
                    <div key={orderGroup.order_id} className={CARD_SIZE_CLASSES[orderGroup.card_size]}>
                      <OrderGroupCard
                        orderGroup={orderGroup}
                        onStatusChange={handleStatusChange}
                        onFocusMode={handleFocusMode}
                        variant="kitchen"
                      />
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Table Grouping View */
              sortedTableGroups.length === 0 ? (
                <div className="bg-white rounded-lg p-16 text-center border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 text-xl mb-2">
                    {statusFilter === 'ready' ? 'No tables ready' : 'All caught up!'}
                  </p>
                  <p className="text-gray-400">
                    Table orders will appear here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {sortedTableGroups.map(tableGroup => (
                    <TableGroupCard
                      key={tableGroup.tableNumber}
                      tableGroup={tableGroup}
                      onOrderStatusChange={handleStatusChange}
                      onBatchComplete={handleBatchComplete}
                      variant="kitchen"
                    />
                  ))}
                </div>
              )
            )}

            {/* Scheduled Orders Section */}
            <ScheduledOrdersSection
              scheduledGroups={scheduledGroups}
              onManualFire={handleManualFire}
            />
          </div>
        </div>
      ) : (
        <div role="tabpanel" id="expo-panel" aria-labelledby="expo-tab">
          <ExpoTabContent
            activeOrders={activeOrders}
            readyOrders={readyOrders}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Focus Mode Overlay */}
      {focusedOrderGroup && (
        <FocusOverlay
          orderGroup={focusedOrderGroup}
          onClose={handleCloseFocus}
          onMarkReady={(orderId) => {
            handleStatusChange(orderId, 'ready')
          }}
        />
      )}
    </div>
  )
})

KitchenDisplayOptimized.displayName = 'KitchenDisplayOptimized'

// Wrap with KDS error boundary for resilience
const KitchenDisplayOptimizedWithErrorBoundary = () => (
  <KDSErrorBoundary stationName="Kitchen Display">
    <KitchenDisplayOptimized />
  </KDSErrorBoundary>
)

KitchenDisplayOptimizedWithErrorBoundary.displayName = 'KitchenDisplayOptimizedWithErrorBoundary'

export default KitchenDisplayOptimizedWithErrorBoundary