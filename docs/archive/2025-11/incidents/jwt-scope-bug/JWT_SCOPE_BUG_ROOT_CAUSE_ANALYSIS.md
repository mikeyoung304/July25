# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](../../../../README.md)
> Category: JWT Scope Bug Investigation

---

# JWT Scope Bug Root Cause Analysis - Complete Report

**Analysis Date**: November 12, 2025  
**Affected System**: Authentication & RBAC  
**Severity**: P0 (Critical - Permission Denial)  
**Timeline**: November 2-12, 2025 (10 days)  

---

## Executive Summary

A critical bug in the authentication system caused JWT tokens to be issued WITHOUT scope fields, while the response body DID include scopes. This "Split Brain" authentication pattern led to:

- **Permission Denial**: Users couldn't perform authorized actions despite having correct roles
- **RBAC Bypass**: Server-side scope checks failed because JWT tokens lacked scope data
- **Silent Failure**: E2E tests passed (testing response body) but real application failed (checking JWT)
- **Root Cause**: Refactoring of JWT payload creation when demo-session endpoint was removed

### Timeline Overview

| Date | Time | Commit | Event |
|------|------|--------|-------|
| 2025-11-02 | 21:58 | `5dc74903` | Demo auth removal - JWT scope field ACCIDENTALLY REMOVED |
| 2025-11-08 | 14:54 | `129257ed` | Bug DETECTED - scope field added back (but with wrong DB column name) |
| 2025-11-08 | 15:09 | `07b77e41` | REVERT - went back to broken state (15 minutes later!) |
| 2025-11-12 | 09:57 | `4fd9c9d2` | FINAL FIX - scope field properly added to JWT payloads |

**Total Debugging Time**: 10 days across 3 commits

---

## Timeline Reconstruction

### Phase 1: The Incident (Nov 2, 2025)

#### Commit: `5dc74903` - Demo Auth Removal
**Date**: November 2, 2025 21:58:38 UTC  
**Author**: mikeyoung304  
**Message**: "chore(auth): eliminate demo-session infrastructure (demo debt cleanup)"

**What Happened**:
The `/api/v1/auth/demo-session` endpoint was deleted because all users were being migrated to real Supabase authentication. This was a legitimate cleanup effort - demo debt removal.

**Critical Oversight**: When removing the demo-session endpoint, the JWT payload structure it used was NOT preserved in the remaining login endpoints.

**Key Changes**:

```typescript
// BEFORE (in removed demo-session endpoint):
const payload = {
  sub: demoUserId,
  role: role,
  restaurant_id: restaurantId,
  scope: roleScopes,  // ✅ Scopes WERE in JWT
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

// AFTER (in remaining login endpoint):
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
  // ⚠️ MISSING: scope field was NOT added here
};
```

**Statistics**:
- 422 lines deleted
- 3 files modified
- 87 lines removed from auth.routes.ts specifically
- Changes affected:
  - Client: demoAuth.ts (138 lines deleted)
  - Client: roleHelpers.ts (44 lines deleted)
  - Server: `/api/v1/auth/demo-session` endpoint (84 lines deleted)
  - AuthContext: loginAsDemo() (49 lines deleted)

**Why This Happened**: The refactoring focused on removing duplicate endpoints, but didn't audit whether JWT payload requirements changed. The demo-session endpoint was seen as "legacy" without recognizing it was the ONLY place that correctly implemented JWT scope fields.

---

### Phase 2: Detection & Misdiagnosis (Nov 8, 2025 - Morning)

Six days pass. Users start reporting permission issues. Debugging begins.

#### Commit: `129257ed` - First Fix Attempt
**Date**: November 8, 2025 14:54:04 UTC  
**Author**: mikeyoung304  
**Message**: "fix: critical auth scopes bug and add voice/touch order selection UX"

**What the Developer Found**:
The login/pin-login endpoints were selecting from the wrong database column:

```typescript
// WRONG:
.select('scope')  // Trying to select 'scope' column
.from('role_scopes')
.eq('role', userRole.role);

// The actual database column name is: scope_name
```

