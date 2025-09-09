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
    
    // NEVER accept test tokens - authentication is required
    if (token === 'test-token') {
      logger.error('⛔ Test token rejected - authentication required');
      throw Unauthorized('Test tokens are not allowed. Please use proper authentication.');
    }

    // Decode token to check issuer and algorithm
    let decoded: any;
    try {
      // First decode the token without verification to check the issuer
      const decodedToken = jwt.decode(token, { complete: true }) as any;
      
      if (!decodedToken) {
        throw new Error('Unable to decode token');
      }

      const payload = decodedToken.payload;
      const algorithm = decodedToken.header?.alg;
      const issuer = payload?.iss;
      
      logger.info('Token analysis:', { 
        algorithm, 
        issuer,
        role: payload?.role,
        sub: payload?.sub?.substring(0, 20) // Log first 20 chars of subject
      });

      // Identify token type by issuer, not algorithm
      // Supabase tokens have issuer like "https://[project-ref].supabase.co/auth/v1"
      if (issuer?.includes('supabase.co') || issuer === 'supabase') {
        // This is a Supabase token - use the anon key as the secret
        // Supabase signs all tokens (anon, service, user) with the same secret
        // The anon key itself is a JWT signed with this secret
        const supabaseSecret = config.supabase.jwtSecret || config.supabase.anonKey;
        
        if (!supabaseSecret) {
          logger.error('Supabase secret not configured');
          throw new Error('Supabase authentication not configured');
        }
        
        try {
          // For now, try both secrets - the configured JWT secret and the anon key
          // Supabase might be using the anon key itself as the signing secret
          if (config.supabase.jwtSecret) {
            try {
              decoded = jwt.verify(token, config.supabase.jwtSecret) as any;
              logger.info('Supabase token verified with JWT secret');
            } catch (e) {
              // JWT verification failed - do not accept unverified tokens
              logger.error('Supabase JWT secret verification failed:', e);
              throw Unauthorized('Token verification failed');
            }
          } else {
            // No JWT secret configured - cannot verify tokens
            logger.error('SUPABASE_JWT_SECRET not configured - cannot verify tokens');
            throw Unauthorized('Token verification not configured');
          }
        } catch (verifyError) {
          logger.error('Supabase token verification failed:', verifyError);
          throw verifyError;
        }
      } else if (payload?.sub?.startsWith('customer:') || payload?.sub?.startsWith('demo:')) {
        // This is a kiosk/demo token - verify with KIOSK_JWT_SECRET
        const kioskSecret = process.env['KIOSK_JWT_SECRET'];
        if (!kioskSecret) {
          logger.error('KIOSK_JWT_SECRET not configured for kiosk token');
          throw new Error('Kiosk authentication not configured');
        }
        decoded = jwt.verify(token, kioskSecret) as any;
        logger.info('Kiosk/Demo token verified successfully');
      } else {
        // Unknown token type - log details for debugging
        logger.error('Unknown token type', { issuer, algorithm, role: payload?.role });
        throw new Error('Unknown token type');
      }
    } catch (error) {
      logger.error('Token verification failed:', error instanceof Error ? error.message : String(error));
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
      // No token provided - authentication required
      logger.warn('WebSocket: No authentication token provided');
      return null;
    }

    // NEVER accept test tokens - authentication is required
    if (token === 'test-token') {
      logger.error('⛔ WebSocket: Test token rejected - authentication required');
      return null;
    }

    // Decode token to check issuer and algorithm
    let decoded: any;
    try {
      // First decode the token without verification to check the issuer
      const decodedToken = jwt.decode(token, { complete: true }) as any;
      
      if (!decodedToken) {
        logger.error('Unable to decode WebSocket token');
        return null;
      }

      const payload = decodedToken.payload;
      const algorithm = decodedToken.header?.alg;
      const issuer = payload?.iss;
      
      logger.info('WebSocket token analysis:', { 
        algorithm, 
        issuer,
        role: payload?.role,
        sub: payload?.sub?.substring(0, 20) // Log first 20 chars of subject
      });

      // Identify token type by issuer, not algorithm
      // Supabase tokens have issuer like "https://[project-ref].supabase.co/auth/v1"
      if (issuer?.includes('supabase.co') || issuer === 'supabase') {
        // This is a Supabase token
        const supabaseSecret = config.supabase.jwtSecret || config.supabase.anonKey;
        
        if (!supabaseSecret) {
          logger.error('Supabase secret not configured for WebSocket');
          return null;
        }
        
        try {
          // For WebSocket, we'll be more lenient during development
          if (config.supabase.jwtSecret) {
            try {
              decoded = jwt.verify(token, config.supabase.jwtSecret) as any;
              logger.info('Supabase token verified for WebSocket with JWT secret');
            } catch (e) {
              // Never accept unverified tokens, even in development
              logger.error('WebSocket: Supabase token verification failed');
              return null;
            }
          } else {
            // No JWT secret configured - cannot verify tokens
            logger.error('WebSocket: SUPABASE_JWT_SECRET not configured - cannot verify tokens');
            return null;
          }
        } catch (verifyError) {
          logger.error('WebSocket Supabase token verification failed:', verifyError);
          return null;
        }
      } else if (payload?.sub?.startsWith('customer:') || payload?.sub?.startsWith('demo:')) {
        // This is a kiosk/demo token - verify with KIOSK_JWT_SECRET
        const kioskSecret = process.env['KIOSK_JWT_SECRET'];
        if (!kioskSecret) {
          logger.error('KIOSK_JWT_SECRET not configured for WebSocket kiosk token');
          return null;
        }
        try {
          decoded = jwt.verify(token, kioskSecret) as any;
          logger.info('Kiosk/Demo token verified for WebSocket connection', { 
            userId: decoded.sub,
            restaurantId: decoded.restaurant_id 
          });
        } catch (kioskError) {
          logger.error('WebSocket kiosk token verification failed:', kioskError);
          return null;
        }
      } else {
        // Unknown token type
        logger.error('Unknown WebSocket token type', { issuer, algorithm, role: payload?.role });
        return null;
      }
    } catch (decodeError) {
      logger.error('Failed to decode WebSocket JWT token:', decodeError);
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