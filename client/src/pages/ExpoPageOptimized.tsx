import React, { useMemo, useState, useCallback } from 'react'
import { Eye, Filter, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
// 
import { VirtualizedOrderGrid } from '@/components/kitchen/VirtualizedOrderGrid'
import { ConnectionStatusBar } from '@/components/kitchen/ConnectionStatusBar'
// 
import { useKitchenOrdersOptimized } from '@/hooks/useKitchenOrdersOptimized'
// 
import {  } from '@/utils'
import type { Order } from '@rebuild/shared'

function ExpoPageOptimized() {
  // Use optimized hook for performance and advanced features
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
  
  // View modes for expo station
  const [viewMode, setViewMode] = useState<'split' | 'ready-only'>('split')
  const [showFilters, setShowFilters] = useState(false)

  // Enhanced order completion for expo station
  const handleCompleteOrder = useCallback(async (orderId: string, status: 'ready') => {
    // For expo, we want to complete orders, not just mark as ready
    const success = await updateOrderStatus(orderId, 'completed')
    if (!success) {
      // Could add toast notification here
      console.error('Failed to complete order:', orderId)
    }
  }, [updateOrderStatus])
  
  // Mark order as ready from kitchen overview
  const handleMarkReady = useCallback(async (orderId: string, status: 'ready') => {
    await updateOrderStatus(orderId, status)
  }, [updateOrderStatus])

  // Compute statistics and urgency metrics
  const stats = useMemo(() => {
    const now = Date.now()
    
    return {
      activeCount: activeOrders.length,
      readyCount: readyOrders.length,
      urgentCount: orders.filter(order => {
        const age = (now - new Date(order.created_at).getTime()) / 60000
        return age >= 15 && !['completed', 'cancelled'].includes(order.status)
      }).length,
      averageAge: orders.length ? 
        orders.reduce((sum, order) => {
          const age = (now - new Date(order.created_at).getTime()) / 60000
          return sum + age
        }, 0) / orders.length : 0
    }
  }, [orders, activeOrders.length, readyOrders.length])

  // Enhanced error and loading states
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Expo Station Error</h2>
          <p className="text-destructive mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={() => window.location.reload()} className="w-full">
              Reload Page
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
          <p className="text-gray-600 text-lg">Loading Expo Station...</p>
          <p className="text-gray-400 text-sm mt-1">Connecting to kitchen systems...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Connection Status Indicator */}
      <ConnectionStatusBar />
      
      {/* Header with Stats and Controls */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-gray-900">Expo Station</h1>
              
              {/* Real-time Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{stats.activeCount} Active</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">{stats.readyCount} Ready</span>
                </div>
                {stats.urgentCount > 0 && (
                  <div className="flex items-center gap-1 text-red-600">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="font-medium">{stats.urgentCount} Urgent</span>
                  </div>
                )}
                <div className="text-gray-500">
                  Avg: {stats.averageAge.toFixed(1)}min
                </div>
              </div>
            </div>
            
            {/* View Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('split')}
              >
                Split View
              </Button>
              <Button
                variant={viewMode === 'ready-only' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('ready-only')}
              >
                Ready Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {viewMode === 'split' ? (
          /* Two-Panel Layout: Kitchen Overview | Ready Orders */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left Panel: Kitchen Activity Overview (Interactive) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Kitchen Activity</h2>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {stats.activeCount} active
                </span>
              </div>
              
              {activeOrders.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-200">
                  <div className="text-4xl mb-4">👨‍🍳</div>
                  <p className="text-gray-500 text-lg">No active orders</p>
                  <p className="text-gray-400 text-sm mt-1">Kitchen is all caught up!</p>
                </div>
              ) : (
                <VirtualizedOrderGrid
                  orders={activeOrders.slice(0, 12)} // Limit for performance
                  onStatusChange={handleMarkReady}
                  className="h-[600px]"
                />
              )}
            </div>

            {/* Right Panel: Ready Orders (Interactive) */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-semibold">Ready for Fulfillment</h2>
                <span className="text-sm text-white bg-green-600 px-2 py-1 rounded font-medium">
                  {stats.readyCount} ready
                </span>
              </div>
              
              {readyOrders.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center border-2 border-dashed border-gray-200">
                  <div className="text-4xl mb-4">⏳</div>
                  <p className="text-gray-500 text-lg">No orders ready</p>
                  <p className="text-gray-400 text-sm mt-1">Orders will appear here when ready</p>
                </div>
              ) : (
                <VirtualizedOrderGrid
                  orders={readyOrders}
                  onStatusChange={handleCompleteOrder}
                  className="h-[600px]"
                />
              )}
            </div>
          </div>
        ) : (
          /* Ready-Only Mode: Full width grid */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold">Ready Orders - Full View</h2>
              <span className="text-lg text-white bg-green-600 px-3 py-1 rounded-full font-bold">
                {stats.readyCount}
              </span>
            </div>
            
            {readyOrders.length === 0 ? (
              <div className="bg-white rounded-lg p-16 text-center border-2 border-dashed border-gray-200">
                <div className="text-6xl mb-6">🎯</div>
                <p className="text-gray-500 text-2xl mb-2">No orders ready for pickup</p>
                <p className="text-gray-400 text-lg">Ready orders will appear here for fulfillment</p>
              </div>
            ) : (
              <VirtualizedOrderGrid
                orders={readyOrders}
                onStatusChange={handleCompleteOrder}
                className="h-[700px]"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExpoPageOptimized