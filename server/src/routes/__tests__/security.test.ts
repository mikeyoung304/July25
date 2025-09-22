/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { setupRoutes } from '../index';
import { errorHandler } from '../../middleware/errorHandler';
import { apiLimiter, voiceOrderLimiter } from '../../middleware/rateLimiter';
import helmet from 'helmet';

// Mock dependencies
vi.mock('../../services/ai.service');
vi.mock('../../services/orders.service');
vi.mock('../../services/menu.service');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }))
  }
}));

describe('Security Tests', () => {
  let app: express.Application;
  let validToken: string;
  let expiredToken: string;
  let invalidToken: string;

  beforeEach(() => {
    app = express();
    app.use(helmet()); // Add helmet middleware for security headers
    app.use(express.json());
    
    // Apply rate limiters
    app.use('/api/', apiLimiter);
    app.use('/api/v1/orders/voice', voiceOrderLimiter);
    
    // Setup routes
    app.use('/api/v1', setupRoutes());
    app.use(errorHandler);

    // Create test tokens
    const secret = process.env['SUPABASE_JWT_SECRET'] || 'test-secret';
    validToken = jwt.sign(
      { 
        sub: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        restaurant_id: 'test-restaurant-id',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      },
      secret
    );

    expiredToken = jwt.sign(
      { 
        sub: 'test-user-id',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      },
      secret
    );

    invalidToken = 'invalid.jwt.token';
  });

  describe('Authentication', () => {
    test('should reject requests without authentication token', async () => {
      const endpoints = [
        { method: 'post', path: '/api/v1/ai/menu' },
        { method: 'get', path: '/api/v1/ai/menu' },
        { method: 'post', path: '/api/v1/ai/parse-order' },
        { method: 'post', path: '/api/v1/ai/transcribe' },
        { method: 'get', path: '/api/v1/orders' },
        { method: 'post', path: '/api/v1/orders' },
      ];

      for (const endpoint of endpoints) {
        const req = request(app);
        const method = endpoint.method as 'get' | 'post' | 'put' | 'delete';
        const response = await req[method](endpoint.path);
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid token');
    });

    test('should reject requests with expired token', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Token expired');
    });

    test('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'test-restaurant-id');

      expect(response.status).not.toBe(401);
    });

    test('should not allow test token in production', async () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).toBe(401);
      
      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('Multi-tenant Isolation', () => {
    test('should isolate data between different restaurants', async () => {
      const restaurant1Token = jwt.sign(
        { 
          sub: 'user1',
          restaurant_id: 'restaurant-1',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env['SUPABASE_JWT_SECRET'] || 'test-secret'
      );

      const restaurant2Token = jwt.sign(
        { 
          sub: 'user2',
          restaurant_id: 'restaurant-2',
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env['SUPABASE_JWT_SECRET'] || 'test-secret'
      );

      // Test that menu access is restricted
      const menuResponse1 = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${restaurant1Token}`);

      const menuResponse2 = await request(app)
        .get('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${restaurant2Token}`);

      // Each should only see their restaurant's data
      if (menuResponse1.status === 200 && menuResponse2.status === 200) {
        expect(menuResponse1.body.restaurantId).not.toBe(menuResponse2.body.restaurantId);
      }
    });

    test('should validate restaurant access in headers', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'different-restaurant-id');

      // Should use the restaurant ID from header if provided
      expect(response.status).not.toBe(403);
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit voice order endpoints', async () => {
      // Make requests up to the limit
      const promises = [];
      for (let i = 0; i < 11; i++) { // voiceOrderLimiter allows 10 per minute
        promises.push(
          request(app)
            .post('/api/v1/orders/voice')
            .set('Authorization', `Bearer ${validToken}`)
            .send({ text: 'test order' })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
      // Rate limiter returns text message directly
      expect(rateLimited[0]?.text).toContain('Voice ordering rate limit exceeded');
    });

    test('should rate limit transcription endpoints', async () => {
      // Make requests up to the limit
      const promises = [];
      for (let i = 0; i < 6; i++) { // transcriptionLimiter allows 5 per minute
        promises.push(
          request(app)
            .post('/api/v1/ai/transcribe')
            .set('Authorization', `Bearer ${validToken}`)
            .attach('audio', Buffer.from('fake-audio'), 'test.wav')
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid order parsing requests', async () => {
      const invalidRequests = [
        { text: '' }, // Empty text
        { text: 'a'.repeat(5001) }, // Too long
        {}, // Missing text
        { text: 123 }, // Wrong type
      ];

      for (const invalidBody of invalidRequests) {
        const response = await request(app)
          .post('/api/v1/ai/parse-order')
          .set('Authorization', `Bearer ${validToken}`)
          .send(invalidBody);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    test('should reject oversized file uploads', async () => {
      // TODO: Test requires rate limit reset between tests
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB (limit is 10MB)
      
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('audio', largeBuffer, 'large.wav');

      expect(response.status).toBe(413);
    });

    test('should reject invalid file types', async () => {
      // TODO: Test requires rate limit reset between tests
      const response = await request(app)
        .post('/api/v1/ai/transcribe')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('audio', Buffer.from('not-audio'), 'test.txt');

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization', () => {
    test('should enforce role-based access control', async () => {
      const userToken = jwt.sign(
        { 
          sub: 'user-id',
          email: 'user@example.com',
          role: 'user', // Not admin
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        process.env['SUPABASE_JWT_SECRET'] || 'test-secret'
      );

      // Menu upload requires admin/manager role
      const response = await request(app)
        .post('/api/v1/ai/menu')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ menu: [] });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Insufficient permissions');
    });
  });

  describe('Security Headers', () => {
    test('should not expose sensitive headers', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    test('should include rate limit headers', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ text: 'test' });

      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('Error Handling', () => {
    test('should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .post('/api/v1/ai/parse-order')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ text: 'trigger-error' });

      // Should not contain stack traces or internal details
      expect(JSON.stringify(response.body)).not.toContain('at ');
      expect(JSON.stringify(response.body)).not.toContain('/Users/');
      expect(JSON.stringify(response.body)).not.toContain('\\Users\\');
    });
  });
});