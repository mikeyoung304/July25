# Lessons: auth authorization issues

## Key Incidents

# Major Authentication & Authorization Incidents

## CL-AUTH-001: STRICT_AUTH Environment Drift (48 Days)

**Date**: October 1 - November 18, 2025
**Duration**: 48 days (recurring daily)
**Cost**: $20,000+ engineering time + customer trust erosion
**Severity**: P0 Critical

### The Problem

Frontend used `supabase.auth.signInWithPassword()` which returned Supabase JWTs **without** `restaurant_id` claim. Backend STRICT_AUTH=true rejected these tokens.

### Root Cause Analysis

```
Local Development:
  STRICT_AUTH=false → Accepts tokens without restaurant_id → Works 

Production:
  STRICT_AUTH=true → Requires restaurant_id in JWT → Fails 

Frontend Code:
  Uses supabase.auth.signInWithPassword()
  Returns Supabase JWT (missing restaurant_id)

Backend Middleware:
  if (STRICT_AUTH && !decoded.restaurant_id) throw Unauthorized()
```

### Timeline

- **Oct 1**: STRICT_AUTH=true enabled on Render
- **Oct 1-Nov 18**: Daily production login failures
- **Nov 18**: Permanent fix (commit 9e97f720)

### Symptoms

- "Authentication Required" modal in infinite loop
- 401 Unauthorized on `/api/v1/auth/me`
- Works locally, fails in production
- User credentials correct but login rejected

### The Fix (Commit 9e97f720)

**File**: `/client/src/contexts/AuthContext.tsx:184-265`

```typescript
// BEFORE (BROKEN)
const login = async (email, password, restaurantId) => {
  // Direct Supabase auth
  const { data } = await supabase.auth.signInWithPassword({ email, password });
  // JWT missing restaurant_id → STRICT_AUTH rejects it
};

// AFTER (FIXED)
const login = async (email, password, restaurantId) => {
  // 1. Resolve slug to UUID
  const GROW_RESTAURANT_UUID = '11111111-1111-1111-1111-111111111111';
  const resolvedRestaurantId = restaurantId === 'grow'
    ? GROW_RESTAURANT_UUID
    : restaurantId;

  // 2. Use CUSTOM auth endpoint
  const response = await httpClient.post('/api/v1/auth/login', {
    email,
    password,
    restaurantId: resolvedRestaurantId
  });

  // 3. Store session in localStorage
  localStorage.setItem('auth_session', JSON.stringify({
    user: response.user,
    session: response.session,
    restaurantId: response.restaurantId
  }));

  // 4. Sync with Supabase for Realtime
  await supabase.auth.setSession({
    access_token: response.session.access_token,
    refresh_token: response.session.refresh_token
  });
};
```

### Prevention Rules

1. **Never use Supabase direct auth** for workspace login
2. **Always test with STRICT_AUTH=true** locally
3. **Store JWT in localStorage** for httpClient access
4. **Hardcode slug-to-UUID** resolution (no network call)

### References

- Commit: `9e97f720` (fix), `a3514472` (localStorage)
- Incident Report: [CL-AUTH-001](../../claudelessons-v2/knowledge/incidents/CL-AUTH-001-supabase-direct-auth-strict-mode.md)

---

## JWT Scope Mismatch (10 Days)

**Date**: November 2-12, 2025
**Duration**: 10 days (6 days undetected)
**Cost**: $48,000+ engineering time
**Severity**: P0 Critical

### The Problem

JWT tokens created **without** `scope` field, causing complete RBAC failure. All role-based operations returned 401 errors.

### Root Cause

Demo session removal (commit 5dc74903) changed JWT creation order:

```typescript
// BEFORE (WORKING)
const scopes = await fetchScopes(role);
const token = jwt.sign({ sub, email, role, scope: scopes }, secret);

// AFTER (BROKEN)
const token = jwt.sign({ sub, email, role }, secret);  // Missing scope!
const scopes = await fetchScopes(role);  // Too late

// Response body had scopes, but JWT didn't
// Backend RBAC checks JWT, not response body
```

### Symptoms

- `401: Missing required scope: orders:create`
- Server role couldn't place orders
- Cashier role couldn't process payments
- Kitchen role couldn't update order status
- All authorization checks failed

### The Fix (Commit 4fd9c9d2)

**File**: `/server/src/routes/auth.routes.ts:75-107`

```typescript
// CORRECT ORDER:
// 1. Fetch scopes from database FIRST
const { data: scopesData } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', userRole.role);

const scopes = scopesData?.map(s => s.scope) || [];

// 2. Create JWT with scopes included
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  scope: scopes,  //  CRITICAL FIX
  auth_method: 'email',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};

const token = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);
```

