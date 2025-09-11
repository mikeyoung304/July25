/**
 * Canonical database roles - the only roles allowed in the system
 * These map directly to the database user_restaurants.role column
 */
export enum DatabaseRole {
  OWNER = 'owner',
  MANAGER = 'manager',
  SERVER = 'server',
  CASHIER = 'cashier',
  KITCHEN = 'kitchen',
  EXPO = 'expo',
  CUSTOMER = 'customer'
}

/**
 * API Scopes - granular permissions for API operations
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
 * Token types we support
 */
export type TokenType = 'supabase' | 'station' | 'pin' | 'kiosk';

/**
 * Normalized user representation after authentication
 * This is the single source of truth for user identity
 */
export interface NormalizedUser {
  id: string;
  email?: string;
  role: DatabaseRole;
  scopes: ApiScope[];
  restaurantId?: string;
  tokenType: TokenType;
}

/**
 * Role to scope mappings
 * Defines what each role can do in the system
 */
export const ROLE_SCOPES: Record<DatabaseRole, ApiScope[]> = {
  [DatabaseRole.OWNER]: [
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
  
  [DatabaseRole.MANAGER]: [
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
  
  [DatabaseRole.SERVER]: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_UPDATE,
    ApiScope.ORDERS_STATUS,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_READ,
    ApiScope.TABLES_MANAGE
  ],
  
  [DatabaseRole.CASHIER]: [
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.PAYMENTS_READ
  ],
  
  [DatabaseRole.KITCHEN]: [
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_STATUS
  ],
  
  [DatabaseRole.EXPO]: [
    ApiScope.ORDERS_READ,
    ApiScope.ORDERS_STATUS
  ],
  
  [DatabaseRole.CUSTOMER]: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.MENU_MANAGE // Read-only for menu viewing
  ]
};

/**
 * Helper to check if a role has a specific scope
 */
export function roleHasScope(role: DatabaseRole, scope: ApiScope): boolean {
  return ROLE_SCOPES[role]?.includes(scope) || false;
}

/**
 * Helper to get all scopes for a role
 */
export function getScopesForRole(role: DatabaseRole): ApiScope[] {
  return ROLE_SCOPES[role] || [];
}