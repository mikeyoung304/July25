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

// Mock OrdersService and getRestaurantTaxRate
vi.mock('../../src/services/orders.service', () => ({
  OrdersService: {
    getOrder: vi.fn()
  },
  getRestaurantTaxRate: vi.fn()
}));

// Import the mocked modules to use with vi.mocked()
import { OrdersService, getRestaurantTaxRate } from '../../src/services/orders.service';
import { logger } from '../../src/utils/logger';

/**
 * Sets up Supabase mock for tax rate queries
 * @param taxRate - Tax rate to return (default: 0.0825)
 * @param error - Error to return (default: null)
 */
function setupTaxRateMock(taxRate: number | null = 0.0825, error: any = null) {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: error ? null : { tax_rate: taxRate },
          error
        })
      })
    })
  });
  (supabase.from as any) = mockFrom;
  return mockFrom;
}

describe('PaymentService - Idempotency', () => {
  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockOrderId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementation for getRestaurantTaxRate with default 8.25% tax rate
    // This must be done in beforeEach because vi.clearAllMocks() clears the implementation
    vi.mocked(getRestaurantTaxRate).mockResolvedValue(0.0825);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('idempotency key generation', () => {
    // Fake timers scoped to this describe block only - tests that use vi.setSystemTime()
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate key in format: pay_{restaurantSuffix}_{orderSuffix}_{timestamp}', async () => {
      // Mock tax rate fetch
      setupTaxRateMock();

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

      const fixedTimeMs = 1700000000000;
      vi.setSystemTime(fixedTimeMs);

      const result = await PaymentService.calculateOrderTotal(order);

      // Should match format: pay_{restaurantSuffix}_{orderSuffix}_{timestamp}
      // Restaurant suffix: last 8 chars, Order suffix: last 12 chars
      // Timestamp is in seconds (not ms) per implementation - allows retries within same second
      // Note: Nonce was removed per #238 - it defeated idempotency purpose
      const expectedRestaurantSuffix = mockRestaurantId.slice(-8);
      const expectedOrderSuffix = mockOrderId.slice(-12);
      const expectedTimestamp = Math.floor(fixedTimeMs / 1000); // Convert ms to seconds
      const keyPattern = new RegExp(`^pay_${expectedRestaurantSuffix}_${expectedOrderSuffix}_${expectedTimestamp}$`);
      expect(result.idempotencyKey).toMatch(keyPattern);
    });

    it('should generate key under 255 characters (Stripe max)', async () => {
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

      // Max 255 chars per Stripe requirements (idempotency keys)
      // Our format: pay_{8}_{12}_{10} = ~36 chars (nonce removed per #238)
      expect(result.idempotencyKey.length).toBeLessThanOrEqual(255);
      // Verify reasonable length (format: pay_xxxxxxxx_xxxxxxxxxxxx_timestamp)
      expect(result.idempotencyKey.length).toBeGreaterThan(30);
      expect(result.idempotencyKey.length).toBeLessThan(100);
    });

    it('should generate unique keys for different timestamps', async () => {
      setupTaxRateMock();

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
    it('should generate refund key with "refund_" prefix', async () => {
      const paymentId = 'pay_1234567890abcdef';

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        mockRestaurantId,
        25.50, // requested amount
        50.00  // original amount
      );

      expect(result.idempotencyKey).toMatch(/^refund_/);
    });

    it('should include payment ID suffix in refund key', async () => {
      const paymentId = 'pay_1234567890abcdef';

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        mockRestaurantId,
        25.50,
        50.00
      );

      // Should include last 12 chars of payment ID
      expect(result.idempotencyKey).toContain(paymentId.slice(-12));
    });

    it('should generate refund key under 255 characters (Stripe max)', async () => {
      const longPaymentId = 'pay_aaaabbbbccccddddeeeeffffgggg';

      const result = await PaymentService.validateRefundRequest(
        longPaymentId,
        mockRestaurantId,
        25.50,
        50.00
      );

      // Max 255 chars per Stripe requirements
      expect(result.idempotencyKey.length).toBeLessThanOrEqual(255);
      // Verify reasonable length
      expect(result.idempotencyKey.length).toBeGreaterThan(30);
      expect(result.idempotencyKey.length).toBeLessThan(100);
    });

    it('should include restaurant ID suffix for tenant isolation', async () => {
      const paymentId = 'pay_1234567890abcdef';

      const result = await PaymentService.validateRefundRequest(
        paymentId,
        mockRestaurantId,
        25.50,
        50.00
      );

      // Should include last 8 chars of restaurant ID
      expect(result.idempotencyKey).toContain(mockRestaurantId.slice(-8));
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

  describe('order status validation for payment', () => {
    it('should reject payment for cancelled orders', async () => {
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'cancelled', // Invalid status for payment
        payment_status: 'pending',
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

      await expect(
        PaymentService.validatePaymentRequest(
          mockOrderId,
          mockRestaurantId,
          10.83
        )
      ).rejects.toThrow(/Order cannot be paid.*cancelled/);
    });

    it('should reject payment for completed orders', async () => {
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'completed', // Invalid status for payment
        payment_status: 'pending',
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

      await expect(
        PaymentService.validatePaymentRequest(
          mockOrderId,
          mockRestaurantId,
          10.83
        )
      ).rejects.toThrow(/Order cannot be paid.*completed/);
    });

    it('should reject payment for already paid orders', async () => {
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'pending',
        payment_status: 'paid', // Already paid
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

      await expect(
        PaymentService.validatePaymentRequest(
          mockOrderId,
          mockRestaurantId,
          10.83
        )
      ).rejects.toThrow(/Order has already been paid/);
    });

    it('should allow payment for new orders', async () => {
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'new', // Valid status for payment
        payment_status: 'pending',
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
      setupTaxRateMock();

      const result = await PaymentService.validatePaymentRequest(
        mockOrderId,
        mockRestaurantId,
        10.83
      );

      expect(result).toBeDefined();
      expect(result.amount).toBeDefined();
    });

    it('should allow payment for confirmed orders', async () => {
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'confirmed', // Valid status for payment
        payment_status: 'pending',
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
      setupTaxRateMock();

      const result = await PaymentService.validatePaymentRequest(
        mockOrderId,
        mockRestaurantId,
        10.83
      );

      expect(result).toBeDefined();
      expect(result.amount).toBeDefined();
    });
  });

  describe('payment validation with idempotency', () => {
    it('should warn when client provides idempotency key', async () => {
      // Mock order retrieval with valid status for payment
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'pending', // Valid status for payment
        payment_status: 'pending', // Not yet paid
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
      setupTaxRateMock();

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
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'pending', // Valid status for payment
        payment_status: 'pending', // Not yet paid
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

      setupTaxRateMock();

      const result = await PaymentService.validatePaymentRequest(
        mockOrderId,
        mockRestaurantId,
        10.83,
        'client-provided-key'
      );

      // Server should generate its own key, not use client's
      expect(result.idempotencyKey).not.toBe('client-provided-key');
      // New format: pay_{restaurantSuffix}_{orderSuffix}_{timestamp} (nonce removed per #238)
      expect(result.idempotencyKey).toMatch(/^pay_[a-f0-9-]+_[a-f0-9-]+_\d+$/);
    });
  });

  describe('amount validation for idempotent requests', () => {
    it('should detect amount mismatch between client and server calculation', async () => {
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'pending', // Valid status for payment
        payment_status: 'pending', // Not yet paid
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

      setupTaxRateMock();

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
      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: mockOrderId,
        restaurant_id: mockRestaurantId,
        status: 'pending', // Valid status for payment
        payment_status: 'pending', // Not yet paid
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

      setupTaxRateMock();

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
