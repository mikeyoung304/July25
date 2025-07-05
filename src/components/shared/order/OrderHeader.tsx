import React from 'react'
import { OrderNumber } from '../typography/OrderNumber'
import { StatusBadge } from '../badges/StatusBadge'
import { cn } from '@/lib/utils'

export interface OrderHeaderProps {
  orderNumber: string
  status: 'new' | 'preparing' | 'ready'
  className?: string
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  orderNumber,
  status,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <OrderNumber orderNumber={orderNumber} size="lg" />
      <StatusBadge status={status} />
    </div>
  )
}