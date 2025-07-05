import { createContext } from 'react'

interface Restaurant {
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

interface RestaurantContextType {
  restaurant: Restaurant | null
  setRestaurant: (restaurant: Restaurant | null) => void
  isLoading: boolean
  error: Error | null
}

export const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined)