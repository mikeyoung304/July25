# COMPREHENSIVE AUTHENTICATION SYSTEM REPORT
## Restaurant OS - Rebuild 6.0

**Date**: November 6, 2025  
**Codebase**: /Users/mikeyoung/CODING/rebuild-6.0  
**Report Type**: VERY THOROUGH EXPLORATION

---

## EXECUTIVE SUMMARY

This codebase implements a **multi-layered, role-based authentication system** using **Supabase as the authentication provider** with support for multiple authentication methods:

1. **Email/Password Authentication** - Supabase native (managers, owners)
2. **PIN Authentication** - Staff login (servers, cashiers, kitchen)
3. **Station Authentication** - Hardware station login (kitchen displays, expo screens)
4. **Demo/Testing** - Ephemeral JWT tokens for development

The system enforces **strict multi-tenancy** through Role-Level Security (RLS) policies and JWT-based authorization with scope-based access control (RBAC).

---

# SECTION 1: AUTHENTICATION ARCHITECTURE

## 1.1 Authentication Provider

**System**: Supabase (GoTrue) + Custom JWT Implementation  
**Primary Method**: JWT Tokens (HS256 signature algorithm)

### Key Files:
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts` (Lines 1-245)
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/environment.ts` (Lines 1-100)
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/database.ts`

### JWT Configuration:
```
JWT Secret: SUPABASE_JWT_SECRET (retrieved from environment)
Algorithm: HS256
Token Format: Bearer <token>
Location: Authorization header
Validation: Performed in authenticate() middleware
```

## 1.2 Authentication Configuration Files

### Server Configuration:
- **Environment Variables**: `/Users/mikeyoung/CODING/rebuild-6.0/.env`
  - `SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co`
  - `SUPABASE_JWT_SECRET=jEvdTDmyqrvlx1m/ANFZMgS4PNLnLQJci5SHfJ391ZegBE0WaHzNdD8Uia/ow7cRXQDlfyOsVxX4kyb/Vv6CYQ==`
  - `SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - `KIOSK_JWT_SECRET=f7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3`
  - `PIN_PEPPER=09b63b9eb04ccd9a0e64245fa0b8e10d298118ac356fcf38bf13c0211b3c82f8`
  - `STATION_TOKEN_SECRET=5ae08c2c495664f8b5a9025ffe9a2fea183fe07a3f7122f84a303b865998bebf`

- **Validation**: `server/src/config/environment.ts:46-92`
  - Checks for presence and format of JWT_SECRET
  - Validates base64 encoding
  - Enforces minimum length (32 characters, typically 88)

### Client Configuration:
- **Environment Variables**: `client/.env.example`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - Feature flags: `VITE_DEMO_PANEL=1` (enables dev auth overlay)

### Supabase Configuration:
- **Project**: xiwfhcikfdoshxwbtjxt
- **RLS Enabled**: Yes (enforced at database level)
- **Auth Type**: Supabase Auth (OAuth, Email/Password)

## 1.3 Main Authentication API Endpoints

### Location: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/auth.routes.ts` (Lines 1-446)

| Endpoint | Method | Authentication | Purpose | Line |
|----------|--------|----------------|---------|------|
| `/api/v1/auth/login` | POST | None (public) | Email/password login for managers/owners | 22-114 |
| `/api/v1/auth/pin-login` | POST | None (public) | PIN-based login for staff | 120-191 |
| `/api/v1/auth/station-login` | POST | Required + Scope | Create/get station auth token | 197-237 |
| `/api/v1/auth/logout` | POST | Required | Sign out user and invalidate session | 243-280 |
| `/api/v1/auth/me` | GET | Required | Get current user profile & permissions | 287-337 |
| `/api/v1/auth/refresh` | POST | None (public) | Refresh expired JWT token | 343-378 |
| `/api/v1/auth/set-pin` | POST | Required | Set/update user PIN | 384-414 |
| `/api/v1/auth/revoke-stations` | POST | Required + Scope | Revoke all station tokens | 420-444 |

### Rate Limiting (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/authRateLimiter.ts`):

```typescript
Login (Email/Password):
  - Window: 15 minutes
  - Limit: 5 attempts/window (100 in development)
  - Tracking: Client ID (IP + Device Fingerprint)
  - Lockout: Auto-block after 10 failed attempts for 24 hours

PIN Authentication:
  - Window: 5 minutes
  - Limit: 3 attempts/window
  - Feature: Account-level lockout after 5 failed attempts
  - Duration: 15 minutes

Station Authentication:
  - Window: 10 minutes
  - Limit: 5 attempts/window

Token Refresh:
  - Window: 1 minute
  - Limit: 10 attempts/minute
```

## 1.4 Authentication Middleware & Guards

### Core Middleware:

**1. Main Authentication Middleware** (`auth.ts`)
- **Function**: `authenticate()` (Lines 23-108)
  - Location: Bearer token from Authorization header
  - Validation: JWT.verify() with SUPABASE_JWT_SECRET
  - Extracts: `sub` (user ID), `email`, `role`, `scope`, `restaurant_id`
  - Stores in: `req.user` object
  - Error Handling: 
    - No token: "No token provided" (400)
    - Expired: "Token expired" (401)
    - Invalid: "Invalid token" (401)
    - Signature: "Token verification failed" (401)

- **Function**: `optionalAuth()` (Lines 111-152)
  - Allows unauthenticated requests
  - Attempts to validate token if present
  - Falls back gracefully if invalid
  - Extracts `restaurant_id` from header if no auth token

