import { useContext } from 'react'
import { RestaurantContext } from './restaurant-context'

export function useRestaurant() {
  const context = useContext(RestaurantContext)
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider')
  }
  return context
}

// Utility hook to get restaurant settings with defaults
export function useRestaurantSettings() {
  const { restaurant } = useRestaurant()
  
  return {
    orderPrefix: restaurant?.settings?.orderPrefix || 'ORD',
    autoAcceptOrders: restaurant?.settings?.autoAcceptOrders ?? true,
    kitchenDisplayMode: restaurant?.settings?.kitchenDisplayMode || 'grid',
    timezone: restaurant?.timezone || 'UTC',
    currency: restaurant?.currency || 'USD'
  }
}