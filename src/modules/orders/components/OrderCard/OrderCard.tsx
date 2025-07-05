import React, { memo, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OrderHeader } from '@/components/shared/order/OrderHeader'
import { OrderMetadata } from '@/components/shared/order/OrderMetadata'
import { OrderItemsList } from '@/components/shared/order/OrderItemsList'
import { OrderActions } from '@/components/shared/order/OrderActions'
import { cn } from '@/lib/utils'
import type { OrderItem, OrderStatus } from '@/modules/orders/types'

interface OrderCardProps {
  orderId: string
  orderNumber: string
  tableNumber: string
  items: OrderItem[]
  status: Extract<OrderStatus, 'new' | 'preparing' | 'ready'>
  orderTime: Date
  onStatusChange?: (status: 'preparing' | 'ready') => void
  className?: string
}

export const OrderCard = memo<OrderCardProps>(({
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
        <OrderActions 
          status={status} 
          onStatusChange={onStatusChange}
          layout="horizontal"
          orderNumber={orderNumber}
        />
      </CardContent>
    </Card>
  )
})

OrderCard.displayName = 'OrderCard'