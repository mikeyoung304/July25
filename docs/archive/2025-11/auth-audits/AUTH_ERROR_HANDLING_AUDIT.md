# Auth Error Handling & Observability Audit

**Date**: 2025-11-10
**Scope**: Authentication system error handling and logging
**Files Audited**:
- `/server/src/middleware/auth.ts`
- `/server/src/services/auth/pinAuth.ts`
- `/server/src/services/auth/stationAuth.ts`
- `/server/src/routes/auth.routes.ts`
- `/server/src/middleware/authRateLimiter.ts`

## Executive Summary

The authentication system demonstrates **strong error handling practices** with comprehensive logging and proper fail-fast behavior. However, there are **7 critical silent failures** in database operations that violate ADR-009 principles and could lead to production issues going undetected.

**Overall Assessment**: ⚠️ **Needs Attention** - Strong foundation but critical gaps in database error handling.

---

## Critical Issues (P0)

### 1. Silent Database Failures

**CRITICAL**: Multiple database operations don't check error returns and fail silently, violating ADR-009 fail-fast philosophy.

#### Issue 1A: Unhandled last_activity_at Update
- **Location**: `/server/src/services/auth/stationAuth.ts:220-225`
- **Impact**: If database update fails during token validation, last activity tracking silently breaks. Valid tokens appear stale, potentially causing false security alerts.
- **Code**:
```typescript
// Update last activity
await supabase
  .from('station_tokens')
  .update({
    last_activity_at: new Date().toISOString()
  })
  .eq('id', storedToken.id);
// ❌ NO ERROR CHECK - Silent failure possible
```
- **Fix**: Add error checking and logging:
```typescript
const { error: updateError } = await supabase
  .from('station_tokens')
  .update({ last_activity_at: new Date().toISOString() })
  .eq('id', storedToken.id);

if (updateError) {
  stationLogger.error('Failed to update station token activity', {
    tokenId: storedToken.id,
    error: updateError
  });
  // Continue validation but log for monitoring
}
```

#### Issue 1B: Unhandled PIN Attempt Reset
- **Location**: `/server/src/services/auth/pinAuth.ts:215-223`
- **Impact**: Successful PIN validation fails to reset attempt counter. User could be incorrectly locked out on next login despite previous success.
- **Code**:
```typescript
await supabase
  .from('user_pins')
  .update({
    attempts: 0,
    locked_until: null,
    last_attempt_at: new Date().toISOString()
  })
  .eq('id', record.id)
  .eq('restaurant_id', restaurantId);
// ❌ NO ERROR CHECK
```
- **Fix**: Add error checking with fail-fast for critical state:
```typescript
const { error: resetError } = await supabase
  .from('user_pins')
  .update({
    attempts: 0,
    locked_until: null,
    last_attempt_at: new Date().toISOString()
  })
  .eq('id', record.id)
  .eq('restaurant_id', restaurantId);

if (resetError) {
  pinLogger.error('CRITICAL: Failed to reset PIN attempts after successful auth', {
    userId: record.user_id,
    restaurantId,
    error: resetError
  });
  // Still allow auth but log for immediate attention
}
```

#### Issue 1C: Unhandled Failed PIN Attempt Counter
- **Location**: `/server/src/services/auth/pinAuth.ts:273-277`
- **Impact**: Failed PIN attempts aren't counted. Brute force protection silently fails - attackers get unlimited attempts.
- **Severity**: 🔴 **CRITICAL SECURITY ISSUE**
- **Code**:
```typescript
await supabase
  .from('user_pins')
  .update(updates)
  .eq('id', record.id)
  .eq('restaurant_id', restaurantId);
// ❌ NO ERROR CHECK - Brute force protection silently fails
```
- **Fix**: MUST fail-fast on security controls:
```typescript
const { error: updateError } = await supabase
  .from('user_pins')
  .update(updates)
  .eq('id', record.id)
  .eq('restaurant_id', restaurantId);

if (updateError) {
  pinLogger.error('CRITICAL: Failed to increment PIN attempt counter', {
    userId: record.user_id,
    restaurantId,
    attempts: newAttempts,
    error: updateError
  });
  // MUST fail auth to prevent brute force if we can't count attempts
  return {
    isValid: false,
    error: 'Authentication system error'
  };
}
```

