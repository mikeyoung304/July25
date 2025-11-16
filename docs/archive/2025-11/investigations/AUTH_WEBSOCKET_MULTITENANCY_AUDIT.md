# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: Investigations

---

# WebSocket Auth & Multi-tenancy Audit

**Audit Date**: 2025-11-10
**Scope**: WebSocket authentication (verifyWebSocketAuth) and multi-tenancy restaurant context enforcement
**P0.9 Auth Stabilization - WebSocket Security & Multi-tenant Isolation**

---

## Executive Summary

This audit examined the WebSocket authentication flow and multi-tenancy restaurant context handling across the server. The system has **good foundational security** but contains **several critical vulnerabilities** related to WebSocket token handling, restaurant context validation inconsistencies, and race conditions.

**Overall Security Score**: 6.5/10
- **Restaurant Isolation**: 7/10 (Good but has bypasses)
- **WebSocket Security**: 6/10 (Multiple critical issues)

---

## Critical Issues (P0)

### 1. **SECURITY VULNERABILITY: WebSocket Token in URL Query String**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts:167-168`

```typescript
const url = new URL(request.url || '', `http://${request.headers.host}`);
const token = url.searchParams.get('token');
```

**Impact**:
- **HIGH SEVERITY** - JWT tokens passed in URL query parameters (`?token=xxx`) are:
  - Logged in web server access logs (Apache, Nginx, CloudFlare, etc.)
  - Stored in browser history
  - Sent in HTTP Referer headers when following external links
  - Visible in browser developer tools network tab
  - Exposed to browser extensions and monitoring tools

**Evidence**:
- Standard WebSocket client setup: `new WebSocket('ws://host?token=JWT')`
- Vite HMR client also uses this pattern (found in diagnostic logs)
- No alternative secure token passing mechanism implemented

**Recommendation**:
```markdown
CRITICAL: Implement secure WebSocket authentication
1. Use WebSocket subprotocol for token passing: `new WebSocket(url, ['vite-hmr', token])`
2. Or use custom headers during upgrade handshake: `Sec-WebSocket-Protocol: token-{JWT}`
3. Add explicit warning in logs when token-in-URL is detected
4. Rotate affected tokens immediately after implementing fix
```

---

### 2. **MULTI-TENANCY BYPASS: Anonymous WebSocket Connections in Non-Production**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts:170-182`

```typescript
if (!token) {
  // In production, always reject connections without token
  if (config.nodeEnv === 'production') {
    logger.warn('WebSocket auth rejected: no token in production');
    return null;
  }
  // In development/test, allow anonymous connections with warning
  logger.warn('⚠️ WebSocket: Anonymous connection (no token) - non-production only');
  return {
    userId: 'anonymous',
    restaurantId: config.restaurant.defaultId,  // ⚠️ SINGLE DEFAULT RESTAURANT
  };
}
```

**Impact**:
- **MEDIUM-HIGH SEVERITY** - Development/test environments allow unauthenticated WebSocket connections
- Anonymous connections get `userId: 'anonymous'` and default restaurant ID
- No validation that the connected client should have access to default restaurant
- Multiple anonymous users share the same `userId: 'anonymous'` - potential data leakage via WebSocket broadcasts

**Attack Scenario**:
```javascript
// Attacker in dev/staging environment
const ws = new WebSocket('ws://staging.example.com'); // No token!
// Now receives order updates for default restaurant without authentication
```

**Related Code**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/utils/websocket.ts:116-140`
```typescript
export function broadcastToRestaurant(
  wss: WebSocketServer,
  restaurantId: string,
  message: any
): void {
  wss.clients.forEach((client: ExtendedWebSocket) => {
    if (client.readyState === WebSocket.OPEN &&
        client.restaurantId === restaurantId) {  // Anonymous users match this!
      client.send(messageStr);
    }
  });
}
```

**Recommendation**:
```markdown
CRITICAL: Remove anonymous WebSocket support entirely
1. Reject all WebSocket connections without valid JWT token (all environments)
2. Add environment variable ALLOW_ANONYMOUS_WS=true for local testing ONLY
3. Never deploy with ALLOW_ANONYMOUS_WS enabled
4. Add startup validation that rejects ALLOW_ANONYMOUS_WS in production
```

---

### 3. **RACE CONDITION: Restaurant ID Changes Mid-Session**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts:114-120`

