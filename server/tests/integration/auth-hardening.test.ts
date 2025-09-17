import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Application } from 'express';
import { authenticate } from '../../src/middleware/auth';
import { validateRestaurantAccess } from '../../src/middleware/restaurantAccess';
import { csrfMiddleware, csrfToken } from '../../src/middleware/csrf';
import jwt from 'jsonwebtoken';

// Mock environment for testing
const originalEnv = process.env;

describe('Authentication Hardening Integration Tests', () => {
  let app: Application;
  let validToken: string;
  let testToken = 'test-token';

  beforeAll(() => {
    // Setup test app
    app = express();
    app.use(express.json());

    // Add CSRF middleware
    app.use(csrfMiddleware());

    // Test route with authentication
    app.get('/api/protected', authenticate, validateRestaurantAccess, (req, res) => {
      res.json({
        message: 'Protected route accessed',
        userId: (req as any).user?.id,
        restaurantId: (req as any).restaurantId
      });
    });

    // CSRF token endpoint
    app.get('/api/csrf-token', csrfToken);

    // Test route for write operations
    app.post('/api/data', authenticate, validateRestaurantAccess, (req, res) => {
      res.json({ success: true });
    });

    // Create valid JWT token for testing
    validToken = jwt.sign(
      {
        sub: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        restaurant_id: 'restaurant-1'
      },
      process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Test Token Bypass Prevention', () => {
    it('should reject test-token in production environment', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Test tokens not allowed');
    });

    it('should reject test-token in development environment', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Test tokens not allowed');
    });

    it('should allow test-token ONLY in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('test-user-id');
    });
  });

  describe('CSRF Protection', () => {
    it('should enforce CSRF protection in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/data')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'restaurant-1')
        .send({ data: 'test' });

      // Should fail without CSRF token
      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CSRF');
    });

    it('should skip CSRF protection ONLY in test environment', async () => {
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .post('/api/data')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'restaurant-1')
        .send({ data: 'test' });

      // Should succeed without CSRF token in test
      expect(response.status).toBe(200);
    });
  });

  describe('Restaurant Context Validation', () => {
    it('should require restaurant context for write operations', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`);
      // Missing x-restaurant-id header

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Restaurant');
    });

    it('should validate restaurant context from token', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(200);
      expect(response.body.restaurantId).toBe('restaurant-1');
    });

    it('should reject mismatched restaurant context', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'restaurant-999'); // Different from token

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Restaurant access denied');
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for protected routes', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('x-restaurant-id', 'restaurant-1');
      // Missing Authorization header

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject invalid JWT tokens', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid token');
    });

    it('should reject expired JWT tokens', async () => {
      process.env.NODE_ENV = 'production';

      // Create expired token
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          restaurant_id: 'restaurant-1'
        },
        process.env.SUPABASE_JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Token expired');
    });
  });

  describe('Development Bypass Removal', () => {
    it('should not have any __DEV__ bypasses in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.__DEV__ = 'true'; // Try to inject dev flag

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-restaurant-id', 'restaurant-1');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Test tokens not allowed');
    });

    it('should not bypass auth with NODE_ENV manipulation', async () => {
      // Temporarily set production, then try to change it
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', `Bearer ${testToken}`)
        .set('x-restaurant-id', 'restaurant-1')
        .set('x-node-env', 'test'); // Try to inject test env via header

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Test tokens not allowed');
    });
  });
});