import { createContext } from 'react'
import { logger } from '@/services/logger'

// Types
export interface Restaurant {
  id: string
  name: string
  timezone: string
  currency: string
  tax_rate?: number // Sales tax rate (decimal format: 0.08 = 8%). Default: 0.08, configurable per tenant
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

// Add a unique ID to track context instance
;(RestaurantContext as { __contextId?: string }).__contextId = 'restaurant-context-' + Date.now()
logger.info('[restaurant-types] Created RestaurantContext with ID:', (RestaurantContext as { __contextId?: string }).__contextId)