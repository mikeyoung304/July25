/**
 * Development Fix for Restaurant Membership
 *
 * This file provides a temporary fix for the authentication issue where
 * staff users are blocked from creating orders due to missing user_restaurants
 * table entries.
 *
 * To apply this fix, replace the validateRestaurantAccess function in auth.ts
 * with this version, or add the development bypass logic.
 */

import { Request, Response, NextFunction } from 'express';
import { Forbidden, BadRequest, Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';
import { ROLE_SCOPES } from './rbac';
import { authService } from '../services/auth/AuthenticationService';

interface AuthenticatedRequest extends Request {
  user?: any;
  restaurantId?: string;
}

/**
 * Fixed version of validateRestaurantAccess that allows development bypass
 */
export async function validateRestaurantAccessFixed(
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
      // DEVELOPMENT FIX: Allow access without membership in development mode
      if (process.env.NODE_ENV === 'development' || process.env.BYPASS_RESTAURANT_MEMBERSHIP === 'true') {
        logger.warn('⚠️ Development mode: Bypassing restaurant membership check', {
          userId: req.user.id,
          restaurantId: req.restaurantId,
          userRole: req.user.role
        });

        // Use the user's existing role and generate scopes
        req.user.role = req.user.role || 'server';
        req.user.scopes = ROLE_SCOPES[req.user.role] || [];

        logger.info('✅ Development bypass applied', {
          userId: req.user.id,
          role: req.user.role,
          scopes: req.user.scopes
        });
      } else {
        // Production mode - strict enforcement
        logger.warn('Staff user lacks restaurant membership', {
          userId: req.user.id,
          restaurantId: req.restaurantId,
          tokenType: 'supabase'
        });
        return next(Forbidden('Restaurant access denied', 'RESTAURANT_ACCESS_DENIED'));
      }
    } else {
      // Update user's role and scopes with restaurant-specific data
      req.user.role = roleData.role;
      req.user.scopes = roleData.scopes;

      logger.debug('Staff restaurant access validated', {
        userId: req.user.id,
        restaurantId: req.restaurantId,
        role: roleData.role,
        tokenType: 'supabase'
      });
    }
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

/**
 * Alternative: Minimal patch to add to existing validateRestaurantAccess
 *
 * Add this code block after line 330 in auth.ts:
 */
export const DEVELOPMENT_BYPASS_PATCH = `
    if (!roleData) {
      // DEVELOPMENT FIX: Allow access without membership in development mode
      if (process.env.NODE_ENV === 'development' || process.env.BYPASS_RESTAURANT_MEMBERSHIP === 'true') {
        logger.warn('⚠️ Development mode: Bypassing restaurant membership check', {
          userId: req.user.id,
          restaurantId: req.restaurantId,
          userRole: req.user.role
        });

        // Use the user's existing role and generate scopes
        req.user.role = req.user.role || 'server';
        req.user.scopes = ROLE_SCOPES[req.user.role] || [];

        // Skip the rest of the validation
      } else {
        // Original error handling
        logger.warn('Staff user lacks restaurant membership', {
          userId: req.user.id,
          restaurantId: req.restaurantId,
          tokenType: 'supabase'
        });
        return next(Forbidden('Restaurant access denied', 'RESTAURANT_ACCESS_DENIED'));
      }
    } else {
      // Original success handling
      req.user.role = roleData.role;
      req.user.scopes = roleData.scopes;
    }
`;

/**
 * Instructions to apply the fix:
 *
 * Option 1: Database Fix (Recommended)
 * - Run: node scripts/fix-restaurant-membership.js
 *
 * Option 2: Development Bypass
 * - Add to .env: BYPASS_RESTAURANT_MEMBERSHIP=true
 * - Apply the patch above to auth.ts
 *
 * Option 3: Replace Function
 * - Import this function in auth.ts
 * - Replace validateRestaurantAccess with validateRestaurantAccessFixed
 */