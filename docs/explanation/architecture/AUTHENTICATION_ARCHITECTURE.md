# Authentication Architecture v6.0

**Last Updated:** 2025-11-19
**Architecture Evolution**: See [ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md) for the journey through 3 rewrites

[Home](../../../index.md) > [Docs](../../README.md) > [Explanation](../README.md) > [Architecture](../../../README.md) > Authentication Architecture

---

## 🚨 Important: Read This First

This authentication system is the result of **three complete rewrites over four months**. If you're modifying authentication code:

1. **Read [ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md)** to understand why the current architecture exists
2. **Review incident documentation** before making changes (especially CL-AUTH-001)
3. **Test both Supabase and localStorage auth paths** - we support both
4. **Never assume one auth method works for all use cases** - that's what caused Phase 2 to fail

---


## Authentication Evolution Note

This system has undergone 3 major authentication rewrites:
1. **Phase 1**: Custom JWT + RLS (July-Sept 2025)
2. **Phase 2**: Pure Supabase Auth (Oct 2025, failed)
3. **Phase 3**: Dual Authentication Pattern (Nov 2025, current)

See [ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md) for complete history.

## Overview

Restaurant OS v6.0 uses a **dual authentication pattern**:
- **Primary**: Supabase Auth for production web users (managers, owners, staff)
- **Secondary**: Custom JWT in localStorage for specialized use cases (voice ordering, demo mode, anonymous customers)

This hybrid approach emerged after discovering that no single authentication system can serve all restaurant OS requirements. See [ADR-011](../architecture-decisions/ADR-011-authentication-evolution.md) for the complete evolution story.

## System Architecture Context

**(Source: ARCHITECTURE.md@1b8a708, verified)**

**Database: Supabase with RLS**

Database uses Supabase with Row-Level Security (RLS) policies for multi-tenant isolation.

**Implementation:** `supabase/migrations/20251015_multi_tenancy_rls_and_pin_fix.sql`

**Payment Adapter: Square**

Square adapter handles payment processing.

**Implementation:** `server/src/routes/payments.routes.ts:28`

**API Convention: ADR-001**

API uses snake_case convention. POST `/orders` endpoint uses snake_case per ADR-001.

**Implementation:** `server/src/routes/payments.routes.ts:112`
```typescript
const { order_id, token, amount, idempotency_key } = req.body; // ADR-001: snake_case
```

---

## Architecture Principles

1. **Single Source of Truth**: Supabase manages production user authentication and session state
2. **Zero Redundancy**: Frontend authenticates directly with Supabase for email/password (no backend proxy)
3. **Dual Authentication Support** ([ADR-006](../architecture-decisions/ADR-006-dual-authentication-pattern.md)): httpClient checks Supabase sessions (primary) OR localStorage sessions (demo/PIN/station fallback)
4. **Separation of Concerns**: Different auth methods for different use cases (production vs development/shared devices)

---

## Roles & Scopes (v6.0.14+)

### Role Definitions Table

| Role | Who/Where | Typical Scopes | Can Update Orders? |
| --- | --- | --- | --- |
| customer | Public self-service/online/kiosk | menu:read, orders:create, orders:read, payments:process, ai.voice:chat | No |
| server | In-restaurant staff (ServerView) | menu:read, orders:create, orders:read, orders:update, orders:status, payments:process, tables:manage | Yes |

**Note:** Additional roles (owner, manager, kitchen, expo, cashier) exist for staff operations. See `server/src/middleware/rbac.ts:60-138` for complete role-scope mappings.

### Flows → Auth Mapping

Each client flow maps to a specific role:

- **Public Checkout** (`/order` → `/checkout`): `customer` role
- **Kiosk Components** (KioskCheckoutPage): `customer` role
- **ServerView** (voice ordering for dine-in): `server` role

### Headers

All order creation requests include:
- `Authorization: Bearer <JWT>` - Role encoded in token (`role: "customer"` or `role: "server"`)
- `X-Restaurant-ID: <uuid>` - Multi-tenant context
- `X-Client-Flow: online | kiosk | server` - Telemetry and flow-specific logic

### Alias & Deprecation Policy

