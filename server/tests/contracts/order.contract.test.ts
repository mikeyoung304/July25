import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { OrderPayload } from '../../../shared/contracts/order';

describe('Order Contract Validation', () => {
  describe('OrderPayload schema', () => {
    it('should accept valid camelCase order payload', () => {
      const validOrder = {
        type: 'dine_in',
        tableNumber: 5,
        customerName: 'John Doe',
        items: [
          {
            itemId: 'item-123',
            quantity: 2,
            notes: 'No onions'
          }
        ]
      };

      const result = OrderPayload.safeParse(validOrder);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('dine_in');
      }
    });

    it('should reject snake_case order payload', () => {
      const snakeCaseOrder = {
        order_type: 'dine_in',                 // snake_case (should be 'type')
        table_number: 5,                       // snake_case (correct field)
        customer_name: 'John Doe',             // snake_case (correct field)
        items: [
          {
            item_id: 'item-123',              // snake_case (should be 'itemId')
            quantity: 2,
            special_notes: 'No onions'        // snake_case (should be 'notes')
          }
        ]
      };

      const result = OrderPayload.safeParse(snakeCaseOrder);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const invalidOrder = {
        tableNumber: 5,
        // Missing type and items
      };

      const result = OrderPayload.safeParse(invalidOrder);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('type');
        expect(issues).toContain('items');
      }
    });

    it('should require at least one item', () => {
      const orderNoItems = {
        type: 'dine_in',
        customerName: 'John Doe',
        items: []  // Empty items array
      };

      const result = OrderPayload.safeParse(orderNoItems);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues;
        expect(issues.some(i => i.message.includes('at least 1'))).toBe(true);
      }
    });

    it('should accept optional fields', () => {
      const orderWithOptionals = {
        type: 'delivery',
        customerName: 'John Doe',
        tableNumber: 0,
        items: [
          {
            itemId: 'item-123',
            quantity: 1,
            notes: 'Extra sauce'
          }
        ]
      };

      const result = OrderPayload.safeParse(orderWithOptionals);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customerName).toBe('John Doe');
        expect(result.data.tableNumber).toBe(0);
      }
    });
  });
});