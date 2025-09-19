import { Router } from 'express';
import { strictAuthForWrites } from '../middleware/strict-auth';
import { squareWebhookGuard, twilioWebhookGuard } from '../middleware/webhookSignature';
import { healthRoutes } from './health.routes';
import { menuRoutes } from './menu.routes';
import { orderRoutes } from './orders.routes';
import { paymentRoutes } from './payments.routes';
import { terminalRoutes } from './terminal.routes';
import { tableRoutes } from './tables.routes';
import { tablePaymentRoutes } from './table-payment.routes';
import { aiRoutes } from './ai.routes';
import { restaurantRoutes } from './restaurants.routes';
import { authRoutes } from './auth.routes';
import { realtimeRoutes } from './realtime.routes';
import metricsRoutes from './metrics';
import securityRoutes from './security.routes';
import webhooksRoutes from './webhooks.routes';

export function setupRoutes(): Router {
  const router = Router();

  // Enforce Bearer + X-Restaurant-ID headers for all mutating routes.
  router.use(
    strictAuthForWrites({
      skip: (req) =>
        req.path.startsWith('/webhooks') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/internal/metrics'),
    })
  );

  // Health and status routes
  router.use('/', healthRoutes);

  // Metrics and monitoring routes
  router.use('/', metricsRoutes);

  // Authentication routes
  router.use('/auth', authRoutes);

  // Webhook signature guard stubs
  router.use('/webhooks/square', squareWebhookGuard);
  router.use('/webhooks/twilio', twilioWebhookGuard);

  // Webhook routes (no auth required - verified by signature)
  router.use('/webhooks', webhooksRoutes);

  // Secure routes require strict auth headers
  const protectedRoutes = Router();
  // Security monitoring routes (admin only)
  protectedRoutes.use('/security', securityRoutes);

  // Menu management routes
  protectedRoutes.use('/menu', menuRoutes);

  // Order processing routes
  protectedRoutes.use('/orders', orderRoutes);

  // Payment processing routes
  protectedRoutes.use('/payments', paymentRoutes);

  // Terminal payment routes
  protectedRoutes.use('/terminal', terminalRoutes);

  // Table management routes (may share prefix)
  protectedRoutes.use('/tables', tableRoutes);
  protectedRoutes.use('/tables', tablePaymentRoutes);
  protectedRoutes.use('/payments', tablePaymentRoutes);

  // AI service routes
  protectedRoutes.use('/ai', aiRoutes);

  // Restaurant management routes
  protectedRoutes.use('/restaurants', restaurantRoutes);

  // Real-time voice ordering routes
  protectedRoutes.use('/realtime', realtimeRoutes);

  router.use('/', protectedRoutes);

  return router;
}
