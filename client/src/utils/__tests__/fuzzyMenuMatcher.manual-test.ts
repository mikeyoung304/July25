/**
 * Manual Test Script for Fuzzy Menu Matcher
 *
 * This script demonstrates the fuzzy menu matcher in action
 * Run with: npx tsx src/utils/__tests__/fuzzyMenuMatcher.manual-test.ts
 */

import {
  findBestMatch,
  findMultipleMatches,
  addMenuVariation,
  getMenuVariations,
  type FuzzyMatchResult,
  type MultipleFuzzyMatchResult
} from '../fuzzyMenuMatcher';
import type { ApiMenuItem } from '@rebuild/shared';

// Create sample menu items
const createMenuItem = (id: string, name: string, price: number = 12.99): ApiMenuItem => ({
  id,
  restaurantId: 'test-restaurant',
  categoryId: 'test-category',
  name,
  price,
  isAvailable: true
});

// Sample menu for a restaurant
const sampleMenu: ApiMenuItem[] = [
  createMenuItem('1', 'Soul Bowl', 14.99),
  createMenuItem('2', 'Greek Salad', 10.99),
  createMenuItem('3', 'Peach Arugula', 11.99),
  createMenuItem('4', 'Jalapeño Pimento', 8.99),
  createMenuItem('5', 'Succotash', 7.99),
  createMenuItem('6', 'Caesar Salad', 10.99),
  createMenuItem('7', 'Chicken Tenders', 12.99),
  createMenuItem('8', 'French Fries', 4.99),
  createMenuItem('9', 'Onion Rings', 5.99),
  createMenuItem('10', 'Buffalo Wings', 13.99),
  createMenuItem('11', 'Mac and Cheese', 9.99),
  createMenuItem('12', 'Sweet Potato Fries', 5.99),
];

// Helper to format match results
function formatMatchResult(result: FuzzyMatchResult): string {
  if (!result.item) {
    return '❌ No match found';
  }

  const confidence = (result.confidence * 100).toFixed(1);
  const matchTypeEmoji = {
    exact: '✅',
    variation: '🔄',
    contains: '🔍',
    none: '❌'
  };

  return `${matchTypeEmoji[result.matchType]} Matched: "${result.item.name}" | Confidence: ${confidence}% | Type: ${result.matchType}`;
}

// Helper to format multiple matches
function formatMultipleMatches(results: MultipleFuzzyMatchResult): string {
  if (results.matches.length === 0) {
    return '❌ No matches found';
  }

  return results.matches
    .map((match, index) => {
      const confidence = (match.confidence * 100).toFixed(1);
      return `  ${index + 1}. "${match.item.name}" - ${confidence}% (${match.matchType})`;
    })
    .join('\n');
}

// Test cases
console.log('═══════════════════════════════════════════════════════');
console.log('🧪 FUZZY MENU MATCHER - MANUAL TEST SUITE');
console.log('═══════════════════════════════════════════════════════\n');

// 1. Exact Matches
console.log('📋 TEST 1: EXACT MATCHES');
console.log('─────────────────────────────────────────────────────');
const exactTests = [
  'soul bowl',
  'GREEK SALAD',
  '  caesar salad  ',
  'jalapeño pimento'
];

