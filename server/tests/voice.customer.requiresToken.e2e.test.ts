import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app';
import { supabase } from '../src/config/database';

describe('Voice Customer Order - Payment Token Requirement', () => {
  let customerToken: string;
  let employeeToken: string;
  const restaurantId = 'test-restaurant-id';

  beforeAll(async () => {
    // Get customer token (kiosk/anonymous)
    const customerAuth = await request(app)
      .post('/api/v1/auth/kiosk')
      .send({
        restaurantId
      });

    customerToken = customerAuth.body.token || 'test-customer-token';

    // Get employee token
    const employeeAuth = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'server@example.com',
        password: 'password123',
        role: 'server'
      });

    employeeToken = employeeAuth.body.token || 'test-employee-token';
  });

  describe('Customer Voice Orders', () => {
    it('should reject customer voice order without payment token (402)', async () => {
      const orderData = {
        tableNumber: 'K1',
        customerName: 'Voice Customer',
        type: 'voice',
        items: [
          {
            menuItemId: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: 12.99
          }
        ],
        subtotal: 12.99,
        tax: 1.04,
        tip: 0,
        total: 14.03
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .send(orderData);

      expect(response.status).toBe(402);
      expect(response.body).toHaveProperty('error', 'PAYMENT_REQUIRED');
      expect(response.body).toHaveProperty('message');

      // Verify order was NOT created in database
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_name', 'Voice Customer')
        .single();

      expect(orders).toBeNull();
    });

    it('should accept customer voice order WITH payment token (201)', async () => {
      const orderData = {
        tableNumber: 'K1',
        customerName: 'Paid Voice Customer',
        type: 'voice',
        items: [
          {
            menuItemId: 'item-1',
            name: 'Burger',
            quantity: 1,
            price: 12.99
          }
        ],
        subtotal: 12.99,
        tax: 1.04,
        tip: 0,
        total: 14.03,
        payment_token: 'valid-payment-token-123' // Include payment token
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'new');

      // Verify order WAS created and visible in KDS
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', response.body.id)
        .single();

      expect(order).not.toBeNull();
      expect(order.status).toBe('new');
      expect(order.customer_name).toBe('Paid Voice Customer');
    });

    it('should accept payment token in header as alternative', async () => {
      const orderData = {
        tableNumber: 'K2',
        customerName: 'Header Payment Customer',
        type: 'voice',
        items: [
          {
            menuItemId: 'item-2',
            name: 'Salad',
            quantity: 1,
            price: 8.99
          }
        ],
        subtotal: 8.99,
        tax: 0.72,
        tip: 0,
        total: 9.71
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .set('X-Payment-Token', 'header-payment-token-456') // Payment token in header
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });
  });

  describe('Employee Voice Orders', () => {
    it('should accept employee voice order WITHOUT payment token', async () => {
      const orderData = {
        tableNumber: 'T5',
        customerName: 'Employee Order',
        type: 'voice',
        items: [
          {
            menuItemId: 'item-3',
            name: 'Pizza',
            quantity: 1,
            price: 15.99
          }
        ],
        subtotal: 15.99,
        tax: 1.28,
        tip: 0,
        total: 17.27
        // No payment token needed for employees
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${employeeToken}`)
        .set('X-Restaurant-ID', restaurantId)
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status', 'new');

      // Verify order was created
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', response.body.id)
        .single();

      expect(order).not.toBeNull();
      expect(order.customer_name).toBe('Employee Order');
    });
  });

  afterAll(async () => {
    // Clean up test orders
    await supabase
      .from('orders')
      .delete()
      .in('customer_name', [
        'Voice Customer',
        'Paid Voice Customer',
        'Header Payment Customer',
        'Employee Order'
      ]);
  });
});