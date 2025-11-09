import React from 'react'
import { AlertCircle } from 'lucide-react'
import { StationBadge } from '../badges'
import { StationType } from 'shared/types'
import { cn, escapeHtml } from '@/utils'

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
          {quantity}x {escapeHtml(name)}
        </span>
        {stationType && (
          <StationBadge stationType={stationType} className="ml-2" />
        )}
      </div>
      {modifiers && modifiers.length > 0 && (
        <div className="text-sm text-muted-foreground pl-4">
          {modifiers.map(m => escapeHtml(m)).join(', ')}
        </div>
      )}
      {note && (
        <div className="text-sm pl-4 flex items-start gap-1 text-muted-foreground">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{escapeHtml(note)}</span>
        </div>
      )}
    </div>
  )
}