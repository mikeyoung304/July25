import React from 'react'
import { OrderItemRow } from '../lists/OrderItemRow'
import { stationRouting } from '@/services/stationRouting'
import { cn } from '@/utils'
import { OrderItem } from '@/types/common'

export interface OrderItemsListProps {
  items: OrderItem[]
  variant?: 'default' | 'compact'
  className?: string
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({
  items,
  variant = 'default',
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const stationType = stationRouting.getStationTypeForItem(item as any)
        
        return (
          <OrderItemRow
            key={item.id}
            quantity={item.quantity}
            name={item.name}
            modifiers={item.modifiers?.map(m => m.name)}
            note={item.notes}
            stationType={stationType || undefined}
          />
        )
      })}
    </div>
  )
}