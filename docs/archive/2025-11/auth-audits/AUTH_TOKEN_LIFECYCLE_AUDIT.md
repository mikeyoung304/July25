# Token Lifecycle & Session Management Audit

**Audit Date**: 2025-11-10
**Scope**: JWT token handling, expiry, refresh patterns, and session state management
**Primary File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts`

## Executive Summary

The authentication system demonstrates **good overall stability** with proper error handling for token expiry and invalid signatures. However, several **P1-P2 stability issues** exist around:

1. **JWT secret retrieval inconsistency** between `authenticate()` and `optionalAuth()`
2. **Inconsistent test token removal** creates confusion in test expectations
3. **STRICT_AUTH bypass vulnerability** in `optionalAuth()` flow
4. **Request state mutation timing** could cause race conditions in concurrent requests
5. **Missing token refresh flow** on the server-side (client-only)

## Findings

### 1. Token Verification Flow Issues

#### Issue 1.1: JWT Secret Configuration Inconsistency (P1)
- **Location**: `auth.ts:45-49` vs `auth.ts:148-149`
- **Severity**: P1 (Production Readiness)
- **Description**:
  - In `authenticate()` (lines 45-49), missing JWT secret throws an error and halts authentication
  - In `optionalAuth()` (line 149), the function delegates to `authenticate()` but catches all errors and continues
  - This creates a scenario where a **missing JWT secret passes silently** in `optionalAuth()` flows

```typescript
// authenticate() - STRICT enforcement
const jwtSecret = config.supabase.jwtSecret;
if (!jwtSecret) {
  logger.error('⛔ JWT_SECRET not configured - authentication cannot proceed');
  throw new Error('Server authentication not configured');
}

// optionalAuth() - calls authenticate() but catches errors
try {
  return authenticate(req, _res, next);
} catch (error) {
  // Log but don't fail - extract restaurant ID from header as fallback
  logger.warn('Optional auth failed:', error);
  // ... continues execution
}
```

- **Impact**: In `optionalAuth()` routes (menu browsing, public endpoints), a misconfigured JWT secret won't be detected until someone tries to authenticate
- **Fix**: Add explicit JWT secret check in `optionalAuth()` before attempting token verification

#### Issue 1.2: Token Expiry Handling is Correct ✅
- **Location**: `auth.ts:55-60`
- **Status**: Working correctly
- **Verification**:
```typescript
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
```
- Token expiry is properly caught and rejected with clear error messages
- Tests confirm expired tokens are rejected (see `auth.test.ts:85-98`)

#### Issue 1.3: Outdated Test Expectations (P2)
- **Location**: `auth.test.ts:109-123, 127-154`
- **Severity**: P2 (Test Quality)
- **Description**: Tests reference **removed test token bypass** feature:
  - Lines 127-154 test "development mode" with `test-token` bypass
  - Lines 109-123 test kiosk JWT secret fallback behavior
  - **Current implementation removed test tokens** per security hardening (see `auth.ts:41-42`)

```typescript
// Current code (auth.ts:41-42):
// Test tokens are no longer supported for security reasons
// Use proper JWT tokens in all environments

// But tests still expect:
it('should accept test token in development mode', async () => {
  process.env['NODE_ENV'] = 'development';
  req.headers = {
    authorization: 'Bearer test-token',
    'x-restaurant-id': 'test-restaurant'
  };
  await authenticate(req as AuthenticatedRequest, res as Response, next);
  expect(req.user).toEqual({...}); // This will fail!
});
```

- **Impact**: Tests likely fail or pass incorrectly, masking real auth behavior
- **Fix**: Update tests to use proper JWT tokens or remove test token expectations

### 2. Session State Race Conditions

#### Issue 2.1: Request State Mutation Timing (P1)
- **Location**: `auth.ts:94-109`
- **Severity**: P1 (Concurrent Request Safety)
- **Description**: Request object mutation happens in multiple steps without atomicity guarantees:

```typescript
// Step 1: Set user info
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: userRole,
  scopes: decoded.scope || [],
  restaurant_id: decoded.restaurant_id,
};

// Step 2: Set req.restaurantId (depends on STRICT_AUTH check)
req.restaurantId = strictAuth
  ? decoded.restaurant_id
  : (decoded.restaurant_id || (req.headers['x-restaurant-id'] as string));

