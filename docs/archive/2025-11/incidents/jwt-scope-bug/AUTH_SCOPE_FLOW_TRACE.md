# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../../README.md)
> Category: JWT Scope Bug Investigation

---

# Authentication Middleware Scope Population Flow - Complete Trace

## Overview
This document traces how user scopes are populated as requests flow through the authentication middleware in the Restaurant OS application. The flow shows three different authentication paths and how each determines and assigns scopes.

---

## 1. REQUEST FLOW ARCHITECTURE

### Three Authentication Paths:
1. **Email/Password Login** → Supabase → Database scopes
2. **PIN Authentication** → Staff users → Database scopes  
3. **JWT Token Verification** → Middleware → JWT claims or DATABASE lookup
4. **Station Tokens** → Kitchen/Expo displays → Station type → role mapping

---

## 2. PATH 1: EMAIL/PASSWORD LOGIN (managers/owners)

### File: `/server/src/routes/auth.routes.ts` (lines 22-114)

```typescript
// POST /api/v1/auth/login
router.post('/login',
  authRateLimiters.checkSuspicious,
  authRateLimiters.login,
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    });

    // 2. Query database for user's restaurant role
    const { data: userRole, error: _roleError } = await supabase
      .from('user_restaurants')
      .select('role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', restaurantId)
      .single();

    // 3. FETCH SCOPES FROM DATABASE (role_scopes table)
    // This is WHERE scopes come from in login flow
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')  // ✅ column name is 'scope' not 'scope_name'
      .eq('role', userRole.role);

    const scopes = scopesData?.map(s => s.scope) || [];  // ✅ Extract scope property

    // 4. Return to client
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: userRole.role,
        scopes  // ✅ Scopes from database
      },
      session: {
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token,
        expires_in: authData.session?.expires_in
      },
      restaurantId
    });
  }
);
```

**SCOPE SOURCE**: Database `role_scopes` table queried at login time
**FLOW**: User credentials → Supabase auth → user_restaurants lookup → role_scopes query → client receives scopes

---

## 3. PATH 2: PIN AUTHENTICATION (servers/cashiers)

### File: `/server/src/routes/auth.routes.ts` (lines 120-191)

```typescript
// POST /api/v1/auth/pin-login
router.post('/pin-login', 
  authRateLimiters.checkSuspicious,
  authRateLimiters.pin,
  async (req: Request, res: Response, next: NextFunction) => {
    // 1. Validate PIN
    const result = await validatePin(pin, restaurantId);

    // 2. Generate JWT token with role from PIN validation
    const payload = {
      sub: result.userId,
      email: result.userEmail,
      role: result.role,  // ✅ Role comes from validatePin
      restaurant_id: restaurantId,
      auth_method: 'pin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) // 12 hours
    };
    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    // 3. FETCH SCOPES FROM DATABASE (role_scopes table)
    // Same as login flow - always query database
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', result.role);

    const scopes = scopesData?.map(s => s.scope) || [];

    // 4. Return to client with JWT and scopes
    res.json({
      user: {
        id: result.userId,
        email: result.userEmail,
        role: result.role,
        scopes  // ✅ Scopes from database
      },
      token,  // ✅ JWT (note: role in JWT NOT scopes!)
      expiresIn: 12 * 60 * 60,
      restaurantId
    });
  }
);
```

**SCOPE SOURCE**: Database `role_scopes` table 
**FLOW**: PIN validation → role determined → role_scopes query → client receives scopes
**NOTE**: Generated JWT contains role but NOT scopes (scopes fetched on login endpoint)

---

## 4. PATH 3: JWT TOKEN VERIFICATION (all subsequent requests)

### File: `/server/src/middleware/auth.ts` (lines 23-115)

```typescript
// Main authenticate() middleware
export async function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const config = getConfig();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Unauthorized('No token provided');
    }

    const token = authHeader.substring(7);

    // Verify JWT with Supabase secret
    const jwtSecret = config.supabase.jwtSecret;
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

    // Handle kiosk_demo → customer role alias
    let userRole = decoded.role || 'user';
    if (userRole === 'kiosk_demo') {
      userRole = 'customer'; // Backwards compatibility
    }

    // ✅ SCOPES EXTRACTED FROM JWT CLAIMS (not database!)
    // This is critical: middleware uses JWT scopes for performance
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: userRole,
      scopes: decoded.scope || [],  // ✅ Line 99: From JWT 'scope' claim
      restaurant_id: decoded.restaurant_id,
    };

    // Set restaurant context
    req.restaurantId = decoded.restaurant_id || (req.headers['x-restaurant-id'] as string);

    next();
  } catch (error) {
    next(error);
  }
}
```