### Why Undetected for 6 Days

The system had fallback logic that sometimes worked:

```typescript
// Backend RBAC middleware
const scopes = decoded.scope || req.user.scopes || [];
// If JWT missing scope, check req.user.scopes (from session)
// This fallback masked the bug intermittently
```

### Prevention Rules

1. **Fetch scopes BEFORE JWT creation**
2. **Include scope in JWT payload** (not just response)
3. **Validate JWT structure** in tests
4. **No fallback logic** for critical fields

### References

- Commit: `4fd9c9d2` (fix), `5dc74903` (bug introduced)
- ADR: [ADR-010 JWT Payload Standards](../../docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md)

---

## Restaurant ID Sync Failure (8 Days)

**Date**: November 2-10, 2025
**Duration**: 8 days
**Cost**: $12,000+ engineering time
**Severity**: P1 High

### The Problem

Login hung at "Signing in..." because React state `restaurantId` not synced with `httpClient.currentRestaurantId`.

### Root Cause

```typescript
// Demo session cleanup removed these sync calls
setRestaurantId(response.restaurantId);  // React state only
// Missing: setCurrentRestaurantId(response.restaurantId)

// httpClient makes API call without X-Restaurant-ID header
// Backend validateRestaurantAccess queries user_restaurants table
// Query hangs without timeout (no restaurant_id to filter on)
```

### Symptoms

- Login stuck at "Signing in..." indefinitely
- `/api/v1/auth/me` request hangs
- No error message (timeout, not rejection)

### The Fix (Commit acd6125c)

**File**: `/client/src/contexts/AuthContext.tsx`

Added `setCurrentRestaurantId()` at **5 critical locations**:

```typescript
// Line 82: Session restoration
setRestaurantId(session.restaurantId);
setCurrentRestaurantId(session.restaurantId);  //  Added

// Line 152: Auth state change
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  //  Added

// Line 227: Email/password login
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  //  Added

// Line 263: PIN login
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  //  Added

// Line 315: Station login
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  //  Added
```

### Prevention Rules

1. **Always sync React state with httpClient global state**
2. **Add database query timeout** (5s) to prevent hangs
3. **Test all login flows** after state management changes

### References

- Commit: `acd6125c` (fix), `5dc74903` (bug introduced)

---

## Middleware Ordering Bug (3 Days)

**Date**: November 5-7, 2025
**Duration**: 3 days
**Cost**: $4,000+ engineering time
**Severity**: P2 Medium

### The Problem

Manager role couldn't save floor plans due to incorrect middleware order.

### Root Cause

```typescript
// WRONG ORDER
router.post('/tables',
  validateRestaurantAccess,  // Runs FIRST, req.user undefined!
  authenticate,              // Runs SECOND, sets req.user
  requireScopes(['tables:update']),
  handler
);

// validateRestaurantAccess needs req.user but it's not set yet
// Returns: 401 "Authentication required"
```

### The Fix (Commit 38f7bba0)

**File**: `/server/src/routes/tables.routes.ts`

```typescript
// CORRECT ORDER
router.post('/tables',
  authenticate,                    // 1. Set req.user
  validateRestaurantAccess,        // 2. Validate restaurant access
  requireScopes(['tables:update']), // 3. Check permissions
  handler
);
```

### Prevention Rules

1. **Standard middleware order**: authenticate → validateRestaurantAccess → requireScopes
2. **Never change middleware order** without testing
3. **Add integration tests** for middleware chain

### References

- Commit: `38f7bba0` (fix)

---

## Multi-Tenancy Security Vulnerability (1 Day)

**Date**: October 25, 2025
**Duration**: 1 day (caught in security audit)
**Cost**: $8,000+ engineering time
**Severity**: P0 Critical Security

### The Problem

Users could access data from other restaurants by changing `X-Restaurant-ID` header.

### Root Cause

```typescript
// VULNERABLE CODE
export async function authenticate(req, res, next) {
  const decoded = jwt.verify(token, secret);

  // BUG: Trusting client-provided header without validation
  req.restaurantId = req.headers['x-restaurant-id'];
  req.user = decoded;

  next();  // No validation that user has access!
}

// User from Restaurant A sends X-Restaurant-ID: restaurant-b-uuid
// Backend accepts it → cross-tenant data leak
```

### Attack Scenario

```bash
# Attacker logs in to Restaurant A
curl -X POST /api/v1/auth/login \
  -d '{"email":"user@restaurant-a.com","password":"pass"}'

# Receives token for Restaurant A
TOKEN="eyJhbG..."

# Changes X-Restaurant-ID to Restaurant B
curl -X GET /api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Restaurant-ID: restaurant-b-uuid"

# SUCCESS - Returns Restaurant B orders! 
```

