import { describe, it, expect } from 'vitest';
import { validateCreateOrderDTO, CreateOrderDTOSchema } from '../order.dto';
import { ZodError } from 'zod';

describe('Order DTO Validation', () => {
  describe('validateCreateOrderDTO', () => {
    it('should require all mandatory fields', () => {
      const invalidOrder = {
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 1,
            // Missing price!
          }
        ],
        // Missing subtotal, tax, total!
      };

      expect(() => validateCreateOrderDTO(invalidOrder)).toThrow(ZodError);
    });

    it('should validate a complete order with all required fields', () => {
      const validOrder = {
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: 12.99,
            modifiers: [{ name: 'Extra cheese', price: 1.50 }]
          }
        ],
        subtotal: 14.49,
        tax: 1.16,
        tip: 2.00,
        total: 17.65,
        type: 'dine-in',
        customerName: 'John Doe',
        tableNumber: 'A1'
      };

      const result = validateCreateOrderDTO(validOrder);
      expect(result).toEqual(validOrder);
      expect(result.subtotal).toBe(14.49);
      expect(result.tax).toBe(1.16);
      expect(result.total).toBe(17.65);
    });

    it('should transform legacy snake_case fields to camelCase', () => {
      const legacyOrder = {
        items: [
          {
            menu_item_id: 'item-1', // Legacy field
            id: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: 12.99
          }
        ],
        customer_name: 'John Doe', // Legacy field
        table_number: 'A1', // Legacy field
        order_type: 'dine-in', // Legacy field
        subtotal: 12.99,
        tax: 1.04,
        total_amount: 14.03, // Legacy field
        total: 14.03
      };

      const result = validateCreateOrderDTO(legacyOrder);
      expect(result.customerName).toBe('John Doe');
      expect(result.tableNumber).toBe('A1');
      expect(result.type).toBe('dine-in');
      expect(result.total).toBe(14.03);
    });

    it('should reject orders with missing items', () => {
      const orderWithoutItems = {
        items: [], // Empty array
        subtotal: 0,
        tax: 0,
        total: 0
      };

      expect(() => validateCreateOrderDTO(orderWithoutItems))
        .toThrow('Order must contain at least one item');
    });

    it('should require positive values for financial fields', () => {
      const orderWithNegativeValues = {
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: -12.99 // Negative price!
          }
        ],
        subtotal: -12.99, // Negative subtotal!
        tax: -1.04, // Negative tax!
        total: -14.03 // Negative total!
      };

      expect(() => validateCreateOrderDTO(orderWithNegativeValues))
        .toThrow(ZodError);
    });

    it('should default tip to 0 if not provided', () => {
      const orderWithoutTip = {
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: 12.99
          }
        ],
        subtotal: 12.99,
        tax: 1.04,
        total: 14.03
        // No tip field
      };

      const result = validateCreateOrderDTO(orderWithoutTip);
      expect(result.tip).toBe(0);
    });
  });
});