- **Function**: `verifyWebSocketAuth()` (Lines 155-200)
  - WebSocket-specific authentication
  - Token from URL query parameter: `?token=`
  - Allows anonymous connections in development (with warning)
  - Rejects unauthenticated in production

**2. Role-Based Access Control Middleware** (`rbac.ts`, Lines 1-423)
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/rbac.ts`

- **ApiScope Enum** (Lines 12-41):
  ```
  ORDERS_CREATE, ORDERS_READ, ORDERS_UPDATE, ORDERS_DELETE, ORDERS_STATUS
  PAYMENTS_PROCESS, PAYMENTS_REFUND, PAYMENTS_READ
  REPORTS_VIEW, REPORTS_EXPORT
  STAFF_MANAGE, STAFF_SCHEDULE
  SYSTEM_CONFIG
  MENU_MANAGE
  TABLES_MANAGE
  ```

- **Role Scopes** (Lines 103-181):
  ```
  Owner:   All scopes (15 total)
  Manager: All except SYSTEM_CONFIG (14 scopes)
  Server:  ORDERS_* (3), PAYMENTS_PROCESS, PAYMENTS_READ, TABLES_MANAGE
  Cashier: ORDERS_READ, PAYMENTS_PROCESS, PAYMENTS_READ
  Kitchen: ORDERS_READ, ORDERS_STATUS
  Expo:    ORDERS_READ, ORDERS_STATUS
  Customer: ORDERS_CREATE, ORDERS_READ, PAYMENTS_PROCESS, MENU_MANAGE
  ```

- **Middleware**: `requireScopes(...scopes)` (Lines 237-338)
  - Checks user has at least one required scope
  - Query database for restaurant role if needed
  - Handles demo users (demo: prefix)
  - Logs all access attempts

**3. Restaurant Access Validation** (`restaurantAccess.ts`, Lines 1-108)
- **Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/restaurantAccess.ts`

- **Function**: `validateRestaurantAccess()` (Lines 13-81)
  - Gets restaurant ID from:
    1. X-Restaurant-ID header (preferred)
    2. JWT restaurant_id claim
  - Validates user has access to restaurant
  - Allows admin/super_admin to access any restaurant
  - Allows demo users (demo: prefix) without DB check
  - Queries `user_restaurants` table for non-admin users
  - Sets `req.restaurantId` and `req.restaurantRole`

**4. Rate Limiting Middleware** (`authRateLimiter.ts`)
- **Suspicious Activity Check**: `suspiciousActivityCheck` (Lines 199-234)
  - Tracks failed attempts by Client ID
  - Auto-blocks after 10 failures
  - 24-hour auto-unblock
- **Specific Limiters**:
  - `loginRateLimiter` (Lines 59-80)
  - `pinAuthRateLimiter` (Lines 83-107)
  - `stationAuthRateLimiter` (Lines 176-197)

### Middleware Application Chain:

```
Express Route
  ↓
(Optional) authRateLimiters.checkSuspicious
  ↓
(Optional) authRateLimiters.login/pin/station
  ↓
authenticate() | optionalAuth()
  ↓
validateRestaurantAccess()
  ↓
requireScopes(ApiScope.*)
  ↓
Route Handler
```

**Example** (auth.routes.ts:22-24):
```typescript
router.post('/login',
  authRateLimiters.checkSuspicious,
  authRateLimiters.login,
  async (req: Request, res: Response, next: NextFunction) => {
    // Handler...
  }
);
```

---

# SECTION 2: USER ROLES AND PERMISSIONS

## 2.1 User Roles in Database Schema

### Database Table: `user_restaurants` 
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/.archive/20250130_auth_tables.sql` (Lines 16-25)

```sql
CREATE TABLE user_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'owner', 'manager', 'server', 'cashier', 'kitchen', 'expo'
  )),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);
```

### Valid User Roles:

| Role | Description | Typical Use Case | Key Permissions |
|------|-------------|------------------|-----------------|
| `owner` | Restaurant owner/operator | Owns restaurant | All scopes, system config |
| `manager` | General manager | Manages restaurant ops | All except system config |
| `server` | Wait staff/food runner | Takes orders, manages tables | Orders, payments, tables |
| `cashier` | Cashier staff | Processes payments | View orders, process payments |
| `kitchen` | Kitchen staff | Prepares food | View orders, update status |
| `expo` | Expo/pickup staff | Calls orders | View orders, update status |
| `customer` | Online customer | Places orders | Create orders, view own orders |
| `kiosk_demo` | Deprecated | Demo only | Maps to 'customer' (deprecated) |
| `admin` | System admin (internal) | Super-user | All access (non-standard) |

### Additional System Roles:
- `demo:*` - Ephemeral demo users (format: `demo:role:randomId`)
- `super_admin` - Super-user access (internal only)

## 2.2 User/Profile Schema

### Main User Tables:

**1. Supabase auth.users** (Managed by Supabase)
- UUID primary key
- Email/password auth
- Email verification
- Session management

**2. user_profiles** (Extension)
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/.archive/20250130_auth_tables.sql` (Lines 6-13)

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  phone TEXT,
  employee_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**3. user_pins** (PIN Authentication)
**Location**: Lines 28-39 of same file

