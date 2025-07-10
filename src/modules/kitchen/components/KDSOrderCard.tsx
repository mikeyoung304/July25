import React, { memo, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OrderHeader, OrderMetadata } from '@/components/shared/order/OrderHeaders'
import { OrderItemsList } from '@/components/shared/order/OrderItemsList'
import { OrderActions } from '@/components/shared/order/OrderActions'
import { cn } from '@/utils'
import type { OrderItem } from '@/types/common'

// Re-export OrderItem for backward compatibility
export type { OrderItem } from '@/types/common'

interface KDSOrderCardProps {
  orderId: string
  orderNumber: string
  tableNumber: string
  items: OrderItem[]
  status: 'new' | 'preparing' | 'ready'
  orderTime: Date
  orderType?: 'dine-in' | 'drive-thru' | 'takeout'
  onStatusChange?: (status: 'preparing' | 'ready') => void
  className?: string
}

export const KDSOrderCard = memo<KDSOrderCardProps>(({
  orderNumber,
  tableNumber,
  items,
  status,
  orderTime,
  orderType = 'dine-in',
  onStatusChange,
  className,
}) => {
  // Calculate urgency levels for progressive visual feedback
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'warning' | 'urgent' | 'critical'>('normal')
  
  useEffect(() => {
    if (status === 'ready') {
      setUrgencyLevel('normal')
      return
    }
    
    const calculateUrgency = () => {
      const elapsed = Math.floor((Date.now() - orderTime.getTime()) / 60000)
      let level: 'normal' | 'warning' | 'urgent' | 'critical' = 'normal'
      
      if (elapsed >= 20) level = 'critical'
      else if (elapsed >= 15) level = 'urgent'
      else if (elapsed >= 10) level = 'warning'
      
      setUrgencyLevel(level)
    }
    
    // Calculate initial urgency
    calculateUrgency()
    
    // Update urgency every 30 seconds instead of every render
    const interval = setInterval(calculateUrgency, 30000)
    
    return () => clearInterval(interval)
  }, [orderTime, status])

  // Dynamic styling based on urgency
  const urgencyStyles = {
    normal: '',
    warning: 'shadow-elevation-3 border-amber-400/50',
    urgent: 'shadow-glow-urgent border-red-400 animate-pulse',
    critical: 'shadow-glow-urgent border-red-500 ring-2 ring-red-500/20 animate-pulse'
  }

  return (
    <Card className={cn(
      'relative transition-all duration-500 ease-spring',
      'hover:shadow-elevation-4 hover:-translate-y-1 hover:scale-[1.02]',
      'group cursor-pointer',
      urgencyStyles[urgencyLevel],
      status === 'ready' && 'shadow-glow-success border-green-400',
      // Color coding for order types
      orderType === 'drive-thru' && 'border-l-4 border-l-macon-orange',
      orderType === 'dine-in' && 'border-l-4 border-l-macon-teal',
      className
    )}>
      {/* Urgency indicator gradient overlay */}
      {urgencyLevel !== 'normal' && status !== 'ready' && (
        <div className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          urgencyLevel === 'warning' && 'from-amber-400 to-amber-500',
          urgencyLevel === 'urgent' && 'from-red-400 to-red-500',
          urgencyLevel === 'critical' && 'from-red-500 to-red-600 animate-pulse'
        )} />
      )}
      
      <CardHeader className={cn(
        'pb-3 transition-all duration-300',
        'bg-gradient-to-br from-white/50 to-transparent',
        urgencyLevel === 'critical' && 'bg-gradient-to-br from-red-50/30 to-transparent'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <OrderHeader orderNumber={orderNumber} status={status} />
            <OrderMetadata tableNumber={tableNumber} orderTime={orderTime} />
          </div>
          {/* Order Type Badge */}
          <div className={cn(
            'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide',
            orderType === 'drive-thru' && 'bg-macon-orange/20 text-macon-orange-dark',
            orderType === 'dine-in' && 'bg-macon-teal/20 text-macon-teal-dark'
          )}>
            {orderType === 'drive-thru' ? 'Drive-Thru' : 'Dine In'}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 px-6">
        <OrderItemsList items={items} />
      </CardContent>
      
      <div className={cn(
        'p-6 pt-4 border-t transition-all duration-300',
        'border-neutral-100/50',
        'bg-gradient-to-t from-neutral-50/50 to-transparent'
      )}>
        <OrderActions 
          status={status} 
          onStatusChange={onStatusChange || (() => {})} 
          orderNumber={orderNumber}
        />
      </div>
      
      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-macon-orange/0 to-macon-teal/0 opacity-0 group-hover:opacity-5 transition-opacity duration-500 pointer-events-none" />
    </Card>
  )
})

KDSOrderCard.displayName = 'KDSOrderCard'

/**
 * Performance considerations:
 * - Component is wrapped with React.memo to prevent unnecessary re-renders
 * - Urgency calculation is memoized
 * - All child components handle their own memoization where needed
 * - Parent components should wrap onStatusChange in useCallback to prevent re-renders
 */