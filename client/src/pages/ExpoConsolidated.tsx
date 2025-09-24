import React, { useState, useCallback, useMemo } from 'react'
import { Filter, Users, LayoutGrid, List, TrendingUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableGroupCard } from '@/components/kitchen/TableGroupCard'
import { TouchOptimizedOrderCard } from '@/components/kitchen/TouchOptimizedOrderCard'
import { ConnectionStatusBar } from '@/components/kitchen/ConnectionStatusBar'
import { useKitchenOrdersOptimized } from '@/hooks/useKitchenOrdersOptimized'
import { useTableGrouping, sortTableGroups, getTableGroupStats } from '@/hooks/useTableGrouping'
import {  } from '@/utils'
import type { Order } from '@rebuild/shared'

type ViewMode = 'tables' | 'orders' | 'hybrid'
type SortBy = 'urgency' | 'completion' | 'table' | 'age'

/**
 * Revolutionary Expo Station with Table Consolidation
 * Transforms chaos into choreography with intelligent table grouping
 */
function ExpoConsolidated() {
  const { 
    orders, 
    isLoading, 
    error, 
    updateOrderStatus,
    readyOrders,
    activeOrders,
    connectionState
  } = useKitchenOrdersOptimized()
  
  // Intelligent table grouping
  const groupedOrders = useTableGrouping(orders)
  const tableStats = getTableGroupStats(groupedOrders.tables)
  
  // View and sorting controls
  const [viewMode, setViewMode] = useState<ViewMode>('tables')
  const [sortBy, setSortBy] = useState<SortBy>('urgency')
  const [showOnlyReady, setShowOnlyReady] = useState(false)
  
  // Sort table groups
  const sortedTableGroups = useMemo(() => {
    const groups = showOnlyReady 
      ? new Map(Array.from(groupedOrders.tables).filter(([_, group]) => 
          group.status === 'ready' || group.status === 'partially-ready'
        ))
      : groupedOrders.tables
      
    return sortTableGroups(groups, sortBy)
  }, [groupedOrders.tables, sortBy, showOnlyReady])
  
  // Handle batch table completion
  const handleBatchComplete = useCallback(async (tableNumber: string) => {
    const tableGroup = groupedOrders.tables.get(tableNumber)
    if (!tableGroup) return
    
    // Mark all orders for the table as completed
    const updatePromises = tableGroup.orders.map(order => 
      updateOrderStatus(order.id, 'completed')
    )
    
    await Promise.all(updatePromises)
    
    // TODO: Add success toast notification
  }, [groupedOrders.tables, updateOrderStatus])
  
  // Handle individual order status change
  const handleOrderStatusChange = useCallback(async (orderId: string, status: 'ready') => {
    await updateOrderStatus(orderId, status)
  }, [updateOrderStatus])
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Expo Station Error</h2>
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Expo Consolidation View...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Connection Status */}
      <ConnectionStatusBar />
      
      {/* Enhanced Header with Statistics */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Title and Stats */}
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Expo Station
                <span className="text-sm font-normal text-gray-500 ml-2">
                  Table Consolidation
                </span>
              </h1>
              
              {/* Live Statistics Dashboard */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{tableStats.totalTables} Tables</span>
                </div>
                
                {tableStats.readyTables > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-600">
                      {tableStats.readyTables} Ready
                    </span>
                  </div>
                )}
                
                {tableStats.partiallyReadyTables > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-blue-600">
                      {tableStats.partiallyReadyTables} Partial
                    </span>
                  </div>
                )}
                
                {tableStats.urgentTables > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {tableStats.urgentTables + tableStats.criticalTables} Urgent
                  </Badge>
                )}
                
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-600">
                    {tableStats.averageCompletion}% Complete
                  </span>
                </div>
              </div>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'tables' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('tables')}
                  className="gap-1"
                >
                  <Users className="w-4 h-4" />
                  Tables
                </Button>
                <Button
                  variant={viewMode === 'orders' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('orders')}
                  className="gap-1"
                >
                  <List className="w-4 h-4" />
                  Orders
                </Button>
                <Button
                  variant={viewMode === 'hybrid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('hybrid')}
                  className="gap-1"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Hybrid
                </Button>
              </div>
              
              {/* Sort Controls */}
              {viewMode === 'tables' && (
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-3 py-1 text-sm border rounded-lg bg-white"
                >
                  <option value="urgency">Sort by Urgency</option>
                  <option value="completion">Sort by Completion</option>
                  <option value="table">Sort by Table #</option>
                  <option value="age">Sort by Age</option>
                </select>
              )}
              
              {/* Filter Toggle */}
              <Button
                variant={showOnlyReady ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowOnlyReady(!showOnlyReady)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Ready Only
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'tables' && (
          /* Table Consolidation View - Revolutionary Grouping */
          <div>
            {sortedTableGroups.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {showOnlyReady ? 'No tables ready for service' : 'No active table orders'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {sortedTableGroups.map(tableGroup => (
                  <TableGroupCard
                    key={tableGroup.tableNumber}
                    tableGroup={tableGroup}
                    onOrderStatusChange={handleOrderStatusChange}
                    onBatchComplete={handleBatchComplete}
                    variant="expo"
                  />
                ))}
              </div>
            )}
            
            {/* Non-table Orders Section */}
            {(groupedOrders.takeout.length > 0 || groupedOrders.delivery.length > 0) && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Non-Table Orders</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...groupedOrders.takeout, ...groupedOrders.delivery].map(order => (
                    <TouchOptimizedOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'orders' && (
          /* Traditional Order View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(showOnlyReady ? readyOrders : activeOrders).map(order => (
              <TouchOptimizedOrderCard
                key={order.id}
                order={order}
                onStatusChange={handleOrderStatusChange}
              />
            ))}
          </div>
        )}
        
        {viewMode === 'hybrid' && (
          /* Hybrid View - Tables + Individual Orders */
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Tables Column - 2/3 width */}
            <div className="xl:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Table Orders</h2>
              <div className="space-y-4">
                {sortedTableGroups.slice(0, 5).map(tableGroup => (
                  <TableGroupCard
                    key={tableGroup.tableNumber}
                    tableGroup={tableGroup}
                    onOrderStatusChange={handleOrderStatusChange}
                    onBatchComplete={handleBatchComplete}
                    variant="expo"
                  />
                ))}
              </div>
            </div>
            
            {/* Individual Orders Column - 1/3 width */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Quick Orders</h2>
              <div className="space-y-3">
                {[...groupedOrders.takeout, ...groupedOrders.delivery]
                  .slice(0, 10)
                  .map(order => (
                    <TouchOptimizedOrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleOrderStatusChange}
                      className="max-w-none"
                    />
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpoConsolidated