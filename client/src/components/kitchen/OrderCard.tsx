import React, { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Package, User } from 'lucide-react'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'

export interface OrderCardProps {
  order: Order
  onStatusChange: (orderId: string, status: 'preparing' | 'ready') => void
}

/**
 * Simple KDS Order Card - Industry Standard Implementation
 * Based on Toast/Square KDS: Single component, no unnecessary abstraction
 */
export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  // Calculate elapsed time and urgency color (industry standard: green → yellow → red)
  const { elapsedMinutes, urgencyColor, cardColor } = useMemo(() => {
    const created = new Date(order.created_at)
    const now = new Date()
    const elapsed = Math.floor((now.getTime() - created.getTime()) / 60000)
    
    // Industry standard timing: green (0-10min) → yellow (10-15min) → red (15+min)
    let color = 'text-green-600'
    let bg = 'bg-white border-gray-200'
    
    if (elapsed >= 15) {
      color = 'text-red-600'
      bg = 'bg-red-50 border-red-300'
    } else if (elapsed >= 10) {
      color = 'text-yellow-600' 
      bg = 'bg-yellow-50 border-yellow-300'
    }
    
    return { elapsedMinutes: elapsed, urgencyColor: color, cardColor: bg }
  }, [order.created_at])

  // Get order type display (backend sends 'online' | 'pickup' | 'delivery')
  const orderTypeDisplay = useMemo(() => {
    switch (order.type) {
      case 'online': return 'Dine-In'
      case 'pickup': return 'Takeout'
      case 'delivery': return 'Delivery'
      default: return order.type
    }
  }, [order.type])

  // Status badge color
  const statusColor = useMemo(() => {
    switch (order.status) {
      case 'new':
      case 'pending':
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800'
      case 'ready':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }, [order.status])

  return (
    <Card className={cn(
      'relative transition-all duration-200 hover:shadow-lg',
      cardColor
    )}>
      <CardContent className="p-4">
        {/* Header: Order Number, Status, Timer */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold">
              Order #{order.order_number}
            </h3>
            <span className={cn('inline-block px-2 py-1 rounded text-xs font-medium mt-1', statusColor)}>
              {order.status.toUpperCase()}
            </span>
          </div>
          
          <div className="text-right">
            {/* Timer - Core KDS feature */}
            <div className={cn('flex items-center gap-1', urgencyColor)}>
              <Clock className="w-4 h-4" />
              <span className="font-bold">{elapsedMinutes}m</span>
            </div>
            
            {/* Order Type Badge */}
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
              <Package className="w-3 h-3" />
              <span>{orderTypeDisplay}</span>
            </div>
          </div>
        </div>

        {/* Customer Info (if available) */}
        {order.customer_name && (
          <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
            <User className="w-3 h-3" />
            <span>{order.customer_name}</span>
            {order.table_number && <span>• Table {order.table_number}</span>}
          </div>
        )}

        {/* Order Items - Simple list, no over-componentization */}
        <div className="space-y-2 mb-3">
          {order.items.map((item, index) => (
            <div key={item.id || index} className="text-sm">
              <div className="flex justify-between">
                <span className="font-medium">
                  {item.quantity}x {item.name}
                </span>
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

        {/* Action Buttons - Industry standard: Start/Ready */}
        <div className="flex gap-2">
          {(order.status === 'new' || order.status === 'pending' || order.status === 'confirmed') && (
            <Button
              onClick={() => onStatusChange(order.id, 'preparing')}
              className="flex-1"
              variant="default"
              size="sm"
            >
              Start Preparing
            </Button>
          )}
          
          {order.status === 'preparing' && (
            <Button
              onClick={() => onStatusChange(order.id, 'ready')}
              className="flex-1"
              variant="default"
              size="sm"
            >
              Mark Ready
            </Button>
          )}
          
          {order.status === 'ready' && (
            <div className="w-full text-center text-green-600 font-medium">
              ✓ Ready for Pickup
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}