**kiosk_demo → customer Alias:**
- `kiosk_demo` role is **DEPRECATED** as of v6.0.8
- Controlled by `AUTH_ACCEPT_KIOSK_DEMO_ALIAS` environment variable (default: `true`)
- When enabled: Tokens with `role: "kiosk_demo"` automatically aliased to `customer` with WARN log
- **Removal timeline:** After 30 consecutive days of zero kiosk_demo token usage, disable alias and remove from codebase
- **Migration status:** See [AUTH_ROLES.md](../../reference/config/AUTH_ROLES.md) for phase tracking

---

## Authentication Methods

### 1. Email/Password Login (Managers, Owners)
**Use Case**: Staff members with email accounts accessing web dashboard

**Flow**:
```
User enters credentials
    ↓
Frontend → Supabase.auth.signInWithPassword()
    ↓
Supabase validates credentials
    ↓
Frontend receives JWT + refresh token
    ↓
Frontend → Backend /api/v1/auth/me (with Supabase JWT)
    ↓
Backend validates JWT + fetches user role from database
    ↓
Frontend stores user data in React state
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `login()` function
- `server/src/middleware/auth.ts` - JWT validation
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/me` endpoint

**Session Storage**:
- Supabase automatically stores session in `localStorage` under key `sb-{project-ref}-auth-token`
- Session includes: `access_token`, `refresh_token`, `expires_at`, `user`

### 2. PIN Login (Servers, Cashiers)
**Use Case**: Staff members using shared devices without individual email accounts

**Flow**:
```
User enters PIN
    ↓
Frontend → Backend /api/v1/auth/pin-login
    ↓
Backend validates PIN against database
    ↓
Backend generates custom JWT (not Supabase)
    ↓
Frontend stores JWT in localStorage
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `loginWithPin()` function
- `server/src/services/auth/pinAuth.ts` - PIN validation
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/pin-login` endpoint

**Session Storage**:
- Custom format in `localStorage` under key `auth_session`
- JWT signed with `KIOSK_JWT_SECRET` (12-hour expiry)

### 3. Station Login (Kitchen Displays, Expo Screens)
**Use Case**: Stationary displays showing order queues

**Flow**:
```
Manager initiates station login
    ↓
Frontend → Backend /api/v1/auth/station-login (with manager JWT)
    ↓
Backend validates manager has permission
    ↓
Backend generates station JWT
    ↓
Display uses JWT for WebSocket + API access
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `loginAsStation()` function
- `server/src/services/auth/stationAuth.ts` - Station token management
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/station-login` endpoint

**Session Storage**:
- Custom format in `localStorage` under key `auth_session`
- JWT signed with `KIOSK_JWT_SECRET`

### 4. Demo Login (Development Only)
**Use Case**: Quick access to demo accounts in development/staging

**Flow**:
```
Developer clicks demo role button (e.g., "Server", "Kitchen")
    ↓
Frontend → loginAsDemo(role)
    ↓
Frontend → Backend /api/v1/auth/demo-session
    ↓
Backend generates custom JWT (not Supabase)
    ↓
Backend returns { token, expiresIn, user, restaurantId }
    ↓
Frontend stores in localStorage.auth_session (not Supabase)
    ↓
httpClient reads from localStorage on API calls (dual auth pattern)
```

**Files**:
- `client/src/contexts/AuthContext.tsx` - `loginAsDemo()` function (lines 328-375)
- `client/src/services/auth/demoAuth.ts` - Demo token fetching (deprecated by AuthContext)
- `server/src/routes/auth.routes.ts` - `/api/v1/auth/demo-session` endpoint
- `client/src/services/http/httpClient.ts` - Dual auth pattern (lines 109-148)

**Session Storage**:
- Custom format in `localStorage` under key `auth_session`
- JWT signed with `KIOSK_JWT_SECRET` (1-hour expiry)
- Format: `{ user, session: { accessToken, expiresAt, expiresIn }, restaurantId }`

**Requirements**:
- `VITE_DEMO_PANEL=1` environment variable (frontend)
- `DEMO_LOGIN_ENABLED=true` environment variable (backend)
- Demo users do NOT need to exist in Supabase Auth or database

**Key Difference from Email/Password**:
- Email/Password: Uses Supabase Auth, stores in Supabase localStorage
- Demo: Uses custom JWT, stores in custom localStorage format
- httpClient supports both via dual authentication pattern ([ADR-006](../architecture-decisions/ADR-006-dual-authentication-pattern.md))

