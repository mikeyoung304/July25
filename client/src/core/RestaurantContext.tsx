import React, { useEffect, ReactNode } from 'react'
import { useAsyncState } from '@/hooks/useAsyncState'
import { RestaurantContext, type Restaurant } from './restaurant-types'
import { env } from '@/utils/env'

// Provider
export function RestaurantProvider({ children }: { children: ReactNode }) {
  console.log('[RestaurantProvider] Mounting with context ID:', (RestaurantContext as any).__contextId)
  const { 
    data: restaurant, 
    loading: isLoading, 
    error, 
    execute,
    setData: setRestaurant 
  } = useAsyncState<Restaurant | null>(null)

  useEffect(() => {
    // In a real app, this would fetch the restaurant data based on the logged-in user
    // For now, we'll simulate with mock data
    const loadRestaurant = async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock restaurant data - use environment variable for restaurant ID
      const mockRestaurant: Restaurant = {
        id: env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111',
        name: 'Grow Fresh Local Food',
        timezone: 'America/New_York',
        currency: 'USD',
        settings: {
          orderPrefix: 'GRW',
          autoAcceptOrders: true,
          kitchenDisplayMode: 'grid'
        }
      }
      
      return mockRestaurant
    }

    execute(loadRestaurant()).catch(err => {
      console.error('Error loading restaurant:', err)
    })
  }, [execute])

  const contextValue = {
    restaurant: restaurant ?? null,
    setRestaurant,
    isLoading,
    error
  }
  
  console.log('[RestaurantProvider] Providing context value:', {
    contextId: (RestaurantContext as any).__contextId,
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

