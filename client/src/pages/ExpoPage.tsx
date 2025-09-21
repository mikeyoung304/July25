import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { KDSErrorBoundary } from '@/components/errors/KDSErrorBoundary'
import { Eye, Filter, Clock, CheckCircle, Package, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { TouchOptimizedOrderCard } from '@/components/kitchen/TouchOptimizedOrderCard'
import { VirtualizedOrderGrid } from '@/components/kitchen/VirtualizedOrderGrid'
import { ConnectionStatusBar } from '@/components/kitchen/ConnectionStatusBar'
import { OrderStatusErrorBoundary } from '@/components/errors/OrderStatusErrorBoundary'
import { useKitchenOrdersRealtime } from '@/hooks/useKitchenOrdersRealtime'
import { STATUS_GROUPS, isStatusInGroup, getSafeOrderStatus } from '@/utils/orderStatusValidation'
import { cn } from '@/utils'
import { MemoryMonitorInstance } from '@rebuild/shared/utils/memory-monitoring'
import type { Order } from '@rebuild/shared'

// Ready Order Card Component for Expo - Includes "Mark as Picked Up" and "Mark as Sent" functionality
interface ReadyOrderCardProps {
  order: Order
  onFulfillmentComplete: (orderId: string) => void
}

function ReadyOrderCard({ order, onFulfillmentComplete }: ReadyOrderCardProps) {
  // Calculate elapsed time and urgency color
  const { elapsedMinutes, urgencyColor, cardColor } = useMemo(() => {
    const created = new Date(order.created_at)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - created.getTime()) / 60000)
    
    // Ready orders get green highlight
    let color = 'text-green-600'
    let bg = 'bg-green-50 border-green-300'
    
    // If ready order is getting old, show warning
    if (elapsed >= 20) {
      color = 'text-red-600'
      bg = 'bg-red-50 border-red-300'
    }
    
    return { elapsedMinutes: elapsed, urgencyColor: color, cardColor: bg }
  }, [order.created_at])

  // Get order type display
  const orderTypeDisplay = useMemo(() => {
    switch (order.type) {
      case 'online': return 'Dine-In'
      case 'pickup': return 'Takeout'
      case 'delivery': return 'Delivery'
      default: return order.type
    }
  }, [order.type])

  return (
    <Card className={cn('transition-all duration-200 hover:shadow-md', cardColor)}>
      <CardContent className="p-4">
        {/* Header with Order Number and Timer */}
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">
              Order #{order.order_number || order.id.slice(-4)}
            </h3>
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              READY FOR PICKUP
            </span>
          </div>
          
          <div className="text-right">
            <div className={cn('flex items-center gap-1', urgencyColor)}>
              <Clock className="w-4 h-4" />
              <span className="font-bold">{elapsedMinutes}m</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
              <Package className="w-3 h-3" />
              <span>{orderTypeDisplay}</span>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        {order.customer_name && (
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
            <User className="w-3 h-3" />
            <span>{order.customer_name}</span>
            {order.table_number && <span>• Table {order.table_number}</span>}
          </div>
        )}

        {/* Order Items Summary */}
        <div className="space-y-1 mb-3">
          {order.items.map((item, index) => (
            <div key={item.id || index} className="text-sm">
              <span className="font-medium">
                {item.quantity}x {item.name}
              </span>
            </div>
          ))}
        </div>

        {/* CRITICAL: Fulfillment Buttons - Different actions based on order type */}
        <div className="flex gap-2">
          {order.type === 'delivery' ? (
            <Button
              onClick={() => onFulfillmentComplete(order.id)}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              size="lg"
            >
              🚚 Mark as Sent
            </Button>
          ) : (
            <Button
              onClick={() => onFulfillmentComplete(order.id)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              ✓ Mark as Picked Up
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function ExpoPage() {
  // Use working real-time hook 
  const { 
    orders, 
    isLoading, 
    error, 
    updateOrderStatus
  } = useKitchenOrdersRealtime()
  
  // View modes for expo station
  const [_viewMode, _setViewMode] = useState<'split' | 'ready-only'>('split')
  const [_showFilters, _setShowFilters] = useState(false)
  
  // Memory monitoring for long-running sessions
  useEffect(() => {
    const memoryMonitor = MemoryMonitoringSystem.getInstance()
    memoryMonitor.configure({
      interval: 60000, // Check every minute
      threshold: 200 * 1024 * 1024, // Alert at 200MB
      onThresholdExceeded: (snapshot) => {
        console.warn('⚠️ Expo Display memory usage high:', {
          used: `${Math.round(snapshot.used / 1024 / 1024)}MB`,
          percentage: `${snapshot.percentage.toFixed(2)}%`
        })
      }
    })
    
    memoryMonitor.start()
    
    return () => {
      memoryMonitor.stop()
    }
  }, [])

  // Handle marking kitchen orders as ready (left panel)
  const handleMarkReady = async (orderId: string, status: 'ready') => {
    await updateOrderStatus(orderId, 'ready')
  }
  
  // Handle marking ready orders as fulfilled - pickup or sent (right panel - CRITICAL FOR EXPO)
  const handleFulfillmentComplete = async (orderId: string) => {
    await updateOrderStatus(orderId, 'completed')
  }

  // Filter orders for expo view using status validation utilities  
  const { filteredActive, filteredReady } = useMemo(() => {
    // Ensure all orders have valid statuses
    const safeOrders = orders.map(order => ({
      ...order,
      status: getSafeOrderStatus(order)
    }))
    
    return {
      // Show all active orders: new, pending, confirmed, preparing (everything before ready)
      filteredActive: safeOrders.filter(o => 
        isStatusInGroup(o.status, 'ACTIVE')
      ).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      filteredReady: safeOrders.filter(o => 
        isStatusInGroup(o.status, 'READY')
      ).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
  }, [orders])

  // Handle errors and loading states (reuse pattern from kitchen)
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load expo station: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Reload Page
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading expo station...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Two-Panel Layout: Kitchen Overview | Ready Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Panel: Kitchen Activity Overview (Read-only) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Kitchen Activity</h2>
              <span className="text-sm text-gray-500">({filteredActive.length} active)</span>
            </div>
            
            {filteredActive.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border">
                <p className="text-gray-500">No active orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActive.map(order => (
                  <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display this active order">
                    <OrderCard
                      order={order}
                      onStatusChange={handleMarkReady} // Allow marking as ready from kitchen view
                    />
                  </OrderStatusErrorBoundary>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel: Ready Orders (Interactive) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h2 className="text-lg font-semibold">Ready for Fulfillment</h2>
              <span className="text-sm text-gray-500">({filteredReady.length} ready)</span>
            </div>
            
            {filteredReady.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border">
                <p className="text-gray-500">No orders ready</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReady.map(order => (
                  <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display this ready order">
                    <ReadyOrderCard
                      order={order}
                      onFulfillmentComplete={handleFulfillmentComplete}
                    />
                  </OrderStatusErrorBoundary>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Wrap with KDS error boundary for resilience
const ExpoPageWithErrorBoundary = () => (
  <KDSErrorBoundary stationName="Expo Station">
    <ExpoPage />
  </KDSErrorBoundary>
)

export default ExpoPageWithErrorBoundary