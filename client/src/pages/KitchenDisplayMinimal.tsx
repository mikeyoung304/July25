import React, { useState, useMemo } from 'react'
import { useKitchenOrdersRealtime } from '@/hooks/useKitchenOrdersRealtime'
import { BackToDashboard } from '@/components/navigation/BackToDashboard'
import { OrderStatusErrorBoundary } from '@/components/errors/OrderStatusErrorBoundary'
import { isStatusInGroup, getSafeOrderStatus } from '@/utils/orderStatusValidation'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import type { Order } from '@rebuild/shared'

/**
 * Ultra-Minimal Kitchen Display
 * Matches Dashboard aesthetic: large cards, minimal colors, maximum clarity
 */
function KitchenDisplayMinimal() {
  // Use shared hook for consistent data management
  const { orders, isLoading, error, updateOrderStatus } = useKitchenOrdersRealtime()
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready'>('active')

  // Handle order completion - mark as ready for expo
  const handleComplete = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready')
  }


  // Filter orders using status validation utilities
  const filteredOrders = useMemo(() => {
    let filtered = orders.map(order => ({
      ...order,
      status: getSafeOrderStatus(order)
    }))

    if (statusFilter === 'active') {
      filtered = filtered.filter(o => isStatusInGroup(o.status, 'ACTIVE'))
    } else if (statusFilter === 'ready') {
      filtered = filtered.filter(o => isStatusInGroup(o.status, 'READY'))
    }

    return filtered.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [orders, statusFilter])

  // Count helpers using status groups
  const activeCount = orders.filter(o => isStatusInGroup(getSafeOrderStatus(o), 'ACTIVE')).length
  const readyCount = orders.filter(o => isStatusInGroup(getSafeOrderStatus(o), 'READY')).length

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Failed to load: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header */}
      <div className="bg-white border-b px-4 py-2">
        <BackToDashboard />
      </div>

      {/* Filter Cards - Dashboard Style */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
          <button
            onClick={() => setStatusFilter('active')}
            className={`
              p-6 rounded-xl text-center transition-all
              ${statusFilter === 'active' 
                ? 'bg-gray-800 text-white shadow-lg scale-105' 
                : 'bg-white text-gray-600 hover:bg-gray-100'}
            `}
          >
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-sm mt-1">Active</div>
          </button>

          <button
            onClick={() => setStatusFilter('ready')}
            className={`
              p-6 rounded-xl text-center transition-all
              ${statusFilter === 'ready' 
                ? 'bg-green-600 text-white shadow-lg scale-105' 
                : 'bg-white text-gray-600 hover:bg-gray-100'}
            `}
          >
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{readyCount}</div>
            <div className="text-sm mt-1">Ready</div>
          </button>
        </div>

        {/* Orders Grid - Simplified Cards with Error Boundary */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No {statusFilter} orders</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {filteredOrders.map(order => (
              <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display this order">
                <MinimalOrderCard
                  order={order}
                  onComplete={handleComplete}
                />
              </OrderStatusErrorBoundary>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Minimal Order Card Component
function MinimalOrderCard({ order, onComplete }: { order: Order; onComplete: (id: string) => void }) {
  const elapsedMinutes = useMemo(() => {
    const created = new Date(order.created_at)
    const now = new Date()
    return Math.floor((now.getTime() - created.getTime()) / 60000)
  }, [order.created_at])

  // Simple urgency indicator
  const urgencyColor = elapsedMinutes >= 15 ? 'border-red-500' : 
                       elapsedMinutes >= 10 ? 'border-yellow-500' : 
                       'border-gray-200'

  return (
    <div className={`bg-white rounded-lg p-4 border-2 ${urgencyColor}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="text-lg font-bold">#{order.order_number}</div>
        <div className="flex items-center text-gray-500">
          <Clock className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">{elapsedMinutes}m</span>
        </div>
      </div>

      {/* Items - Simplified */}
      <div className="space-y-1 mb-4">
        {order.items.map((item, index) => (
          <div key={item.id || index} className="text-sm">
            <div className="font-medium">
              {item.quantity}x {item.name}
            </div>
            {item.modifiers && item.modifiers.length > 0 && (
              <div className="text-xs text-gray-500 ml-2">
                {item.modifiers.map(m => m.name).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Button */}
      {order.status !== 'ready' && (
        <button
          onClick={() => onComplete(order.id)}
          className="w-full py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition-colors"
        >
          Complete
        </button>
      )}
      
      {order.status === 'ready' && (
        <div className="w-full py-3 bg-green-100 text-green-700 rounded-lg text-center font-medium">
          ✓ Ready
        </div>
      )}
    </div>
  )
}

export default KitchenDisplayMinimal