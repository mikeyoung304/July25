import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { getConfig } from '../config/environment';
import { Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';

const config = getConfig();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  restaurantId?: string;
}

// Verify JWT token from Supabase
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Unauthorized('No token provided');
    }

    const token = authHeader.substring(7);
    
    // For development, allow a test token
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
      };
      req.restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
      return next();
    }

    // Verify JWT
    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      throw Unauthorized('Invalid token');
    }

    // Set user info
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
    };

    // Set restaurant ID from header or token
    req.restaurantId = 
      req.headers['x-restaurant-id'] as string ||
      decoded.restaurant_id ||
      config.restaurant.defaultId;

    next();
  } catch (error) {
    next(error);
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, but that's okay
      req.restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
      return next();
    }

    // If token exists, validate it
    return authenticate(req, res, next);
  } catch (error) {
    // Log but don't fail
    logger.warn('Optional auth failed:', error);
    next();
  }
}

// Verify WebSocket authentication
export async function verifyWebSocketAuth(
  request: IncomingMessage
): Promise<{ userId: string; restaurantId?: string } | null> {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      return null;
    }

    // For development, allow test token
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      return {
        userId: 'test-user-id',
        restaurantId: config.restaurant.defaultId,
      };
    }

    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      return null;
    }

    return {
      userId: decoded.sub,
      restaurantId: decoded.restaurant_id,
    };
  } catch (error) {
    logger.error('WebSocket auth error:', error);
    return null;
  }
}

// Require specific role
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role || '')) {
      next(Unauthorized('Insufficient permissions'));
    } else {
      next();
    }
  };
}

// Validate restaurant access middleware
export function validateRestaurantAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
  
  if (!restaurantId) {
    return next(Unauthorized('Restaurant ID is required'));
  }
  
  req.restaurantId = restaurantId;
  next();
}