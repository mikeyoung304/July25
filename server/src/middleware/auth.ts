import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { getConfig } from '../config/environment';
import { Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';
import { AuditService } from '../services/audit.service';

// Note: getConfig() is called inside each function instead of at module level
// This allows tests to modify process.env and have the changes take effect

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
    const config = getConfig(); // Get fresh config (important for tests)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Unauthorized('No token provided');
    }

    const token = authHeader.substring(7);

    // STRICT_AUTH mode - no bypasses allowed
    const strictAuth = process.env['STRICT_AUTH'] === 'true';

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

    // STRICT_AUTH enforcement: Reject tokens without restaurant_id
    if (strictAuth && !decoded.restaurant_id) {
      logger.error('⛔ STRICT_AUTH enabled - token missing restaurant_id rejected', {
        userId: decoded.sub,
        path: req.path,
        role: userRole
      });
      throw Unauthorized('Token missing restaurant context in strict auth mode');
    }

    // Set user info
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: userRole,
      scopes: decoded.scope || [],
      restaurant_id: decoded.restaurant_id, // Add restaurant_id from token
    };

    // Set req.restaurantId from JWT for menu/public endpoints
    // restaurantAccess middleware will validate multi-tenancy permissions for protected routes
    // SECURITY FIX: Always use restaurant_id from token only - no header fallback
    // Header-based restaurant selection was a security vulnerability (CL-AUTH-002)
    // allowing authenticated users to access other restaurants' data
    req.restaurantId = decoded.restaurant_id;

    // Log successful authentication (async, non-blocking)
    if (decoded.restaurant_id) {
      AuditService.logAuthSuccess(
        decoded.sub,
        decoded.restaurant_id,
        undefined,
        req.ip,
        req.get('user-agent')
      ).catch(() => {}); // Fire and forget - don't block request
    }

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
    // Per ADR-009, fail-fast on misconfiguration (consistent with authenticate())
    // Configuration errors should fail loudly rather than silently degrade security
    const config = getConfig();
    const jwtSecret = config.supabase.jwtSecret;
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - authentication cannot proceed');
      throw new Error('Server authentication not configured');
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - extract restaurant ID from header for unauthenticated requests
      // This allows public endpoints (like menu browsing) to work without authentication
      const restaurantId = req.headers['x-restaurant-id'] as string;

      // Validate restaurant ID is a proper value (not string literals "undefined" or "null")
      if (restaurantId && restaurantId !== 'undefined' && restaurantId !== 'null') {
        req.restaurantId = restaurantId;
        logger.debug('Unauthenticated request with restaurant ID from header', {
          restaurantId,
          path: req.path
        });
      } else if (restaurantId === 'undefined' || restaurantId === 'null') {
        logger.warn('Invalid restaurant ID string received from client', {
          value: restaurantId,
          path: req.path
        });
        // Don't set req.restaurantId - leave it undefined so route handlers can detect missing ID
      }
      return next();
    }

    // If token exists, validate it
    return authenticate(req, _res, next);
  } catch (error) {
    // Log the error but don't fail for optional auth
    // SECURITY FIX: Do NOT fall back to header for restaurant ID
    // Unauthenticated users must use validated public endpoints with explicit restaurant lookup
    logger.warn('Optional auth failed - no restaurant context set:', { error: (error as Error).message, path: req.path });
    next();
  }
}

// Verify WebSocket authentication
export async function verifyWebSocketAuth(
  request: IncomingMessage
): Promise<{ userId: string; restaurantId?: string } | null> {
  try {
    const config = getConfig(); // Get fresh config (important for tests)
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      // Always reject connections without token (all environments)
      // Security fix P0.9: Removed anonymous connection bypass for dev/test
      // Tests must provide valid JWT tokens via ?token=xxx query parameter
      logger.warn('WebSocket auth rejected: no token provided', {
        environment: config.nodeEnv,
        path: request.url
      });
      return null;
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
      // Distinguish between expired vs invalid vs malformed tokens for better observability
      // This matches the pattern used in authenticate() function (lines 54-61)
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('WebSocket auth rejected: token expired', {
          expiredAt: error.expiredAt,
          path: request.url
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('WebSocket auth rejected: invalid token', {
          message: error.message,
          path: request.url
        });
      } else {
        logger.error('WebSocket auth rejected: unexpected error', {
          error,
          path: request.url
        });
      }
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
// SECURITY FIX: This function now prioritizes restaurant_id from authenticated user JWT
// Only falls back to defaultId for public endpoints (e.g., menu browsing)
export function validateRestaurantAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const config = getConfig(); // Get fresh config (important for tests)

  // Priority: 1) JWT restaurant_id (set by authenticate), 2) defaultId for public endpoints only
  // SECURITY: Never trust X-Restaurant-ID header for authenticated users
  const restaurantId = req.user?.restaurant_id || req.restaurantId || config.restaurant.defaultId;

  if (!restaurantId) {
    return next(Unauthorized('Restaurant ID is required'));
  }

  req.restaurantId = restaurantId;
  next();
}