**KEY INSIGHT**: 
- Line 99: `scopes: decoded.scope || []`
- **Scopes come from JWT claims, NOT database lookup**
- This is for **PERFORMANCE**: Avoid DB query on every request
- **CONSEQUENCE**: JWT must be issued with correct scopes at login time

---

## 5. PATH 4: RBAC MIDDLEWARE (scope enforcement)

### File: `/server/src/middleware/rbac.ts` (lines 237-338)

This middleware is called AFTER `authenticate()` to check if user has required scopes.

```typescript
export function requireScopes(...requiredScopes: ApiScope[]) {
  return async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Ensure user is authenticated (already done by authenticate())
      if (!req.user) {
        return next(Unauthorized('Authentication required'));
      }

      const restaurantId = req.restaurantId;
      if (!restaurantId) {
        return next(Forbidden('Restaurant context required'));
      }

      // Admin users bypass scope checks
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        return next();
      }

      // DEMO USERS: Use JWT role → look up scopes from ROLE_SCOPES constant
      if (req.user.id?.startsWith('demo:')) {
        const roleScopes = getScopesForRole(req.user.role!);
        const hasRequiredScope = requiredScopes.some(scope =>
          roleScopes.includes(scope)
        );
        if (!hasRequiredScope) {
          return next(Forbidden(`Insufficient permissions...`));
        }
        return next();
      }

      // ✅ PRODUCTION USERS: Database lookup per request
      // Get user's role for this restaurant (may differ from JWT role)
      const userRole = await getUserRestaurantRole(req.user.id, restaurantId);
      
      if (!userRole) {
        return next(Forbidden('No access to this restaurant'));
      }

      // Get scopes for user's role (from ROLE_SCOPES constant)
      const userScopes = getScopesForRole(userRole);  // Line 304
      
      // Check if user has required scope
      const hasRequiredScope = requiredScopes.some(scope => 
        userScopes.includes(scope)
      );
      
      if (!hasRequiredScope) {
        return next(Forbidden(`Insufficient permissions...`));
      }

      // ✅ POPULATE req.user.scopes from ROLE_SCOPES
      req.user.role = userRole;
      req.user.scopes = userScopes;  // Line 323: From ROLE_SCOPES constant

      next();
    } catch (error) {
      next(error);
    }
  };
}
```

**KEY INSIGHT**: 
- Line 323: `req.user.scopes = userScopes` 
- Gets scope from `ROLE_SCOPES` constant (not database)
- Only happens if `requireScopes()` middleware is used
- Performs database lookup to verify user has role in restaurant

---

## 6. SCOPE SOURCES - THE DUAL-SOURCE ARCHITECTURE

### File: `/server/src/middleware/rbac.ts` (lines 43-102)

```typescript
/**
 * DUAL-SOURCE ARCHITECTURE
 * Scopes come from TWO sources depending on context:
 */

// SOURCE 1: Database (used for client-side authorization at login)
// Query: SELECT scope FROM role_scopes WHERE role = 'manager'
// Tables:
//   - api_scopes: defines available scopes
//   - role_scopes: maps roles to scopes

// SOURCE 2: Code constant (used for server-side API protection)
// File: server/src/middleware/rbac.ts
// Reason: Performance (avoid DB query per request)
// Must be kept in sync with database!

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
    ApiScope.PAYMENTS_READ
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
  
  customer: [
    ApiScope.ORDERS_CREATE,
    ApiScope.ORDERS_READ,
    ApiScope.PAYMENTS_PROCESS,
    ApiScope.MENU_MANAGE
  ]
};

// Helper function used by both paths
function getScopesForRole(role: string): ApiScope[] {
  return ROLE_SCOPES[role] || [];
}
```

---