---

## Session Management

### Frontend (React Context)

**State**:
```typescript
interface AuthState {
  user: User | null;              // Current user profile + role
  session: AuthSession | null;    // JWT tokens + expiry
  isLoading: boolean;             // Auth initialization status
  restaurantId: string | null;    // Current restaurant context
}
```

**Initialization** (`useEffect` in AuthProvider):
1. Check Supabase session (`supabase.auth.getSession()`)
2. If session exists → Fetch user details from `/api/v1/auth/me`
3. If no Supabase session → Check `localStorage` for PIN/station session
4. Set `isLoading = false`

**Auto-Refresh**:
- Supabase handles token refresh automatically
- Frontend listens to `onAuthStateChange` events
- Manual refresh via `refreshSession()` (5 minutes before expiry)

### Backend (Express Middleware)

**JWT Validation** (`authenticate` middleware):
```typescript
// Extract token from Authorization header
const token = req.headers.authorization?.replace('Bearer ', '');

// Try KIOSK_JWT_SECRET first (for PIN/station tokens)
// Fall back to SUPABASE_JWT_SECRET (for email/password tokens)
const decoded = jwt.verify(token, secret);

// Attach user info to request
req.user = {
  id: decoded.sub,
  role: decoded.role,
  scopes: decoded.scope,
  restaurant_id: decoded.restaurant_id
};
```

**Authorization** (`requireRole`, `requireScope` middleware):
- Checks `req.user.role` against allowed roles
- Checks `req.user.scopes` against required scopes

---

## HTTP Client Integration

### Dual Authentication Pattern (ADR-006)

`client/src/services/http/httpClient.ts` implements a **dual authentication pattern** to support both Supabase sessions (production) and localStorage sessions (demo/PIN/station):

```typescript
async request(endpoint, options) {
  // 1. Try Supabase session first (primary, production-ready)
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
    // Supabase session found - production auth
  } else {
    // 2. Fallback to localStorage for demo/PIN/station authentication
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.session?.accessToken && parsed.session?.expiresAt) {
          // Validate token hasn't expired
          if (parsed.session.expiresAt > Date.now() / 1000) {
            headers.set('Authorization', `Bearer ${parsed.session.accessToken}`);
            // localStorage session found - demo/PIN/station auth
          }
        }
      } catch (error) {
        // Invalid session format - log and continue without auth
      }
    }
  }

  // 3. Add restaurant ID header (multi-tenancy)
  headers.set('x-restaurant-id', restaurantId);

  // 4. Make request
  return super.request(endpoint, { headers, ...options });
}
```

**Authentication Priority**:
1. **Primary**: Supabase session (email/password login - production-ready)
2. **Fallback**: localStorage session (demo/PIN/station login - development/testing)

**Implementation Details**:
- Lines 109-148 in `client/src/services/http/httpClient.ts`
- See [ADR-006](../architecture-decisions/ADR-006-dual-authentication-pattern.md) for rationale and tradeoffs

---

## Database Schema

### Users Table (Supabase Auth)
Managed by Supabase - stores authentication credentials.

