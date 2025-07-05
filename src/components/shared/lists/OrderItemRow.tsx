import React from 'react'
import { AlertNote } from '../alerts/AlertNote'
import { StationBadge } from '../badges/StationBadge'
import { StationType } from '@/types/station'
import { cn } from '@/lib/utils'

export interface OrderItemRowProps {
  quantity: number
  name: string
  modifiers?: string[]
  note?: string
  stationType?: StationType
  className?: string
}

export const OrderItemRow: React.FC<OrderItemRowProps> = ({
  quantity,
  name,
  modifiers,
  note,
  stationType,
  className,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-start justify-between">
        <span className="font-medium">
          {quantity}x {name}
        </span>
        {stationType && (
          <StationBadge stationType={stationType} className="ml-2" />
        )}
      </div>
      {modifiers && modifiers.length > 0 && (
        <div className="text-sm text-muted-foreground pl-4">
          {modifiers.join(', ')}
        </div>
      )}
      {note && (
        <AlertNote text={note} variant="subtle" />
      )}
    </div>
  )
}