## 7. SCOPE DEFINITIONS - API SCOPE ENUM

### File: `/server/src/middleware/rbac.ts` (lines 12-41)

```typescript
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
```

---

## 8. DATABASE SCHEMA - ROLE_SCOPES TABLE

### File: `/supabase/migrations/.archive/20250130_auth_tables.sql` (lines 76-91)

```sql
-- API scope definitions
CREATE TABLE IF NOT EXISTS api_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT UNIQUE NOT NULL,  -- Changed from 'scope_name' to 'scope'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Role to scope mappings
CREATE TABLE IF NOT EXISTS role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope TEXT REFERENCES api_scopes(scope) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope)
);
```

**Column Names (IMPORTANT)**:
- Old: `scope_name` (legacy)
- New: `scope` (current - fixed in migrations)

---

## 9. AUTHENTICATION REQUEST FLOW DIAGRAM

```
Client Request with JWT Token
    |
    v
authenticate() middleware (auth.ts:23-115)
    |
    +-- Verify JWT signature with SUPABASE_JWT_SECRET
    |
    +-- Extract claims:
    |   - sub (user ID)
    |   - email
    |   - role
    |   - scope (array) ✅ FROM JWT CLAIMS
    |   - restaurant_id
    |
    +-- Set req.user = { id, email, role, scopes: decoded.scope || [], restaurant_id }
    |
    v
Optional: restaurantAccess middleware (restaurantAccess.ts)
    |
    +-- Verify user has access to requested restaurant
    |
    v
Optional: requireScopes() middleware (rbac.ts:237-338)
    |
    +-- If NOT admin/super_admin:
    |   +-- If demo user (id starts with 'demo:'):
    |   |   +-- Use ROLE_SCOPES[role] directly (no DB query)
    |   |
    |   +-- Else (production user):
    |       +-- Query DB: SELECT role FROM user_restaurants WHERE user_id AND restaurant_id
    |       +-- Get scopes: getScopesForRole(userRole) from ROLE_SCOPES constant
    |       +-- Set req.user.scopes = userScopes ✅ UPDATED from ROLE_SCOPES
    |
    v
Route Handler
    |
    +-- Access req.user.scopes (either from JWT or RBAC middleware)
```

---

## 10. SCOPE ASSIGNMENT SUMMARY TABLE

| Flow | Initial Source | Assignment Location | Populated During |
|------|----------------|-------------------|-----------------|
| **Login (Email/Password)** | Database (role_scopes) | auth.routes.ts line 85 | POST /login |
| **Login (PIN)** | Database (role_scopes) | auth.routes.ts line 169 | POST /pin-login |
| **Auth Middleware** | JWT claims | auth.ts line 99 | authenticate() |
| **GET /me endpoint** | Database (role_scopes) | auth.routes.ts line 319 | GET /me (client refresh) |
| **RBAC Enforcement** | ROLE_SCOPES constant | rbac.ts line 323 | requireScopes() middleware |

---

## 11. KEY CODE PATHS FOR SCOPE POPULATION

### Path A: Initial Login (scope assignment)
```
POST /login or POST /pin-login
  ↓
Query role_scopes table: SELECT scope FROM role_scopes WHERE role = ?
  ↓
Extract scopes: scopesData?.map(s => s.scope)
  ↓
Return to client in response body
```

### Path B: JWT Token Verification (scope retrieval)
```
Request with Bearer token
  ↓
authenticate() middleware
  ↓
jwt.verify(token, secret) → decoded
  ↓
req.user.scopes = decoded.scope || []
  ↓
Downstream handlers access req.user.scopes
```

### Path C: Scope Enforcement (scope validation)
```
Request reaches requireScopes() middleware
  ↓
If user is admin → grant all scopes
  ↓
Else if demo user (id.startsWith('demo:'))
  ↓
  getScopesForRole(req.user.role) from ROLE_SCOPES constant
  ↓
Else (production user)
  ↓
  getUserRestaurantRole(userId, restaurantId) → query DB
  ↓
  getScopesForRole(userRole) from ROLE_SCOPES constant
  ↓
  req.user.scopes = userScopes ✅ UPDATED
```

---

## 12. CRITICAL ISSUES & FIXES

