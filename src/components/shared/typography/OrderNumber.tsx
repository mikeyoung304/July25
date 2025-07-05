import React from 'react'
import { cn } from '@/lib/utils'

export interface OrderNumberProps {
  orderNumber: string
  prefix?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg font-semibold',
} as const

export const OrderNumber: React.FC<OrderNumberProps> = ({
  orderNumber,
  prefix = 'Order #',
  size = 'md',
  className,
}) => {
  return (
    <span className={cn(SIZE_CLASSES[size], className)}>
      {prefix}{orderNumber}
    </span>
  )
}