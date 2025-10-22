import { useRestaurant } from '@/core/restaurant-hooks'

/**
 * Hook to get the current restaurant's tax rate
 *
 * @returns {number} Tax rate as decimal (e.g., 0.08 for 8%)
 *
 * @example
 * const taxRate = useTaxRate()
 * const tax = subtotal * taxRate
 *
 * @remarks
 * - Returns restaurant-specific tax_rate from RestaurantContext
 * - Falls back to 0.08 (8%) if not configured
 * - Each restaurant tenant can configure their own rate
 * - See migration: 20251019180000_add_tax_rate_to_restaurants.sql
 */
export function useTaxRate(): number {
  const { restaurant } = useRestaurant()
  return restaurant?.tax_rate ?? 0.08
}
