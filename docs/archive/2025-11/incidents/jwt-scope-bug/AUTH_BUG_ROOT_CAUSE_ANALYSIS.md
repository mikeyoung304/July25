# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: JWT Scope Bug Investigation

---

# Authentication Bug - Root Cause Analysis
**Date**: January 12, 2025
**Issue**: Server role gets 401 "Missing required scope: orders:create"
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

**The Bug**: Users with the "server" role cannot submit orders despite having correct permissions in the database.

**Root Cause**: JWT tokens generated during login DO NOT include the `scope` field, but the authentication middleware and order routes expect it.

**Impact**: CRITICAL - All role-based authorization is broken. Only affects authenticated endpoints that check scopes directly in route handlers.

---

## The Investigation

### Database State ✅ CORRECT

Verified production database scopes for server role:
```sql
SELECT role, scope FROM public.role_scopes WHERE role = 'server';

 role  |      scope
--------+------------------
 server | orders:create    ← Present!
 server | orders:read
 server | orders:status
 server | orders:update
 server | payments:process
 server | payments:read
 server | tables:manage
```

**Conclusion**: Database configuration is correct.

---

### User Record ✅ CORRECT

```sql
SELECT id, email, raw_user_meta_data FROM auth.users
WHERE email = 'server@restaurant.com';

id: b764e66c-0524-4d9b-bd62-bae0de920cdb
email: server@restaurant.com
role: server (in metadata)
```

```sql
SELECT user_id, restaurant_id, role FROM public.user_restaurants
WHERE user_id = 'b764e66c-0524-4d9b-bd62-bae0de920cdb';

user_id: b764e66c-0524-4d9b-bd62-bae0de920cdb
restaurant_id: 11111111-1111-1111-1111-111111111111
role: server
is_active: true
```

**Conclusion**: User is properly configured with server role.

---

### JWT Payload ❌ MISSING SCOPES FIELD

**File**: `server/src/routes/auth.routes.ts`

#### Regular Login (lines 147-155):
```typescript
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
  // ❌ NO 'scope' FIELD!
};

const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
```

#### Scopes are Returned in Response Body (lines 76-85, 160-169):
```typescript
// Fetch user scopes from role_scopes table
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', result.role);

const scopes = scopesData?.map(s => s.scope) || [];

// ❌ Scopes returned in response, but NOT in JWT
res.json({
  user: {
    id: authData.user.id,
    email: authData.user.email,
    role: userRole.role,
    scopes  // ← Returned here, but not in JWT!
  },
  session: {
    access_token: authData.session?.access_token,  // ← This JWT doesn't contain scopes!
    ...
  }
});
```

---

### Auth Middleware Expects `scope` in JWT ❌

**File**: `server/src/middleware/auth.ts` (line 99)

```typescript
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: userRole,
  scopes: decoded.scope || [],  // ← Looks for 'scope' in JWT
  restaurant_id: decoded.restaurant_id,
};
```

**Result**: `req.user.scopes` is set to `[]` (empty array) because `decoded.scope` doesn't exist.

---

### Order Route Checks Scopes BEFORE RBAC Middleware ❌

**File**: `server/src/routes/orders.routes.ts` (lines 67-70)

```typescript
// Check scopes for staff users
const userScopes = req.user.scopes || [];  // ← Gets empty array from auth middleware
if (!userScopes.includes(ApiScope.ORDERS_CREATE)) {
  throw Unauthorized('Missing required scope: orders:create');  // ← Throws this error!
}
```

**Result**: 401 Unauthorized error because `req.user.scopes` is `[]`

---

## Why RBAC Middleware Doesn't Help

**File**: `server/src/middleware/rbac.ts` (lines 304, 323)

```typescript
// Get scopes for user's role
const userScopes = getScopesForRole(userRole);  // ← Fetches from ROLE_SCOPES constant

// Store user's role and scopes in request
req.user.scopes = userScopes;  // ← WOULD fix req.user.scopes
```

**The Problem**: The RBAC middleware WOULD set `req.user.scopes` correctly from the ROLE_SCOPES constant, BUT:
1. The order route checks scopes in the route handler
2. Route handlers run AFTER middleware
3. BUT the scope check happens at the START of the route handler
4. If the route uses `requireScopes()` middleware, it would work
5. But this route does a manual check instead

---

## The Bug Flow

```
1. User logs in
   ↓
2. Backend fetches scopes from role_scopes table ✓
   ↓
3. Backend generates JWT WITHOUT scope field ❌
   ↓
4. Backend returns JWT + scopes in response body
   ↓
5. Client stores JWT (no scopes inside) + scopes separately
   ↓
6. Client makes API request with JWT
   ↓
7. Auth middleware extracts decoded.scope → []  ❌
   Sets req.user.scopes = []
   ↓
8. Order route checks req.user.scopes.includes('orders:create')  ❌
   Finds false
   ↓
9. Throws 401 Unauthorized
```

---

## The Fix

### Option 1: Add `scope` to JWT Payload (RECOMMENDED)

**File**: `server/src/routes/auth.routes.ts`