```typescript
private async startSession(ws: WebSocket, event: any) {
  const sessionId = uuidv4();
  const { restaurant_id, loopback = false } = event.session_config;  // ⚠️ CLIENT-CONTROLLED!

  const session: VoiceSession = {
    id: sessionId,
    restaurantId: restaurant_id,  // ⚠️ NO VALIDATION AGAINST JWT
    ws,
    // ...
  };
}
```

**Impact**:
- **HIGH SEVERITY** - Voice WebSocket sessions accept `restaurant_id` from client-controlled `session_config`
- No validation that `restaurant_id` matches the authenticated user's JWT `restaurant_id`
- User authenticated for Restaurant A can start voice session for Restaurant B

**Attack Scenario**:
```javascript
// User has JWT for restaurant-A
const ws = new WebSocket('ws://host?token=JWT_FOR_RESTAURANT_A');

// Send session.start with DIFFERENT restaurant
ws.send(JSON.stringify({
  type: 'session.start',
  session_config: {
    restaurant_id: 'restaurant-B'  // ⚠️ BYPASSES MULTI-TENANCY!
  }
}));
// Now has voice session accessing Restaurant B's menu/data
```

**Recommendation**:
```markdown
CRITICAL: Validate restaurant_id against JWT on session start
1. Extract restaurant_id from authenticated WebSocket context (from verifyWebSocketAuth)
2. Reject session.start if client-provided restaurant_id doesn't match JWT
3. Use JWT restaurant_id directly, ignore client-provided value
4. Add test: "should reject voice session for wrong restaurant"
```

---

### 4. **INCONSISTENT RESTAURANT VALIDATION: HTTP vs WebSocket**

**HTTP Routes** (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/restaurantAccess.ts:16-94`):
```typescript
export async function validateRestaurantAccess(req, _res, next): Promise<void> {
  // ✅ Checks user authentication
  // ✅ Gets restaurant ID from X-Restaurant-ID header OR JWT
  // ✅ Admin bypass allowed
  // ✅ Demo user bypass (if JWT matches)
  // ✅ Database lookup for non-admin users (user_restaurants table)
  // ✅ Sets req.restaurantRole with per-restaurant role
}
```

**WebSocket Routes** (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts:162-207`):
```typescript
export async function verifyWebSocketAuth(request): Promise<...> {
  // ✅ Validates JWT signature
  // ✅ Returns userId and restaurantId from JWT
  // ❌ NO admin bypass check
  // ❌ NO demo user validation
  // ❌ NO database lookup (user_restaurants table)
  // ❌ NO role information returned
  // ❌ NO restaurant access validation
}
```

**Impact**:
- **MEDIUM SEVERITY** - WebSocket auth is significantly weaker than HTTP auth
- WebSocket relies solely on JWT `restaurant_id` with no database validation
- User removed from restaurant in database can still connect via WebSocket
- No per-restaurant role enforcement for WebSocket connections

**Recommendation**:
```markdown
P1: Align WebSocket auth with HTTP auth standards
1. Create validateWebSocketRestaurantAccess() function
2. Check user_restaurants table for WebSocket connections (with caching)
3. Return restaurantRole alongside userId/restaurantId
4. Add timeout to WebSocket DB queries (same 5s as HTTP)
5. Handle demo users and admin users consistently
```

---

## Important Issues (P1)

### 5. **No Token Refresh Mechanism for Long-Lived WebSocket Sessions**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts:28`

```typescript
private sessionTimeout = 300000; // 5 minutes
```

**Issue**:
- Voice sessions timeout after 5 minutes of inactivity
- JWT tokens have their own expiration (typically 1 hour)
- No mechanism to refresh token during active WebSocket session
- Token expiry during active session causes immediate disconnection

