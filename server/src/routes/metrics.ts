import { Router } from 'express';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';

const router = Router();

/**
 * Forward metrics to external monitoring service
 * Currently a stub - implement when DataDog/New Relic is configured
 */
async function forwardMetricsToMonitoring(metrics: {
  timestamp?: string;
  slowRenders?: number;
  slowAPIs?: number;
  stats?: Record<string, unknown>;
}): Promise<void> {
  const datadogApiKey = process.env['DATADOG_API_KEY'];
  const newRelicApiKey = process.env['NEW_RELIC_API_KEY'];

  if (!datadogApiKey && !newRelicApiKey) {
    // No monitoring service configured - silent return
    return;
  }

  if (datadogApiKey) {
    // TODO: Implement DataDog integration
    // Example:
    // await fetch('https://api.datadoghq.com/api/v1/series', {
    //   method: 'POST',
    //   headers: { 'DD-API-KEY': datadogApiKey, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     series: [
    //       { metric: 'client.slow_renders', points: [[Date.now() / 1000, metrics.slowRenders || 0]] },
    //       { metric: 'client.slow_apis', points: [[Date.now() / 1000, metrics.slowAPIs || 0]] }
    //     ]
    //   })
    // });
    logger.info('[Metrics] DataDog forwarding configured but not yet implemented', {
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs
    });
  }

  if (newRelicApiKey) {
    // TODO: Implement New Relic integration
    logger.info('[Metrics] New Relic forwarding configured but not yet implemented', {
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs
    });
  }
}

/**
 * Receive performance metrics from client
 * Alias: /api/v1/analytics/performance → /metrics
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

    // Forward to monitoring service when configured
    await forwardMetricsToMonitoring(metrics);

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
 * Check Redis health status
 * Returns 'not_configured' when Redis is not in use
 */
async function checkRedisHealth(): Promise<{ status: string; error?: string }> {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    return { status: 'not_configured' };
  }

  try {
    // TODO: When Redis is added, implement actual ping check
    // await redis.ping();
    return { status: 'configured' };
  } catch (err) {
    return {
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown Redis error'
    };
  }
}

/**
 * Check AI service (OpenAI) health status
 * Lightweight check - just verifies API key is configured
 */
function checkAIServiceHealth(): { status: string } {
  const openaiKey = process.env['OPENAI_API_KEY'];
  if (!openaiKey) {
    return { status: 'not_configured' };
  }

  // Verify API key format (sk-... for standard keys, sk-proj-... for project keys)
  if (!openaiKey.startsWith('sk-')) {
    return { status: 'invalid_format' };
  }

  return { status: 'configured' };
}

/**
 * Detailed health check endpoint (P1.6 feature)
 * Includes database, Redis, and AI service health checks
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

  // Redis health check
  const redisHealth = await checkRedisHealth();

  // AI service health check
  const aiHealth = checkAIServiceHealth();

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
    },
    redis: redisHealth,
    ai: aiHealth
  };

  // Consider service healthy if core services are healthy
  // Redis and AI being not_configured is acceptable
  const coreServicesHealthy =
    checks.server.status === 'healthy' &&
    checks.database.status === 'healthy';

  res.status(coreServicesHealthy ? 200 : 503).json({
    status: coreServicesHealthy ? 'healthy' : 'degraded',
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

/**
 * Analytics performance alias
 * Client expects /api/v1/analytics/performance but we serve /metrics
 */
router.post('/analytics/performance', async (req, res) => {
  try {
    const metrics = req.body;

    logger.info('Client performance metrics', {
      timestamp: metrics.timestamp,
      slowRenders: metrics.slowRenders,
      slowAPIs: metrics.slowAPIs,
      stats: metrics.stats,
    });

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;