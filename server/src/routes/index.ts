import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { menuRoutes } from './menu.routes';
import { orderRoutes } from './orders.routes';
import { paymentRoutes } from './payments.routes';
import { tableRoutes } from './tables.routes';
import { aiRoutes } from './ai.routes';
import { restaurantRoutes } from './restaurants.routes';
import metricsRoutes from './metrics';

export function setupRoutes(): Router {
  const router = Router();

  // Health and status routes
  router.use('/', healthRoutes);

  // Metrics and monitoring routes
  router.use('/', metricsRoutes);

  // Menu management routes
  router.use('/menu', menuRoutes);

  // Order processing routes
  router.use('/orders', orderRoutes);

  // Payment processing routes
  router.use('/payments', paymentRoutes);

  // Table management routes
  router.use('/tables', tableRoutes);

  // AI service routes
  router.use('/ai', aiRoutes);

  // Restaurant management routes
  router.use('/restaurants', restaurantRoutes);

  return router;
}