### Issue 1: Column name mismatch (RESOLVED)
**Problem**: Migrations used `scope_name`, code queries `scope`
**Location**: auth.routes.ts lines 78, 162, 312
**Fix**: Changed database column to `scope` in recent migrations

**Evidence**:
```typescript
// ✅ FIXED: Uses 'scope' column
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope')  // Changed from 'scope_name'
  .eq('role', userRole.role);
```

### Issue 2: Station tokens don't include scopes
**Problem**: Station tokens (kitchen/expo) have no scopes in JWT
**Impact**: Station endpoints may fail scope checks
**Status**: Station auth doesn't populate req.user.scopes
**Location**: stationAuth.ts doesn't add scope claim

---

## 13. CONFIGURATION & SECURITY FLAGS

### Environment Variables Affecting Scopes:
```
SUPABASE_JWT_SECRET         - Primary secret for JWT verification
STRICT_AUTH=true            - Require restaurant_id in JWT
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true - Allow kiosk_demo → customer aliasing
NODE_ENV                    - Affects JWT handling in auth middleware
```

---

## 14. REQUEST.USER INTERFACE

### File: `/server/src/middleware/auth.ts` (lines 11-20)

```typescript
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    scopes?: string[];        // ✅ Array of scope strings
    restaurant_id?: string;
  };
  restaurantId?: string;
}
```

---

## 15. EXAMPLE JWT PAYLOADS

### Email/Password Login JWT (from PIN auth route):
```json
{
  "sub": "user-123",
  "email": "manager@example.com",
  "role": "manager",
  "restaurant_id": "restaurant-123",
  "auth_method": "pin",
  "iat": 1698700000,
  "exp": 1698743200
}
```
**NOTE**: No `scope` claim! Scopes come from database at login time only.

### Supabase Auth JWT (if issued with scopes):
```json
{
  "sub": "user-123",
  "email": "manager@example.com",
  "role": "manager",
  "scope": ["orders:create", "orders:read", "payments:process"],
  "restaurant_id": "restaurant-123",
  "iat": 1698700000,
  "exp": 1698786000
}
```
**NOTE**: Client would need to store and include in Authorization header.

---

## 16. SYNC REQUIREMENTS - DATABASE ↔ CODE

**CRITICAL**: ROLE_SCOPES constant in rbac.ts MUST match database role_scopes table

When adding a new scope:

1. Add to `ApiScope` enum (rbac.ts:12-41)
2. Add to `ROLE_SCOPES` constant (rbac.ts:103-181)
3. Create database migration:
   - INSERT into api_scopes table
   - INSERT into role_scopes table
4. Apply migration: `supabase db push --linked`
5. Verify with database query

Example migration:
```sql
INSERT INTO api_scopes (scope, description) VALUES
  ('new:action', 'Description here')
ON CONFLICT (scope) DO NOTHING;

INSERT INTO role_scopes (role, scope) VALUES
  ('manager', 'new:action'),
  ('server', 'new:action')
ON CONFLICT (role, scope) DO NOTHING;
```

---

## 17. MIGRATION FILE REFERENCES

| File | Purpose | Status |
|------|---------|--------|
| 20250130_auth_tables.sql | Initial schema (archived) | Initial setup |
| 20251018_add_customer_role_scopes.sql | Added customer role | Completed |
| 20251029_sync_role_scopes_with_rbac_v2.sql | Fixed scope naming (scope_name→scope) | Completed |

---

## SUMMARY

**User scopes are populated through THREE mechanisms**:

1. **At Login Time** (email/password or PIN):
   - Query `role_scopes` table 
   - Extract scopes based on user's role
   - Return scopes in login response to client

2. **In Auth Middleware** (on each request):
   - Extract `scope` claim from JWT (if present)
   - Populate `req.user.scopes` from JWT claims
   - Performance-optimized: no DB query

3. **In RBAC Middleware** (when scope enforcement needed):
   - For production users: Query user_restaurants DB → get role → look up in ROLE_SCOPES constant
   - For demo users: Use ROLE_SCOPES constant directly
   - Update `req.user.scopes` for downstream handlers

**Source of Truth**: ROLE_SCOPES constant in rbac.ts (must be synced with database)

