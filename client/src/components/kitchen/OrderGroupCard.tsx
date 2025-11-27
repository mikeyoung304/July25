import React, { memo } from 'react'
import { Clock, CheckCircle, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OrderGroup } from '@/hooks/useOrderGrouping'
import type { Order } from '@rebuild/shared'
import { cn } from '@/utils'
import {
  getOrderUrgency,
  getUrgencyAccentClass,
  getUrgencyColorClass,
  KDS_TYPE_COLORS,
  formatOrderNumber,
  getDisplayCustomerName
} from '@rebuild/shared/config/kds'
import { ModifierList } from './ModifierList'

interface OrderGroupCardProps {
  orderGroup: OrderGroup
  onStatusChange: (orderId: string, status: Order['status']) => Promise<void>
  onNotifyCustomer?: (orderId: string) => Promise<void>
  onFocusMode?: (orderGroup: OrderGroup) => void
  variant?: 'kitchen' | 'expo'
}

// Small, clean order type badge component using unified KDS colors
const OrderTypeBadge = ({ pickupType }: { pickupType: OrderGroup['pickup_type'] }) => {
  // Map pickup_type to KDS display type
  const displayType = pickupType === 'counter' ? 'dine-in' : 'drive-thru'
  const typeColors = KDS_TYPE_COLORS[displayType]
  const label = displayType === 'dine-in' ? 'DINE-IN' : 'DRIVE-THRU'

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-semibold px-2 py-1', typeColors.badge)}
    >
      {label}
    </Badge>
  )
}

function OrderGroupCardComponent({
  orderGroup,
  onStatusChange,
  onNotifyCustomer,
  onFocusMode,
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

  // Use unified KDS type colors + urgency accent
  const displayType = orderGroup.pickup_type === 'counter' ? 'dine-in' : 'drive-thru'
  const typeColors = KDS_TYPE_COLORS[displayType]
  const urgencyLevel = getOrderUrgency(orderGroup.age_minutes)
  const urgencyAccent = getUrgencyAccentClass(urgencyLevel)
  const timerColorClass = getUrgencyColorClass(urgencyLevel)

  // Get display name using shared helper
  const displayName = getDisplayCustomerName(orderGroup.customer_name)

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 shadow-card hover:shadow-card-hover transition-all overflow-hidden',
        typeColors.bg,
        typeColors.border,
        urgencyAccent
      )}
    >
      {/* Clean Header: Type Badge + Timer + Focus Button */}
      <div className="flex items-start justify-between mb-3">
        <OrderTypeBadge pickupType={orderGroup.pickup_type} />

        <div className="flex items-center gap-2">
          {/* Timer with urgency color - 20px/text-xl */}
          <div className={cn(
            'flex items-center gap-1 text-xl font-bold',
            timerColorClass
          )}>
            <Clock className="w-5 h-5" aria-hidden="true" />
            <span>{orderGroup.age_minutes}m</span>
          </div>

          {/* Focus Mode Button - 44px touch target */}
          {onFocusMode && (
            <button
              onClick={() => onFocusMode(orderGroup)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Expand order details"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Primary identifier: Customer last name for drive-thru, then Order Number - 24px primary */}
      <div className="mb-3">
        {displayType === 'drive-thru' && displayName ? (
          <h3 className="text-2xl font-bold text-gray-900">
            {displayName}
          </h3>
        ) : null}
        <div className={cn(
          'font-medium text-gray-700',
          (displayType === 'drive-thru' && displayName)
            ? 'text-sm'
            : 'text-2xl font-bold text-gray-900'
        )}>
          Order #{formatOrderNumber(orderGroup.order_number)}
        </div>
      </div>

      {/* Special instructions */}
      {orderGroup.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
          <strong>Note:</strong> {orderGroup.notes}
        </div>
      )}

      {/* Items list - 16px item text */}
      <div className="space-y-2 mb-3">
        {orderGroup.orders.map(order => (
          <div key={order.id} className="border-l-2 border-gray-300 pl-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-1">
                <div className="flex items-center gap-2">
                  {order.status === 'ready' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex-shrink-0" />
                  )}
                  <span className={cn(
                    'text-base font-medium',
                    order.status === 'ready' && 'text-gray-500 line-through'
                  )}>
                    {item.quantity}x {item.name}
                  </span>
                </div>
                {/* Modifiers - using shared component with accessibility */}
                <ModifierList
                  modifiers={item.modifiers}
                  size="sm"
                  className="ml-6 mt-1"
                />
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
        <div
          className="w-full bg-gray-200 rounded-full h-2"
          role="progressbar"
          aria-valuenow={orderGroup.completion_percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Order progress: ${orderGroup.completed_items} of ${orderGroup.total_items} items complete`}
        >
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

/**
 * Memoized OrderGroupCard to prevent unnecessary re-renders
 *
 * Only re-renders when relevant order data changes:
 * - Order ID, status, completion percentage
 * - Age (timer updates)
 * - Variant (kitchen vs expo)
 */
export const OrderGroupCard = memo(OrderGroupCardComponent, (prev, next) => {
  return (
    prev.orderGroup.order_id === next.orderGroup.order_id &&
    prev.orderGroup.status === next.orderGroup.status &&
    prev.orderGroup.completion_percentage === next.orderGroup.completion_percentage &&
    prev.orderGroup.age_minutes === next.orderGroup.age_minutes &&
    prev.orderGroup.notes === next.orderGroup.notes &&
    prev.orderGroup.customer_phone === next.orderGroup.customer_phone &&
    prev.variant === next.variant &&
    prev.onStatusChange === next.onStatusChange &&
    prev.onNotifyCustomer === next.onNotifyCustomer &&
    prev.onFocusMode === next.onFocusMode
  )
})
