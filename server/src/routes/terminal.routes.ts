import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validateRestaurantAccess } from '../middleware/restaurantAccess';
import { logger } from '../utils/logger';

const router = Router();
const routeLogger = logger.child({ route: 'terminal' });

/**
 * Terminal Routes - Stripe Terminal Integration
 *
 * These routes are placeholders for Stripe Terminal hardware integration.
 * Stripe Terminal is used for in-person payments with physical card readers.
 *
 * To enable:
 * 1. Set up Stripe Terminal in your Stripe Dashboard
 * 2. Register your terminal devices
 * 3. Implement the connection token and payment intent flows
 *
 * See: https://stripe.com/docs/terminal
 */

// POST /api/v1/terminal/checkout - Create terminal checkout (not implemented)
router.post('/checkout', authenticate, validateRestaurantAccess, async (_req: AuthenticatedRequest, res) => {
  routeLogger.info('Terminal checkout requested - Stripe Terminal not configured');
  res.status(501).json({
    success: false,
    error: 'Terminal payments not configured',
    message: 'Stripe Terminal integration is not set up. Use card payments via the web interface instead.',
  });
});

// GET /api/v1/terminal/checkout/:checkoutId - Get terminal checkout status
router.get('/checkout/:checkoutId', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res) => {
  routeLogger.info('Terminal checkout status requested', { checkoutId: req.params['checkoutId'] });
  res.status(501).json({
    success: false,
    error: 'Terminal payments not configured',
  });
});

// POST /api/v1/terminal/checkout/:checkoutId/cancel - Cancel terminal checkout
router.post('/checkout/:checkoutId/cancel', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res) => {
  routeLogger.info('Terminal checkout cancel requested', { checkoutId: req.params['checkoutId'] });
  res.status(501).json({
    success: false,
    error: 'Terminal payments not configured',
  });
});

// POST /api/v1/terminal/checkout/:checkoutId/complete - Complete order after terminal payment
router.post('/checkout/:checkoutId/complete', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res) => {
  routeLogger.info('Terminal checkout complete requested', { checkoutId: req.params['checkoutId'] });
  res.status(501).json({
    success: false,
    error: 'Terminal payments not configured',
  });
});

// GET /api/v1/terminal/devices - List available terminal devices
router.get('/devices', authenticate, validateRestaurantAccess, async (_req: AuthenticatedRequest, res) => {
  routeLogger.info('Terminal devices list requested - Stripe Terminal not configured');
  res.json({
    success: true,
    devices: [],
    message: 'Stripe Terminal not configured. No devices available.',
  });
});

// POST /api/v1/terminal/connection-token - Get connection token for Stripe Terminal SDK
router.post('/connection-token', authenticate, validateRestaurantAccess, async (_req: AuthenticatedRequest, res) => {
  routeLogger.info('Terminal connection token requested - Stripe Terminal not configured');
  res.status(501).json({
    success: false,
    error: 'Terminal payments not configured',
    message: 'Set STRIPE_TERMINAL_LOCATION_ID to enable Stripe Terminal.',
  });
});

export { router as terminalRoutes };