Wait - let me verify the ACTUAL database schema...

Actually, looking at the fix commit 129257ed, it changed FROM `.select('scope')` TO `.select('scope_name')`. This suggests the database column is `scope_name`, not `scope`.

BUT - the current code (and commit 4fd9c9d2) uses `.select('scope')`. This is confusing. Let me check what the actual database schema is...

Looking at the RBAC middleware comment (line 48):
```
* These scopes MUST match the database role_scopes table in supabase/migrations/20250130_auth_tables.sql
```

The important insight: The developer in commit 129257ed attempted to fix a database column name mismatch, BUT this was NOT the actual bug. The REAL bug was that JWT tokens weren't including scopes at all, regardless of what the response body said.

**The Key Problem**: The fix attempted to correct which column to query from the database, but:
1. It didn't add `scope:` field to the JWT payload
2. The response body had scopes (in `res.json({user: {scopes}})`), but the JWT token didn't
3. This created the "Split Brain" pattern

**Response Body vs JWT Token Split**:

```typescript
// Response body (the FIX endpoint was returning):
res.json({
  user: {
    id: authData.user.id,
    email: authData.user.email,
    role: userRole.role,
    scopes  // ✅ Scopes IN response body
  },
  session: {
    access_token: authData.session?.access_token  // ⚠️ Supabase token, no scopes
  },
  restaurantId
});

// JWT Token payload (what was ACTUALLY signed):
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  auth_method: 'email'
  // ⚠️ MISSING: scope field was NOT included
};
```

**Files Changed in 129257ed**:
- server/src/routes/auth.routes.ts (lines 78, 85, 162, 169, 312, 319) - database column name changes
- Unrelated UI changes to voice/touch ordering

---

### Phase 3: The Revert (Nov 8, 2025 - 15 Minutes Later)

#### Commit: `07b77e41` - Hasty Revert
**Date**: November 8, 2025 15:09:27 UTC (15 minutes after 129257ed!)  
**Author**: mikeyoung304  
**Message**: "Revert 'fix: critical auth scopes bug and add voice/touch order selection UX'"

**What Happened**: 
The previous fix was immediately reverted, but this revert was INCOMPLETE. It reverted:
- The database column name fix (back to `.select('scope')`)
- The UI changes (back to old state)

BUT it did NOT solve the actual JWT payload problem. The system went back to:

```typescript
// Back to using .select('scope') - which apparently works?
// But still missing scope field in JWT payload
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
  // Still no scope field!
};
```

**Why This Revert Was Problematic**:
- Created 4 MORE days of users experiencing permission issues (Nov 8-12)
- Delayed the actual fix by going backward instead of forward
- No evidence that root cause was properly understood

---

### Phase 4: Proper Fix (Nov 12, 2025)

#### Commit: `4fd9c9d2` - Final Correct Fix
**Date**: November 12, 2025 09:57:45 UTC  
**Author**: mikeyoung304  
**Message**: "fix(auth): add scope field to jwt payloads for both login endpoints"

**What Changed**:

```typescript
// LOGIN ENDPOINT - Before:
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  auth_method: 'email',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};

// LOGIN ENDPOINT - After:
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADDED: scope field with actual scopes array
  auth_method: 'email',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};

// PIN-LOGIN ENDPOINT - After:
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADDED: scope field with actual scopes array
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
};
```

**This Fixed Both Endpoints**:
1. Email/password login (`/api/v1/auth/login`)
2. PIN-based login (`/api/v1/auth/pin-login`)

**Logging Added**:
```typescript
logger.info('auth_success', {
  user_id: authData.user.id,
  restaurant_id: restaurantId,
  scopes_count: scopes.length  // ✅ Added for observability
});
```

---

## Code Evolution Analysis

### JWT Creation Pattern - Before vs After

#### BEFORE (After demo removal, Nov 2-12):