**Impact**:
- User in middle of voice ordering conversation gets disconnected when JWT expires
- No graceful degradation or token refresh flow
- Generic heartbeat exists but doesn't validate token freshness

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts:351-362`
```typescript
private sendHeartbeat(ws: WebSocket, sessionId?: string) {
  if (ws.readyState === WebSocket.OPEN) {
    const heartbeat = {
      type: 'heartbeat',
      event_id: uuidv4(),
      timestamp: Date.now(),
      session_id: sessionId || 'pending',
    };
    ws.send(JSON.stringify(heartbeat));
    ws.ping();  // ⚠️ Only checks connection, not token validity
  }
}
```

**Recommendation**:
```markdown
P1: Implement token validation in heartbeat
1. Add JWT expiration check to heartbeat handler
2. Send 'token_expiring_soon' event 5 minutes before expiry
3. Client can request new token via HTTP and reconnect
4. Or implement token refresh via WebSocket message
5. Document max session duration = JWT expiry time
```

---

### 6. **STRICT_AUTH Mode Inconsistency Between HTTP and WebSocket**

**HTTP Authentication** (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts:84-92`):
```typescript
// STRICT_AUTH enforcement: Reject tokens without restaurant_id
if (strictAuth && !decoded.restaurant_id) {
  logger.error('⛔ STRICT_AUTH enabled - token missing restaurant_id rejected', {
    userId: decoded.sub,
    path: req.path,
    role: userRole
  });
  throw Unauthorized('Token missing restaurant context in strict auth mode');
}
```