```sql
CREATE TABLE user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID NOT NULL,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Related Tables:

**4. role_scopes** (Permission Mapping)
```sql
CREATE TABLE role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope TEXT REFERENCES api_scopes(scope),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope)
);
```

**5. auth_logs** (Audit Trail)
```sql
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID,
  event_type TEXT CHECK (event_type IN (
    'login_success', 'login_failed', 'logout',
    'pin_success', 'pin_failed', 'pin_locked',
    'station_login', 'station_logout', 'station_revoked',
    'password_reset', 'mfa_enabled', 'mfa_disabled',
    'session_expired', 'token_refreshed'
  )),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2.3 Permission Enforcement

### Method 1: Scope-Based Access Control (API Level)

**Enforcement**: `server/src/middleware/rbac.ts:237-338`

```typescript
requireScopes(...requiredScopes: ApiScope[])
  ↓ 
Checks req.user has required scope
  ↓
If missing: Returns 403 Forbidden
```

**Examples in Code**:
```typescript
// Require staff management scope
router.post('/revoke-stations', 
  authenticate, 
  requireScopes(ApiScope.STAFF_MANAGE),  // ← Permission check
  async (req, res) => { ... }
);

// Require order creation
router.post('/orders',
  authenticate,
  requireScopes(ApiScope.ORDERS_CREATE),
  async (req, res) => { ... }
);
```

### Method 2: Row-Level Security Policies (Database Level)

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/supabase/migrations/.archive/20250130_auth_tables.sql` (Lines 180-242)

Policies enforce multi-tenancy:
- Users can view own profile only
- Managers can view staff profiles in their restaurant
- Users see their own restaurant associations
- Managers see staff associations in their restaurant
- Users see their own auth logs
- Managers see restaurant auth logs

### Method 3: Restaurant-Scoped Access

**Enforcement**: `server/src/middleware/restaurantAccess.ts`

```
Request → validateRestaurantAccess()
  ↓
Check user_restaurants table:
  SELECT role FROM user_restaurants
  WHERE user_id = ? AND restaurant_id = ?
  ↓
If found: Set req.restaurantRole
If not found: Reject with 403 Forbidden
```

## 2.4 Permission Differences Between Roles

### Permission Matrix:

| Scope | Owner | Manager | Server | Cashier | Kitchen | Expo | Customer |
|-------|-------|---------|--------|---------|---------|------|----------|
| orders:create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| orders:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| orders:update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| orders:delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| orders:status | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| payments:process | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| payments:refund | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| payments:read | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| reports:view | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| reports:export | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| staff:manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| staff:schedule | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| system:config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| menu:manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| tables:manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### How Scopes are Assigned:

**1. At Login (Email/Password)**
- Fetch user's role from `user_restaurants` table
- Get scopes from `role_scopes` table (query in auth.routes.ts:75-85)
- Include scopes in login response

**2. At PIN Login**
- Query `user_pins` table for user
- Get user's role from `user_restaurants` table
- Create JWT with role + scopes
- Scopes in auth.routes.ts:159-169

**3. At Token Refresh**
- Validate refresh token with Supabase
- Return new JWT with same scopes as before

---

# SECTION 3: AUTHENTICATION FLOW COMPONENTS

## 3.1 Frontend: Login Components & User Switching UI

### Location: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/`

#### Login Page
**File**: `pages/Login.tsx` (Lines 1-215)

Features:
- Email/password form (lines 24-47)
- Password visibility toggle (lines 81-113)
- Restaurant ID selector (dev mode only, lines 117-133)
- Links to PIN/Station login (lines 181-199)
- Dev auth overlay (line 211)

**Flow**:
```
User enters email/password
  ↓
handleSubmit() (lines 24-47)
  ↓
useAuth().login(email, password, restaurantId)
  ↓
Redirect to /home on success
```

#### Dev Auth Overlay
**File**: `components/auth/DevAuthOverlay.tsx` (Lines 1-170+)

Features:
- Only visible when `VITE_DEMO_PANEL=1`
- Quick role selection (manager, server, kitchen, expo)
- Uses real Supabase credentials from `WORKSPACE_CONFIG`
- Auto-login with real demo users

**Credentials** (from `config/demoCredentials.ts`):
```typescript
server@restaurant.com / ServerPass123!
kitchen@restaurant.com / KitchenPass123!
expo@restaurant.com / ExpoPass123!
manager@restaurant.com / ManagerPass123!
```

#### Auth Context
**File**: `contexts/AuthContext.tsx` (Lines 1-543)

Core state management:
- `user` - Current logged-in user
- `session` - Access/refresh tokens + expiry
- `restaurantId` - Current restaurant scope
- `isAuthenticated`, `isLoading`

Methods:
- `login(email, password, restaurantId)` (lines 183-242)
- `loginWithPin(pin, restaurantId)` (lines 245-284)
- `loginAsStation(stationType, stationName, restaurantId)` (lines 287-334)
- `logout()` (lines 337-382)
- `refreshSession()` (lines 385-425)
- `setPin(pin)` (lines 428-444)

Permissions checks:
- `hasRole(role: string)` (lines 447-449)
- `hasScope(scope: string)` (lines 452-454)
- `canAccess(requiredRoles[], requiredScopes[])` (lines 457-480)

**Token Refresh** (lines 483-519):
- Auto-refresh 5 minutes before expiry
- Logout if refresh fails
- Single timer via ref (prevents race conditions)

