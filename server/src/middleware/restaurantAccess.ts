import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Forbidden, Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';

const accessLogger = logger.child({ module: 'restaurant-access' });

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

    // First check if auth middleware already set req.restaurantId from JWT
    // This allows demo users and authenticated requests to skip header requirement
    const requestedRestaurantId =
      req.restaurantId ||
      (req.headers['x-restaurant-id'] as string);

    if (!requestedRestaurantId) {
      throw Forbidden('Restaurant ID is required (X-Restaurant-ID header or JWT)');
    }

    // For admin users, allow access to any restaurant
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      req.restaurantId = requestedRestaurantId;
      return next();
    }

    // For demo users (identified by demo: prefix in user ID), bypass DB check
    // Demo users don't exist in user_restaurants table but are scoped to a specific restaurant in their JWT
    const isDemoUser = req.user.id.startsWith('demo:');
    if (isDemoUser && req.user.restaurant_id === requestedRestaurantId) {
      req.restaurantId = requestedRestaurantId;
      req.restaurantRole = req.user.role || 'demo'; // Use their actual role
      return next();
    }

    // For non-admin users, verify they have access to this restaurant
    const { data: userRestaurant, error } = await supabase
      .from('user_restaurants')
      .select('restaurant_id, role')
      .eq('user_id', req.user.id)
      .eq('restaurant_id', requestedRestaurantId)
      .single();

    if (error || !userRestaurant) {
      accessLogger.warn('Restaurant access denied', {
        userId: req.user.id,
        requestedRestaurantId,
        error: error?.message
      });
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