### `user_profiles` Table
```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  phone TEXT,
  employee_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### `user_restaurants` Table
```sql
CREATE TABLE user_restaurants (
  user_id UUID REFERENCES auth.users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  role TEXT NOT NULL,  -- 'owner', 'manager', 'server', 'kitchen', 'expo', 'cashier'
  is_active BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, restaurant_id)
);
```

### `role_scopes` Table
```sql
CREATE TABLE role_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  scope_name TEXT REFERENCES api_scopes(scope_name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, scope_name)
);
```

**IMPORTANT: Dual-Source Scope Architecture**

Scopes are defined in TWO places for different purposes:

1. **Database (`role_scopes` table)**:
   - Used by client-side authorization (`canAccess()`)
   - Queried during login to populate user object
   - Provides flexibility for runtime scope changes

2. **Hardcoded (`server/src/middleware/rbac.ts` - ROLE_SCOPES constant)**:
   - Used by server-side API protection (`requireScopes()` middleware)
   - Avoids database queries on every API request (performance)
   - Provides compile-time type safety

⚠️ **These MUST be kept in sync manually**. If you update scopes in the database, also update `rbac.ts`.

Example scopes:
- `orders:create`, `orders:read`, `orders:update`, `orders:delete`, `orders:status`
- `menu:manage`
- `tables:manage`
- `payments:process`, `payments:refund`, `payments:read`
- `staff:manage`, `staff:schedule`
- `reports:view`, `reports:export`
- `system:config`

---

## Security Considerations

### Environment Variables

**Frontend** (`.env`):
```bash
VITE_SUPABASE_URL=https://{project}.supabase.co
VITE_SUPABASE_ANON_KEY={anon_key}
VITE_DEMO_PANEL=1  # Development only
```

**Backend** (`.env`):
```bash
SUPABASE_URL=https://{project}.supabase.co
SUPABASE_ANON_KEY={anon_key}
SUPABASE_JWT_SECRET={jwt_secret}  # For validating Supabase JWTs
KIOSK_JWT_SECRET={custom_secret}  # For PIN/station JWTs
STRICT_AUTH=true  # Disable test tokens in production
```

### JWT Signing Secrets

1. **Supabase JWT Secret**: Used by Supabase to sign access tokens
   - Found in Supabase Dashboard → Settings → API
   - Backend validates email/password login tokens with this

2. **Kiosk JWT Secret**: Custom secret for PIN/station tokens
   - Generated by you, stored in backend environment
   - Backend signs PIN/station tokens with this

### Token Expiry

| Auth Method | Access Token TTL | Refresh Token TTL | Auto-Refresh |
| --- | --- | --- | --- |
| Email/Password | 1 hour | 30 days | ✅ Supabase auto-refresh |
| PIN Login | 12 hours | N/A | ❌ Re-login required |
| Station Login | 7 days | N/A | ❌ Re-login required |

### CORS Configuration

Backend allows specific origins only:
```typescript
const allowedOrigins = [
  'http://localhost:5173',       // Local dev
  'https://july25-client.vercel.app',  // Production
  // ... add staging/preview URLs as needed
];
```

---

## Middleware Patterns & Ordering

### Critical Dependency Chain

Express middleware executes in the order specified in route definitions. For protected routes with RBAC (Role-Based Access Control), **middleware order is CRITICAL** and must follow this pattern:

```
1. authenticate         → Sets req.user from JWT
2. validateRestaurantAccess → Sets req.restaurantId from header + validates access
3. requireScopes(...)      → Checks permissions (needs BOTH user AND restaurantId)
4. validateBody(...)       → Validates request payload (optional, for POST/PATCH)
```

**Why This Order Matters:**

The `requireScopes()` middleware at `server/src/middleware/rbac.ts:202` performs this check:

```typescript
const restaurantId = req.restaurantId;
if (!restaurantId) {
  return next(Forbidden('Restaurant context required')); // ❌ Fails here if undefined
}
```

If `validateRestaurantAccess` runs AFTER `requireScopes`, then `req.restaurantId` will be `undefined`, causing a **403 Forbidden "Restaurant context required"** error even for authenticated users with correct permissions.

### Correct Pattern ✅

**Example:** `server/src/routes/payments.routes.ts:104-109`

```typescript
router.post('/create',
  authenticate,                              // 1. Verify JWT, set req.user
  validateRestaurantAccess,                  // 2. Extract + validate restaurant ID
  requireScopes(ApiScope.PAYMENTS_PROCESS),  // 3. Check permissions
  validateBody(PaymentPayload),              // 4. Validate request body
  async (req: AuthenticatedRequest, res, next) => {
    // Route handler - all dependencies satisfied
    const restaurantId = req.restaurantId!;  // ✅ Safe to use
    // ...
  }
);
```

**Example:** `server/src/routes/orders.routes.ts:40` (after fix in commit 0ad5c77a)

```typescript
router.post('/',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.ORDERS_CREATE),
  validateBody(OrderPayload),
  async (req: AuthenticatedRequest, res, next) => {
    // Route handler
  }
);
```

### Anti-Pattern ❌ (What NOT to Do)

**WRONG - requireScopes before validateRestaurantAccess:**

```typescript
router.post('/orders',
  authenticate,
  requireScopes(ApiScope.ORDERS_CREATE),     // ❌ WRONG ORDER
  validateRestaurantAccess,                  // ❌ Too late - restaurantId not set yet
  async (req: AuthenticatedRequest, res) => {
    // This code never runs - middleware fails at requireScopes
  }
);
```

**Result:**
- ❌ Client receives: `403 Forbidden - Restaurant context required`
- ❌ Stack trace points to: `server/src/middleware/rbac.ts:202`
- ❌ User has correct permissions but middleware order prevents validation

**This exact bug occurred twice:**
- Fixed in commit `e4880003` (removed incorrect middleware)
- Fixed in commit `0ad5c77a` (corrected middleware order)

### Error Symptoms

If middleware is out of order, you'll see these symptoms:

**1. Backend Logs:**
```
WARN: User lacks required scope
userId: abc123
userRole: server
requiredScopes: [ 'orders:create' ]
userScopes: []  ← Empty because restaurant context missing
```

**2. Client Response:**
```json
{
  "error": "Restaurant context required",
  "code": "FORBIDDEN"
}
```

**3. Stack Trace:**
```
ForbiddenError: Restaurant context required
  at requireScopes (server/src/middleware/rbac.ts:202)
  at Layer.handle [as handle_request]
