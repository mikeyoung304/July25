import React from 'react'
import { OrderNumber, TableLabel } from '../display/OrderIdentifiers'
import { StatusBadge, AnimatedStatusBadge } from '../badges'
import { ElapsedTimer } from '../timers/ElapsedTimer'
import { cn } from '@/utils'

// Basic Order Header
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
      <OrderNumber value={orderNumber} size="lg" />
      <StatusBadge status={status} />
    </div>
  )
}

// Animated Order Header
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
  className
}) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <OrderNumber value={order_number} size="lg" />
      <AnimatedStatusBadge 
        status={status} 
        previousStatus={previousStatus}
      />
    </div>
  )
}

// Order Metadata
export interface OrderMetadataProps {
  table_number: string
  created_at: Date
  className?: string
}

export const OrderMetadata: React.FC<OrderMetadataProps> = ({
  tableNumber,
  orderTime,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between text-sm text-gray-600', className)}>
      <TableLabel value={table_number} />
      <ElapsedTimer startTime={created_at} showIcon />
    </div>
  )
}