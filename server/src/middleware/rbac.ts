import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Forbidden, Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';
import { DatabaseRole, ApiScope, ROLE_SCOPES } from '@rebuild/shared/types/auth';

const rbacLogger = logger.child({ module: 'rbac' });

// Re-export from shared types for backward compatibility
export { ApiScope, DatabaseRole, ROLE_SCOPES } from '@rebuild/shared/types/auth';

/**
 * Get user's role for a specific restaurant
 */
async function getUserRestaurantRole(
  userId: string,
  restaurantId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role;
  } catch (error) {
    rbacLogger.error('Failed to get user restaurant role:', error);
    return null;
  }
}

/**
 * Get scopes for a given role
 */
function getScopesForRole(role: string): ApiScope[] {
  // Normalize the role to DatabaseRole enum value
  const normalizedRole = Object.values(DatabaseRole).find(
    r => r === role.toLowerCase()
  );
  
  if (!normalizedRole) {
    rbacLogger.warn('Unknown role requested', { role });
    return [];
  }
  
  return ROLE_SCOPES[normalizedRole] || [];
}

/**
 * Check if user has required scope
 */
export function hasScope(
  userScopes: string[],
  requiredScope: ApiScope
): boolean {
  return userScopes.includes(requiredScope);
}

/**
 * RBAC Middleware - Enforce scope-based access control
 */
export function requireScopes(...requiredScopes: ApiScope[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        return next(Unauthorized('Authentication required'));
      }

      // Get restaurant context
      const restaurantId = req.restaurantId;
      if (!restaurantId) {
        return next(Forbidden('Restaurant context required'));
      }

      // Owner role has all permissions
      if (req.user.role === DatabaseRole.OWNER) {
        rbacLogger.debug('Owner user, granting all scopes', {
          userId: req.user.id,
          role: req.user.role
        });
        return next();
      }

      // Customer role uses predefined scopes
      if (req.user.role === DatabaseRole.CUSTOMER) {
        const customerScopes = getScopesForRole(DatabaseRole.CUSTOMER);
        const hasRequiredScope = requiredScopes.some(scope => 
          customerScopes.includes(scope)
        );
        
        if (!hasRequiredScope) {
          rbacLogger.warn('Customer lacks required scope', {
            userId: req.user.id,
            requiredScopes,
            userScopes: customerScopes
          });
          return next(Forbidden(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`));
        }
        
        return next();
      }

      // Get user's role for this restaurant
      const userRole = await getUserRestaurantRole(req.user.id, restaurantId);
      
      if (!userRole) {
        rbacLogger.warn('User has no role in restaurant', {
          userId: req.user.id,
          restaurantId
        });
        return next(Forbidden('No access to this restaurant'));
      }

      // Get scopes for user's role
      const userScopes = getScopesForRole(userRole);
      
      // Check if user has at least one required scope
      const hasRequiredScope = requiredScopes.some(scope => 
        userScopes.includes(scope)
      );
      
      if (!hasRequiredScope) {
        rbacLogger.warn('User lacks required scope', {
          userId: req.user.id,
          userRole,
          requiredScopes,
          userScopes
        });
        return next(Forbidden(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`));
      }

      // Store user's role and scopes in request for downstream use
      req.user.role = userRole;
      req.user.scopes = userScopes;

      rbacLogger.debug('RBAC check passed', {
        userId: req.user.id,
        userRole,
        requiredScopes,
        userScopes
      });

      next();
    } catch (error) {
      rbacLogger.error('RBAC middleware error:', error);
      next(error);
    }
  };
}

/**
 * Helper middleware to require any authenticated user
 * without specific scope requirements
 */
export function requireAuth() {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      return next(Unauthorized('Authentication required'));
    }
    next();
  };
}

/**
 * Helper to check if user has management role
 */
export function requireManagement() {
  return requireScopes(ApiScope.STAFF_MANAGE);
}

/**
 * Helper to check if user can process payments
 */
export function requirePaymentAccess() {
  return requireScopes(ApiScope.PAYMENTS_PROCESS);
}

/**
 * Log access attempt for audit trail
 */
export async function logAccessAttempt(
  req: AuthenticatedRequest,
  allowed: boolean,
  scope?: ApiScope
): Promise<void> {
  try {
    const { error } = await supabase
      .from('auth_logs')
      .insert({
        user_id: req.user?.id,
        restaurant_id: req.restaurantId,
        event_type: allowed ? 'access_granted' : 'access_denied',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        metadata: {
          path: req.path,
          method: req.method,
          scope: scope,
          allowed
        }
      });

    if (error) {
      rbacLogger.error('Failed to log access attempt:', error);
    }
  } catch (error) {
    rbacLogger.error('Error logging access attempt:', error);
  }
}

/**
 * Middleware to log all API access attempts
 */
export function auditApiAccess() {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Log after response is sent
    res.on('finish', () => {
      const allowed = res.statusCode < 400;
      logAccessAttempt(req, allowed).catch(err => 
        rbacLogger.error('Audit logging failed:', err)
      );
    });
    
    next();
  };
}