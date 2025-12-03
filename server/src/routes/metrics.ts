import { Router, Request, Response } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Body size limit for metrics endpoints (1KB max)
const metricsBodyLimit = express.json({ limit: '1kb' });

// Only disable rate limiting in local development
const isDevelopment = process.env['NODE_ENV'] === 'development' && process.env['RENDER'] !== 'true';

/**
 * Sanitize error objects to prevent API key leakage in logs
 * Extracts only safe properties from error objects
 */
function sanitizeError(error: unknown): { message: string; code?: string; status?: number } {
  if (error instanceof Error) {
    return {
      message: error.message,
      // Include HTTP status if available (from fetch errors)
      ...(('status' in error && typeof error.status === 'number') && { status: error.status }),
      // Include error code if available
      ...(('code' in error && typeof error.code === 'string') && { code: error.code })
    };
  }
  return { message: 'Unknown error' };
}

// Rate limiter keyed by authenticated restaurant (no IP fallback - auth required)
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevelopment ? 300 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const authReq = req as AuthenticatedRequest;
    // Only use restaurant_id from JWT (not from header) - prevents spoofing
    return `metrics:${authReq.user?.restaurant_id || 'unknown'}`;
  },
  handler: (req, res) => {
    const authReq = req as AuthenticatedRequest;
    logger.warn('[RATE_LIMIT] Metrics rate limit exceeded', {
      restaurantId: authReq.user?.restaurant_id,
      userId: authReq.user?.id,
      ip: req.ip
    });
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: 60,
      limit: 100,
      windowMs: 60000
    });
  }
});

/**
 * Forward metrics to external monitoring service
 * Supports DataDog and New Relic integrations via environment variables
 */
async function forwardMetricsToMonitoring(metrics: {
  timestamp?: string;
  slowRenders?: number;
  slowAPIs?: number;
  stats?: Record<string, unknown>;
}): Promise<void> {
  // TODO: Implement DataDog/New Relic forwarding when needed
  const hasMonitoring = process.env['DATADOG_API_KEY'] || process.env['NEW_RELIC_API_KEY'];
  if (hasMonitoring) {
    logger.debug('[Metrics] External monitoring not yet implemented', { metricsCount: Object.keys(metrics).length });
  }
}

/**
 * Shared handler for metrics endpoints (fixes TODO-099 duplication)
 */
async function handleMetrics(req: Request, res: Response): Promise<void> {
  const authReq = req as AuthenticatedRequest;

  try {
    const metrics = req.body;

    // Sanitize metrics
    const sanitizedMetrics = {
      timestamp: metrics.timestamp || new Date().toISOString(),
      slowRenders: Math.max(0, parseInt(metrics.slowRenders) || 0),
      slowAPIs: Math.max(0, parseInt(metrics.slowAPIs) || 0),
      stats: typeof metrics.stats === 'object' ? metrics.stats : {}
    };

    logger.info('Client performance metrics', {
      ...sanitizedMetrics,
      restaurantId: authReq.user?.restaurant_id, // From JWT only
      userId: authReq.user?.id
    });

    // Fire-and-forget - don't block response on external monitoring
    forwardMetricsToMonitoring(sanitizedMetrics).catch(error => {
      logger.error('Failed to forward metrics to monitoring', {
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    });
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to process metrics', sanitizeError(error));
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Receive performance metrics from client
 * Requires authentication to prevent restaurant_id spoofing and enable per-restaurant rate limiting
 * Body size limited to 1KB and rate limited to 100 req/min per restaurant
 */
router.post('/metrics', metricsBodyLimit, authenticate, metricsLimiter, handleMetrics);

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
 * Validates URL format when configured (actual ping requires Redis client)
 */
async function checkRedisHealth(): Promise<{ status: string; error?: string; latency_ms?: number }> {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    return { status: 'not_configured' };
  }

  try {
    const start = Date.now();

    // Validate Redis URL format
    const url = new URL(redisUrl);
    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      return {
        status: 'error',
        error: `Invalid Redis URL protocol: ${url.protocol}. Expected redis: or rediss:`
      };
    }

    // Validate host is present
    if (!url.hostname) {
      return {
        status: 'error',
        error: 'Redis URL missing hostname'
      };
    }

    const latency = Date.now() - start;

    // URL is valid but no Redis client available yet
    // When a Redis client is added, replace this with: await redis.ping()
    return {
      status: 'configured',
      latency_ms: latency
    };
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
    // Health check query - restaurants table is small and exists in all environments
    // Using limit(1) keeps the query fast even as data grows
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
 * Uses same authentication, rate limiting, and body size limit as /metrics
 */
router.post('/analytics/performance', metricsBodyLimit, authenticate, metricsLimiter, handleMetrics);

export default router;