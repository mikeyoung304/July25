import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Forbidden, Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { AuditService } from '../services/audit.service';

const accessLogger = logger.child({ module: 'restaurant-access' });

// Database query timeout in milliseconds
const DB_QUERY_TIMEOUT_MS = 5000;

/**
 * Validates that the authenticated user has access to the requested restaurant
 * This prevents users from accessing data from other restaurants by spoofing the restaurant ID
 */
export async function validateRestaurantAccess(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      throw Unauthorized('Authentication required');
    }

    // SECURITY FIX: Get restaurant ID from JWT token only (set by auth middleware)
    // Previously trusted X-Restaurant-ID header which allowed authenticated users
    // to access other restaurants' data by spoofing the header (CL-AUTH-002)
    const requestedRestaurantId = req.restaurantId;

    if (!requestedRestaurantId) {
      throw Forbidden('Restaurant ID is required in JWT token');
    }

    // For admin users, allow access to any restaurant
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      req.restaurantId = requestedRestaurantId;
      return next();
    }

    // For demo users (identified by demo: prefix in user ID), bypass DB check
    // Demo users don't exist in user_restaurants table but are scoped to a specific restaurant in their JWT
    // SECURITY FIX: Demo bypass must be explicitly enabled via DEMO_MODE environment variable
    const isDemoUser = req.user.id.startsWith('demo:');
    const isDemoModeEnabled = process.env['DEMO_MODE'] === 'enabled';

    if (isDemoUser) {
      if (!isDemoModeEnabled) {
        accessLogger.warn('Demo bypass attempted outside demo mode', {
          userId: req.user.id,
          restaurantId: requestedRestaurantId
        });
        throw Forbidden('Demo mode not enabled', 'DEMO_MODE_DISABLED');
      }

      if (req.user.restaurant_id !== requestedRestaurantId) {
        accessLogger.warn('Demo user cross-tenant access attempt', {
          userId: req.user.id,
          userRestaurant: req.user.restaurant_id,
          requestedRestaurant: requestedRestaurantId
        });
        throw Forbidden('Access denied', 'DEMO_CROSS_TENANT');
      }

      accessLogger.info('Demo access granted', {
        userId: req.user.id,
        restaurantId: requestedRestaurantId
      });
      req.restaurantId = requestedRestaurantId;
      req.restaurantRole = req.user.role || 'demo';
      return next();
    }

    // For non-admin users, verify they have access to this restaurant
    // CRITICAL: Wrap database query with timeout to prevent login hangs
    const queryPromise = supabase
      .from('user_restaurants')
      .select('restaurant_id, role')
      .eq('user_id', req.user.id)
      .eq('restaurant_id', requestedRestaurantId)
      .single();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Database query timeout - user_restaurants lookup exceeded 5s')),
        DB_QUERY_TIMEOUT_MS
      )
    );

    const { data: userRestaurant, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error || !userRestaurant) {
      accessLogger.warn('Restaurant access denied', {
        userId: req.user.id,
        requestedRestaurantId,
        error: error?.message
      });

      // Log cross-tenant access attempt for security monitoring
      // Note: This can only happen if user's JWT restaurant_id != their actual access
      // which indicates either a misconfigured token or security issue
      if (req.user.restaurant_id && req.user.restaurant_id !== requestedRestaurantId) {
        AuditService.logCrossTenantAttempt(
          req.user.id,
          req.user.restaurant_id,
          requestedRestaurantId,
          req.ip,
          req.get('user-agent')
        ).catch(() => {}); // Fire and forget
      }

      throw Forbidden('Access denied to this restaurant', 'RESTAURANT_ACCESS_DENIED');
    }

    // Set the validated restaurant ID and user's role for this restaurant
    // ONLY set this after validation passes - this is the security boundary
    req.restaurantId = requestedRestaurantId;
    req.restaurantRole = userRestaurant.role;

    accessLogger.debug('Restaurant access validated', {
      userId: req.user.id,
      restaurantId: req.restaurantId,
      role: req.restaurantRole
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Validates that the user has a specific role within the restaurant
 * Must be used after validateRestaurantAccess
 */
export function requireRestaurantRole(roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.restaurantRole || !roles.includes(req.restaurantRole)) {
      accessLogger.warn('Restaurant role requirement not met', {
        userId: req.user?.id,
        restaurantId: req.restaurantId,
        requiredRoles: roles,
        userRole: req.restaurantRole
      });
      next(Forbidden('Insufficient permissions for this restaurant', 'RESTAURANT_ROLE_REQUIRED'));
    } else {
      next();
    }
  };
}

// Extend AuthenticatedRequest interface
declare module './auth' {
  export interface AuthenticatedRequest {
    restaurantRole?: string;
  }
}