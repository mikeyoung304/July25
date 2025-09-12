import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { getConfig } from '../config/environment';
import { Unauthorized, BadRequest } from './errorHandler';
import { logger } from '../utils/logger';
import { ROLE_SCOPES } from './rbac';
import { authService, NormalizedUser } from '../services/auth/AuthenticationService';

const config = getConfig();

export interface AuthenticatedRequest extends Request {
  user?: NormalizedUser;  // Now using the normalized user type
  restaurantId?: string;
}

// Verify JWT token using unified AuthenticationService
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    // Strict restaurant context extraction
    // Priority: header > query > body > token fallback (single-tenant only)
    const headerId = (() => {
      // Case-insensitive header lookup
      const headers = req.headers;
      for (const key in headers) {
        if (key.toLowerCase() === 'x-restaurant-id') {
          return headers[key] as string;
        }
      }
      return undefined;
    })();
    
    const qId = (req.query.restaurantId || req.query.restaurant_id) as string | undefined;
    const bId = req.body?.restaurantId || req.body?.restaurant_id;
    
    // Use AuthenticationService for unified token validation
    // This returns a NormalizedUser with canonical roles
    const user = await authService.validateToken(authHeader || '', undefined);
    
    // Token fallback ONLY for single-tenant tokens (kiosk/station/pin)
    const tokenFallback = user.tokenType !== 'supabase' ? user.restaurantId : undefined;
    
    // Resolved restaurant context
    const resolved = headerId || qId || bId || tokenFallback;
    
    // For write operations, enforce strict restaurant context
    const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    if (isWriteOperation) {
      // Staff tokens (supabase) MUST provide explicit context
      if (user.tokenType === 'supabase' && !headerId && !qId && !bId) {
        logger.warn('Missing restaurant context for staff write operation', {
          method: req.method,
          path: req.path,
          tokenType: user.tokenType,
          userId: user.id
        });
        return next(BadRequest('Restaurant context required', 'RESTAURANT_CONTEXT_MISSING'));
      }
      
      // All writes must have restaurant context
      if (!resolved) {
        logger.warn('No restaurant context available for write operation', {
          method: req.method,
          path: req.path,
          tokenType: user.tokenType
        });
        return next(BadRequest('Restaurant context required', 'RESTAURANT_CONTEXT_MISSING'));
      }
    }
    
    // Set user and restaurant context on request
    req.user = user;
    req.restaurantId = resolved || undefined;
    
    logger.debug('Authentication successful', {
      userId: user.id,
      role: user.role,
      tokenType: user.tokenType,
      restaurantId: req.restaurantId,
      contextSource: headerId ? 'header' : qId ? 'query' : bId ? 'body' : tokenFallback ? 'token' : 'none'
    });
    
    next();
  } catch (error) {
    next(error);
  }
}

// Legacy authenticate function for backward compatibility
// Will be removed after full migration
export async function authenticateLegacy(
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
      scopes: decoded.scope || ROLE_SCOPES[decoded.role] || [],  // Use role-based scopes if JWT doesn't have them
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

// Verify WebSocket authentication using unified AuthenticationService
export async function verifyWebSocketAuth(
  request: IncomingMessage
): Promise<{ userId: string; restaurantId?: string } | null> {
  try {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');
    const restaurantId = url.searchParams.get('restaurant_id') || undefined;

    if (!token) {
      // No token provided - authentication required
      logger.warn('WebSocket: No authentication token provided');
      return null;
    }

    // Use AuthenticationService for unified token validation
    try {
      const user = await authService.validateToken(`Bearer ${token}`, restaurantId);
      
      logger.info('WebSocket authenticated via AuthenticationService', {
        userId: user.id,
        role: user.role,
        restaurantId: user.restaurant_id
      });
      
      return {
        userId: user.id,
        restaurantId: user.restaurant_id
      };
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      return null;
    }
  } catch (error) {
    logger.error('WebSocket auth error:', error);
    return null;
  }
}

// Require specific role - thin wrapper that reads from normalized user
export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(Unauthorized('Authentication required'));
    }
    
    // Use AuthenticationService to check roles
    // The service handles role normalization internally
    if (authService.hasRole(req.user, roles)) {
      return next();
    }
    
    logger.warn('Role check failed', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRoles: roles
    });
    
    next(Unauthorized('Insufficient permissions'));
  };
}

// Note: requireScope functionality has been moved to requireScopes in rbac.ts
// Use: import { requireScopes, ApiScope } from '../middleware/rbac';

// Validate restaurant access middleware
export async function validateRestaurantAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Restaurant context must be set by authenticate() middleware
  if (!req.restaurantId) {
    logger.error('Restaurant context missing at validateRestaurantAccess', {
      method: req.method,
      path: req.path,
      userId: req.user?.id
    });
    return next(BadRequest('Restaurant context required', 'RESTAURANT_CONTEXT_MISSING'));
  }
  
  // Validate user has access to the restaurant
  if (!req.user) {
    return next(Unauthorized('Authentication required'));
  }
  
  // For staff tokens (supabase), verify membership via user_restaurants
  if (req.user.tokenType === 'supabase') {
    // Check user_restaurants table for membership
    const roleData = await authService.getUserRestaurantRole(req.user.id, req.restaurantId);
    
    if (!roleData) {
      logger.warn('Staff user lacks restaurant membership', {
        userId: req.user.id,
        restaurantId: req.restaurantId,
        tokenType: 'supabase'
      });
      return next(Unauthorized('Restaurant access denied', 'RESTAURANT_ACCESS_DENIED'));
    }
    
    // Update user's role and scopes with restaurant-specific data
    req.user.role = roleData.role;
    req.user.scopes = roleData.scopes;
    
    logger.debug('Staff restaurant access validated', {
      userId: req.user.id,
      restaurantId: req.restaurantId,
      role: roleData.role,
      tokenType: 'supabase'
    });
  } else {
    // For single-tenant tokens (kiosk/station/pin), verify matches token-bound restaurant
    if (req.user.restaurantId && req.user.restaurantId !== req.restaurantId) {
      logger.warn('Restaurant ID mismatch for single-tenant token', {
        userId: req.user.id,
        tokenRestaurant: req.user.restaurantId,
        requestRestaurant: req.restaurantId,
        tokenType: req.user.tokenType
      });
      return next(Unauthorized('Restaurant access denied'));
    }
  }
  
  next();
}