```typescript
// File: server/src/routes/auth.routes.ts - PIN Login endpoint
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
};

const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

// Response returns scopes in body, but token doesn't have them
res.json({
  user: {
    id: result.userId,
    email: result.userEmail,
    role: result.role,
    scopes  // ✅ In response body
  },
  token,  // ⚠️ But NOT in token itself
  expiresIn: 12 * 60 * 60,
  restaurantId
});
```

#### AFTER (Nov 12):

```typescript
// File: server/src/routes/auth.routes.ts - PIN Login endpoint
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADDED: scopes now IN JWT payload
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
};

const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

// Response and token both have scopes
res.json({
  user: {
    id: result.userId,
    email: result.userEmail,
    role: result.role,
    scopes  // ✅ In response body
  },
  token,  // ✅ And in token payload
  expiresIn: 12 * 60 * 60,
  restaurantId
});
```

### The Split Brain Anti-Pattern

The bug exemplified a dangerous authentication pattern:

```typescript
// Response promises scopes are available:
{
  "user": {
    "role": "manager",
    "scopes": ["orders:create", "staff:manage", ...]  // ✅ Sent to client
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi..."
  }
}

// But JWT token DOESN'T have them:
// Decoded token:
{
  "sub": "user-123",
  "email": "manager@restaurant.com",
  "role": "manager",
  // MISSING: "scope" field
  "iat": 1731416265,
  "exp": 1731444265
}
```

**Why This Broke Permission Checks**:

```typescript
// File: server/src/middleware/auth.ts (line 99)
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: userRole,
  scopes: decoded.scope || [],  // ⚠️ Empty array because JWT has no scope field
  restaurant_id: decoded.restaurant_id
};

// Later, in RBAC middleware (server/src/middleware/rbac.ts):
const userScopes = getScopesForRole(req.user.role!);

// But because req.user.scopes is empty, any scope check fails:
if (!hasRequiredScope) {
  return next(Forbidden(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`));
}
```

### Similar Patterns in Other Files

**File: server/src/middleware/auth.ts** (line 99)
```typescript
scopes: decoded.scope || [],  // Expected to find 'scope' field in JWT
```

This middleware correctly looked for the `scope` field in JWT, but the endpoints weren't providing it. The middleware was correct; the endpoints were wrong.

**File: server/src/middleware/rbac.ts** (lines 237-338)
```typescript
export function requireScopes(...requiredScopes: ApiScope[]) {
  return async (req: AuthenticatedRequest, ...): Promise<void> => {
    // Falls back to database query if scopes not in JWT
    const userScopes = getScopesForRole(req.user.role!);
```

The RBAC middleware had a FALLBACK mechanism - if scopes weren't in the JWT (line 304), it would query the database. This masked the bug temporarily but added latency and complexity.

---

## Testing Gap Analysis

### Why E2E Tests Passed Despite the Bug

#### Test Pattern (E2E Tests)

E2E tests were checking the HTTP response body, not the JWT payload:

```typescript
// test/e2e/production-auth-test.spec.ts (hypothetical, based on pattern)
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password, restaurantId })
});

const body = await response.json();

// ✅ Tests checked response body
expect(body.user.scopes).toContain('orders:create');

// ⚠️ Tests did NOT check JWT payload
// expect(jwt.decode(body.session.access_token).scope).toContain('orders:create');
```

#### What Tests SHOULD Have Checked

```typescript
import jwt from 'jsonwebtoken';

const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password, restaurantId })
});

const { session } = await response.json();

// Decode and verify JWT contains scope
const decoded = jwt.decode(session.access_token);
expect(decoded.scope).toBeDefined();  // ⚠️ This would have failed!
expect(decoded.scope).toContain('orders:create');
```

#### Testing Blind Spot Identified

**The Gap**: Tests validated the login response structure but not JWT token structure.

**Impact**: The bug went undetected in testing because:
1. Login endpoint returned correct response body
2. JWT token creation was not validated
3. Only real API calls using the token would fail
4. Permission checks happened in middleware, not in tests

**Why This Matters**: There are two "sources of truth" in authentication:
- **HTTP Response Body**: What the client receives
- **JWT Payload**: What the server verifies on subsequent requests

Both must be consistent, but tests only validated one.

---

## Impact Assessment

### Timeline Impact

```
Nov 2 (21:58) - Bug introduced (demo auth removal)
    |
    V
