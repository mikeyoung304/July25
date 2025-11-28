import { Router } from 'express';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';

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
    version: process.env['npm_package_version'] || '1.0.0',
    uptime: process.uptime(),
  });
});

/**
 * Detailed health check endpoint (P1.6 feature)
 * Includes database health check with latency measurement
 */
router.get('/health/detailed', async (_req, res) => {
  // Database health check (P1.6)
  let dbStatus = 'healthy';
  let dbLatency = 0;
  let dbError: string | undefined;
  try {
    const start = Date.now();
    const { error } = await supabase.from('restaurants').select('id').limit(1);
    dbLatency = Date.now() - start;
    if (error) {
      dbStatus = 'error';
      dbError = error.message;
    } else if (dbLatency > 1000) {
      dbStatus = 'degraded'; // Latency over 1 second is concerning
    }
  } catch (err) {
    dbStatus = 'error';
    dbError = err instanceof Error ? err.message : 'Unknown database error';
  }

  const checks = {
    server: {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    database: {
      status: dbStatus,
      latency_ms: dbLatency,
      ...(dbError && { error: dbError })
    }
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
if (process.env['NODE_ENV'] === 'development') {
  router.post('/test/error', (_req, _res) => {
    throw new Error('Test error for monitoring integration');
  });
}

export default router;