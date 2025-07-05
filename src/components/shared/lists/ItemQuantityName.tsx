import React from 'react'
import { cn } from '@/lib/utils'

export interface ItemQuantityNameProps {
  quantity: number
  name: string
  emphasizeQuantity?: boolean
  className?: string
}

export const ItemQuantityName: React.FC<ItemQuantityNameProps> = ({
  quantity,
  name,
  emphasizeQuantity = false,
  className,
}) => {
  return (
    <span className={cn('font-medium', className)}>
      <span className={emphasizeQuantity ? 'font-bold' : undefined}>
        {quantity}x
      </span>{' '}
      {name}
    </span>
  )
}