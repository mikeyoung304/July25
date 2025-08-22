import React, { useMemo } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { useKitchenOrdersRealtime } from '@/hooks/useKitchenOrdersRealtime'
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

  // Filter orders for expo view: preparing (for overview) and ready (for completion)
  const { preparingOrders, readyOrders } = useMemo(() => {
    return {
      preparingOrders: orders.filter(o => o.status === 'preparing').sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      readyOrders: orders.filter(o => o.status === 'ready').sort((a, b) => 
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
      {/* Header */}
      <div className="bg-white border-b px-4 py-2">
        <BackToDashboard />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Two-Panel Layout: Kitchen Overview | Ready Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Panel: Kitchen Activity Overview (Read-only) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Kitchen Activity</h2>
              <span className="text-sm text-gray-500">({preparingOrders.length} preparing)</span>
            </div>
            
            {preparingOrders.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center border">
                <p className="text-gray-500">No orders being prepared</p>
              </div>
            ) : (
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleNoOp} // Read-only - no interactions
                  />
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
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleCompleteOrder}
                  />
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