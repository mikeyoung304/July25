import React, { ReactNode } from 'react'
import { RestaurantContext, type Restaurant } from '@/core/restaurant-types'

interface TestRestaurantProviderProps {
  children: ReactNode
  restaurant?: Restaurant | null
  isLoading?: boolean
  error?: Error | null
}

export function TestRestaurantProvider({ 
  children, 
  restaurant = null,
  isLoading = false,
  error = null
}: TestRestaurantProviderProps) {
  const contextValue = {
    restaurant,
    setRestaurant: jest.fn(),
    isLoading,
    error
  }

  return (
    <RestaurantContext.Provider value={contextValue}>
      {children}
    </RestaurantContext.Provider>
  )
}