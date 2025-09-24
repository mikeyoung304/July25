/**
 * Response Transformation Middleware
 * Ensures consistent camelCase responses from server to client
 * Part of the boundary transform strategy to eliminate naming drift
 */

import { Request, Response, NextFunction } from 'express';
import { camelizeKeys } from '../utils/case';
import { logger } from '../utils/logger';

const transformLogger = logger.child({ module: 'responseTransform' });

// Feature flag for easy rollback
const ENABLE_RESPONSE_TRANSFORM = process.env['ENABLE_RESPONSE_TRANSFORM'] !== 'false';

// Routes that should skip transformation (already in correct format)
const SKIP_TRANSFORM_ROUTES = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/refresh',
  '/api/v1/health',
  '/api/v1/metrics',
];

// Extended Request type to track transform state
interface TransformRequest extends Request {
  skipTransform?: boolean;
  transformApplied?: boolean;
}

/**
 * Middleware to transform snake_case responses to camelCase
 * Applies at the boundary before sending to client
 */
export function responseTransformMiddleware(
  req: TransformRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip if feature flag disabled
  if (!ENABLE_RESPONSE_TRANSFORM) {
    return next();
  }

  // Check if route should skip transformation
  const shouldSkip = SKIP_TRANSFORM_ROUTES.some(route =>
    req.path.startsWith(route)
  );

  if (shouldSkip) {
    req.skipTransform = true;
    return next();
  }

  // Store original res.json method
  const originalJson = res.json.bind(res);

  // Override res.json to apply transformation
  res.json = function(data: any): Response {
    // Skip if explicitly marked or already transformed
    if (req.skipTransform || req.transformApplied) {
      return originalJson(data);
    }

    try {
      // Apply transformation
      const transformed = camelizeKeys(data);

      // Mark as transformed to prevent double transformation
      req.transformApplied = true;

      if (process.env['NODE_ENV'] === 'development') {
        transformLogger.debug('Response transformed', {
          path: req.path,
          method: req.method,
          originalKeys: data ? Object.keys(data).slice(0, 5) : [],
          transformedKeys: transformed ? Object.keys(transformed).slice(0, 5) : []
        });
      }

      return originalJson(transformed);
    } catch (error) {
      // If transformation fails, log error but send original data
      transformLogger.error('Response transformation failed', {
        path: req.path,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Send original data on transform failure
      return originalJson(data);
    }
  };

  next();
}

/**
 * Transform WebSocket message payloads to camelCase
 * Used by WebSocket handlers before sending events
 */
export function transformWebSocketMessage(message: any): any {
  if (!ENABLE_RESPONSE_TRANSFORM) {
    return message;
  }

  try {
    // Preserve message type and metadata, transform payload
    if (message && typeof message === 'object') {
      const { type, payload, ...rest } = message;

      return {
        type,
        payload: payload ? camelizeKeys(payload) : payload,
        ...camelizeKeys(rest)
      };
    }

    return camelizeKeys(message);
  } catch (error) {
    transformLogger.error('WebSocket message transformation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Return original message on transform failure
    return message;
  }
}

/**
 * Helper to mark a request to skip transformation
 * Useful for specific endpoints that need raw responses
 */
export function skipTransform(req: TransformRequest): void {
  req.skipTransform = true;
}

/**
 * Performance monitoring for transformation overhead
 */
let transformStats = {
  totalTransforms: 0,
  totalTime: 0,
  failures: 0,
  lastReset: Date.now()
};

// Reset stats every hour
setInterval(() => {
  if (transformStats.totalTransforms > 0) {
    transformLogger.info('Transform performance stats', {
      totalTransforms: transformStats.totalTransforms,
      avgTimeMs: (transformStats.totalTime / transformStats.totalTransforms).toFixed(2),
      failures: transformStats.failures
    });
  }

  transformStats = {
    totalTransforms: 0,
    totalTime: 0,
    failures: 0,
    lastReset: Date.now()
  };
}, 3600000); // 1 hour

/**
 * Get current transform stats for monitoring
 */
export function getTransformStats() {
  return {
    ...transformStats,
    uptime: Date.now() - transformStats.lastReset,
    avgTimeMs: transformStats.totalTransforms > 0
      ? (transformStats.totalTime / transformStats.totalTransforms).toFixed(2)
      : 0
  };
}