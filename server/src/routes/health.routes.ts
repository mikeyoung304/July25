import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { checkAIHealth } from '../ai';
import NodeCache from 'node-cache';
import { SquareClient, SquareEnvironment } from 'square';
import { isSentryEnabled } from '../config/sentry';

const router = Router();

// Initialize cache instance for stats
const cache = new NodeCache({ stdTTL: 300 });

// Initialize Square client for health checks
let squareClient: SquareClient | null = null;
try {
  if (process.env['SQUARE_ACCESS_TOKEN'] &&
      process.env['SQUARE_ACCESS_TOKEN'] !== 'demo' &&
      !process.env['SQUARE_ACCESS_TOKEN'].includes('placeholder')) {
    squareClient = new SquareClient({
      environment: process.env['SQUARE_ENVIRONMENT'] === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
      token: process.env['SQUARE_ACCESS_TOKEN']
    });
  }
} catch (error) {
  logger.warn('Square client initialization failed for health checks:', error);
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version?: string | undefined;
  services: {
    server: {
      status: 'ok' | 'error';
    };
    database: {
      status: 'ok' | 'error' | 'connected' | 'disconnected';
      latency?: number;
      error?: string;
    };
    cache: {
      status: 'ok' | 'n/a' | 'active' | 'inactive';
      keys?: number;
      hits?: number;
      misses?: number;
    };
    payments: {
      status: 'ok' | 'error' | 'n/a';
      provider?: 'square';
      environment?: 'sandbox' | 'production';
      error?: string;
    };
    monitoring?: {
      status: 'ok' | 'n/a';
      provider?: 'sentry';
    };
    ai?: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      provider: 'openai' | 'stubs';
      details: any;
      error?: string;
    };
    websocket?: {
      connections: number;
    };
  };
}

async function checkDatabase(): Promise<HealthStatus['services']['database']> {
  const start = Date.now();

  try {
    // Simple query to test connection
    const { error } = await supabase
      .from('restaurants')
      .select('id')
      .limit(1)
      .single();

    const latency = Date.now() - start;

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return {
        status: 'error',
        latency,
        error: error.message,
      };
    }

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkPayments(): Promise<HealthStatus['services']['payments']> {
  // If Square client not configured, return n/a
  if (!squareClient) {
    return {
      status: 'n/a',
    };
  }

  try {
    // Attempt to list locations as a health check
    // This is a lightweight API call that verifies credentials
    const response = await squareClient.locations.list();

    if (response.result) {
      return {
        status: 'ok',
        provider: 'square',
        environment: process.env['SQUARE_ENVIRONMENT'] === 'production' ? 'production' : 'sandbox',
      };
    }

    return {
      status: 'error',
      provider: 'square',
      error: 'Invalid response from Square API',
    };
  } catch (error) {
    logger.error('Payment service health check failed:', error);
    return {
      status: 'error',
      provider: 'square',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkAI(): Promise<HealthStatus['services']['ai']> {
  try {
    const aiHealth = await checkAIHealth();
    
    return {
      status: aiHealth.status,
      provider: aiHealth.provider,
      details: aiHealth.details,
      error: aiHealth.status === 'unhealthy' ? aiHealth.details.error : undefined
    };
  } catch (error) {
    logger.error('AI health check error:', error);
    return {
      status: 'unhealthy',
      provider: 'stubs',
      details: { message: 'AI health check failed' },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Basic health check endpoint with all services
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const [databaseStatus, paymentsStatus] = await Promise.all([
      checkDatabase(),
      checkPayments(),
    ]);

    const cacheStats = cache.getStats();

    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '6.0.8',
      services: {
        server: {
          status: 'ok',
        },
        database: databaseStatus,
        cache: {
          status: 'ok',
          keys: cacheStats.keys,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
        },
        payments: paymentsStatus,
        monitoring: {
          status: isSentryEnabled() ? 'ok' : 'n/a',
          provider: isSentryEnabled() ? 'sentry' : undefined,
        },
      },
    };

    // Determine overall health status
    if (databaseStatus.status === 'error') {
      health.status = 'unhealthy';
    } else if (paymentsStatus.status === 'error') {
      health.status = 'degraded';
    } else if (databaseStatus.latency && databaseStatus.latency > 1000) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Failed to check system status',
    });
  }
});

// Root endpoint - simple health check (backward compatibility)
router.get('/', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env['NODE_ENV'] || 'development',
  });
});

// Detailed status endpoint (includes AI service)
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [databaseStatus, aiStatus, paymentsStatus] = await Promise.all([
      checkDatabase(),
      checkAI(),
      checkPayments(),
    ]);

    const cacheStats = cache.getStats();

    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '6.0.8',
      services: {
        server: {
          status: 'ok',
        },
        database: databaseStatus,
        cache: {
          status: 'ok',
          keys: cacheStats.keys,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
        },
        payments: paymentsStatus,
        monitoring: {
          status: isSentryEnabled() ? 'ok' : 'n/a',
          provider: isSentryEnabled() ? 'sentry' : undefined,
        },
        ai: aiStatus,
      },
    };

    // Determine overall health status
    if (databaseStatus.status === 'error') {
      health.status = 'unhealthy';
    } else if (aiStatus.status === 'unhealthy') {
      health.status = 'unhealthy';
    } else if (paymentsStatus.status === 'error') {
      health.status = 'degraded';
    } else if (aiStatus.status === 'degraded' ||
               (databaseStatus.latency && databaseStatus.latency > 1000)) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 :
                       health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Status check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Failed to check system status',
    });
  }
});

// Readiness probe for k8s
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const [dbStatus, aiStatus] = await Promise.all([
      checkDatabase(),
      checkAI(),
    ]);
    
    if (dbStatus.status === 'ok' && aiStatus.status !== 'unhealthy') {
      res.status(200).json({ ready: true });
    } else {
      const reasons = [];
      if (dbStatus.status !== 'ok') reasons.push('Database not ready');
      if (aiStatus.status === 'unhealthy') reasons.push('AI service not ready');
      
      res.status(503).json({ 
        ready: false, 
        reason: reasons.join(', ')
      });
    }
  } catch {
    res.status(503).json({ ready: false, reason: 'Health check failed' });
  }
});

// Liveness probe for k8s
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

// Simple health check endpoint
router.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    version: process.env['npm_package_version'] || '1.0.0',
  });
});

export { router as healthRoutes };