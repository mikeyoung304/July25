import React from 'react'
import { OrderNumber } from '../display/OrderIdentifiers'
import { AnimatedStatusBadge } from '../badges/AnimatedStatusBadge'
import { cn } from '@/lib/utils'

export interface AnimatedOrderHeaderProps {
  orderNumber: string
  status: 'new' | 'preparing' | 'ready'
  previousStatus?: 'new' | 'preparing' | 'ready'
  className?: string
}

export const AnimatedOrderHeader: React.FC<AnimatedOrderHeaderProps> = ({
  orderNumber,
  status,
  previousStatus,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <OrderNumber value={orderNumber} size="lg" />
      <AnimatedStatusBadge status={status} previousStatus={previousStatus} />
    </div>
  )
}