# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../../README.md)
> Category: JWT Scope Bug Investigation

---

# Authentication Scope Flow - Detailed Architecture Diagram

## Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT REQUEST LIFECYCLE - HOW SCOPES ARE POPULATED              │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: LOGIN (Initial Authentication)
════════════════════════════════════════════════════════════════════

┌─────────────┐
│   CLIENT    │
│ POST /login │
├─────────────┤
│ email       │
│ password    │
│ restaurantId│
└──────┬──────┘
       │
       v
┌──────────────────────────────────────────┐
│ POST /api/v1/auth/login (auth.routes.ts) │
└──────────┬───────────────────────────────┘
           │
           ├─► Step 1: Supabase Email Auth
           │   supabaseAuth.auth.signInWithPassword()
           │   ✓ Returns: { user, session }
           │
           ├─► Step 2: Get User's Restaurant Role
           │   Query: SELECT role FROM user_restaurants
           │   WHERE user_id = ? AND restaurant_id = ?
           │   ✓ Returns: { role: 'manager' }
           │
           ├─► Step 3: GET SCOPES FROM DATABASE ⭐
           │   │
           │   ├─► Query: SELECT scope FROM role_scopes
           │   │   WHERE role = 'manager'
           │   │
           │   ├─► Returns: [
           │   │     { scope: 'orders:create' },
           │   │     { scope: 'orders:read' },
           │   │     { scope: 'payments:process' },
           │   │     ...
           │   │   ]
           │   │
           │   └─► Extract: scopes = data?.map(s => s.scope)
           │       Result: ['orders:create', 'orders:read', ...]
           │
           └─► Step 4: Return to Client
               Response:
               {
                 "user": {
                   "id": "user-123",
                   "email": "manager@example.com",
                   "role": "manager",
                   "scopes": ["orders:create", "orders:read", ...]  ← SCOPES SENT
                 },
                 "session": {
                   "access_token": "eyJhbGc...",
                   "refresh_token": "...",
                   "expires_in": 3600
                 }
               }

┌──────────────────────────────────────────┐
│ CLIENT (BROWSER/APP)                     │
├──────────────────────────────────────────┤
│ Stores in localStorage:                  │
│ - access_token (JWT)                     │
│ - refresh_token                          │
│ - user { id, email, role, scopes }       │
│ - restaurantId                           │
└──────────────────────────────────────────┘


PHASE 2: SUBSEQUENT REQUESTS (API Calls)
════════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────┐
│ CLIENT SENDS REQUEST                     │
├──────────────────────────────────────────┤
│ GET /api/v1/orders                       │
│                                          │
│ Headers:                                 │
│ Authorization: Bearer eyJhbGc...         │ ← JWT Token
│ X-Restaurant-ID: restaurant-123          │
└──────┬───────────────────────────────────┘
       │
       v