### The Fix (Commit df228afd)

**Files**:
- `/server/src/middleware/auth.ts`: Removed premature `req.restaurantId` assignment
- `/server/src/middleware/restaurantAccess.ts`: Added validation before setting

```typescript
// auth.ts: Only extract from JWT (trusted)
export async function authenticate(req, res, next) {
  const decoded = jwt.verify(token, secret);

  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    scopes: decoded.scope,
    restaurant_id: decoded.restaurant_id  // From JWT only
  };

  // Do NOT set req.restaurantId here
  next();
}

// restaurantAccess.ts: Validate before setting
export async function validateRestaurantAccess(req, res, next) {
  const requestedRestaurantId = req.headers['x-restaurant-id'];

  // Verify user has access to this restaurant
  const { data } = await supabase
    .from('user_restaurants')
    .select('*')
    .eq('user_id', req.user.id)
    .eq('restaurant_id', requestedRestaurantId)
    .single();

  if (!data) {
    throw Forbidden('Access denied to this restaurant');
  }

  // ONLY set after validation passes
  req.restaurantId = requestedRestaurantId;
  next();
}
```

### Impact

- **8-9 failing multi-tenancy tests** fixed
- Prevented potential data breach
- All 24 multi-tenancy tests now passing

### Prevention Rules

1. **Defense in depth**: JWT + middleware + RLS
2. **Never trust client headers** without validation
3. **Validate restaurant access** against database
4. **Test cross-tenant scenarios** in security suite

### References

- Commit: `df228afd` (fix)
- Security audit finding

---

## Summary Table

| Incident | Duration | Cost | Root Cause | Detection |
|----------|----------|------|------------|-----------|
| STRICT_AUTH drift | 48 days | $20K+ | Environment parity | Manual testing |
| JWT scope missing | 10 days | $48K+ | Code refactor order | Production error |
| Restaurant ID sync | 8 days | $12K+ | State management | User report |
| Middleware ordering | 3 days | $4K+ | Wrong order | Manual testing |
| Multi-tenancy vuln | 1 day | $8K+ | Missing validation | Security audit |
| **TOTAL** | **70 days** | **$92K+** | — | — |

---

## Common Patterns Across Incidents

1. **Environment Drift**: Local works, production fails
2. **Refactoring Bugs**: Code changes broke implicit contracts
3. **State Management**: React state vs global state desync
4. **Missing Validation**: Trusting client input
5. **Test Coverage Gaps**: Issues not caught by tests

---

**Related**: [PREVENTION.md](./PREVENTION.md), [ADR-011](../../docs/explanation/architecture-decisions/ADR-011-authentication-evolution.md)


## Solution Patterns

# Authentication & Authorization Patterns

## 1. Dual Authentication Architecture

### Pattern Overview

The system runs TWO authentication methods in parallel:

```typescript
// Priority 1: Supabase Auth (Production)
// - Email/password for managers/owners
// - httpOnly cookies, auto token refresh
// - Secure by default

// Priority 2: Custom JWT in localStorage (Fallback)
// - Demo users (development)
// - PIN authentication (shared devices)
// - Station authentication (KDS displays)
// - Voice ordering (WebRTC context)
```

### Implementation

**File**: `/client/src/services/http/httpClient.ts:109-148`

```typescript
async request(endpoint, options) {
  // 1. Check Supabase first
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
    logger.info('Using Supabase session');
  } else {
    // 2. Fallback to localStorage
    const savedSession = localStorage.getItem('auth_session');

    if (savedSession) {
      const parsed = JSON.parse(savedSession);

      // Validate expiry
      if (parsed.session?.accessToken &&
          parsed.session?.expiresAt > Date.now() / 1000) {
        headers.set('Authorization', `Bearer ${parsed.session.accessToken}`);
        logger.info('Using localStorage session');
      }
    }
  }

  return super.request(endpoint, { headers, ...options });
}
```

### When to Use Each Method

| Auth Method | Use Case | Storage | Lifetime |
|-------------|----------|---------|----------|
| Supabase Auth | Manager/owner login | Supabase localStorage | 1 hour (auto-refresh) |
| Custom JWT | Demo, PIN, station, voice | Custom localStorage | 1-8 hours |
| Anonymous | Customer orders | Ephemeral | 1 hour |

### Critical Rule

**NEVER use `supabase.auth.signInWithPassword()` for workspace login.**

Why? Supabase JWTs lack `restaurant_id` and `scope` fields required by STRICT_AUTH mode.

