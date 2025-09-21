import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { PaymentPayload } from '../../../shared/contracts/payment';

describe('Payment Contract Validation', () => {
  describe('PaymentPayload schema', () => {
    it('should validate required fields', () => {
      const invalidPayload = {
        // Missing orderId and token
        amount: 100
      };

      const result = PaymentPayload.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('orderId');
        expect(issues).toContain('token');
      }
    });

    it('should accept optional amount (server computes)', () => {
      const paymentWithAmount = {
        orderId: 'order-123',
        token: 'tok_test_123',
        amount: 1, // Client tries to pay $1 for a $100 order
        idempotencyKey: 'client-key-123'
      };

      // Schema accepts it, but server will override
      const result = PaymentPayload.safeParse(paymentWithAmount);
      expect(result.success).toBe(true);
      if (result.success) {
        // Amount is in the schema but optional
        expect(result.data.amount).toBe(1);
      }
    });

    it('should accept idempotency key', () => {
      const paymentPayload = {
        orderId: 'order-456',
        token: 'tok_test_456',
        idempotencyKey: 'idem-key-456'
      };

      const result = PaymentPayload.safeParse(paymentPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.idempotencyKey).toBe('idem-key-456');
      }
    });

    it('should reject empty token', () => {
      const invalidTokenPayload = {
        orderId: 'order-789',
        token: '', // Empty token
        amount: 50
      };

      const result = PaymentPayload.safeParse(invalidTokenPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const tokenIssue = result.error.issues.find(i => i.path[0] === 'token');
        expect(tokenIssue).toBeDefined();
        expect(tokenIssue?.message).toContain('at least 1');
      }
    });

    it('should allow optional verification token for 3D Secure', () => {
      const paymentWith3DS = {
        orderId: 'order-3ds',
        token: 'tok_test_3ds',
        verificationToken: 'verf_token_123'
      };

      const result = PaymentPayload.safeParse(paymentWith3DS);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.verificationToken).toBe('verf_token_123');
      }
    });

    it('should reject negative amounts', () => {
      const negativeAmount = {
        orderId: 'order-neg',
        token: 'tok_test_neg',
        amount: -50
      };

      const result = PaymentPayload.safeParse(negativeAmount);
      expect(result.success).toBe(false);
      if (!result.success) {
        const amountIssue = result.error.issues.find(i => i.path[0] === 'amount');
        expect(amountIssue).toBeDefined();
        expect(amountIssue?.message).toContain('greater than 0');
      }
    });

    it('should reject short idempotency keys', () => {
      const shortKey = {
        orderId: 'order-short',
        token: 'tok_test_short',
        idempotencyKey: 'short' // Less than 10 chars
      };

      const result = PaymentPayload.safeParse(shortKey);
      expect(result.success).toBe(false);
      if (!result.success) {
        const keyIssue = result.error.issues.find(i => i.path[0] === 'idempotencyKey');
        expect(keyIssue).toBeDefined();
        expect(keyIssue?.message).toContain('at least 10');
      }
    });
  });
});