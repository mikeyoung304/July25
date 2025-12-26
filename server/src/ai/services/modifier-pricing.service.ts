/**
 * Modifier Pricing Service
 *
 * Handles lookup of modifier prices from the voice_modifier_rules table.
 * Implements caching and validation for price adjustments.
 */

import NodeCache from 'node-cache';
import { supabase } from '../../config/database';
import { logger } from '../../utils/logger';
import type { CartModifier } from '../types/menu-tools.types';
import { validateModifierName, validatePriceAdjustment } from '../validators/menu-input.validator';

// Cache for modifier pricing rules (5 minutes TTL)
const modifierCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Look up modifier prices from voice_modifier_rules table
 * @param restaurantId - Restaurant ID for tenant isolation
 * @param modifierNames - Array of modifier names from AI (e.g., ["extra cheese", "no onions"])
 * @param menuItemId - Optional menu item ID to filter applicable rules
 * @returns Array of CartModifier objects with prices
 */
export async function lookupModifierPrices(
  restaurantId: string,
  modifierNames: string[],
  menuItemId?: string
): Promise<CartModifier[]> {
  if (!modifierNames || modifierNames.length === 0) {
    return [];
  }

  // Validate array bounds: max 20 modifiers per item (prevent DoS)
  let validatedModifierNames = modifierNames;
  if (modifierNames.length > 20) {
    logger.warn('[MenuTools] Too many modifiers requested', {
      count: modifierNames.length,
      restaurantId
    });
    // Truncate to first 20
    validatedModifierNames = modifierNames.slice(0, 20);
  }

  // Validate and sanitize each modifier name
  const validatedModifiers = validatedModifierNames
    .map(name => validateModifierName(name))
    .filter((name): name is string => name !== null);

  if (validatedModifiers.length === 0) {
    logger.warn('[MenuTools] No valid modifiers after validation', {
      originalCount: modifierNames.length,
      restaurantId
    });
    return [];
  }

  try {
    // Check cache first
    const cacheKey = `modifiers_${restaurantId}`;
    let rules = modifierCache.get<VoiceModifierRuleRow[]>(cacheKey);

    if (!rules) {
      // Cache miss - query voice_modifier_rules for matching trigger phrases
      // Note: Supabase uses parameterized queries, preventing SQL injection
      const { data, error } = await supabase
        .from('voice_modifier_rules')
        .select('target_name, price_adjustment, trigger_phrases, applicable_menu_item_ids')
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      if (error || !data) {
        logger.error('[MenuTools] Modifier pricing lookup failed, cannot calculate pricing', {
          restaurantId,
          error,
          severity: 'revenue-loss'
        });
        throw new Error(
          `Unable to look up modifier pricing for restaurant ${restaurantId}. Cannot calculate accurate order total.`
        );
      }

      rules = data;
      // Cache the modifier rules for 5 minutes
      modifierCache.set(cacheKey, rules);
    }

    // Match modifier names against trigger phrases
    const modifiersWithPrices: CartModifier[] = validatedModifiers.map(modName => {
      const normalizedModName = modName.toLowerCase().trim();

      // Find a rule where any trigger phrase matches the modifier name
      const matchingRule = rules?.find(rule => {
        // Check if rule applies to this menu item
        if (menuItemId && rule.applicable_menu_item_ids && rule.applicable_menu_item_ids.length > 0) {
          if (!rule.applicable_menu_item_ids.includes(menuItemId)) {
            return false;
          }
        }

        // Check trigger phrases for a match
        return rule.trigger_phrases.some((phrase: string) =>
          phrase.toLowerCase().includes(normalizedModName) ||
          normalizedModName.includes(phrase.toLowerCase())
        );
      });

      if (matchingRule) {
        // Validate that price_adjustment exists and is not null
        if (matchingRule.price_adjustment == null) {
          logger.error('[MenuTools] Modifier rule has null price, cannot calculate pricing', {
            modifierName: modName,
            targetName: matchingRule.target_name,
            restaurantId,
            severity: 'revenue-loss'
          });
          throw new Error(
            `Modifier rule for "${modName}" (${matchingRule.target_name}) has invalid pricing. Cannot calculate accurate order total.`
          );
        }

        // Validate price_adjustment bounds (+/-$100)
        const validatedAdjustment = validatePriceAdjustment(matchingRule.price_adjustment);

        // price_adjustment is in cents, convert to dollars
        // Math.max(0, ...) prevents negative prices (modifiers cannot give discounts per business rule)
        const price = Math.max(0, validatedAdjustment / 100);
        return {
          name: modName,
          price
        };
      }

      // No matching rule found - modifier has no price impact
      return { name: modName, price: 0 };
    });

    return modifiersWithPrices;
  } catch (error) {
    logger.error('[MenuTools] Exception looking up modifier prices, cannot calculate pricing', {
      restaurantId,
      error,
      severity: 'revenue-loss'
    });
    throw new Error(
      `Exception during modifier pricing lookup for restaurant ${restaurantId}. Cannot calculate accurate order total.`
    );
  }
}

// Internal type for database row (not exported)
interface VoiceModifierRuleRow {
  target_name: string;
  price_adjustment: number;
  trigger_phrases: string[];
  applicable_menu_item_ids: string[] | null;
}
