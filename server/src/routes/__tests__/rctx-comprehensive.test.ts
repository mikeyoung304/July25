import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Import all route handlers that need RCTX testing
import menuRouter from '../menu.routes';
import tablesRouter from '../tables.routes';
import restaurantsRouter from '../restaurants.routes';
import authRouter from '../auth.routes';
import realtimeRouter from '../realtime.routes';
import terminalRouter from '../terminal.routes';

// Import middleware
import { authenticate } from '../../middleware/auth';
import { validateRestaurantAccess } from '../../middleware/restaurantAccess';

// Mock Supabase
vi.mock('../../services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

// Mock config
vi.mock('../../config', () => ({
  config: {
    supabase: {
      jwtSecret: 'test-jwt-secret-for-testing-only',
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'
    },
    openai: {
      apiKey: 'test-openai-key'
    }
  }
}));

// Mock WebSocket for realtime routes
vi.mock('ws', () => ({
  WebSocketServer: vi.fn(() => ({
    on: vi.fn(),
    clients: new Set()
  }))
}));

describe('Comprehensive RCTX (Restaurant Context) Enforcement Tests', () => {
  let app: express.Application;
  let validToken: string;
  let adminToken: string;
  const testRestaurantId = '11111111-1111-1111-1111-111111111111';
  const unauthorizedRestaurantId = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Create test tokens
    validToken = jwt.sign(
      {
        sub: 'user-123',
        email: 'staff@restaurant.com',
        role: 'server',
        restaurant_id: testRestaurantId,
        scopes: ['menu:read', 'menu:write', 'orders:create', 'tables:manage']
      },
      'test-jwt-secret-for-testing-only'
    );

    adminToken = jwt.sign(
      {
        sub: 'admin-123',
        email: 'admin@restaurant.com',
        role: 'admin',
        restaurant_id: testRestaurantId,
        scopes: ['*']
      },
      'test-jwt-secret-for-testing-only'
    );

    // Apply middleware
    app.use(authenticate);
    app.use(validateRestaurantAccess);
    
    // Mount routers
    app.use('/api/v1/menu', menuRouter);
    app.use('/api/v1/tables', tablesRouter);
    app.use('/api/v1/restaurants', restaurantsRouter);
    app.use('/api/v1/auth', authRouter);
    app.use('/api/v1/realtime', realtimeRouter);
    app.use('/api/v1/terminal', terminalRouter);
  });

  describe('Menu Routes RCTX Enforcement', () => {
    describe('GET /api/v1/menu/items (PUBLIC - should NOT require RCTX)', () => {
      it('should allow public access without X-Restaurant-ID', async () => {
        const response = await request(app)
          .get('/api/v1/menu/items')
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('POST /api/v1/menu/items (PROTECTED - requires RCTX)', () => {
      const menuItem = {
        name: 'Test Item',
        price: 10.99,
        categoryId: 'cat-123',
        description: 'Test description'
      };

      it('should return 400 without X-Restaurant-ID header', async () => {
        const response = await request(app)
          .post('/api/v1/menu/items')
          .set('Authorization', `Bearer ${validToken}`)
          .send(menuItem)
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });

      it('should return 403 for unauthorized restaurant', async () => {
        const response = await request(app)
          .post('/api/v1/menu/items')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Restaurant-ID', unauthorizedRestaurantId)
          .send(menuItem)
          .expect(403);

        expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
      });

      it('should succeed with valid RCTX', async () => {
        const response = await request(app)
          .post('/api/v1/menu/items')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Restaurant-ID', testRestaurantId)
          .send(menuItem)
          .expect(201);

        expect(response.body).toHaveProperty('id');
      });
    });

    describe('PUT /api/v1/menu/items/:id (PROTECTED)', () => {
      it('should enforce RCTX for menu updates', async () => {
        const response = await request(app)
          .put('/api/v1/menu/items/item-123')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ price: 12.99 })
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });
    });

    describe('DELETE /api/v1/menu/items/:id (PROTECTED)', () => {
      it('should enforce RCTX for menu deletion', async () => {
        const response = await request(app)
          .delete('/api/v1/menu/items/item-123')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });
    });
  });

  describe('Tables Routes RCTX Enforcement', () => {
    describe('GET /api/v1/tables', () => {
      it('should require RCTX for table listing', async () => {
        const response = await request(app)
          .get('/api/v1/tables')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });

      it('should return tables with valid RCTX', async () => {
        const response = await request(app)
          .get('/api/v1/tables')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Restaurant-ID', testRestaurantId)
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('POST /api/v1/tables', () => {
      const newTable = {
        tableNumber: '10',
        capacity: 4,
        status: 'available'
      };

      it('should enforce RCTX for table creation', async () => {
        const response = await request(app)
          .post('/api/v1/tables')
          .set('Authorization', `Bearer ${validToken}`)
          .send(newTable)
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });

      it('should prevent cross-restaurant table creation', async () => {
        const response = await request(app)
          .post('/api/v1/tables')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Restaurant-ID', unauthorizedRestaurantId)
          .send(newTable)
          .expect(403);

        expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
      });
    });

    describe('PUT /api/v1/tables/:id/status', () => {
      it('should enforce RCTX for status updates', async () => {
        const response = await request(app)
          .put('/api/v1/tables/table-123/status')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ status: 'occupied' })
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });
    });
  });

  describe('Realtime Routes RCTX Enforcement', () => {
    describe('POST /api/v1/realtime/session', () => {
      it('should require RCTX for WebRTC session creation', async () => {
        const response = await request(app)
          .post('/api/v1/realtime/session')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });

      it('should create session with valid RCTX', async () => {
        const response = await request(app)
          .post('/api/v1/realtime/session')
          .set('Authorization', `Bearer ${validToken}`)
          .set('X-Restaurant-ID', testRestaurantId)
          .expect(200);

        expect(response.body).toHaveProperty('sessionId');
      });
    });
  });

  describe('Auth Routes (Should NOT require RCTX)', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should allow login without X-Restaurant-ID', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@example.com', password: 'password123' })
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should allow token refresh without X-Restaurant-ID', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: 'refresh-token-123' })
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('Terminal Routes RCTX Enforcement', () => {
    describe('POST /api/v1/terminal/pin-login', () => {
      it('should require RCTX for PIN login', async () => {
        const response = await request(app)
          .post('/api/v1/terminal/pin-login')
          .send({ pin: '1234' })
          .expect(400);

        expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
      });

      it('should validate restaurant context for PIN login', async () => {
        const response = await request(app)
          .post('/api/v1/terminal/pin-login')
          .set('X-Restaurant-ID', testRestaurantId)
          .send({ pin: '1234' })
          .expect(200);

        expect(response.body).toBeDefined();
      });
    });
  });

  describe('RCTX Header Validation', () => {
    it('should reject non-UUID restaurant IDs', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', 'invalid-id-format')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle case-insensitive header names', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', testRestaurantId)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should reject empty restaurant ID', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', '')
        .expect(400);

      expect(response.body.error).toContain('RESTAURANT_CONTEXT_MISSING');
    });

    it('should handle whitespace in restaurant ID', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', `  ${testRestaurantId}  `)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should prevent data leakage between restaurants', async () => {
      // User from restaurant A should not access restaurant B's data
      const restaurantBToken = jwt.sign(
        {
          sub: 'user-456',
          email: 'staff@restaurantB.com',
          role: 'server',
          restaurant_id: '33333333-3333-3333-3333-333333333333',
          scopes: ['menu:read', 'orders:read']
        },
        'test-jwt-secret-for-testing-only'
      );

      // Try to access restaurant A's data with restaurant B's token
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${restaurantBToken}`)
        .set('X-Restaurant-ID', testRestaurantId)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });

    it('should enforce restaurant boundaries for admin users', async () => {
      // Even admin users should be restricted to their restaurant
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Restaurant-ID', unauthorizedRestaurantId)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });
  });
});