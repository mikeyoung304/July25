import { Request, Response, NextFunction } from 'express';
import { BadRequest } from './errorHandler';
import { logger } from '../utils/logger';

export interface RequestWithRestaurant extends Request {
  restaurantId?: string;
  user?: any;
}

/**
 * Middleware to enforce restaurant ID presence for multi-tenant isolation
 * Must be used AFTER authentication middleware
 */
export function requireRestaurantId(
  req: RequestWithRestaurant,
  _res: Response,
  next: NextFunction
): void {
  // Extract restaurant ID from various sources (priority order)
  const headerId = req.headers['x-restaurant-id'] as string;
  const queryId = (req.query.restaurantId || req.query.restaurant_id) as string | undefined;
  const bodyId = req.body?.restaurantId || req.body?.restaurant_id;
  const contextId = req.restaurantId; // May be set by auth middleware

  // Resolve the restaurant ID
  const resolved = headerId || queryId || bodyId || contextId;

  if (!resolved) {
    logger.warn('Restaurant ID missing for protected route', {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      headers: Object.keys(req.headers)
    });

    return next(BadRequest(
      'Restaurant context required for this operation',
      'RESTAURANT_ID_REQUIRED'
    ));
  }

  // Validate format (UUID v4)
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4Regex.test(resolved)) {
    logger.warn('Invalid restaurant ID format', {
      restaurantId: resolved,
      method: req.method,
      path: req.path
    });

    return next(BadRequest(
      'Invalid restaurant ID format',
      'INVALID_RESTAURANT_ID'
    ));
  }

  // Set on request for downstream use
  req.restaurantId = resolved;

  logger.debug('Restaurant context validated', {
    restaurantId: resolved,
    source: headerId ? 'header' : queryId ? 'query' : bodyId ? 'body' : 'context',
    path: req.path
  });

  next();
}

/**
 * Strict version that ONLY accepts header-based restaurant ID
 * Use for critical write operations
 */
export function requireRestaurantIdStrict(
  req: RequestWithRestaurant,
  _res: Response,
  next: NextFunction
): void {
  const headerId = req.headers['x-restaurant-id'] as string;

  if (!headerId) {
    logger.warn('Restaurant ID missing in header for strict route', {
      method: req.method,
      path: req.path,
      userId: req.user?.id
    });

    return next(BadRequest(
      'X-Restaurant-Id header required',
      'RESTAURANT_HEADER_REQUIRED'
    ));
  }

  // Validate format
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4Regex.test(headerId)) {
    logger.warn('Invalid restaurant ID format in header', {
      restaurantId: headerId,
      method: req.method,
      path: req.path
    });

    return next(BadRequest(
      'Invalid restaurant ID format in header',
      'INVALID_RESTAURANT_ID'
    ));
  }

  req.restaurantId = headerId;

  logger.debug('Restaurant context validated (strict)', {
    restaurantId: headerId,
    path: req.path
  });

  next();
}