// Step 3: Call next()
next();
```

- **Race Condition Scenario**:
  1. Request A starts `authenticate()`, sets `req.user`
  2. Request B (concurrent, same Express request object if middleware chain reused) starts `authenticate()`, overwrites `req.user`
  3. Request A continues to `next()`, sees Request B's `req.user` data

- **Likelihood**: LOW - Express creates separate request objects per HTTP request
- **BUT**: If custom middleware chains or middleware reuse occurs, this could cause issues
- **Impact**: User sees wrong user data, potential authorization bypass
- **Fix**: Ensure all request state mutations complete before calling `next()`, or use atomic object assignment

#### Issue 2.2: RBAC Middleware Mutates req.user (P2)
- **Location**: `rbac.ts:321-323`
- **Severity**: P2 (State Consistency)
- **Description**: RBAC middleware mutates `req.user.role` and `req.user.scopes` after initial authentication:

```typescript
// Store user's role and scopes in request for downstream use
req.user.role = userRole;
req.user.scopes = userScopes;
```

- **Impact**:
  - Initial JWT role (`req.user.role` from token) gets overwritten with database role
  - If RBAC middleware fails or doesn't run, downstream code sees stale JWT role
  - Creates inconsistency between "JWT claims" and "effective permissions"

- **Fix**: Use separate properties like `req.effectiveRole` and `req.effectiveScopes` to avoid mutating original JWT claims

### 3. Token Expiry Edge Cases

#### Issue 3.1: No Server-Side Token Refresh Mechanism (P2)
- **Location**: `auth.routes.ts:343-378`
- **Severity**: P2 (User Experience)
- **Description**: Token refresh exists as an **endpoint** but no automatic server-side refresh logic:

```typescript
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw BadRequest('Refresh token is required');
  }

  // Refresh session with Supabase
  const { data: authData, error: authError } = await supabase.auth.refreshSession({
    refresh_token: refreshToken
  });
  // ...
});
```

- **Current Behavior**:
  - Client must detect token expiry and call `/refresh` endpoint
  - Server rejects expired tokens with 401 Unauthorized
  - No automatic refresh in middleware chain

- **Edge Case**: Token expires mid-request (between auth middleware and business logic)
  - Token is valid at authentication time
  - Token expires during long-running operation
  - Subsequent operations (logs, DB writes) may reference expired session

- **Impact**:
  - Users get 401 errors and must manually re-authenticate
  - No graceful token rotation for long-lived sessions

- **Fix Options**:
  1. Add "expiry soon" check in middleware (e.g., refresh if <5min remaining)
  2. Implement sliding window sessions (extend expiry on each request)
  3. Add retry logic in client for 401 errors with automatic refresh

#### Issue 3.2: WebSocket Token Expiry Not Checked (P1)
- **Location**: `auth.ts:192-197`
- **Severity**: P1 (WebSocket Security)
- **Description**: WebSocket auth (`verifyWebSocketAuth`) catches `TokenExpiredError` but returns `null` without logging the expiry reason:

```typescript
try {
  decoded = jwt.verify(token, jwtSecret) as any;
} catch (error) {
  logger.warn('WebSocket auth rejected: invalid token');
  return null;
}
```

- **Issue**: Generic "invalid token" message doesn't distinguish between:
  - Expired token (user needs to refresh)
  - Invalid signature (potential attack)
  - Malformed token (client bug)

- **Impact**:
  - Users can't tell if they need to refresh or if there's a security issue
  - Monitoring can't distinguish attack attempts from legitimate expiry

- **Fix**: Log specific error types:

```typescript
} catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    logger.warn('WebSocket auth rejected: token expired');
  } else if (error instanceof jwt.JsonWebTokenError) {
    logger.warn('WebSocket auth rejected: invalid token signature');
  } else {
    logger.error('WebSocket auth error:', error);
  }
  return null;
}
```

### 4. STRICT_AUTH Mode Issues

#### Issue 4.1: STRICT_AUTH Enforcement Correct ✅
- **Location**: `auth.ts:84-92`
- **Status**: Working correctly
- **Verification**:
```typescript
if (strictAuth && !decoded.restaurant_id) {
  logger.error('⛔ STRICT_AUTH enabled - token missing restaurant_id rejected', {
    userId: decoded.sub,
    path: req.path,
    role: userRole
  });
  throw Unauthorized('Token missing restaurant context in strict auth mode');
}
```
- Properly rejects tokens without `restaurant_id` in STRICT_AUTH mode
- Logs detailed context for debugging
- Clear error message

#### Issue 4.2: STRICT_AUTH Bypass in optionalAuth() (P1)
- **Location**: `auth.ts:118-158`
- **Severity**: P1 (Security)
- **Description**: `optionalAuth()` calls `authenticate()` which checks STRICT_AUTH, **but** catches errors and falls back to header-based restaurant ID:

```typescript
// optionalAuth() - Lines 148-158
try {
  // If token exists, validate it
  return authenticate(req, _res, next);
} catch (error) {
  // Log but don't fail - extract restaurant ID from header as fallback
  logger.warn('Optional auth failed:', error);
  const restaurantId = req.headers['x-restaurant-id'] as string;
  if (restaurantId) {
    req.restaurantId = restaurantId;
  }
  next();
}
```

- **Bypass Scenario**:
  1. STRICT_AUTH is enabled (`STRICT_AUTH=true`)
  2. User provides token without `restaurant_id`
  3. `authenticate()` rejects token with "Token missing restaurant context"
  4. `optionalAuth()` catches error and uses `X-Restaurant-ID` header instead
  5. User bypasses STRICT_AUTH enforcement

- **Impact**: STRICT_AUTH mode is **not enforced** on `optionalAuth()` routes (menu, public endpoints)
- **Severity**: P1 if public endpoints have sensitive data; P2 if truly public
- **Fix**: In STRICT_AUTH mode, `optionalAuth()` should enforce the same rules:

```typescript
export async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  const strictAuth = process.env['STRICT_AUTH'] === 'true';

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - in STRICT_AUTH, reject; otherwise allow header fallback
    if (strictAuth) {
      return next(Unauthorized('STRICT_AUTH: token required'));
    }
    // Fallback to header...
    return next();
  }

  // Token exists - validate it (will enforce STRICT_AUTH)
  return authenticate(req, _res, next);
}
```

#### Issue 4.3: STRICT_AUTH Not Documented in Tests (P2)
- **Location**: `auth.test.ts` (entire file)
- **Severity**: P2 (Test Coverage)
- **Description**: No tests verify STRICT_AUTH mode behavior
- **Missing Test Cases**:
  1. Token with `restaurant_id` should pass in STRICT_AUTH mode
  2. Token without `restaurant_id` should fail in STRICT_AUTH mode
  3. `optionalAuth()` should enforce STRICT_AUTH when enabled
  4. Header-based restaurant ID should be rejected in STRICT_AUTH mode

- **Fix**: Add test suite:

```typescript
describe('STRICT_AUTH Mode', () => {
  beforeEach(() => {
    process.env['STRICT_AUTH'] = 'true';
  });

  it('should accept token with restaurant_id', async () => {
    const payload = { sub: 'user-123', restaurant_id: 'rest-123' };
    const token = jwt.sign(payload, 'test-jwt-secret');
    req.headers = { authorization: `Bearer ${token}` };
    await authenticate(req, res, next);
    expect(req.restaurantId).toBe('rest-123');
  });

  it('should reject token without restaurant_id', async () => {
    const payload = { sub: 'user-123' };
    const token = jwt.sign(payload, 'test-jwt-secret');
    req.headers = { authorization: `Bearer ${token}` };
    await expect(authenticate(req, res, next)).rejects.toThrow('missing restaurant context');
  });
});
```

### 5. Concurrent Request Issues

#### Issue 5.1: jwt.verify() is Thread-Safe ✅
- **Location**: `auth.ts:53`, `stationAuth.ts:151`
- **Status**: No issues found
- **Verification**:
  - `jsonwebtoken` library uses synchronous cryptographic operations
  - No shared state between `jwt.verify()` calls
  - Each request gets independent decoded token object

- **Confirmation**: Multiple concurrent requests with same token will **not** interfere with each other

#### Issue 5.2: getConfig() Called Per-Request (Potential Performance Impact) (P2)
- **Location**: `auth.ts:29`, `auth.ts:166`
- **Severity**: P2 (Performance)
- **Description**: `getConfig()` is called on **every authentication request**:

```typescript
export async function authenticate(req, _res, next) {
  try {
    const config = getConfig(); // Called per-request
    const authHeader = req.headers.authorization;
    // ...
```

- **Performance Analysis**:
  - `getConfig()` reads from `process.env` and constructs config object
  - Not cached (intentional for test compatibility - see `environment.ts:99`)
  - Called for **every authenticated request**

- **Impact**:
  - Minor CPU overhead for high-throughput systems (1000+ req/s)
  - Trade-off: Test flexibility vs production performance

- **Fix Options**:
  1. Cache config in production, only refresh in tests
  2. Read `JWT_SECRET` directly from `process.env` (bypass `getConfig()`)
  3. Accept performance trade-off for test compatibility

#### Issue 5.3: No Request Timeout for jwt.verify() (P2)
- **Location**: `auth.ts:52-61`
- **Severity**: P2 (Availability)
- **Description**: `jwt.verify()` has no timeout mechanism:

```typescript
let decoded: any;
try {
  decoded = jwt.verify(token, jwtSecret) as any;
} catch (error) {
  // Handle errors
}
```

- **Scenario**:
  - Malformed token with complex payload could cause excessive CPU usage
  - No timeout protection for cryptographic operations
  - Compare to `restaurantAccess.ts:61-68` which **does** implement timeout for DB queries

- **Impact**:
  - Potential DoS vector if attacker sends computationally expensive tokens
  - No circuit breaker for hung verification operations

- **Fix**: Add timeout wrapper (similar to DB query pattern):

```typescript
const verifyPromise = Promise.resolve(jwt.verify(token, jwtSecret));
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Token verification timeout')), 5000)
);
const decoded = await Promise.race([verifyPromise, timeoutPromise]);
```

### 6. Token Issuance Issues

#### Issue 6.1: PIN Login Token Expiry Longer Than Email Login (P2)
- **Location**: `auth.routes.ts:154` vs Supabase defaults
- **Severity**: P2 (Security Policy)
- **Description**: Inconsistent token lifetimes:
  - **PIN login**: 12 hours (hardcoded - `auth.routes.ts:154`)
  - **Email/password login**: Supabase default (1 hour + refresh token)

```typescript
// PIN login
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60) // 12 hours
};
```

- **Rationale**: Staff using PIN auth work longer shifts (servers, kitchen)
- **Issue**: No documented security policy explaining the difference
- **Impact**: Inconsistent security posture across auth methods
- **Fix**: Document in `AUTHENTICATION_ARCHITECTURE.md`:
  - Email/password login: 1-hour access + refresh token (short-lived, high security)
  - PIN login: 12-hour access (shift-length, convenience for staff)
  - Station tokens: 4 hours (see `stationAuth.ts:11`)

#### Issue 6.2: No Token Revocation Check in Middleware (P1)
- **Location**: `auth.ts:22-115` (entire `authenticate()` function)
- **Severity**: P1 (Security)
- **Description**: JWT tokens are **stateless** - no revocation check:
  - User logs out → token still valid until expiry
  - User role changed → old tokens still have old role
  - User access revoked → tokens still work

- **Current Behavior**:
  - Station tokens have revocation support (see `stationAuth.ts:246-273`)
  - JWT tokens for email/PIN login have **no revocation mechanism**

- **Impact**:
  - Compromised tokens valid until expiry (up to 12 hours)
  - No way to immediately revoke access
  - Logout is client-side only (token destruction)

- **Fix Options**:
  1. Implement token revocation list (Redis/DB lookup per request)
  2. Use short-lived tokens + refresh tokens (already done for Supabase auth)
  3. Add token version field + database lookup (only on critical operations)
  4. Accept risk for performance trade-off (document in security policy)

## Recommendations (Prioritized)

### P0 (Critical - Must Fix Before Production)
None identified. Core token verification is secure.

### P1 (High Priority - Fix in Stabilization Sprint)

1. **Fix STRICT_AUTH Bypass in optionalAuth()** (Issue 4.2)
   - Add STRICT_AUTH enforcement to `optionalAuth()` flow
   - Prevent header-based restaurant ID fallback in STRICT_AUTH mode
   - Estimate: 2 hours

2. **Add Token Revocation for Critical Operations** (Issue 6.2)
   - Implement token version check for payment processing
   - Add revocation list for admin/owner role changes
   - Estimate: 1 day

3. **Fix JWT Secret Configuration Inconsistency** (Issue 1.1)
   - Add explicit JWT secret validation in `optionalAuth()`
   - Fail fast if JWT secret missing (don't silently continue)
   - Estimate: 1 hour

4. **Fix WebSocket Token Expiry Logging** (Issue 3.2)
   - Log specific error types (expired vs invalid vs malformed)
   - Help debugging and security monitoring
   - Estimate: 30 minutes

5. **Fix Request State Mutation Timing** (Issue 2.1)
   - Use atomic object assignment for `req.user` and `req.restaurantId`
   - Add unit test for concurrent request simulation
   - Estimate: 2 hours

### P2 (Medium Priority - Fix After P1)

1. **Update Test Expectations** (Issue 1.3)
   - Remove test token bypass expectations
   - Update tests to use proper JWT tokens
   - Estimate: 2 hours

2. **Add STRICT_AUTH Test Coverage** (Issue 4.3)
   - Add comprehensive STRICT_AUTH test suite
   - Cover all bypass scenarios
   - Estimate: 2 hours

3. **Document Token Lifetime Policy** (Issue 6.1)
   - Add security rationale for different token lifetimes
   - Document in `AUTHENTICATION_ARCHITECTURE.md`
   - Estimate: 1 hour

4. **Add jwt.verify() Timeout** (Issue 5.3)
   - Implement timeout wrapper for token verification
   - Prevent DoS via expensive tokens
   - Estimate: 2 hours

5. **Fix RBAC State Mutation** (Issue 2.2)
   - Use separate properties for effective role/scopes
   - Preserve original JWT claims in `req.user`
   - Estimate: 4 hours (requires route updates)

6. **Optimize getConfig() Performance** (Issue 5.2)
   - Cache config in production, refresh in tests
   - Measure performance impact first
   - Estimate: 4 hours

### P3 (Low Priority - Nice to Have)

1. **Add Server-Side Token Refresh** (Issue 3.1)
   - Implement automatic refresh for expiring tokens
   - Add sliding window sessions
   - Estimate: 1 day

## Test Coverage Gaps

### Critical Gaps (Add in P1)
1. **STRICT_AUTH mode enforcement**
   - Token with `restaurant_id` accepted
   - Token without `restaurant_id` rejected
   - `optionalAuth()` enforces STRICT_AUTH
   - Header fallback rejected in STRICT_AUTH

2. **Concurrent request safety**
   - Multiple requests with same token don't interfere
   - Request state mutations are atomic
   - No shared state between requests

3. **Token revocation scenarios**
   - Revoked token rejected
   - Token still valid after logout (current behavior)
   - Role change doesn't affect existing tokens (current behavior)

### Nice-to-Have Gaps (Add in P2/P3)
1. **Token expiry edge cases**
   - Token expires mid-request
   - Token refresh during request processing
   - Expired token cleanup

2. **Performance under load**
   - 1000+ concurrent auth requests
   - Slow JWT verification operations
   - Config object creation overhead

3. **WebSocket auth edge cases**
   - Token expiry during long-lived WebSocket connection
   - Multiple WebSocket connections with same token
   - WebSocket auth failure recovery

## Conclusion

The authentication system is **production-ready** with good core security practices:
- ✅ Proper token expiry handling
- ✅ Invalid signature rejection
- ✅ Thread-safe token verification
- ✅ Clear error messages

However, **5 P1 issues** should be addressed in the current stabilization sprint:
1. STRICT_AUTH bypass in `optionalAuth()`
2. JWT secret configuration inconsistency
3. Token revocation for critical operations
4. WebSocket token expiry logging
5. Request state mutation timing

Estimated total effort: **2-3 days** for all P1 fixes.

The system demonstrates **defensive programming** with timeout protection in database queries (see `restaurantAccess.ts`), but this pattern should be extended to JWT verification for consistency.

No **memory leaks** or **dangling references** were identified in the token lifecycle code. Request objects are properly scoped and garbage-collected by Express.