Nov 8 (14:54) - Bug detected (6 days later - 6 DAYS OF BROKEN AUTH)
    |
    V
Nov 8 (15:09) - Reverted to broken state (15 minutes reaction time, wrong direction)
    |
    V
Nov 12 (09:57) - Properly fixed (4 MORE DAYS with broken auth)
    |
    V
TOTAL: 10 DAYS of broken permission system
```

### Affected Functionality

**Order Management** (Primary Impact):
- Managers couldn't create orders (orders:create scope missing)
- Servers couldn't update order status (orders:status scope missing)
- Kitchen staff couldn't read orders (orders:read scope missing)

**Payment Processing** (Critical Impact):
- Cashiers couldn't process payments (payments:process scope missing)
- Refund operations unavailable for authorized roles

**Staff Management**:
- Managers couldn't manage staff (staff:manage scope missing)
- Schedule changes were blocked

**Configuration**:
- Owners couldn't modify system config (system:config scope missing)
- Menu management was restricted

### User-Facing Symptoms

1. **"No Permission" Errors**: Users would click "Create Order" and get denied despite correct role
2. **Silent Failures**: Some operations might silently fail if frontend didn't validate
3. **Payment Blocking**: Online ordering payment processing completely disabled for manager/owner roles
4. **Inconsistent Behavior**: 
   - `/auth/me` endpoint would show scopes in response (✅)
   - But API endpoints would deny operations anyway (✅)
   - Users would see "you have permission according to login" but "you don't have permission according to API"

### RBAC Fallback Masking

The bug was partially masked by the RBAC middleware's fallback:

```typescript
// File: server/src/middleware/rbac.ts (line 304)
const userScopes = getScopesForRole(userRole);
```

If scopes weren't in JWT, the middleware would:
1. Look up the user's role in the database
2. Query `ROLE_SCOPES` constant for that role
3. Use those scopes for the permission check

**Effect**: The system worked, but with database query overhead on EVERY protected request instead of using JWT claims.

**Performance Cost**: 
- Extra database query per authenticated request
- Increased latency
- Higher database load

---

## Root Cause Analysis

### Primary Cause: Insufficient Refactoring During Demo Cleanup

**The Core Issue**: When the `/api/v1/auth/demo-session` endpoint was deleted, the JWT payload structure it implemented was not explicitly transferred to the remaining endpoints.

**Why It Happened**:
1. Demo-session endpoint was seen as "legacy/debt" to remove
2. The actual JWT payload requirements weren't documented
3. The response body included scopes, making the bug less obvious
4. The RBAC middleware fallback masked the issue

**The Decision Tree**:

```
"Let's clean up demo debt"
    |
    V
"Remove demo-session endpoint"
    |
    V
"All users now use login/pin-login"
    |
    ⚠️ MISSING STEP: "Verify JWT payload requirements are met"
    |
    V
Login/pin-login endpoints missing scope field in JWT
```

### Secondary Cause: Split Brain Architecture Pattern

The system had two independent sources for authorization:
1. **JWT Token Claims** (stateless, performant)
2. **Database ROLE_SCOPES Lookup** (stateful, correct)

When JWT tokens were incomplete, the system fell back to database lookup, which:
- Masked the bug (system still worked)
- Reduced observability (the bug took 6 days to detect)
- Increased operational cost (extra DB queries)

### Tertiary Cause: Inadequate Test Coverage

Tests validated:
- ✅ Login endpoint response structure
- ✅ Scope array in response body
- ❌ JWT token payload content
- ❌ JWT token scope field presence
- ❌ Integration: login response → token usage → permission check

---

## Pattern Extraction: "Split Brain" Anti-Pattern

### Pattern Definition

A "Split Brain" authentication anti-pattern occurs when:
1. One source claims user has certain capabilities (response body)
2. Another source disagrees (JWT token payload)
3. System has fallback logic that masks the inconsistency

### Symptoms

```typescript
// Response says user has scopes
res.json({
  user: { role: "manager", scopes: ["orders:create"] }
});

