import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { menuRoutes } from './menu.routes';
import { orderRoutes } from './orders.routes';
import { paymentRoutes } from './payments.routes';
import { terminalRoutes } from './terminal.routes';
import { tableRoutes } from './tables.routes';
import { aiRoutes } from './ai.routes';
import { restaurantRoutes } from './restaurants.routes';
import { authRoutes } from './auth.routes';
import { realtimeRoutes } from './realtime.routes';
import metricsRoutes from './metrics';
import securityRoutes from './security.routes';

export function setupRoutes(): Router {
  const router = Router();

  // Health and status routes
  router.use('/', healthRoutes);

  // Metrics and monitoring routes
  router.use('/', metricsRoutes);

  // Authentication routes
  router.use('/auth', authRoutes);

  // Security monitoring routes (admin only)
  router.use('/security', securityRoutes);

  // Menu management routes
  router.use('/menu', menuRoutes);

  // Order processing routes
  router.use('/orders', orderRoutes);

  // Payment processing routes
  router.use('/payments', paymentRoutes);

  // Terminal payment routes
  router.use('/terminal', terminalRoutes);

  // Table management routes
  router.use('/tables', tableRoutes);

  // AI service routes
  router.use('/ai', aiRoutes);

  // Restaurant management routes
  router.use('/restaurants', restaurantRoutes);

  // Real-time voice ordering routes
  router.use('/realtime', realtimeRoutes);

  return router;
}