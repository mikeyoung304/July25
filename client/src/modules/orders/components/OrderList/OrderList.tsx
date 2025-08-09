import React, { memo } from 'react'
import { Order } from '@/modules/orders/types'
import { OrderCard } from '@/components/orders'
import { cn } from '@/utils'

interface OrderListProps {
  orders: Order[]
  onStatusChange?: (orderId: string, status: 'preparing' | 'ready') => void
  className?: string
  emptyMessage?: string
  layout?: 'grid' | 'list'
}

export const OrderList = memo<OrderListProps>(({
  orders,
  onStatusChange,
  className,
  emptyMessage = 'No orders to display',
  layout = 'grid'
}) => {
  if (orders.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn(
      layout === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
        : 'space-y-4',
      className
    )}>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onStatusChange={(orderId, status) => onStatusChange?.(orderId, status as 'preparing' | 'ready')}
        />
      ))}
    </div>
  )
})

OrderList.displayName = 'OrderList'