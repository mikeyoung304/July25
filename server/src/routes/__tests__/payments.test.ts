import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PaymentService } from '../../services/payment.service';
import { OrdersService } from '../../services/orders.service';

// Mock dependencies
vi.mock('../../services/payment.service');
vi.mock('../../services/orders.service');
vi.mock('../../utils/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })
  }
}));

// Mock Square client
vi.mock('square', () => ({
  SquareClient: vi.fn(() => ({
    payments: {
      createPayment: vi.fn(),
      getPayment: vi.fn(),
      refundPayment: vi.fn(),
    }
  })),
  SquareEnvironment: {
    Production: 'production',
    Sandbox: 'sandbox'
  }
}));

describe('Payment Routes', () => {
  let app: express.Application;
  let authToken: string;
  
  beforeEach(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware
    app.use((req: any, _res, next) => {
      if (req.headers.authorization?.startsWith('Bearer ')) {
        req.user = {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'server',
          scopes: ['payments:process', 'payments:read']
        };
        req.restaurantId = 'test-restaurant-id';
      }
      next();
    });
    
    // Load payment routes
    const { paymentRoutes: paymentsRouter } = await import('../payments.routes');
    app.use('/api/v1/payments', paymentsRouter);
    
    // Create test token
    authToken = 'Bearer test-jwt-token';
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/payments/create', () => {
    const validPaymentRequest = {
      orderId: 'order-123',
      token: 'payment-token-456',
      amount: 25.50,
    };

    it('should process valid payment successfully', async () => {
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

      vi.mocked(OrdersService.updateOrderPayment).mockResolvedValue();
      vi.mocked(PaymentService.logPaymentAttempt).mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', authToken)
        .send(validPaymentRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.payment).toBeDefined();
      
      // Verify server-side validation was called
      expect(PaymentService.validatePaymentRequest).toHaveBeenCalledWith(
        'order-123',
        'test-restaurant-id',
        25.50,
        undefined
      );
      
      // Verify audit logging
      expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          status: 'success',
          userId: 'test-user-id',
          restaurantId: 'test-restaurant-id'
        })
      );
    });

    it('should reject payment without order ID', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', authToken)
        .send({ ...validPaymentRequest, orderId: undefined });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Order ID is required');
    });

    it('should reject payment without token', async () => {
      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', authToken)
        .send({ ...validPaymentRequest, token: undefined });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Payment token is required');
    });

    it('should reject payment if amount mismatch detected', async () => {
      vi.mocked(PaymentService.validatePaymentRequest).mockRejectedValue(
        new Error('Payment amount mismatch. Expected: $30.00, Received: $25.50')
      );

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', authToken)
        .send(validPaymentRequest);

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('amount mismatch');
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

      await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', authToken)
        .send({ ...validPaymentRequest, idempotencyKey });

      // Verify server ignores client idempotency key
      expect(PaymentService.validatePaymentRequest).toHaveBeenCalledWith(
        'order-123',
        'test-restaurant-id',
        25.50,
        'client-key-123'
      );
    });

    it('should require PAYMENTS_PROCESS scope', async () => {
      // Override auth middleware to remove scope
      app = express();
      app.use(express.json());
      app.use((req: any, _res, next) => {
        req.user = {
          id: 'test-user-id',
          role: 'kitchen',
          scopes: ['orders:read'] // No payment scope
        };
        req.restaurantId = 'test-restaurant-id';
        next();
      });
      
      const { paymentRoutes: paymentsRouter } = await import('../payments.routes');
      app.use('/api/v1/payments', paymentsRouter);

      const response = await request(app)
        .post('/api/v1/payments/create')
        .set('Authorization', authToken)
        .send(validPaymentRequest);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/payments/:paymentId', () => {
    it('should retrieve payment details', async () => {
      vi.mocked(PaymentService.getPaymentDetails).mockResolvedValue({
        id: 'payment-123',
        orderId: 'order-123',
        amount: 2550,
        status: 'completed',
        createdAt: new Date()
      } as any);

      const response = await request(app)
        .get('/api/v1/payments/payment-123')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.payment).toBeDefined();
      expect(response.body.payment.id).toBe('payment-123');
    });

    it('should require PAYMENTS_READ scope', async () => {
      app = express();
      app.use(express.json());
      app.use((req: any, _res, next) => {
        req.user = {
          id: 'test-user-id',
          role: 'kitchen',
          scopes: ['orders:read'] // No payment read scope
        };
        next();
      });
      
      const { paymentRoutes: paymentsRouter } = await import('../payments.routes');
      app.use('/api/v1/payments', paymentsRouter);

      const response = await request(app)
        .get('/api/v1/payments/payment-123')
        .set('Authorization', authToken);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/v1/payments/:paymentId/refund', () => {
    it('should process refund with proper authorization', async () => {
      // Add refund scope
      app = express();
      app.use(express.json());
      app.use((req: any, _res, next) => {
        req.user = {
          id: 'test-user-id',
          role: 'manager',
          scopes: ['payments:refund']
        };
        req.restaurantId = 'test-restaurant-id';
        next();
      });
      
      const { paymentRoutes: paymentsRouter } = await import('../payments.routes');
      app.use('/api/v1/payments', paymentsRouter);

      vi.mocked(PaymentService.processRefund).mockResolvedValue({
        id: 'refund-123',
        paymentId: 'payment-123',
        amount: 2550,
        status: 'completed'
      } as any);

      const response = await request(app)
        .post('/api/v1/payments/payment-123/refund')
        .set('Authorization', authToken)
        .send({ amount: 25.50, reason: 'Customer request' });

      expect(response.status).toBe(200);
      expect(response.body.refund).toBeDefined();
      
      // Verify audit logging
      expect(PaymentService.logPaymentAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'refunded',
          userId: 'test-user-id'
        })
      );
    });

    it('should reject refund without PAYMENTS_REFUND scope', async () => {
      const response = await request(app)
        .post('/api/v1/payments/payment-123/refund')
        .set('Authorization', authToken)
        .send({ amount: 25.50 });

      expect(response.status).toBe(403);
    });
  });

  describe('Webhook Security', () => {
    it('should verify webhook signature', async () => {
      const webhookPayload = {
        type: 'payment.created',
        data: {
          payment: {
            id: 'payment-123',
            status: 'COMPLETED'
          }
        }
      };

      const signature = 'valid-square-signature';
      
      vi.mocked(PaymentService.verifyWebhookSignature).mockReturnValue(true);
      vi.mocked(PaymentService.processWebhook).mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/webhooks/square/payments')
        .set('Square-Signature', signature)
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(PaymentService.verifyWebhookSignature).toHaveBeenCalledWith(
        expect.any(String),
        signature
      );
    });

    it('should reject webhook with invalid signature', async () => {
      vi.mocked(PaymentService.verifyWebhookSignature).mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/webhooks/square/payments')
        .set('Square-Signature', 'invalid-signature')
        .send({});

      expect(response.status).toBe(401);
    });
  });
});