**Supabase Integration** (lines 131-175):
- Subscribe to auth state changes
- Handle SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED events
- Restore PIN/station sessions from localStorage

#### Protected Routes
**File**: `components/auth/ProtectedRoute.tsx` (Lines 1-145)

Features:
- Guards routes based on authentication
- Checks roles and scopes
- Shows loading state during auth check
- Redirects to /login if unauthorized
- Redirects to /unauthorized if insufficient permissions

**Usage**:
```typescript
<ProtectedRoute requiredRoles={['owner', 'manager']}>
  <AdminPage />
</ProtectedRoute>
```

#### Role Selector Component
**File**: `components/auth/RoleSelector.tsx`

Allows staff to select workspace:
- Server workspace
- Kitchen workspace
- Expo workspace
- Manager workspace

## 3.2 Backend: Auth API Routes & Session Management

### Session Management

**1. Token Lifespan**:
- Email/password login: Returns Supabase session
  - Access token: Default expiry from Supabase (typically 1 hour)
  - Refresh token: Valid for 7 days by default
  
- PIN login: Custom JWT token
  - Expiry: 12 hours (auth.routes.ts:154)
  - `exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)`

- Station auth: Custom JWT token
  - Expiry: 4 hours (stationAuth.ts:11)
  - `STATION_TOKEN_EXPIRY_HOURS = 4`

**2. Token Refresh Flow** (auth.routes.ts:343-378):
```
POST /api/v1/auth/refresh
Body: { refreshToken }
  ↓
Call supabase.auth.refreshSession()
  ↓
Return new access_token + refresh_token
```

**3. Token Validation** (auth.ts:23-108):
- Validates signature with SUPABASE_JWT_SECRET
- Checks expiry via jwt.verify()
- Rejects expired/invalid tokens
- Extracts claims to req.user

### Session Clearing

**Logout** (auth.routes.ts:243-280):
- Client calls `POST /api/v1/auth/logout`
- Server calls `supabase.auth.signOut()` (lines 261-265)
- Logs auth event
- Returns success (data not cleared server-side, client handles it)

**Frontend Logout** (AuthContext.tsx:337-382):
- Calls Supabase signOut() with 5-second timeout
- Clears React state (user, session, restaurantId)
- Removes localStorage entry `auth_session`
- Redirects to login

## 3.3 Database: User Tables & Auth-Related Tables

### Core Tables:

**1. auth.users** (Supabase managed)
- User ID (UUID)
- Email (unique)
- Encrypted password
- Email verified status
- Last sign-in
- Created/updated timestamps

**2. user_profiles** (Custom)
```sql
user_id (UUID, PK) → auth.users
display_name
phone
employee_id
created_at, updated_at
```

**3. user_restaurants** (Custom - Multi-tenancy link)
```sql
id (UUID, PK)
user_id (UUID, FK) → auth.users
restaurant_id (UUID)
role (owner|manager|server|cashier|kitchen|expo)
is_active (boolean)
created_at, updated_at
UNIQUE(user_id, restaurant_id)
```

**4. user_pins** (PIN Authentication)
```sql
id (UUID, PK)
user_id (UUID, FK) → auth.users
restaurant_id (UUID)
pin_hash (bcrypt hash with pepper)
salt (bcrypt salt)
attempts (int, locked after 5)
locked_until (timestamp)
last_attempt_at
created_at, updated_at
UNIQUE per user_id (one PIN per user in all restaurants combined)
```

**5. station_tokens** (Hardware Station Auth)
```sql
id (UUID, PK)
token_hash (SHA256 hash for DB lookup)
station_type (kitchen|expo|bar|prep)
station_name (string)
restaurant_id (UUID)
device_fingerprint (IP + User-Agent hash)
last_activity_at
expires_at
revoked (boolean)
revoked_at, revoked_by (FK)
created_at, created_by (FK)
```

**6. auth_logs** (Audit Trail)
```sql
id (UUID, PK)
user_id (UUID, FK) → auth.users
restaurant_id (UUID)
event_type (login_success|login_failed|logout|pin_*|station_*|etc)
ip_address (INET)
user_agent (string)
metadata (JSONB)
created_at
```

**7. api_scopes** (Permission Registry)
```sql
id (UUID, PK)
scope (TEXT, UNIQUE) - e.g., 'orders:create'
description
created_at
```

**8. role_scopes** (Role→Scope Mapping)
```sql
id (UUID, PK)
role (TEXT) - 'owner', 'manager', 'server', etc
scope (TEXT, FK) → api_scopes
created_at
UNIQUE(role, scope)
```

### Indexes for Performance:
```sql
idx_user_restaurants_user_id
idx_user_restaurants_restaurant_id
idx_user_pins_restaurant_id
idx_station_tokens_restaurant_id
idx_station_tokens_expires_at
idx_auth_logs_user_id
idx_auth_logs_restaurant_id
idx_auth_logs_created_at
```

---

# SECTION 4: TEST INFRASTRUCTURE

## 4.1 Test Users & Fixtures

### E2E Test Users
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/fixtures/test-users.ts` (Lines 1-38)

```typescript
TEST_USERS = {
  server: { role: 'server', displayName: 'Test Server', userId: 'e2e-server-001' },
  cashier: { role: 'cashier', displayName: 'Test Cashier', userId: 'e2e-cashier-001' },
  kitchen: { role: 'kitchen', displayName: 'Test Kitchen', userId: 'e2e-kitchen-001' },
  manager: { role: 'manager', displayName: 'Test Manager', userId: 'e2e-manager-001' },
  owner: { role: 'owner', displayName: 'Test Owner', userId: 'e2e-owner-001' },
}
```

### Development Workspace Credentials
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/config/demoCredentials.ts` (Lines 1-94)

