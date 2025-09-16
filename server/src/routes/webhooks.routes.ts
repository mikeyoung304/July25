import { Router } from 'express';
import { verifySquareWebhookSignature } from '../middleware/webhookSignature';
import { logger } from '../utils/logger';
import { SquareAdapter } from '../payments/square.adapter';
import { supabase } from '../utils/supabase';

const router = Router();
const routeLogger = logger.child({ route: 'webhooks' });
const squareAdapter = new SquareAdapter();

// Track processed events to ensure idempotency
const processedEvents = new Set<string>();

// Clean up old event IDs periodically (every hour)
setInterval(() => {
  processedEvents.clear();
}, 60 * 60 * 1000);

// POST /api/v1/webhooks/square - Handle Square webhook events
router.post('/square',
  verifySquareWebhookSignature,
  async (req, res) => {
    const { type, event_id, data } = req.body;

    // Ensure idempotency
    if (processedEvents.has(event_id)) {
      routeLogger.debug('Duplicate webhook event (already processed)', { eventId: event_id });
      return res.status(200).json({ status: 'already_processed' });
    }

    try {
      routeLogger.info('Processing Square webhook event', {
        eventType: type,
        eventId: event_id
      });

      switch (type) {
        case 'payment.created':
        case 'payment.updated': {
          const payment = data?.object?.payment;
          if (!payment) break;

          // Determine status from Square payment status
          let status: 'pending' | 'succeeded' | 'failed' | 'canceled' = 'pending';

          switch (payment.status) {
            case 'COMPLETED':
              status = 'succeeded';
              break;
            case 'FAILED':
              status = 'failed';
              break;
            case 'CANCELED':
              status = 'canceled';
              break;
            case 'PENDING':
            case 'APPROVED':
              status = 'pending';
              break;
          }

          // Update payment intent status
          if (payment.id) {
            await squareAdapter.updateIntentStatus(payment.id, status);
            routeLogger.info('Payment status updated from webhook', {
              paymentId: payment.id,
              status
            });
          }

          // If payment has order_id, we might need to update the order status
          if (payment.order_id && status === 'succeeded') {
            // Check if this payment was for an order
            const { data: paymentIntent } = await supabase
              .from('payment_intents')
              .select('used_by_order_id')
              .eq('provider_payment_id', payment.id)
              .single();

            if (paymentIntent?.used_by_order_id) {
              routeLogger.info('Payment completed for order', {
                orderId: paymentIntent.used_by_order_id,
                paymentId: payment.id
              });
            }
          }
          break;
        }

        case 'order.created':
        case 'order.updated': {
          const order = data?.object?.order;
          if (!order) break;

          // Map order state to payment status
          let status: 'succeeded' | 'failed' | 'canceled' = 'succeeded';

          if (order.state === 'CANCELED') {
            status = 'canceled';
          } else if (order.state === 'COMPLETED' || order.state === 'PAID') {
            status = 'succeeded';
          }

          // Update associated payment intents
          if (order.id) {
            const { error } = await supabase
              .from('payment_intents')
              .update({
                status,
                updated_at: new Date().toISOString()
              })
              .eq('metadata->>checkoutId', order.id);

            if (!error) {
              routeLogger.info('Payment intents updated from order webhook', {
                orderId: order.id,
                status
              });
            }
          }
          break;
        }

        case 'refund.created':
        case 'refund.updated': {
          const refund = data?.object?.refund;
          if (!refund) break;

          routeLogger.info('Refund webhook received', {
            refundId: refund.id,
            paymentId: refund.payment_id,
            amount: refund.amount_money,
            status: refund.status
          });

          // TODO: Handle refund logic - update order, payment intent, etc.
          break;
        }

        default:
          routeLogger.debug('Unhandled webhook event type', { type });
      }

      // Mark event as processed
      processedEvents.add(event_id);

      res.status(200).json({ status: 'processed' });
    } catch (error) {
      routeLogger.error('Error processing webhook', {
        error,
        eventType: type,
        eventId: event_id
      });

      // Return 200 to prevent retries for processing errors
      // (only return 4xx/5xx for signature or config errors)
      res.status(200).json({
        status: 'error',
        message: 'Processing error, but acknowledged'
      });
    }
  }
);

// POST /api/v1/webhooks/stripe - Handle Stripe webhook events (placeholder)
router.post('/stripe',
  (req, res) => {
    routeLogger.debug('Stripe webhook endpoint placeholder');
    res.status(200).json({ status: 'not_implemented' });
  }
);

export default router;