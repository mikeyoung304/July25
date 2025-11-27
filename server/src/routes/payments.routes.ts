import { Router } from 'express';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { requireScopes, ApiScope } from '../middleware/rbac';
import { BadRequest, Unauthorized } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { OrdersService } from '../services/orders.service';
import { PaymentService } from '../services/payment.service';
import { validateBody } from '../middleware/validate';
import { PaymentPayload, CashPaymentPayload } from '../../../shared/contracts/payment';
import { TableService } from '../services/table.service';

const router = Router();
const routeLogger = logger.child({ route: 'payments' });

// Initialize Stripe client
const stripeSecretKey = process.env['STRIPE_SECRET_KEY'];
const stripe = stripeSecretKey && stripeSecretKey !== 'demo'
  ? new Stripe(stripeSecretKey)
  : null;

// Validate Stripe configuration at startup
if (!stripeSecretKey || stripeSecretKey === 'demo') {
  routeLogger.info('Stripe Payment Processing: DEMO MODE (no real payments)');
} else if (stripeSecretKey.startsWith('sk_live_')) {
  routeLogger.info('Stripe Payment Processing: PRODUCTION MODE');
} else {
  routeLogger.info('Stripe Payment Processing: TEST MODE');
}

/**
 * Timeout wrapper for Stripe API calls
 *
 * P0.5: Prevents infinite hangs by adding 30-second timeout to all Stripe API calls.
 * This protects against network issues, Stripe API outages, or slow responses that
 * could leave customers waiting indefinitely.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  operation: string = 'Stripe API call'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    )
  ]);
}

// POST /api/v1/payments/create-payment-intent - Create payment intent for client-side confirmation
router.post('/create-payment-intent',
  optionalAuth,
  validateBody(PaymentPayload),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    // Check X-Client-Flow header to identify customer vs staff payments
    const clientFlow = (req.headers['x-client-flow'] as string)?.toLowerCase();
    const isCustomerPayment = clientFlow === 'online' || clientFlow === 'kiosk';

    // For customer payments (online/kiosk), allow anonymous access
    if (isCustomerPayment) {
      routeLogger.info('Processing anonymous customer payment', { clientFlow });

      // Require restaurant ID from header for anonymous payments
      if (!req.restaurantId) {
        throw BadRequest('Restaurant ID is required for customer payments');
      }
    } else {
      // For staff payments, require authentication and scopes
      if (!req.user) {
        throw Unauthorized('Authentication required for staff payments');
      }

      // Validate restaurant access
      if (!req.restaurantId) {
        throw BadRequest('Restaurant ID not found in token or headers');
      }

      // Check scopes for staff users
      const userScopes = req.user.scopes || [];
      if (!userScopes.includes(ApiScope.PAYMENTS_PROCESS)) {
        throw Unauthorized('Missing required scope: payments:process');
      }
    }

    const restaurantId = req.restaurantId!;
    const { order_id } = req.body; // ADR-001: snake_case

    // Validate required fields
    if (!order_id) {
      throw BadRequest('Order ID is required');
    }

    routeLogger.info('Creating payment intent', {
      restaurantId,
      order_id,
    });

    // SECURITY: Server-side payment validation - Never trust client-provided amounts
    const validation = await PaymentService.validatePaymentRequest(
      order_id,
      restaurantId,
      req.body.amount,
      req.body.idempotency_key
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

    // COMPLIANCE: Phase 1 - Log payment 'initiated' BEFORE charging customer
    await PaymentService.logPaymentAttempt({
      orderId: order_id,
      amount: validation.orderTotal,
      status: 'initiated',
      restaurantId: restaurantId,
      paymentMethod: 'card',
      userAgent: req.headers['user-agent'] as string,
      idempotencyKey: serverIdempotencyKey,
      metadata: {
        orderNumber: (order as any).order_number,
        userRole: req.user?.role,
        ...(req.user?.id?.startsWith('demo:') && { demoUserId: req.user.id })
      },
      ...(req.user?.id && !req.user.id.startsWith('demo:') && { userId: req.user.id }),
      ...(req.ip && { ipAddress: req.ip })
    });

    // Check if we're in demo mode (no Stripe credentials)
    if (!stripe) {
      // Mock successful payment intent in demo mode
      routeLogger.info('Demo mode: Mocking payment intent');
      return res.json({
        success: true,
        clientSecret: `demo_secret_${randomUUID()}`,
        paymentIntentId: `demo_pi_${randomUUID()}`,
        amount: serverAmount,
        currency: 'usd',
        isDemoMode: true,
      });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await withTimeout(
      stripe.paymentIntents.create({
        amount: serverAmount, // Amount in cents
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id,
          restaurant_id: restaurantId,
          order_number: (order as any).order_number,
          idempotency_key: serverIdempotencyKey,
        },
      }, {
        idempotencyKey: serverIdempotencyKey,
      }),
      30000,
      'Create payment intent'
    );

    routeLogger.info('Payment intent created', {
      order_id,
      paymentIntentId: paymentIntent.id,
      amount: serverAmount
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: serverAmount,
      currency: paymentIntent.currency,
    });

  } catch (error: any) {
    routeLogger.error('Payment intent creation failed', { error });

    if (error.type === 'StripeCardError') {
      return res.status(400).json({
        success: false,
        error: 'Card error',
        detail: error.message,
      });
    }

    next(error);
  }
});

// POST /api/v1/payments/confirm - Confirm payment after client-side completion
router.post('/confirm',
  optionalAuth,
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    const { payment_intent_id, order_id } = req.body;

    if (!payment_intent_id) {
      throw BadRequest('Payment intent ID is required');
    }
    if (!order_id) {
      throw BadRequest('Order ID is required');
    }

    const restaurantId = req.restaurantId;
    if (!restaurantId) {
      throw BadRequest('Restaurant ID is required');
    }

    routeLogger.info('Confirming payment', { payment_intent_id, order_id });

    // Demo mode - auto-confirm
    if (!stripe) {
      routeLogger.info('Demo mode: Auto-confirming payment');

      await OrdersService.updateOrderPayment(
        restaurantId,
        order_id,
        'paid',
        'card',
        payment_intent_id,
        undefined,
        req.user?.id
      );

      // Update audit log
      const idempotencyKey = `${order_id.slice(-12)}-confirm`;
      await PaymentService.updatePaymentAuditStatus(
        idempotencyKey,
        'success',
        payment_intent_id
      ).catch((err) => routeLogger.error('Failed to update payment audit', { err, order_id }));

      return res.json({
        success: true,
        paymentId: payment_intent_id,
        status: 'succeeded',
        order: await OrdersService.getOrder(restaurantId, order_id),
      });
    }

    // Retrieve payment intent to verify status
    const paymentIntent = await withTimeout(
      stripe.paymentIntents.retrieve(payment_intent_id),
      30000,
      'Retrieve payment intent'
    );

    if (paymentIntent.status !== 'succeeded') {
      routeLogger.warn('Payment not completed', {
        status: paymentIntent.status,
        order_id
      });

      // Update audit log to failed
      const idempotencyKey = paymentIntent.metadata?.['idempotency_key'];
      if (idempotencyKey) {
        await PaymentService.updatePaymentAuditStatus(
          idempotencyKey,
          'failed',
          undefined,
          paymentIntent.status,
          'Payment not completed'
        ).catch((err) => routeLogger.error('Failed to update payment audit', { err, order_id }));
      }

      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        paymentStatus: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
      });
    }

    // Update order payment status
    await OrdersService.updateOrderPayment(
      restaurantId,
      order_id,
      'paid',
      'card',
      paymentIntent.id,
      undefined,
      req.user?.id
    );

    // Update audit log to success
    const idempotencyKey = paymentIntent.metadata?.['idempotency_key'];
    if (idempotencyKey) {
      await PaymentService.updatePaymentAuditStatus(
        idempotencyKey,
        'success',
        paymentIntent.id
      );
    }

    routeLogger.info('Payment confirmed', {
      order_id,
      paymentId: paymentIntent.id,
      amount: paymentIntent.amount
    });

    res.json({
      success: true,
      paymentId: paymentIntent.id,
      status: paymentIntent.status,
      receiptUrl: paymentIntent.latest_charge ? `https://dashboard.stripe.com/payments/${paymentIntent.id}` : undefined,
      order: await OrdersService.getOrder(restaurantId, order_id),
    });

  } catch (error: any) {
    routeLogger.error('Payment confirmation failed', { error });

    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment',
        detail: error.message,
      });
    }

    next(error);
  }
});

// POST /api/v1/payments/cash - Process cash payment
router.post('/cash',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  validateBody(CashPaymentPayload),
  async (req: AuthenticatedRequest, res, next): Promise<any> => {
  try {
    const restaurantId = req.restaurantId!;
    const { order_id, amount_received, table_id } = req.body;

    routeLogger.info('Processing cash payment request', {
      restaurantId,
      order_id,
      amount_received,
      table_id
    });

    // Get order to validate and calculate change
    const order = await OrdersService.getOrder(restaurantId, order_id);
    if (!order) {
      throw BadRequest('Order not found');
    }

    // Get order total
    const orderTotal = (order as any).total_amount;
    if (!orderTotal || orderTotal <= 0) {
      throw BadRequest('Invalid order total');
    }

    // Validate amount received is sufficient
    if (amount_received < orderTotal) {
      routeLogger.warn('Insufficient cash payment', {
        order_id,
        orderTotal,
        amount_received,
        shortage: orderTotal - amount_received
      });

      return res.status(400).json({
        success: false,
        error: 'Insufficient payment',
        message: `Amount received ($${amount_received.toFixed(2)}) is less than order total ($${orderTotal.toFixed(2)})`,
        order_total: orderTotal,
        amount_received: amount_received,
        shortage: orderTotal - amount_received
      });
    }

    // Calculate change
    const change = amount_received - orderTotal;

    routeLogger.info('Cash payment validated', {
      order_id,
      orderTotal,
      amount_received,
      change
    });

    // Generate idempotency key for two-phase audit logging
    const cashIdempotencyKey = `cash-${order_id}-${Date.now()}`;

    // COMPLIANCE: Phase 1 - Log payment 'initiated' BEFORE processing
    await PaymentService.logPaymentAttempt({
      orderId: order_id,
      amount: orderTotal,
      status: 'initiated',
      restaurantId: restaurantId,
      paymentMethod: 'cash',
      userAgent: req.headers['user-agent'] as string,
      idempotencyKey: cashIdempotencyKey,
      metadata: {
        orderNumber: (order as any).order_number,
        userRole: req.user?.role,
        cashReceived: amount_received,
        changeGiven: change,
        ...(table_id && { tableId: table_id }),
        ...(req.user?.id?.startsWith('demo:') && { demoUserId: req.user.id })
      },
      ...(req.user?.id && !req.user.id.startsWith('demo:') && { userId: req.user.id }),
      ...(req.ip && { ipAddress: req.ip })
    });

    routeLogger.info('Cash payment audit log created with status=initiated', {
      order_id,
      idempotencyKey: cashIdempotencyKey
    });

    // Update order with cash payment details
    const updatedOrder = await OrdersService.updateOrderPayment(
      restaurantId,
      order_id,
      'paid',
      'cash',
      undefined,
      {
        cash_received: amount_received,
        change_given: change,
        payment_amount: orderTotal
      },
      req.user?.id
    );

    // COMPLIANCE: Phase 2 - Update audit log to 'success'
    await PaymentService.updatePaymentAuditStatus(
      cashIdempotencyKey,
      'success'
    );

    // Update table status if table_id provided
    if (table_id) {
      try {
        await TableService.updateStatusAfterPayment(table_id, restaurantId);
        routeLogger.info('Table status updated after cash payment', {
          table_id,
          order_id
        });
      } catch (tableError) {
        routeLogger.warn('Failed to update table status after cash payment', {
          tableError,
          table_id,
          order_id
        });
      }
    }

    routeLogger.info('Cash payment successful', {
      order_id,
      orderTotal,
      amount_received,
      change
    });

    res.json({
      success: true,
      order: updatedOrder,
      change: change,
      payment_details: {
        amount_received: amount_received,
        order_total: orderTotal,
        change_given: change
      }
    });

  } catch (error: any) {
    routeLogger.error('Cash payment processing failed', { error });

    if (req.body.order_id) {
      try {
        await OrdersService.updateOrderPayment(
          req.restaurantId!,
          req.body.order_id,
          'failed',
          'cash'
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

    if (!stripe) {
      return res.json({
        success: true,
        payment: {
          id: paymentId,
          status: 'succeeded',
          isDemoMode: true,
        },
      });
    }

    const paymentIntent = await withTimeout(
      stripe.paymentIntents.retrieve(paymentId),
      30000,
      'Get payment details'
    );

    res.json({
      success: true,
      payment: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        metadata: paymentIntent.metadata,
      },
    });

  } catch (error: any) {
    if (error.type === 'StripeInvalidRequestError') {
      routeLogger.error('Stripe API error retrieving payment', {
        paymentId: req.params['paymentId'],
        error: error.message
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

    if (!stripe) {
      routeLogger.info('Demo mode: Mocking refund');
      return res.json({
        success: true,
        refund: {
          id: `demo_refund_${randomUUID()}`,
          status: 'succeeded',
          amount: amount ? Math.round(amount * 100) : 0,
          isDemoMode: true,
        },
      });
    }

    // Get payment intent first
    const paymentIntent = await withTimeout(
      stripe.paymentIntents.retrieve(paymentId),
      30000,
      'Get payment for refund'
    );

    if (!paymentIntent) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Create refund
    const refundRequest: Stripe.RefundCreateParams = {
      payment_intent: paymentId,
      reason: (reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer',
    };

    if (amount) {
      refundRequest.amount = Math.round(amount * 100);
    }

    const refund = await withTimeout(
      stripe.refunds.create(refundRequest),
      30000,
      'Refund payment'
    );

    // Log refund for audit trail
    await PaymentService.logPaymentAttempt({
      orderId: paymentIntent.metadata?.['order_id'] || paymentId,
      amount: refund.amount / 100,
      status: 'refunded',
      restaurantId: req.restaurantId!,
      paymentMethod: 'card',
      userAgent: req.headers['user-agent'] as string,
      idempotencyKey: `refund-${paymentId}-${Date.now()}`,
      metadata: {
        refundId: refund.id,
        refundReason: reason,
        userRole: req.user?.role,
        originalPaymentId: paymentId,
        ...(req.user?.id?.startsWith('demo:') && { demoUserId: req.user.id })
      },
      ...(req.user?.id && !req.user.id.startsWith('demo:') && { userId: req.user.id }),
      ...(paymentId && { paymentId }),
      ...(req.ip && { ipAddress: req.ip })
    });

    routeLogger.info('Refund processed', {
      paymentId,
      refundId: refund.id,
      amount: refund.amount
    });

    res.json({
      success: true,
      refund: {
        id: refund.id,
        status: refund.status,
        amount: refund.amount,
        currency: refund.currency,
      },
    });

  } catch (error: any) {
    if (error.type === 'StripeInvalidRequestError') {
      routeLogger.error('Stripe API error processing refund', {
        paymentId: req.params['paymentId'],
        error: error.message
      });

      return res.status(400).json({
        success: false,
        error: 'Refund processing failed',
        detail: error.message,
      });
    }

    next(error);
  }
});

// POST /api/v1/payments/webhook - Stripe webhook handler
router.post('/webhook',
  async (req, res, _next): Promise<any> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!sig || !webhookSecret || !stripe) {
    routeLogger.warn('Webhook received but not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
  } catch (err: any) {
    routeLogger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).json({ error: 'Invalid signature' });
  }

  routeLogger.info('Webhook received', { type: event.type, id: event.id });

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      routeLogger.info('Payment succeeded via webhook', {
        paymentIntentId: paymentIntent.id,
        orderId: paymentIntent.metadata?.['order_id'],
      });
      // Payment confirmation is handled in /confirm endpoint
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      routeLogger.warn('Payment failed via webhook', {
        paymentIntentId: paymentIntent.id,
        orderId: paymentIntent.metadata?.['order_id'],
        error: paymentIntent.last_payment_error?.message,
      });

      // Update audit log if we have the idempotency key
      const idempotencyKey = paymentIntent.metadata?.['idempotency_key'];
      if (idempotencyKey) {
        await PaymentService.updatePaymentAuditStatus(
          idempotencyKey,
          'failed',
          undefined,
          paymentIntent.last_payment_error?.code || 'PAYMENT_FAILED',
          paymentIntent.last_payment_error?.message || 'Payment failed'
        ).catch((err) => routeLogger.error('Failed to update payment audit from webhook', { err, payment_intent_id: paymentIntent.id }));
      }
      break;
    }
    default:
      routeLogger.info('Unhandled webhook event type', { type: event.type });
  }

  res.json({ received: true });
});

export { router as paymentRoutes };
