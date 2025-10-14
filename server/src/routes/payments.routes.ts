import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { BadRequest } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { OrdersService } from '../services/orders.service';
import { PaymentService } from '../services/payment.service';
import { validateBody } from '../middleware/validate';
import { PaymentPayload } from '../../../shared/contracts/payment';

const router = Router();
const routeLogger = logger.child({ route: 'payments' });

// Validate Square configuration
if (process.env['SQUARE_ENVIRONMENT'] === 'production') {
  if (!process.env['SQUARE_ACCESS_TOKEN']?.startsWith('EAAA')) {
    routeLogger.warn('Square production mode enabled but using sandbox token!');
  }
  routeLogger.info('Square Payment Processing: PRODUCTION MODE');
} else {
  routeLogger.info('Square Payment Processing: SANDBOX MODE');
}

// Initialize Square client
const client = new SquareClient({
  environment: process.env['SQUARE_ENVIRONMENT'] === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
  token: process.env['SQUARE_ACCESS_TOKEN']!
});

const paymentsApi = client.payments;

// STARTUP VALIDATION: Verify Square credentials match
// This prevents runtime payment failures due to misconfigured credentials
(async () => {
  // Skip validation in demo mode
  if (!process.env['SQUARE_ACCESS_TOKEN'] ||
      process.env['SQUARE_ACCESS_TOKEN'] === 'demo' ||
      process.env['NODE_ENV'] === 'development') {
    routeLogger.info('Demo mode: Skipping Square credential validation');
    return;
  }

  try {
    // Fetch available locations for this access token
    const locationsResponse = await client.locations.list();
    const locations = locationsResponse.locations || [];
    const locationIds = locations.map((l) => l.id).filter((id): id is string => id !== undefined);
    const configuredLocation = process.env['SQUARE_LOCATION_ID'];

    if (!configuredLocation) {
      routeLogger.error('❌ SQUARE_LOCATION_ID not configured');
      return;
    }

    // Check if configured location exists for this access token
    if (!locationIds.includes(configuredLocation)) {
      const errorMsg = [
        '❌ SQUARE CREDENTIAL MISMATCH DETECTED',
        `Configured SQUARE_LOCATION_ID: ${configuredLocation}`,
        `Available location IDs for this access token: ${locationIds.join(', ')}`,
        'PAYMENT PROCESSING WILL FAIL until you update SQUARE_LOCATION_ID',
        '',
        'Fix: Update your environment variable to one of the available locations above.'
      ].join('\n');

      routeLogger.error(errorMsg);

      // Log each available location with details for troubleshooting
      locations.forEach((loc) => {
        routeLogger.info('Available Square Location', {
          id: loc.id,
          name: loc.name,
          merchant_id: loc.merchantId,
          status: loc.status
        });
      });
    } else {
      // Success - credentials match
      const matchingLocation = locations.find((l) => l.id === configuredLocation);
      routeLogger.info('✅ Square credentials validated successfully', {
        locationId: configuredLocation,
        locationName: matchingLocation?.name,
        merchantId: matchingLocation?.merchantId,
        environment: process.env['SQUARE_ENVIRONMENT'],
        totalLocations: locations.length
      });
    }
  } catch (error: any) {
    routeLogger.error('❌ Square credential validation failed', {
      error: error.message,
      statusCode: error.statusCode
    });
    // Don't crash the server, but prominently log the issue
    // This allows the server to start but payments will fail with clear errors
  }
})();

// POST /api/v1/payments/create - Process payment
router.post('/create',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  validateBody(PaymentPayload),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    const restaurantId = req.restaurantId!;
    const { order_id, token, amount, idempotency_key } = req.body; // ADR-001: snake_case

    // Validate required fields
    if (!order_id) {
      throw BadRequest('Order ID is required');
    }
    if (!token) {
      throw BadRequest('Payment token is required');
    }

    routeLogger.info('Processing payment request', {
      restaurantId,
      order_id,
      clientProvidedAmount: amount,
      clientProvidedIdempotency: idempotency_key
    });

    try {
      // SECURITY: Server-side payment validation
      // Never trust client-provided amounts
      const validation = await PaymentService.validatePaymentRequest(
        order_id,
        restaurantId,
        amount,
        idempotency_key
      );

      // Use server-calculated amount and idempotency key
      const serverAmount = validation.amount;
      const serverIdempotencyKey = validation.idempotencyKey;

      routeLogger.info('Payment validated', {
        order_id,
        serverAmount: validation.orderTotal,
        tax: validation.tax,
        subtotal: validation.subtotal
      });

      // Get order for reference
      const order = await OrdersService.getOrder(restaurantId, order_id);
      
      // Create payment request with server-validated amount
      const paymentRequest = {
        sourceId: token,
        idempotencyKey: serverIdempotencyKey, // Use server-generated key
        amountMoney: {
          amount: BigInt(serverAmount), // Use server-calculated amount
          currency: 'USD',
        },
        locationId: process.env['SQUARE_LOCATION_ID'],
        referenceId: order_id,
        note: `Payment for order #${(order as any).order_number}`,
        // Enable verification token for 3D Secure if provided
        ...(req.body.verification_token && { verificationToken: req.body.verification_token }),
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
            referenceId: order_id,
            createdAt: new Date().toISOString(),
          }
        };
      } else {
        // Process real payment with Square
        paymentResult = await paymentsApi.create(paymentRequest);
      }

      if (paymentResult.payment?.status !== 'COMPLETED') {
        routeLogger.warn('Payment not completed', {
          status: paymentResult.payment?.status,
          order_id
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
        order_id,
        'paid',
        'card',
        paymentResult.payment.id
      );

      // Log successful payment for audit trail with user context
      await PaymentService.logPaymentAttempt({
        orderId: order_id,
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
        order_id,
        paymentId: paymentResult.payment.id,
        amount: validation.orderTotal
      });

      res.json({
        success: true,
        paymentId: paymentResult.payment.id,
        status: paymentResult.payment.status,
        receiptUrl: paymentResult.payment.receiptUrl,
        order: await OrdersService.getOrder(restaurantId, order_id), // Return updated order
      });

    } catch (squareError: any) {
      if (squareError.isError && squareError.errors) {
        const errors = squareError.errors || [];
        routeLogger.error('Square API error', {
          order_id,
          errors: errors.map((e: any) => ({ category: e.category, code: e.code, detail: e.detail }))
        });

        // Log failed payment attempt
        const firstError = errors[0];
        await PaymentService.logPaymentAttempt({
          orderId: order_id,
          amount: req.body.amount || 0,
          status: 'failed',
          restaurantId: restaurantId,
          paymentMethod: 'card',
          userAgent: req.headers['user-agent'] as string,
          idempotencyKey: idempotency_key || randomUUID(),
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
    if (req.body.order_id) {
      try {
        await OrdersService.updateOrderPayment(
          req.restaurantId!,
          req.body.order_id,
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

    if (!paymentId) {
      throw BadRequest('Payment ID is required');
    }

    routeLogger.info('Retrieving payment details', { paymentId });

    const paymentResponse = await paymentsApi.get({ paymentId });

    res.json({
      success: true,
      payment: paymentResponse.payment,
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
    const { amount, reason } = req.body;

    if (!paymentId) {
      throw BadRequest('Payment ID is required');
    }

    routeLogger.info('Processing refund', { paymentId, amount, reason });

    // Get payment details first
    const paymentResult = await paymentsApi.get({ paymentId });
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

export { router as paymentRoutes };