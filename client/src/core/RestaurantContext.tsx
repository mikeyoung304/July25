import React, { useEffect, ReactNode } from 'react'
import { useAsyncState } from '@/hooks/useAsyncState'
import { RestaurantContext, type Restaurant } from './restaurant-types'

// Provider
export function RestaurantProvider({ children }: { children: ReactNode }) {
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
      
      // Mock restaurant data
      const mockRestaurant: Restaurant = {
        id: 'rest-1',
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

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  )
}

