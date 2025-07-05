import React from 'react'
import { ItemQuantityName } from './ItemQuantityName'
import { ModifierList } from './ModifierList'
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
        <ItemQuantityName quantity={quantity} name={name} />
        {stationType && (
          <StationBadge stationType={stationType} className="ml-2" />
        )}
      </div>
      {modifiers && modifiers.length > 0 && (
        <ModifierList modifiers={modifiers} />
      )}
      {note && (
        <AlertNote text={note} variant="subtle" />
      )}
    </div>
  )
}