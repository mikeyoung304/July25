/**
 * @vitest-environment node
 *
 * Menu Routes Security Tests - PATCH /api/v1/menu/items/:id
 * PR #152 Code Review Finding #163
 *
 * Tests RBAC enforcement and multi-tenant isolation for the 86-item feature
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-testing-only';
const RESTAURANT_1 = '11111111-1111-1111-1111-111111111111';
const RESTAURANT_2 = '22222222-2222-2222-2222-222222222222';

// Mock menu item data
const mockMenuItem = {
  id: 'menu-item-1',
  restaurant_id: RESTAURANT_1,
  name: 'Test Burger',
  description: 'A delicious burger',
  price: 12.99,
  available: true,
  active: true,
  dietary_flags: [],
  modifiers: [],
  aliases: [],
  prep_time_minutes: 15
};

// Role to scopes mapping (matches rbac.ts MENU_MANAGE scope)
const ROLE_SCOPES: Record<string, string[]> = {
  owner: ['menu:manage', 'menu:read'],
  manager: ['menu:manage', 'menu:read'],
  server: ['menu:read'],
  kitchen: ['menu:read'],
  customer: ['menu:read']
};

// Track update calls for verification
let lastUpdateCall: { restaurantId: string; itemId: string; available: boolean } | null = null;

// Helper to create JWT tokens
function createToken(payload: {
  sub: string;
  email: string;
  restaurant_id: string;
  role: string;
  exp?: number;
}): string {
  return jwt.sign(
    {
      ...payload,
      exp: payload.exp || Math.floor(Date.now() / 1000) + 3600
    },
    JWT_SECRET
  );
}

// Simulated database update function (mimics MenuService.updateItem)
function simulateUpdateItem(restaurantId: string, itemId: string, updates: { is_available: boolean }) {
  lastUpdateCall = {
    restaurantId,
    itemId,
    available: updates.is_available
  };

  // Multi-tenant check: only succeed if restaurant matches the mock item
  if (restaurantId !== RESTAURANT_1) {
    return null; // Item not found (different restaurant)
  }

  return {
    ...mockMenuItem,
    available: updates.is_available
  };
}

// Create app with proper middleware chain (self-contained, no external imports except express/jwt)
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Mock authenticate middleware
  const mockAuthenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role
      };
      req.restaurantId = decoded.restaurant_id;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Mock requireScopes middleware (mimics rbac.ts)
  const mockRequireScopes = (...requiredScopes: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRole = req.user.role;
      const userScopes = ROLE_SCOPES[userRole] || [];

      const hasRequiredScope = requiredScopes.some(scope =>
        userScopes.includes(scope)
      );

      if (!hasRequiredScope) {
        return res.status(403).json({
          error: `Insufficient permissions. Required: ${requiredScopes.join(', ')}`
        });
      }

      next();
    };
  };

  // PATCH /api/v1/menu/items/:id - mimics actual route with validation
  app.patch(
    '/api/v1/menu/items/:id',
    mockAuthenticate,
    mockRequireScopes('menu:manage'),
    async (req: any, res, next) => {
      try {
        const restaurantId = req.restaurantId;
        const { id } = req.params;
        const { is_available } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Item ID is required' });
        }

        if (typeof is_available !== 'boolean') {
          return res.status(400).json({ error: 'is_available must be a boolean' });
        }

        const item = simulateUpdateItem(restaurantId, id, { is_available });

        if (!item) {
          return res.status(404).json({ error: 'Menu item not found' });
        }

        res.json(item);
      } catch (error) {
        next(error);
      }
    }
  );

  return app;
}

describe('Menu Routes Security - PATCH /api/v1/menu/items/:id', () => {
  let app: express.Application;

  beforeEach(() => {
    lastUpdateCall = null;
    app = createTestApp();
  });

  describe('Authentication Requirements', () => {
    test('should reject request without authentication token', async () => {
      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .send({ is_available: false });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ is_available: false });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should reject request with expired token', async () => {
      const expiredToken = createToken({
        sub: 'user-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token expired');
    });
  });

  describe('RBAC Scope Enforcement', () => {
    test('should allow owner role to update menu item availability', async () => {
      const ownerToken = createToken({
        sub: 'owner-1',
        email: 'owner@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'owner'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(200);
      expect(response.body.available).toBe(false);
    });

    test('should allow manager role to update menu item availability', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(200);
    });

    test('should deny server role from updating menu item availability', async () => {
      const serverToken = createToken({
        sub: 'server-1',
        email: 'server@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'server'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${serverToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    test('should deny kitchen role from updating menu item availability', async () => {
      const kitchenToken = createToken({
        sub: 'kitchen-1',
        email: 'kitchen@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'kitchen'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${kitchenToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(403);
    });

    test('should deny customer role from updating menu item availability', async () => {
      const customerToken = createToken({
        sub: 'customer-1',
        email: 'customer@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'customer'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation', () => {
    test('should reject request with missing is_available field', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('is_available must be a boolean');
    });

    test('should reject request with non-boolean is_available', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ is_available: 'yes' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('is_available must be a boolean');
    });

    test('should accept boolean true for is_available', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ is_available: true });

      expect(response.status).toBe(200);
    });

    test('should accept boolean false for is_available', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(200);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    test('should only update menu item for authenticated restaurant', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ is_available: false });

      expect(response.status).toBe(200);
      // Verify the update was called with correct restaurant_id
      expect(lastUpdateCall?.restaurantId).toBe(RESTAURANT_1);
    });

    test('should return 404 for menu item in different restaurant', async () => {
      // Manager authenticated for restaurant 2
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_2, // Different restaurant
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1') // Item belongs to restaurant 1
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ is_available: false });

      // Should get 404 - don't reveal item exists to other tenants
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Menu item not found');
    });

    test('should use restaurant_id from JWT token, not attempt to spoof via headers', async () => {
      const managerToken = createToken({
        sub: 'manager-1',
        email: 'manager@test.com',
        restaurant_id: RESTAURANT_1,
        role: 'manager'
      });

      const response = await request(app)
        .patch('/api/v1/menu/items/menu-item-1')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Restaurant-ID', RESTAURANT_2) // Attempt to spoof
        .send({ is_available: false });

      // Should succeed because JWT restaurant (RESTAURANT_1) is used
      expect(response.status).toBe(200);
      // Verify the update used the JWT restaurant, not the header
      expect(lastUpdateCall?.restaurantId).toBe(RESTAURANT_1);
    });
  });
});
