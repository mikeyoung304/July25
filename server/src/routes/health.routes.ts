import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import NodeCache from 'node-cache';

const router = Router();

// Initialize cache instance for stats
const cache = new NodeCache({ stdTTL: 300 });

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version?: string;
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error';
      latency?: number;
      error?: string;
    };
    cache: {
      status: 'active' | 'inactive';
      keys: number;
      hits: number;
      misses: number;
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
      status: 'connected',
      latency,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Basic health check endpoint
router.get('/', async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed status endpoint
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [databaseStatus] = await Promise.all([
      checkDatabase(),
    ]);
    
    const cacheStats = cache.getStats();
    
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version,
      services: {
        database: databaseStatus,
        cache: {
          status: 'active',
          keys: cacheStats.keys,
          hits: cacheStats.hits,
          misses: cacheStats.misses,
        },
      },
    };
    
    // Determine overall health status
    if (databaseStatus.status !== 'connected') {
      health.status = 'unhealthy';
    } else if (databaseStatus.latency && databaseStatus.latency > 1000) {
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
    const dbStatus = await checkDatabase();
    
    if (dbStatus.status === 'connected') {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({ ready: false, reason: 'Database not ready' });
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
    version: process.env.npm_package_version || '1.0.0',
  });
});

export { router as healthRoutes };