```typescript
//  WRONG - Breaks with STRICT_AUTH=true
const { data } = await supabase.auth.signInWithPassword({ email, password });

//  CORRECT - Custom JWT with all required fields
const response = await httpClient.post('/api/v1/auth/login', {
  email,
  password,
  restaurantId: '11111111-1111-1111-1111-111111111111'
});
```

---

## 2. JWT Payload Requirements

### Required Fields (ADR-010)

ALL JWTs MUST include:

```typescript
interface JWTPayload {
  // Identity
  sub: string;           // User ID (UUID)
  email: string;         // Email address

  // Authorization
  role: string;          // server, kitchen, manager, etc.
  scope: string[];       // Permission scopes (CRITICAL)

  // Multi-tenancy
  restaurant_id: string; // Restaurant UUID (CRITICAL)

  // Metadata
  auth_method: 'email' | 'pin' | 'station';
  iat: number;           // Issued at
  exp: number;           // Expiration
}
```

### JWT Creation Pattern (CORRECT)

**File**: `/server/src/routes/auth.routes.ts:75-107`

```typescript
// CRITICAL: Fetch scopes BEFORE creating JWT
const { data: scopesData, error: scopesError } = await supabase
  .from('role_scopes')
  .select('scope')
  .eq('role', userRole.role);

if (scopesError) {
  logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
}

const scopes = scopesData?.map(s => s.scope) || [];

// Generate JWT with ALL required fields
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,  //  Required for STRICT_AUTH
  scope: scopes,                 //  Required for RBAC
  auth_method: 'email',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};

const token = jwt.sign(payload, process.env.SUPABASE_JWT_SECRET);
```

### Common JWT Creation Bugs

```typescript
//  BUG: Creating JWT before fetching scopes (commit 4fd9c9d2)
const token = jwt.sign({ sub, email, role }, secret);
const scopes = await fetchScopes(role);  // TOO LATE!

//  BUG: Missing restaurant_id (CL-AUTH-001)
const payload = { sub, email, role, scope };
// Will fail with STRICT_AUTH=true

//  BUG: Using Supabase JWT directly
const { data } = await supabase.auth.signInWithPassword(...);
return data.session;  // Missing custom fields

//  CORRECT: Fetch scopes first, include restaurant_id
const scopes = await fetchScopes(role);
const payload = { sub, email, role, scope: scopes, restaurant_id };
const token = jwt.sign(payload, secret);
```

---

## 3. Middleware Ordering Pattern

### The ONLY Correct Order

```typescript
router.post('/orders',
  authenticate,                    // 1. Validate JWT, set req.user
  validateRestaurantAccess,        // 2. Verify user can access restaurant
  requireScopes(['orders:create']), // 3. Check specific permissions
  async (req, res) => {
    // Handler code
  }
);
```

### Why Order Matters

**Commit 38f7bba0**: Manager couldn't save floor plans due to middleware ordering bug.

```typescript
//  WRONG ORDER - validateRestaurantAccess runs before authenticate
router.post('/tables',
  validateRestaurantAccess,  // req.user is undefined!
  authenticate,
  requireScopes(['tables:update']),
  handler
);

// Result: 401 Unauthorized (user not set yet)
```

### Middleware Responsibilities

| Middleware | Input Requirements | Sets | Purpose |
|------------|-------------------|------|---------|
| `authenticate` | Authorization header | `req.user`, `req.restaurantId` | Validate JWT signature |
| `validateRestaurantAccess` | `req.user` | `req.restaurantRole` | Multi-tenancy check |
| `requireScopes` | `req.user.scopes` | none | Permission check |

### Pattern Template

```typescript
// Protected endpoint (staff only)
router.post('/resource',
  authenticate,
  validateRestaurantAccess,
  requireScopes(['resource:create']),
  handler
);

// Optional auth (menu browsing)
router.get('/menu',
  optionalAuth,  // Sets req.user if token present
  handler
);

// Public endpoint (customer orders)
router.post('/orders',
  optionalAuth,
  handler  // Check req.user to determine if staff or customer
);
```

---

## 4. Environment Parity Pattern (STRICT_AUTH)

### The Problem (CL-AUTH-001)

**48 days of production failures** due to environment drift:

```bash
# Local development (.env)
STRICT_AUTH=false  # Allowed legacy tokens

# Production (Render)
STRICT_AUTH=true   # Required restaurant_id in JWT

# Result: Works locally, breaks in production
```

### The Solution

**ALWAYS test with STRICT_AUTH=true locally** before deploying.

