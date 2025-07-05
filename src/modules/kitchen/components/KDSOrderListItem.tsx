import React, { memo } from 'react'
import { Card } from '@/components/ui/card'
import { AnimatedOrderHeader } from '@/components/shared/order/AnimatedOrderHeader'
import { OrderMetadata } from '@/components/shared/order/OrderMetadata'
import { OrderActions } from '@/components/shared/order/OrderActions'
import { StationBadge } from '@/components/shared/badges/StationBadge'
import { Badge } from '@/components/ui/badge'
import { stationRouting } from '@/services/stationRouting'
import { cn } from '@/lib/utils'
import type { StationType } from '@/types/station'
import type { OrderItem } from '@/types/order'

interface KDSOrderListItemProps {
  orderNumber: string
  tableNumber: string
  items: OrderItem[]
  status: 'new' | 'preparing' | 'ready'
  previousStatus?: 'new' | 'preparing' | 'ready'
  orderTime: Date
  onStatusChange?: (status: 'preparing' | 'ready') => void
  className?: string
}

export const KDSOrderListItem = memo<KDSOrderListItemProps>(({
  orderNumber,
  tableNumber,
  items,
  status,
  previousStatus,
  orderTime,
  onStatusChange,
  className,
}) => {
  // Group items by station
  const itemsByStation = React.useMemo(() => {
    const grouped = new Map<StationType | 'other', OrderItem[]>()
    
    items.forEach(item => {
      const stationType = stationRouting.getStationTypeForItem(item)
      const station = stationType || 'other'
      
      if (!grouped.has(station)) {
        grouped.set(station, [])
      }
      grouped.get(station)!.push(item)
    })
    
    return grouped
  }, [items])
  
  // Calculate total item count
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  
  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300',
      status === 'ready' && 'border-green-400 bg-green-50/20',
      className
    )}>
      <div className="flex items-center p-4 gap-4">
        {/* Order Info Section */}
        <div className="flex-1">
          <AnimatedOrderHeader
            orderNumber={orderNumber}
            status={status}
            previousStatus={previousStatus}
          />
          <OrderMetadata
            tableNumber={tableNumber}
            orderTime={orderTime}
            className="mt-2"
          />
        </div>
        
        {/* Items Summary Section */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-2">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(itemsByStation.entries()).map(([station, stationItems]) => (
              <div key={station} className="flex items-center gap-1">
                {station !== 'other' ? (
                  <StationBadge 
                    stationType={station} 
                    className="text-xs"
                  />
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Other
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  ({stationItems.reduce((sum, item) => sum + item.quantity, 0)})
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Items Detail Section - Expandable */}
        <div className="flex-2 hidden lg:block">
          <p className="text-sm font-medium mb-1">Items:</p>
          <div className="text-sm text-muted-foreground space-y-0.5">
            {items.slice(0, 3).map((item) => (
              <div key={item.id} className="truncate">
                {item.quantity}x {item.name}
              </div>
            ))}
            {items.length > 3 && (
              <div className="text-xs">+{items.length - 3} more...</div>
            )}
          </div>
        </div>
        
        {/* Actions Section */}
        <div className="flex-shrink-0">
          <OrderActions
            status={status}
            onStatusChange={onStatusChange}
            layout="horizontal"
          />
        </div>
      </div>
    </Card>
  )
})

KDSOrderListItem.displayName = 'KDSOrderListItem'