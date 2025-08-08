import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Utensils } from 'lucide-react'
import { KDSLayout } from '@/modules/kitchen/components/KDSLayout'
import { AnimatedKDSOrderCard } from '@/modules/kitchen/components/AnimatedKDSOrderCard'
import { KDSOrderListItem } from '@/modules/kitchen/components/KDSOrderListItem'
import type { Order } from '@/services/api'
import type { LayoutMode } from '@/modules/kitchen/components/KDSLayout'

interface OrdersGridProps {
  orders: Order[]
  layoutMode: LayoutMode
  onLayoutModeChange: (mode: LayoutMode) => void
  onStatusChange: (orderId: string, status: 'preparing' | 'ready') => void
  hasActiveFilters: boolean
}

export function OrdersGrid({ 
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
              orderId={order.id}
              orderNumber={order.orderNumber}
              tableNumber={order.tableNumber}
              items={order.items}
              status={order.status as 'new' | 'preparing' | 'ready'}
              orderTime={new Date(order.orderTime)}
              orderType={order.orderType}
              onStatusChange={(status) => onStatusChange(order.id, status)}
            />
          ) : (
            <KDSOrderListItem
              key={order.id}
              orderNumber={order.orderNumber}
              tableNumber={order.tableNumber}
              items={order.items}
              status={order.status as 'new' | 'preparing' | 'ready'}
              orderTime={new Date(order.orderTime)}
              onStatusChange={(status) => onStatusChange(order.id, status)}
            />
          )
        ))}
      </KDSLayout>
    </section>
  )
}