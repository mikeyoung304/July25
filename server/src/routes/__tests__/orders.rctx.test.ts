import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import ordersRouter from '../orders.routes';
import { authenticate } from '../../middleware/auth';
import { validateRestaurantAccess } from '../../middleware/restaurantAccess';
import { rateLimiter } from '../../middleware/rateLimiter';

// Mock dependencies
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

vi.mock('../../config', () => ({
  config: {
    supabase: {
      jwtSecret: 'test-jwt-secret-for-testing-only'
    }
  }
}));

describe('Orders Routes - RCTX (Restaurant Context) Enforcement', () => {
  let app: express.Application;
  let validToken: string;
  const testRestaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const testUserId = 'test-user-123';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Create a valid JWT token
    validToken = jwt.sign(
      {
        sub: testUserId,
        email: 'test@example.com',
        role: 'server',
        restaurant_id: testRestaurantId,
        scopes: ['orders:read', 'orders:create', 'orders:update']
      },
      'test-jwt-secret-for-testing-only'
    );

    // Apply middleware in correct order
    app.use(authenticate);
    app.use(validateRestaurantAccess);
    app.use('/api/v1/orders', ordersRouter);
  });

  describe('GET /api/v1/orders', () => {
    it('should return 400 when X-Restaurant-ID header is missing', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
    });

    it('should return 403 when user is not a member of the specified restaurant', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', otherRestaurantId)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });

    it('should return 200 when valid RCTX is provided', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', testRestaurantId)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('POST /api/v1/orders', () => {
    const validOrderData = {
      items: [
        { menuItemId: 'item-1', quantity: 2, price: 10.99 }
      ],
      customerName: 'John Doe',
      orderType: 'dine-in',
      tableNumber: 5
    };

    it('should return 400 when X-Restaurant-ID header is missing', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validOrderData)
        .expect(400);

      expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
    });

    it('should return 403 when user lacks proper restaurant access', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', otherRestaurantId)
        .send(validOrderData)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });

    it('should create order when valid RCTX is provided', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', testRestaurantId)
        .send(validOrderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNumber');
    });
  });

  describe('PUT /api/v1/orders/:id/status', () => {
    const orderId = 'order-123';
    const statusUpdate = { status: 'preparing' };

    it('should enforce RCTX for status updates', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(statusUpdate)
        .expect(400);

      expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
    });

    it('should validate restaurant membership for status updates', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', otherRestaurantId)
        .send(statusUpdate)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });
  });

  describe('DELETE /api/v1/orders/:id', () => {
    const orderId = 'order-123';

    it('should enforce RCTX for order deletion', async () => {
      const response = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
    });

    it('should prevent cross-restaurant order deletion', async () => {
      const response = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', otherRestaurantId)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed restaurant IDs', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', 'not-a-valid-uuid')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle empty restaurant ID header', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', '')
        .expect(400);

      expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
    });

    it('should be case-insensitive for X-Restaurant-ID header', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', testRestaurantId)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Token-based fallback', () => {
    it('should use restaurant_id from token if header is missing in kiosk mode', async () => {
      // Create a kiosk token with embedded restaurant_id
      const kioskToken = jwt.sign(
        {
          sub: 'kiosk-session-123',
          role: 'kiosk',
          restaurant_id: testRestaurantId,
          scopes: ['orders:create', 'menu:read']
        },
        'test-jwt-secret-for-testing-only'
      );

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${kioskToken}`)
        .send({
          items: [{ menuItemId: 'item-1', quantity: 1, price: 5.99 }],
          orderType: 'takeout'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });
});