/**
 * Price Validation Utilities
 *
 * Robust numeric validation for financial calculations to prevent:
 * - NaN propagation through calculations
 * - Infinity/-Infinity from division by zero
 * - Negative prices
 * - Extreme values that exceed reasonable limits
 * - Database corruption from invalid values
 *
 * @see TODO-082: Missing NaN/Infinity/Invalid Price Validation
 */

/**
 * Maximum allowed price value ($1M)
 * Prevents extreme values from corrupting calculations or database
 */
export const MAX_PRICE = 1_000_000;

/**
 * Type guard to check if a value is a valid price
 *
 * @param value - Value to validate
 * @returns True if value is a valid, finite, non-negative number within limits
 *
 * @example
 * isValidPrice(9.99)       // true
 * isValidPrice(NaN)        // false
 * isValidPrice(Infinity)   // false
 * isValidPrice(-5)         // false
 * isValidPrice("10")       // false (type mismatch)
 */
export function isValidPrice(value: unknown): value is number {
  // Type check
  if (typeof value !== 'number') return false;

  // NaN/Infinity check (catches NaN, Infinity, -Infinity)
  if (!Number.isFinite(value)) return false;

  // Negative price check
  if (value < 0) return false;

  // Sanity check for extreme values
  if (value > MAX_PRICE) return false;

  return true;
}

/**
 * Validate a price value, throwing an error if invalid
 *
 * Use this when invalid prices should stop execution (fail-fast)
 *
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @returns The validated price
 * @throws Error if the price is invalid
 *
 * @example
 * const price = validatePrice(item.base_price, 'base_price');
 * // throws: "Invalid price for base_price: NaN"
 */
export function validatePrice(value: unknown, fieldName: string): number {
  if (!isValidPrice(value)) {
    throw new Error(`Invalid price for ${fieldName}: ${value}`);
  }
  return value;
}

/**
 * Sanitize a price value, returning a default if invalid
 *
 * Use this when you want to gracefully handle invalid prices
 * (e.g., fallback to 0 for missing modifiers)
 *
 * @param value - Value to sanitize
 * @param defaultValue - Default value if invalid (default: 0)
 * @returns The sanitized price or default value
 *
 * @example
 * sanitizePrice(undefined)     // 0
 * sanitizePrice(NaN, 9.99)     // 9.99
 * sanitizePrice(5.99)          // 5.99
 */
export function sanitizePrice(value: unknown, defaultValue: number = 0): number {
  return isValidPrice(value) ? value : defaultValue;
}

/**
 * Validate a cart total calculation result
 *
 * Call this after complex calculations to ensure the result is valid
 * before storing or displaying
 *
 * @param subtotal - Calculated subtotal
 * @param tax - Calculated tax
 * @param total - Calculated total
 * @throws Error if any value is invalid
 *
 * @example
 * const { subtotal, tax, total } = calculateCartTotals(items);
 * validateCartTotals(subtotal, tax, total);
 */
export function validateCartTotals(
  subtotal: number,
  tax: number,
  total: number
): void {
  if (!isValidPrice(subtotal)) {
    throw new Error(`Invalid subtotal calculated: ${subtotal}`);
  }
  if (!isValidPrice(tax)) {
    throw new Error(`Invalid tax calculated: ${tax}`);
  }
  if (!isValidPrice(total)) {
    throw new Error(`Invalid total calculated: ${total}`);
  }

  // Sanity check: total should approximately equal subtotal + tax
  const expectedTotal = subtotal + tax;
  const tolerance = 0.01; // Allow 1 cent rounding tolerance
  if (Math.abs(total - expectedTotal) > tolerance) {
    throw new Error(
      `Total mismatch: expected ${expectedTotal.toFixed(2)}, got ${total.toFixed(2)}`
    );
  }
}

/**
 * Convert a potentially unsafe value to a valid price
 *
 * Handles common conversion issues:
 * - Strings that look like numbers ("9.99")
 * - null/undefined → 0
 * - NaN/Infinity → throws
 *
 * @param value - Value to convert
 * @param fieldName - Field name for error messages
 * @returns The converted and validated price
 * @throws Error if conversion results in invalid price
 *
 * @example
 * toPrice("9.99", "modifier_price")  // 9.99
 * toPrice(null, "modifier_price")    // 0
 * toPrice("abc", "modifier_price")   // throws
 */
export function toPrice(value: unknown, fieldName: string): number {
  // Handle null/undefined explicitly
  if (value == null) {
    return 0;
  }

  // Handle empty string
  if (value === '' || (typeof value === 'string' && value.trim() === '')) {
    return 0;
  }

  // Convert to number
  const numValue = typeof value === 'number' ? value : Number(value);

  // Validate the result
  if (!isValidPrice(numValue)) {
    throw new Error(`Invalid price for ${fieldName}: ${value} (converted to ${numValue})`);
  }

  return numValue;
}

/**
 * Format a price for display using Intl.NumberFormat
 *
 * Provides consistent currency formatting across the application.
 * Uses US locale by default with USD currency.
 *
 * @param price - Price value to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted price string (e.g., "$9.99")
 *
 * @example
 * formatPrice(9.99)            // "$9.99"
 * formatPrice(1000)            // "$1,000.00"
 * formatPrice(0)               // "$0.00"
 * formatPrice(9.99, 'EUR')     // "€9.99"
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
}