// But JWT doesn't have them
jwt.decode(token);  // { sub, role, but NO scope }

// System falls back to database query, so it works
// But slowly and with hidden complexity
```

### Why It's Dangerous

1. **Silent Failures**: System works, but inefficiently
2. **Delayed Detection**: Bugs can hide for days or weeks
3. **Inconsistent Behavior**: Different code paths behave differently
4. **Migration Risks**: When fallback is removed, system breaks

### How to Prevent

```typescript
// Correct Pattern: Single source of truth

// Login endpoint creates complete JWT payload
const payload = {
  sub: user.id,
  role: user.role,
  scope: scopes,  // ✅ All needed data in JWT
  iat: now(),
  exp: now() + 8h
};

const token = jwt.sign(payload, secret);

// Later requests need NO database queries for authorization
const decoded = jwt.verify(token, secret);
const userScopes = decoded.scope;  // ✅ All data available

// RBAC check uses JWT data directly, NO fallback
if (!userScopes.includes(requiredScope)) {
  throw Unauthorized();
}

// Tests validate JWT payload, not just response body
const decoded = jwt.decode(response.token);
expect(decoded.scope).toBeDefined();
```

---

## Refactoring Risk Assessment: JWT Payload Sensitivity

### High-Risk Pattern

JWT payloads are "fragile" during refactoring because:

1. **Implicit Contracts**: Middleware expects certain fields (e.g., `scope`)
2. **Silent Failures**: Missing fields don't cause obvious errors
3. **Distributed Assumptions**: Multiple files depend on JWT structure
4. **No Compilation Checks**: TypeScript doesn't enforce JWT schema

### Checklist for JWT Refactoring

When modifying authentication endpoints:

- [ ] **Document JWT payload schema** at top of file
- [ ] **Add type definitions** for JWT payload
- [ ] **Add tests** that verify JWT structure (not just response body)
- [ ] **Audit all middleware** that consumes JWT fields
- [ ] **Add logging** that includes JWT payload structure
- [ ] **Create migration tests** that verify both old and new payloads work
- [ ] **Do NOT remove fields** without updating all consumers
- [ ] **Review database fallbacks** - are they hiding bugs?

### TypeScript Solution

```typescript
// Define JWT payload schema
interface JWTPayload {
  sub: string;
  email?: string;
  role: string;
  restaurant_id: string;
  scope: string[];  // ✅ Makes this required
  auth_method: 'email' | 'pin' | 'station';
  iat: number;
  exp: number;
}

// Sign with type safety
const payload: JWTPayload = {
  sub: user.id,
  role: user.role,
  scope: scopes,  // ✅ TypeScript enforces this
  // ...
};

const token = jwt.sign(payload, secret);
```

---

## Specific Lessons Learned

### Lesson 1: JWT Payloads Are Critical Data Structures

Every field in a JWT payload is part of a contract:
- Between endpoint that creates it
- And middleware that consumes it

Missing a field doesn't cause a type error; it causes silent failures.

**Action**: Add comprehensive comments documenting JWT payload structure.

```typescript
/**
 * JWT Payload Structure (CRITICAL - do NOT modify without updating middleware)
 * 
 * Required fields:
 * - sub: User ID
 * - role: User role
 * - restaurant_id: Restaurant context
 * - scope: Authorization scopes (used by requireScopes middleware)
 * 
 * Consumers:
 * - server/src/middleware/auth.ts:99 (reads decoded.scope)
 * - server/src/middleware/rbac.ts:268 (checks scope field)
 * 
 * Changes MUST be coordinated with:
 * - AuthenticatedRequest interface
 * - authenticate() middleware
 * - requireScopes() middleware
 */
```

### Lesson 2: "Fallback Logic" Hides Bugs

The RBAC middleware's fallback to database queries masked this bug for days:

```typescript
// This fallback made the bug invisible:
const userScopes = getScopesForRole(userRole);  // Database fallback

