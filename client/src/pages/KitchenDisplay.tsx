import React, { useState } from 'react'
import { logger } from '@/services/logger'
import { useRestaurant } from '@/core'
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
import { KDSDebugPanel } from '@/components/kitchen/KDSDebugPanel'
import type { LayoutMode } from '@/modules/kitchen/components/KDSLayout'
import type { Station } from '@/types/station'

export function KitchenDisplay() {
  const { toast } = useToast()
  
  // Enhanced error handling for context
  const { restaurant, isLoading: restaurantLoading, error: restaurantError } = useRestaurant()
  
  // Handle restaurant context errors gracefully instead of throwing
  if (restaurantError) {
    console.error('[KitchenDisplay] Restaurant context error:', restaurantError)
    return (
      <PageLayout centered>
        <div className="text-center">
          <p className="text-destructive">Failed to load restaurant context</p>
          <p className="text-sm text-muted-foreground mt-2">{restaurantError.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Reload Page
          </Button>
        </div>
      </PageLayout>
    )
  }
  
  const { orders, isLoading, loadOrders, handleStatusChange } = useKitchenOrders()
  const filtering = useOrderFiltering(orders)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid')
  const [showDebug, setShowDebug] = useState(false)
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
      <PageLayout data-testid="kitchen-root">
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
                    logger.info('[KitchenDisplay] Create Test Order button clicked')
                    
                    // Use actual menu items from your restaurant
                    const realMenuItems = [
                      { name: 'Soul Bowl', price: 14, category: 'Bowls' },
                      { name: 'Greek Bowl', price: 14, category: 'Bowls' },
                      { name: 'Greek Salad', price: 12, category: 'Salads' },
                      { name: 'Summer Salad', price: 12, category: 'Salads' },
                      { name: 'BLT Sandwich', price: 12, category: 'Sandwiches' },
                      { name: 'Chicken Salad Sandwich', price: 12, category: 'Sandwiches' },
                      { name: 'Teriyaki Salmon', price: 16, category: 'Entrees' },
                      { name: 'Peach Chicken', price: 16, category: 'Entrees' }
                    ];
                    
                    const randomItem = realMenuItems[Math.floor(Math.random() * realMenuItems.length)];
                    const quantity = Math.floor(Math.random() * 2) + 1;
                    
                    const mockOrder = {
                      customer_name: `Test Customer ${Math.floor(Math.random() * 100)}`,
                      type: 'online', // Use valid database type
                      items: [
                        {
                          id: `item-${Date.now()}`,
                          menu_item_id: `item-${Date.now()}`, // Add menu_item_id for validation
                          name: randomItem.name,
                          quantity: quantity,
                          price: randomItem.price,
                          modifiers: Math.random() > 0.5 ? 
                            randomItem.category === 'Salads' ? [{ id: 'mod-1', name: 'Add Chicken', price: 4 }] :
                            randomItem.category === 'Sandwiches' ? [{ id: 'mod-2', name: 'Extra Cheese', price: 1 }] : 
                            [] : []
                        }
                      ],
                      subtotal: randomItem.price * quantity,
                      tax: randomItem.price * quantity * 0.08,
                      total: randomItem.price * quantity * 1.08,
                    }
                    
                    logger.info('[KitchenDisplay] Prepared mock order:', mockOrder)
                    
                    try {
                      logger.info('[KitchenDisplay] Calling api.submitOrder...')
                      const result = await api.submitOrder(mockOrder)
                      logger.info('[KitchenDisplay] Order created successfully:', result)
                      
                      if (result) {
                        toast.success(`Test order created: ${randomItem.name}`)
                        logger.info('[KitchenDisplay] Toast shown - WebSocket will update the display')
                        // Don't call loadOrders() - WebSocket already updates the state!
                      } else {
                        console.warn('[KitchenDisplay] submitOrder returned falsy result:', result)
                      }
                    } catch (error) {
                      console.error('[KitchenDisplay] Test order creation failed:', error)
                      console.error('[KitchenDisplay] Error details:', {
                        message: error.message,
                        stack: error.stack,
                        error
                      })
                      toast.error(`Failed to create test order: ${error.message || 'Unknown error'}`)
                    }
                  }}
                >
                  <Utensils className="h-4 w-4" />
                  Create Test Order
                </Button>
              </CardContent>
            </Card>
            
            {/* Debug Toggle Button */}
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs text-gray-500"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Panel
              </Button>
            </div>
            
            {/* Debug Panel */}
            {showDebug && (
              <div className="mt-4">
                <KDSDebugPanel />
              </div>
            )}
          </div>
        </PageContent>
      </PageLayout>
    </RoleGuard>
  )
}