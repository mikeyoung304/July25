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
    
    // For local development only, allow a test token
    // NEVER allow test tokens in production, staging, or any deployed environment
    const isDevelopment = config.nodeEnv === 'development';
    const isLocalhost = !process.env.RENDER && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;
    const isTestToken = token === 'test-token';
    
    if (isDevelopment && isLocalhost && isTestToken) {
      logger.warn('Using test token in local development only');
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

    // For local development only, allow test token
    // NEVER allow test tokens in production, staging, or any deployed environment
    const isDevelopment = config.nodeEnv === 'development';
    const isLocalhost = !process.env.RENDER && !process.env.VERCEL && !process.env.RAILWAY_ENVIRONMENT;
    const isTestToken = token === 'test-token';
    
    if (isDevelopment && isLocalhost && isTestToken) {
      logger.warn('Using test token in WebSocket (local development only)');
      return {
        userId: 'test-user-id',
        restaurantId: config.restaurant.defaultId,
      };
    }

    // Verify JWT with proper signature validation
    let decoded: any;
    
    // First, try to decode without verification to check token type
    try {
      const unverified = jwt.decode(token) as any;
      
      // Check if this is a demo/kiosk token (sub starts with 'demo:')
      if (unverified?.sub?.startsWith('demo:')) {
        // This is a demo token - verify with KIOSK_JWT_SECRET
        const kioskSecret = process.env.KIOSK_JWT_SECRET;
        if (!kioskSecret) {
          logger.error('KIOSK_JWT_SECRET not configured for demo token verification');
          return null;
        }
        
        try {
          decoded = jwt.verify(token, kioskSecret) as any;
          logger.info('Demo token verified for WebSocket connection', { 
            userId: decoded.sub,
            restaurantId: decoded.restaurant_id 
          });
        } catch (kioskError) {
          logger.error('Demo token verification failed:', kioskError);
          return null;
        }
      } else {
        // Regular Supabase token - verify with Supabase secret
        const secret = config.supabase.jwtSecret || config.supabase.anonKey;
        try {
          decoded = jwt.verify(token, secret) as any;
        } catch (supabaseError) {
          logger.error('Supabase JWT verification failed:', supabaseError);
          return null;
        }
      }
    } catch (decodeError) {
      logger.error('Failed to decode JWT token:', decodeError);
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