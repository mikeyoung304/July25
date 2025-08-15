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
    scopes?: string[];
  };
  restaurantId?: string;
}

// Verify JWT token from Supabase
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Unauthorized('No token provided');
    }

    const token = authHeader.substring(7);
    
    // For development/staging, allow a test token
    // Check for Render deployment (staging) or local development
    const isStaging = process.env.RENDER === 'true' || process.env.IS_PULL_REQUEST === 'true';
    if ((config.nodeEnv === 'development' || isStaging) && token === 'test-token') {
      logger.warn('Using test token in staging/development');
      req.user = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
      };
      req.restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
      return next();
    }

    // Verify JWT with proper signature validation
    let decoded: any;
    try {
      // Try kiosk JWT secret first (for demo tokens)
      const kioskSecret = process.env.KIOSK_JWT_SECRET;
      if (kioskSecret) {
        try {
          decoded = jwt.verify(token, kioskSecret) as any;
        } catch (kioskError) {
          // If kiosk JWT fails, try Supabase JWT
          const secret = config.supabase.jwtSecret || config.supabase.anonKey;
          decoded = jwt.verify(token, secret) as any;
        }
      } else {
        // No kiosk secret, use Supabase JWT
        const secret = config.supabase.jwtSecret || config.supabase.anonKey;
        decoded = jwt.verify(token, secret) as any;
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw Unauthorized('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw Unauthorized('Invalid token');
      }
      throw Unauthorized('Token verification failed');
    }

    // Set user info
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'user',
      scopes: decoded.scope || [],
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
  _res: Response,
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
    return authenticate(req, _res, next);
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

    // For development/staging, allow test token
    const isStaging = process.env.RENDER === 'true' || process.env.IS_PULL_REQUEST === 'true';
    if ((config.nodeEnv === 'development' || isStaging) && token === 'test-token') {
      logger.warn('Using test token in WebSocket (staging/development)');
      return {
        userId: 'test-user-id',
        restaurantId: config.restaurant.defaultId,
      };
    }

    // Verify JWT with proper signature validation
    let decoded: any;
    try {
      const secret = config.supabase.jwtSecret || config.supabase.anonKey;
      decoded = jwt.verify(token, secret) as any;
    } catch (error) {
      logger.error('WebSocket JWT verification failed:', error);
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
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role || '')) {
      next(Unauthorized('Insufficient permissions'));
    } else {
      next();
    }
  };
}

// Require specific scope
export function requireScope(requiredScopes: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !req.user.scopes) {
      next(Unauthorized('No scopes available'));
      return;
    }

    const hasRequiredScope = requiredScopes.some(scope => req.user!.scopes!.includes(scope));
    if (!hasRequiredScope) {
      next(Unauthorized(`Required scope missing. Need one of: ${requiredScopes.join(', ')}`));
    } else {
      next();
    }
  };
}

// Validate restaurant access middleware
export function validateRestaurantAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
  
  if (!restaurantId) {
    return next(Unauthorized('Restaurant ID is required'));
  }
  
  req.restaurantId = restaurantId;
  next();
}