#### Issue 1D: Unhandled Auth Log Insertions (3 instances)
- **Locations**:
  - `/server/src/routes/auth.routes.ts:65-73` (login success)
  - `/server/src/routes/auth.routes.ts:249-257` (logout)
  - `/server/src/services/auth/pinAuth.ts:363-370` (auth events)
  - `/server/src/services/auth/stationAuth.ts:407-414` (auth events)
- **Impact**: Auth events silently fail to log. Audit trail has gaps, making security incident investigation impossible.
- **Current Behavior**: `logAuthEvent()` catches errors but doesn't propagate them
- **Code Example**:
```typescript
// Log successful login
await supabase
  .from('auth_logs')
  .insert({
    user_id: authData.user.id,
    restaurant_id: restaurantId,
    event_type: 'login_success',
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  });
// ❌ NO ERROR CHECK
```
- **Fix**: Add error checking with degraded mode handling:
```typescript
const { error: logError } = await supabase
  .from('auth_logs')
  .insert({
    user_id: authData.user.id,
    restaurant_id: restaurantId,
    event_type: 'login_success',
    ip_address: req.ip,
    user_agent: req.headers['user-agent']
  });

if (logError) {
  logger.error('Failed to log auth event to database', {
    userId: authData.user.id,
    restaurantId,
    eventType: 'login_success',
    error: logError
  });
  // Continue auth flow but alert on logging failure
}
```

#### Issue 1E: Unhandled PIN Existence Check
- **Location**: `/server/src/services/auth/pinAuth.ts:99-104`
- **Impact**: PIN creation/update can't detect existing records if database read fails. Could create duplicates or fail silently.
- **Code**:
```typescript
const { data: existing } = await supabase
  .from('user_pins')
  .select('id')
  .eq('user_id', userId)
  .eq('restaurant_id', restaurantId)
  .single();
// ❌ NO ERROR CHECK - doesn't distinguish between "no record" and "database error"
```
- **Fix**: Check error explicitly:
```typescript
const { data: existing, error: checkError } = await supabase
  .from('user_pins')
  .select('id')
  .eq('user_id', userId)
  .eq('restaurant_id', restaurantId)
  .single();

// .single() returns error for "no rows" - that's expected
if (checkError && checkError.code !== 'PGRST116') {
  pinLogger.error('Failed to check existing PIN', {
    userId,
    restaurantId,
    error: checkError
  });
  throw new Error('Database error checking PIN');
}
```

#### Issue 1F: Unhandled Role Fetch During PIN Auth
- **Location**: `/server/src/services/auth/pinAuth.ts:226-232`
- **Impact**: User authenticates with PIN but gets undefined role. Downstream authorization may fail or grant incorrect permissions.
- **Code**:
```typescript
const { data: userRole } = await supabase
  .from('user_restaurants')
  .select('role')
  .eq('user_id', record.user_id)
  .eq('restaurant_id', restaurantId)
  .eq('is_active', true)
  .single();
// ❌ NO ERROR CHECK - role will be undefined on failure
```
- **Fix**: Add error checking and fail auth if role can't be determined:
```typescript
const { data: userRole, error: roleError } = await supabase
  .from('user_restaurants')
  .select('role')
  .eq('user_id', record.user_id)
  .eq('restaurant_id', restaurantId)
  .eq('is_active', true)
  .single();

if (roleError || !userRole?.role) {
  pinLogger.error('Failed to fetch user role during PIN auth', {
    userId: record.user_id,
    restaurantId,
    error: roleError
  });
  return {
    isValid: false,
    error: 'Unable to determine user permissions'
  };
}
```

---

## Important Issues (P1)

### 2. Incomplete Error Logging

#### Issue 2A: Missing Request Context in optionalAuth Error
- **Location**: `/server/src/middleware/auth.ts:152`
- **Impact**: Generic warning doesn't include request context, making debugging difficult.
- **Code**:
```typescript
logger.warn('Optional auth failed:', error);
```
- **Fix**: Add request context:
```typescript
logger.warn('Optional auth failed', {
  error: error instanceof Error ? error.message : String(error),
  path: req.path,
  method: req.method,
  restaurantId: req.headers['x-restaurant-id']
});
```