```typescript
WORKSPACE_CONFIG = {
  server: {
    route: '/server',
    requiredRoles: ['owner', 'manager', 'server'],
    workspaceCredentials: {
      email: 'server@restaurant.com',
      password: 'ServerPass123!'
    }
  },
  kitchen: {
    email: 'kitchen@restaurant.com',
    password: 'KitchenPass123!'
  },
  expo: {
    email: 'expo@restaurant.com',
    password: 'ExpoPass123!'
  },
  admin: {
    email: 'manager@restaurant.com',
    password: 'ManagerPass123!'
  },
  kiosk: { /* No credentials - public */ },
  'online-order': { /* No credentials - public */ }
}
```

**Note**: These are REAL Supabase user accounts, not fake demo tokens.

### Test Data
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/fixtures/test-data.ts`

- Menu items (burger, fries, soda)
- Tables (T1, T2)
- Orders (simple, combo)
- Payments (test card: 4111111111111111)
- Restaurant ID: 11111111-1111-1111-1111-111111111111 (default)

## 4.2 Existing Authentication Tests

### Unit Tests
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/__tests__/auth.test.ts` (Lines 1-100+)

Tests:
- JWT validation (valid/invalid/expired tokens)
- Authorization header format
- Kiosk JWT secret fallback
- Development mode token acceptance
- Production token rejection
- Restaurant context extraction
- Session duration enforcement (8-hour managers, 12-hour staff)

**Test Framework**: Vitest

### Integration Tests
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/tests/enhanced/login-diagnostic.spec.ts`

Diagnostic tests for:
- Login endpoint behavior
- Token generation
- User permission loading

### E2E Tests
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/`

Test helpers in:
- `fixtures/test-helpers.ts`
- `fixtures/test-data.ts`
- `fixtures/test-users.ts`

## 4.3 Test/Staging Environment Configuration

### Test Environment Variables
**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/.env.test`
- Minimal config for test runs
- Uses test Supabase project

### Development Mode Features
**Location**: `client/.env.example`

```
VITE_DEMO_PANEL=1          # Enable dev auth overlay
VITE_ENVIRONMENT=development
VITE_DEBUG_MODE=false
```

### Feature Flags for Testing
```
VITE_FEATURE_NEW_CUSTOMER_ID_FLOW=false
VITE_FEATURE_IDEMPOTENCY_ENABLED=false
VITE_FEATURE_TURN_SERVERS_ENABLED=false
... (many more)
```

## 4.4 Seed Files

### Demo User Creation
**Location**: Handled in Supabase UI + migration files

Demo users are created through:
1. Supabase Authentication settings
2. Direct user creation in auth.users table
3. user_restaurants table entries for role assignment

**Key Migration**: `supabase/migrations/20251027173500_fix_payment_audit_demo_users.sql`
- Handles demo user IDs (format: `demo:role:xyz`)
- Stores in metadata.demoUserId since demo IDs aren't valid UUIDs

---

# SECTION 5: CURRENT IMPLEMENTATION DETAILS

## 5.1 How Login Works

### Email/Password Login (Managers/Owners)

**Flow**:
```
1. User fills email/password form (Login.tsx:13-18)
   ↓
2. POST /api/v1/auth/login {email, password, restaurantId}
   ↓
3. Rate limiting check (authRateLimiters.login - max 5/15min)
   ↓
4. Supabase.auth.signInWithPassword() (auth.routes.ts:41)
   ↓
5. Check user_restaurants for access (lines 52-62)
   ↓
6. Query role_scopes for permissions (lines 75-85)
   ↓
7. Log auth event to auth_logs (lines 65-73)
   ↓
8. Return response with:
   {
     user: {id, email, role, scopes},
     session: {access_token, refresh_token, expires_in},
     restaurantId
   }
   ↓
9. Client stores in AuthContext.session + localStorage
   ↓
10. Auto-refresh token 5 min before expiry (AuthContext.tsx:483-519)
```

**Validation**:
- Email format checked in browser
- Password required (Supabase enforces)
- restaurantId required
- User must exist in user_restaurants for that restaurant

**Error Handling**:
- Invalid credentials → "Invalid email or password" (Supabase)
- No restaurant access → "No access to this restaurant" (line 61)
- Rate limit exceeded → 429 with retry-after header

### PIN Login (Staff)

**Flow**:
```
1. User enters 4-6 digit PIN (PinLogin component - not shown)
   ↓
2. POST /api/v1/auth/pin-login {pin, restaurantId}
   ↓
3. Rate limiting (max 3/5min)
   ↓
4. validatePin() function (pinAuth.ts:158-296)
   - Query user_pins table for all users at restaurant
   - For each PIN record:
     a. Check locked_until timestamp
     b. Hash PIN with pepper: bcrypt(pin + PIN_PEPPER)
     c. Compare with stored pin_hash
     d. If match: Reset attempts to 0, return user
     e. If no match: Increment attempts, lock after 5
   ↓
5. Get user's role from user_restaurants (pinAuth.ts:226-232)
   ↓
