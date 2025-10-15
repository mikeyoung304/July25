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

// Small, clean order type badge component
const OrderTypeBadge = ({ pickupType }: { pickupType: OrderGroup['pickup_type'] }) => {
  // Simplified to 2 types: online (drive-thru) and dining-room
  const typeConfig = {
    'drive-thru': {
      label: 'ONLINE',
      bg: 'bg-accent/10',
      text: 'text-accent-700',
      border: 'border-accent-500'
    },
    'counter': {
      label: 'DINE-IN',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-500'
    }
  }

  const config = typeConfig[pickupType] || typeConfig['counter']

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-semibold px-2 py-1',
        config.bg,
        config.text,
        config.border
      )}
    >
      {config.label}
    </Badge>
  )
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

  // Clean order type styling - simplified to 2 types
  const orderTypeStyles = {
    'drive-thru': 'border-accent-500 bg-white',  // Teal border for online orders
    'counter': 'border-amber-400 bg-white'       // Amber border for dining room
  }

  const cardStyle = orderTypeStyles[orderGroup.pickup_type] || 'border-gray-300 bg-white'

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

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 shadow-card hover:shadow-card-hover transition-all',
        cardStyle
      )}
    >
      {/* Clean Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900">Order #{orderGroup.order_number}</h3>
            <OrderTypeBadge pickupType={orderGroup.pickup_type} />
            <Badge variant="outline" className={cn('text-xs', statusColors[orderGroup.status])}>
              {orderGroup.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">{orderGroup.customer_name}</span>
              {orderGroup.customer_phone && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Phone className="w-3 h-3" />
                  {orderGroup.customer_phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Simple time indicator */}
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{orderGroup.age_minutes} min</span>
          </div>
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
        {/* Show "Mark Ready" for pending, confirmed, or preparing status */}
        {(orderGroup.status === 'pending' ||
          orderGroup.status === 'confirmed' ||
          orderGroup.status === 'preparing') && (
          <Button
            onClick={handleMarkReady}
            disabled={isUpdating}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            variant="default"
          >
            {isUpdating ? 'Updating...' : 'Mark Ready'}
          </Button>
        )}

        {/* Show "Picked Up" and optional "Notify" when ready */}
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
      </div>
    </div>
  )
}
