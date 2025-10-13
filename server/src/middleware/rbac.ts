import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { Forbidden, Unauthorized } from './errorHandler';
import { logger } from '../utils/logger';
import { supabase } from '../config/database';

const rbacLogger = logger.child({ module: 'rbac' });

/**
 * API Scope Definitions
 */
export enum ApiScope {
  // Order Management
  ORDERS_CREATE = 'orders:create',
  ORDERS_READ = 'orders:read',
  ORDERS_UPDATE = 'orders:update',
  ORDERS_DELETE = 'orders:delete',
  ORDERS_STATUS = 'orders:status',
  
  // Payment Processing
  PAYMENTS_PROCESS = 'payments:process',
  PAYMENTS_REFUND = 'payments:refund',
  PAYMENTS_READ = 'payments:read',
  
  // Reporting & Analytics
  REPORTS_VIEW = 'reports:view',
  REPORTS_EXPORT = 'reports:export',
  
  // Staff Management
  STAFF_MANAGE = 'staff:manage',
  STAFF_SCHEDULE = 'staff:schedule',
  
  // System Administration
  SYSTEM_CONFIG = 'system:config',
  
  // Menu Management
  MENU_MANAGE = 'menu:manage',
  
  // Table Management
  TABLES_MANAGE = 'tables:manage'
}

/**
 * Role to Scope Mappings
 * Define what each role can do
 *
 * ⚠️ IMPORTANT: DUAL-SOURCE ARCHITECTURE
 * These scopes MUST match the database role_scopes table in supabase/migrations/20250130_auth_tables.sql
 *
 * WHY TWO SOURCES?
 * - Database: Used for client-side authorization (queried during login)
 * - This constant: Used for server-side API protection (performance - no DB query per request)
 *
 * WHEN UPDATING SCOPES:
 * 1. Update this constant
 * 2. Update the database migration
 * 3. Run migration in Supabase
 * 4. Verify sync with: npm test -- rbac.test (if test exists)
 */
const ROLE_SCOPES: Record<string, ApiScope[]> = {
  owner: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_UPDATE,
    ApiScope.ORDERS_DELETE,
    ApiScope.ORDERS_STATUS,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_REFUND,
    ApiScope.PAYMENTS_READ,
    ApiScope.REPORTS_VIEW,
    ApiScope.REPORTS_EXPORT,
    ApiScope.STAFF_MANAGE,
    ApiScope.STAFF_SCHEDULE,
    ApiScope.SYSTEM_CONFIG,
    ApiScope.MENU_MANAGE,
    ApiScope.TABLES_MANAGE
  ],
  
  manager: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_UPDATE,
    ApiScope.ORDERS_DELETE,
    ApiScope.ORDERS_STATUS,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_REFUND,
    ApiScope.PAYMENTS_READ,
    ApiScope.REPORTS_VIEW,
    ApiScope.REPORTS_EXPORT,
    ApiScope.STAFF_MANAGE,
    ApiScope.STAFF_SCHEDULE,
    ApiScope.MENU_MANAGE,
    ApiScope.TABLES_MANAGE
  ],
  
  server: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_UPDATE,
    ApiScope.ORDERS_STATUS,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_READ,
    ApiScope.TABLES_MANAGE
  ],
  
  cashier: [
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_READ
  ],
  
  kitchen: [
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_STATUS
  ],
  
  expo: [
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_STATUS
  ],
  
  // Kiosk demo role for self-service (friends & family online orders)
  kiosk_demo: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS, // Required for completing demo orders
    ApiScope.MENU_MANAGE // Read-only for menu viewing
  ]
};

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
  return ROLE_SCOPES[role] || [];
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

      // For admin/super_admin, grant all scopes
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        rbacLogger.debug('Admin user, granting all scopes', {
          userId: req.user.id,
          role: req.user.role
        });
        return next();
      }

      // For kiosk_demo users, use predefined scopes
      if (req.user.role === 'kiosk_demo') {
        const kioskScopes = getScopesForRole('kiosk_demo');
        const hasRequiredScope = requiredScopes.some(scope => 
          kioskScopes.includes(scope)
        );
        
        if (!hasRequiredScope) {
          rbacLogger.warn('Kiosk user lacks required scope', {
            userId: req.user.id,
            requiredScopes,
            userScopes: kioskScopes
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