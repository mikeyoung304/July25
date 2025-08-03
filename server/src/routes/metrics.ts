import { Router } from 'express';
import { logger } from '../services/logger';

const router = Router();

/**
 * Receive performance metrics from client
 */
router.post('/metrics', async (req, res) => {
  try {
    const metrics = req.body;
    
    // Log metrics for analysis
    logger.info('Client performance metrics', {
      timestamp: metrics.timestamp,
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs,
      stats: metrics.stats,
    });

    // TODO: Forward to monitoring service (DataDog, New Relic, etc.)
    // Example:
    // await datadogClient.gauge('client.slow_renders', metrics.slowRenders);
    // await datadogClient.gauge('client.slow_apis', metrics.slowAPIs);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check endpoint
 */
router.get('/health/detailed', async (_req, res) => {
  const checks = {
    server: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    // TODO: Add database, Redis, and AI service checks
    // database: await checkDatabase(),
    // redis: await checkRedis(),
    // ai: await checkAIService(),
  };

  const allHealthy = Object.values(checks).every(
    (check: any) => check.status === 'healthy'
  );

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Test error endpoint (development only)
 */
if (process.env.NODE_ENV === 'development') {
  router.post('/test/error', (_req, _res) => {
    throw new Error('Test error for monitoring integration');
  });
}

export default router;