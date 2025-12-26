/**
 * Payment Audit Logging Tests
 *
 * Tests for two-phase audit logging compliance fix (P0.4)
 * Per ADR-009 and SECURITY.md, payment audit logs MUST fail-fast
 * and ensure no customer charges occur without an audit trail.
 *
 * Related:
 * - docs/investigations/P0_PAYMENT_AUDIT_ANALYSIS.md
 * - docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md
 * - docs/SECURITY.md (lines 174-216)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentService, PaymentAuditLogEntry } from '../../src/services/payment.service';
import { supabase } from '../../src/config/database';

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

describe('PaymentService - Two-Phase Audit Logging', () => {
  const mockRestaurantId = '11111111-1111-1111-1111-111111111111';
  const mockOrderId = '22222222-2222-2222-2222-222222222222';
  const mockIdempotencyKey = `${mockOrderId.slice(-12)}-${Date.now()}`;

  const mockAuditEntry: PaymentAuditLogEntry = {
    orderId: mockOrderId,
    amount: 25.50,
    status: 'initiated',
    restaurantId: mockRestaurantId,
    paymentMethod: 'card',
    idempotencyKey: mockIdempotencyKey,
    userAgent: 'test-agent',
    ipAddress: '127.0.0.1',
    metadata: { test: true }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logPaymentAttempt() - Phase 1: Initial Logging', () => {
    it('should successfully log payment with status=initiated', async () => {
      // Mock successful insert
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null })
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.logPaymentAttempt(mockAuditEntry);

      expect(mockFrom).toHaveBeenCalledWith('payment_audit_logs');
      expect(mockFrom().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: mockOrderId,
          restaurant_id: mockRestaurantId,
          amount: 2550, // Converted to cents
          status: 'initiated',
          idempotency_key: mockIdempotencyKey,
          payment_method: 'card'
        })
      );
    });

    it('should fail-fast if database insert fails (compliance requirement)', async () => {
      // Mock database error
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: {
            message: 'Connection failed',
            code: 'CONNECTION_ERROR'
          }
        })
      });
      (supabase.from as any) = mockFrom;

      // Should throw error per ADR-009 fail-fast policy
      await expect(
        PaymentService.logPaymentAttempt(mockAuditEntry)
      ).rejects.toThrow('Payment processing unavailable - audit system failure');
    });

    it('should convert amount to cents for storage', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null })
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.logPaymentAttempt({
        ...mockAuditEntry,
        amount: 10.99
      });

      expect(mockFrom().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1099 // 10.99 * 100
        })
      );
    });
  });

  describe('updatePaymentAuditStatus() - Phase 2: Status Update', () => {
    it('should successfully update audit status to success', async () => {
      const mockPaymentId = 'pi_stripe_payment_123';
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
            count: 1
          })
        })
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.updatePaymentAuditStatus(
        mockIdempotencyKey,
        'success',
        mockPaymentId
      );

      expect(mockFrom).toHaveBeenCalledWith('payment_audit_logs');
      expect(mockFrom().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          payment_id: mockPaymentId
        })
      );
      expect(mockFrom().update().eq).toHaveBeenCalledWith(
        'idempotency_key',
        mockIdempotencyKey
      );
    });

    it('should successfully update audit status to failed with error details', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
            count: 1
          })
        })
      });
      (supabase.from as any) = mockFrom;

      await PaymentService.updatePaymentAuditStatus(
        mockIdempotencyKey,
        'failed',
        undefined,
        'CARD_DECLINED',
        'Insufficient funds'
      );

      expect(mockFrom().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_code: 'CARD_DECLINED',
          error_detail: 'Insufficient funds'
        })
      );
    });

    it('should fail-fast if audit status update fails (compliance requirement)', async () => {
      // Mock update error
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: {
              message: 'Update failed',
              code: 'UPDATE_ERROR'
            },
            count: 0
          })
        })
      });
      (supabase.from as any) = mockFrom;

      // Should throw error per ADR-009 fail-fast policy
      await expect(
        PaymentService.updatePaymentAuditStatus(
          mockIdempotencyKey,
          'success',
          'pay-123'
        )
      ).rejects.toThrow('Payment audit system failure');
    });

    it('should fail-fast if no audit log found to update', async () => {
      // Mock zero rows updated
      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
            count: 0 // No rows updated
          })
        })
      });
      (supabase.from as any) = mockFrom;

      // Should throw error - audit log not found
      await expect(
        PaymentService.updatePaymentAuditStatus(
          'nonexistent-key',
          'success',
          'pay-123'
        )
      ).rejects.toThrow('audit log not found');
    });
  });

  describe('Compliance: Two-Phase Flow Integration', () => {
    it('should complete full two-phase flow: initiated → success', async () => {
      let insertedData: any = null;
      let updatedData: any = null;

      // Mock Phase 1: Insert 'initiated'
      const mockInsert = vi.fn().mockImplementation((data) => {
        insertedData = data;
        return Promise.resolve({ error: null });
      });

      // Mock Phase 2: Update to 'success'
      const mockUpdate = vi.fn().mockImplementation((data) => {
        updatedData = data;
        return {
          eq: vi.fn().mockResolvedValue({ error: null, count: 1 })
        };
      });

      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
        update: mockUpdate
      }));
      (supabase.from as any) = mockFrom;

      // Phase 1: Log initiated
      await PaymentService.logPaymentAttempt(mockAuditEntry);

      expect(insertedData.status).toBe('initiated');
      expect(insertedData.payment_id).toBeUndefined(); // No payment ID yet

      // Phase 2: Update to success
      await PaymentService.updatePaymentAuditStatus(
        mockIdempotencyKey,
        'success',
        'pi_stripe_789'
      );

      expect(updatedData.status).toBe('success');
      expect(updatedData.payment_id).toBe('pi_stripe_789');
    });
  });
});
