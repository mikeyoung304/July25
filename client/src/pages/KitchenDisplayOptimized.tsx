import React, { useState, useMemo, useCallback } from 'react'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { TouchOptimizedOrderCard } from '@/components/kitchen/TouchOptimizedOrderCard'
import { VirtualizedOrderGrid } from '@/components/kitchen/VirtualizedOrderGrid'
import { ConnectionStatusBar } from '@/components/kitchen/ConnectionStatusBar'
import { Button } from '@/components/ui/button'
import { Filter, Clock, ChefHat, AlertCircle, BarChart3, Zap } from 'lucide-react'
import { useKitchenOrdersOptimized } from '@/hooks/useKitchenOrdersOptimized'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'

type StatusFilter = 'all' | 'active' | 'ready' | 'urgent'
type SortMode = 'priority' | 'chronological' | 'type'

function KitchenDisplayOptimized() {
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
  
  // Enhanced filtering and sorting state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [sortMode, setSortMode] = useState<SortMode>('priority')
  const [showStats, setShowStats] = useState(false)

  // Enhanced order status handling
  const handleStatusChange = useCallback(async (orderId: string, status: 'ready') => {
    const success = await updateOrderStatus(orderId, status)
    if (!success) {
      console.error('Failed to update order status:', orderId)
    }
  }, [updateOrderStatus])

  // Compute detailed statistics
  const stats = useMemo(() => {
    const now = Date.now()
    
    const urgentOrders = orders.filter(order => {
      const age = (now - new Date(order.created_at).getTime()) / 60000
      return age >= 15 && !['completed', 'cancelled'].includes(order.status)
    })

    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const typeBreakdown = orders.reduce((acc, order) => {
      acc[order.type] = (acc[order.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: orders.length,
      active: activeOrders.length,
      ready: readyOrders.length,
      urgent: urgentOrders.length,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
      averageAge: orders.length ? 
        orders.reduce((sum, order) => {
          const age = (now - new Date(order.created_at).getTime()) / 60000
          return sum + age
        }, 0) / orders.length : 0,
      oldestOrder: orders.length ?
        Math.max(...orders.map(order => 
          (now - new Date(order.created_at).getTime()) / 60000
        )) : 0,
      typeBreakdown
    }
  }, [orders, activeOrders.length, readyOrders.length])

  // Smart filtering and sorting
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders

    // Apply status filter
    switch (statusFilter) {
      case 'active':
        filtered = activeOrders
        break
      case 'ready':
        filtered = readyOrders
        break
      case 'urgent':
        const now = Date.now()
        filtered = orders.filter(order => {
          const age = (now - new Date(order.created_at).getTime()) / 60000
          return age >= 15 && !['completed', 'cancelled'].includes(order.status)
        })
        break
      default:
        filtered = orders.filter(o => !['completed', 'cancelled'].includes(o.status))
    }

    // Apply sorting
    switch (sortMode) {
      case 'priority':
        return prioritizedOrders.filter(order => 
          filtered.some(f => f.id === order.id)
        )
      case 'chronological':
        return [...filtered].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      case 'type':
        return [...filtered].sort((a, b) => {
          if (a.type !== b.type) return a.type.localeCompare(b.type)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
      default:
        return filtered
    }
  }, [orders, activeOrders, readyOrders, prioritizedOrders, statusFilter, sortMode])

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
      
      {/* Enhanced Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <BackToDashboard />
              <div className="flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Kitchen Display</h1>
              </div>
            </div>

            {/* Real-time Stats Bar */}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStats(!showStats)}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Expandable Stats Panel */}
          {showStats && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-semibold text-gray-900">Performance</div>
                <div className="text-gray-600">Avg Age: {stats.averageAge.toFixed(1)}min</div>
                <div className="text-gray-600">Oldest: {stats.oldestOrder.toFixed(1)}min</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Status Breakdown</div>
                <div className="text-gray-600">Active: {stats.active}</div>
                <div className="text-gray-600">Ready: {stats.ready}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Completed Today</div>
                <div className="text-green-600">✓ {stats.completed}</div>
                <div className="text-red-600">✗ {stats.cancelled}</div>
              </div>
              <div>
                <div className="font-semibold text-gray-900">Order Types</div>
                {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                  <div key={type} className="text-gray-600">
                    {type}: {count}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Filters and Controls */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {/* Status Filters */}
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All ({orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length})
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
              >
                Active ({stats.active})
              </Button>
              <Button
                variant={statusFilter === 'ready' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('ready')}
              >
                Ready ({stats.ready})
              </Button>
              {stats.urgent > 0 && (
                <Button
                  variant={statusFilter === 'urgent' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('urgent')}
                  className="text-red-600 border-red-300"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Urgent ({stats.urgent})
                </Button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort:</span>
              <Button
                variant={sortMode === 'priority' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('priority')}
              >
                <Zap className="w-3 h-3 mr-1" />
                Priority
              </Button>
              <Button
                variant={sortMode === 'chronological' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('chronological')}
              >
                <Clock className="w-3 h-3 mr-1" />
                Time
              </Button>
              <Button
                variant={sortMode === 'type' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('type')}
              >
                <Filter className="w-3 h-3 mr-1" />
                Type
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {filteredAndSortedOrders.length === 0 ? (
          <div className="bg-white rounded-lg p-16 text-center border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-6">
              {statusFilter === 'urgent' ? '🎯' : statusFilter === 'ready' ? '✅' : '👨‍🍳'}
            </div>
            <p className="text-gray-500 text-2xl mb-2">
              {statusFilter === 'urgent' 
                ? 'No urgent orders' 
                : statusFilter === 'ready'
                ? 'No orders ready'
                : 'No active orders'
              }
            </p>
            <p className="text-gray-400 text-lg">
              {statusFilter === 'urgent' 
                ? 'Great job staying on top of orders!'
                : statusFilter === 'ready'
                ? 'Orders will appear here when ready for pickup'
                : 'All caught up! New orders will appear here.'
              }
            </p>
          </div>
        ) : (
          <VirtualizedOrderGrid
            orders={filteredAndSortedOrders}
            onStatusChange={handleStatusChange}
            className="h-[calc(100vh-300px)]"
          />
        )}
      </div>

      {/* Performance Indicator */}
      {filteredAndSortedOrders.length > 50 && (
        <div className="fixed bottom-4 left-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
          Virtual scrolling: {filteredAndSortedOrders.length} orders
        </div>
      )}
    </div>
  )
}

export default KitchenDisplayOptimized