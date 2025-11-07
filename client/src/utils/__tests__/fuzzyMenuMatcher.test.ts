/**
 * Unit tests for fuzzyMenuMatcher
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  findBestMatch,
  findMultipleMatches,
  addMenuVariation,
  getMenuVariations,
  type FuzzyMatchResult,
  type MultipleFuzzyMatchResult
} from '../fuzzyMenuMatcher';
import type { ApiMenuItem } from '@rebuild/shared';

// Mock menu items for testing
const createMenuItem = (id: string, name: string): ApiMenuItem => ({
  id,
  restaurantId: 'test-restaurant',
  categoryId: 'test-category',
  name,
  price: 12.99,
  isAvailable: true
});

describe('fuzzyMenuMatcher', () => {
  let menuItems: ApiMenuItem[];

  beforeEach(() => {
    menuItems = [
      createMenuItem('1', 'Soul Bowl'),
      createMenuItem('2', 'Greek Salad'),
      createMenuItem('3', 'Peach Arugula'),
      createMenuItem('4', 'Jalapeño Pimento'),
      createMenuItem('5', 'Succotash'),
      createMenuItem('6', 'Caesar Salad'),
      createMenuItem('7', 'Chicken Tenders'),
      createMenuItem('8', 'French Fries'),
      createMenuItem('9', 'Onion Rings')
    ];
  });

  describe('findBestMatch', () => {
    describe('exact matches', () => {
      it('should match exact item name with confidence 1.0', () => {
        const result = findBestMatch('soul bowl', menuItems);
        expect(result.item?.name).toBe('Soul Bowl');
        expect(result.confidence).toBe(1.0);
        expect(result.matchType).toBe('exact');
      });

      it('should be case-insensitive', () => {
        const result = findBestMatch('GREEK SALAD', menuItems);
        expect(result.item?.name).toBe('Greek Salad');
        expect(result.confidence).toBe(1.0);
        expect(result.matchType).toBe('exact');
      });

      it('should handle extra whitespace', () => {
        const result = findBestMatch('  caesar   salad  ', menuItems);
        expect(result.item?.name).toBe('Caesar Salad');
        expect(result.confidence).toBe(1.0);
        expect(result.matchType).toBe('exact');
      });

      it('should handle special characters', () => {
        const result = findBestMatch('jalapeño pimento', menuItems);
        expect(result.item?.name).toBe('Jalapeño Pimento');
        expect(result.confidence).toBe(1.0);
      });
    });

    describe('contains matches', () => {
      it('should match when input is substring of menu item', () => {
        const result = findBestMatch('greek', menuItems);
        expect(result.item?.name).toBe('Greek Salad');
        expect(result.confidence).toBeGreaterThan(0.5);
        // Note: 'greek' matches the 'greek salad' variation, so matchType is 'variation'
        expect(['contains', 'variation']).toContain(result.matchType);
      });

      it('should match when menu item is substring of input', () => {
        const result = findBestMatch('the soul bowl with extras', menuItems);
        expect(result.item?.name).toBe('Soul Bowl');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should match partial words', () => {
        const result = findBestMatch('fries', menuItems);
        expect(result.item?.name).toBe('French Fries');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should match single word from multi-word item', () => {
        const result = findBestMatch('chicken', menuItems);
        expect(result.item?.name).toBe('Chicken Tenders');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('variation matches', () => {
      it('should match "sobo" to "Soul Bowl"', () => {
        const result = findBestMatch('sobo', menuItems);
        expect(result.item?.name).toBe('Soul Bowl');
        expect(result.confidence).toBe(0.9);
        expect(result.matchType).toBe('variation');
      });

      it('should match "solo bowl" to "Soul Bowl"', () => {
        const result = findBestMatch('solo bowl', menuItems);
        expect(result.item?.name).toBe('Soul Bowl');
        expect(result.confidence).toBe(0.9);
      });

      it('should match "jalapeno" without accent to "Jalapeño Pimento"', () => {
        const result = findBestMatch('jalapeno', menuItems);
        expect(result.item?.name).toBe('Jalapeño Pimento');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should match "suck a toss" to "Succotash"', () => {
        const result = findBestMatch('suck a toss', menuItems);
        expect(result.item?.name).toBe('Succotash');
        expect(result.confidence).toBe(0.9);
      });

      it('should match "cesar" to "Caesar Salad"', () => {
        const result = findBestMatch('cesar', menuItems);
        expect(result.item?.name).toBe('Caesar Salad');
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    describe('phonetic/typo matches', () => {
      it('should match close typos', () => {
        const result = findBestMatch('greak salad', menuItems); // typo: greak -> greek
        expect(result.item?.name).toBe('Greek Salad');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should match with missing characters', () => {
        const result = findBestMatch('peach argula', menuItems); // missing 'u'
        expect(result.item?.name).toBe('Peach Arugula');
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it('should match with extra characters', () => {
        const result = findBestMatch('friees', menuItems, 0.3); // extra 'e' - ~33% confidence vs 'french fries'
        // 'friees' vs 'french fries' has significant edit distance
        expect(result.item).not.toBeNull();
        expect(result.confidence).toBeGreaterThanOrEqual(0.3);
      });
    });

    describe('threshold filtering', () => {
      it('should respect custom threshold', () => {
        const result = findBestMatch('xyz', menuItems, 0.9);
        expect(result.item).toBeNull();
        expect(result.confidence).toBe(0);
        expect(result.matchType).toBe('none');
      });

      it('should use default threshold of 0.5', () => {
        const result = findBestMatch('onion', menuItems);
        expect(result.item).not.toBeNull();
        expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      });

      it('should return no match for completely unrelated input', () => {
        const result = findBestMatch('quantum physics textbook', menuItems);
        expect(result.item).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle empty input', () => {
        const result = findBestMatch('', menuItems);
        expect(result.item).toBeNull();
        expect(result.confidence).toBe(0);
        expect(result.matchType).toBe('none');
      });

      it('should handle empty menu items array', () => {
        const result = findBestMatch('soul bowl', []);
        expect(result.item).toBeNull();
        expect(result.confidence).toBe(0);
      });

      it('should handle null/undefined gracefully', () => {
        const result = findBestMatch(null as any, menuItems);
        expect(result.item).toBeNull();
      });

      it('should handle single character input', () => {
        const result = findBestMatch('s', menuItems);
        // Should match something with 's' in it
        expect(result.item).not.toBeNull();
      });
    });

    describe('prioritization', () => {
      it('should prefer exact match over contains', () => {
        const items = [
          createMenuItem('1', 'Salad'),
          createMenuItem('2', 'Greek Salad')
        ];
        const result = findBestMatch('salad', items);
        expect(result.item?.name).toBe('Salad');
        expect(result.matchType).toBe('exact');
      });

      it('should prefer variation match over weak contains', () => {
        const result = findBestMatch('sobo', menuItems);
        expect(result.item?.name).toBe('Soul Bowl');
        expect(result.confidence).toBe(0.9);
      });
    });
  });

  describe('findMultipleMatches', () => {
    it('should return multiple salad matches', () => {
      const result = findMultipleMatches('salad', menuItems, 0.5);
      // Should find at least one salad (Greek or Caesar)
      expect(result.matches.length).toBeGreaterThanOrEqual(1);

      const names = result.matches.map(m => m.item.name);
      const hasSalad = names.some(name => name.includes('Salad'));
      expect(hasSalad).toBe(true);
    });

    it('should sort matches by confidence (descending)', () => {
      const result = findMultipleMatches('salad', menuItems, 0.5);

      for (let i = 1; i < result.matches.length; i++) {
        expect(result.matches[i - 1].confidence).toBeGreaterThanOrEqual(
          result.matches[i].confidence
        );
      }
    });

    it('should respect custom threshold', () => {
      const result = findMultipleMatches('salad', menuItems, 0.95);

      // Should only get very close matches
      result.matches.forEach(match => {
        expect(match.confidence).toBeGreaterThanOrEqual(0.95);
      });
    });

    it('should include match metadata', () => {
      const result = findMultipleMatches('salad', menuItems, 0.5);

      expect(result.matches.length).toBeGreaterThan(0);
      result.matches.forEach(match => {
        expect(match).toHaveProperty('item');
        expect(match).toHaveProperty('confidence');
        expect(match).toHaveProperty('matchType');
        expect(['exact', 'contains', 'variation']).toContain(match.matchType);
      });
    });

    it('should return empty array for no matches', () => {
      const result = findMultipleMatches('quantum physics', menuItems, 0.9);
      expect(result.matches).toEqual([]);
    });

    it('should handle empty input', () => {
      const result = findMultipleMatches('', menuItems);
      expect(result.matches).toEqual([]);
    });

    it('should use default threshold of 0.6', () => {
      const result = findMultipleMatches('sal', menuItems);

      // Should get salads with default threshold
      result.matches.forEach(match => {
        expect(match.confidence).toBeGreaterThanOrEqual(0.6);
      });
    });
  });

  describe('addMenuVariation', () => {
    it('should add new variations for existing item', () => {
      addMenuVariation('soul bowl', ['soul ball', 'sole bowl']);

      const result1 = findBestMatch('soul ball', menuItems);
      expect(result1.item?.name).toBe('Soul Bowl');

      const result2 = findBestMatch('sole bowl', menuItems);
      expect(result2.item?.name).toBe('Soul Bowl');
    });

    it('should create new entry for new menu item', () => {
      addMenuVariation('new item', ['alias1', 'alias2']);

      const variations = getMenuVariations();
      expect(variations['new item']).toContain('alias1');
      expect(variations['new item']).toContain('alias2');
    });

    it('should normalize variations', () => {
      addMenuVariation('Test Item', ['  UPPER case  ', 'MiXeD-CaSe!']);

      const variations = getMenuVariations();
      expect(variations['test item']).toBeDefined();
    });
  });

  describe('getMenuVariations', () => {
    it('should return all registered variations', () => {
      const variations = getMenuVariations();

      expect(variations).toHaveProperty('soul bowl');
      expect(variations).toHaveProperty('greek salad');
      expect(variations).toHaveProperty('succotash');
    });

    it('should return a copy (not reference)', () => {
      const variations1 = getMenuVariations();
      const variations2 = getMenuVariations();

      expect(variations1).not.toBe(variations2);
      expect(variations1).toEqual(variations2);
    });

    it('should include all predefined variations', () => {
      const variations = getMenuVariations();

      expect(variations['soul bowl']).toContain('sobo');
      expect(variations['succotash']).toContain('suck a toss');
      expect(variations['caesar salad']).toContain('cesar');
    });
  });

  describe('real-world voice recognition scenarios', () => {
    it('should handle common voice recognition errors', () => {
      const testCases = [
        { input: 'sold bowl', expected: 'Soul Bowl' },
        { input: 'greek salad please', expected: 'Greek Salad' },
        { input: 'i want fries', expected: 'French Fries' },
        { input: 'gimme some onion rings', expected: 'Onion Rings' },
        { input: 'chicken tinder', expected: 'Chicken Tenders' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = findBestMatch(input, menuItems);
        expect(result.item?.name).toBe(expected);
      });
    });

    it('should handle concatenated words', () => {
      const result = findBestMatch('greeksalad', menuItems);
      expect(result.item?.name).toBe('Greek Salad');
    });

    it('should handle common phonetic spellings', () => {
      // Test cesar -> Caesar (has variation)
      const cesarResult = findBestMatch('cesar salad', menuItems, 0.5);
      expect(cesarResult.item?.name).toBe('Caesar Salad');

      // Test arugla -> Arugula (missing 'u')
      const aruglaResult = findBestMatch('arugla', menuItems, 0.4);
      expect(aruglaResult.item).not.toBeNull();
      expect(aruglaResult.confidence).toBeGreaterThanOrEqual(0.4);

      // Test onion (full word works better than phonetic typo)
      const onionResult = findBestMatch('onion', menuItems, 0.5);
      expect(onionResult.item?.name).toBe('Onion Rings');
    });
  });

  describe('performance considerations', () => {
    it('should handle large menu efficiently', () => {
      const largeMenu = Array.from({ length: 1000 }, (_, i) =>
        createMenuItem(`item-${i}`, `Menu Item ${i}`)
      );

      const startTime = Date.now();
      findBestMatch('menu item 500', largeMenu);
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 100ms for 1000 items)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple matches on large menu', () => {
      const largeMenu = Array.from({ length: 1000 }, (_, i) =>
        createMenuItem(`item-${i}`, `Item ${i}`)
      );

      const startTime = Date.now();
      findMultipleMatches('item', largeMenu, 0.8);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);
    });
  });
});
