import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';
import { Unauthorized, BadRequest, Forbidden } from './errorHandler';
import { logger } from '../utils/logger';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getRestaurantHeader = (req: AuthenticatedRequest): string | undefined => {
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === 'x-restaurant-id') {
      return Array.isArray(value) ? value[0] : value;
    }
  }
  return undefined;
};

export const strictAuth = () => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!WRITE_METHODS.has(req.method)) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Strict auth rejected request with missing Bearer token', {
        method: req.method,
        path: req.originalUrl,
      });
      return next(Unauthorized('Bearer token required for write operations'));
    }

    const headerRestaurantId = getRestaurantHeader(req);
    if (!headerRestaurantId) {
      logger.warn('Strict auth rejected request missing X-Restaurant-ID header', {
        method: req.method,
        path: req.originalUrl,
      });
      return next(BadRequest('X-Restaurant-ID header required for write operations'));
    }

    if (req.user?.restaurantId && req.user.restaurantId !== headerRestaurantId) {
      logger.warn('Strict auth restaurant mismatch detected', {
        method: req.method,
        path: req.originalUrl,
        userRestaurantId: req.user.restaurantId,
        headerRestaurantId,
      });
      return next(Forbidden('Restaurant context mismatch'));
    }

    if (req.restaurantId && req.restaurantId !== headerRestaurantId) {
      logger.warn('Strict auth conflicting restaurant context', {
        method: req.method,
        path: req.originalUrl,
        requestRestaurantId: req.restaurantId,
        headerRestaurantId,
      });
      return next(Forbidden('Conflicting restaurant context detected'));
    }

    req.restaurantId = headerRestaurantId;
    next();
  };
};

export default strictAuth;