```

### Common Mistakes Checklist

When adding a new protected route, avoid these mistakes:

- [ ] ❌ **Putting requireScopes before validateRestaurantAccess**
  - Fix: Always put validateRestaurantAccess BEFORE requireScopes

- [ ] ❌ **Forgetting validateRestaurantAccess entirely**
  - Fix: Every route using requireScopes needs validateRestaurantAccess first

- [ ] ❌ **Copying middleware from old code without checking order**
  - Fix: Always use payments.routes.ts or orders.routes.ts as reference

- [ ] ❌ **Adding custom middleware between authenticate and validateRestaurantAccess**
  - Fix: Keep these two adjacent unless your middleware doesn't need req.user

- [ ] ❌ **Testing only with admin role (which bypasses scope checks)**
  - Fix: Test with server, kitchen, or customer roles to catch permission issues

### Middleware Reference

**authenticate** (`server/src/middleware/auth.ts`)
- Verifies JWT token from `Authorization: Bearer <token>` header
- Supports both Supabase JWTs and custom JWTs (PIN/station/demo)
- Sets `req.user = { id, role, email, restaurant_id }`
- **Does NOT set `req.restaurantId`** (by design - security separation)

**validateRestaurantAccess** (`server/src/middleware/restaurantAccess.ts`)
- Extracts restaurant ID from `X-Restaurant-ID` header
- Validates user has access to that restaurant (queries `user_restaurants` table)
- Sets `req.restaurantId` after validation succeeds
- Returns 403 if user doesn't have access to restaurant

**requireScopes(...scopes)** (`server/src/middleware/rbac.ts`)
- Checks if user has at least one of the required scopes
- **Requires both `req.user` AND `req.restaurantId` to be set**
- Looks up user's role in restaurant (via `user_restaurants` table)
- Maps role to scopes (via `ROLE_SCOPES` constant)
- Returns 403 if user lacks required permissions

**validateBody(schema)** (`server/src/middleware/validate.ts`)
- Validates request body against Zod schema
- Returns 400 with validation errors if invalid
- Sets `req.validated` with parsed data
- Should run AFTER authentication/authorization checks

### Debugging Middleware Issues

If you suspect middleware ordering issues:

**1. Check route definition:**
```typescript
// Find the route in server/src/routes/*.routes.ts
// Verify middleware order matches the pattern above
```

**2. Check backend logs:**
```bash
# Look for these log messages:
grep "Restaurant access validated" logs/server.log  # validateRestaurantAccess succeeded
grep "RBAC check passed" logs/server.log            # requireScopes succeeded
grep "Restaurant context required" logs/server.log  # Middleware order issue
```

**3. Test with curl:**
```bash
# Get token
TOKEN=$(curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"server@restaurant.com","password":"Demo123!"}' \
  | jq -r '.session.accessToken') |

# Test endpoint WITH proper headers
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json" \
  -d '{"items":[...]}'

