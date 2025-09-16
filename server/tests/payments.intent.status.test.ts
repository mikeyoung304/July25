import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import { SquareAdapter } from '../src/payments/square.adapter';

// Mock the Square adapter
jest.mock('../src/payments/square.adapter');

describe('Payment Intent API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for testing
    const authResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = authResponse.body.token || 'test-token';
  });

  describe('POST /api/v1/payments/intent', () => {
    it('should create a payment intent', async () => {
      // Mock the adapter response
      (SquareAdapter.prototype.createIntent as jest.Mock).mockResolvedValue({
        id: 'test-payment-id',
        amount: 1000,
        currency: 'USD',
        status: 'pending',
        strategy: 'link',
        paymentLinkUrl: 'https://sandbox.square.link/test',
        checkoutId: 'test-checkout-id'
      });

      const response = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', 'test-restaurant-id')
        .send({
          amount: 1000,
          currency: 'USD',
          orderDraftId: 'test-order-id',
          mode: 'voice_customer'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('strategy', 'link');
      expect(response.body).toHaveProperty('paymentId', 'test-payment-id');
      expect(response.body).toHaveProperty('paymentLinkUrl');
    });

    it('should reject invalid amount', async () => {
      const response = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', 'test-restaurant-id')
        .send({
          amount: -100,
          currency: 'USD'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/payments/status/:id', () => {
    it('should return payment status', async () => {
      // Mock the adapter response
      (SquareAdapter.prototype.statusById as jest.Mock).mockResolvedValue({
        id: 'test-payment-id',
        amount: 1000,
        currency: 'USD',
        status: 'succeeded',
        strategy: 'link'
      });

      const response = await request(app)
        .get('/api/v1/payments/status/test-payment-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', 'test-restaurant-id');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('providerId');
    });

    it('should handle payment not found', async () => {
      const response = await request(app)
        .get('/api/v1/payments/status/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', 'test-restaurant-id');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });
});