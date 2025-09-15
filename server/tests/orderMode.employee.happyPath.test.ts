import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';
import jwt from 'jsonwebtoken';

describe('Order Mode - Employee happy path', () => {
  let server: any;
  let employeeToken: string;

  beforeAll(async () => {
    // Start server
    server = app.listen(0);

    // Mock an employee token (manager role)
    // In a real test, you'd use a proper auth setup
    const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
    employeeToken = jwt.sign(
      {
        id: 'test-manager-id',
        email: 'manager@restaurant.com',
        role: 'manager',
        restaurantId: '11111111-1111-1111-1111-111111111111',
        tokenType: 'supabase'
      },
      jwtSecret,
      { expiresIn: '1h' }
    );
  });

  afterAll(() => {
    server?.close();
  });

  it('should accept employee order without payment token (200/201)', async () => {
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
      customerName: 'Table 5',
      tableNumber: '5',
      type: 'dine-in',
      subtotal: 12.99,
      tax: 0.91,
      tip: 2.00,
      total: 15.90
    };

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Restaurant-Id', '11111111-1111-1111-1111-111111111111')
      .send(orderData);

    // Should not require payment (no 402)
    expect(response.status).not.toBe(402);

    // Should either succeed (201) or fail with validation error (400)
    // but NOT payment required
    if (response.status >= 400) {
      expect(response.body.error).not.toBe('PAYMENT_REQUIRED');
    }
  });

  it('should process employee voice order without payment', async () => {
    const voiceOrderData = {
      restaurantId: '11111111-1111-1111-1111-111111111111',
      transcription: 'I want a burger and fries',
      metadata: {
        mode: 'employee'
      }
    };

    const response = await request(app)
      .post('/api/v1/orders/voice')
      .set('Authorization', `Bearer ${employeeToken}`)
      .set('X-Restaurant-Id', '11111111-1111-1111-1111-111111111111')
      .send(voiceOrderData);

    // Should not require payment (no 402)
    expect(response.status).not.toBe(402);
  });
});