```bash
# server/.env (development)
STRICT_AUTH=true  # Same as production
SUPABASE_JWT_SECRET=your-secret
KIOSK_JWT_SECRET=your-secret
```

### STRICT_AUTH Enforcement

**File**: `/server/src/middleware/auth.ts:84-92`

```typescript
const strictAuth = process.env['STRICT_AUTH'] === 'true';

// Reject tokens without restaurant_id
if (strictAuth && !decoded.restaurant_id) {
  logger.error('⛔ STRICT_AUTH enabled - token missing restaurant_id rejected', {
    userId: decoded.sub,
    path: req.path,
    role: userRole
  });
  throw Unauthorized('Token missing restaurant context in strict auth mode');
}
```

### Pre-Commit Check Pattern

```bash
# .husky/pre-commit
if git diff --cached --name-only | grep -q "AuthContext\|auth.routes\|auth.middleware"; then
  echo "  Auth files changed - Did you test with STRICT_AUTH=true locally?"
  echo "   Add 'STRICT_AUTH=true' to server/.env and test login flow"
fi
```

---

## 5. Restaurant ID Sync Pattern

### The Two-State Problem (Commit acd6125c)

React state and httpClient global state must stay synchronized:

```typescript
// React state (for UI)
const [restaurantId, setRestaurantId] = useState<string>();

// Global state (for API calls)
httpClient.currentRestaurantId = restaurantId;
```

### Critical Sync Points

**File**: `/client/src/contexts/AuthContext.tsx`

```typescript
//  CORRECT: Sync at ALL 5 locations

// 1. Session restoration (line 82)
if (session) {
  setRestaurantId(session.restaurantId);
  setCurrentRestaurantId(session.restaurantId);  // Sync httpClient
}

// 2. Auth state change (line 152)
if (event === 'SIGNED_IN') {
  setRestaurantId(response.restaurantId);
  setCurrentRestaurantId(response.restaurantId);  // Sync httpClient
}

// 3. Email/password login (line 227)
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  // Sync httpClient

// 4. PIN login (line 263)
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  // Sync httpClient

// 5. Station login (line 315)
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  // Sync httpClient
```

### Bug Pattern

```typescript
//  WRONG: Only update React state
setRestaurantId(response.restaurantId);
// Result: httpClient sends API calls without X-Restaurant-ID header
// Backend validateRestaurantAccess hangs on database query

//  CORRECT: Update both
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);
```

---

## 6. localStorage Session Storage Pattern

### The Pattern (Commit a3514472)

After successful login, ALWAYS store session in localStorage:

```typescript
//  CORRECT: Accessible to httpClient
localStorage.setItem('auth_session', JSON.stringify({
  user: response.user,
  session: {
    accessToken: response.session.access_token,
    refreshToken: response.session.refresh_token,
    expiresIn: response.session.expires_in,
    expiresAt: Date.now() / 1000 + response.session.expires_in
  },
  restaurantId: response.restaurantId
}));

// Also sync with Supabase for Realtime subscriptions
await supabase.auth.setSession({
  access_token: response.session.access_token,
  refresh_token: response.session.refresh_token
});
```

### Why Both Storage Locations?

| Storage | Purpose | Who Reads It |
|---------|---------|--------------|
| localStorage (auth_session) | API calls via httpClient | `httpClient.ts` |
| Supabase localStorage | Realtime subscriptions | Supabase SDK |

### Bug Pattern

```typescript
//  WRONG: Only React state
setSession(sessionData);
// Result: httpClient can't find token, returns 401

//  WRONG: Only Supabase
await supabase.auth.setSession(sessionData);
// Result: httpClient can't find token for voice ordering

//  CORRECT: Both locations
localStorage.setItem('auth_session', JSON.stringify(sessionData));
await supabase.auth.setSession(sessionData);
```

---

## 7. Multi-Tenancy Security Pattern

### Defense in Depth (3 Layers)

**Layer 1: JWT Token**
```typescript
// JWT must contain restaurant_id
const payload = { ..., restaurant_id: '...' };
```

**Layer 2: Middleware Validation**

**File**: `/server/src/middleware/restaurantAccess.ts:22-82`

```typescript
export async function validateRestaurantAccess(req, res, next) {
  // 1. Ensure authenticated
  if (!req.user) throw Unauthorized('Authentication required');

  // 2. Get requested restaurant ID
  const requestedRestaurantId =
    req.headers['x-restaurant-id'] || req.restaurantId;

  if (!requestedRestaurantId) {
    throw Forbidden('Restaurant ID is required');
  }

  // 3. Admin bypass
  if (req.user.role === 'admin') {
    req.restaurantId = requestedRestaurantId;
    return next();
  }

  // 4. Validate user has access to this restaurant
  const { data, error } = await supabase
    .from('user_restaurants')
    .select('restaurant_id, role')
    .eq('user_id', req.user.id)
    .eq('restaurant_id', requestedRestaurantId)
    .single();

  if (error || !data) {
    throw Forbidden('Access denied to this restaurant');
  }

  // 5. ONLY set after validation passes
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = data.role;

  next();
}
```

