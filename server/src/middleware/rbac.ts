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
  MENU_READ = 'menu:read',     // View menu items and categories
  MENU_MANAGE = 'menu:manage', // Create/update/delete/86 items (owner/manager only)

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
 * WHEN UPDATING SCOPES (CRITICAL PROCEDURE):
 *
 * Step 1: Add new scope to ApiScope enum (above, line 12-41)
 *   Example: REPORTS_EXPORT = 'reports:export'
 *
 * Step 2: Add scope to role(s) in this ROLE_SCOPES constant
 *   Example: Add ApiScope.REPORTS_EXPORT to manager role array
 *
 * Step 3: Create database migration to sync (see template below)
 *   File: supabase/migrations/YYYYMMDD_HHmmss_add_scope_name.sql
 *   Reference: supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql
 *
 * Step 4: Add scope to api_scopes table FIRST (prevents foreign key errors)
 *   INSERT INTO api_scopes (scope, description) VALUES
 *     ('reports:export', 'Export reports to CSV/PDF')
 *   ON CONFLICT (scope) DO NOTHING;
 *
 * Step 5: Add scope to role_scopes table
 *   INSERT INTO role_scopes (role, scope) VALUES
 *     ('manager', 'reports:export')
 *   ON CONFLICT (role, scope) DO NOTHING;
 *
 * Step 6: Apply migration to database
 *   supabase db push --linked
 *
 * Step 7: Verify sync by querying database
 *   SELECT role, scope FROM role_scopes WHERE role = 'manager' ORDER BY scope;
 *
 * Step 8: Test API endpoint with actual requests
 *   curl -H "Authorization: Bearer $TOKEN" \
 *        -H "X-Restaurant-ID: $RESTAURANT_ID" \
 *        https://api.yourdomain.com/api/v1/reports/export
 *
 * ⚠️ NAMING CONVENTION (CRITICAL):
 * - ALWAYS use colons: 'orders:create', 'payments:process'
 * - NEVER use dots: 'orders.write', 'payments.process'
 * - Dots are legacy format and will cause foreign key violations
 * - Pattern: '<resource>:<action>' where action is create|read|update|delete|status|process|etc
 *
 * ⚠️ COMMON PITFALLS:
 * 1. Adding to ROLE_SCOPES but forgetting database migration → API works, client fails
 * 2. Adding to database but not ROLE_SCOPES → Client works, API returns 403
 * 3. Using wrong naming convention (dots vs colons) → Foreign key violations
 * 4. Forgetting to add to api_scopes table first → INSERT into role_scopes fails
 * 5. Not testing with non-admin role → Permissions look fine until production
 *
 * REFERENCE MIGRATION: supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql
 * RELATED DOCS: docs/AUTHENTICATION_ARCHITECTURE.md (line 334-368, 422-626)
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
    ApiScope.MENU_READ,
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
    ApiScope.MENU_READ,
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
    ApiScope.MENU_READ
    // TABLES_MANAGE removed - servers should only update table status during service, not create/delete tables
  ],
  
  cashier: [
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_READ,
    ApiScope.MENU_READ
  ],
  
  kitchen: [
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_STATUS,
    ApiScope.MENU_READ
  ],
  
  expo: [
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_STATUS,
    ApiScope.MENU_READ
  ],
  
  // Kiosk demo role for self-service (friends & family online orders)
  // DEPRECATED: Use 'customer' role instead (backwards compat via AUTH_ACCEPT_KIOSK_DEMO_ALIAS)
  kiosk_demo: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS, // Required for completing demo orders
    ApiScope.MENU_READ // View menu items (no write access)
  ],

  // Customer role for public self-service orders (online, kiosk)
  customer: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.MENU_READ // View menu items (no write access)
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
 * Get scopes for a given role as string array (for JWT payload)
 */
export function getRoleScopesArray(role: string): string[] {
  return getScopesForRole(role).map(scope => scope as string);
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

      // For demo users (identified by user ID prefix), use JWT role-based scopes (no database lookup)
      // Demo user IDs have format: demo:role:randomId (e.g., demo:server:abc123)
      // This allows ephemeral demo sessions without database records
      if (req.user.id?.startsWith('demo:')) {
        const roleScopes = getScopesForRole(req.user.role!);
        const hasRequiredScope = requiredScopes.some(scope =>
          roleScopes.includes(scope)
        );

        if (!hasRequiredScope) {
          rbacLogger.warn('Demo user lacks required scope', {
            userId: req.user.id,
            role: req.user.role,
            requiredScopes,
            userScopes: roleScopes
          });
          return next(Forbidden(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`));
        }

        rbacLogger.debug('Demo user authorized via JWT role', {
          userId: req.user.id,
          role: req.user.role,
          scopes: roleScopes
        });

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