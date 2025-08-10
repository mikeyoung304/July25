import React, { useState } from 'react'
import { useRestaurant } from '@/core/restaurant-hooks'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { useKitchenOrders } from '@/hooks/kitchen/useKitchenOrders'
import { useOrderFiltering } from '@/hooks/kitchen/useOrderFiltering'
import { webSocketService } from '@/services/websocket'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { PageLayout, PageContent } from '@/components/ui/PageLayout'
import { KitchenHeader } from '@/components/kitchen/KitchenHeader'
import { OrdersGrid } from '@/components/kitchen/OrdersGrid'
import { FilterPanel } from '@/components/shared/filters/FilterPanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Utensils } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import type { LayoutMode } from '@/modules/kitchen/components/KDSLayout'
import type { Station } from '@/types/station'

export function KitchenDisplay() {
  const { toast } = useToast()
  const { restaurant, isLoading: restaurantLoading } = useRestaurant()
  const { orders, isLoading, loadOrders, handleStatusChange } = useKitchenOrders()
  const filtering = useOrderFiltering(orders)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
  const { soundEnabled, volume, toggleSound, setVolume } = useSoundNotifications()

  if (restaurantLoading || isLoading) {
    return (
      <PageLayout centered>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading kitchen display...</p>
        </div>
      </PageLayout>
    )
  }

  const activeOrdersCount = filtering.filteredAndSortedOrders.filter(
    o => o.status !== 'ready' && o.status !== 'completed'
  ).length

  return (
    <RoleGuard suggestedRoles={['kitchen', 'admin']} pageTitle="Kitchen Display System">
      <PageLayout>
        <KitchenHeader
          restaurant={restaurant}
          activeOrdersCount={activeOrdersCount}
          isConnected={webSocketService.isConnected()}
          filters={filtering.filters}
          onSortChange={filtering.updateSort}
          onDirectionToggle={filtering.toggleSortDirection}
          soundEnabled={soundEnabled}
          volume={volume}
          onToggleSound={toggleSound}
          onVolumeChange={setVolume}
          onRefresh={loadOrders}
        />
        
        <PageContent maxWidth="6xl" className="mt-6">
          <div className="mb-6">
            <section role="search" aria-label="Order filters">
              <FilterPanel
                filters={filtering.adaptedFilters}
                onStatusChange={(statuses) => {
                  if (statuses.length === 0 || statuses.length === 3) {
                    filtering.updateStatusFilter('all')
                  } else {
                    filtering.updateStatusFilter(statuses[0])
                  }
                }}
                onStationChange={(stations) => {
                  const stationObjects = stations.map(s => {
                    if (s === 'all') return s
                    return { type: s, id: s, name: s, isActive: true, currentOrders: [] }
                  })
                  filtering.updateStationFilter(stationObjects as Station[])
                }}
                onTimeRangeChange={() => {}}
                onSearchChange={filtering.updateSearchQuery}
                onReset={filtering.resetFilters}
                hasActiveFilters={filtering.hasActiveFilters}
              />
            </section>
          </div>

          <OrdersGrid
            orders={filtering.filteredAndSortedOrders}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            onStatusChange={handleStatusChange}
            hasActiveFilters={filtering.hasActiveFilters}
          />

          <div className="mt-12">
            <Card className="border-0 shadow-large bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-macon-orange" />
                  Demo Mode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
                  This is a demo environment. Create test orders to see the real-time kitchen display system in action.
                </p>
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={async () => {
                    const mockOrder = {
                      items: [
                        {
                          name: ['Burger', 'Pizza', 'Salad', 'Pasta'][Math.floor(Math.random() * 4)],
                          quantity: Math.floor(Math.random() * 3) + 1,
                          price: Math.random() * 20 + 5,
                          modifiers: Math.random() > 0.5 ? [['Extra cheese'], ['No onions']][Math.floor(Math.random() * 2)] : undefined
                        }
                      ],
                      total: Math.random() * 50 + 10,
                    }
                    
                    try {
                      const result = await api.submitOrder(mockOrder)
                      if (result.order) {
                        toast.success('Test order created!')
                        loadOrders()
                      }
                    } catch {
                      toast.error('Failed to create test order')
                    }
                  }}
                >
                  <Utensils className="h-4 w-4" />
                  Create Test Order
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageContent>
      </PageLayout>
    </RoleGuard>
  )
}