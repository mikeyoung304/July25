/**
 * Fuzzy Menu Matcher Utility
 *
 * Provides robust fuzzy matching for menu items based on user input.
 * Handles common variations, phonetic similarities, and substring matching.
 *
 * @module fuzzyMenuMatcher
 */

import type { ApiMenuItem } from '@rebuild/shared';

/**
 * Result of a fuzzy match operation
 */
export interface FuzzyMatchResult {
  /** The matched menu item, or null if no match found */
  item: ApiMenuItem | null;
  /** Confidence score between 0 and 1 */
  confidence: number;
  /** Type of match that was applied */
  matchType: 'exact' | 'contains' | 'variation' | 'none';
}

/**
 * Result containing multiple matches above a threshold
 */
export interface MultipleFuzzyMatchResult {
  /** Array of matched items with their confidence scores */
  matches: Array<{
    item: ApiMenuItem;
    confidence: number;
    matchType: 'exact' | 'contains' | 'variation';
  }>;
}

/**
 * Common menu item variations and aliases
 * Maps canonical menu names to their common spoken variations
 */
const MENU_VARIATIONS: Record<string, string[]> = {
  'soul bowl': ['soul', 'bowl', 'sobo', 'solo bowl', 'soul ball'],
  'greek salad': ['greek', 'greek salad', 'greek side'],
  'peach arugula': ['peach', 'arugula', 'peach salad', 'peach and arugula'],
  'jalapeño pimento': ['jalapeno', 'pimento', 'cheese bites', 'jalapeno pimento', 'jalapeño'],
  'succotash': ['succotash', 'suck a toss', 'suck-a-tash'],
  'caesar salad': ['caesar', 'cesar', 'caesar salad', 'cesar salad'],
  'chicken tenders': ['chicken', 'tenders', 'chicken strips', 'chicken fingers'],
  'french fries': ['fries', 'french fries', 'french fry'],
  'onion rings': ['onion', 'rings', 'onion ring'],
};

/**
 * Calculate Levenshtein distance between two strings
 * Used for phonetic similarity matching
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of single-character edits needed to transform a into b
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Normalize a string for comparison
 * - Converts to lowercase
 * - Removes extra whitespace
 * - Removes special characters
 *
 * @param text - Input text
 * @returns Normalized text
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ');    // Normalize whitespace
}

/**
 * Check if input matches any known variations of a menu item
 *
 * @param itemName - Spoken/input item name (normalized)
 * @param menuName - Menu item name (normalized)
 * @returns True if a variation match is found
 */
function matchesVariation(itemName: string, menuName: string): boolean {
  for (const [menuKey, aliases] of Object.entries(MENU_VARIATIONS)) {
    if (menuName.includes(menuKey)) {
      // Check if any alias matches the input
      return aliases.some(alias => {
        const normalizedAlias = normalizeText(alias);
        return itemName.includes(normalizedAlias) || normalizedAlias.includes(itemName);
      });
    }
  }
  return false;
}

/**
 * Calculate confidence score for a match
 *
 * @param itemName - Input item name
 * @param menuName - Menu item name
 * @param matchType - Type of match found
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(
  itemName: string,
  menuName: string,
  matchType: 'exact' | 'contains' | 'variation'
): number {
  if (matchType === 'exact') {
    return 1.0;
  }

  if (matchType === 'variation') {
    return 0.9;
  }

  // For contains matches, calculate based on length similarity
  const lengthRatio = Math.min(itemName.length, menuName.length) /
                      Math.max(itemName.length, menuName.length);

  // Calculate edit distance ratio
  const distance = levenshteinDistance(itemName, menuName);
  const maxLength = Math.max(itemName.length, menuName.length);
  const editDistanceRatio = 1 - (distance / maxLength);

  // Combine metrics (weighted average)
  return (lengthRatio * 0.4) + (editDistanceRatio * 0.6);
}

/**
 * Find the best matching menu item for a given input string
 *
 * Uses a multi-tier matching strategy:
 * 1. Exact match (confidence: 1.0)
 * 2. Contains match (confidence: 0.6-0.95)
 * 3. Known variation match (confidence: 0.9)
 * 4. Edit distance match (confidence: based on similarity)
 *
 * @param itemName - The input string to match (e.g., from voice recognition)
 * @param menuItems - Array of available menu items
 * @param threshold - Minimum confidence threshold (default: 0.5)
 * @returns Match result with item, confidence, and match type
 *
 * @example
 * ```typescript
 * const result = findBestMatch('greek', menuItems);
 * if (result.item && result.confidence > 0.7) {
 *   addToCart(result.item);
 * }
 * ```
 */