#### Issue 2B: Error Logging Without Context in Routes
- **Location**: `/server/src/routes/auth.routes.ts` - Multiple catch blocks
- **Impact**: All route handlers use `next(error)` without logging context first. Error handler sees errors but loses request-specific details.
- **Example**: Lines 111, 188, 234, 277, 334, 375, 411, 441
- **Fix Pattern**:
```typescript
} catch (error) {
  logger.error('Login failed', {
    error: error instanceof Error ? error.message : String(error),
    email: req.body.email,
    restaurantId: req.body.restaurantId,
    path: req.path
  });
  next(error);
}
```

#### Issue 2C: WebSocket Auth Error Lacks Detail
- **Location**: `/server/src/middleware/auth.ts:204`
- **Impact**: Generic error message doesn't help debug WebSocket auth issues.
- **Code**:
```typescript
logger.error('WebSocket auth error:', error);
```
- **Fix**: Add connection context:
```typescript
logger.error('WebSocket auth error', {
  error: error instanceof Error ? error.message : String(error),
  url: request.url,
  host: request.headers.host,
  origin: request.headers.origin,
  hasToken: url.searchParams.has('token')
});
```

#### Issue 2D: Scope Fetch Failures Only Warn
- **Location**: `/server/src/routes/auth.routes.ts:81-82, 165-166, 315-316`
- **Impact**: User logs in successfully but has no scopes. All RBAC checks will fail. Should fail-fast instead of degrading.
- **Code**:
```typescript
if (scopesError) {
  logger.warn('scope_fetch_fail', { restaurant_id: restaurantId });
}
const scopes = scopesData?.map(s => s.scope) || [];
```
- **Fix**: Fail-fast for critical RBAC data:
```typescript
if (scopesError) {
  logger.error('Failed to fetch user scopes - RBAC unavailable', {
    userId: authData.user.id,
    role: userRole.role,
    restaurantId,
    error: scopesError
  });
  throw new Error('Unable to determine user permissions');
}
```

### 3. Potential Error Swallowing

#### Issue 3A: Intentional Error Swallowing in Logout
- **Location**: `/server/src/routes/auth.routes.ts:260-265`
- **Status**: ✅ **ACCEPTABLE** (documented intent)
- **Code**:
```typescript
try {
  await supabaseAuth.auth.signOut();
} catch (error) {
  // Ignore Supabase signout errors (user might be using PIN/station auth)
  logger.debug('Supabase signout error (ignored):', error);
}
```
- **Assessment**: Properly documented why error is ignored. Using `debug` level is appropriate.

#### Issue 3B: Intentional Error Swallowing in Auth Logging
- **Location**: `/server/src/services/auth/pinAuth.ts:372-374`, `/server/src/services/auth/stationAuth.ts:416-418`
- **Status**: ⚠️ **NEEDS IMPROVEMENT**
- **Code**:
```typescript
} catch (error) {
  pinLogger.error('Failed to log auth event:', error);
  // Don't throw - logging failure shouldn't break auth flow
}
```
- **Issue**: Comment explains intent but doesn't alert on logging system failure. Should have metrics.
- **Recommendation**: Add metric/alert for logging failures:
```typescript
} catch (error) {
  pinLogger.error('Failed to log auth event:', error);
  // TODO: Add metric for auth_log_failure_count
  // Alert if rate exceeds threshold (indicates DB issues)
}
```

---

## Logging Improvements (P2)

### 4. Missing Request Context

#### Issue 4A: JWT Secret Missing Error
- **Location**: `/server/src/middleware/auth.ts:47`, `/server/src/routes/auth.routes.ts:142`
- **Current**: Logs error but no request context
- **Improvement**: Add context about what operation failed:
```typescript
logger.error('JWT_SECRET not configured - authentication cannot proceed', {
  operation: 'authenticate',
  path: req.path,
  method: req.method,
  userId: decoded?.sub
});
```

#### Issue 4B: Rate Limiter Logging is Excellent
- **Location**: `/server/src/middleware/authRateLimiter.ts:206-219`
- **Status**: ✅ **EXEMPLARY**
- **Highlights**:
  - Comprehensive diagnostic logging with emoji markers
  - Request context (path, method, headers)
  - Tracking data (attempts, blocked status)
  - Structured format for easy parsing
