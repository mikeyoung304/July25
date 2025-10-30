import React, { useEffect, ReactNode } from 'react'
import { logger } from '@/services/logger'
import { useAsyncState } from '@/hooks/useAsyncState'
import { RestaurantContext, type Restaurant } from './restaurant-types'
import { env } from '@/utils/env'
import { useAuth } from '@/contexts/AuthContext'

// Provider
export function RestaurantProvider({ children }: { children: ReactNode }) {
  logger.info('[RestaurantProvider] Mounting with context ID:', (RestaurantContext as { __contextId?: string }).__contextId)
  const { restaurantId: authRestaurantId } = useAuth()
  const {
    data: restaurant,
    loading: isLoading,
    error,
    execute,
    setData: setRestaurant
  } = useAsyncState<Restaurant | null>(null)

  useEffect(() => {
    // Use restaurant ID from authenticated user's context
    // Falls back to default if not authenticated yet
    try {
      const restaurantId = authRestaurantId ||
                          env.VITE_DEFAULT_RESTAURANT_ID ||
                          import.meta.env.VITE_DEFAULT_RESTAURANT_ID ||
                          '11111111-1111-1111-1111-111111111111'

      const restaurantData: Restaurant = {
        id: restaurantId, // Use actual user's restaurant ID from auth
        name: 'Grow Fresh Local Food',
        timezone: 'America/New_York',
        currency: 'USD',
        tax_rate: 0.08, // 8% sales tax - configurable per tenant
        settings: {
          orderPrefix: 'GRW',
          autoAcceptOrders: true,
          kitchenDisplayMode: 'grid'
        }
      }

      setRestaurant(restaurantData)
      logger.info('✅ Restaurant context loaded:', {
        id: restaurantData.id,
        source: authRestaurantId ? 'auth' : 'default'
      })
    } catch (err) {
      console.error('Error loading restaurant:', err)
    }
  }, [authRestaurantId, setRestaurant])

  const contextValue = {
    restaurant: restaurant ?? null,
    setRestaurant,
    isLoading,
    error
  }
  
  logger.info('[RestaurantProvider] Providing context value:', {
    contextId: (RestaurantContext as { __contextId?: string }).__contextId,
    hasRestaurant: !!restaurant,
    isLoading,
    hasError: !!error
  })

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  )
}