**Layer 3: Database RLS Policies**
```sql
-- Supabase Row-Level Security
CREATE POLICY "Users can only access their restaurants"
ON orders FOR ALL
USING (restaurant_id IN (
  SELECT restaurant_id FROM user_restaurants
  WHERE user_id = auth.uid()
));
```

### Critical Security Bug (Commit df228afd)

```typescript
//  VULNERABLE: Set restaurant_id before validation
export async function authenticate(req, res, next) {
  const decoded = jwt.verify(token, secret);

  // BUG: Trusting client-provided header without validation
  req.restaurantId = req.headers['x-restaurant-id'];
  req.user = decoded;
  next();
}

// Result: User from Restaurant A can access Restaurant B by changing header
```

### Correct Pattern

```typescript
//  SECURE: Never trust client-provided restaurant_id
// 1. authenticate: Only extract from JWT (trusted source)
// 2. validateRestaurantAccess: Verify against database
// 3. Only then set req.restaurantId
```

---

## 8. Slug-to-UUID Resolution Pattern

### The Pattern (Hardcoded for Single Restaurant)

**File**: `/client/src/contexts/AuthContext.tsx:195-199`

```typescript
// Hardcode slug resolution (no network call)
const GROW_RESTAURANT_UUID = '11111111-1111-1111-1111-111111111111';
const resolvedRestaurantId = restaurantId === 'grow'
  ? GROW_RESTAURANT_UUID
  : restaurantId;
```

### Why Hardcoded?

1. **Avoid network call during login** (potential failure point)
2. **Single restaurant deployment** (no need for dynamic lookup)
3. **Simplifies auth flow** (fewer dependencies)

### Bug Pattern

```typescript
//  WRONG: Network call during auth
const response = await httpClient.get(`/api/v1/restaurants/slug/${slug}`);
const restaurantId = response.id;
// Problems:
// - Network failure blocks login
// - Slug middleware dependency
// - Race condition during auth

//  CORRECT: Hardcoded for known restaurants
const RESTAURANT_MAP = {
  'grow': '11111111-1111-1111-1111-111111111111',
  'demo': '22222222-2222-2222-2222-222222222222'
};
const restaurantId = RESTAURANT_MAP[slug] || slug;
```

---

## Pattern Checklist

Before deploying auth changes:

- [ ] JWT includes ALL required fields (sub, email, role, scope, restaurant_id)
- [ ] Scopes fetched BEFORE JWT creation
- [ ] Middleware order: authenticate → validateRestaurantAccess → requireScopes
- [ ] localStorage session stored after login
- [ ] React state and httpClient.currentRestaurantId synced
- [ ] STRICT_AUTH=true tested locally
- [ ] Multi-tenancy validation enforced
- [ ] No Supabase direct auth for workspace login
- [ ] Slug-to-UUID hardcoded (no network call)
- [ ] Token expiry validation in httpClient

---

**Related**: [ADR-006](../../docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md), [ADR-010](../../docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md)


## Quick Reference

# Auth Quick Reference - Rapid Debugging Guide

## Common Error Messages → Fixes

### `401: No token provided`

**Cause**: localStorage session not set after login

**Check**:
```javascript
localStorage.getItem('auth_session')
// Should return JSON object with session.accessToken
```

**Fix**:
```typescript
// After successful login, store session
localStorage.setItem('auth_session', JSON.stringify({
  user: response.user,
  session: {
    accessToken: response.session.access_token,
    expiresAt: Date.now() / 1000 + response.session.expires_in
  },
  restaurantId: response.restaurantId
}));
```

---

### `401: Token missing restaurant context in strict auth mode`

**Cause**: JWT missing `restaurant_id` field, STRICT_AUTH=true

**Check**:
```bash
# Decode JWT token
echo "$TOKEN" | cut -d. -f2 | base64 -d | jq
# Look for "restaurant_id" field
```

**Fix**: Use custom auth endpoint instead of Supabase direct:
```typescript
//  WRONG
await supabase.auth.signInWithPassword({ email, password });

//  CORRECT
await httpClient.post('/api/v1/auth/login', {
  email, password, restaurantId
});
```

---

### `401: Missing required scope: orders:create`

