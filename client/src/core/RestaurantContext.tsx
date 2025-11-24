import React, { useState, useEffect, ReactNode } from 'react'
import { logger } from '@/services/logger'
import { RestaurantContext, type Restaurant } from './restaurant-types'
import { env } from '@/utils/env'
import { useAuth } from '@/contexts/auth.hooks'
import { DEFAULT_TAX_RATE } from '@rebuild/shared/constants/business'

// Helper to create restaurant data
function createRestaurantData(restaurantId: string | null): Restaurant {
  const id = restaurantId ||
             env.VITE_DEFAULT_RESTAURANT_ID ||
             import.meta.env.VITE_DEFAULT_RESTAURANT_ID ||
             'grow'

  return {
    id,
    name: 'Grow Fresh Local Food',
    timezone: 'America/New_York',
    currency: 'USD',
    tax_rate: DEFAULT_TAX_RATE, // Fallback - actual rate from database (ADR-013)
    settings: {
      orderPrefix: 'GRW',
      autoAcceptOrders: true,
      kitchenDisplayMode: 'grid'
    }
  }
}

// Provider
export function RestaurantProvider({ children }: { children: ReactNode }) {
  logger.info('[RestaurantProvider] Mounting with context ID:', (RestaurantContext as { __contextId?: string }).__contextId)
  const { restaurantId: authRestaurantId } = useAuth()

  // Initialize restaurant synchronously - NEVER null, always available immediately
  const [restaurant, setRestaurant] = useState<Restaurant>(() =>
    createRestaurantData(authRestaurantId)
  )

  // Update restaurant when auth restaurant ID changes (e.g., after login)
  useEffect(() => {
    const newRestaurant = createRestaurantData(authRestaurantId)
    if (newRestaurant.id !== restaurant.id) {
      setRestaurant(newRestaurant)
      logger.info('✅ Restaurant context updated:', {
        id: newRestaurant.id,
        source: authRestaurantId ? 'auth' : 'default'
      })
    }
  }, [authRestaurantId, restaurant.id])

  const contextValue = {
    restaurant, // Never null - always defined
    setRestaurant,
    isLoading: false, // Always ready immediately
    error: null
  }

  logger.info('[RestaurantProvider] Providing context value:', {
    contextId: (RestaurantContext as { __contextId?: string }).__contextId,
    restaurantId: restaurant.id,
    isLoading: false
  })

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  )
}

