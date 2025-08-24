import React, { useState, useMemo } from 'react'
import { BrandHeader } from '@/components/layout/BrandHeader'
import { BrandHeaderPresets } from '@/components/layout/BrandHeaderPresets'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { Button } from '@/components/ui/button'
import { useKitchenOrdersRealtime } from '@/hooks/useKitchenOrdersRealtime'
import type { Order } from '@rebuild/shared'

/**
 * Minimal Kitchen Display System
 * Core function: Display orders and update their status
 */
function KitchenDisplaySimple() {
  // Use shared hook for real-time order management
  const { orders, isLoading, error, updateOrderStatus } = useKitchenOrdersRealtime()
  
  // Simple filtering - active or ready only
  const [statusFilter, setStatusFilter] = useState<'active' | 'ready'>('active')

  // Handle order status change - now uses shared hook
  const handleStatusChange = async (orderId: string, status: 'ready') => {
    await updateOrderStatus(orderId, status)
  }

  // Simple filtering logic
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(o => 
        o.status !== 'ready' && o.status !== 'completed' && o.status !== 'cancelled'
      )
    } else if (statusFilter === 'ready') {
      filtered = filtered.filter(o => o.status === 'ready')
    }

    // Sort by creation time (oldest first)
    return filtered.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [orders, statusFilter])

  // Handle errors and loading states
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load kitchen display: {error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Reload Page
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Loading kitchen display...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* BrandHeader with logo and back button */}
      <BrandHeader
        {...BrandHeaderPresets.server}
        title="Kitchen Orders"
        subtitle="Manage incoming orders"
        rightContent={
          <span className="text-xs text-macon-orange font-medium">KITCHEN DISPLAY</span>
        }
        className="bg-white shadow-sm border-b"
      />

      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Minimal Filters - Active/Ready only */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active ({orders.filter(o => o.status !== 'ready' && o.status !== 'completed' && o.status !== 'cancelled').length})
          </Button>
          <Button
            variant={statusFilter === 'ready' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ready')}
          >
            Ready ({orders.filter(o => o.status === 'ready').length})
          </Button>
        </div>

        {/* DEBUG: Test API Button */}
        <div className="mb-4 p-4 bg-yellow-100 rounded-lg">
          <button 
            onClick={async () => {
              console.log('=== MANUAL API TEST START ===')
              try {
                const { api } = await import('@/services/api')
                console.log('Calling api.getOrders()...')
                const result = await api.getOrders()
                console.log('Manual API test result:', result)
                console.log('Result is array?', Array.isArray(result))
                console.log('Result length:', Array.isArray(result) ? result.length : 'N/A')
                if (Array.isArray(result) && result.length > 0) {
                  console.log('First order:', result[0])
                }
              } catch (error) {
                console.error('Manual API test failed:', error)
              }
              console.log('=== MANUAL API TEST END ===')
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔍 Test API Manually
          </button>
          <p className="text-sm text-gray-600 mt-2">
            Debug: Click to test API call directly (check browser console)
          </p>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-500">No active orders (showing {orders.length} total orders from hook)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default KitchenDisplaySimple