**Cause**: JWT missing `scope` field

**Check**:
```bash
# Decode JWT and look for scope array
echo "$TOKEN" | cut -d. -f2 | base64 -d | jq .scope
```

**Fix**: Fetch scopes BEFORE creating JWT
```typescript
//  CORRECT ORDER
const scopes = await fetchScopes(role);
const payload = { ..., scope: scopes };  // Include in JWT
const token = jwt.sign(payload, secret);
```

**Location**: `/server/src/routes/auth.routes.ts:75-100`

---

### `403: Access denied to this restaurant`

**Cause**: User doesn't have access to requested restaurant

**Check**:
```sql
-- Verify user_restaurants entry
SELECT * FROM user_restaurants
WHERE user_id = 'user-uuid'
  AND restaurant_id = 'restaurant-uuid';
```

**Fix**: Grant access in database or check correct restaurant ID being sent

---

### Authentication modal loop (forever loading)

**Cause**: Supabase JWT incompatible with STRICT_AUTH

**Check**:
```bash
# Check backend environment
grep STRICT_AUTH server/.env
# Should be 'true'
```

**Fix**: Switch to custom auth endpoint (see CL-AUTH-001)

---

### Login hangs at "Signing in..."

**Cause**: React state not synced with httpClient.currentRestaurantId

**Check**:
```typescript
// In browser console after login attempt
httpClient.currentRestaurantId
// Should return restaurant UUID, not undefined
```

**Fix**: Add sync call after setting restaurant ID
```typescript
setRestaurantId(response.restaurantId);
setCurrentRestaurantId(response.restaurantId);  // Add this
```

**Location**: `/client/src/contexts/AuthContext.tsx` (5 locations)

---

## Correct Middleware Order

```typescript
router.post('/endpoint',
  authenticate,                    // 1. FIRST - Validate JWT
  validateRestaurantAccess,        // 2. SECOND - Check tenant access
  requireScopes(['scope:action']), // 3. THIRD - Check permissions
  handler
);
```

**Wrong Order = 401 Errors**

---

## JWT Structure Template

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "server",
  "scope": ["orders:create", "orders:read"],
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "auth_method": "email",
  "iat": 1700000000,
  "exp": 1700028800
}
```

**Missing ANY field = Auth failure**

---

## Testing Commands

### Validate environment
```bash
npm run validate:auth-env
```

### Test JWT structure
```bash
npm run test -- auth/jwt-structure
```

### Test with STRICT_AUTH=true
```bash
STRICT_AUTH=true npm run test:server
```

### Test middleware chain
```bash
npm run test -- middleware/auth-chain
```

### Full auth test suite
```bash
npm run test:auth
```

### Integration tests
```bash
npm run test:e2e -- auth
```

---

## Debug JWT Token

```bash
# Decode JWT (get from browser localStorage or Network tab)
echo "eyJhbG..." | cut -d. -f2 | base64 -d | jq

# Check required fields
echo "eyJhbG..." | cut -d. -f2 | base64 -d | jq '{
  has_sub: (has("sub")),
  has_email: (has("email")),
  has_role: (has("role")),
  has_scope: (has("scope")),
  has_restaurant_id: (has("restaurant_id"))
}'

# Verify scope array
echo "eyJhbG..." | cut -d. -f2 | base64 -d | jq '.scope | type'
# Should output: "array"

# Check expiry
echo "eyJhbG..." | cut -d. -f2 | base64 -d | jq '.exp'
# Compare with current timestamp: date +%s
```

---

## File Locations (Quick Access)

| Component | File Path | Key Lines |
|-----------|-----------|-----------|
| Auth middleware | `/server/src/middleware/auth.ts` | 23-115 |
| Restaurant access | `/server/src/middleware/restaurantAccess.ts` | 16-94 |
| Login endpoint | `/server/src/routes/auth.routes.ts` | 22-107 |
| Frontend auth | `/client/src/contexts/AuthContext.tsx` | 184-375 |
| httpClient dual auth | `/client/src/services/http/httpClient.ts` | 109-148 |
| STRICT_AUTH check | `/server/src/middleware/auth.ts` | 84-92 |
| JWT creation | `/server/src/routes/auth.routes.ts` | 87-107 |

---

## Environment Variables

### Required (Both Local and Production)

```bash
# Backend (.env)
STRICT_AUTH=true
SUPABASE_JWT_SECRET=your-secret-here
KIOSK_JWT_SECRET=your-secret-here

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Check Environment

```bash
# Verify STRICT_AUTH is true
grep STRICT_AUTH server/.env

# Verify secrets are set
grep JWT_SECRET server/.env

# Validate all auth environment variables
npm run validate:auth-env
```

