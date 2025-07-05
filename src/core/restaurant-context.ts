import { createContext } from 'react'

// Types
export interface Restaurant {
  id: string
  name: string
  timezone: string
  currency: string
  settings?: {
    orderPrefix?: string
    autoAcceptOrders?: boolean
    kitchenDisplayMode?: 'list' | 'grid' | 'table'
  }
}

export interface RestaurantContextType {
  restaurant: Restaurant | null
  setRestaurant: (restaurant: Restaurant | null) => void
  isLoading: boolean
  error: Error | null
}

// Context
export const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined)