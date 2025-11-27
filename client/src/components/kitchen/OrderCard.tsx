import React, { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'
import {
  getOrderUrgency,
  getUrgencyColorClass,
  getKDSDisplayType,
  getUrgencyAccentClass,
  KDS_TYPE_COLORS
} from '@rebuild/shared/config/kds'

export interface OrderCardProps {
  order: Order
  onStatusChange: (orderId: string, status: 'ready') => void
}

/**
 * Minimal KDS Order Card
 * Clean aesthetic with type color coding and urgency accent
 */
function OrderCardComponent({ order, onStatusChange }: OrderCardProps) {
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

  return (
    <Card className={cn(
      'relative overflow-hidden',
      typeColors.bg,
      typeColors.border,
      urgencyAccent
    )}>
      <CardContent className="p-4">
        {/* Header: Type Badge + Timer */}
        <div className="flex justify-between items-start mb-3">
          <Badge
            variant="outline"
            className={cn('text-xs font-semibold', typeColors.badge)}
          >
            {typeLabel}
          </Badge>

          {/* Timer */}
          <div className={cn('flex items-center gap-1 font-bold', urgencyColor)}>
            <Clock className="w-4 h-4" />
            <span>{elapsedMinutes}m</span>
          </div>
        </div>

        {/* Primary identifier based on order type */}
        <div className="mb-3">
          {displayType === 'dine-in' && order.table_number ? (
            // Dine-in: Show Table/Seat prominently
            <h3 className="text-lg font-bold text-gray-900">
              Table {order.table_number}{order.seat_number ? `, Seat ${order.seat_number}` : ''}
            </h3>
          ) : order.customer_name ? (
            // Drive-thru/To-go: Show customer last name prominently
            <h3 className="text-lg font-bold text-gray-900">
              {order.customer_name.split(' ').pop()}
            </h3>
          ) : null}
          <div className={cn(
            'font-medium text-gray-700',
            (displayType === 'dine-in' || order.customer_name) ? 'text-sm' : 'text-lg font-bold text-gray-900'
          )}>
            Order #{order.order_number}
          </div>
        </div>

        {/* Order Items - Always visible */}
        <div className="space-y-1 mb-3">
          {order.items.map((item, index) => (
            <div key={item.id || index} className="text-sm">
              <div className="font-medium">
                {item.quantity}x {item.name}
              </div>
              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-xs text-gray-600 ml-4">
                  {item.modifiers.map((mod, i) => (
                    <div key={i}>• {mod.name}</div>
                  ))}
                </div>
              )}
              {/* Special instructions */}
              {item.special_instructions && (
                <div className="text-xs text-gray-600 ml-4 italic">
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