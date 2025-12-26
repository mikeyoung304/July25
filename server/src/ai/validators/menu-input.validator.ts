/**
 * Menu Input Validation
 *
 * Validation functions for menu tool inputs including modifier names
 * and price adjustments. Provides security and business rule enforcement.
 */

import { logger } from '../../utils/logger';

// Price adjustment bounds
export const MAX_PRICE_ADJUSTMENT = 100; // $100
export const MIN_PRICE_ADJUSTMENT = -100; // -$100

/**
 * Validate and sanitize a modifier name from voice input
 * @param modifierName - Raw modifier name from voice/AI input
 * @returns Sanitized modifier name or null if invalid
 */
export function validateModifierName(modifierName: unknown): string | null {
  // Check if modifier name exists and is a string
  if (!modifierName || typeof modifierName !== 'string') {
    return null;
  }

  // Trim and normalize
  const trimmed = modifierName.trim();

  // Length validation: min 1, max 100 characters (prevent DoS)
  if (trimmed.length === 0 || trimmed.length > 100) {
    logger.warn('[MenuTools] Modifier name length invalid', {
      length: trimmed.length,
      rejected: trimmed.substring(0, 50)
    });
    return null;
  }

  // Character whitelist: alphanumeric, spaces, hyphens, apostrophes, commas
  // Allow common food modifiers like "no onions", "extra cheese", "well-done", etc.
  const validPattern = /^[a-zA-Z0-9\s\-',]+$/;
  if (!validPattern.test(trimmed)) {
    logger.warn('[MenuTools] Modifier name contains invalid characters', {
      rejected: trimmed.substring(0, 50)
    });
    return null;
  }

  return trimmed;
}

/**
 * Validate and clamp modifier price adjustment to reasonable bounds
 * @param adjustment - Price adjustment in cents
 * @returns Validated and clamped adjustment value in cents
 */
export function validatePriceAdjustment(adjustment: number): number {
  if (adjustment < MIN_PRICE_ADJUSTMENT * 100 || adjustment > MAX_PRICE_ADJUSTMENT * 100) {
    logger.warn('[MenuTools] Price adjustment out of bounds', {
      adjustment,
      min: MIN_PRICE_ADJUSTMENT * 100,
      max: MAX_PRICE_ADJUSTMENT * 100
    });
    return Math.max(MIN_PRICE_ADJUSTMENT * 100, Math.min(MAX_PRICE_ADJUSTMENT * 100, adjustment));
  }
  return adjustment;
}
