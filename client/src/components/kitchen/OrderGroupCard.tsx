import React from 'react'
import { Clock, Phone, Car, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OrderGroup } from '@/hooks/useOrderGrouping'
import type { Order } from '@rebuild/shared'
import { cn } from '@/utils'

interface OrderGroupCardProps {
  orderGroup: OrderGroup
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>
  onNotifyCustomer?: (orderId: string) => Promise<void>
  variant?: 'kitchen' | 'expo'
}

export function OrderGroupCard({
  orderGroup,
  onStatusChange,
  onNotifyCustomer,
  variant = 'kitchen'
}: OrderGroupCardProps) {
  const [isUpdating, setIsUpdating] = React.useState(false)

  const handleMarkReady = async () => {
    setIsUpdating(true)
    try {
      // Mark all orders in this group as ready
      await Promise.all(
        orderGroup.orders.map(order => onStatusChange(order.id, 'ready'))
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePickedUp = async () => {
    setIsUpdating(true)
    try {
      // Mark all orders as picked up
      await Promise.all(
        orderGroup.orders.map(order => onStatusChange(order.id, 'picked-up' as Order['status']))
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const handleNotify = async () => {
    if (!onNotifyCustomer) return
    setIsUpdating(true)
    try {
      await onNotifyCustomer(orderGroup.order_id)
    } finally {
      setIsUpdating(false)
    }
  }

  // Urgency styling
  const urgencyColors = {
    normal: 'border-gray-200 bg-white',
    warning: 'border-yellow-300 bg-yellow-50',
    urgent: 'border-orange-400 bg-orange-50',
    critical: 'border-red-400 bg-red-50 animate-pulse'
  }

  const statusColors = {
    new: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-700',
    confirmed: 'bg-purple-100 text-purple-700',
    preparing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    'picked-up': 'bg-gray-400 text-white',
    completed: 'bg-gray-300 text-gray-600',
    cancelled: 'bg-red-100 text-red-700'
  }

  const pickupTypeIcons = {
    'drive-thru': '🚗',
    'counter': '🏪',
    'curbside': '🅿️',
    'delivery': '🚚'
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 shadow-sm transition-all',
        urgencyColors[orderGroup.urgency_level]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold">Order #{orderGroup.order_number}</h3>
            <Badge variant="outline" className={cn('text-xs', statusColors[orderGroup.status])}>
              {orderGroup.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">{orderGroup.customer_name}</span>
              {orderGroup.customer_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {orderGroup.customer_phone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg">
                {pickupTypeIcons[orderGroup.pickup_type]}
              </span>
              <span className="text-xs uppercase font-semibold">
                {orderGroup.pickup_type}
              </span>
            </div>
          </div>
        </div>

        {/* Age indicator */}
        <div className="text-right">
          <div className={cn(
            'flex items-center gap-1 text-sm',
            orderGroup.urgency_level === 'critical' && 'text-red-600 font-bold',
            orderGroup.urgency_level === 'urgent' && 'text-orange-600 font-semibold',
            orderGroup.urgency_level === 'warning' && 'text-yellow-700'
          )}>
            <Clock className="w-4 h-4" />
            <span>{orderGroup.age_minutes} min ago</span>
          </div>
          {orderGroup.urgency_level === 'critical' && (
            <div className="text-xs text-red-600 font-bold mt-1">
              URGENT!
            </div>
          )}
        </div>
      </div>

      {/* Special instructions */}
      {orderGroup.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
          <strong>Note:</strong> {orderGroup.notes}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2 mb-3">
        {orderGroup.orders.map(order => (
          <div key={order.id} className="border-l-2 border-gray-300 pl-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-2">
                  {order.status === 'ready' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                  )}
                  <span className={cn(
                    'font-medium',
                    order.status === 'ready' && 'text-gray-500 line-through'
                  )}>
                    {item.quantity}x {item.name}
                  </span>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {item.modifiers.map(m => m.name).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{orderGroup.completed_items}/{orderGroup.total_items} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all',
              orderGroup.completion_percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${orderGroup.completion_percentage}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {orderGroup.status === 'preparing' && (
          <Button
            onClick={handleMarkReady}
            disabled={isUpdating}
            className="flex-1"
            variant="default"
          >
            {isUpdating ? 'Updating...' : 'Mark Ready'}
          </Button>
        )}

        {orderGroup.status === 'ready' && (
          <>
            {onNotifyCustomer && orderGroup.customer_phone && (
              <Button
                onClick={handleNotify}
                disabled={isUpdating}
                variant="outline"
                className="flex-1"
              >
                📱 Notify
              </Button>
            )}
            <Button
              onClick={handlePickedUp}
              disabled={isUpdating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              ✅ Picked Up
            </Button>
          </>
        )}

        {orderGroup.status === 'pending' && (
          <Button
            onClick={handleMarkReady}
            disabled={isUpdating}
            className="flex-1"
            variant="secondary"
          >
            Start Preparing
          </Button>
        )}

        {orderGroup.status === 'confirmed' && (
          <Button
            onClick={handleMarkReady}
            disabled={isUpdating}
            className="flex-1"
            variant="default"
          >
            {isUpdating ? 'Updating...' : 'Mark Ready'}
          </Button>
        )}
      </div>
    </div>
  )
}