# If this works but browser requests fail, check if X-Restaurant-ID header is being sent
```

**4. Compare with working routes:**
```bash
# payments.routes.ts:104-109 is the canonical correct pattern
# orders.routes.ts:40 was fixed in commit 0ad5c77a
# auth.routes.ts:359 shows pattern for GET routes
```

### Related Documentation

- **RBAC Dual-Source Architecture:** See section "Database Schema" above (line 334-368)
- **Investigation Report:** `docs/investigations/workspace-auth-fix-2025-10-29.md`
- **Troubleshooting:** `docs/how-to/troubleshooting/TROUBLESHOOTING.md` (403 Errors section)

---

## Migration from v5.0

### What Changed

**Before (v5.0)**:
- Frontend called backend `/api/v1/auth/login` endpoint
- Backend authenticated with Supabase, returned session
- Frontend set Supabase session from backend response
- **Problem**: Race condition between session creation and navigation

**After (v6.0)**:
- Frontend authenticates directly with Supabase
- Backend only validates JWTs and provides user metadata
- **Benefit**: No race conditions, simpler flow, faster login

### Breaking Changes

- ❌ **Removed**: `POST /api/v1/auth/login` endpoint
- ❌ **Removed**: `POST /api/v1/auth/refresh` endpoint
- ✅ **Kept**: `GET /api/v1/auth/me` (for fetching user profile)
- ✅ **Kept**: PIN and Station auth (separate use cases)

### Migration Steps for Existing Code

If you have code calling the old backend endpoints:

```typescript
// OLD (v5.0)
const response = await httpClient.post('/api/v1/auth/login', {
  email,
  password,
  restaurantId
});

// NEW (v6.0)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

const response = await httpClient.get('/api/v1/auth/me');
```

---

## Testing

### Demo Accounts

Seeded in Supabase Auth + database:

| Email | Password | Role | Use Case |
| --- | --- | --- | --- |
| manager@restaurant.com | Demo123! | manager | Dashboard access, staff management |
| server@restaurant.com | Demo123! | server | Table management, order taking |
| kitchen@restaurant.com | Demo123! | kitchen | Kitchen queue display |
| expo@restaurant.com | Demo123! | expo | Expo station, order assembly |
| cashier@restaurant.com | Demo123! | cashier | POS, payment processing |

### Manual Testing

1. **Email/Password Login**:
   ```bash
   # Open browser console
   # Click demo "Server" button
   # Should see logs:
   # - "🔐 Attempting Supabase login"
   # - "✅ Supabase authentication successful"
   # - "✅ Login complete"
   ```

2. **Session Persistence**:
   ```bash
   # Login as server
   # Refresh page
   # Should stay logged in (session restored from Supabase)
   ```

3. **Role Authorization**:
   ```bash
   # Login as server
   # Navigate to /server → ✅ Allowed
   # Navigate to /manager → ❌ Redirected to /unauthorized
   ```

### Automated Tests

```bash
# Backend tests
cd server
npm test -- auth.test.ts

# Frontend tests (TODO)
cd client
npm test -- AuthContext.test.tsx
```

---

## Troubleshooting

### "Auth loading timeout - forcing completion after 5s"

**Removed in v6.0** - This was a symptom of the old backend login race condition.

### "Failed to fetch user details"

**Cause**: Backend `/api/v1/auth/me` endpoint failed

**Solutions**:
1. Check backend is running (`http://localhost:3001/api/v1/health`)
2. Check Supabase session exists (`localStorage.getItem('sb-{project}-auth-token')`)
3. Check backend logs for JWT validation errors

### "Invalid token" on backend

**Causes**:
1. Wrong `SUPABASE_JWT_SECRET` in backend `.env`
2. Token expired (check `expires_at` in localStorage)
3. User doesn't exist in `user_restaurants` table

**Solutions**:
1. Verify JWT secret matches Supabase dashboard
2. Logout and login again
3. Run database seed script

### Demo login fails with "User not found"

**Cause**: Demo users not seeded in database

**Solution**:
```bash
cd server
npm run seed:demo-users
```

---

## Future Improvements

### Short-term
- [ ] Add refresh token rotation for enhanced security
- [ ] Implement session activity logging
- [ ] Add 2FA for owner accounts

### Medium-term
- [ ] Migrate PIN auth to Supabase custom auth flow
- [ ] Add biometric authentication for mobile
- [ ] Implement IP-based access controls

### Long-term
- [ ] Multi-restaurant SSO
- [ ] OAuth integration (Google, Apple)
- [ ] Hardware token support (YubiKey)

---

## Dual Authentication Pattern

Restaurant OS implements a dual authentication system to support both production and development environments.

