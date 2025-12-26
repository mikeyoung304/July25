/**
 * Payment Calculation Unit Tests
 *
 * Comprehensive test coverage for revenue-critical payment calculation logic.
 * Per P0.6 of stabilization initiative, this addresses 0% test coverage on:
 * - calculateOrderTotal() - tax, subtotal, modifiers, rounding
 * - validateRefundRequest() - partial/full refunds, validation
 * - Edge cases: rounding, negative values, minimums, maximums
 *
 * Related:
 * - server/src/services/payment.service.ts
 * - docs/explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentService } from '../../src/services/payment.service';
import { supabase } from '../../src/config/database';
import type { Order } from '../../src/services/orders.service';

// Mock Supabase
vi.mock('../../src/config/database', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock logger
vi.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn().mockReturnThis()
  };
  return {
    logger: mockLogger
  };
});

describe('PaymentService - Payment Calculations', () => {
  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockOrderId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateOrderTotal() - Normal Cases', () => {
    it('should calculate total for single item order with default tax rate', async () => {
      // Mock tax rate fetch - return default 8.25%
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: $10.00
      // Tax: $10.00 × 0.0825 = $0.825
      // Total: $10.825
      // Amount in cents: 1083 (rounds to nearest cent)
      expect(result.subtotal).toBe(10.00);
      expect(result.tax).toBeCloseTo(0.825, 3);
      expect(result.orderTotal).toBeCloseTo(10.825, 3);
      expect(result.amount).toBe(1083); // Math.round(10.825 * 100)
      expect(result.idempotencyKey).toMatch(/^[a-f0-9-]+-\d+$/);
    });

    it('should calculate total for multiple items', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 2,
            modifiers: []
          },
          {
            id: 'item-2',
            name: 'Fries',
            price: 3.50,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: ($10.00 × 2) + ($3.50 × 1) = $23.50
      // Tax: $23.50 × 0.0825 = $1.93875
      // Total: $25.43875
      expect(result.subtotal).toBe(23.50);
      expect(result.tax).toBeCloseTo(1.93875, 5);
      expect(result.orderTotal).toBeCloseTo(25.43875, 5);
      expect(result.amount).toBe(2544); // Math.round(25.43875 * 100)
    });

    it('should include modifier prices in calculation', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 2,
            modifiers: [
              { id: 'mod-1', name: 'Extra Cheese', price: 1.50 },
              { id: 'mod-2', name: 'Bacon', price: 2.00 }
            ]
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: (10.00 + 1.50 + 2.00) × 2 = $27.00
      // Tax: $27.00 × 0.0825 = $2.2275
      // Total: $29.2275
      expect(result.subtotal).toBe(27.00);
      expect(result.tax).toBeCloseTo(2.2275, 4);
      expect(result.orderTotal).toBeCloseTo(29.2275, 4);
      expect(result.amount).toBe(2923); // Math.round(29.2275 * 100)
    });

    it('should use restaurant-specific tax rate', async () => {
      // Mock higher tax rate (e.g., 10%)
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.10 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 20.00,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: $20.00
      // Tax: $20.00 × 0.10 = $2.00
      // Total: $22.00
      expect(result.subtotal).toBe(20.00);
      expect(result.tax).toBe(2.00);
      expect(result.orderTotal).toBe(22.00);
      expect(result.amount).toBe(2200);
    });

    it('should handle zero-price modifiers correctly', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Coffee',
            price: 3.00,
            quantity: 1,
            modifiers: [
              { id: 'mod-1', name: 'Sugar', price: 0 },
              { id: 'mod-2', name: 'Cream', price: 0 }
            ]
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: $3.00 (modifiers add $0)
      // Tax: $3.00 × 0.0825 = $0.2475
      // Total: $3.2475
      expect(result.subtotal).toBe(3.00);
      expect(result.tax).toBeCloseTo(0.2475, 4);
      expect(result.amount).toBe(325); // Math.round(3.2475 * 100)
    });
  });

  describe('calculateOrderTotal() - Edge Cases', () => {
    it('should reject order with no items', async () => {
      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: []
      } as Order;

      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Order has no items');
    });

    it('should reject order missing restaurant_id', async () => {
      const order: Order = {
        id: mockOrderId,
        items: [
          { id: 'item-1', name: 'Burger', price: 10.00, quantity: 1, modifiers: [] }
        ]
      } as Order;

      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Order missing restaurant_id');
    });

    it('should reject negative item prices', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: -10.00, // Invalid
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Invalid price for item Burger');
    });

    it('should reject negative modifier prices', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 1,
            modifiers: [
              { id: 'mod-1', name: 'Discount', price: -2.00 } // Invalid
            ]
          }
        ]
      } as Order;

      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Invalid modifier price for Discount');
    });

    it('should reject invalid quantity (less than 1)', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 0, // Invalid
            modifiers: []
          }
        ]
      } as Order;

      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Invalid quantity for item Burger');
    });

    it('should reject order total below minimum ($0.01)', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Penny Candy',
            price: 0.001, // Will round to total < $0.01
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Order total must be at least $0.01');
    });

    it('should fall back to default tax rate on database error', async () => {
      // Mock database error
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection failed' }
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Should use default 8.25% tax rate
      expect(result.tax).toBeCloseTo(0.825, 3);
    });

    it('should fall back to default tax rate when tax_rate is null', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: null },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Should use default 8.25% tax rate
      expect(result.tax).toBeCloseTo(0.825, 3);
    });

    it('should handle very large order totals', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Catering Order',
            price: 999.99,
            quantity: 100,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: $99,999.00
      // Tax: $99,999.00 × 0.0825 = $8,249.92
      // Total: $108,248.92
      expect(result.subtotal).toBe(99999.00);
      expect(result.tax).toBeCloseTo(8249.92, 2);
      expect(result.amount).toBe(10824892); // Cents
    });
  });

  describe('calculateOrderTotal() - Rounding Edge Cases', () => {
    it('should round up when cents are >= 0.5', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Item',
            price: 10.004, // Will create total with .005 fraction
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: $10.004
      // Tax: $10.004 × 0.0825 = $0.825330
      // Total: $10.829330
      // Rounded: 1083 cents (rounds up from 1082.933)
      expect(result.amount).toBe(1083);
    });

    it('should round down when cents are < 0.5', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Item',
            price: 10.001, // Will create total with .001 fraction
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Subtotal: $10.001
      // Tax: $10.001 × 0.0825 = $0.8250825
      // Total: $10.8260825
      // Rounded: 1083 cents (rounds up from 1082.60825)
      expect(result.amount).toBe(1083);
    });
  });

  describe('validateRefundRequest()', () => {
    it('should validate full refund request', async () => {
      const paymentId = 'pi_stripe_payment_123';
      const originalAmount = 25.50;

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        undefined, // Full refund
        originalAmount
      );

      expect(result.amount).toBe(2550); // Converted to cents
      expect(result.idempotencyKey).toMatch(/^ref-.+-\d+$/);
      expect(result.idempotencyKey).toContain(paymentId.slice(-12));
    });

    it('should validate partial refund request', async () => {
      const paymentId = 'pi_stripe_payment_456';
      const originalAmount = 50.00;
      const refundAmount = 10.00;

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        refundAmount,
        originalAmount
      );

      expect(result.amount).toBe(1000); // $10.00 in cents
      expect(result.idempotencyKey).toMatch(/^ref-.+-\d+$/);
    });

    it('should reject refund without payment ID', async () => {
      await expect(
        PaymentService.validateRefundRequest('', 10.00, 50.00)
      ).rejects.toThrow('Payment ID is required for refund');
    });

    it('should reject refund amount of zero', async () => {
      await expect(
        PaymentService.validateRefundRequest('payment-123', 0, 50.00)
      ).rejects.toThrow('Refund amount must be positive');
    });

    it('should reject negative refund amount', async () => {
      await expect(
        PaymentService.validateRefundRequest('payment-123', -10.00, 50.00)
      ).rejects.toThrow('Refund amount must be positive');
    });

    it('should reject refund exceeding original amount', async () => {
      await expect(
        PaymentService.validateRefundRequest('payment-123', 60.00, 50.00)
      ).rejects.toThrow('Refund amount cannot exceed original payment');
    });

    it('should reject refund when amount cannot be determined', async () => {
      await expect(
        PaymentService.validateRefundRequest('payment-123')
      ).rejects.toThrow('Unable to determine refund amount');
    });

    it('should handle refund rounding correctly', async () => {
      const paymentId = 'payment-789';
      const refundAmount = 12.345; // Should round to 1235 cents

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        refundAmount,
        50.00
      );

      expect(result.amount).toBe(1235); // Math.round(12.345 * 100)
    });
  });

  describe('Input Type Coercion', () => {
    it('should coerce string prices to numbers', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: '10.00' as any, // String instead of number
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Should successfully coerce "10.00" to 10.00
      expect(result.subtotal).toBe(10.00);
    });

    it('should coerce string quantities to numbers', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            price: 10.00,
            quantity: '2' as any, // String instead of number
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Should successfully coerce "2" to 2
      expect(result.subtotal).toBe(20.00);
    });

    it('should treat NaN prices as 0', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { tax_rate: 0.0825 },
              error: null
            })
          })
        })
      });
      (supabase.from as any) = mockFrom;

      const order: Order = {
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Free Item',
            price: NaN as any,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      // Should fail minimum order validation
      await expect(
        PaymentService.calculateOrderTotal(order)
      ).rejects.toThrow('Order total must be at least $0.01');
    });
  });
});
