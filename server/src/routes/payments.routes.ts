import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest, validateRestaurantAccess } from '../middleware/auth';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { BadRequest } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { OrdersService } from '../services/orders.service';
import { PaymentService } from '../services/payment.service';
import { SquareAdapter } from '../payments/square.adapter';
import { verifySquareWebhookSignature } from '../middleware/webhookSignature';

const router = Router();
const routeLogger = logger.child({ route: 'payments' });

// In-memory storage for development (replace with database in production)
const paymentStore = new Map<string, any>();

const createIntentSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(1).optional().default('USD'),
  orderDraftId: z.string().min(1).optional(),
  mode: z.string().min(1).optional().default('voice_customer'),
});

const createPaymentSchema = z.object({
  orderId: z.string().min(1),
  token: z.string().min(1),
  amount: z.coerce.number().positive().optional(),
  idempotencyKey: z.string().min(1).optional(),
  verificationToken: z.string().min(1).optional(),
});

const refundPaymentSchema = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: z.string().trim().max(256).optional(),
});

const squareWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.object({
      payment: z.record(z.any()).optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

// Initialize payment adapter
const squareAdapter = new SquareAdapter();

// Validate Square configuration
if (process.env['SQUARE_ENVIRONMENT'] === 'production') {
  if (!process.env['SQUARE_ACCESS_TOKEN']?.startsWith('EAAA')) {
    console.warn('⚠️ Square production mode enabled but using sandbox token!');
  }
  routeLogger.info('💳 Square Payment Processing: PRODUCTION MODE');
} else {
  routeLogger.info('💳 Square Payment Processing: SANDBOX MODE');
}

// Initialize Square client
const client = new SquareClient({
  environment: process.env['SQUARE_ENVIRONMENT'] === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox,
  accessToken: process.env['SQUARE_ACCESS_TOKEN']!
} as any);

const paymentsApi = client.payments;

// POST /api/v1/payments/intent - Create payment intent for voice/customer orders
router.post('/intent',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { amount, currency, orderDraftId, mode } = createIntentSchema.parse(req.body);
      const restaurantId = req.restaurantId!;

      routeLogger.info('Creating payment intent', {
        amount,
        currency,
        orderDraftId,
        mode,
        restaurantId
      });

      // Create payment intent with Square
      const intent = await squareAdapter.createIntent(amount, {
        orderDraftId,
        restaurantId,
        mode
      });

      // Store payment record
      const paymentRecord = {
        id: intent.id,
        provider: 'square',
        amount,
        currency,
        status: intent.status,
        orderDraftId,
        restaurantId,
        strategy: intent.strategy,
        paymentLinkUrl: intent.paymentLinkUrl,
        checkoutId: intent.checkoutId,
        clientToken: intent.clientToken,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in memory for development
      paymentStore.set(intent.id, paymentRecord);

      // Return response based on strategy
      const response: any = {
        strategy: intent.strategy,
        paymentId: intent.id
      };

      if (intent.strategy === 'link') {
        response.paymentLinkUrl = intent.paymentLinkUrl;
        response.checkoutId = intent.checkoutId;
      } else if (intent.strategy === 'web') {
        response.clientToken = intent.clientToken;
      }

      routeLogger.info('Payment intent created', {
        paymentId: intent.id,
        strategy: intent.strategy
      });

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/v1/payments/status/:id - Check payment status
router.get('/status/:id',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const restaurantId = req.restaurantId!;

      routeLogger.info('Checking payment status', { paymentId: id, restaurantId });

      // Get payment record from memory store
      const paymentRecord = paymentStore.get(id);

      if (!paymentRecord) {
        throw BadRequest('Payment not found');
      }

      // Check status with provider
      try {
        const currentStatus = await squareAdapter.statusById(id);

        // Update status if changed
        if (currentStatus.status !== paymentRecord.status) {
          paymentRecord.status = currentStatus.status;
          paymentRecord.updatedAt = new Date().toISOString();
          paymentStore.set(id, paymentRecord);
        }
      } catch (providerError) {
        logger.warn('Could not check provider status', {
          paymentId: id,
          error: providerError
        });
      }

      res.json({
        status: paymentRecord.status,
        providerId: paymentRecord.checkoutId || id,
        orderDraftId: paymentRecord.orderDraftId
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/v1/payments/create - Process payment
router.post('/create', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    const restaurantId = req.restaurantId!;
    const payload = createPaymentSchema.parse(req.body);
    const { orderId, token, amount, idempotencyKey, verificationToken } = payload;

    routeLogger.info('Processing payment request', { 
      restaurantId, 
      orderId,
      clientProvidedAmount: amount,
      clientProvidedIdempotency: idempotencyKey
    });

    try {
      // SECURITY: Server-side payment validation
      // Never trust client-provided amounts
      const validation = await PaymentService.validatePaymentRequest(
        orderId,
        restaurantId,
        amount,
        idempotencyKey
      );

      // Use server-calculated amount and idempotency key
      const serverAmount = validation.amount;
      const serverIdempotencyKey = validation.idempotencyKey;

      routeLogger.info('Payment validated', {
        orderId,
        serverAmount: validation.orderTotal,
        tax: validation.tax,
        subtotal: validation.subtotal
      });

      // Get order for reference
      const order = await OrdersService.getOrder(restaurantId, orderId);
      
      // Create payment request with server-validated amount
      const paymentRequest = {
        sourceId: token,
        idempotencyKey: serverIdempotencyKey, // Use server-generated key
        amountMoney: {
          amount: BigInt(serverAmount), // Use server-calculated amount
          currency: 'USD',
        },
        locationId: process.env['SQUARE_LOCATION_ID'],
        referenceId: orderId,
        note: `Payment for order #${(order as any).order_number}`,
        // Enable verification token for 3D Secure if provided
        ...(verificationToken && { verificationToken }),
      };

      // Check if we're in demo mode (no Square credentials)
      let paymentResult: any;
      
      if (!process.env['SQUARE_ACCESS_TOKEN'] || process.env['SQUARE_ACCESS_TOKEN'] === 'demo' || process.env['NODE_ENV'] === 'development') {
        // Mock successful payment in demo/development mode
        routeLogger.info('Demo mode: Mocking successful payment');
        paymentResult = {
          payment: {
            id: `demo-payment-${randomUUID()}`,
            status: 'COMPLETED',
            amountMoney: paymentRequest.amountMoney,
            referenceId: orderId,
            createdAt: new Date().toISOString(),
          }
        };
      } else {
        // Process real payment with Square
        const response = await (paymentsApi as any).createPayment(paymentRequest as any);
        paymentResult = response.result;
      }

      if (paymentResult.payment?.status !== 'COMPLETED') {
        routeLogger.warn('Payment not completed', { 
          status: paymentResult.payment?.status,
          orderId 
        });
        
        return res.status(400).json({
          success: false,
          error: 'Payment not completed',
          paymentStatus: paymentResult.payment?.status,
          requiresAction: paymentResult.payment?.status === 'PENDING',
        });
      }

      // Update order payment status
      await OrdersService.updateOrderPayment(
        restaurantId,
        orderId,
        'paid',
        'card',
        paymentResult.payment.id
      );

      // Log successful payment for audit trail with user context
      await PaymentService.logPaymentAttempt({
        orderId,
        amount: validation.orderTotal,
        status: 'success',
        restaurantId: restaurantId,
        paymentMethod: 'card',
        paymentId: paymentResult.payment.id,
        userAgent: req.headers['user-agent'] as string,
        idempotencyKey: serverIdempotencyKey,
        metadata: {
          orderNumber: (order as any).order_number,
          userRole: req.user?.role
        },
        ...(req.user?.id && { userId: req.user.id }),
        ...(req.ip && { ipAddress: req.ip })
      });

      routeLogger.info('Payment successful', { 
        orderId, 
        paymentId: paymentResult.payment.id,
        amount: validation.orderTotal 
      });

      res.json({
        success: true,
        paymentId: paymentResult.payment.id,
        status: paymentResult.payment.status,
        receiptUrl: paymentResult.payment.receiptUrl,
        order: await OrdersService.getOrder(restaurantId, orderId), // Return updated order
      });

    } catch (squareError: any) {
      if (squareError.isError && squareError.errors) {
        const errors = squareError.errors || [];
        routeLogger.error('Square API error', { 
          orderId, 
          errors: errors.map((e: any) => ({ category: e.category, code: e.code, detail: e.detail }))
        });

        // Log failed payment attempt
        const firstError = errors[0];
        await PaymentService.logPaymentAttempt({
          orderId,
        amount: amount || 0,
          status: 'failed',
          restaurantId: restaurantId,
          paymentMethod: 'card',
          userAgent: req.headers['user-agent'] as string,
          idempotencyKey: idempotencyKey || randomUUID(),
          metadata: {
            userRole: req.user?.role,
            errorCategory: firstError?.category
          },
          ...(req.user?.id && { userId: req.user.id }),
          ...(firstError?.code && { errorCode: firstError.code }),
          ...(firstError?.detail && { errorDetail: firstError.detail }),
          ...(req.ip && { ipAddress: req.ip })
        });

        // Handle specific Square error types
        if (firstError?.code === 'CVV_FAILURE' || firstError?.code === 'ADDRESS_VERIFICATION_FAILURE') {
          return res.status(400).json({
            success: false,
            error: 'Card verification failed',
            code: firstError.code,
            detail: firstError.detail,
          });
        }

        if (firstError?.code === 'CARD_DECLINED') {
          return res.status(400).json({
            success: false,
            error: 'Card declined',
            detail: firstError.detail,
          });
        }

        return res.status(400).json({
          success: false,
          error: 'Payment processing failed',
          detail: firstError?.detail || 'Unknown payment error',
        });
      }

      throw squareError;
    }

  } catch (error: any) {
    routeLogger.error('Payment processing failed', { error });
    
    // Update order payment status to failed
    if (orderId) {
      try {
        await OrdersService.updateOrderPayment(
          req.restaurantId!,
          orderId,
          'failed',
          'card'
        );
      } catch (updateError) {
        routeLogger.error('Failed to update order payment status', { updateError });
      }
    }
    
    next(error);
  }
});

// GET /api/v1/payments/:paymentId - Get payment details
router.get('/:paymentId', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.PAYMENTS_READ),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    const { paymentId } = req.params;

    routeLogger.info('Retrieving payment details', { paymentId });

    const { result } = await (paymentsApi as any).getPayment(paymentId);

    res.json({
      success: true,
      payment: result.payment,
    });

  } catch (error: any) {
    if (error.isError && error.errors) {
      routeLogger.error('Square API error retrieving payment', { 
        paymentId: req.params['paymentId'],
        errors: error.errors 
      });
      
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    next(error);
  }
});

// POST /api/v1/payments/:paymentId/refund - Refund payment
router.post('/:paymentId/refund', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.PAYMENTS_REFUND),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = refundPaymentSchema.parse(req.body);

    routeLogger.info('Processing refund', { paymentId, amount, reason });

    // Get payment details first
    const { result: paymentResult } = await (paymentsApi as any).getPayment(paymentId as any);
    const payment = paymentResult.payment;

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Create refund request
    const refundRequest = {
      idempotencyKey: randomUUID(),
      amountMoney: amount ? {
        amount: BigInt(Math.round(amount * 100)),
        currency: 'USD',
      } : payment.totalMoney, // Full refund if no amount specified
      paymentId,
      reason: reason || 'Restaurant initiated refund',
    };

    const refundResponse = await client.refunds.refundPayment(refundRequest as any);
    const refundResult = (refundResponse as any).result;

    // Log refund for audit trail
    await PaymentService.logPaymentAttempt({
      orderId: payment.referenceId || paymentId,
      amount: Number(refundResult.refund?.amountMoney?.amount || 0) / 100, // Convert from cents
      status: 'refunded',
      restaurantId: req.restaurantId!,
      paymentMethod: 'card',
      userAgent: req.headers['user-agent'] as string,
      idempotencyKey: refundRequest.idempotencyKey,
      metadata: {
        refundId: refundResult.refund?.id,
        refundReason: reason,
        userRole: req.user?.role,
        originalPaymentId: paymentId
      },
      ...(req.user?.id && { userId: req.user.id }),
      ...(paymentId && { paymentId }),
      ...(req.ip && { ipAddress: req.ip })
    });

    routeLogger.info('Refund processed', { 
      paymentId, 
      refundId: refundResult.refund?.id,
      amount: refundResult.refund?.amountMoney?.amount
    });

    res.json({
      success: true,
      refund: refundResult.refund,
    });

  } catch (error: any) {
    if (error.isError && error.errors) {
      routeLogger.error('Square API error processing refund', { 
        paymentId: req.params['paymentId'],
        errors: error.errors 
      });
      
      return res.status(400).json({
        success: false,
        error: 'Refund processing failed',
        detail: error.errors?.[0]?.detail,
      });
    }

    next(error);
  }
});

// POST /api/v1/webhooks/payments - Handle payment webhooks
router.post('/webhooks/payments', verifySquareWebhookSignature, async (req, res, next) => {
  try {
    const event = squareWebhookSchema.safeParse(req.body);

    if (!event.success) {
      routeLogger.warn('Invalid webhook payload received', {
        issues: event.error.issues,
      });
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    routeLogger.info('Payment webhook received', { type: event.data.type });

    if (event.data.type === 'payment.created' || event.data.type === 'payment.updated') {
      const payment = event.data.data.object.payment;
      if (payment) {
        const orderId = payment.order_id ?? payment.id;
        const status = payment.status === 'COMPLETED'
          ? 'succeeded'
          : payment.status === 'FAILED'
            ? 'failed'
            : 'pending';

        for (const [id, record] of paymentStore.entries()) {
          if (record.checkoutId === orderId || record.id === orderId) {
            record.status = status;
            record.updatedAt = new Date().toISOString();
            paymentStore.set(id, record);
            break;
          }
        }

        routeLogger.info('Payment status updated via webhook', { orderId, status });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', { error });
    res.status(200).json({ received: true });
  }
});

export { router as paymentRoutes };