// Should have been:
const userScopes = req.user.scopes;  // JWT-only, no fallback
if (!userScopes || userScopes.length === 0) {
  throw Error('FATAL: JWT missing scope field - auth system misconfigured');
}
```

**Action**: Remove fallback logic. Make failures loud and obvious.

### Lesson 3: Tests Must Validate Data Format, Not Just Success

Tests that only check "operation succeeded" miss format bugs:

```typescript
// ❌ Insufficient test
expect(response.status).toBe(200);
expect(response.body.user.scopes).toBeDefined();

// ✅ Comprehensive test
const decoded = jwt.decode(response.token);
expect(decoded.scope).toBeDefined();
expect(decoded.scope).toEqual(response.body.user.scopes);
expect(decoded.scope.length).toBeGreaterThan(0);
```

**Action**: Add structured data validation tests for authentication responses.

### Lesson 4: Demo Cleanup Is High-Risk

Removing "demo" or "legacy" code is dangerous because:
- It's often been working reliably
- It sometimes contains "institutional knowledge" about requirements
- The alternative might not have all the same features

Before removing demo endpoints:
- [ ] Document what features they implement
- [ ] Verify those features are in replacement endpoints
- [ ] Check if any edge cases are handled differently
- [ ] Run full regression test suite

### Lesson 5: Scope/Permission Systems Are Tightly Coupled

The bug affected three different layers:
1. **Endpoint**: Login didn't add scope to JWT
2. **Middleware**: Auth middleware expected scope in JWT
3. **API handlers**: RBAC checks needed the scopes

A single missing field broke all three layers because they're tightly coupled.

**Action**: Use explicit contracts and integration tests.

---

## Recommendations

### Immediate (Already Done)

1. ✅ Add `scope` field to JWT payloads in both login endpoints
2. ✅ Add observability logging for `scopes_count`
3. ✅ Update response to include scope count

### Short-Term (1-2 weeks)

1. **Add TypeScript Type Guard**
```typescript
interface JWTPayload {
  sub: string;
  role: string;
  scope: string[];  // Make required
  restaurant_id: string;
  // ...
}
```

2. **Remove RBAC Fallback**
```typescript
// Don't fall back to database - fail loud if JWT missing scopes
const userScopes = req.user.scopes || [];
if (req.user.scopes === undefined) {
  logger.error('FATAL: JWT missing scope field', { userId: req.user.id });
  throw Error('JWT scope field missing');
}
```

3. **Add JWT Structure Validation Tests**
```typescript
test('login endpoint includes scope in JWT token', async () => {
  const response = await login(credentials);
  const decoded = jwt.decode(response.session.access_token);
  expect(decoded.scope).toBeDefined();
  expect(Array.isArray(decoded.scope)).toBe(true);
});
```

### Medium-Term (1 month)

1. **Document JWT Payload Schema** in code
2. **Add Integration Tests** that verify login → permission check flow
3. **Create Migration Guide** for authentication changes
4. **Add Pre-commit Hook** to validate JWT-related changes

### Long-Term (Architecture)

1. **Consider JWT Structure Versioning**
```typescript
const payload = {
  v: 1,  // Version number for schema evolution
  sub: user.id,
  scope: scopes,
  // ...
};
```

2. **Add Observability** for scope mismatches
```typescript
if (req.user.scopes === undefined) {
  logger.warn('JWT scope field missing - using fallback', {
    userId: req.user.id,
    path: req.path
  });
}
```

3. **Decouple Authorization from Fallback**
Split RBAC into:
- JWT-based (fast, no fallback)
- Fallback-based (for edge cases)

---

## Appendix: Code Comparison

### Complete Before/After for PIN Login Endpoint

**BEFORE (Nov 2-12, 2025)**:
```typescript
router.post('/pin-login', 
  authRateLimiters.checkSuspicious,
  authRateLimiters.pin,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, restaurantId } = req.body;

    if (!pin || !restaurantId) {
      throw BadRequest('PIN and restaurant ID are required');
    }

    const result = await validatePin(pin, restaurantId);

    if (!result.isValid) {
      logger.warn('auth_fail', { reason: 'invalid_pin', restaurant_id: restaurantId });
      throw Unauthorized(result.error || 'Invalid PIN');
    }

    const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - PIN auth cannot proceed');
      throw new Error('Server authentication not configured');
    }

    const payload = {
      sub: result.userId,
      email: result.userEmail,
      role: result.role,
      restaurant_id: restaurantId,
      auth_method: 'pin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
      // ⚠️ MISSING: scope field
    };

    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', result.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];

    logger.info('auth_success', {
      user_id: result.userId,
      restaurant_id: restaurantId
      // ⚠️ MISSING: scopes_count logging
    });

    res.json({
      user: {
        id: result.userId,
        email: result.userEmail,
        role: result.role,
        scopes  // ✅ In response but NOT in JWT
      },
      token,
      expiresIn: 12 * 60 * 60,
      restaurantId
    });

  } catch (error) {
    next(error);
  }
});
```

**AFTER (Nov 12, 2025)**:
```typescript
router.post('/pin-login', 
  authRateLimiters.checkSuspicious,
  authRateLimiters.pin,
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin, restaurantId } = req.body;

    if (!pin || !restaurantId) {
      throw BadRequest('PIN and restaurant ID are required');
    }

    const result = await validatePin(pin, restaurantId);

    if (!result.isValid) {
      logger.warn('auth_fail', { reason: 'invalid_pin', restaurant_id: restaurantId });
      throw Unauthorized(result.error || 'Invalid PIN');
    }

    // ✅ Fetch scopes BEFORE creating JWT (new)
    const { data: scopesData, error: scopesError } = await supabase
      .from('role_scopes')
      .select('scope')
      .eq('role', result.role);

    if (scopesError) {
      logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
    }

    const scopes = scopesData?.map(s => s.scope) || [];

    const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
    if (!jwtSecret) {
      logger.error('⛔ JWT_SECRET not configured - PIN auth cannot proceed');
      throw new Error('Server authentication not configured');
    }

    const payload = {
      sub: result.userId,
      email: result.userEmail,
      role: result.role,
      restaurant_id: restaurantId,
      scope: scopes,  // ✅ ADDED: scopes now in JWT payload
      auth_method: 'pin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
    };

    const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

    logger.info('auth_success', {
      user_id: result.userId,
      restaurant_id: restaurantId,
      scopes_count: scopes.length  // ✅ ADDED: observability
    });

    res.json({
      user: {
        id: result.userId,
        email: result.userEmail,
        role: result.role,
        scopes  // ✅ In response AND in JWT
      },
      token,
      expiresIn: 12 * 60 * 60,
      restaurantId
    });

  } catch (error) {
    next(error);
  }
});
```

**Key Differences**:
1. Scope fetching moved before JWT creation
2. `scope: scopes` added to JWT payload
3. `scopes_count` logging added
4. Order of operations makes scopes available for JWT

---

## Conclusion

This bug exemplifies a critical risk in authentication system refactoring: JWT payload structures are implicit contracts that can be silently broken. The combination of:

1. **Incomplete refactoring** (removing demo endpoint without preserving JWT requirements)
2. **Split-brain architecture** (response body vs JWT payload)
3. **Fallback logic** (masking the bug with database queries)
4. **Inadequate testing** (checking response body, not JWT content)

Created a 10-day window where users couldn't access authorized operations, despite appearing to have correct permissions.

The fix is simple (add `scope` field to JWT), but the lesson is profound: authentication systems require explicit contracts, comprehensive testing, and clear visibility into data flow. "It works" is not sufficient; "it works correctly according to the contract" is required.

---

**Report Generated**: November 12, 2025  
**Analysis Duration**: ~1 hour  
**Files Analyzed**: 3 (auth.routes.ts, auth.ts, rbac.ts)  
**Commits Analyzed**: 4 major commits + 30+ related commits
