# CL-SEC-001: API Error Handling & Authentication Security

**Date:** 2025-12-26
**Severity:** Critical (P1-P3 issues)
**Components:** Error handling, API routes, authentication
**Status:** Documented

## Issues Fixed in This Session

### 1. API Error Information Disclosure (CWE-209)
**Impact:** HIGH - Exposed internal details in error responses
**Files affected:** `server/src/routes/ai.routes.ts`, `health.routes.ts`, `orders.routes.ts`

**Example of vulnerable code:**
```typescript
// BEFORE (vulnerable)
res.status(500).json({
  error: getErrorMessage(error)  // Returns internal error details
});
// Possible output: "Connection failed to postgres://user@db.internal:5432"
```

**Implemented fix:**
```typescript
// AFTER (safe)
res.status(500).json({
  error: safeApiError(error, 'Failed to load menu', aiLogger)
});
// Output: "Failed to load menu" (generic, user-friendly)
// Internal details logged server-side only
```

### 2. Test Endpoints Without Authentication (CWE-78)
**Impact:** MEDIUM - Unauthenticated access to expensive resources
**Files affected:** `server/src/routes/ai.routes.ts` (lines 578-657)

**Example of vulnerable code:**
```typescript
// BEFORE (vulnerable)
router.post('/test-tts', trackAIMetrics('test-tts'), async (req, res) => {
  // No authentication check - anyone can call this
  // Can trigger OpenAI API calls and incur costs
});
```

**Implemented fix:**
```typescript
// AFTER (safe)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-tts', authenticate, requireRole(['admin']), ...);
}
// Endpoints only available in development or with auth
```

### 3. Incomplete Error Pattern Migration
**Impact:** MEDIUM - Inconsistent error handling creates confusion
**Files affected:** Multiple files still using old patterns

**Example of inconsistency:**
```typescript
// OLD pattern (redundant after utility creation)
const msg = error instanceof Error ? error.message : String(error);

// NEW pattern (correct)
import { getErrorMessage } from '@rebuild/shared';
const msg = getErrorMessage(error);
```

### 4. Redundant Fallback Patterns (Dead Code)
**Impact:** LOW - Technical debt, maintenance confusion
**Pattern:** Multiple error extraction patterns doing the same thing

---

## Prevention Strategies

### Strategy 1: Error Response Standardization

#### Rule: Never expose raw error messages to API clients

**Implementation:**
- Always use `safeApiError()` for API responses
- Log full error details server-side with logger
- Return only generic, user-friendly messages to clients

**Pattern to follow:**
```typescript
try {
  // business logic
} catch (error) {
  logger.error('Operation failed', {
    error: getErrorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: { restaurantId, userId }
  });

  res.status(500).json({
    error: safeApiError(error, 'Friendly message for user', logger)
  });
}
```

**What to avoid:**
```typescript
// DON'T do this
res.status(500).json({ error: error.message });  // Exposes internals
res.status(500).json({ error: getErrorMessage(error) });  // Raw extraction
res.status(500).json({ error: String(error) });  // Unclear source
```

#### Code Review Checklist:
- [ ] API endpoints use `safeApiError()` for all error responses
- [ ] Full error details are logged server-side, not sent to client
- [ ] Generic messages are user-friendly ("Failed to save" not "ECONNREFUSED")
- [ ] No raw `error.message` in response bodies
- [ ] No stack traces in error responses
- [ ] Database URLs, file paths, service names not visible in error messages

---

### Strategy 2: Authentication on Protected Resources

#### Rule: All endpoints accessing external services or restricted data require authentication

**Protected resource categories:**
1. **Expensive external APIs:** OpenAI, Stripe, etc.
2. **Test/Debug endpoints:** Only in development
3. **Admin operations:** Configuration, monitoring, system state
4. **User data:** Restaurant-specific orders, menus, settings

**Pattern to follow:**
```typescript
// Expensive service endpoint - ALWAYS require auth
router.post('/ai/transcribe',
  authenticate,           // Verify user identity
  requireRole(['admin']),  // Restrict to admin role
  rateLimiter,            // Prevent abuse
  async (req, res) => {
    // Implementation
  }
);

// Development-only test endpoint
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/test-connection',
    authenticate,
    async (req, res) => { /* ... */ }
  );
}
```

**What to avoid:**
```typescript
// DON'T do this
router.post('/ai/test-tts', async (req, res) => {
  // No authentication = publicly accessible
});

// DON'T do this
if (!process.env.DISABLE_DEBUG) {
  // Misses production misconfiguration
}
```

#### Code Review Checklist:
- [ ] All external service endpoints require `authenticate` middleware
- [ ] Test endpoints have `if (NODE_ENV === 'development')` guard
- [ ] Role restrictions match the sensitivity of the operation
- [ ] Rate limiting on high-cost endpoints
- [ ] No `TODO` or `FIXME` comments about auth
- [ ] Restaurant ID validation on all data operations

---

### Strategy 3: Consistent Error Utilities Usage

