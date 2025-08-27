import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { BadRequest } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';
import { OrdersService } from '../services/orders.service';

const router = Router();
const routeLogger = logger.child({ route: 'payments' });

// Initialize Square client
const client = new SquareClient({
  environment: process.env.SQUARE_ENVIRONMENT === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox,
  bearerAuthCredentials: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN!
  }
});

const paymentsApi = client.payments;

// POST /api/v1/payments/create - Process payment
router.post('/create', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const restaurantId = req.restaurantId!;
    const { orderId, token, amount, idempotencyKey } = req.body;

    // Validate required fields
    if (!orderId) {
      throw BadRequest('Order ID is required');
    }
    if (!token) {
      throw BadRequest('Payment token is required');
    }
    if (!amount || amount <= 0) {
      throw BadRequest('Valid amount is required');
    }

    // Generate idempotency key if not provided
    const finalIdempotencyKey = idempotencyKey || randomUUID();

    routeLogger.info('Processing payment', { 
      restaurantId, 
      orderId, 
      amount,
      idempotencyKey: finalIdempotencyKey 
    });

    try {
      // Get order to verify it exists and belongs to restaurant
      const order = await OrdersService.getOrder(restaurantId, orderId);
      if (!order) {
        throw BadRequest('Order not found');
      }

      // Verify amount matches order total
      const expectedAmount = Math.round((order as any).total_amount * 100); // Convert to cents
      const providedAmount = Math.round(amount * 100);
      
      if (providedAmount !== expectedAmount) {
        throw BadRequest(`Amount mismatch. Expected: $${(order as any).total_amount}, provided: $${amount}`);
      }

      // Create payment request
      const paymentRequest = {
        sourceId: token,
        idempotencyKey: finalIdempotencyKey,
        amountMoney: {
          amount: BigInt(expectedAmount),
          currency: 'USD',
        },
        locationId: process.env.SQUARE_LOCATION_ID,
        referenceId: orderId,
        note: `Payment for order #${(order as any).order_number}`,
        // Enable verification token for 3D Secure if provided
        ...(req.body.verificationToken && { verificationToken: req.body.verificationToken }),
      };

      // Check if we're in demo mode (no Square credentials)
      let paymentResult: any;
      
      if (!process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_ACCESS_TOKEN === 'demo' || process.env.NODE_ENV === 'development') {
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
        const response = await paymentsApi.createPayment(paymentRequest as any);
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

      routeLogger.info('Payment successful', { 
        orderId, 
        paymentId: paymentResult.payment.id,
        amount: expectedAmount 
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

        // Handle specific Square error types
        const firstError = errors[0];
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
    if (req.body.orderId) {
      try {
        await OrdersService.updateOrderPayment(
          req.restaurantId!,
          req.body.orderId,
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
router.get('/:paymentId', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { paymentId } = req.params;

    routeLogger.info('Retrieving payment details', { paymentId });

    const { result } = await paymentsApi.getPayment(paymentId);

    res.json({
      success: true,
      payment: result.payment,
    });

  } catch (error: any) {
    if (error.isError && error.errors) {
      routeLogger.error('Square API error retrieving payment', { 
        paymentId: req.params.paymentId,
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
router.post('/:paymentId/refund', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    routeLogger.info('Processing refund', { paymentId, amount, reason });

    // Get payment details first
    const { result: paymentResult } = await paymentsApi.getPayment(paymentId as any);
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

    const { result: refundResult } = await client.refunds.refundPayment(refundRequest as any);

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
        paymentId: req.params.paymentId,
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