6. Generate JWT with 12-hour expiry (auth.routes.ts:147-157)
   {
     sub: userId,
     email: userEmail,
     role: role,
     restaurant_id: restaurantId,
     auth_method: 'pin',
     iat: now,
     exp: now + 12h
   }
   ↓
7. Query role_scopes for permissions (lines 160-169)
   ↓
8. Log auth event (implicit in validatePin)
   ↓
9. Return {user, token, expiresIn, restaurantId}
   ↓
10. Client stores in localStorage as 'auth_session'
```

**Security Features**:
- PIN pepper: `09b63b9eb04ccd9a0e64245fa0b8e10d298118ac356fcf38bf13c0211b3c82f8`
- Bcrypt hashing (10 salt rounds)
- Account lockout: 5 failed attempts → 15-minute lockdown
- Per-restaurant PIN scoping
- Rate limiting: 3 attempts/5 minutes

**PIN Validation Rules** (pinAuth.ts:61-82):
- 4-6 digits only
- No repeated digits (1111 rejected)
- No simple sequences (1234, 0000 rejected)

### Station Login (Kitchen Displays)

**Flow**:
```
1. Kitchen display calls POST /api/v1/auth/station-login
   {stationType, stationName, restaurantId}
   ↓
2. Requires authentication + STAFF_MANAGE scope (auth.routes.ts:200-201)
   ↓
3. createStationToken() (stationAuth.ts:60-137)
   - Generate device fingerprint: SHA256(IP + User-Agent + salt)
   - Create random token ID (16 bytes)
   - Calculate 4-hour expiry
   - Create JWT payload with device fingerprint
   - Sign with STATION_TOKEN_SECRET
   - Hash token: SHA256(token) for DB storage
   - Store in station_tokens table
   ↓
4. Log auth event (stationAuth.ts:119-123)
   ↓
5. Return {token, expiresAt, stationType, stationName, restaurantId}
   ↓
6. Station stores token in localStorage
```

**Token Format**:
```javascript
{
  sub: tokenId,
  type: 'station',
  station_type: 'kitchen'|'expo'|'bar'|'prep',
  station_name: string,
  restaurant_id: UUID,
  device_fingerprint: SHA256(IP:UA:salt),
  iat: unix_timestamp,
  exp: unix_timestamp (4 hours later)
}
```

**Validation on use** (stationAuth.ts:142-241):
- JWT signature check
- Device fingerprint match (prevents token theft)
- Token hash lookup in DB
- Revocation check
- Expiry check
- Update last_activity_at

## 5.2 How Logout Works

### Supabase Session (Email/Password Users)

**Frontend** (AuthContext.tsx:337-382):
```
1. User clicks logout
   ↓
2. logout() function called
   ↓
3. supabase.auth.signOut() with 5-second timeout
   ↓
4. POST /api/v1/auth/logout (optional, not awaited)
   - Logs event to auth_logs
   - Calls supabase.auth.signOut() server-side
   ↓
5. Clear React state: user=null, session=null, restaurantId=null
   ↓
6. Remove localStorage 'auth_session'
   ↓
7. Redirect to /login
```

### PIN/Station Sessions

**Frontend**:
```
1. User clicks logout
   ↓
2. logout() function
   ↓
3. Clear React state
   ↓
4. Remove localStorage 'auth_session'
   ↓
5. No server call needed (PIN tokens are stateless)
```

### Token Invalidation

**Email/Password**:
- Handled by Supabase (refresh token revocation)

**PIN/Station**:
- Tokens are stateless JWTs
- No server-side revocation (except for station_tokens table)
- Expiry handles invalidation

## 5.3 User Switching Feature

### Not Directly Implemented

The codebase doesn't have a "switch user" feature. Instead:

**Workaround - Logout + Login**:
1. Current user logs out
2. Different user logs in
3. Completely fresh session

**Multi-Restaurant Switching** (Implicit):
```
User with multiple restaurant_id values in user_restaurants:
  1. Login to restaurant A
  2. Logout
  3. Login again, specify restaurant B
  (Different JWT issued for restaurant B)
```

**Future Enhancement**: Could implement `POST /api/v1/auth/switch-user` to:
- Logout from current
- Login as different user
- Preserve session state

## 5.4 Session Management

### Session Validation

**On Every API Request**:
```
1. Extract Authorization: Bearer <token>
2. JWT.verify(token, SUPABASE_JWT_SECRET)
3. Check claims:
   - sub (user ID exists)
   - exp (not expired)
   - Signature valid
4. Extract restaurant_id from token/header
5. Validate user_restaurants permission
6. Allow/deny request
```

### Session Duration

| Method | Duration | Token Type | Refresh |
|--------|----------|-----------|---------|
| Email/Password | 1 hour (access) | Supabase JWT | Via refresh token (7 days) |
| PIN | 12 hours | Custom JWT | None (stateless) |
| Station | 4 hours | Custom JWT | None (stateless) |

### Token Refresh Mechanism

**Auto-refresh** (AuthContext.tsx:483-519):
```
1. Calculate refresh time: expiresAt - 300 seconds (5 min before expiry)
2. Schedule setTimeout for that time
3. When timer fires:
   - POST /api/v1/auth/refresh {refreshToken}
   - Get new access_token + refresh_token
   - Update session state
   - Schedule next refresh
4. If refresh fails:
   - Auto-logout user (line 499)
   - Redirect to login