exactTests.forEach(input => {
  const result = findBestMatch(input, sampleMenu);
  console.log(`Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 2. Fuzzy/Partial Matches
console.log('\n📋 TEST 2: FUZZY & PARTIAL MATCHES');
console.log('─────────────────────────────────────────────────────');
const fuzzyTests = [
  'greek',
  'fries',
  'chicken',
  'salad'
];

fuzzyTests.forEach(input => {
  const result = findBestMatch(input, sampleMenu);
  console.log(`Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 3. Known Variations (Voice Recognition Errors)
console.log('\n📋 TEST 3: KNOWN VARIATIONS (Voice Recognition)');
console.log('─────────────────────────────────────────────────────');
const variationTests = [
  'sobo',           // Soul Bowl
  'solo bowl',      // Soul Bowl
  'soul ball',      // Soul Bowl
  'suck a toss',    // Succotash
  'cesar',          // Caesar (common misspelling)
  'jalapeno',       // Jalapeño (without accent)
];

variationTests.forEach(input => {
  const result = findBestMatch(input, sampleMenu);
  console.log(`Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 4. Phonetic/Typo Matches
console.log('\n📋 TEST 4: PHONETIC & TYPO MATCHES');
console.log('─────────────────────────────────────────────────────');
const typoTests = [
  'greak salad',    // Greek Salad (typo)
  'peach argula',   // Peach Arugula (missing 'u')
  'friees',         // Fries (extra 'e')
  'onyon rings',    // Onion Rings (phonetic)
  'chiken tenders', // Chicken Tenders (typo)
];

typoTests.forEach(input => {
  const result = findBestMatch(input, sampleMenu, 0.4); // Lower threshold for typos
  console.log(`Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 5. Multiple Matches
console.log('\n📋 TEST 5: FINDING MULTIPLE MATCHES');
console.log('─────────────────────────────────────────────────────');
const multipleTests = [
  { input: 'salad', threshold: 0.6 },
  { input: 'fries', threshold: 0.5 },
  { input: 'bowl', threshold: 0.5 }
];

multipleTests.forEach(({ input, threshold }) => {
  const results = findMultipleMatches(input, sampleMenu, threshold);
  console.log(`Input: "${input}" (threshold: ${threshold})`);
  console.log(formatMultipleMatches(results));
  console.log();
});

// 6. Voice Recognition Scenarios
console.log('\n📋 TEST 6: REAL-WORLD VOICE SCENARIOS');
console.log('─────────────────────────────────────────────────────');
const voiceTests = [
  'i want a soul bowl please',
  'can i get some fries',
  'gimme greek salad',
  'one order of chicken tenders',
  'sold bowl',  // Common voice recognition error
];

voiceTests.forEach(input => {
  const result = findBestMatch(input, sampleMenu);
  console.log(`Voice Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 7. Edge Cases
console.log('\n📋 TEST 7: EDGE CASES');
console.log('─────────────────────────────────────────────────────');
const edgeCases = [
  '',
  'quantum physics textbook',
  's',
  'greeksalad',  // Concatenated
  'xyz123',
];

edgeCases.forEach(input => {
  const result = findBestMatch(input, sampleMenu);
  console.log(`Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 8. Adding Custom Variations
console.log('\n📋 TEST 8: ADDING CUSTOM VARIATIONS');
console.log('─────────────────────────────────────────────────────');
console.log('Adding custom variations for "Buffalo Wings"...');
addMenuVariation('buffalo wings', ['buff wings', 'wing things', 'hot wings']);

const customTests = [
  'buff wings',
  'wing things',
  'hot wings'
];

customTests.forEach(input => {
  const result = findBestMatch(input, sampleMenu);
  console.log(`Input: "${input}"`);
  console.log(formatMatchResult(result));
  console.log();
});

// 9. Performance Test
console.log('\n📋 TEST 9: PERFORMANCE TEST');
console.log('─────────────────────────────────────────────────────');

// Create a large menu (1000 items)
const largeMenu = Array.from({ length: 1000 }, (_, i) =>
  createMenuItem(`item-${i}`, `Menu Item ${i}`, 9.99 + (i % 10))
);

const perfTests = [
  { name: 'Find Best Match (1000 items)', fn: () => findBestMatch('menu item 500', largeMenu) },
  { name: 'Find Multiple Matches (1000 items)', fn: () => findMultipleMatches('item', largeMenu, 0.8) }
];

perfTests.forEach(({ name, fn }) => {
  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const duration = Date.now() - startTime;
  const avgTime = (duration / iterations).toFixed(2);

  console.log(`${name}:`);
  console.log(`  Total Time: ${duration}ms (${iterations} iterations)`);
  console.log(`  Average Time: ${avgTime}ms per operation`);
  console.log();
});

// 10. Show All Registered Variations
console.log('\n📋 TEST 10: REGISTERED VARIATIONS');
console.log('─────────────────────────────────────────────────────');
const variations = getMenuVariations();
console.log('All registered menu variations:');
Object.entries(variations).forEach(([menuItem, aliases]) => {
  console.log(`\n"${menuItem}":`);
  aliases.forEach(alias => console.log(`  - "${alias}"`));
});

console.log('\n═══════════════════════════════════════════════════════');
console.log('✅ MANUAL TEST SUITE COMPLETE');
console.log('═══════════════════════════════════════════════════════');
