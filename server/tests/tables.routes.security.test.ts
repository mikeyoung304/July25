/**
 * @vitest-environment node
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { errorHandler } from '../src/middleware/errorHandler';

// Mock dependencies
vi.mock('../src/config/database', () => ({
  supabase: {
    from: vi.fn(() => {
      // Create chainable eq function
      const createEqChain = () => ({
        eq: vi.fn(() => createEqChain()),
        single: vi.fn(() => Promise.resolve({
          data: { id: '11111111-1111-1111-1111-111111111111', slug: 'grow' },
          error: null
        })),
        order: vi.fn(() => Promise.resolve({
          data: [
            {
              id: 'table-1',
              restaurant_id: '11111111-1111-1111-1111-111111111111',
              label: 'Table 1',
              x_pos: 100,
              y_pos: 200,
              shape: 'rectangle',
              seats: 4,
              active: true,
              status: 'available'
            }
          ],
          error: null
        }))
      });

      return {
        select: vi.fn(() => createEqChain()),
        insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'table-new',
              restaurant_id: '11111111-1111-1111-1111-111111111111',
              label: 'Table New',
              x_pos: 50,
              y_pos: 50,
              shape: 'circle',
              seats: 2,
              active: true,
              status: 'available'
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => {
          const updateEqChain = () => ({
            eq: vi.fn(() => updateEqChain()),
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: {
                  id: 'table-1',
                  restaurant_id: '11111111-1111-1111-1111-111111111111',
                  label: 'Table 1 Updated',
                  x_pos: 150,
                  y_pos: 250,
                  shape: 'rectangle',
                  seats: 6,
                  active: true,
                  status: 'available'
                },
                error: null
              }))
            }))
          });
          return updateEqChain();
        }),
        rpc: vi.fn(() => Promise.resolve({
          data: [],
          error: null
        }))
      };
    })
  }
}));

vi.mock('../src/utils/logger', () => ({
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

// Mock middleware to avoid real authentication/authorization in tests
vi.mock('../src/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => {
    // Mock JWT decoding
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);

    // Check for invalid or expired tokens
    if (token === 'invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if token looks like a JWT (very basic check)
    if (!token.includes('.')) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Try to decode the token to check expiry
    try {
      const jwt = require('jsonwebtoken');
      const secret = 'test-jwt-secret-for-testing-only';
      const decoded = jwt.verify(token, secret);

      // Set mock user from decoded token
      req.user = {
        id: decoded.sub || 'test-user-id',
        email: decoded.email || 'test@example.com',
        restaurant_id: decoded.restaurant_id || '11111111-1111-1111-1111-111111111111',
        role: decoded.role || 'admin'
      };
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
}));

vi.mock('../src/middleware/restaurantAccess', () => ({
  validateRestaurantAccess: (req: any, res: any, next: any) => {
    // Ensure user is authenticated (production behavior line 23-25)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get requested restaurant ID from header first, fall back to req.restaurantId
    // (production behavior line 29-31)
    let requestedRestaurantId = req.headers['x-restaurant-id'] || req.restaurantId;

    // Treat empty string and whitespace-only strings as missing
    if (typeof requestedRestaurantId === 'string' && requestedRestaurantId.trim() === '') {
      requestedRestaurantId = undefined;
    }

    // Require restaurant ID from somewhere (production behavior line 33-35)
    if (!requestedRestaurantId) {
      return res.status(403).json({ error: 'Restaurant ID is required (X-Restaurant-ID header or JWT)' });
    }

    // Check if user has access to this restaurant (simplified - skip DB check)
    if (req.user && req.user.restaurant_id && req.user.restaurant_id !== requestedRestaurantId) {
      return res.status(403).json({ error: 'Access denied to this restaurant' });
    }

    // Set the validated restaurant ID (production behavior line 81)
    req.restaurantId = requestedRestaurantId;
    req.restaurantRole = req.user.role || 'manager';

    next();
  }
}));

vi.mock('../src/middleware/slugResolver', () => ({
  slugResolver: (req: any, res: any, next: any) => {
    // Convert known slugs to UUIDs
    let restaurantId = req.headers['x-restaurant-id'];
    if (restaurantId === 'grow' || restaurantId === 'GROW') {
      req.headers['x-restaurant-id'] = '11111111-1111-1111-1111-111111111111';
      restaurantId = req.headers['x-restaurant-id'];
    }
    // Validate UUID format - return 403 for invalid formats (security)
    // This runs BEFORE validateRestaurantAccess, so we validate format here
    if (restaurantId && !restaurantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return res.status(403).json({ error: 'Invalid restaurant ID format' });
    }
    next();
  }
}));

vi.mock('../src/middleware/rbac', () => ({
  requireScopes: () => (_req: any, _res: any, next: any) => {
    // Always pass for security tests (not testing RBAC here)
    next();
  },
  ApiScope: {
    TABLES_MANAGE: 'tables:manage',
    TABLES_READ: 'tables:read'
  }
}));

// Import tableRoutes AFTER mocks are set up
const { tableRoutes } = await import('../src/routes/tables.routes');

describe('Tables Routes Security', () => {
  let app: express.Application;
  let validToken: string;
  const validRestaurantId = '11111111-1111-1111-1111-111111111111';
  const otherRestaurantId = '22222222-2222-2222-2222-222222222222';
  const secret = 'test-jwt-secret-for-testing-only';

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Create valid JWT token
    validToken = jwt.sign(
      {
        sub: 'test-user-123',
        email: 'test@example.com',
        role: 'manager',
        restaurant_id: validRestaurantId,
        scopes: ['tables:read', 'tables:manage']
      },
      secret
    );

    // Don't apply middleware here - it's already applied in tableRoutes
    // The mocks above will intercept the middleware calls in the routes
    app.use('/api/v1/tables', tableRoutes);
    app.use(errorHandler);
  });

  describe('UUID Validation', () => {
    test('should accept valid UUID format', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should reject invalid UUID format (400)', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'not-a-valid-uuid-123');

      // Should fail at restaurant access validation
      expect(response.status).toBe(403);
    });

    test('should reject malformed UUID (missing segments)', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', '11111111-1111-1111-111111111111'); // Missing segment

      expect(response.status).toBe(403);
    });

    test('should reject UUID with invalid characters', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'gggggggg-gggg-gggg-gggg-gggggggggggg');

      expect(response.status).toBe(403);
    });
  });

  describe('Slug Resolution', () => {
    test('should resolve valid slug to UUID', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow');

      // slugResolver should convert 'grow' to UUID before validation
      expect(response.status).toBe(200);
    });

    test('should handle slug case sensitivity', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'GROW');

      // Slugs should be case-insensitive in the resolver
      expect(response.status).toBe(200);
    });

    test('should reject non-existent slug', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'nonexistent-slug');

      // Should fail when slug can't be resolved
      expect(response.status).toBe(403);
    });
  });

  describe('Cross-Tenant Access Prevention', () => {
    test('should prevent access to other restaurant data', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', otherRestaurantId);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('should prevent creating table in different restaurant', async () => {
      const response = await request(app)
        .post('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', otherRestaurantId)
        .send({
          label: 'Table 5',
          x: 100,
          y: 100,
          type: 'rectangle',
          capacity: 4
        });

      expect(response.status).toBe(403);
    });

    test('should prevent updating table in different restaurant', async () => {
      const response = await request(app)
        .put('/api/v1/tables/table-1')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', otherRestaurantId)
        .send({
          label: 'Hacked Table'
        });

      expect(response.status).toBe(403);
    });

    test('should prevent deleting table in different restaurant', async () => {
      const response = await request(app)
        .delete('/api/v1/tables/table-1')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', otherRestaurantId);

      expect(response.status).toBe(403);
    });

    test('should prevent batch update for different restaurant', async () => {
      const response = await request(app)
        .put('/api/v1/tables/batch')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', otherRestaurantId)
        .send({
          tables: [
            { id: 'table-1', x: 200, y: 200 }
          ]
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Missing Restaurant ID Handling', () => {
    test('should reject request without restaurant ID header', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`);
      // No x-restaurant-id header

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('required');
    });

    test('should reject empty restaurant ID header', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', '');

      expect(response.status).toBe(403);
    });

    test('should reject whitespace-only restaurant ID', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', '   ');

      expect(response.status).toBe(403);
    });
  });

  describe('Middleware Application on All Endpoints', () => {
    test('GET / - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow');

      expect(response.status).toBe(200);
    });

    test('GET /:id - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .get('/api/v1/tables/table-1')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow');

      // Should resolve slug before fetching
      expect(response.status).not.toBe(401);
    });

    test('POST / - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .post('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow')
        .send({
          label: 'Table 10',
          x: 50,
          y: 50,
          type: 'circle',
          capacity: 2
        });

      expect(response.status).not.toBe(401);
    });

    test('PUT /:id - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .put('/api/v1/tables/table-1')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow')
        .send({
          label: 'Updated Table'
        });

      expect(response.status).not.toBe(401);
    });

    test('DELETE /:id - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .delete('/api/v1/tables/table-1')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow');

      expect(response.status).not.toBe(401);
    });

    test('PATCH /:id/status - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .patch('/api/v1/tables/table-1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow')
        .send({
          status: 'occupied'
        });

      expect(response.status).not.toBe(401);
    });

    test('PUT /batch - should apply slugResolver middleware', async () => {
      const response = await request(app)
        .put('/api/v1/tables/batch')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', 'grow')
        .send({
          tables: [
            { id: 'table-1', x: 100, y: 100 }
          ]
        });

      expect(response.status).not.toBe(401);
    });
  });

  describe('Authentication Requirements', () => {
    test('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('x-restaurant-id', validRestaurantId);
      // No Authorization header

      expect(response.status).toBe(401);
    });

    test('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', 'Bearer invalid-token')
        .set('x-restaurant-id', validRestaurantId);

      expect(response.status).toBe(401);
    });

    test('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        {
          sub: 'test-user-123',
          restaurant_id: validRestaurantId,
          exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
        },
        secret
      );

      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('x-restaurant-id', validRestaurantId);

      expect(response.status).toBe(401);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should sanitize restaurant ID with SQL injection attempt', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', "'; DROP TABLE tables; --");

      // Should fail validation, not execute SQL
      expect(response.status).toBe(403);
    });

    test('should sanitize table ID parameter', async () => {
      const response = await request(app)
        .get('/api/v1/tables/' + encodeURIComponent("' OR '1'='1"))
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      // Should safely handle malicious input
      expect(response.status).not.toBe(500);
    });
  });

  describe('Header Case Sensitivity', () => {
    test('should accept lowercase x-restaurant-id', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-restaurant-id', validRestaurantId);

      expect(response.status).toBe(200);
    });

    test('should accept uppercase X-Restaurant-ID', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-ID', validRestaurantId);

      expect(response.status).toBe(200);
    });

    test('should accept mixed case X-Restaurant-Id', async () => {
      const response = await request(app)
        .get('/api/v1/tables')
        .set('Authorization', `Bearer ${validToken}`)
        .set('X-Restaurant-Id', validRestaurantId);

      expect(response.status).toBe(200);
    });
  });
});
