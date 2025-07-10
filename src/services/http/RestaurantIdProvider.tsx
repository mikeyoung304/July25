/**
 * RestaurantIdProvider - Syncs the RestaurantContext with the HTTP client
 * This ensures all API calls automatically include the X-Restaurant-ID header
 */

import { useEffect } from 'react'
import { useRestaurant } from '@/core/restaurant-hooks'
import { setCurrentRestaurantId } from './httpClient'

export function RestaurantIdProvider({ children }: { children: React.ReactNode }) {
  const { restaurant } = useRestaurant()

  useEffect(() => {
    // Update the HTTP client whenever the restaurant changes
    setCurrentRestaurantId(restaurant?.id || null)
  }, [restaurant?.id])

  return <>{children}</>
}