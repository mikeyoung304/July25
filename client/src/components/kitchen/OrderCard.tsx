import React, { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Search } from 'lucide-react'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'
import {
  getOrderUrgency,
  getUrgencyColorClass,
  getKDSDisplayType,
  getUrgencyAccentClass,
  KDS_TYPE_COLORS,
  formatOrderNumber,
  getDisplayCustomerName
} from '@rebuild/shared/config/kds'
import { ModifierList } from './ModifierList'

export interface OrderCardProps {
  order: Order
  onStatusChange: (orderId: string, status: 'ready') => void
  onFocusMode?: (order: Order) => void
}

/**
 * Minimal KDS Order Card
 * Clean aesthetic with type color coding and urgency accent
 */
function OrderCardComponent({ order, onStatusChange, onFocusMode }: OrderCardProps) {
  // Calculate elapsed time and urgency using unified KDS config
  const { elapsedMinutes, urgencyColor, urgencyAccent } = useMemo(() => {
    const created = new Date(order.created_at)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - created.getTime()) / 60000)

    // Use centralized KDS thresholds (Phase 4: Architectural Hardening)
    const urgency = getOrderUrgency(elapsed)
    const color = getUrgencyColorClass(urgency)
    const accent = getUrgencyAccentClass(urgency)

    return { elapsedMinutes: elapsed, urgencyColor: color, urgencyAccent: accent }
  }, [order.created_at])

  // Get display type based on table assignment (fixes order type classification bug)
  const displayType = useMemo(() => getKDSDisplayType(order), [order.table_number])
  const typeColors = KDS_TYPE_COLORS[displayType]
  const typeLabel = displayType === 'dine-in' ? 'DINE-IN' : 'DRIVE-THRU'

  // Get display name using shared helper
  const displayName = getDisplayCustomerName(order.customer_name)

  return (
    <Card className={cn(
      'relative overflow-hidden',
      typeColors.bg,
      typeColors.border,
      urgencyAccent
    )}>
      <CardContent className="p-4">
        {/* Header: Type Badge + Timer + Focus Button */}
        <div className="flex justify-between items-start mb-3">
          <Badge
            variant="outline"
            className={cn('text-xs font-semibold', typeColors.badge)}
          >
            {typeLabel}
          </Badge>

          <div className="flex items-center gap-2">
            {/* Timer */}
            <div className={cn('flex items-center gap-1 text-xl font-bold', urgencyColor)}>
              <Clock className="w-5 h-5" aria-hidden="true" />
              <span>{elapsedMinutes}m</span>
            </div>

            {/* Focus Mode Button */}
            {onFocusMode && (
              <button
                onClick={() => onFocusMode(order)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Expand order details"
              >
                <Search className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Primary identifier based on order type - 24px primary text */}
        <div className="mb-3">
          {displayType === 'dine-in' && order.table_number ? (
            // Dine-in: Show Table/Seat prominently
            <h3 className="text-2xl font-bold text-gray-900">
              Table {order.table_number}{order.seat_number ? `, Seat ${order.seat_number}` : ''}
            </h3>
          ) : displayName ? (
            // Drive-thru/To-go: Show customer last name prominently
            <h3 className="text-2xl font-bold text-gray-900">
              {displayName}
            </h3>
          ) : null}
          <div className={cn(
            'font-medium text-gray-700',
            (displayType === 'dine-in' || displayName)
              ? 'text-sm'
              : 'text-2xl font-bold text-gray-900'
          )}>
            Order #{formatOrderNumber(order.order_number)}
          </div>
        </div>

        {/* Order Items - Always visible, 16px item text */}
        <div className="space-y-2 mb-3">
          {order.items.map((item, index) => (
            <div key={item.id || index}>
              <div className="text-base font-medium">
                {item.quantity}x {item.name}
              </div>
              {/* Modifiers - using shared component with accessibility */}
              <ModifierList
                modifiers={item.modifiers}
                size="sm"
                className="ml-4 mt-1"
              />
              {/* Special instructions */}
              {item.special_instructions && (
                <div className="text-sm text-gray-600 ml-4 italic mt-1">
                  Note: {item.special_instructions}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Single Action Button - Mark Ready */}
        <div className="flex gap-2">
          {(order.status !== 'ready' && order.status !== 'completed' && order.status !== 'cancelled') && (
            <Button
              onClick={() => onStatusChange(order.id, 'ready')}
              className="flex-1 h-11"
              variant="default"
            >
              Mark Ready
            </Button>
          )}

          {order.status === 'ready' && (
            <div className="w-full text-center text-green-600 font-medium py-2">
              ✓ Ready for Pickup
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Memoize to prevent unnecessary re-renders in large order lists
export const OrderCard = React.memo(OrderCardComponent, (prevProps, nextProps) => {
  // Only re-render if order data or status changes
  return prevProps.order.id === nextProps.order.id &&
         prevProps.order.status === nextProps.order.status &&
         prevProps.order.updated_at === nextProps.order.updated_at
})