```

**Manual Refresh** (AuthContext.tsx:385-425):
```
1. Guard against concurrent refreshes (refreshInProgressRef)
2. POST /api/v1/auth/refresh {refreshToken}
3. If success: Update session
4. If failure: Throw error (caller logs out)
```

**Backend Refresh** (auth.routes.ts:343-378):
```
1. POST /api/v1/auth/refresh {refreshToken}
   ↓
2. supabase.auth.refreshSession({refresh_token})
   ↓
3. Return new session with updated tokens
```

## 5.5 Security Measures

### CSRF Protection
**Middleware**: `server/src/middleware/csrf.ts`

Protected endpoints require CSRF token (except whitelisted):
- Whitelist: /api/v1/health, /api/v1/realtime/session

### Rate Limiting
**By Endpoint**:
- Login: 5/15min per client
- PIN: 3/5min per restaurant
- Station: 5/10min per station ID
- Token Refresh: 10/1min

**Client Fingerprinting**:
- IP address
- User-Agent
- Device fingerprint header (optional)

**Enforcement**:
```
Suspicious activity tracking:
  - Map<clientId, attemptCount>
  - Auto-block after 10 failures
  - 24-hour auto-unblock
  - Diagnostic logging to auth_logs
```

### JWT Signature Verification
**Algorithm**: HS256 with SUPABASE_JWT_SECRET
- No fallback secrets
- Single source of truth

**Token Claims Validation**:
- `sub` (subject/user ID)
- `exp` (expiration time)
- `role` (user role)
- `restaurant_id` (multi-tenancy scope)

### PIN Security
**Hashing**:
```
PIN → Pepper (salt + PIN_PEPPER constant)
  → Bcrypt(pepper, 10 salt rounds)
  → Stored in user_pins.pin_hash
```

**Lockout**:
- 5 failed attempts
- 15-minute lockout
- Manual unlock via manager

### Station Token Security
**Device Fingerprint**:
```
Fingerprint = SHA256(IP + ":" + User-Agent + ":" + DEVICE_FINGERPRINT_SALT)
  ↓
Verified on every request
  ↓
If mismatch: Token rejected
```

**Token Hashing**:
- Token stored as SHA256 hash in DB
- Original token never stored
- Prevents DB breach exploitation

**Revocation**:
- Set revoked=true + revoked_at + revoked_by
- Token lookup checks revoked status
- Manual revocation by manager

### Multi-Tenancy Enforcement
**RLS Policies**:
- user_restaurants: Users see only their own or staff associations
- user_profiles: Managers see staff profiles in their restaurant
- auth_logs: Users see own logs, managers see restaurant logs
- station_tokens: Only managers can view/manage

**Row Filters**:
- Every query includes restaurant_id WHERE clause
- Database enforces at query level
- Impossible to retrieve cross-restaurant data

### Additional Security Headers
**Middleware**: `server/src/middleware/security-headers.ts`

Standard security headers (HTTPS-only in production):
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security
- etc.

---

# SECTION 6: CONFIGURATION & ENVIRONMENT

## 6.1 Required Environment Variables

### Server (Backend)

**Supabase**:
```
SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=jEvdTDm...  # CRITICAL - for token verification
```

**Auth Secrets**:
```
KIOSK_JWT_SECRET=f7a8b9c0...    # For custom JWT signing
PIN_PEPPER=09b63b9e...           # PIN hashing pepper
DEVICE_FINGERPRINT_SALT=e27678...  # Station device fingerprint salt
STATION_TOKEN_SECRET=5ae08c2c...  # Station token signing secret
```

**Application**:
```
NODE_ENV=development|production|test
PORT=3001
FRONTEND_URL=http://localhost:5173
DEFAULT_RESTAURANT_ID=grow
```

**Optional**:
```
OPENAI_API_KEY=sk-proj-...      # Voice ordering
```

### Client (Frontend)

**Supabase**:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**API**:
```
VITE_API_BASE_URL=http://localhost:3001
VITE_DEFAULT_RESTAURANT_ID=grow
```

**Features**:
```
VITE_DEMO_PANEL=1              # Enable dev auth overlay
VITE_ENVIRONMENT=development
```

## 6.2 Database Connections

### Supabase Connection
**File**: `server/src/config/database.ts`

```typescript
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // Client-side queries
);