#### Rule: Never duplicate error extraction logic - use `getErrorMessage()` and `safeApiError()`

**Pattern to follow:**
```typescript
import { getErrorMessage, safeApiError, getErrorStack } from '@rebuild/shared';

// Extract message (for logging)
const msg = getErrorMessage(error);

// Extract stack (for debugging)
const stack = getErrorStack(error);

// Safe API response
const response = safeApiError(error, 'User-friendly message', logger);
```

**What to avoid:**
```typescript
// DON'T duplicate patterns
const msg = error instanceof Error ? error.message : String(error);
const msg2 = typeof error === 'string' ? error : (error as Error).message;
const msg3 = error?.message || 'Unknown error';
// All of these are replaced by getErrorMessage()
```

#### Code Review Checklist:
- [ ] No `error instanceof Error` patterns in new code
- [ ] No `error?.message` fallback chains
- [ ] Consistent import: `import { getErrorMessage, safeApiError }`
- [ ] Shared module patterns used everywhere (client + server)
- [ ] Search for "error.message" shows only migration comments or dead code

---

### Strategy 4: Logging Context Preservation

#### Rule: Log full error details with context, sanitize for external services

**Pattern to follow:**
```typescript
try {
  await processOrder(orderId);
} catch (error) {
  // Log everything server-side
  logger.error('Order processing failed', {
    error: getErrorMessage(error),
    stack: getErrorStack(error),
    orderId,
    restaurantId,
    userId,
    timestamp: new Date().toISOString()
  });

  // Return generic message to client
  res.status(500).json({
    error: 'Failed to process order. Please try again.'
  });
}
```

**Security-sensitive fields to always redact:**
- Passwords, API keys, tokens
- Database connection strings
- Internal service names and IPs
- File paths
- Customer PII (in logs sent to external services)

**Already handled by middleware:**
- `security.ts` has `sanitizeEventDetails()` that redacts:
  - password, token, apikey, api_key, authorization, secret, credential, session, cookie
- Uses recursive sanitization for nested objects
- Applied to all security event forwarding (DataDog, Sentry)

#### Code Review Checklist:
- [ ] Full error details logged server-side
- [ ] Sanitized details before external logging
- [ ] Context information includes: user ID, restaurant ID, resource ID
- [ ] Timestamps included in error logs
- [ ] No sensitive data in client error messages
- [ ] Security event monitor redacts sensitive keys

---

### Strategy 5: Environment-Based Endpoint Gating

#### Rule: Test and debug endpoints are development-only

**Pattern to follow:**
```typescript
// Gate development-only endpoints
if (process.env.NODE_ENV === 'development') {
  router.post('/debug/test-connection', async (req, res) => {
    // This endpoint only exists in development
  });

  router.get('/debug/memory', async (req, res) => {
    // Memory profiling endpoint
  });
}
```

**Not recommended:**
```typescript
// DON'T use custom flags (can be misconfigured)
if (process.env.DEBUG_MODE === 'true') {
  // Easy to accidentally enable in production
}

// DON'T check feature flags alone (they can be wrong)
if (featureFlags.testEndpoints) {
  // What if the flag service is down?
}
```

**Best practice:**
```typescript
// Combine multiple checks for high-risk endpoints
if (process.env.NODE_ENV === 'development' &&
    process.env.ENABLE_DEBUG === 'true') {
  // Extra caution for production-like testing
}
```

#### Code Review Checklist:
- [ ] No test endpoints in production code paths
- [ ] Guards use `NODE_ENV === 'development'` explicitly
- [ ] No hardcoded debug flags that might be left on
- [ ] Test endpoints documented in README
- [ ] CI/CD prevents merging unguarded test code

---

## Automation Opportunities

### ESLint Rules (Priority: Medium)

**Rule 1: Prevent raw error message exposure**
```javascript
// eslint-disable-next-line no-restricted-syntax
// Detect: res.json({ error: error.message })
// Detect: res.status(500).json({ error: getErrorMessage(error) })
// Allow: res.status(500).json({ error: safeApiError(error, ...) })

module.exports = {
  rules: {
    'no-direct-error-exposure': {
      meta: { type: 'problem' },
      create(context) {
        return {
          CallExpression(node) {
            // Check for res.json/status().json calls
            // Flag if error.message or getErrorMessage used directly
            // Allow only safeApiError in responses
          }
        };
      }
    }
  }
};
```

**Rule 2: Enforce safeApiError usage**
```javascript
// Detect all res.status().json() calls
// Require 'error' field to use safeApiError or explicit generic message
// Warn on missing error logging
```

**Rule 3: Authentication middleware enforcement**
```javascript
// Detect router.post/get/put/delete calls
// Warn if no authenticate middleware in chain
// Alert for external service endpoints (openai, stripe, etc)
```

### Test Suite (Priority: High)

