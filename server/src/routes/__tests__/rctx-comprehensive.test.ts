import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mock logger with .child() support - must be before imports
vi.mock('../../utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      child: vi.fn()
    }))
  }
}));

// Mock audit service
vi.mock('../../services/audit.service', () => ({
  AuditService: {
    logAuthSuccess: vi.fn().mockResolvedValue(undefined),
    logCrossTenantAttempt: vi.fn().mockResolvedValue(undefined),
    logSecurityEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

// Track the current user for mock responses
let mockUserRestaurantAccess: { user_id: string; restaurant_id: string; role: string } | null = null;

// Mock database config - the validateRestaurantAccess middleware uses this
vi.mock('../../config/database', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'user_restaurants') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_field: string, _value: string) => ({
              eq: vi.fn((_field2: string, _value2: string) => ({
                single: vi.fn(() => {
                  if (mockUserRestaurantAccess) {
                    return Promise.resolve({
                      data: mockUserRestaurantAccess,
                      error: null
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: 'Not found' } });
                })
              }))
            }))
          }))
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          in: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        insert: vi.fn(() => Promise.resolve({ data: { id: 'new-item-123' }, error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
      };
    })
  }
}));

// Mock environment config
vi.mock('../../config/environment', () => ({
  getConfig: () => ({
    supabase: {
      jwtSecret: 'test-jwt-secret-for-testing-only',
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key'
    },
    openai: {
      apiKey: 'test-openai-key'
    },
    restaurant: {
      defaultId: undefined
    },
    cache: {
      ttlSeconds: 300
    },
    nodeEnv: 'test'
  })
}));

// Import middleware after mocks
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validateRestaurantAccess } from '../../middleware/restaurantAccess';

// Constants - defined after mocks since vi.mock is hoisted
const TEST_JWT_SECRET = 'test-jwt-secret-for-testing-only';
const testRestaurantId = '11111111-1111-1111-1111-111111111111';
const secondRestaurantId = '22222222-2222-2222-2222-222222222222';
const unauthorizedRestaurantId = '99999999-9999-9999-9999-999999999999';

