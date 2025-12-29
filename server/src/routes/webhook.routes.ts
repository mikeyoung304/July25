import { Router } from 'express';
import { webhookAuthWithTimestamp, captureRawBody } from '../middleware/webhookSignature';
import { logger } from '../utils/logger';

const router = Router();

// Apply raw body capture for all webhook routes
router.use(captureRawBody);

/**
 * Payment webhook endpoint
 * Requires valid HMAC signature and timestamp verification (replay attack protection)
 */
router.post('/payments', webhookAuthWithTimestamp, async (req, res) => {
  try {
    const { event, data } = req.body;

    logger.info('Payment webhook received', {
      event,
      timestamp: new Date().toISOString(),
      // Don't log sensitive payment data
    });

    // Process payment event
    switch (event) {
      case 'payment.completed':
        // Handle successful payment
        logger.info('Payment completed', { orderId: data.orderId });
        break;

      case 'payment.failed':
        // Handle failed payment
        logger.warn('Payment failed', { orderId: data.orderId, reason: data.reason });
        break;

      case 'payment.refunded':
        // Handle refund
        logger.info('Payment refunded', { orderId: data.orderId, amount: data.amount });
        break;

      default:
        logger.warn('Unknown payment event', { event });
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Payment webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Order status webhook endpoint
 * Requires valid HMAC signature and timestamp verification (replay attack protection)
 */
router.post('/orders', webhookAuthWithTimestamp, async (req, res) => {
  try {
    const { orderId, status, timestamp } = req.body;

    logger.info('Order webhook received', {
      orderId,
      status,
      timestamp
    });

    // Process order status update
    // This would typically update the order in the database

    res.json({
      success: true,
      message: 'Order webhook processed',
      orderId,
      status
    });
  } catch (error) {
    logger.error('Order webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: 'Internal server error'
    });
  }
});

/**
 * Inventory update webhook endpoint
 * Requires valid HMAC signature and timestamp verification (replay attack protection)
 */
router.post('/inventory', webhookAuthWithTimestamp, async (req, res) => {
  try {
    const { items, timestamp } = req.body;

    logger.info('Inventory webhook received', {
      itemCount: items?.length || 0,
      timestamp
    });

    // Process inventory updates
    // This would typically sync inventory levels

    res.json({
      success: true,
      message: 'Inventory webhook processed',
      itemsUpdated: items?.length || 0
    });
  } catch (error) {
    logger.error('Inventory webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: 'Internal server error'
    });
  }
});

export const webhookRoutes = router;