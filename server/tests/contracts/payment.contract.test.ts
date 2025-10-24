import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { PaymentPayload } from '../../../shared/contracts/payment';

describe('Payment Contract Validation', () => {
  describe('PaymentPayload schema', () => {
    it('should validate required fields (snake_case per ADR-001)', () => {
      const invalidPayload = {
        // Missing order_id and token
        amount: 100
      };

      const result = PaymentPayload.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues.map(i => i.path[0]);
        expect(issues).toContain('order_id');
        expect(issues).toContain('token');
      }
    });

    it('should accept optional amount (server computes) - snake_case per ADR-001', () => {
      const paymentWithAmount = {
        order_id: 'order-123',
        token: 'tok_test_123',
        amount: 1, // Client tries to pay $1 for a $100 order
        idempotency_key: 'client-key-123'
      };

      // Schema accepts it, but server will override
      const result = PaymentPayload.safeParse(paymentWithAmount);
      expect(result.success).toBe(true);
      if (result.success) {
        // Amount is in the schema but optional
        expect(result.data.amount).toBe(1);
      }
    });

    it('should accept idempotency_key (snake_case per ADR-001)', () => {
      const paymentPayload = {
        order_id: 'order-456',
        token: 'tok_test_456',
        idempotency_key: 'idem-key-456'
      };

      const result = PaymentPayload.safeParse(paymentPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.idempotency_key).toBe('idem-key-456');
      }
    });

    it('should reject empty token', () => {
      const invalidTokenPayload = {
        order_id: 'order-789',
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

    it('should allow optional verification_token for 3D Secure (snake_case per ADR-001)', () => {
      const paymentWith3DS = {
        order_id: 'order-3ds',
        token: 'tok_test_3ds',
        verification_token: 'verf_token_123'
      };

      const result = PaymentPayload.safeParse(paymentWith3DS);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.verification_token).toBe('verf_token_123');
      }
    });

    it('should reject negative amounts', () => {
      const negativeAmount = {
        order_id: 'order-neg',
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

    it('should reject short idempotency_key (snake_case per ADR-001)', () => {
      const shortKey = {
        order_id: 'order-short',
        token: 'tok_test_short',
        idempotency_key: 'short' // Less than 10 chars
      };

      const result = PaymentPayload.safeParse(shortKey);
      expect(result.success).toBe(false);
      if (!result.success) {
        const keyIssue = result.error.issues.find(i => i.path[0] === 'idempotency_key');
        expect(keyIssue).toBeDefined();
        expect(keyIssue?.message).toContain('at least 10');
      }
    });
  });
});