export function findBestMatch(
  itemName: string,
  menuItems: ApiMenuItem[],
  threshold: number = 0.5
): FuzzyMatchResult {
  if (!itemName || menuItems.length === 0) {
    return { item: null, confidence: 0, matchType: 'none' };
  }

  const normalizedInput = normalizeText(itemName);
  let bestMatch: FuzzyMatchResult = { item: null, confidence: 0, matchType: 'none' };

  for (const menuItem of menuItems) {
    const normalizedMenu = normalizeText(menuItem.name);

    // 1. Exact match - highest confidence (return immediately)
    if (normalizedMenu === normalizedInput) {
      return {
        item: menuItem,
        confidence: 1.0,
        matchType: 'exact'
      };
    }

    // Determine match type and confidence
    let confidence = 0;
    let matchType: 'contains' | 'variation' = 'contains';

    // 2. Known variation match - high priority
    if (matchesVariation(normalizedInput, normalizedMenu)) {
      confidence = 0.9;
      matchType = 'variation';
    }
    // 3. Contains match (bidirectional)
    else if (normalizedMenu.includes(normalizedInput) || normalizedInput.includes(normalizedMenu)) {
      confidence = calculateConfidence(normalizedInput, normalizedMenu, 'contains');
      matchType = 'contains';
    }
    // 4. Edit distance match (for phonetic similarities)
    else {
      const distance = levenshteinDistance(normalizedInput, normalizedMenu);
      const maxLength = Math.max(normalizedInput.length, normalizedMenu.length);
      confidence = 1 - (distance / maxLength);
      matchType = 'contains';
    }

    // Update best match if this is better
    if (confidence > bestMatch.confidence && confidence >= threshold) {
      bestMatch = {
        item: menuItem,
        confidence,
        matchType
      };
    }
  }

  return bestMatch;
}

/**
 * Find all menu items matching above a confidence threshold
 * Useful for suggesting multiple options to the user
 *
 * @param itemName - The input string to match
 * @param menuItems - Array of available menu items
 * @param threshold - Minimum confidence threshold (default: 0.6)
 * @returns Array of matches sorted by confidence (descending)
 *
 * @example
 * ```typescript
 * const results = findMultipleMatches('salad', menuItems, 0.7);
 * // Show suggestions: "Did you mean: Greek Salad, Caesar Salad?"
 * ```
 */
export function findMultipleMatches(
  itemName: string,
  menuItems: ApiMenuItem[],
  threshold: number = 0.6
): MultipleFuzzyMatchResult {
  if (!itemName || menuItems.length === 0) {
    return { matches: [] };
  }

  const normalizedInput = normalizeText(itemName);
  const matches: MultipleFuzzyMatchResult['matches'] = [];

  for (const menuItem of menuItems) {
    const normalizedMenu = normalizeText(menuItem.name);
    let confidence = 0;
    let matchType: 'exact' | 'contains' | 'variation' = 'contains';

    // 1. Exact match
    if (normalizedMenu === normalizedInput) {
      confidence = 1.0;
      matchType = 'exact';
    }
    // 2. Known variation match - high priority
    else if (matchesVariation(normalizedInput, normalizedMenu)) {
      confidence = 0.9;
      matchType = 'variation';
    }
    // 3. Contains match (bidirectional)
    else if (normalizedMenu.includes(normalizedInput) || normalizedInput.includes(normalizedMenu)) {
      confidence = calculateConfidence(normalizedInput, normalizedMenu, 'contains');
      matchType = 'contains';
    }
    // 4. Edit distance match
    else {
      const distance = levenshteinDistance(normalizedInput, normalizedMenu);
      const maxLength = Math.max(normalizedInput.length, normalizedMenu.length);
      confidence = 1 - (distance / maxLength);
      matchType = 'contains';
    }

    if (confidence >= threshold) {
      matches.push({
        item: menuItem,
        confidence,
        matchType
      });
    }
  }

  // Sort by confidence (descending)
  matches.sort((a, b) => b.confidence - a.confidence);

  return { matches };
}

/**
 * Add a new menu item variation to the matcher
 * Useful for learning from corrections or adding restaurant-specific variations
 *
 * @param menuItemName - Canonical menu item name (lowercase)
 * @param variations - Array of variation strings to add
 *
 * @example
 * ```typescript
 * addMenuVariation('soul bowl', ['soul ball', 'sole bowl']);
 * ```
 */
export function addMenuVariation(menuItemName: string, variations: string[]): void {
  const normalized = normalizeText(menuItemName);
  if (!MENU_VARIATIONS[normalized]) {
    MENU_VARIATIONS[normalized] = [];
  }
  MENU_VARIATIONS[normalized].push(...variations.map(v => normalizeText(v)));
}

/**
 * Get all registered menu variations
 * Useful for debugging or displaying learned variations
 *
 * @returns Copy of the variations map
 */
export function getMenuVariations(): Record<string, string[]> {
  return { ...MENU_VARIATIONS };
}
