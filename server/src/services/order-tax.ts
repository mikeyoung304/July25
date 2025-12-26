/**
 * Order Tax Calculation Helpers
 *
 * Extracted from orders.service.ts for better modularity.
 * Per ADR-007: Tax rates are configured per-restaurant.
 *
 * CRITICAL FINANCIAL LOGIC:
 * 1. Try DB lookup (restaurants.tax_rate)
 * 2. If DB fails/null, try process.env.DEFAULT_TAX_RATE
 * 3. If both fail, THROW ERROR (never silently default to magic number)
 */

import { supabase } from '../config/database';
import { logger } from '../utils/logger';

const taxLogger = logger.child({ service: 'OrderTax' });

/**
 * Get restaurant tax rate with robust fallback chain
 * Per ADR-007: Tax rates are now configured per-restaurant
 *
 * @param restaurant_id - The restaurant ID to fetch tax rate for (multi-tenancy)
 * @returns The tax rate as a decimal (e.g., 0.0825 for 8.25%)
 * @throws Error if tax rate cannot be determined
 */
export async function getRestaurantTaxRate(restaurant_id: string): Promise<number> {
  try {
    // Step 1: Attempt DB lookup
    const { data, error } = await supabase
      .from('restaurants')
      .select('tax_rate')
      .eq('id', restaurant_id)
      .single();

    if (!error && data && data.tax_rate !== null && data.tax_rate !== undefined) {
      const taxRate = Number(data.tax_rate);
      taxLogger.debug('Using restaurant-specific tax rate', { restaurant_id, taxRate });
      return taxRate;
    }

    // Step 2: DB failed or returned null - try environment variable
    const envTaxRate = process.env['DEFAULT_TAX_RATE'];

    if (envTaxRate) {
      const parsedRate = Number(envTaxRate);
      if (!isNaN(parsedRate) && parsedRate > 0 && parsedRate < 1) {
        taxLogger.warn('Restaurant tax rate not in DB, using DEFAULT_TAX_RATE from environment', {
          restaurant_id,
          taxRate: parsedRate,
          dbError: error?.message
        });
        return parsedRate;
      } else {
        taxLogger.error('DEFAULT_TAX_RATE environment variable is invalid', {
          envTaxRate,
          parsedRate
        });
      }
    }

    // Step 3: Both DB and Env failed - CRITICAL ERROR
    taxLogger.error('CRITICAL: Cannot determine tax rate for restaurant', {
      restaurant_id,
      dbError: error?.message,
      dbData: data,
      envTaxRate: envTaxRate || 'NOT_SET'
    });

    throw new Error(
      `Tax rate configuration missing for restaurant ${restaurant_id}. ` +
      `Please configure tax_rate in restaurants table or set DEFAULT_TAX_RATE environment variable. ` +
      `Financial calculations cannot proceed without a valid tax rate.`
    );

  } catch (error) {
    // If error is already our custom error, re-throw it
    if (error instanceof Error && error.message.includes('Tax rate configuration missing')) {
      throw error;
    }

    // For unexpected errors, log and throw with context
    taxLogger.error('Unexpected exception in getRestaurantTaxRate', {
      error,
      restaurant_id
    });

    throw new Error(
      `Failed to retrieve tax rate for restaurant ${restaurant_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate tax amount from subtotal
 *
 * Uses cents (integer) arithmetic to avoid floating-point rounding errors.
 *
 * @param subtotal_cents - Subtotal in cents (integer)
 * @param tax_rate - Tax rate as decimal (e.g., 0.0825)
 * @returns Tax amount in cents (integer)
 */
export function calculateTaxCents(subtotal_cents: number, tax_rate: number): number {
  return Math.round(subtotal_cents * tax_rate);
}

/**
 * Calculate order totals from items
 *
 * Uses cents (integer) arithmetic internally, returns dollars.
 * This eliminates trust boundary violation by ensuring server-side calculation.
 *
 * @param items - Array of order items with price and quantity
 * @param tax_rate - Tax rate as decimal
 * @param tip - Optional tip amount in dollars
 * @returns Object with subtotal, tax, and total_amount in dollars
 */
export function calculateOrderTotals(
  items: Array<{
    price: number;
    quantity: number;
    modifiers?: Array<{ price: number }>;
  }>,
  tax_rate: number,
  tip: number = 0
): { subtotal: number; tax: number; total_amount: number } {
  // Calculate subtotal in cents to avoid floating-point errors
  const subtotal_cents = items.reduce((total_cents, item) => {
    const item_price_cents = Math.round(item.price * 100);
    const item_total_cents = item_price_cents * item.quantity;
    const modifiers_total_cents = (item.modifiers || []).reduce(
      (mod_total_cents, mod) => {
        const mod_price_cents = Math.round(mod.price * 100);
        return mod_total_cents + (mod_price_cents * item.quantity);
      },
      0
    );
    return total_cents + item_total_cents + modifiers_total_cents;
  }, 0);

  const tax_cents = calculateTaxCents(subtotal_cents, tax_rate);
  const tip_cents = Math.round(tip * 100);
  const total_amount_cents = subtotal_cents + tax_cents + tip_cents;

  // Convert back to dollars for storage (consistent with database schema)
  return {
    subtotal: subtotal_cents / 100,
    tax: tax_cents / 100,
    total_amount: total_amount_cents / 100
  };
}