- **Example**:
```typescript
logger.info('🔍 AUTH CHECK:', {
  clientId,
  ip: req.ip,
  isBlocked: blockedIPs.has(clientId),
  attempts: suspiciousIPs.get(clientId) || 0,
  endpoint: req.path,
  method: req.method,
  headers: {
    origin: req.headers.origin,
    referer: req.headers.referer,
    userAgent: req.headers['user-agent']?.slice(0, 100)
  }
});
```

### 5. Sensitive Data Exposure

#### Issue 5A: Token Hash Truncation - Good Practice
- **Location**: `/server/src/services/auth/stationAuth.ts:191, 209-211`
- **Status**: ✅ **SECURE**
- **Code**:
```typescript
tokenHash: tokenHash.substring(0, 8) + '...'
```
- **Assessment**: Properly redacts sensitive token hashes in logs.

#### Issue 5B: PIN Values Never Logged
- **Location**: Throughout `/server/src/services/auth/pinAuth.ts`
- **Status**: ✅ **SECURE**
- **Assessment**: PIN values are never logged, only user IDs and restaurant IDs. Excellent security practice.

#### Issue 5C: JWT Tokens Never Logged
- **Location**: Throughout auth files
- **Status**: ✅ **SECURE**
- **Assessment**: Tokens are never logged, preventing session hijacking from logs.

### 6. Log Level Appropriateness

#### Issue 6A: Inconsistent Error Levels
- **Issue**: Some database errors use `.error()`, others use `.warn()`
- **Recommendation**: Standardize:
  - `.error()` - Operation cannot proceed, user affected
  - `.warn()` - Degraded functionality, user may be affected
  - `.info()` - Successful operations, security events
  - `.debug()` - Verbose diagnostic info (like ignored errors)

#### Issue 6B: Security Events Should Be `.warn()` or Higher
- **Status**: ✅ **CORRECT**
- **Examples**:
  - Failed PIN attempts: `pinLogger.warn()` ✅
  - Account lockouts: `pinLogger.warn()` ✅
  - Token validation failures: `stationLogger.warn()` ✅
  - Blocked clients: `logger.error()` ✅

---

## Observability Gaps

### 7. Missing Metrics for Monitoring

#### Gap 7A: Auth Success/Failure Rates
- **Current**: Events logged to database and application logs
- **Missing**: Real-time metrics for monitoring dashboards
- **Recommendation**: Add metric tracking:
```typescript
// Track auth attempts by method and outcome
metrics.increment('auth.attempt', {
  method: 'pin',
  result: 'success',
  restaurantId
});
```

#### Gap 7B: No Token Expiry Tracking
- **Issue**: Can't proactively detect token expiry issues
- **Recommendation**: Log when tokens are close to expiry:
```typescript
if (decoded.exp && (decoded.exp - Date.now()/1000) < 300) {
  logger.info('Token expiring soon', {
    userId: decoded.sub,
    expiresIn: decoded.exp - Date.now()/1000
  });
}
```

#### Gap 7C: Rate Limiter Effectiveness Metrics
- **Current**: Logs individual blocks
- **Missing**: Aggregate metrics on rate limiting effectiveness
- **Recommendation**: Periodic reporting:
```typescript
// Add to cleanup interval
logger.info('[SECURITY] Rate limiter stats', {
  suspiciousIPs: suspiciousIPs.size,
  blockedIPs: blockedIPs.size,
  timestamp: new Date().toISOString()
});
```

### 8. Debugging Production 401s

#### Gap 8A: 401 Responses Lack Correlation IDs
- **Issue**: Can't correlate 401 response to specific log entry
- **Current**: Unauthorized errors don't include unique identifiers
- **Recommendation**: Add request ID to all auth errors:
```typescript
throw Unauthorized('No token provided', {
  requestId: req.id, // Requires express-request-id middleware
  path: req.path
});
```

