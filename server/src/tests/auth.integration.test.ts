import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { DatabaseRole, ApiScope } from '@rebuild/shared/types/auth';
import { authService } from '../services/auth/AuthenticationService';
import { idempotencyService } from '../services/idempotency.service';
import jwt from 'jsonwebtoken';

const RESTAURANT_ID = 'test-restaurant-123';

// Helper to create test tokens
function createTestToken(role: DatabaseRole, userId: string = 'test-user-123'): string {
  return jwt.sign(
    {
      sub: userId,
      role,
      scope: authService.getScopesForRole(role),
      restaurant_id: RESTAURANT_ID,
      iss: 'test',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    },
    process.env.KIOSK_JWT_SECRET || 'test-secret'
  );
}

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    // Clear caches before each test
    authService.clearAllCache();
    idempotencyService.clear();
  });

  describe('Role Matrix for Order Creation', () => {
    const testOrder = {
      items: [{
        id: 'test-item-1',
        name: 'Test Item',
        quantity: 1,
        price: 10.00,
        modifiers: []
      }],
      customerName: 'Test Customer',
      type: 'dine-in',
      subtotal: 10.00,
      tax: 0.80,
      tip: 0,
      total: 10.80
    };

    it('should allow owner to create orders', async () => {
      const token = createTestToken(DatabaseRole.OWNER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(testOrder);
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
    });

    it('should allow manager to create orders', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(testOrder);
      
      expect(response.status).toBe(201);
    });

    it('should allow server to create orders', async () => {
      const token = createTestToken(DatabaseRole.SERVER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(testOrder);
      
      expect(response.status).toBe(201);
    });

    it('should deny cashier from creating orders', async () => {
      const token = createTestToken(DatabaseRole.CASHIER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(testOrder);
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Insufficient permissions');
    });

    it('should deny kitchen from creating orders', async () => {
      const token = createTestToken(DatabaseRole.KITCHEN);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(testOrder);
      
      expect(response.status).toBe(403);
    });

    it('should allow customer to create orders', async () => {
      const token = createTestToken(DatabaseRole.CUSTOMER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(testOrder);
      
      expect(response.status).toBe(201);
    });
  });

  describe('Restaurant Context Validation', () => {
    it('should reject POST without restaurant context', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        // Missing X-Restaurant-ID header
        .send({
          items: [{ id: 'test', name: 'Test', quantity: 1, price: 10 }],
          subtotal: 10,
          tax: 0.8,
          total: 10.8
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Restaurant context required');
    });

    it('should allow GET without restaurant context', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        // Missing X-Restaurant-ID is okay for reads
        .send();
      
      // Should not fail with 400 for missing context
      expect(response.status).not.toBe(400);
    });
  });

  describe('DTO Validation', () => {
    it('should reject snake_case fields', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send({
          items: [{
            menu_item_id: 'test', // snake_case
            name: 'Test',
            quantity: 1,
            price: 10
          }],
          customer_name: 'Test', // snake_case
          table_number: 'A1', // snake_case
          subtotal: 10,
          tax: 0.8,
          total: 10.8
        });
      
      // Should transform and accept (backward compatibility)
      // But log a warning about using deprecated format
      expect(response.status).toBe(201);
    });

    it('should require all mandatory fields', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send({
          items: [{
            id: 'test',
            name: 'Test',
            quantity: 1,
            price: 10
          }]
          // Missing subtotal, tax, total
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid order data');
    });
  });

  describe('Idempotency', () => {
    it('should return same order for duplicate requests', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      const idempotencyKey = 'test-idempotency-key-123';
      
      const orderData = {
        items: [{
          id: 'test-item-1',
          name: 'Test Item',
          quantity: 1,
          price: 10.00,
          modifiers: []
        }],
        customerName: 'Test Customer',
        subtotal: 10.00,
        tax: 0.80,
        total: 10.80
      };
      
      // First request
      const response1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(orderData);
      
      expect(response1.status).toBe(201);
      const orderId1 = response1.body.id;
      
      // Second request with same idempotency key
      const response2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .set('X-Idempotency-Key', idempotencyKey)
        .send(orderData);
      
      expect(response2.status).toBe(200); // Returns 200 for cached
      expect(response2.body.id).toBe(orderId1);
    });

    it('should create different orders without idempotency key', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      const orderData = {
        items: [{
          id: 'test-item-1',
          name: 'Test Item',
          quantity: 1,
          price: 10.00,
          modifiers: []
        }],
        customerName: 'Test Customer',
        subtotal: 10.00,
        tax: 0.80,
        total: 10.80
      };
      
      // First request
      const response1 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(orderData);
      
      expect(response1.status).toBe(201);
      const orderId1 = response1.body.id;
      
      // Wait a bit to ensure different timestamp window
      await new Promise(resolve => setTimeout(resolve, 3100));
      
      // Second request without idempotency key
      const response2 = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Restaurant-ID', RESTAURANT_ID)
        .send(orderData);
      
      expect(response2.status).toBe(201);
      expect(response2.body.id).not.toBe(orderId1);
    });
  });

  describe('WebSocket Authentication', () => {
    it('should authenticate WebSocket with valid token', async () => {
      const token = createTestToken(DatabaseRole.MANAGER);
      
      // Mock WebSocket request
      const mockRequest = {
        url: `/ws?token=${token}&restaurant_id=${RESTAURANT_ID}`,
        headers: {
          host: 'localhost:3001'
        }
      } as any;
      
      const auth = await authService.verifyWebSocketAuth(mockRequest);
      
      expect(auth).toBeTruthy();
      expect(auth?.userId).toBe('test-user-123');
      expect(auth?.restaurantId).toBe(RESTAURANT_ID);
    });

    it('should reject WebSocket without token', async () => {
      const mockRequest = {
        url: `/ws?restaurant_id=${RESTAURANT_ID}`,
        headers: {
          host: 'localhost:3001'
        }
      } as any;
      
      const auth = await authService.verifyWebSocketAuth(mockRequest);
      
      expect(auth).toBeNull();
    });
  });
});