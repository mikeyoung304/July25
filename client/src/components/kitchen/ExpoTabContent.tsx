import React, { useMemo, useState, useEffect } from 'react'
import { Clock, Package, User, Eye, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OrderCard } from '@/components/kitchen/OrderCard'
import { OrderStatusErrorBoundary } from '@/components/errors/OrderStatusErrorBoundary'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'

interface ExpoTabContentProps {
  activeOrders: Order[]
  readyOrders: Order[]
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>
}

interface ReadyOrderCardProps {
  order: Order
  onMarkSold: (orderId: string) => void
}

function ReadyOrderCard({ order, onMarkSold }: ReadyOrderCardProps) {
  // State that updates every minute to keep elapsed time accurate
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const { elapsedMinutes, urgencyColor, cardColor } = useMemo(() => {
    const created = new Date(order.created_at).getTime()
    const elapsed = Math.floor((now - created) / 60000)

    let color = 'text-green-600'
    let bg = 'bg-green-50 border-green-300'

    if (elapsed >= 20) {
      color = 'text-red-600'
      bg = 'bg-red-50 border-red-300'
    }

    return { elapsedMinutes: elapsed, urgencyColor: color, cardColor: bg }
  }, [order.created_at, now])

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
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg">
              Order #{order.order_number || order.id.slice(-4)}
            </h3>
            <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              READY
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

        {order.customer_name && (
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
            <User className="w-3 h-3" />
            <span>{order.customer_name}</span>
            {order.table_number && <span>• Table {order.table_number}</span>}
          </div>
        )}

        <div className="space-y-1 mb-3">
          {order.items.map((item, index) => (
            <div key={item.id || index} className="text-sm">
              <span className="font-medium">
                {item.quantity}x {item.name}
              </span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => onMarkSold(order.id)}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Mark Sold
        </Button>
      </CardContent>
    </Card>
  )
}

export function ExpoTabContent({ activeOrders, readyOrders, onStatusChange }: ExpoTabContentProps) {
  const handleMarkReady = async (orderId: string) => {
    await onStatusChange(orderId, 'ready')
  }

  const handleMarkSold = async (orderId: string) => {
    await onStatusChange(orderId, 'completed')
  }

  const sortedActiveOrders = useMemo(() => {
    return [...activeOrders].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [activeOrders])

  const sortedReadyOrders = useMemo(() => {
    return [...readyOrders].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [readyOrders])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Two-Panel Layout: Kitchen Activity (smaller) | Ready Orders (dominant) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Panel: Kitchen Activity Overview (1/3 width) */}
        <div className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Kitchen Activity</h2>
            <span className="text-sm text-gray-500">({sortedActiveOrders.length})</span>
          </div>

          {sortedActiveOrders.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border">
              <p className="text-gray-500">No active orders</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {sortedActiveOrders.map(order => (
                <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display order">
                  <OrderCard
                    order={order}
                    onStatusChange={handleMarkReady}
                  />
                </OrderStatusErrorBoundary>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Ready Orders (2/3 width - dominant) */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h2 className="text-lg font-semibold">Ready for Fulfillment</h2>
            <span className="text-sm text-gray-500">({sortedReadyOrders.length})</span>
          </div>

          {sortedReadyOrders.length === 0 ? (
            <div className="bg-white rounded-lg p-16 text-center border-2 border-dashed border-gray-200">
              <p className="text-gray-500 text-xl mb-2">No orders ready</p>
              <p className="text-gray-400">Orders will appear here when marked ready</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedReadyOrders.map(order => (
                <OrderStatusErrorBoundary key={order.id} fallbackMessage="Unable to display order">
                  <ReadyOrderCard
                    order={order}
                    onMarkSold={handleMarkSold}
                  />
                </OrderStatusErrorBoundary>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