---

## Restaurant ID Resolution

### Hardcoded Mapping (Single Restaurant)

```typescript
const GROW_RESTAURANT_UUID = '11111111-1111-1111-1111-111111111111';

// Resolve slug to UUID
const resolvedRestaurantId = restaurantId === 'grow'
  ? GROW_RESTAURANT_UUID
  : restaurantId;
```

**Location**: `/client/src/contexts/AuthContext.tsx:195-199`

**Why hardcoded?** Avoids network call during login (potential failure point)

---

## State Sync Pattern

### The Two Places to Update

```typescript
// 1. React state (for UI)
setRestaurantId(id);

// 2. httpClient global state (for API calls)
setCurrentRestaurantId(id);
```

### Where to Add Sync (5 Locations)

1. Session restoration - Line 82
2. Auth state change - Line 152
3. Email/password login - Line 227
4. PIN login - Line 263
5. Station login - Line 315

**File**: `/client/src/contexts/AuthContext.tsx`

---

## Authentication Flow Checklist

- [ ] 1. User submits credentials
- [ ] 2. Frontend calls POST `/api/v1/auth/login`
- [ ] 3. Backend validates with Supabase
- [ ] 4. Backend fetches user role from `user_restaurants`
- [ ] 5. Backend fetches scopes from `role_scopes` (BEFORE JWT)
- [ ] 6. Backend creates JWT with all required fields
- [ ] 7. Backend returns user + session + restaurantId
- [ ] 8. Frontend stores in localStorage
- [ ] 9. Frontend syncs with Supabase
- [ ] 10. Frontend updates React state
- [ ] 11. Frontend syncs httpClient.currentRestaurantId
- [ ] 12. Navigate to dashboard

**If ANY step fails, login hangs or returns 401**

---

## Browser Console Debugging

```javascript
// Check if session stored
localStorage.getItem('auth_session')

// Parse and inspect
JSON.parse(localStorage.getItem('auth_session'))

// Check httpClient state
httpClient.currentRestaurantId

// Check Supabase session
supabase.auth.getSession().then(({ data }) => console.log(data))

// Decode JWT token
const token = JSON.parse(localStorage.getItem('auth_session')).session.accessToken
const [header, payload, signature] = token.split('.')
JSON.parse(atob(payload))
```

---

## Quick Fix Commands

### Reset auth state (development)
```javascript
// Browser console
localStorage.removeItem('auth_session')
localStorage.clear()
location.reload()
```

### Regenerate JWT with correct structure
```bash
# Run migration to update role_scopes
npm run db:push

# Restart server to pick up changes
npm run dev:server
```

### Fix STRICT_AUTH mismatch
```bash
# Update local .env
echo "STRICT_AUTH=true" >> server/.env

# Restart server
npm run dev:server
```

---

## Incident Reference

| Issue | Incident ID | Fix Commit | Docs |
|-------|-------------|------------|------|
| STRICT_AUTH mismatch | CL-AUTH-001 | 9e97f720 | [Link](../../claudelessons-v2/knowledge/incidents/CL-AUTH-001-supabase-direct-auth-strict-mode.md) |
| JWT scope missing | (10-day bug) | 4fd9c9d2 | [ADR-010](../../docs/explanation/architecture-decisions/ADR-010-jwt-payload-standards.md) |
| Restaurant ID sync | (Login hang) | acd6125c | [INCIDENTS.md](./INCIDENTS.md) |
| Middleware ordering | (Manager blocked) | 38f7bba0 | [INCIDENTS.md](./INCIDENTS.md) |
| Multi-tenancy vuln | (Security) | df228afd | [INCIDENTS.md](./INCIDENTS.md) |

---

## Emergency Contacts

- **ADR-006**: Dual Authentication Pattern
- **ADR-010**: JWT Payload Standards
- **ADR-011**: Authentication Evolution (3 rewrites)
- **CL-AUTH-001**: Primary incident documentation

---

## One-Line Fixes

```bash
# Missing restaurant_id in JWT
# Fix: Use custom auth endpoint, not Supabase direct

# Missing scope in JWT
# Fix: Fetch scopes before jwt.sign()

# localStorage session not set
# Fix: localStorage.setItem('auth_session', ...)

# httpClient not synced
# Fix: setCurrentRestaurantId(restaurantId)

# Wrong middleware order
# Fix: authenticate → validateRestaurantAccess → requireScopes

# STRICT_AUTH mismatch
# Fix: STRICT_AUTH=true in local .env
```

---

**When in doubt**: Check JWT structure first (decode token), then check STRICT_AUTH setting.


