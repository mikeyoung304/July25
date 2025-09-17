/**
 * Integration test for voice customer payment flow
 * Verifies that customer orders require payment tokens
 */

import request from 'supertest';
import { app } from '../../server/src/app';
import { supabase } from '../../server/src/utils/supabase';
import { features } from '../../server/src/config/features';

describe('Voice Customer Payment Integration', () => {
  let authToken: string;
  let restaurantId: string;

  beforeAll(async () => {
    // Enable voice customer feature for testing
    features.enable('VOICE_CUSTOMER');

    // Setup test restaurant and auth
    restaurantId = 'test-restaurant-123';

    // Create test customer auth token (mock)
    authToken = 'test-customer-token';
  });

  afterAll(async () => {
    // Cleanup
    features.disable('VOICE_CUSTOMER');
  });

  describe('Customer Order Flow', () => {
    const validOrderPayload = {
      items: [
        {
          id: 'item-1',
          name: 'Burger',
          price: 12.99,
          quantity: 1,
          modifiers: []
        },
        {
          id: 'item-2',
          name: 'Fries',
          price: 4.99,
          quantity: 1,
          modifiers: [{ name: 'Extra Salt', price: 0 }]
        }
      ],
      subtotal: 17.98,
      tax: 1.44,
      tip: 2.00,
      total: 21.42,
      type: 'voice',
      customerName: 'Voice Customer',
      notes: 'Voice order from kiosk'
    };

    it('should reject customer order without payment token (402)', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .send(validOrderPayload);

      expect(response.status).toBe(402);
      expect(response.body).toEqual({
        error: 'PAYMENT_REQUIRED',
        message: 'Payment token is required for customer orders'
      });
    });

    it('should reject customer order with invalid payment token (402)', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .send({
          ...validOrderPayload,
          paymentToken: 'invalid-token-123'
        });

      expect(response.status).toBe(402);
      expect(response.body).toEqual({
        error: 'INVALID_PAYMENT_TOKEN',
        message: 'Payment token is invalid, already used, or amount mismatch'
      });
    });

    it('should accept customer order with valid payment token (201)', async () => {
      // Mock a valid payment token in the database
      const validToken = 'valid-payment-token-123';
      await supabase.from('payment_intents').insert({
        provider: 'square',
        provider_payment_id: validToken,
        restaurant_id: restaurantId,
        amount_cents: 2142, // Matches order total
        currency: 'USD',
        status: 'succeeded',
        used_at: null,
        metadata: { mode: 'customer' }
      });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .set('X-Idempotency-Key', `test-${Date.now()}`)
        .send({
          ...validOrderPayload,
          paymentToken: validToken
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        order_number: expect.any(String),
        status: 'confirmed',
        items: expect.arrayContaining([
          expect.objectContaining({ name: 'Burger' }),
          expect.objectContaining({ name: 'Fries' })
        ])
      });

      // Verify token was consumed
      const { data: tokenData } = await supabase
        .from('payment_intents')
        .select('used_at, used_by_order_id')
        .eq('provider_payment_id', validToken)
        .single();

      expect(tokenData?.used_at).not.toBeNull();
      expect(tokenData?.used_by_order_id).toBe(response.body.id);
    });

    it('should not allow reuse of payment token', async () => {
      const usedToken = 'already-used-token-123';

      // Create a token that's already been used
      await supabase.from('payment_intents').insert({
        provider: 'square',
        provider_payment_id: usedToken,
        restaurant_id: restaurantId,
        amount_cents: 2142,
        currency: 'USD',
        status: 'succeeded',
        used_at: new Date().toISOString(),
        used_by_order_id: 'previous-order-123'
      });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .send({
          ...validOrderPayload,
          paymentToken: usedToken
        });

      expect(response.status).toBe(402);
      expect(response.body.error).toBe('INVALID_PAYMENT_TOKEN');
    });
  });

  describe('Employee Order Flow', () => {
    let employeeToken: string;

    beforeAll(async () => {
      // Create employee auth token (mock)
      employeeToken = 'test-employee-token';
    });

    it('should accept employee order without payment token (201)', async () => {
      const orderPayload = {
        items: [
          {
            id: 'item-1',
            name: 'Salad',
            price: 9.99,
            quantity: 1,
            modifiers: []
          }
        ],
        subtotal: 9.99,
        tax: 0.80,
        tip: 0,
        total: 10.79,
        type: 'dine-in',
        tableNumber: 'A1',
        customerName: 'Table A1'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .set('X-Idempotency-Key', `test-emp-${Date.now()}`)
        .send(orderPayload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: 'confirmed'
      });
    });
  });

  describe('Feature Flag Control', () => {
    it('should bypass payment check when VOICE_CUSTOMER feature is disabled', async () => {
      // Disable feature
      features.disable('VOICE_CUSTOMER');

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .set('X-Idempotency-Key', `test-disabled-${Date.now()}`)
        .send({
          items: [{ id: 'item-1', name: 'Test', price: 5.00, quantity: 1 }],
          subtotal: 5.00,
          tax: 0.40,
          total: 5.40,
          type: 'voice'
        });

      // Should allow order without payment when feature is disabled
      expect([201, 200]).toContain(response.status);

      // Re-enable for other tests
      features.enable('VOICE_CUSTOMER');
    });
  });
});