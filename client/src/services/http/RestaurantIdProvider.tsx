/**
 * RestaurantIdProvider - Syncs the RestaurantContext with the HTTP client
 * This ensures all API calls automatically include the X-Restaurant-ID header
 */

import { useEffect } from 'react'
import { useRestaurant } from '@/core'
import { setCurrentRestaurantId } from './httpClient'

export function RestaurantIdProvider({ children }: { children: React.ReactNode }) {
  const { restaurant } = useRestaurant()

  useEffect(() => {
    // Set default restaurant ID from environment
    // This ensures API calls work even before RestaurantContext loads
    if (!restaurant?.id) {
      const defaultId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
      setCurrentRestaurantId(defaultId)
    } else {
      // Update the HTTP client when the actual restaurant loads
      setCurrentRestaurantId(restaurant.id)
    }
  }, [restaurant?.id])

  return <>{children}</>
}