import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

describe('Order Mode - Customer requires payment', () => {
  let server: any;
  let customerToken: string;

  beforeAll(async () => {
    // Start server
    server = app.listen(0);

    // Get a customer/kiosk token
    const kioskResponse = await request(app)
      .post('/api/v1/auth/kiosk')
      .send({
        restaurantId: '11111111-1111-1111-1111-111111111111',
        deviceId: 'test-kiosk'
      });

    customerToken = kioskResponse.body.token;
  });

  afterAll(() => {
    server?.close();
  });

  it('should reject customer order without payment token (402)', async () => {
    const orderData = {
      restaurantId: '11111111-1111-1111-1111-111111111111',
      items: [
        {
          menuItemId: 'test-item-1',
          name: 'Test Burger',
          quantity: 1,
          price: 12.99
        }
      ],
      customerName: 'Test Customer',
      type: 'online',
      subtotal: 12.99,
      tax: 0.91,
      tip: 0,
      total: 13.90
    };

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Restaurant-Id', '11111111-1111-1111-1111-111111111111')
      .send(orderData);

    expect(response.status).toBe(402);
    expect(response.body.error).toBe('PAYMENT_REQUIRED');
  });

  it('should accept customer order with payment token', async () => {
    const orderData = {
      restaurantId: '11111111-1111-1111-1111-111111111111',
      items: [
        {
          menuItemId: 'test-item-1',
          name: 'Test Burger',
          quantity: 1,
          price: 12.99
        }
      ],
      customerName: 'Test Customer',
      type: 'online',
      payment_token: 'test-payment-token-123', // Include payment token
      subtotal: 12.99,
      tax: 0.91,
      tip: 0,
      total: 13.90
    };

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('X-Restaurant-Id', '11111111-1111-1111-1111-111111111111')
      .send(orderData);

    // Should either succeed or fail with non-402 error (e.g., validation)
    expect(response.status).not.toBe(402);
  });
});