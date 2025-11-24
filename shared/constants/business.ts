/**
 * Business Logic Constants
 *
 * This module provides the single source of truth for all business-related
 * constants and configuration values used across the application.
 *
 * ADR-013: Single Source of Truth for Business Logic
 * - All business calculations must use these constants
 * - Database values take precedence; these are fallbacks only
 * - Log warnings when fallback values are used
 */

/**
 * Default tax rate (8.25%)
 *
 * CRITICAL: This is the fallback value used ONLY when restaurant.tax_rate is NULL
 * in the database. The database value should always be the primary source.
 *
 * Usage:
 * ```typescript
 * const taxRate = restaurant?.tax_rate ?? DEFAULT_TAX_RATE;
 * if (!restaurant?.tax_rate) {
 *   logger.warn('Using fallback tax rate', { restaurantId, fallback: DEFAULT_TAX_RATE });
 * }
 * ```
 */
export const DEFAULT_TAX_RATE = 0.0825; // 8.25%

/**
 * Default tip percentage options
 *
 * Fallback used when restaurant.tip_percentages is NULL in database.
 */
export const DEFAULT_TIP_PERCENTAGES = [15, 18, 20, 25];

/**
 * Minimum order amount (in dollars)
 *
 * Used for payment validation - prevents processing orders below this threshold.
 */
export const MIN_ORDER_AMOUNT = 0.01;

/**
 * Payment rounding tolerance (in cents)
 *
 * Allowed variance for floating-point rounding errors in payment calculations.
 */
export const PAYMENT_ROUNDING_TOLERANCE_CENTS = 1;

/**
 * Tax rate source identifier
 *
 * Used for logging and debugging to track where tax rate values originate.
 */
export const TAX_RATE_SOURCE = {
  DATABASE: 'database',
  FALLBACK: 'fallback',
} as const;