#### Gap 8B: Token Validation Failure Reasons Not Granular
- **Location**: `/server/src/middleware/auth.ts:54-61`
- **Current**: Generic error messages
- **Improvement**: More specific error codes:
```typescript
} catch (error) {
  if (error instanceof jwt.TokenExpiredError) {
    logger.info('Token expired', { userId: decoded?.sub, path: req.path });
    throw Unauthorized('Token expired', { code: 'TOKEN_EXPIRED' });
  } else if (error instanceof jwt.JsonWebTokenError) {
    logger.warn('Invalid token signature', { path: req.path });
    throw Unauthorized('Invalid token', { code: 'TOKEN_INVALID' });
  }
  logger.error('Token verification failed', { error, path: req.path });
  throw Unauthorized('Token verification failed', { code: 'TOKEN_VERIFICATION_FAILED' });
}
```

### 9. Correlation Across Systems

#### Gap 9A: Can't Correlate Auth with User Actions
- **Issue**: Auth logs in `auth_logs` table separate from user activity
- **Recommendation**: Add `session_id` to all auth events for correlation

#### Gap 9B: WebSocket Auth Not Tracked in auth_logs
- **Location**: `/server/src/middleware/auth.ts:162-207`
- **Issue**: WebSocket auth bypasses auth_logs table
- **Recommendation**: Add WebSocket auth logging:
```typescript
if (decoded) {
  await supabase
    .from('auth_logs')
    .insert({
      user_id: decoded.sub,
      restaurant_id: decoded.restaurant_id || config.restaurant.defaultId,
      event_type: 'websocket_auth_success',
      metadata: { url: request.url }
    });
}
```

---

## Positive Findings

### What's Done Well

1. **✅ Fail-Fast at Startup** (ADR-009 Compliance)
   - JWT secret validation prevents startup without auth config
   - Lines 47-49, 142-144, 186-188 all check JWT_SECRET early
   - Environment validation in `env.ts` catches missing secrets

2. **✅ Comprehensive Try-Catch Coverage**
   - All async auth operations wrapped in try-catch
   - No unhandled promise rejections in auth code
   - All route handlers use `next(error)` for proper error propagation

3. **✅ Structured Logging**
   - Consistent use of child loggers (`pinLogger`, `stationLogger`)
   - Structured objects passed to logger (not string concatenation)
   - Contextual information included (userId, restaurantId)

4. **✅ Security-First Error Messages**
   - Generic error messages to users (no info leakage)
   - Detailed logging for operators (debugging info preserved)
   - Token hashes truncated in logs
   - PINs never logged

5. **✅ Rate Limiter Implementation (P0.8)**
   - Excellent diagnostic logging with context
   - Proper cleanup on shutdown (`stopRateLimiterCleanup()`)
   - Memory leak prevention with periodic cleanup
   - Appropriate rate limits by auth method

6. **✅ STRICT_AUTH Mode Enforcement**
   - Lines 38-92 in `auth.ts` enforce strict mode
   - Proper logging of rejections with context
   - No silent fallbacks that hide errors

7. **✅ optionalAuth Documentation**
   - Clearly named function indicates intentional non-blocking
   - Comments explain degraded behavior
   - Appropriate for public endpoints

8. **✅ Auth Event Audit Trail**
   - Comprehensive logging to `auth_logs` table
   - Covers login, logout, PIN success/failure, station auth
   - IP address and user agent captured

---

## ADR-009 Compliance Analysis

### Fail-Fast Philosophy Compliance

#### ✅ **Strengths (Score: 8/10)**

1. **Startup Validation**: JWT secret checked before server starts
2. **STRICT_AUTH Mode**: Enforces restaurant_id requirement with fail-fast
3. **No Silent Fallbacks**: Removed test token support, single JWT secret
4. **Environment Validation**: P0.7 validation catches config errors at startup
5. **Token Validation**: JWT errors properly categorized and fail immediately

#### ❌ **Violations (Score Impact: -2)**

1. **Database Silent Failures**: 7 critical operations don't check errors
2. **Scope Fetch Degradation**: Allows login with empty scopes (should fail)
3. **Failed Attempt Counter**: Security control can silently fail

#### **Overall Fail-Fast Score: 8/10**
- Strong at startup and JWT validation
- Weak at database error handling

### Error Logging Compliance

#### ✅ **Strengths (Score: 7/10)**

1. **Structured Logging**: Consistent use of structured objects
2. **Security Logging**: All auth events tracked
3. **Context Preservation**: userId, restaurantId included
4. **Sensitive Data**: Properly redacted