#### For Regular Login (around line 147):
```typescript
// Fetch scopes BEFORE creating JWT
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', userRole.role);

const scopes = scopesData?.map(s => s.scope) || [];

const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADD THIS
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};
```

#### For PIN Login (around line 147):
```typescript
// Fetch scopes BEFORE creating JWT
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', result.role);

const scopes = scopesData?.map(s => s.scope) || [];

const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADD THIS
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
};
```

---

### Option 2: Use RBAC Middleware Consistently

**File**: `server/src/routes/orders.routes.ts`

**Current**:
```typescript
router.post('/',
  authenticate,
  validateRestaurantAccess,
  validateRequest(createOrderSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Manual scope check ❌
    const userScopes = req.user.scopes || [];
    if (!userScopes.includes(ApiScope.ORDERS_CREATE)) {
      throw Unauthorized('Missing required scope: orders:create');
    }
    ...
  }
);
```

**Fixed**:
```typescript
router.post('/',
  authenticate,
  validateRestaurantAccess,
  requireScopes([ApiScope.ORDERS_CREATE]),  // ✅ Use RBAC middleware
  validateRequest(createOrderSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // No manual check needed - middleware handles it
    ...
  }
);
```

---

## Recommended Solution

**Use BOTH approaches**:

1. **Add `scope` to JWT** (Option 1) - This is architecturally correct
   - JWT should be self-contained
   - Reduces database queries on every request
   - Matches JWT best practices

2. **Refactor routes to use RBAC middleware** (Option 2) - This is cleaner code
   - Centralized authorization logic
   - Consistent scope enforcement
   - Leverages ROLE_SCOPES constant as fallback

---

## Why This Bug Exists

Looking at the code history, this appears to be a **refactoring artifact**:

1. Originally, scopes were probably returned in response body for client-side checks only
2. Later, backend route handlers were added that check scopes server-side
3. But the JWT payload was never updated to include scopes
4. The RBAC middleware was added to fix this, but not all routes use it

**Evidence**:
- Lines 75-85 of auth.routes.ts show scopes being fetched and returned
- Line 99 of auth.ts expects `decoded.scope` (someone knew it should be there)
- rbac.ts has comprehensive scope management (added later as a band-aid)

---

## Testing the Fix

After implementing Option 1, test with:

1. **Decode the JWT**:
```bash
# Get JWT from login response
JWT="<access_token>"

# Decode (use jwt.io or):
echo $JWT | cut -d'.' -f2 | base64 -d | jq .

# Should see:
{
  "sub": "b764e66c-0524-4d9b-bd62-bae0de920cdb",
  "email": "server@restaurant.com",
  "role": "server",
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "scope": [           ← ✅ THIS SHOULD BE PRESENT
    "orders:create",
    "orders:read",
    "orders:status",
    "orders:update",
    "payments:process",
    "payments:read",
    "tables:manage"
  ],
  "iat": 1736718713,
  "exp": 1736747513
}
```

2. **Test order submission**:
```bash
curl -X POST https://july25-server.onrender.com/api/v1/orders \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"menu_item_id": "...", "quantity": 1}],
    "table_number": "1",
    "seat_number": 1
  }'

# Should return 201 Created instead of 401 Unauthorized
```

---

## Files to Modify

1. **server/src/routes/auth.routes.ts** (lines 50-114 and 120-180)
   - Add scope field to JWT payload in both login endpoints

2. **server/src/routes/orders.routes.ts** (OPTIONAL but recommended)
   - Replace manual scope checks with `requireScopes()` middleware

3. **All route files** (OPTIONAL cleanup)
   - Search for manual `req.user.scopes.includes()` checks
   - Replace with `requireScopes()` middleware

---

## Impact Analysis

**Who is affected**:
- ✅ Server role - BLOCKED (confirmed)
- ❓ Kitchen role - Likely blocked for status updates
- ❓ Cashier role - Likely blocked for payment processing
- ❓ Manager role - Likely affected for some operations
- ❓ Owner role - Likely affected for some operations

**What works**:
- ✅ Authentication (login succeeds)
- ✅ Public/unauthenticated endpoints
- ✅ Routes that use `requireScopes()` middleware (if any)
- ✅ Client-side authorization (scopes in response body)

**What's broken**:
- ❌ Any route with manual scope checks (like orders.routes.ts:67-70)
- ❌ Order creation
- ❌ Possibly payment processing
- ❌ Possibly kitchen status updates

---

## Estimated Fix Time

- **Option 1 only**: 15 minutes (add 2 lines of code + test)
- **Option 1 + Option 2**: 60 minutes (refactor all route scope checks)
- **Full cleanup**: 2 hours (audit all routes + add tests)

---

## Additional Findings

### Why Demo Panel Might Work Differently

Looking at `client/src/contexts/AuthContext.tsx:310`, the demo mode sets:
```typescript
scopes: ['orders:read', 'orders:status']
```

This suggests the client stores scopes separately from the JWT. The client's `hasScope()` function (line 457) checks these stored scopes, not the JWT.

**This means**:
- ✅ Client-side authorization might work (checks stored scopes)
- ❌ Backend authorization fails (checks JWT scopes)

---

**Report Complete**
