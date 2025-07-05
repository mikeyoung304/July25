import React, { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OrderHeader } from '@/components/shared/order/OrderHeader'
import { OrderMetadata } from '@/components/shared/order/OrderMetadata'
import { OrderItemsList } from '@/components/shared/order/OrderItemsList'
import { OrderActions } from '@/components/shared/order/OrderActions'
import { cn } from '@/lib/utils'
import type { OrderItem, OrderStatus } from '@/types/order'

// Re-export OrderItem for backward compatibility
export type { OrderItem } from '@/types/order'

interface KDSOrderCardProps {
  orderId: string
  orderNumber: string
  tableNumber: string
  items: OrderItem[]
  status: Extract<OrderStatus, 'new' | 'preparing' | 'ready'>
  orderTime: Date
  onStatusChange?: (status: 'preparing' | 'ready') => void
  className?: string
}

export const KDSOrderCard = memo<KDSOrderCardProps>(({
  orderNumber,
  tableNumber,
  items,
  status,
  orderTime,
  onStatusChange,
  className,
}) => {
  // Calculate urgency for card styling
  const isUrgent = useMemo(() => {
    const elapsedMinutes = Math.floor((Date.now() - orderTime.getTime()) / 60000)
    return elapsedMinutes > 15 && status !== 'ready'
  }, [orderTime, status])

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-200',
      isUrgent && 'ring-2 ring-red-500',
      className
    )}>
      <CardHeader className="pb-3">
        <OrderHeader orderNumber={orderNumber} status={status} />
        <OrderMetadata tableNumber={tableNumber} orderTime={orderTime} />
      </CardHeader>
      
      <CardContent className="space-y-2">
        <OrderItemsList items={items} />
      </CardContent>
      
      <div className="p-4 pt-0">
        <OrderActions 
          status={status} 
          onStatusChange={onStatusChange || (() => {})} 
          orderNumber={orderNumber}
        />
      </div>
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