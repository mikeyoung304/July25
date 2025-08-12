import { Request, Response, NextFunction } from 'express';
import { Counter, Histogram, register } from 'prom-client';

// AI metrics
export const aiRequestsTotal = new Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI requests',
  labelNames: ['route', 'provider'],
  registers: [register]
});

export const aiErrorsTotal = new Counter({
  name: 'ai_errors_total',
  help: 'Total number of AI errors',
  labelNames: ['route', 'reason'],
  registers: [register]
});

export const aiDurationSeconds = new Histogram({
  name: 'ai_duration_seconds',
  help: 'AI request duration in seconds',
  labelNames: ['route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 15],
  registers: [register]
});

/**
 * Middleware to track AI metrics
 */
export function trackAIMetrics(routeName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = aiDurationSeconds.startTimer({ route: routeName });
    
    // Track request
    aiRequestsTotal.inc({ route: routeName, provider: 'openai' });
    
    // Override res.json to track errors
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      timer();
      
      // Track errors based on status code
      if (res.statusCode >= 400) {
        let reason = 'unknown';
        if (res.statusCode === 422) reason = 'validation_error';
        else if (res.statusCode === 503) reason = 'provider_unavailable';
        else if (res.statusCode === 500) reason = 'internal_error';
        else if (res.statusCode === 400) reason = 'bad_request';
        
        aiErrorsTotal.inc({ route: routeName, reason });
      }
      
      return originalJson(data);
    };
    
    // Override res.send for non-JSON responses
    const originalSend = res.send.bind(res);
    res.send = function(data: any) {
      timer();
      return originalSend(data);
    };
    
    next();
  };
}

/**
 * Express handler for metrics endpoint
 */
export async function metricsHandler(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end();
  }
}