**WebSocket Authentication** (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts:199-202`):
```typescript
return {
  userId: decoded.sub,
  restaurantId: decoded.restaurant_id || config.restaurant.defaultId,  // ⚠️ FALLBACK!
};
```

**Issue**:
- HTTP rejects tokens without `restaurant_id` when `STRICT_AUTH=true`
- WebSocket **allows** tokens without `restaurant_id` and falls back to `config.restaurant.defaultId`
- Inconsistent security posture across transport layers

**Recommendation**:
```markdown
P1: Apply STRICT_AUTH to WebSocket connections
1. Check STRICT_AUTH in verifyWebSocketAuth()
2. Reject WebSocket connections without restaurant_id in JWT when STRICT_AUTH=true
3. Add test: "should reject WebSocket without restaurant_id in STRICT_AUTH mode"
```

---

### 7. **Restaurant ID Header vs JWT Conflict Handling**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/auth.ts:105-110`

```typescript
// In STRICT_AUTH mode, only use restaurant_id from token (no header fallback)
// In normal mode, fallback to X-Restaurant-ID header if not in JWT
req.restaurantId = strictAuth
  ? decoded.restaurant_id
  : (decoded.restaurant_id || (req.headers['x-restaurant-id'] as string));
```

**Issue**:
- Normal mode: Header can override JWT `restaurant_id`
- If JWT has `restaurant_id=A` and header has `x-restaurant-id=B`, which wins?
- Code shows JWT takes precedence due to `||` short-circuit, but not documented
- Potential confusion for clients

**Current Behavior** (by code inspection):
```javascript
// JWT: restaurant_id=A, Header: x-restaurant-id=B
req.restaurantId = 'A'  // JWT wins (short-circuit)

// JWT: restaurant_id=undefined, Header: x-restaurant-id=B
req.restaurantId = 'B'  // Header used as fallback
```

**But then validateRestaurantAccess** (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/restaurantAccess.ts:29-31`):
```typescript
const requestedRestaurantId =
  (req.headers['x-restaurant-id'] as string) ||  // ⚠️ HEADER FIRST!
  req.restaurantId;  // Then JWT
```

**Issue**:
- `authenticate()` middleware: JWT > Header
- `validateRestaurantAccess()` middleware: Header > JWT
- **CONFLICTING PRECEDENCE** depending on which middleware runs

**Recommendation**:
```markdown
P1: Standardize restaurant_id precedence
1. STRICT_AUTH mode: JWT only (no header allowed)
2. Normal mode: JWT > Header (current authenticate() behavior)
3. Fix validateRestaurantAccess to use req.restaurantId first (already set by authenticate)
4. Add warning log when header differs from JWT
5. Document precedence in API docs
```

---

### 8. **Multiple WebSocket Connections from Same User**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/utils/websocket.ts:36-67`

```typescript
wss.on('connection', async (ws: ExtendedWebSocket, request) => {
  // ...
  ws.userId = auth.userId;
  ws.restaurantId = auth.restaurantId;
  // ⚠️ NO CHECK for existing connections from same userId
});
```

**Issue**:
- No limit on concurrent WebSocket connections per user
- User can open multiple tabs/browsers with same JWT
- Each connection receives duplicate broadcasts (inefficient)
- No tracking of which connection is "primary"

**Current Behavior**:
```javascript
// User opens 3 tabs
// Each tab creates WebSocket connection
// Order update triggers 3 broadcasts to same user
wss.clients.forEach((client) => {
  if (client.userId === 'user-123') {  // Matches all 3 connections
    client.send(orderUpdate);  // Sent 3 times!
  }
});
```

**Recommendation**:
```markdown
P2: Add connection management (not critical for security)
1. Track active connections per userId
2. Log warning if >5 connections from same user
3. Add rate limiting on new connections per user
4. Consider connection_id in broadcast to allow client deduplication
5. OR: Deduplicate broadcasts to same userId (send once, client handles)
```

---

## Medium Priority (P2)

### 9. **WebSocket Token Expiry Not Checked During Connection Lifetime**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts:46-60`

```typescript
const auth = await verifyWebSocketAuth(request);
if (!auth) {
  logger.warn('[VoiceWebSocket] Authentication failed - rejecting connection');
  ws.close(1008, 'Authentication required');
  return;
}
// ⚠️ Token validated ONCE at connection time, never re-validated
```

**Issue**:
- JWT token validated only during WebSocket handshake
- Token can expire during active WebSocket session
- Connection remains active with expired token
- User removed from restaurant (JWT revoked) maintains WebSocket session

**Similar Issue in Order WebSocket** (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/utils/websocket.ts:51-66`):
```typescript
const auth = await verifyWebSocketAuth(request);
// ⚠️ One-time validation
ws.userId = auth.userId;
ws.restaurantId = auth.restaurantId;
// Connection lives until client disconnects or heartbeat fails
```

**Recommendation**:
```markdown
P2: Periodic token validation (non-critical, adds overhead)
1. Re-validate JWT every 5 minutes during heartbeat
2. If token expired, send 'auth_expired' message and close connection
3. Cache valid tokens for 1 minute to reduce overhead
4. OR: Accept that sessions can outlive token (document this behavior)
```

---

### 10. **Demo User Bypass with Weak Validation**

**Location**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/restaurantAccess.ts:43-50`

```typescript
// For demo users (identified by demo: prefix in user ID), bypass DB check
// Demo users don't exist in user_restaurants table but are scoped to a specific restaurant in their JWT
const isDemoUser = req.user.id.startsWith('demo:');
if (isDemoUser && req.user.restaurant_id === requestedRestaurantId) {
  req.restaurantId = requestedRestaurantId;
  req.restaurantRole = req.user.role || 'demo';  // Use their actual role
  return next();
}
```

**Issue**:
- Demo user identified by `user.id.startsWith('demo:')` - string prefix check
- JWT can be crafted with `sub: 'demo:hacker'` to bypass database validation
- Relies on JWT integrity (good) but demo check is weak pattern matching

**Attack Scenario** (requires JWT signing key compromise):
```javascript
// Attacker crafts JWT with:
{
  sub: 'demo:attacker',
  restaurant_id: 'target-restaurant-id',
  role: 'admin'
}
// Bypasses user_restaurants database check
// Gets admin role without being in database
```

**Note**: This requires compromising JWT signing key (already game over), but defense-in-depth suggests additional validation.

**Recommendation**:
```markdown
P2: Strengthen demo user validation
1. Add DEMO_USER_PREFIX environment variable (default: 'demo:')
2. Validate demo user format: 'demo:role:uuid' (enforce structure)
3. Maintain whitelist of allowed demo user IDs in config
4. Log all demo user access attempts
5. Reject demo users entirely in production (add validation)
```

---

### 11. **No CSRF Protection for WebSocket Upgrade**

**Location**: WebSocket upgrade happens outside standard CSRF middleware

**Issue**:
- HTTP requests have CSRF token validation (`/Users/mikeyoung/CODING/rebuild-6.0/server/src/server.ts:185`)
- WebSocket upgrade request does NOT pass through CSRF middleware
- Attacker can initiate WebSocket connection from malicious site

**Attack Scenario**:
```html
<!-- Attacker's site -->
<script>
// User is authenticated to legitimate-app.com
// Attacker opens WebSocket to legitimate-app.com
const ws = new WebSocket('wss://legitimate-app.com?token=STOLEN_TOKEN');
// If token stolen via XSS, attacker can connect from their domain
</script>
```

**Note**: This requires token theft first (XSS or other vulnerability), but WebSocket should validate Origin header.

**Recommendation**:
```markdown
P2: Add Origin validation for WebSocket upgrades
1. Check 'Origin' header during WebSocket handshake
2. Reject connections from unexpected origins
3. Whitelist allowed origins (same as CORS config)
4. Log rejected WebSocket origins for security monitoring
```

---

### 12. **Missing Restaurant ID Format Validation**

**Location**: Multiple locations accept restaurant ID without validation

**Examples**:
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/restaurantAccess.ts:30`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/voice/websocket-server.ts:116`

**Issue**:
- Restaurant IDs expected to be UUIDs but not validated
- Client can send malformed IDs: `', '', 'null', 'undefined', '../etc/passwd', SQL injection attempts`
- Some code checks for 'undefined'/'null' strings (`auth.ts:132-143`) but not consistently

**Current Validation** (only at startup for DEFAULT_RESTAURANT_ID):
```typescript
// /Users/mikeyoung/CODING/rebuild-6.0/server/src/config/env.ts:118-123
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(env.DEFAULT_RESTAURANT_ID)) {
  errors.push('DEFAULT_RESTAURANT_ID must be a valid UUID format');
}
```

**Recommendation**:
```markdown
P2: Add restaurant ID validation function
1. Create validateRestaurantId(id: string): boolean utility
2. Validate UUID format before database queries
3. Reject malformed IDs early (fail-fast)
4. Apply to: header extraction, JWT restaurant_id, client messages
```

---

## Test Coverage Gaps

### Missing Test Scenarios

1. **WebSocket Token Expiry Mid-Session**
   - Test: Connect with valid token, wait for expiry, send message
   - Expected: Connection closed or re-auth required
   - Current: Likely stays connected (untested)

2. **Restaurant ID Mismatch: JWT vs Header**
   - Test: JWT has restaurant A, header has restaurant B
   - Expected: Which takes precedence? (inconsistent currently)
   - Need test for both authenticate() and validateRestaurantAccess()

3. **Concurrent WebSocket Connections**
   - Test: Same user opens 10 WebSocket connections simultaneously
   - Expected: Rate limit? Connection limit? All allowed?
   - Current: No limit (untested)

4. **Voice Session Restaurant Spoofing**
   - Test: Authenticated for restaurant A, send session.start with restaurant B
   - Expected: Rejected
   - Current: **LIKELY ALLOWED** (critical gap!)

5. **Demo User Validation**
   - Test: JWT with `sub: 'demo:attacker'` and arbitrary restaurant_id
   - Expected: Some validation or rate limiting
   - Current: Likely bypasses database check

6. **WebSocket STRICT_AUTH Mode**
   - Test: STRICT_AUTH=true, WebSocket token without restaurant_id
   - Expected: Rejected (like HTTP)
   - Current: **FALLBACK TO DEFAULT** (inconsistency)

7. **Anonymous WebSocket in Production**
   - Test: NODE_ENV=production, connect without token
   - Expected: Immediate rejection
   - Current: Tested but need regression test

8. **Restaurant Deleted Mid-Session**
   - Test: User connected, admin deletes restaurant from database
   - Expected: WebSocket closed or errors gracefully
   - Current: Unknown behavior

---

## Positive Findings

### Security Strengths

1. ✅ **JWT Signature Validation**: Both HTTP and WebSocket properly verify JWT signatures
2. ✅ **Production Token Requirement**: Anonymous WebSocket connections rejected in production
3. ✅ **Database-Backed Restaurant Access**: HTTP routes validate against `user_restaurants` table
4. ✅ **Admin Bypass**: Admins can access any restaurant (appropriate)
5. ✅ **5-Second Database Timeout**: Prevents hanging on slow DB queries
6. ✅ **Graceful Shutdown**: WebSocket servers properly clean up on shutdown
7. ✅ **Session Timeout**: Voice sessions timeout after 5 minutes of inactivity
8. ✅ **Heartbeat Mechanism**: Detects dead connections (60s intervals)

### Code Quality

1. ✅ **Comprehensive Logging**: Auth failures logged with context
2. ✅ **Error Handling**: Proper try-catch with fallbacks
3. ✅ **Type Safety**: Strong TypeScript types for auth interfaces
4. ✅ **Test Coverage**: Basic auth tests exist (but gaps noted above)

---

## Recommendations Summary

### Immediate Actions (P0 - This Week)

1. **Fix Voice Session Restaurant Validation** (Critical)
   - Validate client-provided `restaurant_id` against JWT
   - Reject session.start if mismatch
   - Add test coverage

2. **Remove Anonymous WebSocket Support** (High)
   - Require JWT for all WebSocket connections (all environments)
   - Add ALLOW_ANONYMOUS_WS flag for local dev only
   - Startup validation to reject in production

3. **Document Token-in-URL Risk** (High)
   - Add security warning to README
   - Document that tokens appear in logs
   - Plan migration to Sec-WebSocket-Protocol header

### Short-Term Actions (P1 - This Sprint)

4. **Align WebSocket and HTTP Restaurant Validation**
   - Create validateWebSocketRestaurantAccess()
   - Database lookup for non-admin WebSocket users
   - Return restaurantRole for WebSocket connections

5. **Apply STRICT_AUTH to WebSocket**
   - Reject WebSocket tokens without restaurant_id when STRICT_AUTH=true
   - Match HTTP behavior

6. **Standardize Restaurant ID Precedence**
   - Fix validateRestaurantAccess to use req.restaurantId first
   - Document: JWT > Header precedence
   - Add warning when header differs from JWT

7. **Token Validation in Heartbeat**
   - Check JWT expiration during heartbeat
   - Send 'token_expiring_soon' event
   - Document max session duration

### Medium-Term Actions (P2 - Next Sprint)

8. **Migrate Token Passing to WebSocket Protocol**
   - Use Sec-WebSocket-Protocol header instead of query param
   - Update client libraries
   - Rotate exposed tokens from logs

9. **Add Origin Validation for WebSocket**
   - Validate Origin header during handshake
   - Whitelist allowed origins
   - Log rejected attempts

10. **Strengthen Demo User Validation**
    - Enforce 'demo:role:uuid' format
    - Maintain whitelist of demo IDs
    - Reject demo users in production

---

## Multi-tenancy Security Score

### Restaurant Isolation: **7/10**

**Strengths:**
- ✅ Database validation for HTTP requests (user_restaurants table)
- ✅ JWT includes restaurant_id for scope enforcement
- ✅ Admin bypass is explicit and logged
- ✅ Demo users have restaurant_id in JWT

**Weaknesses:**
- ❌ WebSocket auth skips database validation (relies only on JWT)
- ❌ Voice sessions accept client-controlled restaurant_id (CRITICAL)
- ❌ Header vs JWT precedence inconsistent
- ⚠️ Demo user bypass relies on string prefix check

**Risk**: User can access other restaurant's data via voice WebSocket session spoofing.

---

### WebSocket Security: **6/10**

**Strengths:**
- ✅ JWT signature validated on connection
- ✅ Anonymous connections rejected in production
- ✅ Proper error handling and connection cleanup
- ✅ Session timeouts prevent zombie connections

**Weaknesses:**
- ❌ Token passed in URL (logged, exposed)
- ❌ No token refresh during long sessions
- ❌ No re-validation of token after initial connection
- ❌ Anonymous connections allowed in dev/test (multi-tenant bypass)
- ❌ No Origin validation for CSRF protection

**Risk**: Stolen tokens can be used from any origin, tokens visible in logs, and long-lived sessions outlive token expiry.

---

### Overall: **6.5/10**

**Summary**: The system has solid foundational security with JWT validation and database-backed access control for HTTP. However, **critical gaps in WebSocket authentication** and **voice session restaurant validation** create multi-tenancy bypass risks. The token-in-URL pattern is a significant security smell that should be addressed.

**Compliance Status**:
- ✅ Authentication enforced in production
- ✅ Multi-tenancy at database layer (HTTP)
- ⚠️ Multi-tenancy weaker at WebSocket layer
- ❌ Token handling not production-ready (logs exposure)

---

## Conclusion

The WebSocket authentication system is **functional but has critical security gaps**, particularly around:
1. Voice session restaurant validation (P0 multi-tenancy bypass)
2. Token exposure in URLs (P0 security smell)
3. Anonymous WebSocket connections in non-production (P0 dev/test bypass)
4. Inconsistent validation between HTTP and WebSocket (P1)

**Recommended Prioritization**:
- **Week 1**: Fix voice session restaurant validation (#1) + remove anonymous WS (#2)
- **Week 2**: Align WebSocket/HTTP validation (#4) + STRICT_AUTH WebSocket (#5)
- **Week 3**: Token-in-URL migration (#8) + Origin validation (#9)

**Risk Acceptance**: If token-in-URL migration is deferred, document this as accepted risk and rotate tokens more frequently (daily instead of 1-hour expiry).

---

**Audit Completed**: 2025-11-10
**Auditor**: Claude Code (Sonnet 4.5)
**Files Reviewed**: 8 core files + 12 test files
**Lines Analyzed**: ~2,500 LOC
