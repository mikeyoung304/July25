import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { orderRoutes as ordersRouter } from '../orders.routes';
import { authenticate } from '../../middleware/auth';
import { validateRestaurantAccess } from '../../middleware/restaurantAccess';
import { errorHandler } from '../../middleware/errorHandler';

// Mock dependencies - must be before imports
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

// Mock AuditService to prevent network calls
vi.mock('../../services/audit.service', () => ({
  AuditService: {
    logAuthSuccess: vi.fn(() => Promise.resolve()),
    logAuthFailure: vi.fn(() => Promise.resolve()),
    logCrossTenantAttempt: vi.fn(() => Promise.resolve()),
    logSecurityEvent: vi.fn(() => Promise.resolve())
  }
}));

// Mock AI module to prevent loading issues
vi.mock('../../ai', () => ({
  ai: {
    transcribe: vi.fn(() => Promise.resolve({ text: '' })),
    textToSpeech: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    chat: vi.fn(() => Promise.resolve({ content: '' })),
    generateEmbedding: vi.fn(() => Promise.resolve([]))
  }
}));

// Mock MenuService
vi.mock('../../services/menu.service', () => ({
  MenuService: {
    getMenu: vi.fn(() => Promise.resolve([])),
    getMenuItems: vi.fn(() => Promise.resolve([])),
    getMenuItem: vi.fn(() => Promise.resolve(null)),
    getItems: vi.fn(() => Promise.resolve([]))
  }
}));

// Mock OrdersService
vi.mock('../../services/orders.service', () => ({
  OrdersService: {
    getOrders: vi.fn(() => Promise.resolve([])),
    getOrderById: vi.fn(() => Promise.resolve(null)),
    createOrder: vi.fn(() => Promise.resolve({ id: 'new-order-123', order_number: 1001 })),
    updateOrderStatus: vi.fn(() => Promise.resolve({ id: 'order-123', status: 'preparing' })),
    deleteOrder: vi.fn(() => Promise.resolve({ success: true }))
  }
}));

// Track which restaurant_id is being queried
let mockUserRestaurantData: { restaurant_id: string; role: string } | null = null;
let mockUserRestaurantError: any = null;

vi.mock('../../config/database', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'user_restaurants') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: mockUserRestaurantData,
                  error: mockUserRestaurantError
                }))
              }))
            }))
          }))
        };
      }
      // Default for other tables (orders, etc.)
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        })),
        insert: vi.fn(() => Promise.resolve({
          data: { id: 'new-order-123', order_number: 1001 },
          error: null
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      };
    })
  }
}));

vi.mock('../../config', () => ({
  config: {
    supabase: {
      jwtSecret: 'test-jwt-secret-for-testing-only'
    }
  }
}));

vi.mock('../../config/environment', () => ({
  getConfig: () => ({
    port: 3001,
    nodeEnv: 'test',
    supabase: {
      jwtSecret: 'test-jwt-secret-for-testing-only',
      url: 'https://test.supabase.co',
      serviceKey: 'test-service-key',
      anonKey: 'test-anon-key'
    },
    frontend: {
      url: 'http://localhost:5173'
    },
    openai: {
      embeddingModel: 'text-embedding-3-small',
      embeddingDimensions: 1536
    },
    logging: {
      level: 'info',
      format: 'json'
    },
    cache: {
      ttlSeconds: 300
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100
    },
    restaurant: {
      defaultId: undefined
    },
    auth: {
      kioskJwtSecret: 'test-kiosk-secret',
      stationTokenSecret: 'test-station-secret',
      pinPepper: 'test-pin-pepper',
      deviceFingerprintSalt: 'test-salt'
    },
    stripe: {
      secretKey: '',
      publishableKey: '',
      webhookSecret: ''
    },
    features: {
      semanticSearch: false
    }
  })
}));