#### ❌ **Gaps (Score Impact: -3)**

1. **Missing Request Context**: Route handlers don't log before next(error)
2. **Silent Database Failures**: No logs when DB operations fail silently
3. **No Metrics**: Can't track auth rates in real-time
4. **Limited Correlation**: Hard to debug production 401s

#### **Overall Error Logging Score: 7/10**
- Good structure and security
- Missing context and metrics

### **ADR-009 Overall Compliance: 7.5/10**

**Strengths**: Strong startup validation, secure logging, comprehensive try-catch coverage
**Weaknesses**: Silent database failures, missing metrics, limited request context

---

## Recommendations

### Priority 0 (This Week)

1. **Fix Silent Database Failures (Issue 1A-1F)**
   - Add error checking to all 7 database operations
   - Implement fail-fast for security controls (PIN attempt counter)
   - Add degraded-mode handling for non-critical operations

2. **Fail-Fast on Scope Fetch Failure (Issue 2D)**
   - Change `logger.warn` to `logger.error` + throw
   - Prevent login without RBAC data

3. **Add Request Context to Route Errors (Issue 2B)**
   - Log error details before `next(error)`
   - Include email/restaurantId/path in context

### Priority 1 (Next Sprint)

4. **Standardize Error Logging Pattern**
   - Document standard logging pattern for routes
   - Add linting rule to enforce error logging

5. **Add Metrics for Auth Monitoring**
   - Implement auth attempt counters by method/result
   - Track rate limiter effectiveness
   - Monitor auth_log insertion failures

6. **Improve 401 Debugging**
   - Add request IDs to all auth errors
   - More granular token validation error codes
   - Correlation IDs for tracing

### Priority 2 (Future)

7. **WebSocket Auth Logging**
   - Add WebSocket auth events to auth_logs table
   - Enable correlation with HTTP auth

8. **Token Expiry Proactive Logging**
   - Warn when tokens approaching expiry
   - Help debug client refresh issues

9. **Auth Event Correlation**
   - Add session_id to all auth events
   - Link auth with user actions

---

## Implementation Checklist

### Immediate Actions (P0)

- [ ] Add error checking to stationAuth.ts line 220 (last_activity_at update)
- [ ] Add error checking to pinAuth.ts line 215 (PIN attempt reset)
- [ ] Add error checking to pinAuth.ts line 273 (failed attempt counter) **CRITICAL**
- [ ] Add error checking to all auth_logs insertions (4 locations)
- [ ] Add error checking to pinAuth.ts line 99 (PIN existence check)
- [ ] Add error checking to pinAuth.ts line 226 (role fetch during PIN auth)
- [ ] Change scope fetch failures from warn to error + throw (3 locations)
- [ ] Add request context logging to all route catch blocks (9 locations)

### Testing Requirements

- [ ] Test database failure scenarios (disconnect DB during auth)
- [ ] Verify error logs include all required context
- [ ] Test PIN brute force protection with DB failures
- [ ] Verify scope fetch failure blocks login
- [ ] Test rate limiter cleanup on shutdown

### Documentation

- [ ] Document standard error logging pattern
- [ ] Update ADR-009 compliance status
- [ ] Add runbook for investigating 401 errors
- [ ] Document metrics to monitor

---

## Conclusion

The authentication system has **strong foundations** with comprehensive try-catch coverage, secure logging practices, and good fail-fast behavior at startup. However, **7 critical database operations silently fail**, violating ADR-009 principles and creating potential security and reliability issues.

**Key Takeaway**: The team prioritized security (no leaked sensitive data) and structure (consistent patterns) but missed systematic error checking on database operations. This is a common pattern when adding features quickly - the code works in the happy path but lacks defensive error handling.

**Immediate Action Required**: Fix the 7 silent database failures, especially the PIN attempt counter (Issue 1C), which is a critical security control that can silently fail and allow brute force attacks.

**Long-term**: Implement metrics and correlation IDs to improve production observability and make 401 errors easier to debug.

---

**ADR-009 Compliance Score: 7.5/10**
- **Fail-fast**: 8/10 (strong at startup, weak at database layer)
- **Error logging**: 7/10 (good structure, missing context/metrics)
- **Overall**: Good foundation, critical gaps need immediate attention
