import React from 'react'
import { OrderItemRow } from '../lists/OrderItemRow'
import { stationRouting } from '@/services/stationRouting'
import { cn } from '@/utils'
import { OrderItem } from '@/types/common'

export interface OrderItemsListProps {
  items: OrderItem[]
  className?: string
}

export const OrderItemsList: React.FC<OrderItemsListProps> = ({
  items,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const stationType = stationRouting.getStationTypeForItem(item)
        
        return (
          <OrderItemRow
            key={item.id}
            quantity={item.quantity}
            name={item.name}
            modifiers={item.modifiers}
            note={item.notes}
            stationType={stationType || undefined}
          />
        )
      })}
    </div>
  )
}