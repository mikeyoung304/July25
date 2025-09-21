import promBundle from 'express-prom-bundle';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { Counter, Gauge, Histogram, register } from 'prom-client';

// Voice metrics
const voiceChunksTotal = new Counter({
  name: 'voice_chunks_total',
  help: 'Total number of voice audio chunks received',
});

const voiceOverrunTotal = new Counter({
  name: 'voice_overrun_total',
  help: 'Total number of voice audio overruns (buffer full)',
});

const voiceActiveConnections = new Gauge({
  name: 'voice_active_connections',
  help: 'Number of active voice WebSocket connections',
});

// AI-specific metrics
const aiRequestsTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['operation', 'status', 'restaurant_id'],
});

const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI requests in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

const aiErrorsTotal = new Counter({
  name: 'ai_errors_total',
  help: 'Total number of AI errors',
  labelNames: ['operation', 'error_type'],
});

// Register metrics
register.registerMetric(voiceChunksTotal);
register.registerMetric(voiceOverrunTotal);
register.registerMetric(voiceActiveConnections);
register.registerMetric(aiRequestsTotal);
register.registerMetric(aiRequestDuration);
register.registerMetric(aiErrorsTotal);

// Export metrics for use in WebSocket handler
(global as any)['voiceMetrics'] = {
  voiceChunksTotal,
  voiceOverrunTotal,
  voiceActiveConnections,
};

// Create promBundle middleware with automatic HTTP metrics
const promBundleMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: {
    app: 'rebuild-6.0',
    environment: process.env['NODE_ENV'] || 'development',
  },
  promClient: {
    collectDefaultMetrics: {
      prefix: 'rebuild_',
    },
  },
  // CRITICAL: Don't auto-register /metrics route
  autoregister: false,
  // Use a specific endpoint for metrics
  metricsPath: '/metrics',
});

// Export the middleware function that tracks HTTP metrics
export const metricsMiddleware = promBundleMiddleware as unknown as RequestHandler;

// AI metrics tracking middleware
export const trackAIMetrics = (operation: string): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Extract restaurant ID from request
    const restaurantId = (req as any).restaurantId || 
                        req.headers['x-restaurant-id'] as string || 
                        'default';
    
    // Increment request counter
    aiRequestsTotal.inc({ operation, status: 'started', restaurant_id: restaurantId });
    
    // Track the original res.json and res.status methods
    const originalJson = res.json;
    const originalStatus = res.status;
    let statusCode = 200;
    
    // Override res.status to track status codes
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    // Override res.json to track completion
    res.json = function(data: any) {
      const duration = (Date.now() - startTime) / 1000;
      
      // Record duration
      aiRequestDuration.observe({ operation }, duration);
      
      // Record final status
      const status = statusCode >= 400 ? 'error' : 'success';
      aiRequestsTotal.inc({ operation, status, restaurant_id: restaurantId });
      
      // Track errors by type
      if (statusCode >= 400) {
        let errorType = 'unknown';
        if (statusCode === 400) errorType = 'bad_request';
        else if (statusCode === 401) errorType = 'unauthorized';
        else if (statusCode === 403) errorType = 'forbidden';
        else if (statusCode === 404) errorType = 'not_found';
        else if (statusCode === 422) errorType = 'validation_error';
        else if (statusCode === 503) errorType = 'service_unavailable';
        else if (statusCode >= 500) errorType = 'server_error';
        
        aiErrorsTotal.inc({ operation, error_type: errorType });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Export register for metrics endpoint
export { register };