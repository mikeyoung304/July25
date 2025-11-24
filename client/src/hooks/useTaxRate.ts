import { useRestaurant } from '@/core/restaurant-hooks'
import { DEFAULT_TAX_RATE } from '@rebuild/shared/constants/business'

/**
 * Hook to get the current restaurant's tax rate
 *
 * @returns {number} Tax rate as decimal (e.g., 0.0825 for 8.25%)
 *
 * @example
 * const taxRate = useTaxRate()
 * const tax = subtotal * taxRate
 *
 * @remarks
 * - Returns restaurant-specific tax_rate from RestaurantContext
 * - Falls back to DEFAULT_TAX_RATE (0.0825 / 8.25%) if not configured
 * - Each restaurant tenant can configure their own rate
 * - See migration: 20251019180000_add_tax_rate_to_restaurants.sql
 * - ADR-013: Single Source of Truth for Business Logic
 */
export function useTaxRate(): number {
  const { restaurant } = useRestaurant()
  return restaurant?.tax_rate ?? DEFAULT_TAX_RATE
}
