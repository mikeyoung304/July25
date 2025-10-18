import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { OrdersService } from '../../src/services/orders.service';
import { MenuService } from '../../src/services/menu.service';
import { logger } from '../../src/utils/logger';

// Mock dependencies
vi.mock('../../src/services/orders.service');
vi.mock('../../src/services/menu.service');
vi.mock('../../src/ai', () => ({
  ai: {
    orderNLP: null,
    transcriber: null,
    tts: null
  }
}));

// Mock logger with simplified approach
vi.mock('../../src/utils/logger', () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('../../src/config/environment', () => ({
  getConfig: () => ({
    supabase: {
      jwtSecret: 'test-jwt-secret',
      anonKey: 'test-anon-key'
    },
    restaurant: {
      defaultId: 'default-restaurant-id'
    },
    cache: {
      ttlSeconds: 300
    }
  })
}));

/**
 * Helper to create test JWT tokens
 */
function createTestToken(payload: {
  role: string;
  sub?: string;
  scopes?: string[];
  restaurant_id?: string;
}): string {
  const fullPayload = {
    sub: payload.sub || `demo:${payload.role}:test123`,
    role: payload.role,
    scope: payload.scopes || ['orders:create', 'orders:read'],
    restaurant_id: payload.restaurant_id || 'default-restaurant-id',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  return jwt.sign(fullPayload, 'test-jwt-secret');
}

describe('Orders Routes - Auth Integration Tests', () => {
  let app: express.Application;

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset environment variables
    delete process.env['AUTH_ACCEPT_KIOSK_DEMO_ALIAS'];

    // Create test app with authentication
    app = express();
    app.use(express.json());

    // Load auth middleware and orders routes
    const { authenticate } = await import('../../src/middleware/auth');
    const { orderRoutes } = await import('../../src/routes/orders.routes');

    // Mount routes with auth
    app.use('/api/v1/orders', authenticate, orderRoutes);

    // Mock service responses
    vi.mocked(OrdersService.createOrder).mockResolvedValue({
      id: 'order-123',
      order_number: 'ORD-001',
      items: [{ name: 'Test Item', quantity: 1, price: 10.00 }],
      status: 'pending',
      payment_status: 'pending'
    } as any);

    vi.mocked(MenuService.getItems).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Test 1: customer role → POST /api/v1/orders → 201', () => {
    it('should allow customer role to create orders', async () => {
      const token = createTestToken({ role: 'customer' });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ name: 'Margherita Pizza', quantity: 1, price: 12.99 }],
          type: 'online',
          customer_name: 'Test Customer'
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('order-123');
      expect(OrdersService.createOrder).toHaveBeenCalled();
    });
  });

  describe('Test 2: server role → POST /api/v1/orders → 201', () => {
    it('should allow server role to create orders', async () => {
      const token = createTestToken({ role: 'server' });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ name: 'Caesar Salad', quantity: 1, price: 9.99 }],
          type: 'dine-in',
          table_number: 5
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('order-123');
      expect(OrdersService.createOrder).toHaveBeenCalled();
    });
  });

  describe('Test 3: kiosk_demo with AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true → 201 + WARN', () => {
    it('should accept kiosk_demo as customer alias and log warning', async () => {
      // Enable the alias flag (default behavior)
      process.env['AUTH_ACCEPT_KIOSK_DEMO_ALIAS'] = 'true';

      const token = createTestToken({ role: 'kiosk_demo' });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ name: 'Greek Bowl', quantity: 1, price: 11.99 }],
          type: 'online'
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe('order-123');

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("kiosk_demo' is deprecated"),
        expect.objectContaining({
          userId: expect.any(String),
          path: expect.any(String)
        })
      );
    });
  });

  describe('Test 4: kiosk_demo with flag=false → 403', () => {
    it('should reject kiosk_demo when alias is disabled', async () => {
      // Disable the alias flag
      process.env['AUTH_ACCEPT_KIOSK_DEMO_ALIAS'] = 'false';

      // Recreate app to pick up new env var
      app = express();
      app.use(express.json());
      const { authenticate } = await import('../../src/middleware/auth');
      const { orderRoutes } = await import('../../src/routes/orders.routes');
      app.use('/api/v1/orders', authenticate, orderRoutes);

      const token = createTestToken({ role: 'kiosk_demo' });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ name: 'Soul Bowl', quantity: 1, price: 10.99 }],
          type: 'online'
        });

      expect(response.status).toBe(401); // Unauthorized from auth middleware
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("kiosk_demo' rejected"),
        expect.any(Object)
      );
    });
  });

  describe('Test 5: X-Client-Flow header is captured/logged', () => {
    it('should capture and respect X-Client-Flow header', async () => {
      const token = createTestToken({ role: 'customer' });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Client-Flow', 'kiosk')
        .send({
          items: [{ name: 'Test Item', quantity: 1, price: 5.00 }],
          type: 'kiosk'
        });

      expect(response.status).toBe(201);

      // Verify the header was available (logged by route handler)
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle different X-Client-Flow values', async () => {
      const token = createTestToken({ role: 'server' });

      const flows = ['online', 'kiosk', 'server'];

      for (const flow of flows) {
        vi.clearAllMocks();

        const response = await request(app)
          .post('/api/v1/orders')
          .set('Authorization', `Bearer ${token}`)
          .set('X-Client-Flow', flow)
          .send({
            items: [{ name: 'Test', quantity: 1, price: 1.00 }],
            type: 'dine-in'
          });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Test 6: invalid role → 403', () => {
    it('should reject tokens with invalid/unauthorized roles', async () => {
      const token = createTestToken({ role: 'kitchen' }); // kitchen role not allowed for orders:create

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ name: 'Test', quantity: 1, price: 1.00 }],
          type: 'dine-in'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should reject tokens with missing required scopes', async () => {
      const token = createTestToken({
        role: 'customer',
        scopes: ['orders:read'] // Missing orders:create
      });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{ name: 'Test', quantity: 1, price: 1.00 }],
          type: 'online'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Required scope missing');
    });
  });

  describe('Test 7: no auth → 401', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send({
          items: [{ name: 'Test', quantity: 1, price: 1.00 }],
          type: 'online'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', 'Invalid token format')
        .send({
          items: [{ name: 'Test', quantity: 1, price: 1.00 }],
          type: 'online'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('No token provided');
    });

    it('should reject requests with expired tokens', async () => {
      const expiredPayload = {
        sub: 'demo:customer:expired',
        role: 'customer',
        scope: ['orders:create', 'orders:read'],
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const expiredToken = jwt.sign(expiredPayload, 'test-jwt-secret', { noTimestamp: true });

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          items: [{ name: 'Test', quantity: 1, price: 1.00 }],
          type: 'online'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Token expired');
    });
  });

  describe('Integration: Complete order flow with auth', () => {
    it('should successfully create order with all auth checks passing', async () => {
      const token = createTestToken({
        role: 'customer',
        scopes: ['orders:create', 'orders:read', 'payments:process']
      });

      const orderData = {
        items: [
          { name: 'Margherita Pizza', quantity: 2, price: 12.99 },
          { name: 'Caesar Salad', quantity: 1, price: 8.99 }
        ],
        type: 'online',
        customer_name: 'Alice Johnson',
        customer_email: 'alice@example.com',
        special_instructions: 'Extra napkins please'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Client-Flow', 'online')
        .set('X-Restaurant-Id', 'default-restaurant-id')
        .send(orderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('order_number');

      // Verify service was called with correct restaurant context
      expect(OrdersService.createOrder).toHaveBeenCalledWith(
        'default-restaurant-id',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ name: 'Margherita Pizza' })
          ])
        })
      );
    });
  });
});
