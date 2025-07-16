import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { menuRoutes } from './menu.routes';
import { orderRoutes } from './orders.routes';
import { tableRoutes } from './tables.routes';
import { aiRoutes } from './ai.routes';

export function setupRoutes(): Router {
  const router = Router();

  // Health and status routes
  router.use('/', healthRoutes);

  // Menu management routes
  router.use('/menu', menuRoutes);

  // Order processing routes
  router.use('/orders', orderRoutes);

  // Table management routes
  router.use('/tables', tableRoutes);

  // AI service routes
  router.use('/ai', aiRoutes);

  return router;
}