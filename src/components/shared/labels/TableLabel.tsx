import React from 'react'
import { cn } from '@/lib/utils'

export interface TableLabelProps {
  tableNumber: string
  prefix?: string
  className?: string
}

export const TableLabel: React.FC<TableLabelProps> = ({
  tableNumber,
  prefix = 'Table',
  className,
}) => {
  return (
    <span className={cn('text-sm text-muted-foreground', className)}>
      {prefix} {tableNumber}
    </span>
  )
}