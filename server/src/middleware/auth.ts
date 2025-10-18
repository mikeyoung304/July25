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
    restaurant_id?: string; // Add restaurant_id to user interface
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
    
    // STRICT_AUTH mode - no bypasses allowed
    const strictAuth = process.env['STRICT_AUTH'] === 'true';
    
    // In strict auth mode, never allow test tokens
    if (strictAuth && token === 'test-token') {
      logger.error('⛔ STRICT_AUTH enabled - test token rejected');
      throw Unauthorized('Test tokens not allowed in strict auth mode');
    }
    
    // Test tokens are no longer supported for security reasons
    // Use proper JWT tokens in all environments

    // Verify JWT with single configured secret (no fallbacks for security)
    const jwtSecret = config.supabase.jwtSecret;
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - authentication cannot proceed');
      throw new Error('Server authentication not configured');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw Unauthorized('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw Unauthorized('Invalid token');
      }
      throw Unauthorized('Token verification failed');
    }

    // Handle role with kiosk_demo → customer alias
    let userRole = decoded.role || 'user';

    // Feature flag: Accept kiosk_demo as alias for customer (default: true for backwards compat)
    const acceptKioskDemoAlias = process.env['AUTH_ACCEPT_KIOSK_DEMO_ALIAS'] !== 'false';

    if (userRole === 'kiosk_demo') {
      if (acceptKioskDemoAlias) {
        logger.warn("⚠️ auth: role 'kiosk_demo' is deprecated; treating as 'customer'", {
          userId: decoded.sub,
          path: req.path
        });
        userRole = 'customer'; // Alias kiosk_demo → customer
      } else {
        logger.error("⛔ auth: role 'kiosk_demo' rejected (AUTH_ACCEPT_KIOSK_DEMO_ALIAS=false)", {
          userId: decoded.sub
        });
        throw Unauthorized("Role 'kiosk_demo' is deprecated. Use 'customer' instead.");
      }
    }

    // Set user info
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: userRole,
      scopes: decoded.scope || [],
      restaurant_id: decoded.restaurant_id, // Add restaurant_id from token
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
    // Log but don't fail - still set restaurant ID for unauthenticated access
    logger.warn('Optional auth failed:', error);
    req.restaurantId = req.headers['x-restaurant-id'] as string || config.restaurant.defaultId;
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
      // In production, always reject connections without token
      if (config.nodeEnv === 'production') {
        logger.warn('WebSocket auth rejected: no token in production');
        return null;
      }
      // In development/test, allow anonymous connections with warning
      logger.warn('⚠️ WebSocket: Anonymous connection (no token) - non-production only');
      return {
        userId: 'anonymous',
        restaurantId: config.restaurant.defaultId,
      };
    }

    // Verify JWT with single configured secret (no fallbacks for security)
    const jwtSecret = config.supabase.jwtSecret;
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - WebSocket auth cannot proceed');
      return null;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (error) {
      logger.warn('WebSocket auth rejected: invalid token');
      return null;
    }

    return {
      userId: decoded.sub,
      restaurantId: decoded.restaurant_id || config.restaurant.defaultId,
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