┌──────────────────────────────────────────────────────────┐
│ MIDDLEWARE CHAIN                                         │
└──────────────────────────────────────────────────────────┘

   ┌─ Step 1: authenticate() middleware (auth.ts:23-115) ─┐
   │                                                       │
   │ ├─► Extract Authorization header                     │
   │ │   Token: "eyJhbGc..."                              │
   │ │                                                     │
   │ ├─► jwt.verify(token, SUPABASE_JWT_SECRET)           │
   │ │   Validates signature & expiry                     │
   │ │                                                     │
   │ ├─► Decode JWT payload:                              │
   │ │   {                                                │
   │ │     "sub": "user-123",                             │
   │ │     "email": "manager@example.com",                │
   │ │     "role": "manager",                             │
   │ │     "scope": ["orders:read", ...],  ← JWT CLAIMS   │
   │ │     "restaurant_id": "restaurant-123",             │
   │ │     "iat": 1698700000,                             │
   │ │     "exp": 1698786000                              │
   │ │   }                                                │
   │ │                                                     │
   │ ├─► POPULATE req.user ⭐                             │
   │ │   req.user = {                                     │
   │ │     id: decoded.sub,                               │
   │ │     email: decoded.email,                          │
   │ │     role: decoded.role,                            │
   │ │     scopes: decoded.scope || [],   ← FROM JWT      │
   │ │     restaurant_id: decoded.restaurant_id           │
   │ │   }                                                │
   │ │                                                     │
   │ └─► next() → Continue to next middleware             │
   │                                                       │
   └───────────────────────────────────────────────────────┘

   ┌─ Step 2: [OPTIONAL] validateRestaurantAccess (restaurantAccess.ts) ─┐
   │                                                                      │
   │ ├─► Get requested restaurant ID from header or JWT                 │
   │ │                                                                   │
   │ ├─► For non-admin users:                                           │
   │ │   Query: SELECT role FROM user_restaurants                       │
   │ │   WHERE user_id = ? AND restaurant_id = ?                        │
   │ │   (Prevents users from accessing other restaurants)              │
   │ │                                                                   │
   │ └─► next() → Continue to next middleware                           │
   │                                                                    │
   └────────────────────────────────────────────────────────────────────┘

   ┌─ Step 3: [OPTIONAL] requireScopes() middleware (rbac.ts:237-338) ─┐
   │                                                                    │
   │ This middleware VALIDATES and may UPDATE scopes                   │
   │                                                                    │
   │ ├─► Is user admin/super_admin?                                   │
   │ │   ├─ YES: Grant all scopes → next()                            │
   │ │   └─ NO: Continue checking...                                  │
   │ │                                                                 │
   │ ├─► Is user a demo user (id.startsWith('demo:'))?                │
   │ │   ├─ YES: Look up scopes from ROLE_SCOPES constant             │
   │ │   │      No DB query needed                                    │
   │ │   │      const roleScopes = getScopesForRole(req.user.role)    │
   │ │   │      Verify required scope in roleScopes                   │
   │ │   │      next()                                                │
   │ │   │                                                             │
   │ │   └─ NO: Production user, continue...                          │
   │ │                                                                 │
   │ └─► Production User Path (Most Common):                          │
   │     │                                                             │
   │     ├─► Query Database ⭐                                        │
   │     │   Query: SELECT role FROM user_restaurants                 │
   │     │   WHERE user_id = ? AND restaurant_id = ?                  │
   │     │   (Get user's actual role for this restaurant)             │
   │     │                                                             │
   │     ├─► Look Up Scopes from ROLE_SCOPES Constant ⭐              │
   │     │   const userScopes = getScopesForRole(userRole)            │
   │     │   Example: userRole = 'manager'                            │
   │     │   Returns: [                                               │
   │     │     'orders:create',                                       │
   │     │     'orders:read',                                         │
   │     │     'orders:update',                                       │
   │     │     'payments:process',                                    │
   │     │     ...                                                    │
   │     │   ]                                                        │
   │     │                                                             │
   │     ├─► Verify Required Scope                                    │
   │     │   if (!userScopes.includes(requiredScope))                 │
   │     │     next(Forbidden(...))  // Stop here, 403 error          │
   │     │                                                             │
   │     ├─► UPDATE req.user.scopes ⭐ ← IMPORTANT                   │
   │     │   req.user.role = userRole;                               │
   │     │   req.user.scopes = userScopes;                           │
   │     │                                                             │
   │     └─► next() → Continue to route handler                      │
   │                                                                  │
   └──────────────────────────────────────────────────────────────────┘

   ┌─ Step 4: Route Handler (e.g., GET /orders) ─┐
   │                                              │
   │ Handler receives request with:               │
   │ req.user = {                                 │
   │   id: 'user-123',                            │
   │   email: 'manager@example.com',              │
   │   role: 'manager',                           │
   │   scopes: [                                  │
   │     'orders:create',                         │
   │     'orders:read',                           │
   │     'payments:process'                       │
   │   ],    ← Can be used for logic decisions    │
   │   restaurant_id: 'restaurant-123'            │
   │ }                                            │
   │ req.restaurantId: 'restaurant-123'           │
   │                                              │
   │ Handler can:                                 │
   │ ├─ Access req.user.scopes                   │
   │ ├─ Check req.user.role                      │
   │ ├─ Use req.restaurantId for queries         │
   │ └─ Send response                            │
   │                                              │
   └──────────────────────────────────────────────┘

       │
       v
    CLIENT RECEIVES RESPONSE


PHASE 3: SPECIAL CASE - GET /me ENDPOINT
════════════════════════════════════════════════════════════════════

┌──────────────────────────────┐
│ GET /api/v1/auth/me          │
│ (Refresh user info)          │
└──────┬───────────────────────┘
       │
       ├─► authenticate() middleware
       │   (same as Phase 2, Step 1)
       │
       ├─► validateRestaurantAccess middleware
       │   (same as Phase 2, Step 2)
       │
       └─► Route Handler:
           │
           ├─► Get user profile from DB
           │   Query: SELECT * FROM user_profiles
           │
           ├─► Get user's role for restaurant
           │   Query: SELECT role FROM user_restaurants
           │
           ├─► GET SCOPES FROM DATABASE ⭐ (Like login, not RBAC)
           │   Query: SELECT scope FROM role_scopes
           │   WHERE role = ?
           │
           └─► Return Updated User Info
               {
                 "user": {
                   "id": "user-123",
                   "email": "manager@example.com",
                   "role": "manager",
                   "scopes": [...]  ← Refreshed from DB
                 },
                 "restaurantId": "restaurant-123"
               }


PHASE 4: PIN-BASED AUTHENTICATION
════════════════════════════════════════════════════════════════════

┌─────────────────────────────┐
│ POST /api/v1/auth/pin-login │
├─────────────────────────────┤
│ pin: "1234"                 │
│ restaurantId: "restaurant-123"
└──────┬──────────────────────┘
       │
       ├─► Validate PIN against hashed PIN in database
       │   Query: SELECT * FROM user_pins
       │   WHERE pin_hash = bcrypt(pin) AND ...
       │
       ├─► Get user's role
       │   From validated PIN record
       │
       ├─► Create JWT Token
       │   payload = {
       │     sub: userId,
       │     role: 'server',
       │     restaurant_id: restaurantId
       │     // NOTE: No 'scope' claim in JWT!
       │   }
       │   token = jwt.sign(payload, secret)
       │
       ├─► GET SCOPES FROM DATABASE ⭐
       │   Query: SELECT scope FROM role_scopes
       │   WHERE role = 'server'
       │
       └─► Return Response
           {
             "user": {
               "id": userId,
               "role": "server",
               "scopes": [...]  ← From DB
             },
             "token": "...",
             "expiresIn": 43200
           }

```

---

## Data Flow Diagram - Where Scopes Come From

```
SCOPE DATA SOURCES:
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────┐
│ Database (role_scopes table)    │ ← SOURCE 1
├─────────────────────────────────┤
│ Tables:                         │
│ - api_scopes                    │
│ - role_scopes                   │
│                                 │
│ Used by:                        │
│ 1. POST /login (line 76-85)     │
│ 2. POST /pin-login (160-169)    │
│ 3. GET /me (310-319)            │
│                                 │
│ Advantage:                      │
│ - Single source of truth        │
│ - Can be updated without code   │
│ - Used for client-side UI       │
└─────────────────────────────────┘
           │
           │ (At Login Time)
           v
┌─────────────────────────────────┐
│ JWT Token (scope claim)         │
├─────────────────────────────────┤
│ Contains: scope array           │
│                                 │
│ Used by:                        │
│ authenticate() middleware       │
│ (auth.ts, line 99)              │
│                                 │
│ Advantage:                      │
│ - No DB lookup per request      │
│ - Fast JWT decode               │
│ - Works offline                 │
│                                 │
│ Disadvantage:                   │
│ - Must be issued with scopes    │
│ - Currently NOT issued          │
│ - PIN auth doesn't include      │
└─────────────────────────────────┘
           │
           │ (On Each Request)
           v
┌──────────────────────────────────┐
│ ROLE_SCOPES Code Constant        │ ← SOURCE 2
├──────────────────────────────────┤
│ File: rbac.ts (lines 103-181)    │
│                                  │
│ Structure:                       │
│ {                                │
│   'owner': [SCOPE_1, SCOPE_2...],│
│   'manager': [...],              │
│   'server': [...],               │
│   ...                            │
│ }                                │
│                                  │
│ Used by:                         │
│ - getScopesForRole() function    │
│ - requireScopes() middleware     │
│ - Demo user scope lookup         │
│                                  │
│ Advantage:                       │
│ - Compile-time safe (TypeScript) │
│ - No DB query per request        │
│ - Default for API protection     │
│                                  │
│ Disadvantage:                    │
│ - Requires code change + deploy  │
│ - Must stay in sync with DB      │
│ - Single role query per request  │
└──────────────────────────────────┘
           │
           │ (During RBAC Check)
           v
┌──────────────────────────────────┐
│ req.user.scopes (Populated)      │ ← RESULT
├──────────────────────────────────┤
│ Final value used by route        │
│ handlers and middleware          │
│                                  │
│ Sources (in priority order):     │
│ 1. JWT scope claim (if present)  │
│ 2. ROLE_SCOPES constant (RBAC)   │
│                                  │
│ Current behavior:                │
│ - JWT scopes: Usually empty []   │
│ - Gets populated by RBAC         │
│ - Then available to handlers     │
└──────────────────────────────────┘
```

---

## Code Execution Trace Example

### Scenario: Manager creates an order

```
1. CLIENT: POST /api/v1/orders
   Headers: {
     Authorization: Bearer eyJhbGc...,
     X-Restaurant-ID: rest-123
   }
   Body: { items: [...] }

2. authenticate() middleware (auth.ts:99)
   decoded = jwt.verify(token, secret)
   req.user = {
     id: 'user-123',
     role: 'manager',
     scopes: [],  ← Empty from JWT (not issued with scopes)
     restaurant_id: 'rest-123'
   }

3. validateRestaurantAccess middleware
   Checks: SELECT * FROM user_restaurants
   WHERE user_id = 'user-123' AND restaurant_id = 'rest-123'
   Result: Found, role = 'manager'
   req.restaurantId = 'rest-123'

4. requireScopes(ApiScope.ORDERS_CREATE) middleware
   
   ├─ Is user admin? No
   │
   ├─ Is user demo? No (id doesn't start with 'demo:')
   │
   └─ Production user path:
      
      a. Query database:
         SELECT role FROM user_restaurants
         WHERE user_id = 'user-123' AND restaurant_id = 'rest-123'
         Result: userRole = 'manager'
      
      b. Look up scopes:
         const userScopes = getScopesForRole('manager')
         Returns: [
           'orders:create',
           'orders:read',
           'orders:update',
           'orders:delete',
           'orders:status',
           'payments:process',
           'payments:refund',
           'payments:read',
           'reports:view',
           'reports:export',
           'staff:manage',
           'staff:schedule',
           'menu:manage',
           'tables:manage'
         ]
      
      c. Check scope:
         hasRequiredScope = userScopes.includes('orders:create')
         Result: true
      
      d. Populate req.user.scopes:
         req.user.scopes = userScopes ← UPDATED!
         req.user.role = 'manager'
      
      e. Continue to next middleware

5. Route Handler (POST /orders)
   {
     // Can now access:
     const scopes = req.user.scopes
     const role = req.user.role
     const restaurantId = req.restaurantId
     const userId = req.user.id
     
     // Create order...
     // Send response...
   }

6. Response sent to client
   Status: 201 Created
   Body: { order: { id, items, ... } }
```

---

## Summary Matrix

| Component | File | Role | Scope Source |
|-----------|------|------|--------------|
| **authenticate()** | auth.ts:99 | Verify JWT, extract claims | JWT scope claim |
| **validateRestaurantAccess()** | restaurantAccess.ts | Verify restaurant access | N/A (no scopes) |
| **requireScopes()** | rbac.ts:323 | Enforce scopes, populate req.user | ROLE_SCOPES constant |
| **POST /login** | auth.routes.ts:76-85 | Return scopes to client | Database role_scopes |
| **POST /pin-login** | auth.routes.ts:160-169 | Return scopes to client | Database role_scopes |
| **GET /me** | auth.routes.ts:310-319 | Refresh scopes | Database role_scopes |

---

## Critical Dependencies

```
req.user.scopes ←────┐
                     │
         ┌───────────┴────────────┐
         │                        │
    If JWT has         If RBAC middleware
    'scope' claim      is used
         │                        │
         v                        v
  Use decoded.scope    Use ROLE_SCOPES[role]
  (Performance)        (Default + Validation)
```

