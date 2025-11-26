/**
 * Payment Idempotency Unit Tests
 *
 * Tests idempotency key generation and handling for Stripe payments.
 * Per ADR-009 and SECURITY.md, payment audit logging must use fail-fast
 * error handling to ensure no charges occur without an audit trail.
 *
 * Related:
 * - server/src/services/payment.service.ts
 * - docs/explanation/architecture-decisions/ADR-009-payment-audit-logging.md
 * - plans/feat-integration-and-load-testing.md (INT-004)
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

// Mock OrdersService
vi.mock('../../src/services/orders.service', () => ({
  OrdersService: {
    getOrder: vi.fn()
  }
}));

describe('PaymentService - Idempotency', () => {
  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockOrderId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('idempotency key generation', () => {
    it('should generate key in format: {order_id_last12}-{timestamp}', async () => {
      // Mock tax rate fetch
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

      const fixedTime = 1700000000000;
      vi.setSystemTime(fixedTime);

      const result = await PaymentService.calculateOrderTotal(order);

      // Should include last 12 chars of order ID + timestamp
      const expectedPrefix = mockOrderId.slice(-12);
      expect(result.idempotencyKey).toContain(expectedPrefix);
      expect(result.idempotencyKey).toContain(String(fixedTime));
    });

    it('should generate key under 45 characters (Stripe max)', async () => {
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

      // Long order ID to test truncation
      const longOrderId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

      const order: Order = {
        id: longOrderId,
        restaurant_id: mockRestaurantId,
        items: [
          {
            id: 'item-1',
            name: 'Test',
            price: 10.00,
            quantity: 1,
            modifiers: []
          }
        ]
      } as Order;

      const result = await PaymentService.calculateOrderTotal(order);

      // Max 45 chars per Stripe requirements
      expect(result.idempotencyKey.length).toBeLessThanOrEqual(45);
    });

    it('should generate unique keys for different timestamps', async () => {
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

      vi.setSystemTime(1700000000000);
      const result1 = await PaymentService.calculateOrderTotal(order);

      vi.setSystemTime(1700000001000);
      const result2 = await PaymentService.calculateOrderTotal(order);

      expect(result1.idempotencyKey).not.toBe(result2.idempotencyKey);
    });
  });

  describe('refund idempotency key', () => {
    it('should generate refund key with "ref-" prefix', async () => {
      const paymentId = 'pay_1234567890abcdef';

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        25.50, // requested amount
        50.00  // original amount
      );

      expect(result.idempotencyKey).toMatch(/^ref-/);
    });

    it('should include payment ID in refund key', async () => {
      const paymentId = 'pay_1234567890abcdef';

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        25.50,
        50.00
      );

      // Should include last 12 chars of payment ID
      expect(result.idempotencyKey).toContain(paymentId.slice(-12));
    });

    it('should generate refund key under 45 characters', async () => {
      const longPaymentId = 'pay_aaaabbbbccccddddeeeeffffgggg';

      const result = await PaymentService.validateRefundRequest(
        longPaymentId,
        25.50,
        50.00
      );

      expect(result.idempotencyKey.length).toBeLessThanOrEqual(45);
    });
  });

  describe('audit logging - two-phase commit', () => {
    it('should log payment attempt with initiated status', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.logPaymentAttempt({
        orderId: mockOrderId,
        amount: 25.50,
        status: 'initiated',
        userId: 'user-123',
        restaurantId: mockRestaurantId,
        paymentMethod: 'card',
        idempotencyKey: 'test-key-123'
      });

      expect(mockFrom).toHaveBeenCalledWith('payment_audit_logs');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: mockOrderId,
          status: 'initiated',
          idempotency_key: 'test-key-123'
        })
      );
    });

    it('should throw error when audit log insert fails (fail-fast per ADR-009)', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        error: { message: 'Database error' }
      });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });
      (supabase.from as any) = mockFrom;

      await expect(
        PaymentService.logPaymentAttempt({
          orderId: mockOrderId,
          amount: 25.50,
          status: 'initiated',
          restaurantId: mockRestaurantId
        })
      ).rejects.toThrow(/Payment processing unavailable.*audit system failure/);
    });

    it('should update audit status after payment completion', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null, count: 1 })
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.updatePaymentAuditStatus(
        'test-key-123',
        'success',
        'pi_stripe_payment_id'
      );

      expect(mockFrom).toHaveBeenCalledWith('payment_audit_logs');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          payment_id: 'pi_stripe_payment_id'
        })
      );
    });

    it('should throw error when audit status update fails', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'Update failed' },
          count: 0
        })
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate
      });
      (supabase.from as any) = mockFrom;

      await expect(
        PaymentService.updatePaymentAuditStatus(
          'test-key-123',
          'success',
          'pi_stripe_payment_id'
        )
      ).rejects.toThrow(/Payment audit system failure/);
    });

    it('should throw error when no audit log found to update', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
          count: 0
        })
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate
      });
      (supabase.from as any) = mockFrom;

      await expect(
        PaymentService.updatePaymentAuditStatus(
          'nonexistent-key',
          'success',
          'pi_stripe_payment_id'
        )
      ).rejects.toThrow(/audit log not found/);
    });

    it('should include error details when logging failed payment', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null, count: 1 })
      });
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.updatePaymentAuditStatus(
        'test-key-123',
        'failed',
        undefined,
        'card_declined',
        'Your card was declined'
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_code: 'card_declined',
          error_detail: 'Your card was declined'
        })
      );
    });
  });

  describe('payment validation with idempotency', () => {
    it('should warn when client provides idempotency key', async () => {
      const { OrdersService } = await import('../../src/services/orders.service');
      const { logger } = await import('../../src/utils/logger');

      // Mock order retrieval
      (OrdersService.getOrder as any).mockResolvedValue({
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
      });

      // Mock tax rate fetch
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

      await PaymentService.validatePaymentRequest(
        mockOrderId,
        mockRestaurantId,
        10.83, // client amount (matching expected total)
        'client-provided-key' // Client's attempt to provide idempotency key
      );

      // Should log a warning that client tried to provide their own key
      expect(logger.warn).toHaveBeenCalledWith(
        'Client attempted to provide idempotency key',
        expect.objectContaining({
          clientKey: 'client-provided-key'
        })
      );
    });

    it('should always generate server-side idempotency key', async () => {
      const { OrdersService } = await import('../../src/services/orders.service');

      (OrdersService.getOrder as any).mockResolvedValue({
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
      });

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

      const result = await PaymentService.validatePaymentRequest(
        mockOrderId,
        mockRestaurantId,
        10.83,
        'client-provided-key'
      );

      // Server should generate its own key, not use client's
      expect(result.idempotencyKey).not.toBe('client-provided-key');
      expect(result.idempotencyKey).toMatch(/^[a-f0-9-]+-\d+$/);
    });
  });

  describe('amount validation for idempotent requests', () => {
    it('should detect amount mismatch between client and server calculation', async () => {
      const { OrdersService } = await import('../../src/services/orders.service');

      (OrdersService.getOrder as any).mockResolvedValue({
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
      });

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

      // Client sends wrong amount (attempting manipulation)
      await expect(
        PaymentService.validatePaymentRequest(
          mockOrderId,
          mockRestaurantId,
          5.00 // Wrong amount - should be ~$10.83
        )
      ).rejects.toThrow(/Payment amount mismatch/);
    });

    it('should allow 1 cent rounding tolerance', async () => {
      const { OrdersService } = await import('../../src/services/orders.service');

      (OrdersService.getOrder as any).mockResolvedValue({
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
      });

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

      // Server calculates ~$10.825, client sends $10.82 (1 cent off due to rounding)
      const result = await PaymentService.validatePaymentRequest(
        mockOrderId,
        mockRestaurantId,
        10.82 // 1 cent off - should be allowed
      );

      expect(result).toBeDefined();
      expect(result.orderTotal).toBeCloseTo(10.825, 2);
    });
  });
});
