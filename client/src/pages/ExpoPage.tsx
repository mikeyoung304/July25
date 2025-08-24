import React, { useMemo } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { BrandHeaderPresets } from '@/components/layout/BrandHeaderPresets'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { OrderStatusErrorBoundary } from '@/components/errors/OrderStatusErrorBoundary'
import { useKitchenOrdersRealtime } from '@/hooks/useKitchenOrdersRealtime'
import { STATUS_GROUPS, isStatusInGroup, getSafeOrderStatus } from '@/utils/orderStatusValidation'
import type { Order } from '@rebuild/shared'

function ExpoPage() {
  // Use shared hook for real-time order management (same as kitchen)
  const { orders, isLoading, error, updateOrderStatus } = useKitchenOrdersRealtime()

  // Handle completing ready orders - matches OrderCard interface
  const handleCompleteOrder = async (orderId: string, status: 'ready') => {
    // For expo, we want to complete orders, not just mark as ready
    await updateOrderStatus(orderId, 'completed')
  }
  
  // For kitchen overview - no-op function
  const handleNoOp = () => {}

  // Filter orders for expo view using status validation utilities
  const { activeOrders, readyOrders } = useMemo(() => {
    // Ensure all orders have valid statuses
    const safeOrders = orders.map(order => ({
      ...order,
      status: getSafeOrderStatus(order)
    }))
    
    return {
      // Show all active orders: new, pending, confirmed, preparing (everything before ready)
      activeOrders: safeOrders.filter(o => 
        isStatusInGroup(o.status, 'ACTIVE')
      ).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      readyOrders: safeOrders.filter(o => 
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
      {/* BrandHeader with logo and back button */}
      <BrandHeader
        {...BrandHeaderPresets.server}
        title="Order Expediting"
        subtitle="Manage ready orders for delivery"
        rightContent={
          <span className="text-xs text-macon-orange font-medium">EXPO STATION</span>
        }
        className="bg-white shadow-sm border-b"
      />

      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Two-Panel Layout: Kitchen Overview | Ready Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Panel: Kitchen Activity Overview (Read-only) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Kitchen Activity</h2>
              <span className="text-sm text-gray-500">({activeOrders.length} active)</span>
            </div>
            
            {activeOrders.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border">
                <p className="text-gray-500">No active orders</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map(order => (
                  <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display this active order">
                    <OrderCard
                      order={order}
                      onStatusChange={handleNoOp} // Read-only - no interactions
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
              <span className="text-sm text-gray-500">({readyOrders.length} ready)</span>
            </div>
            
            {readyOrders.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border">
                <p className="text-gray-500">No orders ready</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readyOrders.map(order => (
                  <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display this ready order">
                    <OrderCard
                      order={order}
                      onStatusChange={handleCompleteOrder}
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

export default ExpoPage