**For complete details, see [ADR-006: Dual Authentication Pattern](../architecture-decisions/ADR-006-dual-authentication-pattern.md)**

### Quick Summary
- **Production**: Supabase JWT (secure, RLS-enforced)
- **Development**: JWT fallback (flexible, bypasses RLS)
- **Migration Path**: Documented in ADR-006

### Key Benefits
- Zero downtime migration
- Environment-specific security
- Backward compatibility maintained

---

## Order Flow Auth Touchpoints

**(Source: ORDER_FLOW.md@1b8a708, verified)**

### Order Creation Endpoint

**POST /api/v1/orders**

**Implementation:** `server/src/routes/orders.routes.ts:38`

**Authentication:** JWT authentication required on all `/api/v1/*` routes. Restaurant context extracted from token.

**Implementation:** `server/src/middleware/auth.ts`
- Authentication middleware enforced
- JWT validation
- Restaurant context from token

### Menu Items Endpoint

**GET /api/v1/menu/items**

**Implementation:** `server/src/routes/menu.routes.ts:23`
- Restaurant ID filtering confirmed
- Response format matches documentation

### Server-Side Amount Validation

Server NEVER trusts client-provided amounts. Always recalculates totals server-side.

**Implementation:**
- `server/src/routes/orders.routes.ts` - Server calculates totals independently
- `server/src/routes/payments.routes.ts:132` - `PaymentService.validatePaymentRequest()`
- Throws error if client/server amounts mismatch by >1 cent

### Order Statuses