export const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
).auth;  // Auth-specific methods
```

**Service Role** (for server operations):
```typescript
// NOT shown in main code - used in migrations/admin operations
SUPABASE_SERVICE_KEY  // Has unrestricted access
```

## 6.3 Authentication Endpoints Summary

| Endpoint | Method | Auth Required | Rate Limited | Purpose |
|----------|--------|---------------|--------------|---------|
| `/api/v1/auth/login` | POST | No | Yes (5/15m) | Email/password login |
| `/api/v1/auth/pin-login` | POST | No | Yes (3/5m) | PIN-based login |
| `/api/v1/auth/station-login` | POST | Yes | Yes (5/10m) | Create station token |
| `/api/v1/auth/logout` | POST | Yes | No | Sign out user |
| `/api/v1/auth/me` | GET | Yes | No | Get user profile |
| `/api/v1/auth/refresh` | POST | No | Yes (10/1m) | Refresh token |
| `/api/v1/auth/set-pin` | POST | Yes | No | Set/update PIN |
| `/api/v1/auth/revoke-stations` | POST | Yes | No | Revoke station tokens |

---

# SECTION 7: KEY FILES & LINE REFERENCES

## Authentication Core

| File | Lines | Purpose |
|------|-------|---------|
| `/server/src/middleware/auth.ts` | 1-245 | JWT validation, user extraction |
| `/server/src/routes/auth.routes.ts` | 1-446 | Auth endpoint handlers |
| `/server/src/services/auth/pinAuth.ts` | 1-396 | PIN hashing, validation, lockout |
| `/server/src/services/auth/stationAuth.ts` | 1-419 | Station token creation, validation |
| `/server/src/middleware/rbac.ts` | 1-423 | Role & scope enforcement |
| `/server/src/middleware/restaurantAccess.ts` | 1-108 | Multi-tenancy validation |
| `/server/src/middleware/authRateLimiter.ts` | 1-259 | Rate limiting for auth endpoints |

## Frontend Authentication

| File | Lines | Purpose |
|------|-------|---------|
| `/client/src/contexts/AuthContext.tsx` | 1-543 | Auth state, login/logout logic |
| `/client/src/contexts/auth.hooks.ts` | 1-10 | useAuth() hook |
| `/client/src/pages/Login.tsx` | 1-215 | Login page UI |
| `/client/src/components/auth/DevAuthOverlay.tsx` | 1-170+ | Dev mode quick auth |
| `/client/src/components/auth/ProtectedRoute.tsx` | 1-145 | Route protection |
| `/client/src/config/demoCredentials.ts` | 1-94 | Demo user credentials |

## Database Schema

| File | Lines | Purpose |
|------|-------|---------|
| `/supabase/migrations/.archive/20250130_auth_tables.sql` | 1-260 | Core auth tables |
| `/supabase/migrations/20251029_sync_role_scopes_with_rbac_v2.sql` | 1-70 | Role-scope sync |
| `/supabase/migrations/20251027173500_fix_payment_audit_demo_users.sql` | Variable | Demo user support |

## Testing

| File | Purpose |
|------|---------|
| `/server/src/middleware/__tests__/auth.test.ts` | Auth unit tests |
| `/tests/e2e/fixtures/test-users.ts` | E2E test users |
| `/tests/e2e/fixtures/test-data.ts` | Test data (orders, items) |
| `/tests/e2e/fixtures/test-helpers.ts` | Helper functions |

---

# SECTION 8: SECURITY CONSIDERATIONS

## Current Implementation

### Strengths
1. **JWT Signature Verification**: HS256 with single secret source
2. **Rate Limiting**: Comprehensive across all auth endpoints
3. **Multi-Tenancy Enforcement**: RLS policies + server-side validation
4. **PIN Security**: Bcrypt with pepper + account lockout
5. **Station Token Security**: Device fingerprint + token hashing
6. **Audit Logging**: All auth events logged to auth_logs table
7. **Token Expiration**: Auto-refresh mechanism prevents stale tokens

### Potential Improvements
1. **CSRF Protection**: Partially implemented, needs verification for all endpoints
2. **MFA**: Not implemented (could add TOTP/SMS)
3. **Session Revocation**: PIN/station tokens are stateless (cannot revoke early)
4. **Token Secret Rotation**: No rotation mechanism
5. **API Key Management**: Secrets in environment (best practice, but no rotation)

## Data Sensitivity

### Stored in Token
- User ID (sub)
- Email
- Role
- Scopes
- Restaurant ID
- Expiry time

### Never Stored in Token
- Password
- PIN
- Sensitive user data

### Session Storage
**Browser localStorage**:
- `auth_session`: {user, session, restaurantId}
- Accessible by JavaScript (XSS risk)
- Cleared on logout

**Cookies**:
- Supabase sessions (HttpOnly, Secure flags)

---

# SECTION 9: DEPLOYMENT CONSIDERATIONS

## Production Configuration

1. **JWT_SECRET**: Must be set in Supabase project settings
2. **CSRF**: Should be enabled (currently configured)
3. **HTTPS**: Required in production
4. **CORS**: Limited to production frontend domains
5. **Rate Limiting**: Stricter limits in production vs development

## Environment Variables

**Production** (`/.env.production`):
- Minimal config
- All sensitive values from platform dashboards
- No test credentials

**Development** (`/.env`):
- Test database connection
- Demo credentials exposed
- Dev mode features enabled

---

# FINAL CHECKLIST: AUTHENTICATION SYSTEM COMPLETENESS

- [x] Authentication Provider Identified (Supabase + JWT)
- [x] Configuration Files Located (supabase/migrations, server/src/config)
- [x] API Endpoints Documented (8 endpoints, all with details)
- [x] Middleware/Guards Identified (5 types: auth, rbac, restaurantAccess, csrf, rate limiting)
- [x] User Roles Documented (8 roles: owner, manager, server, cashier, kitchen, expo, customer, admin)
- [x] Profile Schema Mapped (auth.users, user_profiles, user_restaurants)
- [x] Permissions Documented (Role-to-scope matrix provided)
- [x] RLS Policies Identified (7 policies in auth_tables migration)
- [x] Frontend Components Located (Login, DevAuthOverlay, ProtectedRoute)
- [x] Backend Logic Explained (Login/logout/PIN/station flows)
- [x] Database Tables Documented (8 tables with full schemas)
- [x] Test Infrastructure Reviewed (Unit, integration, E2E tests)
- [x] Test Users Found (Real Supabase users + demo fixtures)
- [x] Environment Config Complete (Server + client variables listed)
- [x] Security Measures Reviewed (JWT, rate limiting, multi-tenancy, RLS)