**Test 1: Error response validation**
```typescript
describe('API Error Responses', () => {
  it('should not expose raw error messages', async () => {
    const res = await request(app).get('/api/non-existent');

    // Should NOT contain:
    expect(res.body.error).not.toMatch(/Error:/);
    expect(res.body.error).not.toMatch(/ECONNREFUSED/);
    expect(res.body.error).not.toMatch(/postgres:/);

    // Should be user-friendly
    expect(res.body.error).toMatch(/Failed|Unable|Error/i);
  });

  it('should not expose stack traces', async () => {
    const res = await request(app).post('/api/ai/test').send({});

    expect(res.body).not.toHaveProperty('stack');
    expect(res.body.error).not.toMatch(/at /);
  });
});
```

**Test 2: Authentication enforcement**
```typescript
describe('Protected Endpoints', () => {
  it('should reject unauthenticated requests to test endpoints', async () => {
    const res = await request(app).post('/api/ai/test-tts').send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should reject non-admin access to admin endpoints', async () => {
    const token = createToken({ role: 'user' });
    const res = await request(app)
      .post('/api/ai/test-tts')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(403);
  });
});
```

**Test 3: Error logging verification**
```typescript
describe('Error Logging', () => {
  it('should log full error details server-side', async () => {
    const spy = jest.spyOn(logger, 'error');

    await request(app).post('/api/orders').send({});

    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        error: expect.any(String),
        // Full context logged
      })
    );
  });
});
```

### CI/CD Checks (Priority: High)

**Check 1: No raw error messages in responses**
```bash
#!/bin/bash
# scripts/check-error-patterns.sh

# Detect potentially unsafe patterns in routes
grep -r "error: getErrorMessage" server/src/routes && {
  echo "ERROR: Found getErrorMessage used directly in error responses"
  exit 1
}

grep -r "error: .*\.message" server/src/routes && {
  echo "ERROR: Found .message access in error responses"
  exit 1
}

echo "OK: No raw error message patterns detected"
```

**Check 2: Test endpoints properly gated**
```bash
# Verify test endpoints are development-only
grep -r "router\.post.*test" server/src/routes | grep -v "if (process.env.NODE_ENV" && {
  echo "ERROR: Found test endpoint without NODE_ENV guard"
  exit 1
}
```

**Check 3: Authentication coverage**
```bash
# Flag routes without any auth middleware
# Compare against whitelist of public endpoints (health, status, etc)
```

---

## Best Practices Summary

### For API Endpoint Development

1. **Always start with this template:**
```typescript
import { safeApiError, getErrorMessage } from '@rebuild/shared';

router.post('/endpoint',
  authenticate,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await serviceCall(req.restaurantId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      logger.error('Endpoint failed', {
        error: getErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
        restaurantId: req.restaurantId,
        userId: req.user?.id
      });

      res.status(500).json({
        error: safeApiError(error, 'Operation failed', logger)
      });
    }
  }
);
```

2. **Always ask:**
   - Does this endpoint need authentication?
   - Is it accessing user data or external services?
   - What information could leak in error messages?
   - Should this be development-only?

3. **Always verify:**
   - No raw `error.message` in responses
   - Full context logged server-side
   - Generic messages for clients
   - Proper role restrictions

### For Code Review

**Security checklist before approving API changes:**
```
[ ] All error responses use safeApiError()
[ ] No stack traces in error responses
[ ] Full error details logged server-side
[ ] Authentication applied to protected endpoints
[ ] Role restrictions match sensitivity
[ ] Test endpoints are development-only
[ ] No hardcoded sensitive data in messages
[ ] Restaurant ID validated on all operations
```

---

## Related Lessons

- [CL-AUTH-001: Strict Auth Drift](.claude/lessons/CL-AUTH-001-strict-auth-drift.md) - Authentication patterns
- [CL-AUTH-002: Header Fallback Vulnerability](.claude/lessons/CL-AUTH-002-header-fallback-vulnerability.md) - Auth security issues
- OWASP: A01:2021 - Broken Access Control
- OWASP: A09:2021 - Logging and Monitoring Failures
- CWE-209: Generation of Error Message Containing Sensitive Information
- CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')

---

## Success Metrics

Track these metrics to ensure prevention strategies are working:

1. **Security scanning:** 0 instances of raw error messages in production logs
2. **Test coverage:** 100% of error responses tested for message safety
3. **Code consistency:** 0 remaining error extraction patterns (all using utilities)
4. **Deployment safety:** All API endpoints catalogued with auth requirements
5. **Incident tracking:** 0 security incidents from error disclosure

---

## Implementation Checklist

- [x] Create `safeApiError()` utility in shared
- [x] Update all API routes to use `safeApiError()`
- [x] Add development guards to test endpoints
- [x] Complete error pattern migration
- [ ] Add ESLint rules for error message safety
- [ ] Add test suite for error response validation
- [ ] Add CI/CD checks for error patterns
- [ ] Document in team handbook
- [ ] Add to code review checklist
- [ ] Train team on patterns

---

**Last Updated:** 2025-12-26
**Owner:** Security & Architecture Review
**Status:** Active Prevention Strategy
