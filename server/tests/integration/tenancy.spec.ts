import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authenticate, validateRestaurantAccess } from '../../src/middleware/auth';
import { requireRole } from '../../src/middleware/auth';
import { requireScopes } from '../../src/middleware/rbac';
import { ApiScope, DatabaseRole } from '@rebuild/shared/types/auth';
import { errorHandler } from '../../src/middleware/errorHandler';
import jwt from 'jsonwebtoken';

describe('Restaurant Context Enforcement', () => {
  let app: express.Application;
  let staffToken: string;
  let kioskToken: string;
  const validRestaurantId = 'rest-123';
  const otherRestaurantId = 'rest-456';

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());

    // Test route simulating orders endpoint
    app.post('/api/v1/orders',
      authenticate,
      requireRole([DatabaseRole.OWNER, DatabaseRole.MANAGER, DatabaseRole.SERVER, DatabaseRole.CUSTOMER]),
      requireScopes(ApiScope.ORDERS_CREATE),
      validateRestaurantAccess,
      (req: any, res) => {
        res.status(201).json({
          id: 'order-1',
          restaurant_id: req.restaurantId,
          status: 'created'
        });
      }
    );

    // Error handler
    app.use(errorHandler);

    // Create test tokens
    const supabaseSecret = process.env['SUPABASE_JWT_SECRET'] || 'test-secret';
    const kioskSecret = process.env['KIOSK_JWT_SECRET'] || 'test-kiosk-secret';

    // Staff token (supabase type - multi-tenant)
    staffToken = jwt.sign(
      {
        sub: 'user-123',
        email: 'staff@example.com',
        role: DatabaseRole.SERVER,
        iss: 'https://test.supabase.co/auth/v1',
        aud: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      supabaseSecret
    );

    // Kiosk token (single-tenant)
    kioskToken = jwt.sign(
      {
        sub: 'customer:kiosk-123',
        role: DatabaseRole.CUSTOMER,
        restaurant_id: validRestaurantId,
        scopes: [ApiScope.ORDERS_CREATE],
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      kioskSecret
    );
  });

  describe('Staff Token (Supabase)', () => {
    it('should reject POST without restaurant context', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('RESTAURANT_CONTEXT_MISSING');
      expect(response.body.error.message).toContain('Restaurant context required');
    });

    it('should accept POST with X-Restaurant-ID header', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Restaurant-ID', validRestaurantId)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });

    it('should accept POST with query parameter', async () => {
      const response = await request(app)
        .post(`/api/v1/orders?restaurantId=${validRestaurantId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });

    it('should accept POST with body restaurant_id', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          restaurant_id: validRestaurantId,
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });

    it('should prioritize header over body for restaurant context', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Restaurant-ID', validRestaurantId)
        .send({
          restaurant_id: otherRestaurantId, // Different from header
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId); // Header wins
    });
  });

  describe('Kiosk Token (Single-Tenant)', () => {
    it('should accept POST without header (fallback to token)', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${kioskToken}`)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });

    it('should accept POST with matching header', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${kioskToken}`)
        .set('X-Restaurant-ID', validRestaurantId)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });

    it('should reject POST with mismatched header', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${kioskToken}`)
        .set('X-Restaurant-ID', otherRestaurantId) // Different from token
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Restaurant access denied');
    });
  });

  describe('Body Spoof Protection', () => {
    it('should ignore body restaurant_id when header is provided', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-Restaurant-ID', validRestaurantId)
        .send({
          restaurant_id: otherRestaurantId, // Attempt to spoof
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId); // Header value persisted
    });

    it('should detect restaurant mismatch for kiosk tokens', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${kioskToken}`)
        .send({
          restaurant_id: otherRestaurantId, // Attempt to spoof
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Restaurant access denied');
    });
  });

  describe('Case-Insensitive Header Support', () => {
    it('should accept x-restaurant-id (lowercase)', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('x-restaurant-id', validRestaurantId)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });

    it('should accept X-RESTAURANT-ID (uppercase)', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${staffToken}`)
        .set('X-RESTAURANT-ID', validRestaurantId)
        .send({
          items: [{ name: 'Burger', quantity: 1, price: 10 }]
        });

      expect(response.status).toBe(201);
      expect(response.body.restaurant_id).toBe(validRestaurantId);
    });
  });
});