import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock dependencies first
const mockValidateToken = vi.fn();
const mockConsumeToken = vi.fn();

vi.mock('../src/payments/square.adapter', () => ({
  SquareAdapter: vi.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
    consumeToken: mockConsumeToken
  }))
}));

vi.mock('../src/utils/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import { requirePaymentIfCustomer } from '../src/middleware/paymentGate';

describe('Token Replay Protection', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Setup mock request properties
    app.use((req, res, next) => {
      (req as any).orderMode = req.headers['x-order-mode'] || 'customer';
      (req as any).restaurantId = 'rest_123';
      next();
    });

    vi.clearAllMocks();
  });

  describe('Customer Orders', () => {
    it('should reject customer order without payment token', async () => {
      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'customer')
        .send({
          items: [{ price: 10, quantity: 1 }]
        });

      expect(response.status).toBe(402);
      expect(response.body).toEqual({
        error: 'PAYMENT_REQUIRED',
        message: 'Payment token is required for customer orders'
      });
    });

    it('should validate payment token for customer order', async () => {
      mockValidateToken.mockResolvedValue(true);

      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'customer')
        .send({
          payment_token: 'valid_token_123',
          items: [{ price: 10, quantity: 1 }],
          tax: 1,
          tip: 2
        });

      expect(response.status).toBe(200);
      expect(mockValidateToken).toHaveBeenCalledWith(
        'valid_token_123',
        'rest_123',
        1300 // (10 + 1 + 2) * 100
      );
    });

    it('should reject order with invalid payment token', async () => {
      mockValidateToken.mockResolvedValue(false);

      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'customer')
        .send({
          payment_token: 'invalid_token_456',
          items: [{ price: 10, quantity: 1 }],
          tax: 1
        });

      expect(response.status).toBe(402);
      expect(response.body).toEqual({
        error: 'INVALID_PAYMENT_TOKEN',
        message: 'Payment token is invalid, already used, or amount mismatch'
      });
    });

    it('should calculate total correctly with modifiers', async () => {
      mockValidateToken.mockResolvedValue(true);

      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'customer')
        .send({
          payment_token: 'valid_token_789',
          items: [
            {
              price: 10,
              quantity: 2,
              modifiers: [
                { name: 'Extra cheese', price: 1.5 },
                { name: 'No onions', price: 0 }
              ]
            }
          ],
          tax: 2.15,
          tip: 5
        });

      expect(response.status).toBe(200);

      // Total: (10 * 2) + 1.5 + 2.15 + 5 = 28.65 => 2865 cents
      expect(mockSquareAdapter.validateToken).toHaveBeenCalledWith(
        'valid_token_789',
        'rest_123',
        2865
      );
    });

    it('should accept payment token in header', async () => {
      mockValidateToken.mockResolvedValue(true);

      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'customer')
        .set('x-payment-token', 'header_token_123')
        .send({
          items: [{ price: 10, quantity: 1 }]
        });

      expect(response.status).toBe(200);
      expect(mockSquareAdapter.validateToken).toHaveBeenCalledWith(
        'header_token_123',
        'rest_123',
        1000
      );
    });
  });

  describe('Employee Orders', () => {
    it('should bypass payment requirement for employee orders', async () => {
      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'employee')
        .send({
          items: [{ price: 10, quantity: 1 }]
        });

      expect(response.status).toBe(200);
      expect(mockSquareAdapter.validateToken).not.toHaveBeenCalled();
    });
  });

  describe('Token Consumption', () => {
    it('should store payment token for consumption after order creation', async () => {
      mockValidateToken.mockResolvedValue(true);

      app.post('/test', requirePaymentIfCustomer, (req, res) => {
        // Check that token was stored on request
        expect((req as any).paymentToken).toBe('token_for_consumption');
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test')
        .set('x-order-mode', 'customer')
        .send({
          payment_token: 'token_for_consumption',
          items: [{ price: 10, quantity: 1 }]
        });

      expect(response.status).toBe(200);
    });
  });
});