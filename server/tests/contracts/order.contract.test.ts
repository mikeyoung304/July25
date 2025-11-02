import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { OrderPayload } from '../../../shared/contracts/order';

describe('Order Contract Validation', () => {
  describe('OrderPayload schema', () => {
    it('should accept valid order payload with snake_case per ADR-001', () => {
      // ADR-001 Phase 1: Schema accepts both camelCase and snake_case during transition
      // This test verifies snake_case support is working correctly
      const validOrder = {
        type: 'dine_in',
        table_number: 5,
        customer_name: 'John Doe',
        items: [
          {
            id: '1',
            menu_item_id: 'item-123',  // Correct field name per schema
            name: 'Test Item',
            quantity: 2,
            price: 12.99,
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

    it('should reject missing required fields (items)', () => {
      const invalidOrder = {
        table_number: 5,
        type: 'dine_in',
        // Missing items (required field)
      };

      const result = OrderPayload.safeParse(invalidOrder);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
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

    it('should accept optional fields (snake_case per ADR-001)', () => {
      // ADR-001 Phase 1: Schema accepts both camelCase and snake_case during transition
      // This test verifies optional fields work with snake_case
      const orderWithOptionals = {
        type: 'delivery',
        customer_name: 'John Doe',
        table_number: 0,
        items: [
          {
            id: '1',
            menu_item_id: 'item-123',  // Correct field name per schema
            name: 'Test Item',
            quantity: 1,
            price: 8.99,
            notes: 'Extra sauce'
          }
        ]
      };

      const result = OrderPayload.safeParse(orderWithOptionals);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customer_name).toBe('John Doe');
        expect(result.data.table_number).toBe(0);
      }
    });
  });
});