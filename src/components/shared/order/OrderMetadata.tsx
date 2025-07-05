import React from 'react'
import { TableLabel } from '../display/OrderIdentifiers'
import { ElapsedTimer } from '../timers/ElapsedTimer'
import { cn } from '@/lib/utils'

export interface OrderMetadataProps {
  tableNumber: string
  orderTime: Date
  className?: string
}

export const OrderMetadata: React.FC<OrderMetadataProps> = ({
  tableNumber,
  orderTime,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <TableLabel value={tableNumber} />
      <ElapsedTimer startTime={orderTime} />
    </div>
  )
}