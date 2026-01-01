import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PaymentService } from '../../services/payment.service';
import { OrdersService } from '../../services/orders.service';

// Test constants
const TEST_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

// Force demo mode by removing Stripe key before module loads
// This ensures the payments.routes module uses demo mode (stripe = null)
const originalStripeKey = process.env['STRIPE_SECRET_KEY'];
delete process.env['STRIPE_SECRET_KEY'];

// Mock dependencies - must be before imports
vi.mock('../../services/payment.service');
vi.mock('../../services/orders.service');
vi.mock('../../services/table.service');

// Mock logger with proper child() support
vi.mock('../../utils/logger', () => {
  const createChildLogger = (): any => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => createChildLogger())
  });
  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => createChildLogger())
    }
  };
});

// Mock Supabase database
vi.mock('../../config/database', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null })
            })
          })
        })
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null })
    })
  }
}));

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: any) => next(),
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  AuthenticatedRequest: {}
}));

// Mock restaurant access middleware
vi.mock('../../middleware/restaurantAccess', () => ({
  validateRestaurantAccess: (_req: any, _res: any, next: any) => next()
}));

// Mock RBAC middleware
vi.mock('../../middleware/rbac', () => ({
  requireScopes: () => (_req: any, _res: any, next: any) => next(),
  ApiScope: {
    PAYMENTS_PROCESS: 'payments:process',
    PAYMENTS_READ: 'payments:read',
    PAYMENTS_REFUND: 'payments:refund'
  }
}));

// Mock rate limiter middleware
vi.mock('../../middleware/rateLimiter', () => ({
  paymentLimiter: (_req: any, _res: any, next: any) => next(),
  paymentConfirmLimiter: (_req: any, _res: any, next: any) => next(),
  refundLimiter: (_req: any, _res: any, next: any) => next()
}));

// Mock validation middleware
vi.mock('../../middleware/validate', () => ({
  validateBody: () => (_req: any, _res: any, next: any) => next()
}));

// Mock error handler
vi.mock('../../middleware/errorHandler', () => ({
  BadRequest: (msg: string) => {
    const error = new Error(msg) as any;
    error.status = 400;
    error.statusCode = 400;
    return error;
  },
  Unauthorized: (msg: string) => {
    const error = new Error(msg) as any;
    error.status = 401;
    error.statusCode = 401;
    return error;
  },
  Forbidden: (msg: string) => {
    const error = new Error(msg) as any;
    error.status = 403;
    error.statusCode = 403;
    return error;
  },
  errorHandler: (err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || err.statusCode || 500).json({ error: err.message });
  }
}));

// Mock Stripe client (demo mode - no Stripe secret key)
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
      confirm: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn()
    }
  }))
}));