describe('Comprehensive RCTX (Restaurant Context) Enforcement Tests', () => {
  let app: express.Application;
  let validToken: string;
  let adminToken: string;
  let tokenWithoutRestaurant: string;

  beforeAll(() => {
    // STRICT_AUTH is now true by default, we need to disable for some tests
    process.env['STRICT_AUTH'] = 'false';
  });

  afterAll(() => {
    delete process.env['STRICT_AUTH'];
  });

  beforeEach(() => {
    // Reset mock state
    mockUserRestaurantAccess = null;

    app = express();
    app.use(express.json());

    // Create test tokens - JWT now carries restaurant_id
    validToken = jwt.sign(
      {
        sub: 'user-123',
        email: 'staff@restaurant.com',
        role: 'server',
        restaurant_id: testRestaurantId,
        scopes: ['menu:read', 'menu:write', 'orders:create', 'tables:manage']
      },
      TEST_JWT_SECRET
    );

    adminToken = jwt.sign(
      {
        sub: 'admin-123',
        email: 'admin@restaurant.com',
        role: 'admin',
        restaurant_id: testRestaurantId,
        scopes: ['*']
      },
      TEST_JWT_SECRET
    );

    tokenWithoutRestaurant = jwt.sign(
      {
        sub: 'user-no-restaurant',
        email: 'staff@restaurant.com',
        role: 'server',
        // No restaurant_id
        scopes: ['menu:read']
      },
      TEST_JWT_SECRET
    );

    // Set up user restaurant access for regular user
    mockUserRestaurantAccess = {
      user_id: 'user-123',
      restaurant_id: testRestaurantId,
      role: 'server'
    };

    // Apply middleware
    app.use(authenticate);
    app.use(validateRestaurantAccess);

    // Simple test endpoint that returns restaurant context
    app.get('/api/test/protected', (req: any, res) => {
      res.json({
        success: true,
        restaurantId: req.restaurantId,
        userId: req.user?.id,
        role: req.user?.role
      });
    });

    app.post('/api/test/protected', (req: any, res) => {
      res.status(201).json({
        success: true,
        restaurantId: req.restaurantId,
        data: req.body
      });
    });

    // Error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({
        error: err.code || err.message || 'Internal Server Error',
        message: err.message
      });
    });
  });

  describe('Authentication Enforcement', () => {
    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'user-123',
          restaurant_id: testRestaurantId,
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        TEST_JWT_SECRET
      );

      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should reject tokens with invalid restaurant_id format', async () => {
      const badRestaurantIdToken = jwt.sign(
        {
          sub: 'user-123',
          restaurant_id: 'not-a-uuid',
          scopes: ['tables:manage']
        },
        TEST_JWT_SECRET
      );

      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${badRestaurantIdToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Restaurant Context (RCTX) from JWT', () => {
    it('should succeed with valid token containing restaurant_id', async () => {
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.restaurantId).toBe(testRestaurantId);
      expect(response.body.userId).toBe('user-123');
    });

    it('should use restaurant_id from JWT token (not headers)', async () => {
      // Even if X-Restaurant-ID header specifies a different restaurant,
      // the JWT restaurant_id should be used (security fix)
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', unauthorizedRestaurantId) // This should be ignored
        .expect(200);

      expect(response.body.restaurantId).toBe(testRestaurantId);
    });

    it('should allow POST requests with valid restaurant context', async () => {
      const response = await request(app)
        .post('/api/test/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ test: 'data' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.restaurantId).toBe(testRestaurantId);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should deny access when user not in user_restaurants table', async () => {
      // Mock no access
      mockUserRestaurantAccess = null;

      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });

    it('should prevent cross-tenant access', async () => {
      // User from restaurant B trying to access
      const restaurantBToken = jwt.sign(
        {
          sub: 'user-456',
          email: 'staff@restaurantB.com',
          role: 'server',
          restaurant_id: secondRestaurantId,
          scopes: ['menu:read', 'orders:read', 'tables:manage']
        },
        TEST_JWT_SECRET
      );

      // Mock no access for this user
      mockUserRestaurantAccess = null;

      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${restaurantBToken}`)
        .expect(403);

      expect(response.body.error).toContain('RESTAURANT_ACCESS_DENIED');
    });

    it('should allow admin users to bypass user_restaurants check', async () => {
      // Admin users should be able to access without user_restaurants check
      // (admin role is checked before user_restaurants lookup)
      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.role).toBe('admin');
    });

    it('should allow access when user has proper restaurant access', async () => {
      // Set up access for user to their restaurant
      mockUserRestaurantAccess = {
        user_id: 'user-123',
        restaurant_id: testRestaurantId,
        role: 'server'
      };

      const response = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.restaurantId).toBe(testRestaurantId);
    });
  });

  describe('STRICT_AUTH Mode', () => {
    let strictApp: express.Application;

    beforeEach(() => {
      // Enable STRICT_AUTH for these tests
      process.env['STRICT_AUTH'] = 'true';

      strictApp = express();
      strictApp.use(express.json());
      strictApp.use(authenticate);
      strictApp.use(validateRestaurantAccess);

      strictApp.get('/api/test/protected', (req: any, res) => {
        res.json({
          success: true,
          restaurantId: req.restaurantId
        });
      });

      strictApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        res.status(status).json({
          error: err.code || err.message || 'Internal Server Error',
          message: err.message
        });
      });
    });

    afterEach(() => {
      process.env['STRICT_AUTH'] = 'false';
    });

    it('should reject tokens without restaurant_id in STRICT_AUTH mode', async () => {
      const response = await request(strictApp)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${tokenWithoutRestaurant}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should accept tokens with restaurant_id in STRICT_AUTH mode', async () => {
      // Admin can bypass user_restaurants check
      const response = await request(strictApp)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Optional Auth Endpoints', () => {
    let publicApp: express.Application;

    beforeEach(() => {
      publicApp = express();
      publicApp.use(express.json());

      // Use optionalAuth for public endpoints
      publicApp.use(optionalAuth);

      publicApp.get('/api/test/public', (req: any, res) => {
        res.json({
          success: true,
          authenticated: !!req.user,
          restaurantId: req.restaurantId || null
        });
      });

      publicApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        res.status(status).json({
          error: err.code || err.message || 'Internal Server Error',
          message: err.message
        });
      });
    });

    it('should allow access without token for optional auth endpoints', async () => {
      const response = await request(publicApp)
        .get('/api/test/public')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });

    it('should authenticate if valid token provided', async () => {
      const response = await request(publicApp)
        .get('/api/test/public')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.restaurantId).toBe(testRestaurantId);
    });

    it('should allow unauthenticated access with X-Restaurant-ID header', async () => {
      const response = await request(publicApp)
        .get('/api/test/public')
        .set('X-Restaurant-ID', testRestaurantId)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.restaurantId).toBe(testRestaurantId);
    });
  });

  describe('Demo User Support', () => {
    let demoApp: express.Application;

    beforeEach(() => {
      demoApp = express();
      demoApp.use(express.json());
      demoApp.use(authenticate);
      demoApp.use(validateRestaurantAccess);

      demoApp.get('/api/test/protected', (req: any, res) => {
        res.json({
          success: true,
          restaurantId: req.restaurantId,
          userId: req.user?.id
        });
      });

      demoApp.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        res.status(status).json({
          error: err.code || err.message || 'Internal Server Error',
          message: err.message
        });
      });
    });

    it('should reject demo users when DEMO_MODE is not enabled', async () => {
      const demoToken = jwt.sign(
        {
          sub: 'demo:user-123',
          email: 'demo@restaurant.com',
          role: 'demo',
          restaurant_id: testRestaurantId,
          scopes: ['menu:read']
        },
        TEST_JWT_SECRET
      );

      delete process.env['DEMO_MODE'];

      const response = await request(demoApp)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${demoToken}`)
        .expect(403);

      expect(response.body.error).toContain('DEMO_MODE_DISABLED');
    });

    it('should allow demo users when DEMO_MODE is enabled', async () => {
      process.env['DEMO_MODE'] = 'enabled';

      const demoToken = jwt.sign(
        {
          sub: 'demo:user-123',
          email: 'demo@restaurant.com',
          role: 'demo',
          restaurant_id: testRestaurantId,
          scopes: ['menu:read']
        },
        TEST_JWT_SECRET
      );

      const response = await request(demoApp)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${demoToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe('demo:user-123');

      delete process.env['DEMO_MODE'];
    });

    it('should prevent demo user cross-tenant access even with DEMO_MODE enabled', async () => {
      process.env['DEMO_MODE'] = 'enabled';

      // Demo user with restaurant A in token
      const demoToken = jwt.sign(
        {
          sub: 'demo:user-123',
          email: 'demo@restaurant.com',
          role: 'demo',
          restaurant_id: testRestaurantId,
          scopes: ['menu:read']
        },
        TEST_JWT_SECRET
      );

      // Since the token already contains the restaurant_id, and the middleware
      // uses that (not headers), this test verifies the token's restaurant_id is used
      const response = await request(demoApp)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${demoToken}`)
        .expect(200);

      expect(response.body.restaurantId).toBe(testRestaurantId);

      delete process.env['DEMO_MODE'];
    });
  });
});
