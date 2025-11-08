/**
 * Example Usage of Fuzzy Menu Matcher
 *
 * This file demonstrates how to use the fuzzyMenuMatcher utility
 * for matching user input to menu items.
 */

import { findBestMatch, findMultipleMatches, addMenuVariation } from './fuzzyMenuMatcher';
import type { ApiMenuItem } from '@rebuild/shared';

// Example menu items
const exampleMenuItems: ApiMenuItem[] = [
  {
    id: '1',
    restaurantId: 'demo-restaurant',
    categoryId: 'entrees',
    name: 'Soul Bowl',
    description: 'Delicious soul food in a bowl',
    price: 12.99,
    isAvailable: true
  },
  {
    id: '2',
    restaurantId: 'demo-restaurant',
    categoryId: 'salads',
    name: 'Greek Salad',
    description: 'Fresh Mediterranean salad',
    price: 9.99,
    isAvailable: true
  },
  {
    id: '3',
    restaurantId: 'demo-restaurant',
    categoryId: 'sides',
    name: 'French Fries',
    description: 'Crispy golden fries',
    price: 4.99,
    isAvailable: true
  }
];

// ============================================================================
// Example 1: Basic Voice Recognition Matching
// ============================================================================

function handleVoiceInput(spokenText: string) {
  // Find best matching menu item
  const result = findBestMatch(spokenText, exampleMenuItems);

  if (result.item && result.confidence > 0.7) {
    console.log(`✓ Matched "${spokenText}" to "${result.item.name}" (${Math.round(result.confidence * 100)}% confident)`);
    // Add to cart
    return result.item;
  } else if (result.item && result.confidence > 0.5) {
    console.log(`? Did you mean "${result.item.name}"? (${Math.round(result.confidence * 100)}% confident)`);
    // Ask for confirmation
    return null;
  } else {
    console.log(`✗ Could not find a match for "${spokenText}"`);
    return null;
  }
}

// Test with various inputs
handleVoiceInput('soul bowl');       // Exact match
handleVoiceInput('sobo');            // Known variation
handleVoiceInput('greek');           // Partial match
handleVoiceInput('fries');           // Word from name

// ============================================================================
// Example 2: Multiple Suggestions
// ============================================================================

function showSuggestions(userInput: string) {
  const results = findMultipleMatches(userInput, exampleMenuItems, 0.6);

  if (results.matches.length === 0) {
    console.log('No matches found');
  } else if (results.matches.length === 1) {
    console.log(`Found: ${results.matches[0].item.name}`);
  } else {
    console.log('Did you mean:');
    results.matches.slice(0, 3).forEach((match, index) => {
      console.log(`${index + 1}. ${match.item.name} (${Math.round(match.confidence * 100)}%)`);
    });
  }
}

showSuggestions('salad');  // Shows all salads

// ============================================================================
// Example 3: Learning New Variations
// ============================================================================

function learnFromCorrection(
  userSaid: string,
  actualItem: string,
  menuItems: ApiMenuItem[]
) {
  // User said "sole bowl" but meant "Soul Bowl"
  // Learn this variation for future
  const menuItem = menuItems.find(item => item.name === actualItem);
  if (menuItem) {
    addMenuVariation(menuItem.name.toLowerCase(), [userSaid.toLowerCase()]);
    console.log(`✓ Learned: "${userSaid}" → "${menuItem.name}"`);
  }
}

learnFromCorrection('sole bowl', 'Soul Bowl', exampleMenuItems);

// ============================================================================
// Example 4: Integration with Voice Ordering Component
// ============================================================================

export function processVoiceOrder(
  transcript: string,
  menuItems: ApiMenuItem[],
  onItemMatched: (item: ApiMenuItem, quantity: number) => void,
  onAmbiguous: (suggestions: ApiMenuItem[]) => void,
  onNoMatch: (text: string) => void
) {
  // Extract quantity and item name
  const quantityMatch = transcript.match(/(\d+)\s+(.+)/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
  const itemText = quantityMatch ? quantityMatch[2] : transcript;

  // Find best match
  const result = findBestMatch(itemText, menuItems, 0.5);

  if (result.confidence > 0.8) {
    // High confidence - auto-add
    onItemMatched(result.item!, quantity);
  } else if (result.confidence > 0.5) {
    // Medium confidence - show multiple suggestions
    const suggestions = findMultipleMatches(itemText, menuItems, 0.5);
    onAmbiguous(suggestions.matches.map(m => m.item));
  } else {
    // Low confidence - no match
    onNoMatch(transcript);
  }
}

// Usage in a React component:
// const handleOrderData = (orderData: { items: { name: string; quantity: number }[] }) => {
//   orderData.items.forEach(item => {
//     processVoiceOrder(
//       `${item.quantity} ${item.name}`,
//       menuItems,
//       (matchedItem, qty) => addToCart(matchedItem, qty),
//       (suggestions) => showDisambiguationDialog(suggestions),
//       (text) => toast.error(`Could not find: ${text}`)
//     );
//   });
// };

// ============================================================================
// Example 5: Using with OpenAI Realtime API
// ============================================================================

export function enhanceAIOrderParsing(
  aiItems: Array<{ name: string; quantity: number; modifiers?: string[] }>,
  menuItems: ApiMenuItem[]
): Array<{ menuItem: ApiMenuItem; quantity: number; modifiers?: string[] }> {
  const enhancedItems: Array<{ menuItem: ApiMenuItem; quantity: number; modifiers?: string[] }> = [];

  aiItems.forEach(aiItem => {
    const match = findBestMatch(aiItem.name, menuItems, 0.5);

    if (match.item) {
      enhancedItems.push({
        menuItem: match.item,
        quantity: aiItem.quantity,
        modifiers: aiItem.modifiers
      });
    } else {
      console.warn(`AI item "${aiItem.name}" could not be matched to menu`);
    }
  });

  return enhancedItems;
}

// ============================================================================
// Example 6: Custom Threshold Strategy
// ============================================================================

export function adaptiveThreshold(
  userInput: string,
  menuItems: ApiMenuItem[],
  previousSuccessRate: number
) {
  // Lower threshold if user has had success before
  const threshold = previousSuccessRate > 0.8 ? 0.4 : 0.6;

  return findBestMatch(userInput, menuItems, threshold);
}

// ============================================================================
// Example 7: Batch Processing for Analytics
// ============================================================================

export function analyzeVoiceOrderAccuracy(
  transcripts: string[],
  menuItems: ApiMenuItem[]
) {
  const stats = {
    highConfidence: 0,   // > 0.8
    mediumConfidence: 0, // 0.5 - 0.8
    lowConfidence: 0,    // 0.3 - 0.5
    noMatch: 0           // < 0.3
  };

  transcripts.forEach(transcript => {
    const result = findBestMatch(transcript, menuItems, 0.3);

    if (result.confidence > 0.8) stats.highConfidence++;
    else if (result.confidence > 0.5) stats.mediumConfidence++;
    else if (result.confidence > 0.3) stats.lowConfidence++;
    else stats.noMatch++;
  });

  return {
    ...stats,
    successRate: (stats.highConfidence + stats.mediumConfidence) / transcripts.length
  };
}
