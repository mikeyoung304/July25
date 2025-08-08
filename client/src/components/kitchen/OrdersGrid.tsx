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
              orderNumber={order.order_number}
              tableNumber={order.table_number || 'N/A'}
              items={order.items}
              status={(order.status === 'new' || order.status === 'preparing' || order.status === 'ready') 
                ? order.status as 'new' | 'preparing' | 'ready' 
                : 'new'}
              orderTime={new Date(order.created_at)}
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