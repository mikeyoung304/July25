import { useContext } from 'react'
import { logger } from '@/services/logger'
import { RestaurantContext } from './restaurant-types'

export function useRestaurant() {
  logger.info('[useRestaurant] Accessing context with ID:', (RestaurantContext as any).__contextId)
  const context = useContext(RestaurantContext)
  logger.info('[useRestaurant] Got context value:', context ? 'defined' : 'undefined')
  
  if (context === undefined) {
    console.error('🚨 [useRestaurant] CONTEXT UNDEFINED! This is the root cause of the ErrorBoundary!', {
      contextId: (RestaurantContext as any).__contextId,
      error: 'RestaurantContext not found - this causes the Kitchen Display to show ErrorBoundary',
      componentStack: new Error().stack,
      suggestion: 'Check if RestaurantProvider is mounted before this component renders',
      location: 'restaurant-hooks.ts:17'
    })
    
    // Instead of throwing, return a safe fallback to prevent ErrorBoundary
    logger.info('🔧 [useRestaurant] Returning fallback context to prevent ErrorBoundary')
    return {
      restaurant: null,
      setRestaurant: () => {},
      isLoading: true,
      error: new Error('RestaurantProvider not found')
    }
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