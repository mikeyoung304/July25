import React, { useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Package, User, ArrowRight } from 'lucide-react'
import { cn } from '@/utils'
import type { Order } from '@rebuild/shared'

export interface TouchOptimizedOrderCardProps {
  order: Order
  onStatusChange: (orderId: string, status: 'ready') => void
  className?: string
}

export const TouchOptimizedOrderCard = React.memo<TouchOptimizedOrderCardProps>(
  ({ order, onStatusChange, className }) => {
    const { elapsedMinutes, urgencyColor, cardColor, pulseAnimation } = useMemo(() => {
      const created = new Date(order.created_at)
      const now = new Date()
      const elapsed = Math.floor((now.getTime() - created.getTime()) / 60000)
      
      let color = 'text-green-600'
      let bg = 'bg-white border-gray-200 shadow-sm'
      let shouldPulse = false
      
      if (elapsed >= 20) {
        color = 'text-red-600'
        bg = 'bg-red-50 border-red-400 shadow-red-200 shadow-lg'
        shouldPulse = true
      } else if (elapsed >= 15) {
        color = 'text-red-500'
        bg = 'bg-red-50 border-red-300 shadow-red-100 shadow-md'
        shouldPulse = true
      } else if (elapsed >= 10) {
        color = 'text-yellow-600'
        bg = 'bg-yellow-50 border-yellow-300 shadow-yellow-100 shadow-md'
      }
      
      return { 
        elapsedMinutes: elapsed, 
        urgencyColor: color, 
        cardColor: bg,
        pulseAnimation: shouldPulse
      }
    }, [order.created_at])

    const orderTypeDisplay = useMemo(() => {
      const typeMap = {
        'online': 'Dine-In',
        'pickup': 'Takeout',
        'delivery': 'Delivery'
      } as const
      return typeMap[order.type as keyof typeof typeMap] || order.type
    }, [order.type])

    const statusColor = useMemo(() => {
      const colorMap = {
        'new': 'bg-blue-100 text-blue-800 border-blue-200',
        'pending': 'bg-blue-100 text-blue-800 border-blue-200',
        'confirmed': 'bg-purple-100 text-purple-800 border-purple-200',
        'preparing': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'ready': 'bg-green-100 text-green-800 border-green-200',
        'completed': 'bg-gray-100 text-gray-800 border-gray-200',
        'cancelled': 'bg-red-100 text-red-800 border-red-200'
      } as const
      return colorMap[order.status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200'
    }, [order.status])

    const handleComplete = useCallback(() => {
      onStatusChange(order.id, 'ready')
    }, [order.id, onStatusChange])

    const canComplete = !['ready', 'completed', 'cancelled'].includes(order.status)

    return (
      <Card className={cn(
        'relative transition-all duration-200',
        'touch-manipulation select-none',
        'hover:scale-[1.02] active:scale-[0.98]',
        'min-h-[280px] max-w-[320px]',
        cardColor,
        pulseAnimation && 'animate-pulse',
        className
      )}>
        <CardContent className="p-4 h-full flex flex-col">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold truncate">
                Order #{order.order_number}
              </h3>
              <div className={cn(
                'inline-flex items-center px-2 py-1 rounded-md text-xs font-medium mt-1 border',
                statusColor
              )}>
                {order.status.toUpperCase()}
              </div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className={cn('flex items-center gap-1 font-bold text-sm', urgencyColor)}>
                <Clock className="w-4 h-4" />
                <span>{elapsedMinutes}m</span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                <Package className="w-3 h-3" />
                <span>{orderTypeDisplay}</span>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {order.customer_name && (
            <div className="flex items-center gap-1 text-sm text-gray-700 mb-3 px-2 py-1 bg-gray-50 rounded">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-medium">{order.customer_name}</span>
              {order.table_number && (
                <span className="flex-shrink-0 text-gray-500">• Table {order.table_number}</span>
              )}
            </div>
          )}

          {/* Order Items - Scrollable if many items */}
          <div className="flex-1 space-y-2 mb-4 min-h-0">
            <div className="max-h-32 overflow-y-auto space-y-2">
              {order.items.map((item, index) => (
                <div key={item.id || index} className="text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-gray-900 leading-tight">
                      <span className="inline-block w-6 text-center bg-gray-100 rounded text-xs font-bold mr-1">
                        {item.quantity}
                      </span>
                      {item.name}
                    </span>
                  </div>
                  
                  {/* Modifiers */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-xs text-gray-600 ml-7 space-y-1">
                      {item.modifiers.map((mod, i) => (
                        <div key={i} className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          {mod.name}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Special instructions */}
                  {item.special_instructions && (
                    <div className="text-xs text-amber-700 ml-7 italic bg-amber-50 px-2 py-1 rounded mt-1">
                      💬 {item.special_instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Area - Touch optimized */}
          <div className="mt-auto">
            {canComplete ? (
              <Button
                onClick={handleComplete}
                className={cn(
                  'w-full h-12 text-base font-semibold',
                  'touch-manipulation',
                  'transition-all duration-150',
                  'hover:scale-105 active:scale-95',
                  'bg-green-600 hover:bg-green-700',
                  'shadow-lg hover:shadow-xl'
                )}
                variant="default"
              >
                <span className="flex items-center justify-center gap-2">
                  Complete Order
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Button>
            ) : order.status === 'ready' ? (
              <div className="w-full h-12 flex items-center justify-center bg-green-100 text-green-800 font-semibold rounded-md border-2 border-green-200">
                <span className="flex items-center gap-2">
                  ✓ Ready for Pickup
                </span>
              </div>
            ) : (
              <div className="w-full h-12 flex items-center justify-center bg-gray-100 text-gray-600 font-medium rounded-md">
                Order {order.status}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.order.id === nextProps.order.id &&
      prevProps.order.status === nextProps.order.status &&
      prevProps.order.items.length === nextProps.order.items.length &&
      prevProps.order.created_at === nextProps.order.created_at
    )
  }
)