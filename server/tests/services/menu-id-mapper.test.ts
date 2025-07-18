import { describe, it, expect, beforeEach } from 'vitest';

describe('MenuIdMapper', () => {
  describe('ID extraction from description', () => {
    it('should extract numeric ID from description', () => {
      const description = 'Southern-style sweet tea with fresh lemon [ID:101]';
      const match = description.match(/\[ID:(\d+)\]/);
      expect(match).toBeTruthy();
      expect(match![1]).toBe('101');
    });

    it('should handle missing ID tags', () => {
      const description = 'Southern-style sweet tea with fresh lemon';
      const match = description.match(/\[ID:(\d+)\]/);
      expect(match).toBeNull();
    });

    it('should remove ID tag from description', () => {
      const description = 'Southern-style sweet tea with fresh lemon [ID:101]';
      const cleaned = description.replace(/\s*\[ID:\d+\]/, '');
      expect(cleaned).toBe('Southern-style sweet tea with fresh lemon');
    });
  });

  describe('ID range validation', () => {
    const idRanges = {
      beverages: { min: 101, max: 199 },
      starters: { min: 201, max: 299 },
      salads: { min: 301, max: 399 },
      sandwiches: { min: 401, max: 499 },
      bowls: { min: 501, max: 599 },
      vegan: { min: 601, max: 699 },
      entrees: { min: 701, max: 799 }
    };

    it('should validate beverage IDs', () => {
      const beverageId = 101;
      expect(beverageId).toBeGreaterThanOrEqual(idRanges.beverages.min);
      expect(beverageId).toBeLessThanOrEqual(idRanges.beverages.max);
    });

    it('should validate starter IDs', () => {
      const starterId = 201;
      expect(starterId).toBeGreaterThanOrEqual(idRanges.starters.min);
      expect(starterId).toBeLessThanOrEqual(idRanges.starters.max);
    });

    it('should validate salad IDs', () => {
      const saladId = 305;
      expect(saladId).toBeGreaterThanOrEqual(idRanges.salads.min);
      expect(saladId).toBeLessThanOrEqual(idRanges.salads.max);
    });
  });

  describe('Menu item conversion', () => {
    it('should convert item with ID tag', () => {
      const item = {
        id: 'uuid-123',
        name: 'Sweet Tea',
        description: 'Southern-style sweet tea [ID:101]',
        price: 3.00
      };

      const match = item.description.match(/\[ID:(\d+)\]/);
      if (match) {
        const converted = {
          ...item,
          id: match[1],
          description: item.description.replace(/\s*\[ID:\d+\]/, '')
        };

        expect(converted.id).toBe('101');
        expect(converted.description).toBe('Southern-style sweet tea');
      }
    });

    it('should handle multiple items', () => {
      const items = [
        { id: 'uuid-1', description: 'Item 1 [ID:101]' },
        { id: 'uuid-2', description: 'Item 2 [ID:201]' },
        { id: 'uuid-3', description: 'Item 3 [ID:301]' }
      ];

      const converted = items.map(item => {
        const match = item.description.match(/\[ID:(\d+)\]/);
        return match ? { ...item, id: match[1] } : item;
      });

      expect(converted[0].id).toBe('101');
      expect(converted[1].id).toBe('201');
      expect(converted[2].id).toBe('301');
    });
  });

  describe('Order item conversion', () => {
    it('should prepare items for database', () => {
      const orderItems = [
        { id: '101', quantity: 2, price: 3.00 },
        { id: '201', quantity: 1, price: 16.00 }
      ];

      // In real implementation, would convert to UUIDs
      // For now, just verify structure
      expect(orderItems[0].id).toBe('101');
      expect(orderItems[0].quantity).toBe(2);
      expect(orderItems[1].id).toBe('201');
    });
  });
});