import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Utensils } from 'lucide-react'
import { KDSLayout } from '@/modules/kitchen/components/KDSLayout'
import { AnimatedKDSOrderCard } from '@/modules/kitchen/components/AnimatedKDSOrderCard'
import { KDSOrderListItem } from '@/modules/kitchen/components/KDSOrderListItem'
import type { Order } from '@rebuild/shared'
import type { LayoutMode } from '@/modules/kitchen/components/KDSLayout'

interface OrdersGridProps {
  orders: Order[]
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  onStatusChange: (orderId: string, status: 'preparing' | 'ready') => void
  hasActiveFilters: boolean
}

const OrdersGrid = memo(function OrdersGrid({ 
  orders, 
  layoutMode, 
  onLayoutModeChange, 
  onStatusChange,
  hasActiveFilters 
}: OrdersGridProps) {
  if (orders.length === 0) {
    return (
      <Card className="border-0 shadow-large">
        <CardContent className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-macon-navy/10 flex items-center justify-center">
              <Utensils className="h-10 w-10 text-macon-navy/40" />
            </div>
            <p className="text-neutral-600 text-lg leading-relaxed">
              {hasActiveFilters
                ? 'No orders match your filters. Try adjusting your search criteria.'
                : 'No orders yet. Orders will appear here in real-time.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <section id="orders" role="region" aria-label="Active orders" aria-live="polite">
      <KDSLayout mode={layoutMode} onModeChange={onLayoutModeChange}>
        {orders.map(order => (
          layoutMode === 'grid' ? (
            <AnimatedKDSOrderCard
              key={order.id}
              order={order}
              onStatusChange={(status) => {
                if (status === 'preparing' || status === 'ready') {
                  onStatusChange(order.id, status)
                }
              }}
            />
          ) : (
            <KDSOrderListItem
              key={order.id}
              orderNumber={(order as any).order_number || (order as any).orderNumber}
              tableNumber={(order as any).table_number || (order as any).tableNumber || 'N/A'}
              items={order.items}
              status={(() => {
                // Safely cast status with comprehensive validation
                const validStatuses = ['new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'] as const
                const currentStatus = order.status
                
                if (validStatuses.includes(currentStatus as any)) {
                  // For KDSOrderListItem, we need to ensure it's one of the accepted types
                  if (currentStatus === 'new' || currentStatus === 'preparing' || currentStatus === 'ready') {
                    return currentStatus as 'new' | 'preparing' | 'ready'
                  }
                  // Map other statuses to appropriate display status
                  if (currentStatus === 'pending' || currentStatus === 'confirmed') {
                    return 'new' as 'new' | 'preparing' | 'ready' // Treat as new for display
                  }
                  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
                    return 'ready' as 'new' | 'preparing' | 'ready' // Treat as ready for display
                  }
                }
                
                console.warn(`[OrdersGrid] Unknown order status: ${currentStatus}, defaulting to 'new'`)
                return 'new' as 'new' | 'preparing' | 'ready'
              })()}
              orderTime={new Date((order as any).created_at || (order as any).createdAt)}
              onStatusChange={(status) => {
                if (status === 'preparing' || status === 'ready') {
                  onStatusChange(order.id, status)
                }
              }}
            />
          )
        ))}
      </KDSLayout>
    </section>
  )
}

export { OrdersGrid };