describe('Orders Routes - RCTX (Restaurant Context) Enforcement', () => {
  let app: express.Application;
  let validToken: string;
  let tokenWithoutRestaurantId: string;
  const testRestaurantId = '11111111-1111-1111-1111-111111111111';
  const testUserId = 'test-user-123';

  // Valid order data matching OrderPayload schema
  const validOrderData = {
    type: 'dine_in',
    items: [
      {
        id: 'item-uuid-1',
        menu_item_id: 'menu-item-1',
        name: 'Burger',
        quantity: 2,
        price: 10.99
      }
    ],
    customer_name: 'John Doe',
    table_number: 5
  };

  beforeEach(() => {
    // Reset mock data
    mockUserRestaurantData = { restaurant_id: testRestaurantId, role: 'server' };
    mockUserRestaurantError = null;

    // Set STRICT_AUTH to false for tests that need tokens without restaurant_id
    process.env['STRICT_AUTH'] = 'false';

    app = express();
    app.use(express.json());

    // Create a valid JWT token with restaurant_id
    validToken = jwt.sign(
      {
        sub: testUserId,
        email: 'test@example.com',
        role: 'server',
        restaurant_id: testRestaurantId,
        scope: ['orders:read', 'orders:create', 'orders:update']
      },
      'test-jwt-secret-for-testing-only'
    );

    // Token without restaurant_id (for testing missing context)
    tokenWithoutRestaurantId = jwt.sign(
      {
        sub: testUserId,
        email: 'test@example.com',
        role: 'server',
        scope: ['orders:read', 'orders:create', 'orders:update']
      },
      'test-jwt-secret-for-testing-only'
    );

    // Apply middleware in correct order
    app.use(authenticate);
    app.use(validateRestaurantAccess);
    app.use('/api/v1/orders', ordersRouter);

    // Add error handler middleware
    app.use(errorHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env['STRICT_AUTH'];
  });

  describe('GET /api/v1/orders', () => {
    it('should return 403 when token has no restaurant_id and user not in any restaurant', async () => {
      // With STRICT_AUTH=false, token without restaurant_id is allowed through auth
      // But validateRestaurantAccess will fail because no restaurant_id is set
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenWithoutRestaurantId}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Restaurant ID is required');
    });

    it('should return 403 when user is not a member of the restaurant in token', async () => {
      // User's token has restaurant_id, but DB check fails (not a member)
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('RESTAURANT_ACCESS_DENIED');
    });

    it('should return 200 when user is a valid member of the restaurant', async () => {
      // Mock user is a member of the restaurant
      mockUserRestaurantData = { restaurant_id: testRestaurantId, role: 'server' };
      mockUserRestaurantError = null;

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('POST /api/v1/orders (staff orders)', () => {
    it('should return 403 when token has no restaurant_id', async () => {
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenWithoutRestaurantId}`)
        .send(validOrderData)
        .expect(403);

      expect(response.body.error.message).toContain('Restaurant ID is required');
    });

    it('should return 403 when user lacks proper restaurant membership', async () => {
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validOrderData)
        .expect(403);

      expect(response.body.error.code).toBe('RESTAURANT_ACCESS_DENIED');
    });

    it('should create order when user is valid member of restaurant', async () => {
      mockUserRestaurantData = { restaurant_id: testRestaurantId, role: 'server' };
      mockUserRestaurantError = null;

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validOrderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('order_number');
    });
  });

  describe('PUT /api/v1/orders/:id/status', () => {
    const orderId = 'order-123';
    const statusUpdate = { status: 'preparing' };

    it('should enforce restaurant membership for status updates', async () => {
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${tokenWithoutRestaurantId}`)
        .send(statusUpdate)
        .expect(403);

      expect(response.body.error.message).toContain('Restaurant ID is required');
    });

    it('should validate restaurant membership for status updates', async () => {
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(statusUpdate)
        .expect(403);

      expect(response.body.error.code).toBe('RESTAURANT_ACCESS_DENIED');
    });
  });

  describe('DELETE /api/v1/orders/:id', () => {
    const orderId = 'order-123';

    it('should enforce restaurant membership for order deletion', async () => {
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${tokenWithoutRestaurantId}`)
        .expect(403);

      expect(response.body.error.message).toContain('Restaurant ID is required');
    });

    it('should prevent deletion when user not member of restaurant', async () => {
      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      const response = await request(app)
        .delete(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('RESTAURANT_ACCESS_DENIED');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid UUID format in token restaurant_id', async () => {
      // Token with invalid UUID should be rejected by auth middleware
      const badToken = jwt.sign(
        {
          sub: testUserId,
          email: 'test@example.com',
          role: 'server',
          restaurant_id: 'not-a-valid-uuid',
          scope: ['orders:read']
        },
        'test-jwt-secret-for-testing-only'
      );

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${badToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Invalid restaurant context');
    });

    it('should handle token with empty restaurant_id', async () => {
      // Token with empty string restaurant_id
      const emptyRestaurantToken = jwt.sign(
        {
          sub: testUserId,
          email: 'test@example.com',
          role: 'server',
          restaurant_id: '',
          scope: ['orders:read']
        },
        'test-jwt-secret-for-testing-only'
      );

      mockUserRestaurantData = null;
      mockUserRestaurantError = { message: 'No rows found' };

      // Empty string is falsy, so it should be treated as missing
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${emptyRestaurantToken}`)
        .expect(403);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('Restaurant ID is required');
    });

    it('should allow access when user is valid member', async () => {
      // Standard valid flow - user is member of the restaurant
      mockUserRestaurantData = { restaurant_id: testRestaurantId, role: 'server' };
      mockUserRestaurantError = null;

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Token-based restaurant context', () => {
    it('should use restaurant_id from token for kiosk mode', async () => {
      // Create a kiosk token with embedded restaurant_id
      const kioskToken = jwt.sign(
        {
          sub: 'kiosk-session-123',
          role: 'kiosk',
          restaurant_id: testRestaurantId,
          scope: ['orders:create', 'menu:read']
        },
        'test-jwt-secret-for-testing-only'
      );

      // Mock that kiosk user has access
      mockUserRestaurantData = { restaurant_id: testRestaurantId, role: 'kiosk' };
      mockUserRestaurantError = null;

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${kioskToken}`)
        .send(validOrderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('STRICT_AUTH mode', () => {
    it('should reject tokens without restaurant_id when STRICT_AUTH is enabled', async () => {
      process.env['STRICT_AUTH'] = 'true';

      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenWithoutRestaurantId}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('strict auth mode');
    });
  });
});