describe('Payment Routes', () => {
  let app: express.Application;
  let authToken: string;

  beforeEach(async () => {
    // Reset modules to get fresh imports with mocks applied
    vi.resetModules();

    // Clear mocks first before setting up the app
    vi.clearAllMocks();

    // Create test app
    app = express();
    app.use(express.json());

    // Mock authentication middleware - attach user and restaurantId to all requests
    app.use((req: any, _res, next) => {
      if (req.headers.authorization?.startsWith('Bearer ')) {
        req.user = {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'server',
          restaurant_id: TEST_RESTAURANT_ID,
          scopes: ['payments:process', 'payments:read']
        };
        req.restaurantId = TEST_RESTAURANT_ID;
      }
      next();
    });

    // Load payment routes
    const { paymentRoutes: paymentsRouter } = await import('../payments.routes');
    app.use('/api/v1/payments', paymentsRouter);

    // Add error handler
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || err.statusCode || 500).json({ error: err.message });
    });

    // Create test token
    authToken = 'Bearer test-jwt-token';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Restore original Stripe key after all tests
  afterAll(() => {
    if (originalStripeKey) {
      process.env['STRIPE_SECRET_KEY'] = originalStripeKey;
    }
  });

  describe('POST /api/v1/payments/create-payment-intent', () => {
    // ADR-001: Use snake_case for API payloads
    const validPaymentRequest = {
      order_id: 'order-123',
      amount: 25.50,
    };

    it('should process valid payment intent successfully', async () => {
      // Mock service responses
      vi.mocked(PaymentService.validatePaymentRequest).mockResolvedValue({
        amount: 2550, // $25.50 in cents
        idempotencyKey: 'server-generated-key',
        orderTotal: 25.50,
        tax: 2.04,
        subtotal: 23.46
      });

      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: 'order-123',
        order_number: 'ORD-001',
        items: [],
        status: 'pending',
        payment_status: 'pending'
      } as any);

      vi.mocked(OrdersService.updateOrderPayment).mockResolvedValue(undefined as any);
      vi.mocked(PaymentService.logPaymentAttempt).mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/payments/create-payment-intent')
        .set('Authorization', authToken)
        .send(validPaymentRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // In demo mode (no Stripe key), returns demo payment intent
      expect(response.body.isDemoMode).toBe(true);
      expect(response.body.clientSecret).toBeDefined();

      // Verify server-side validation was called
      expect(PaymentService.validatePaymentRequest).toHaveBeenCalledWith(
        'order-123',
        TEST_RESTAURANT_ID,
        25.50,
        undefined
      );

      // Verify audit logging (status is 'initiated' not 'success' - success comes after confirmation)
      expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          status: 'initiated',
          restaurantId: TEST_RESTAURANT_ID
        })
      );
    });

    it('should reject payment without order ID', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create-payment-intent')
        .set('Authorization', authToken)
        .send({ ...validPaymentRequest, order_id: undefined });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject payment if amount mismatch detected', async () => {
      vi.mocked(PaymentService.validatePaymentRequest).mockRejectedValue(
        new Error('Payment amount mismatch. Expected: $30.00, Received: $25.50')
      );

      const response = await request(app)
        .post('/api/v1/payments/create-payment-intent')
        .set('Authorization', authToken)
        .send(validPaymentRequest);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });

    it('should handle idempotent requests', async () => {
      const idempotencyKey = 'client-key-123';

      vi.mocked(PaymentService.validatePaymentRequest).mockResolvedValue({
        amount: 2550,
        idempotencyKey: 'server-key-456', // Server always generates its own
        orderTotal: 25.50,
        tax: 2.04,
        subtotal: 23.46
      });

      vi.mocked(OrdersService.getOrder).mockResolvedValue({
        id: 'order-123',
        order_number: 'ORD-001',
        items: [],
        status: 'pending',
        payment_status: 'pending'
      } as any);

      vi.mocked(PaymentService.logPaymentAttempt).mockResolvedValue();

      await request(app)
        .post('/api/v1/payments/create-payment-intent')
        .set('Authorization', authToken)
        .send({ ...validPaymentRequest, idempotency_key: idempotencyKey });

      // Verify server receives client idempotency key
      expect(PaymentService.validatePaymentRequest).toHaveBeenCalledWith(
        'order-123',
        TEST_RESTAURANT_ID,
        25.50,
        'client-key-123'
      );
    });

    it('should require authentication for staff payments', async () => {
      // Create app without auth middleware attaching user
      const noAuthApp = express();
      noAuthApp.use(express.json());
      // Don't attach user for non-customer flow
      noAuthApp.use((_req: any, _res, next) => {
        // User not attached, simulating unauthenticated request
        next();
      });

      const { paymentRoutes: paymentsRouter } = await import('../payments.routes');
      noAuthApp.use('/api/v1/payments', paymentsRouter);
      noAuthApp.use((err: any, _req: any, res: any, _next: any) => {
        res.status(err.status || err.statusCode || 500).json({ error: err.message });
      });

      const response = await request(noAuthApp)
        .post('/api/v1/payments/create-payment-intent')
        .set('Authorization', authToken)
        .send(validPaymentRequest);

      // Without user, should get 401 Unauthorized
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/payments/:paymentId', () => {
    it('should retrieve payment details', async () => {
      // In demo mode, the route returns a mock payment
      const response = await request(app)
        .get('/api/v1/payments/payment-123')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      expect(response.body.payment.id).toBe('payment-123');
      expect(response.body.payment.isDemoMode).toBe(true);
    });

    it('should return payment with status', async () => {
      const response = await request(app)
        .get('/api/v1/payments/payment-456')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.payment.status).toBe('succeeded');
    });
  });

  describe('POST /api/v1/payments/:paymentId/refund', () => {
    it('should process refund in demo mode', async () => {
      const response = await request(app)
        .post('/api/v1/payments/payment-123/refund')
        .set('Authorization', authToken)
        .send({ amount: 25.50, reason: 'Customer request' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.refund).toBeDefined();
      expect(response.body.refund.isDemoMode).toBe(true);
    });

    it('should accept refund with reason', async () => {
      const response = await request(app)
        .post('/api/v1/payments/payment-123/refund')
        .set('Authorization', authToken)
        .send({ amount: 25.50, reason: 'duplicate' });

      expect(response.status).toBe(200);
      expect(response.body.refund).toBeDefined();
    });
  });

  describe('Webhook Security', () => {
    it('should return 400 when webhook is not configured', async () => {
      // The webhook checks for rawBody which won't be available in tests
      const webhookPayload = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
            status: 'succeeded'
          }
        }
      };

      const signature = 'valid-stripe-signature';

      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .set('Stripe-Signature', signature)
        .send(webhookPayload);

      // Webhook returns 400 when raw body not available
      expect(response.status).toBe(400);
    });

    it('should reject webhook without proper configuration', async () => {
      const response = await request(app)
        .post('/api/v1/payments/webhook')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