Order lifecycle statuses: `new`, `pending`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`

**Implementation:** `shared/types/order.types.ts:6`

### Payment Integration

Payment integration with Square API. Audit trail logging confirmed.

**Implementation:** `server/src/routes/payments.routes.ts`

---

<a id="voice--webrtc-auth-and-websocket-jwt"></a>

## Voice & WebRTC Auth and WebSocket JWT

**(Source: voice/VOICE_ORDERING_EXPLAINED.md@1b8a708, verified)**

### Architecture (Updated October 2025)

The voice ordering system uses a modular service architecture:

#### WebRTCVoiceClient (Orchestrator)
- Public API entry point
- Coordinates 3 specialized services
- Manages overall voice ordering lifecycle
- Lines of code: 396 (down from 1,312)

**Implementation:** `client/src/modules/voice/services/WebRTCVoiceClient.ts:42`
```typescript
export class WebRTCVoiceClient extends EventEmitter
```

#### VoiceSessionConfig
- **Responsibility**: Session configuration and token management
- **Key Methods**: buildSessionConfig(), fetchEphemeralToken(), scheduleTokenRefresh()
- **Features**: AI instructions, tool definitions, auto-refresh tokens
- **Tests**: 31 unit tests

#### WebRTCConnection
- **Responsibility**: WebRTC connection lifecycle
- **Key Methods**: connect(), disconnect(), setupMicrophone(), cleanup()
- **Features**: Media stream management, memory leak prevention
- **Tests**: 43 unit tests (including 6 memory leak tests)

#### VoiceEventHandler
- **Responsibility**: Process realtime API events
- **Key Methods**: 19 focused event handlers (replaced 313-line switch)
- **Features**: Event deduplication, transcript accumulation, order detection
- **Tests**: 44 unit tests

### WebRTC Voice Streaming

WebRTC used for voice streaming between client and OpenAI Realtime API.

### useWebRTCVoice Hook

React hook for voice functionality integration: `useWebRTCVoice()`

**Implementation:** `client/src/modules/voice/hooks/useWebRTCVoice.ts:38`

### VoiceControlWebRTC Component

Hold-to-talk UI component for voice ordering.

**Implementation:** `client/src/modules/voice/components/VoiceControlWebRTC.tsx:42`

### Testing

The voice ordering system has comprehensive test coverage:
- **155 total tests** (37 regression + 118 unit)
- **Regression tests**: Prevent Oct 2025 bugs from recurring
- **Unit tests**: Validate service isolation and responsibilities
- **Integration tests**: Voice order flow end-to-end

---

## Authentication Evolution History

The current architecture is **Version 3** of the authentication system. Understanding this evolution helps explain architectural decisions:

### Version 1 (July-September 2025): Custom JWT + RLS
- **Approach**: Custom JWT generation, backend-controlled sessions
- **Problems**: Race conditions, demo mode complexity, security vulnerabilities
- **Key Issues**: Multi-tenancy breach (October 25), WebSocket auth gaps, test token bypasses
- **Outcome**: Failed - too many security incidents

### Version 2 (October 8, 2025): Pure Supabase Auth
- **Approach**: Eliminate custom JWT, use Supabase exclusively
- **Benefits**: No race conditions, simpler codebase, secure by default
- **Problems**: Broke voice ordering, blocked anonymous customers, no PIN auth support
- **Duration**: 3 weeks (October 8 - November 2)
- **Outcome**: Failed - couldn't support all use cases

### Version 3 (November 2-18, 2025): Dual Authentication Pattern (Current)
- **Approach**: Supabase for staff + Custom JWT for specialized cases
- **Implementation**: httpClient checks both auth sources with priority fallback
- **Benefits**: Supports all use cases, production-ready security, no race conditions
- **Trade-offs**: Slightly more complex, requires clear boundaries
- **Status**: ✅ Production-ready (90% system readiness)

**📚 Complete Story**: [ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md) documents the full 4-month journey with detailed lessons learned.

---

## Critical Lessons from 3 Rewrites

### ⚠️ Lesson 1: One Auth System Cannot Serve All Use Cases
**Failed Assumption**: "Use Supabase Auth exclusively for simplicity"
**Reality**: Different use cases require different auth approaches (staff vs. customers vs. devices)
**Current Approach**: Multiple auth methods with clear boundaries

### ⚠️ Lesson 2: Demo Mode Must Mirror Production
**Failed Pattern**: Parallel demo infrastructure with different code paths
**Problem**: Demo bugs didn't appear until production
**Current Approach**: Demo uses real Supabase users with pre-filled credentials

### ⚠️ Lesson 3: WebSocket Authentication Is Not an Afterthought
**Security Gap**: HTTP middleware doesn't apply to WebSocket connections
**Incident**: Kitchen Display WebSocket connections allowed without JWT validation (October 24, 2025)
**Current Approach**: Dedicated WebSocket auth middleware at connection establishment

### ⚠️ Lesson 4: Multi-Tenancy Requires Defense in Depth
**Security Incident**: Users could access other restaurants' data (October 25, 2025)
**Root Cause**: Missing restaurant_id validation in middleware
**Current Approach**: Validation at JWT, middleware, and RLS policy layers

### ⚠️ Lesson 5: Test Tokens in Production Are Dangerous
**Anti-Pattern**: `if (token === 'test-token') { /* skip validation */ }`
**Risk**: Forgotten environment variables can enable security backdoors
**Current Approach**: Real JWTs in all environments, STRICT_AUTH enforced

**📚 Full Analysis**: See [ADR-011](../architecture-decisions/ADR-011-authentication-evolution.md) sections "Lessons Learned" and "Production Security Posture"

---

## Related Documentation

- **[ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md)** - Complete 3-rewrite history (MUST READ)
- **[ADR-006: Dual Authentication Pattern](../architecture-decisions/ADR-006-dual-authentication-pattern.md)** - Current implementation details
- **[Auth Roles](../../reference/config/AUTH_ROLES.md)** - Role definitions and scope mappings
- **[Security Policies](../../SECURITY.md)** - Security practices and incident response
- **[API Reference](../../reference/api/api/README.md)** - API authentication endpoints
- **[Troubleshooting Auth Issues](../../how-to/troubleshooting/AUTH_DIAGNOSTIC_GUIDE.md)** - Auth debugging guide
- **[Git History Narrative](../../../nov18scan/01_git_history_narrative.md)** - Complete commit analysis

---

## Contact & Contributing

For questions about authentication architecture:
- **Documentation**: This file, ADR-011, and inline code comments
- **Issues**: GitHub Issues with `auth` label
- **Security Concerns**: See [SECURITY.md](../../SECURITY.md) for vulnerability reporting

**Before Modifying Authentication**:
1. Read [ADR-011](../architecture-decisions/ADR-011-authentication-evolution.md) to understand the evolution
2. Review relevant incidents (CL-AUTH-001, multi-tenancy breach, WebSocket gaps)
3. Test both Supabase and localStorage auth paths
4. Update this documentation if making architectural changes
