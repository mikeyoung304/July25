# Authentication Flow Diagrams

**Last Updated:** 2025-11-19
**Related**: [ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md)

This document provides visual diagrams for all authentication flows in Restaurant OS v6.0.

---

## Table of Contents

1. [Evolution Timeline](#evolution-timeline)
2. [Current Architecture Overview](#current-architecture-overview)
3. [Email/Password Login Flow](#emailpassword-login-flow)
4. [Demo Login Flow](#demo-login-flow)
5. [Anonymous Customer Flow](#anonymous-customer-flow)
6. [Voice Ordering Authentication](#voice-ordering-authentication)
7. [httpClient Dual Auth Pattern](#httpclient-dual-auth-pattern)
8. [Multi-Tenancy Validation](#multi-tenancy-validation)
9. [Security Incident Timelines](#security-incident-timelines)

---

## Evolution Timeline

### Authentication System Evolution (July - November 2025)

```
July 2025          September 2025      October 8          November 2         November 18
   │                     │                  │                  │                    │
   │  Phase 1            │  Security        │  Phase 2         │  Phase 3           │  Current
   │  Custom JWT         │  Issues          │  Pure Supabase   │  Dual Auth         │  State
   │                     │  Discovered      │  Migration       │  Pattern           │
   ▼                     ▼                  ▼                  ▼                    ▼
┌──────────────┐    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   ┌──────────────┐
│ Custom JWT   │    │ Multi-Tenant │  │ Supabase     │  │ Dual Auth    │   │ Production   │
│ + RLS        │───>│ Breach       │─>│ Exclusive    │─>│ Pattern      │──>│ Ready 90%    │
│              │    │ WebSocket    │  │              │  │              │   │              │
│ ✗ Race       │    │ Auth Gap     │  │ ✗ Voice      │  │ ✓ All flows  │   │ ✓ Stable     │
│ ✗ Demo Mode  │    │ Test Tokens  │  │ ✗ Anonymous  │  │ ✓ Secure     │   │ ✓ Secure     │
│ ✗ Security   │    │              │  │ ✗ PIN Auth   │  │ ✓ Flexible   │   │              │
└──────────────┘    └──────────────┘  └──────────────┘  └──────────────┘   └──────────────┘
      3 months            P0 Incidents      3 weeks         16 days              Present
   142+ commits         5+ vulnerabilities  Failed        Successful            0 incidents
```

---

## Current Architecture Overview

### Authentication System Components (v6.0.14)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Restaurant OS Authentication                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Frontend Layer                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

        ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
        │ Staff Login  │         │ Customer     │         │ Voice        │
        │ (Managers)   │         │ Ordering     │         │ Ordering     │
        │              │         │ (Anonymous)  │         │ (WebRTC)     │
        └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
               │                        │                         │
               │                        │                         │
               ▼                        ▼                         ▼
        ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
        │ Supabase     │         │ No Auth      │         │ localStorage │
        │ Auth         │         │ Required     │         │ JWT          │
        │              │         │              │         │              │
        │ ✓ Session    │         │ ✓ Ephemeral │         │ ✓ Custom JWT │
        │ ✓ Auto Refresh│         │ ✓ Fast      │         │ ✓ Accessible │
        └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
               │                        │                         │
               └────────────────────────┴─────────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │    httpClient         │
                            │  (Dual Auth Check)    │
                            │                       │
                            │  1. Check Supabase    │
                            │  2. Check localStorage│
                            │  3. No auth (customer)│
                            └───────────┬───────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                Backend Layer                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                            ┌───────────────────────┐
                            │  JWT Validation       │
                            │  (Dual Secret)        │
                            │                       │
                            │  • SUPABASE_JWT_SECRET│
                            │  • KIOSK_JWT_SECRET   │
                            └───────────┬───────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
            │ authenticate │    │ validateRest │   │ requireScopes│
            │ middleware   │───>│ aurantAccess │──>│ (RBAC)       │
            │              │    │ middleware   │   │              │
            │ • JWT verify │    │ • X-Rest-ID  │   │ • Role check │
            │ • Set user   │    │ • RLS check  │   │ • Scope check│
            └──────────────┘    └──────────────┘   └──────────────┘
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │  Protected Routes     │
                            │  • Orders API         │
                            │  • Menu API           │
                            │  • Payments API       │
                            │  • Staff API          │
                            └───────────────────────┘
```

---

## Email/Password Login Flow

### Staff Login (Managers, Owners, Servers)

```
┌─────────────┐
│ User enters │
│ credentials │
└──────┬──────┘
       │
       │ email: "manager@restaurant.com"
       │ password: "Demo123!"
       │
       ▼
┌─────────────────────────────────────────┐
│ Frontend: AuthContext.tsx               │
│ supabase.auth.signInWithPassword()      │
└──────┬──────────────────────────────────┘
       │
       │ HTTPS POST
       │
       ▼
┌─────────────────────────────────────────┐
│ Supabase Auth Service                   │
│ • Validate credentials                  │
│ • Check user exists in auth.users       │
│ • Generate JWT access token             │
│ • Generate refresh token                │
└──────┬──────────────────────────────────┘
       │
       │ Return session object:
       │ {
       │   access_token: "eyJhbG...",
       │   refresh_token: "v1.Mr5...",
       │   expires_at: 1700000000,
       │   user: { id: "...", email: "..." }
       │ }
       │
       ▼
┌─────────────────────────────────────────┐
│ Frontend: Supabase Auto-Storage         │
│ localStorage['sb-{project}-auth-token'] │
│ ✓ Session persisted automatically       │
└──────┬──────────────────────────────────┘
       │
       │ Fetch user role and permissions
       │
       ▼
┌─────────────────────────────────────────┐
│ Frontend → Backend                      │
│ GET /api/v1/auth/me                     │
│ Authorization: Bearer <supabase_jwt>    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Backend: auth.ts middleware             │
│ • Extract JWT from Authorization header │
│ • Verify with SUPABASE_JWT_SECRET       │
│ • Set req.user = { id, email, ... }     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Backend: auth.routes.ts /me endpoint    │
│ • Query user_restaurants table          │
│ • Get role for current restaurant       │
│ • Get scopes from role_scopes table     │
│ • Return user profile with permissions  │
└──────┬──────────────────────────────────┘
       │
       │ Return:
       │ {
       │   user: { id, email, role: "manager" },
       │   scopes: ["orders:create", "menu:manage", ...],
       │   restaurantId: "11111111-..."
       │ }
       │
       ▼
┌─────────────────────────────────────────┐
│ Frontend: React State                   │
│ • Store user in AuthContext             │
│ • Store restaurantId                    │
│ • Set isLoading = false                 │
└──────┬──────────────────────────────────┘
       │
       │ No race condition!
       │ Session already persisted by Supabase
       │
       ▼
┌─────────────────────────────────────────┐
│ Navigate to role-specific dashboard     │
│ • manager → /manager                    │
│ • server → /server                      │
│ • kitchen → /kitchen                    │
└─────────────────────────────────────────┘

✅ Session Duration: 1 hour (auto-refresh every 50 minutes)
✅ Refresh Token: 30 days
✅ Storage: httpOnly cookies via Supabase (secure)
```

### Phase 1 vs Phase 3 Comparison

#### Phase 1 (Custom JWT) - HAD RACE CONDITION ❌

```
Frontend → Backend /auth/login
              ↓
Backend authenticates with Supabase
              ↓
Backend returns session to frontend
              ↓
Frontend calls supabase.auth.setSession()
              ↓ ⚠️ RACE CONDITION HERE
Frontend navigates to dashboard
              ↓
Dashboard loads BEFORE session persisted
              ↓
❌ 401 Unauthorized errors
❌ "Auth loading timeout"
```

#### Phase 3 (Direct Supabase) - NO RACE CONDITION ✅

```
Frontend → Supabase Auth directly
              ↓
Supabase returns session
              ↓
Supabase auto-persists to localStorage
              ↓ ✅ SESSION ALREADY SAVED
Frontend navigates to dashboard
              ↓
Dashboard has session available immediately
              ↓
✅ No 401 errors
✅ No timeouts
```

---

## Demo Login Flow

### Development Mode (Pre-filled Credentials)

```
┌─────────────────────────────────────┐
│ Developer clicks "Login as Server"  │
│ (Demo panel in UI)                  │
└───────────────┬─────────────────────┘
                │
                │ VITE_DEMO_PANEL=1 (flag enabled)
                │
                ▼
┌─────────────────────────────────────┐
│ Frontend: Pre-filled form           │
│ email: "server@restaurant.com"      │
│ password: "Demo123!"                │
│ (Credentials from .env.development) │
└───────────────┬─────────────────────┘
                │
                │ Same as Email/Password flow
                │
                ▼
┌─────────────────────────────────────┐
│ Supabase Auth                       │
│ (Same production code path)         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Backend /api/v1/auth/me             │
│ (Same production code path)         │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ User authenticated with role        │
│ • No parallel demo infrastructure   │
│ • Same security as production       │
│ • Real Supabase user account        │
└─────────────────────────────────────┘

✅ No demo-specific backend endpoints
✅ No parallel authentication system
✅ Same code path as production
✅ 3,140 lines of demo code removed (Nov 2, 2025)
```

### Phase 1 Demo Mode (REMOVED) - Had Security Issues ❌

```
Frontend → Backend /auth/demo-session  ❌ Parallel endpoint
              ↓
Backend checks DEMO_LOGIN_ENABLED flag  ❌ Security bypass
              ↓
Backend generates JWT WITHOUT database check  ❌ Dangerous
              ↓
Backend returns demo user with hardcoded role  ❌ No validation
              ↓
Frontend stores in separate localStorage key  ❌ Dual storage
              ↓
httpClient checks demo session separately  ❌ Complex logic

Problems:
❌ Parallel infrastructure (3,140 lines)
❌ Security bypasses in production
❌ Demo bugs didn't appear until production
❌ Hard to maintain two auth systems
```

---

## Anonymous Customer Flow

### Kiosk or Online Ordering (No Account Required)

```
┌─────────────────────────────────────┐
│ Customer visits /order page         │
│ (Kiosk or online ordering)          │
└───────────────┬─────────────────────┘
                │
                │ No authentication required!
                │
                ▼
┌─────────────────────────────────────┐
│ Customer adds items to cart         │
│ (localStorage cart state)           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Customer proceeds to checkout       │
└───────────────┬─────────────────────┘
                │
                │ POST /api/v1/orders
                │
                ▼
┌─────────────────────────────────────┐
│ Backend: Detect anonymous customer  │
│ • No Authorization header OR        │
│ • JWT with role="customer"          │
└───────────────┬─────────────────────┘
                │
                │ Generate ephemeral customer JWT
                │
                ▼
┌─────────────────────────────────────┐
│ Backend: Create customer JWT        │
│ {                                   │
│   sub: "anonymous-" + uuid(),       │
│   role: "customer",                 │
│   scopes: ["orders:create"],        │
│   exp: now + 3600 (1 hour)          │
│ }                                   │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Backend: Process order              │
│ • Validate items against menu       │
│ • Calculate totals server-side      │
│ • Create order with customer role   │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Backend: Payment processing         │
│ POST /api/v1/payments/create        │
│ • Anonymous customer allowed        │
│ • Stripe payment integration        │
└───────────────┬─────────────────────┘
                │
                │ Payment successful
                │
                ▼
┌─────────────────────────────────────┐
│ Frontend: Order confirmation        │
│ • No account created                │
│ • No session persisted              │
│ • Clean anonymous flow              │
└─────────────────────────────────────┘

✅ No login required
✅ Fast checkout
✅ Secure (ephemeral tokens)
✅ No PII stored
```

### Key Insight from Phase 2 Failure

**Phase 2 Problem**: Pure Supabase auth required login for ALL requests.

```
Customer visits kiosk
    ↓
Adds items to cart
    ↓
Clicks "Checkout"
    ↓
❌ "Please login to continue"
    ↓
Customer abandons order
    ↓
💰 Lost revenue
```

**Phase 3 Solution**: Customer-facing pages don't require authentication.

```typescript
// Backend: orders.routes.ts
router.post('/',
  authenticate,  // Validates JWT if present
  validateRestaurantAccess,
  requireScopes(ApiScope.ORDERS_CREATE),  // customer role has this scope
  async (req, res) => {
    // If no JWT, generate anonymous customer token
    // If JWT with customer role, allow order
  }
);
```

---

## Voice Ordering Authentication

### OpenAI Realtime API WebRTC Context

```
┌─────────────────────────────────────┐
│ User clicks "Voice Order" button    │
│ (ServerView or CustomerView)        │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Frontend: Check authentication      │
│ if (supabaseSession) {              │
│   // Already authenticated          │
│ } else {                            │
│   // Need to authenticate           │
│ }                                   │
└───────────────┬─────────────────────┘
                │
                │ Case 1: Has Supabase session
                │
                ▼
┌─────────────────────────────────────┐
│ Use existing Supabase JWT           │
│ ✓ Token available in httpClient     │
└───────────────┬─────────────────────┘
                │
                │
                │ Case 2: No Supabase session
                │
                ▼
┌─────────────────────────────────────┐
│ Generate voice ordering JWT         │
│ POST /api/v1/auth/login             │
│ (Custom endpoint for voice)         │
└───────────────┬─────────────────────┘
                │
                │ Return JWT
                │
                ▼
┌─────────────────────────────────────┐
│ Store JWT in localStorage           │
│ localStorage.setItem('auth_session',│
│   JSON.stringify({                  │
│     session: {                      │
│       accessToken: "eyJhbG...",     │
│       expiresAt: timestamp          │
│     }                               │
│   })                                │
│ );                                  │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Establish OpenAI Realtime API       │
│ WebRTC connection                   │
└───────────────┬─────────────────────┘
                │
                │ Voice events
                │
                ▼
┌─────────────────────────────────────┐
│ Voice event triggers API call       │
│ e.g., "Add burger to order"         │
└───────────────┬─────────────────────┘
                │
                │ httpClient.post('/api/v1/orders')
                │
                ▼
┌─────────────────────────────────────┐
│ httpClient: Dual auth check         │
│ 1. Check Supabase → No session      │
│ 2. Check localStorage → Found JWT!  │
│ 3. Add Authorization header         │
└───────────────┬─────────────────────┘
                │
                │ Authorization: Bearer <localStorage_jwt>
                │
                ▼
┌─────────────────────────────────────┐
│ Backend: Validate JWT               │
│ • Try SUPABASE_JWT_SECRET (fails)   │
│ • Try KIOSK_JWT_SECRET (succeeds)   │
│ • Extract user role                 │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Order created successfully          │
│ ✅ Voice ordering works!            │
└─────────────────────────────────────┘
```

### Incident CL-AUTH-001 (November 18, 2025)

**Problem**: Voice ordering broke after Phase 2 migration to pure Supabase.

**Root Cause**: OpenAI Realtime API WebRTC context couldn't access Supabase session.

```
┌─────────────────────────────────────┐
│ Phase 2 (Pure Supabase)             │
│                                     │
│ httpClient.request():               │
│   const session = await             │
│     supabase.auth.getSession();     │
│                                     │
│   if (session) {                    │
│     // Use session.access_token     │
│   } else {                          │
│     ❌ No fallback!                 │
│     ❌ Request sent without auth    │
│   }                                 │
└─────────────────────────────────────┘
        │
        │ Voice ordering context
        │
        ▼
┌─────────────────────────────────────┐
│ OpenAI Realtime API WebRTC          │
│ • Different execution context       │
│ • Can't access Supabase localStorage│
│ • session = null                    │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ API calls sent without Auth header  │
│ ❌ 401 Unauthorized                 │
│ ❌ Voice ordering broken            │
└─────────────────────────────────────┘
```

**Solution**: localStorage fallback for voice ordering context.

```
┌─────────────────────────────────────┐
│ Phase 3 (Dual Auth)                 │
│                                     │
│ httpClient.request():               │
│   // Priority 1: Supabase           │
│   const session = await             │
│     supabase.auth.getSession();     │
│                                     │
│   if (session) {                    │
│     use session.access_token        │
│   } else {                          │
│     // Priority 2: localStorage     │
│     const saved = localStorage      │
│       .getItem('auth_session');     │
│                                     │
│     if (saved) {                    │
│       ✅ Use saved JWT              │
│     }                               │
│   }                                 │
└─────────────────────────────────────┘
```

**Git Evidence**:
```
2025-11-18 | fix(auth): Replace Supabase direct auth with custom /api/v1/auth/login endpoint
2025-11-18 | fix(auth): Store custom JWT in localStorage for httpClient access
2025-11-18 | fix(voice): Add localStorage fallback to auth service for voice ordering
```

---

## httpClient Dual Auth Pattern

### Token Resolution Priority

```
┌──────────────────────────────────────────────────────────────┐
│ API Request (Any Component)                                  │
│ httpClient.get('/api/v1/orders')                            │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ httpClient.request() - Dual Auth Pattern                     │
│ (client/src/services/http/httpClient.ts:109-148)            │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│ Priority 1       │          │ Priority 2       │
│ Supabase Session │          │ localStorage JWT │
│                  │          │                  │
│ const { data }   │          │ const saved =    │
│   = await        │          │   localStorage   │
│   supabase.auth  │          │   .getItem(      │
│   .getSession(); │          │   'auth_session')│
│                  │          │                  │
│ if (session      │          │ if (saved) {     │
│   ?.access_token)│          │   const parsed = │
│ {                │          │   JSON.parse(    │
│   return token   │          │     saved);      │
│ }                │          │   if (valid) {   │
└────────┬─────────┘          │     return token │
         │                    │   }              │
         │ No session         │ }                │
         │                    └────────┬─────────┘
         │                             │
         └─────────────────────────────┘
                        │
                        │ Has token
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Add Headers                                                  │
│ • Authorization: Bearer <token>                              │
│ • X-Restaurant-ID: <restaurant_id>                           │
│ • X-Client-Flow: online | kiosk | server                     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Make HTTP Request                                            │
│ fetch(`${baseUrl}${endpoint}`, { headers, ...options })     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Backend Receives Request                                     │
└──────────────────────────────────────────────────────────────┘
```

### Implementation Code

```typescript
// client/src/services/http/httpClient.ts (lines 109-148)

async request(endpoint: string, options?: RequestOptions) {
  const headers = new Headers(options?.headers || {});

  // Priority 1: Try Supabase session first (production)
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
    logger.info('🔐 Using Supabase session');
  } else {
    // Priority 2: Fallback to localStorage (demo/PIN/station/voice)
    const savedSession = localStorage.getItem('auth_session');

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);

        if (parsed.session?.accessToken && parsed.session?.expiresAt) {
          // Validate token hasn't expired
          const now = Date.now() / 1000; // Convert to seconds
          if (parsed.session.expiresAt > now) {
            headers.set('Authorization', `Bearer ${parsed.session.accessToken}`);
            logger.info('🔐 Using localStorage session');
          } else {
            logger.warn('⚠️ localStorage token expired');
          }
        }
      } catch (error) {
        logger.error('❌ Failed to parse auth_session:', error);
      }
    } else {
      logger.info('ℹ️ No authentication (anonymous customer flow)');
    }
  }

  // Add restaurant ID for multi-tenancy
  const restaurantId = this.getRestaurantId();
  if (restaurantId) {
    headers.set('X-Restaurant-ID', restaurantId);
  }

  return super.request(endpoint, { ...options, headers });
}
```

### Authentication Source by Use Case

| Use Case | Auth Source | Storage Location | Token Type |
|----------|-------------|------------------|------------|
| Manager Dashboard | Supabase | Supabase localStorage | Supabase JWT |
| Demo Login | Supabase | Supabase localStorage | Supabase JWT |
| Voice Ordering | localStorage | Custom localStorage | Custom JWT |
| Anonymous Customer | None | Ephemeral | Custom JWT (backend) |
| PIN Login | localStorage | Custom localStorage | Custom JWT |
| Station Login | localStorage | Custom localStorage | Custom JWT |

---

## Multi-Tenancy Validation

### Restaurant Access Control Flow

```
┌──────────────────────────────────────────────────────────────┐
│ API Request to Protected Route                               │
│ POST /api/v1/orders                                          │
│ Headers:                                                     │
│   Authorization: Bearer <jwt>                                │
│   X-Restaurant-ID: 11111111-1111-1111-1111-111111111111      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware 1: authenticate                                   │
│ (server/src/middleware/auth.ts)                              │
│                                                              │
│ • Extract JWT from Authorization header                      │
│ • Verify signature (try both secrets)                        │
│   - SUPABASE_JWT_SECRET (Supabase tokens)                    │
│   - KIOSK_JWT_SECRET (custom tokens)                         │
│ • Decode JWT payload                                         │
│ • Set req.user = {                                           │
│     id: decoded.sub,                                         │
│     email: decoded.email,                                    │
│     role: decoded.role,                                      │
│     scopes: decoded.scope,                                   │
│     restaurant_id: decoded.restaurant_id                     │
│   }                                                          │
│                                                              │
│ ⚠️ IMPORTANT: Does NOT set req.restaurantId                 │
│ (Security separation by design)                              │
└───────────────────────┬──────────────────────────────────────┘
                        │ req.user populated
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware 2: validateRestaurantAccess                       │
│ (server/src/middleware/restaurantAccess.ts)                  │
│                                                              │
│ • Extract restaurant ID from X-Restaurant-ID header          │
│ • Query database: user_restaurants table                     │
│   SELECT * FROM user_restaurants                             │
│   WHERE user_id = req.user.id                                │
│     AND restaurant_id = <X-Restaurant-ID>                    │
│     AND is_active = true                                     │
│                                                              │
│ • If no match → 403 Forbidden                                │
│ • If match → Set req.restaurantId                            │
│                                                              │
│ ✅ Validates user has access to this restaurant              │
└───────────────────────┬──────────────────────────────────────┘
                        │ req.restaurantId populated
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware 3: requireScopes(ApiScope.ORDERS_CREATE)          │
│ (server/src/middleware/rbac.ts)                              │
│                                                              │
│ • Check req.restaurantId exists                              │
│   if (!req.restaurantId) {                                   │
│     ❌ return 403 "Restaurant context required"              │
│   }                                                          │
│                                                              │
│ • Query user's role in this restaurant                       │
│   SELECT role FROM user_restaurants                          │
│   WHERE user_id = req.user.id                                │
│     AND restaurant_id = req.restaurantId                     │
│                                                              │
│ • Map role to scopes (ROLE_SCOPES constant)                  │
│ • Check if user has required scope                           │
│   const hasScope = userScopes.includes(                      │
│     ApiScope.ORDERS_CREATE                                   │
│   );                                                         │
│                                                              │
│ • If no scope → 403 Forbidden                                │
│ • If has scope → Allow request                               │
└───────────────────────┬──────────────────────────────────────┘
                        │ All checks passed
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Route Handler                                                │
│ • req.user available (authenticated user)                    │
│ • req.restaurantId available (validated access)              │
│ • User has required permissions (RBAC)                       │
│ • Process business logic safely                              │
└──────────────────────────────────────────────────────────────┘
```

### Correct Middleware Order (Critical!)

```typescript
// ✅ CORRECT ORDER (from server/src/routes/orders.routes.ts:40)

router.post('/',
  authenticate,                      // 1. Verify JWT, set req.user
  validateRestaurantAccess,          // 2. Validate restaurant access, set req.restaurantId
  requireScopes(ApiScope.ORDERS_CREATE), // 3. Check permissions (needs req.restaurantId)
  validateBody(OrderPayload),        // 4. Validate request body
  async (req: AuthenticatedRequest, res, next) => {
    // Route handler - all dependencies satisfied
    const restaurantId = req.restaurantId!; // ✅ Safe to use
    // ... business logic
  }
);
```

### Incorrect Middleware Order (Causes 403)

```typescript
// ❌ WRONG ORDER (caused bug, fixed in commit 0ad5c77a)

router.post('/orders',
  authenticate,                       // 1. Verify JWT, set req.user
  requireScopes(ApiScope.ORDERS_CREATE),  // 2. ❌ WRONG! Runs before restaurant validation
  validateRestaurantAccess,           // 3. ❌ Too late! Already failed at step 2
  async (req, res) => {
    // ❌ This code never runs
  }
);

// Result: 403 Forbidden - "Restaurant context required"
// Reason: requireScopes checks req.restaurantId, which is still undefined
```

### Defense in Depth Layers

```
┌──────────────────────────────────────────────────────────────┐
│ Layer 1: JWT Signature Verification                          │
│ • SUPABASE_JWT_SECRET or KIOSK_JWT_SECRET                    │
│ • Prevents token forgery                                     │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 2: Restaurant Access Validation (Middleware)           │
│ • Query user_restaurants table                               │
│ • Validates user has access to restaurant                    │
│ • Prevents cross-tenant access attempts                      │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: Role-Based Access Control (RBAC)                    │
│ • Check user's role in restaurant                            │
│ • Map role to scopes                                         │
│ • Enforce fine-grained permissions                           │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ Layer 4: Row-Level Security (RLS) Policies                   │
│ • Database-level enforcement                                 │
│ • WHERE restaurant_id = current_user_restaurant_id           │
│ • Final safety net if middleware fails                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Security Incident Timelines

### Incident 1: Multi-Tenancy Breach (October 25, 2025)

```
Timeline of Discovery and Fix

October 19, 2025
   │
   │ P0 Security Audit Completion
   │ First comprehensive security review
   │
   ▼
┌──────────────────────────────────────┐
│ Audit identifies potential issues    │
│ • Missing restaurant_id validation   │
│ • Middleware ordering inconsistent   │
└───────────────┬──────────────────────┘
                │
October 24, 2025
                │
                ▼
┌──────────────────────────────────────┐
│ JWT Secret Validation Issue          │
│ • WebSocket auth gaps discovered     │
│ • JWT secret not validated on startup│
└───────────────┬──────────────────────┘
                │
October 25, 2025
                │
                ▼
┌──────────────────────────────────────┐
│ 🚨 CRITICAL VULNERABILITY FOUND      │
│                                      │
│ User can access other restaurant data│
│                                      │
│ Root Cause:                          │
│ • req.restaurantId from header       │
│ • No validation against user access  │
│ • User could pass any restaurant_id  │
└───────────────┬──────────────────────┘
                │
                │ Immediate Response
                │
                ▼
┌──────────────────────────────────────┐
│ Emergency Fix Deployed                │
│                                      │
│ Commit: aceee1d5                     │
│ "fix(security): critical             │
│  multi-tenancy access control        │
│  vulnerability"                      │
│                                      │
│ Added:                               │
│ • requireRestaurantId middleware     │
│ • Validation against user_restaurants│
│ • 403 if no access match             │
└───────────────┬──────────────────────┘
                │
October 26-31, 2025
                │
                ▼
┌──────────────────────────────────────┐
│ Comprehensive Security Hardening      │
│                                      │
│ • Review all protected routes        │
│ • Add middleware to 50+ endpoints    │
│ • Update tests for validation        │
│ • Add security proof tests           │
│ • Document middleware ordering       │
└───────────────┬──────────────────────┘
                │
November 2025 (Present)
                │
                ▼
┌──────────────────────────────────────┐
│ ✅ Multi-Tenancy Security Hardened   │
│                                      │
│ Defense Layers:                      │
│ 1. JWT validation                    │
│ 2. Restaurant access middleware      │
│ 3. RBAC scope checking               │
│ 4. RLS database policies             │
│                                      │
│ Status: 30 days with 0 incidents     │
└──────────────────────────────────────┘
```

### Incident 2: Voice Ordering Auth Failure (November 18, 2025)

```
Timeline: CL-AUTH-001

November 2, 2025
   │
   │ Phase 3 Migration Complete
   │ Dual auth pattern implemented
   │
   ▼
┌──────────────────────────────────────┐
│ Voice ordering working                │
│ • Demo mode eliminated               │
│ • Supabase auth primary              │
└───────────────┬──────────────────────┘
                │
November 15-17, 2025
                │
                ▼
┌──────────────────────────────────────┐
│ Build infrastructure fixes           │
│ • 20+ deployment attempts            │
│ • Focus on TypeScript/PostCSS        │
│ • Voice ordering not tested          │
└───────────────┬──────────────────────┘
                │
November 18, 2025 (Morning)
                │
                ▼
┌──────────────────────────────────────┐
│ 🚨 Voice Ordering Broken             │
│                                      │
│ Symptom:                             │
│ • Voice orders fail with 401         │
│ • "Unauthorized" errors              │
│ • Works in ServerView, fails in voice│
└───────────────┬──────────────────────┘
                │
                │ Investigation
                │
                ▼
┌──────────────────────────────────────┐
│ Root Cause Identified                │
│                                      │
│ Problem:                             │
│ • OpenAI Realtime API WebRTC context │
│ • Cannot access Supabase localStorage│
│ • httpClient has no token            │
│ • Requests sent without Auth header  │
│                                      │
│ Why Now?                             │
│ • Phase 2 removed localStorage fallback│
│ • Voice context never had Supabase   │
└───────────────┬──────────────────────┘
                │
November 18, 2025 (Afternoon)
                │
                ▼
┌──────────────────────────────────────┐
│ Fix Implemented                       │
│                                      │
│ Commits:                             │
│ • 9e97f720: Replace Supabase auth    │
│   with custom /api/v1/auth/login     │
│ • a3514472: Store JWT in localStorage│
│ • 2d4084e6: Add localStorage fallback│
│   to voice service                   │
│                                      │
│ Solution:                            │
│ • Voice ordering generates custom JWT│
│ • Store in localStorage              │
│ • httpClient dual auth pattern       │
│   checks localStorage                │
└───────────────┬──────────────────────┘
                │
November 18, 2025 (Evening)
                │
                ▼
┌──────────────────────────────────────┐
│ Incident Documentation Created        │
│                                      │
│ Commit: 65f1bd1f                     │
│ "docs(claudelessons): Add            │
│  CL-AUTH-001 authentication          │
│  incident and prevention rules"      │
│                                      │
│ New Pattern: "Claude Lessons"        │
│ • Document incidents immediately     │
│ • Provide prevention rules           │
│ • Code examples for correct pattern  │
└───────────────┬──────────────────────┘
                │
November 19, 2025 (Present)
                │
                ▼
┌──────────────────────────────────────┐
│ ✅ Voice Ordering Stable             │
│                                      │
│ Status: 24 hours with 0 failures     │
│ Architecture: Dual auth pattern      │
│ Documentation: Complete              │
└──────────────────────────────────────┘
```

---

## Summary: Why Dual Authentication Works

### The Architecture Triangle

```
                  All Use Cases Supported
                           △
                          /│\
                         / │ \
                        /  │  \
                       /   │   \
                      /    │    \
                     /     │     \
                    /      │      \
                   /       │       \
                  /        │        \
                 /         │         \
                /          │          \
               /           │           \
              /            │            \
             /             │             \
            /              │              \
           /               │               \
          /                │                \
         /                 │                 \
        △──────────────────┼──────────────────△
   Security            Simplicity       Flexibility
   (Supabase)                          (Custom JWT)


Phase 1: Flexibility + Simplicity → Poor Security ❌
Phase 2: Security + Simplicity → No Flexibility ❌
Phase 3: Security + Flexibility → Acceptable Complexity ✅
```

### Key Success Factors

1. **Clear Boundaries**: Each auth method has specific use cases
2. **Single HTTP Client**: Developers don't think about auth type
3. **Secure by Default**: Production prioritizes Supabase
4. **Development Friendly**: Demo mode uses real auth with convenience
5. **Defense in Depth**: Multiple validation layers
6. **Well Documented**: Evolution history prevents repeated mistakes

---

## Related Documentation

- **[ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md)** - Complete 3-rewrite history
- **[ADR-006: Dual Authentication Pattern](../architecture-decisions/ADR-006-dual-authentication-pattern.md)** - Implementation details
- **[AUTHENTICATION_ARCHITECTURE.md](AUTHENTICATION_ARCHITECTURE.md)** - Current architecture reference
- **[Git History Narrative](../../../nov18scan/01_git_history_narrative.md)** - Complete commit analysis

---

**Created**: 2025-11-19
**Last Updated**: 2025-11-19
**Maintainer**: Technical Lead
