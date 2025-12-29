# Security Hardening Prevention Strategies

**Type**: Security Prevention Framework
**Based On**: Post-remediation analysis of Phase 0-1 security hardening
**Date**: 2025-12-29

---

## Executive Summary

This document defines prevention strategies to ensure the security hardening work (CSRF protection, HTTPOnly cookies, timing-safe auth, webhook verification, demo mode gating, and required secrets) remains effective and isn't accidentally compromised by future changes.

The prevention is organized into four sections:

1. **Prevention Checklist** - What to verify in every security review
2. **Environment Variable Requirements** - Mandatory configuration for deployment
3. **Testing Recommendations** - How to verify protections work correctly
4. **Common Mistakes to Avoid** - Patterns that reintroduce vulnerabilities

---

## 1. Prevention Checklist

Use this checklist **before every code review, release, and security audit**.

### A. Authentication & Authorization

#### A.1 Token Storage
- [ ] **HTTPOnly cookies** - Auth tokens in `auth_token` cookie, NOT in localStorage
- [ ] **Cookie attributes correct**:
  - `httpOnly: true` (JavaScript cannot read)
  - `secure: true` in production (HTTPS only)
  - `sameSite: 'strict'` (CSRF protection)
  - `maxAge: 8 * 60 * 60 * 1000` (8 hours, matches token expiry)
  - `path: '/'` (available to entire app)
- [ ] **localStorage clean** - No `token`, `demo_token`, or auth keys stored
- [ ] **Response bodies** - Login responses return `{ user }` only, never `{ token, user }`
- [ ] **Logout endpoint** - Clears both `auth_token` and `csrf_token` cookies server-side

**File locations:**
- Login/token setting: `server/src/routes/auth.routes.ts`
- Auth middleware: `server/src/middleware/auth.ts:36-50`
- AuthContext removal of localStorage: `client/src/context/AuthContext.tsx`

---

#### A.2 STRICT_AUTH Enforcement
- [ ] **Default is enabled** - `const strictAuth = process.env.STRICT_AUTH !== 'false'` (lines 56, 253, 325)
- [ ] **Warning logged when disabled** - "STRICT_AUTH disabled - development only"
- [ ] **Requires restaurant_id in JWT** - All authenticated requests must include it
- [ ] **Public endpoints use explicit lookup** - Never fall back to X-Restaurant-ID header for auth checks
- [ ] **No kiosk_demo role** - Replaced with proper authentication
- [ ] **No fallback to defaultId in strict mode** - Only falls back when explicitly disabled

**File locations:**
- Auth middleware: `server/src/middleware/auth.ts:56, 97-104, 252-260, 324-330`
- WebSocket auth: `server/src/middleware/auth.ts:252-260, 324-330`

---

#### A.3 JWT Token Validation
- [ ] **Single configured secret only** - No fallbacks like `KIOSK_JWT_SECRET`
- [ ] **Restaurant_id format validated** - Must match UUID regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- [ ] **Token expiration checked** - Catch `jwt.TokenExpiredError` separately
- [ ] **Invalid tokens rejected** - Catch `jwt.JsonWebTokenError` and reject
- [ ] **No test tokens** - Production does not support `test:*` tokens (removed for security)
- [ ] **Supabase session** - Primary auth method, fallback only to Authorization header

**File locations:**
- Auth middleware: `server/src/middleware/auth.ts:66-84, 106-114`
- UUID validation: `server/src/middleware/auth.ts:9-11, 107-114`

---

#### A.4 Demo Mode (Must Be Explicit)
- [ ] **DEMO_MODE=enabled required** - Must be explicitly set in environment, not inferred
- [ ] **Demo users identified by prefix** - Check `req.user.id.startsWith('demo:')`
- [ ] **Demo users scoped to JWT restaurant_id** - Cannot access other restaurants
- [ ] **All demo access logged** - `accessLogger.info('Demo access granted', ...)`
- [ ] **Rejection when disabled** - Throw `Forbidden('Demo mode not enabled', 'DEMO_MODE_DISABLED')`
- [ ] **No demo bypass in production** - Production must have DEMO_MODE unset or !== 'enabled'

**File locations:**
- Demo bypass: `server/src/middleware/restaurantAccess.ts:43-74`
- Check at lines 46-47: `const isDemoUser = req.user.id.startsWith('demo:')` and `const isDemoModeEnabled = process.env['DEMO_MODE'] === 'enabled'`

---

### B. CSRF Protection

#### B.1 Token Generation & Validation
- [ ] **CSRF token is 64-char hex** - Generated with `crypto.randomBytes(32).toString('hex')`
- [ ] **Token in non-HTTPOnly cookie** - `httpOnly: false` (JavaScript MUST read it)
- [ ] **Token sent in X-CSRF-Token header** - Client reads from cookie, sends in header
- [ ] **Timing-safe comparison** - Using `crypto.timingSafeEqual()` for constant-time match
- [ ] **Same length checked first** - Prevent early return: `if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(...))`
- [ ] **Safe methods exempt** - GET, HEAD, OPTIONS skip CSRF check
- [ ] **State-changing methods protected** - POST, PUT, DELETE, PATCH require CSRF token

**File locations:**
- CSRF generation/validation: `server/src/middleware/csrf.ts`
- Cookie setup: Lines 21-31 (`setCsrfCookie`)
- Validation: Lines 49-90 (`csrfProtection`)
- Timing-safe compare: Lines 74-75

---

#### B.2 Client-Side CSRF Implementation
- [ ] **Token extracted from cookie** - Client-side: `document.cookie.match(/csrf_token=([^;]+)/)`
- [ ] **Token added to all non-GET requests** - httpClient middleware adds header
- [ ] **Header name correct** - `X-CSRF-Token` (case-insensitive in Express)
- [ ] **Credentials included in fetch** - `credentials: 'include'` in all requests
- [ ] **CORS allows credentials** - `origin: process.env.CLIENT_URL || 'http://localhost:5173'` and `credentials: true`

**File locations:**
- httpClient: `client/src/services/http/httpClient.ts`

---

### C. Timing-Safe Authentication

#### C.1 PIN Verification
- [ ] **Dummy hash comparison** - When user not found, still call `bcrypt.compareSync(pin, DUMMY_HASH)`
- [ ] **Dummy hash is pre-computed** - At module load: `const DUMMY_PIN_HASH = bcrypt.hashSync(...)`
- [ ] **Generic error messages** - Return `'Invalid PIN'` for all failures (not found, locked, wrong PIN)
- [ ] **No early returns on user not found** - Loop through all users, use dummy comparison
- [ ] **bcrypt rounds correct** - Using 10 rounds: `bcrypt.genSaltSync(10)` and `bcrypt.hashSync(..., 10)`
- [ ] **Salt stored with hash** - Both stored in database, both used in verification

**File locations:**
- PIN validation: `server/src/services/auth/pinAuth.ts`
- Dummy hash: Line 30
- Dummy comparison: Line 203
- Timing-safe verify: Lines 227, 336

---

#### C.2 PIN Attempt Counter (Brute Force Protection)
- [ ] **5 failures = 15 minute lockout** - MAX_PIN_ATTEMPTS = 5, LOCKOUT_DURATION_MINUTES = 15
- [ ] **Atomic update** - Single database UPDATE to increment and check lockout
- [ ] **Checks before attempt** - Verify `locked_until > NOW()` before validating
- [ ] **Resets on success** - Successful login: `attempts: 0, locked_until: null`
- [ ] **Increments on failure** - Failed attempt: `attempts: newAttempts` and sets `locked_until` if >= 5
- [ ] **Lockout timestamp persisted** - `locked_until` stored as ISO string: `lockUntil.toISOString()`
- [ ] **Generic error while locked** - Still return `'Invalid PIN'` with no indication of lockout

**File locations:**
- PIN attempt counter: `server/src/services/auth/pinAuth.ts:290-327`
- Lockout check: Lines 214-224
- Lockout set: Lines 297-301

---

### D. Webhook Security

#### D.1 Signature Verification
- [ ] **HMAC-SHA256 used** - `crypto.createHmac('sha256', secret)`
- [ ] **Timing-safe comparison** - `crypto.timingSafeEqual()` for signature comparison
- [ ] **Buffer length checked first** - Prevent early return on length mismatch
- [ ] **WEBHOOK_SECRET required** - No fallback secrets, must be configured
- [ ] **Payload reconstruction correct** - Uses `req.rawBody` if available, proper fallback for other types
- [ ] **Signature header checked** - `x-webhook-signature` required, returns 401 if missing

**File locations:**
- Webhook signature: `server/src/middleware/webhookSignature.ts:13-31`
- Middleware: Lines 37-100

---

#### D.2 Timestamp Verification (Replay Attack Protection)
- [ ] **Timestamp in webhook** - Event includes `created_at` or equivalent timestamp
- [ ] **Server-side time check** - Reject webhooks older than 5 minutes
- [ ] **Timestamp format validated** - ISO 8601 format: `YYYY-MM-DDTHH:MM:SS.sssZ`
- [ ] **Time skew tolerance** - Allow 5-10 minute window for clock drift
- [ ] **Rejection logged** - Log event ID and timestamp of rejected webhook
- [ ] **Both signature AND timestamp checked** - Defense in depth, not either/or

**File locations:**
- Timestamp verification: `server/src/middleware/webhookSignature.ts:136-185` (exists, check if wired)

---

#### D.3 Idempotency for Critical Operations
- [ ] **Payment refunds include idempotency key** - `generateIdempotencyKey('refund', restaurantId, paymentId)`
- [ ] **Key format** - Format: `{operation}-{restaurantId}-{resourceId}-{timestamp}`
- [ ] **Stripe API called with key** - `stripe.refunds.create({...}, { idempotencyKey })`
- [ ] **Duplicate requests return same result** - Stripe deduplication
- [ ] **Idempotency logged** - Log request ID and whether it was a duplicate

**File locations:**
- Payment refunds: `server/src/routes/payments.routes.ts` (check if implemented)

---

### E. Secrets Management

#### E.1 Required Secrets (No Fallbacks)
- [ ] **STATION_TOKEN_SECRET required** - Must be set in production, no fallback
- [ ] **DEVICE_FINGERPRINT_SALT required** - Must be set in production, no fallback
- [ ] **PIN_PEPPER required in production** - Throws error if not set: `if (!PIN_PEPPER_RAW && NODE_ENV === 'production')`
- [ ] **KIOSK_JWT_SECRET required** - No fallback to other secrets
- [ ] **WEBHOOK_SECRET required** - Webhook auth returns 500 if not configured
- [ ] **SUPABASE_JWT_SECRET required** - Critical for token verification, fails loudly

**File locations:**
- Environment validation: `server/src/config/environment.ts:56-65`
- PIN pepper: `server/src/services/auth/pinAuth.ts:17-22`
- Webhook secret: `server/src/middleware/webhookSignature.ts:44-62`

---

#### E.2 Secret Validation on Startup
- [ ] **validateEnvironment() called at server startup** - Before any routes registered
- [ ] **Missing secrets cause crash** - Server does not start without required env vars
- [ ] **Error messages are helpful** - Include where to find the secret (e.g., Supabase Dashboard)
- [ ] **Development vs production** - Some secrets only required in production
- [ ] **No default values** - Configuration like `process.env.SECRET || 'default'` is forbidden

**File locations:**
- Environment validation: `server/src/config/environment.ts`
- Called in: `server/src/index.ts` at startup

---

### F. Multi-Tenancy & Restaurant Access

#### F.1 Restaurant ID Validation
- [ ] **Always from JWT, never from headers** - Authenticated users: JWT restaurant_id only
- [ ] **UUID format validated** - Regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- [ ] **Every query includes restaurant_id filter** - No exceptions, enforced at all layers
- [ ] **RLS policies active** - Database policies prevent raw queries without filter
- [ ] **No header-based restaurant override** - Public endpoints only accept header for unauthenticated requests
- [ ] **Cross-tenant attempts logged** - Audit trail for security monitoring

**File locations:**
- Auth middleware restaurant_id: `server/src/middleware/auth.ts:106-114, 127-130`
- Access validation: `server/src/middleware/restaurantAccess.ts:17-132`
- UUID regex: `server/src/middleware/auth.ts:9-11`

---

#### F.2 Restaurant Access Control
- [ ] **Admin users bypass DB check** - But still validate restaurant_id format
- [ ] **Non-admin users checked against user_restaurants table** - One query per request
- [ ] **Database query has timeout** - 5 seconds max, prevents login hangs
- [ ] **Timeout error is clear** - "Database query timeout - user_restaurants lookup exceeded 5s"
- [ ] **Cross-tenant attempts detected** - JWT restaurant_id != request restaurant_id triggers audit log
- [ ] **Access denied is generic** - No information about why (user missing, no role, etc.)

**File locations:**
- Restaurant access: `server/src/middleware/restaurantAccess.ts:77-115`
- Timeout: Lines 85-92

---

### G. Logging & Audit Trail

#### G.1 Security Events Logged
- [ ] **Authentication failures** - User not found, token invalid, token expired, etc.
- [ ] **Demo access attempts** - Successful and denied
- [ ] **Restaurant access denials** - User doesn't have access
- [ ] **CSRF token mismatches** - Path, method, token status
- [ ] **PIN attempt failures** - Failed validation, lockout triggered
- [ ] **PIN successful validation** - For audit trail
- [ ] **Demo mode disabled attempts** - When DEMO_MODE is not enabled
- [ ] **Cross-tenant access attempts** - JWT restaurant != request restaurant

**File locations:**
- Auth logging: `server/src/middleware/auth.ts:98-104, 132-141`
- Restaurant access: `server/src/middleware/restaurantAccess.ts:51-64, 95-112`
- PIN logging: `server/src/services/auth/pinAuth.ts:273-279, 302-308`
- CSRF logging: `server/src/middleware/csrf.ts:59-87`

---

#### G.2 Audit Service Integration
- [ ] **AuditService.logAuthSuccess()** - Called on successful authentication
- [ ] **AuditService.logCrossTenantAttempt()** - Called on suspicious access
- [ ] **Fire-and-forget pattern** - `.catch(() => {})` to not block request
- [ ] **User IP logged** - `req.ip`
- [ ] **User agent logged** - `req.get('user-agent')`

**File locations:**
- Audit calls: `server/src/middleware/auth.ts:134-140`
- Restaurant access: `server/src/middleware/restaurantAccess.ts:105-111`

---

## 2. Environment Variable Requirements

### Production Deployment Mandatory Variables

These variables **MUST be set** in production. Server will not start without them.

| Variable | Purpose | Format | Example | Fallback |
|----------|---------|--------|---------|----------|
| `KIOSK_JWT_SECRET` | Sign/verify JWT tokens for kiosk stations | Base64 or random string | `eyJhbGc...` | None - crash if missing |
| `STATION_TOKEN_SECRET` | Token secret for station authentication | Random string, 32+ chars | `abc123def456...` | None - crash if missing |
| `PIN_PEPPER` | Pepper for PIN hashing | Random string, 32+ chars | `xyz789abc...` | Dev default only |
| `DEVICE_FINGERPRINT_SALT` | Salt for device fingerprinting | Random string, 32+ chars | `salt123456...` | None - crash if missing |
| `WEBHOOK_SECRET` | Verify webhook signatures | Random string, 32+ chars | `wh_secret...` | None - 500 error if missing |
| `SUPABASE_JWT_SECRET` | Verify JWT tokens from Supabase | Base64, ~88 chars | `eyJhbGc...` | None - crash if missing |

---

### Security Configuration Variables

These control security behavior and have safe defaults, but should be reviewed.

| Variable | Purpose | Default | Production Value | Dev Value |
|----------|---------|---------|-------------------|-----------|
| `STRICT_AUTH` | Require restaurant_id in all JWTs | `true` (enabled) | `true` (default) | Can be `false` |
| `DEMO_MODE` | Allow demo users (prefix `demo:`) | Unset (disabled) | Must be unset | Can be `enabled` |
| `NODE_ENV` | Environment type | Not set | `production` | `development` |

---

### HTTPS/Security Headers

| Variable | Purpose | Production Value | Dev Value |
|----------|---------|-------------------|-----------|
| `NODE_ENV` | Controls secure cookie flag | `production` | `development` |
| `CORS_ORIGIN` | Allowed frontend origin | Exact frontend URL | `http://localhost:5173` |

---

### Deployment Checklist Template

Use this before every production deployment:

```bash
# Required secrets - these MUST be set
[ ] KIOSK_JWT_SECRET is set and is 32+ chars
[ ] STATION_TOKEN_SECRET is set and is 32+ chars
[ ] PIN_PEPPER is set and is 32+ chars
[ ] DEVICE_FINGERPRINT_SALT is set and is 32+ chars
[ ] WEBHOOK_SECRET is set and is 32+ chars
[ ] SUPABASE_JWT_SECRET is set and is ~88 chars

# Security settings - verify defaults
[ ] STRICT_AUTH is not explicitly set to 'false' (defaults to true)
[ ] DEMO_MODE is NOT set to 'enabled' (defaults to disabled)
[ ] NODE_ENV is set to 'production'
[ ] CORS_ORIGIN is set to actual frontend URL, not wildcard

# Cookie security - verify production config
[ ] secure: true for HTTPS-only (set when NODE_ENV === 'production')
[ ] httpOnly: true for auth token (JavaScript cannot read)
[ ] sameSite: 'strict' for CSRF protection
[ ] HTTPS certificate is valid and not expired
```

---

## 3. Testing Recommendations

### Unit Tests

#### 3.1 CSRF Protection
```typescript
describe('CSRF Protection', () => {
  it('should reject POST without CSRF token', async () => {
    // Don't set X-CSRF-Token header
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', 'auth_token=valid_token')
      .expect(403);

    expect(res.body.error).toEqual('CSRF token required');
  });

  it('should reject POST with mismatched CSRF tokens', async () => {
    // Cookie has one token, header has another
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', 'auth_token=valid_token; csrf_token=token1')
      .set('X-CSRF-Token', 'token2')
      .expect(403);

    expect(res.body.error).toEqual('CSRF token invalid');
  });

  it('should allow POST with matching CSRF tokens', async () => {
    const csrfToken = 'abc123def456';
    const res = await request(app)
      .post('/api/orders')
      .set('Cookie', `auth_token=valid_token; csrf_token=${csrfToken}`)
      .set('X-CSRF-Token', csrfToken)
      .expect(200);
  });

  it('should skip CSRF check for GET requests', async () => {
    // No CSRF token required
    const res = await request(app)
      .get('/api/orders')
      .set('Cookie', 'auth_token=valid_token')
      .expect(200);
  });
});
```

#### 3.2 Timing-Safe PIN Verification
```typescript
describe('PIN Timing Safety', () => {
  it('should take same time whether user exists or not', async () => {
    const pin = '1234';
    const restaurantId = '11111111-1111-1111-1111-111111111111';

    // Time when user exists
    const start1 = Date.now();
    await validatePin(pin, restaurantId); // User exists, wrong PIN
    const time1 = Date.now() - start1;

    // Time when user doesn't exist
    const start2 = Date.now();
    await validatePin(pin, 'nonexistent-restaurant'); // No users
    const time2 = Date.now() - start2;

    // Both should be similar (within 100ms due to bcrypt)
    // If time2 is much faster, timing attack is possible
    expect(Math.abs(time1 - time2)).toBeLessThan(100);
  });

  it('should return generic error whether user missing or PIN wrong', async () => {
    const result1 = await validatePin('9999', restaurantId); // User exists, wrong PIN
    const result2 = await validatePin('9999', 'nonexistent-restaurant'); // No user

    expect(result1.error).toBe('Invalid PIN');
    expect(result2.error).toBe('Invalid PIN');
    // Both identical - prevents user enumeration
  });
});
```

#### 3.3 Demo Mode Gating
```typescript
describe('Demo Mode Gating', () => {
  beforeEach(() => {
    delete process.env.DEMO_MODE;
  });

  it('should reject demo users when DEMO_MODE not enabled', async () => {
    const token = generateDemoToken('demo:user1', restaurantId);
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.code).toBe('DEMO_MODE_DISABLED');
  });

  it('should allow demo users when DEMO_MODE=enabled', async () => {
    process.env.DEMO_MODE = 'enabled';

    const token = generateDemoToken('demo:user1', restaurantId);
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should prevent demo users from accessing other restaurants', async () => {
    process.env.DEMO_MODE = 'enabled';

    const token = generateDemoToken('demo:user1', restaurantId1);
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      // Request for different restaurant
      .query({ restaurant_id: restaurantId2 })
      .expect(403);

    expect(res.body.code).toBe('DEMO_CROSS_TENANT');
  });
});
```

#### 3.4 PIN Attempt Counter
```typescript
describe('PIN Attempt Counter', () => {
  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await validatePin('9999', restaurantId); // Wrong PIN
    }

    // 6th attempt should still be rejected
    const result = await validatePin('1234', restaurantId); // Even correct PIN
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid PIN'); // Generic error
  });

  it('should reset counter on successful login', async () => {
    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      await validatePin('9999', restaurantId);
    }

    // Succeed
    const result = await validatePin('1234', restaurantId);
    expect(result.isValid).toBe(true);

    // Should be able to fail 5 more times
    for (let i = 0; i < 5; i++) {
      await validatePin('9999', restaurantId);
    }
    // 6th attempt should fail (lockout, not increment)
  });

  it('should unlock after 15 minutes', async () => {
    // Lock account
    for (let i = 0; i < 5; i++) {
      await validatePin('9999', restaurantId);
    }

    // Immediately: still locked
    let result = await validatePin('1234', restaurantId);
    expect(result.isValid).toBe(false);

    // Mock time forward 16 minutes
    jest.useFakeTimers();
    jest.advanceTimersByTime(16 * 60 * 1000);

    // Now should work
    result = await validatePin('1234', restaurantId);
    expect(result.isValid).toBe(true);

    jest.useRealTimers();
  });
});
```

#### 3.5 HTTPOnly Cookie Auth
```typescript
describe('HTTPOnly Cookie Authentication', () => {
  it('should set auth_token as HTTPOnly cookie on login', async () => {
    const res = await request(app)
      .post('/api/auth/pin-login')
      .send({ pin: '1234', restaurant_id: restaurantId })
      .expect(200);

    expect(res.headers['set-cookie']).toContainEqual(
      expect.stringContaining('auth_token=')
    );

    // Check httpOnly flag is set
    const cookie = res.headers['set-cookie'].find(c => c.includes('auth_token'));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Strict');
  });

  it('should not return token in response body', async () => {
    const res = await request(app)
      .post('/api/auth/pin-login')
      .send({ pin: '1234', restaurant_id: restaurantId })
      .expect(200);

    expect(res.body).not.toHaveProperty('token');
    expect(res.body).not.toHaveProperty('auth_token');
  });

  it('should clear cookies on logout', async () => {
    // First login
    let res = await request(app)
      .post('/api/auth/pin-login')
      .send({ pin: '1234', restaurant_id: restaurantId })
      .expect(200);

    const authCookie = res.headers['set-cookie'].find(c => c.includes('auth_token'));

    // Then logout
    res = await request(app)
      .post('/api/auth/logout')
      .expect(200);

    // Check that cookie is cleared (max-age=0)
    const clearedCookie = res.headers['set-cookie'].find(c => c.includes('auth_token'));
    expect(clearedCookie).toContain('Max-Age=0');
  });
});
```

#### 3.6 STRICT_AUTH Enforcement
```typescript
describe('STRICT_AUTH', () => {
  beforeEach(() => {
    process.env.STRICT_AUTH = 'true'; // Default
  });

  it('should reject tokens without restaurant_id when enabled', async () => {
    const token = generateToken({ sub: 'user1' }); // No restaurant_id

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);

    expect(res.body.error).toContain('restaurant');
  });

  it('should accept tokens with restaurant_id', async () => {
    const token = generateToken({
      sub: 'user1',
      restaurant_id: '11111111-1111-1111-1111-111111111111'
    });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('should allow missing restaurant_id when disabled', async () => {
    process.env.STRICT_AUTH = 'false';

    const token = generateToken({ sub: 'user1' }); // No restaurant_id

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
```

---

### Integration Tests

#### 3.7 Webhook Timestamp Verification
```typescript
describe('Webhook Timestamp Verification', () => {
  it('should reject webhooks older than 5 minutes', async () => {
    const payload = {
      id: 'evt_123',
      created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(), // 6 min old
      type: 'payment_success'
    };

    const signature = generateWebhookSignature(JSON.stringify(payload));

    const res = await request(app)
      .post('/api/webhook/stripe')
      .set('X-Webhook-Signature', signature)
      .send(payload)
      .expect(401);

    expect(res.body.error).toContain('timestamp');
  });

  it('should accept webhooks within 5 minute window', async () => {
    const payload = {
      id: 'evt_123',
      created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min old
      type: 'payment_success'
    };

    const signature = generateWebhookSignature(JSON.stringify(payload));

    const res = await request(app)
      .post('/api/webhook/stripe')
      .set('X-Webhook-Signature', signature)
      .send(payload)
      .expect(200);
  });
});
```

---

### End-to-End Tests

#### 3.8 Full Authentication Flow
```typescript
describe('Full Auth Flow E2E', () => {
  it('should authenticate user and maintain session via cookies', async () => {
    // 1. Login gets HTTPOnly cookie
    let res = await request(app)
      .post('/api/auth/pin-login')
      .send({ pin: '1234', restaurant_id: restaurantId })
      .expect(200);

    // Extract auth_token cookie
    const authCookie = res.headers['set-cookie']
      .find(c => c.includes('auth_token'));
    const csrfToken = res.body.csrfToken;

    // 2. Subsequent request uses cookie automatically
    res = await request(app)
      .get('/api/orders')
      .set('Cookie', authCookie)
      .expect(200); // Works without Authorization header

    // 3. POST request needs CSRF token
    res = await request(app)
      .post('/api/orders')
      .set('Cookie', authCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ ...orderData })
      .expect(201);

    // 4. Logout clears cookies
    res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', authCookie)
      .expect(200);

    // 5. Cleared auth_token prevents access
    res = await request(app)
      .get('/api/orders')
      .expect(401); // No cookie set
  });
});
```

---

### Security-Specific Test Files

Create these test files to ensure security features stay tested:

```
server/src/__tests__/
├── security/
│   ├── csrf-protection.test.ts
│   ├── timing-safe-auth.test.ts
│   ├── demo-mode-gating.test.ts
│   ├── pin-attempt-counter.test.ts
│   ├── httponly-cookies.test.ts
│   ├── strict-auth.test.ts
│   ├── webhook-verification.test.ts
│   └── secret-validation.test.ts
```

---

## 4. Common Mistakes to Avoid

### A. Authentication & Authorization Mistakes

#### ❌ Mistake: Storing Token in localStorage
```typescript
// WRONG - XSS can steal token
const login = async (credentials) => {
  const { token, user } = await api.login(credentials);
  localStorage.setItem('token', token); // ❌ VULNERABLE
  localStorage.setItem('auth_token', token); // ❌ VULNERABLE
  const authHeader = `Bearer ${localStorage.getItem('token')}`;
};
```

**✅ Correct:**
```typescript
// Server sets HTTPOnly cookie, client doesn't touch it
const login = async (credentials) => {
  const { user } = await api.login(credentials);
  // Cookie set by server automatically, JavaScript can't read it
  // CSRF token is readable (in non-HTTPOnly cookie)
};
```

---

#### ❌ Mistake: Returning Token in Response
```typescript
// WRONG - Even with HTTPOnly cookie, response shouldn't contain token
router.post('/login', (req, res) => {
  const token = generateToken(user);
  res.cookie('auth_token', token, { httpOnly: true });
  res.json({ token, user }); // ❌ Token in response is redundant
});
```

**✅ Correct:**
```typescript
router.post('/login', (req, res) => {
  const token = generateToken(user);
  res.cookie('auth_token', token, { httpOnly: true });
  res.json({ user }); // ✅ Only user data
});
```

---

#### ❌ Mistake: Not Validating Restaurant ID in JWT
```typescript
// WRONG - Accepts restaurant_id from anywhere
const authenticate = (req, res, next) => {
  const token = verifyJWT(req.headers.authorization);
  req.restaurantId = req.headers['x-restaurant-id']; // ❌ VULNERABLE
  next();
};
```

**✅ Correct:**
```typescript
const authenticate = (req, res, next) => {
  const token = verifyJWT(req.headers.authorization);
  // Use restaurant_id from JWT only - never from headers
  req.restaurantId = token.restaurant_id;
  // Validate format
  if (!UUID_REGEX.test(req.restaurantId)) {
    throw Unauthorized('Invalid restaurant context');
  }
  next();
};
```

---

#### ❌ Mistake: Allowing Demo Bypass Without Environment Check
```typescript
// WRONG - Demo users always bypass checks
const validateAccess = (req, res, next) => {
  if (req.user.id.startsWith('demo:')) {
    return next(); // ❌ Always allowed - security vulnerability
  }
  // ... real checks
};
```

**✅ Correct:**
```typescript
const validateAccess = (req, res, next) => {
  if (req.user.id.startsWith('demo:')) {
    if (process.env.DEMO_MODE !== 'enabled') {
      throw Forbidden('Demo mode not enabled');
    }
    logger.info('Demo access granted', { userId: req.user.id });
  }
  // ... real checks
};
```

---

#### ❌ Mistake: Fallback Secrets in Production
```typescript
// WRONG - Fallback weakens security
const STATION_SECRET = process.env.STATION_TOKEN_SECRET ||
                       process.env.KIOSK_JWT_SECRET ||
                       'station-secret-change-me'; // ❌ CRITICAL VULNERABILITY
```

**✅ Correct:**
```typescript
const STATION_SECRET = process.env.STATION_TOKEN_SECRET;
if (!STATION_SECRET) {
  throw new Error('STATION_TOKEN_SECRET environment variable is required');
}
```

---

### B. CSRF Protection Mistakes

#### ❌ Mistake: HTTPOnly CSRF Token
```typescript
// WRONG - CSRF token should be readable by JavaScript
res.cookie('csrf_token', token, {
  httpOnly: true, // ❌ JavaScript can't read it to send in header
  sameSite: 'strict'
});
```

**✅ Correct:**
```typescript
res.cookie('csrf_token', token, {
  httpOnly: false, // ✅ JavaScript CAN read it
  sameSite: 'strict'
});
```

---

#### ❌ Mistake: Not Checking Safe Methods
```typescript
// WRONG - Applies CSRF check to GET requests
const csrfProtection = (req, res, next) => {
  // Missing: if (['GET', 'HEAD', 'OPTIONS'].includes(req.method))
  const token = req.headers['x-csrf-token'];
  if (!token) return res.status(403).json({ error: 'CSRF required' }); // ❌ Blocks GET
};
```

**✅ Correct:**
```typescript
const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next(); // ✅ Skip CSRF for safe methods
  }
  const token = req.headers['x-csrf-token'];
  if (!token) return res.status(403).json({ error: 'CSRF required' });
};
```

---

#### ❌ Mistake: Not Using Timing-Safe Comparison
```typescript
// WRONG - Simple string comparison is vulnerable to timing attacks
const validateCsrf = (cookieToken, headerToken) => {
  if (cookieToken !== headerToken) { // ❌ Timing attack possible
    return false;
  }
  return true;
};
```

**✅ Correct:**
```typescript
const validateCsrf = (cookieToken, headerToken) => {
  try {
    const cookieBuffer = Buffer.from(cookieToken, 'utf8');
    const headerBuffer = Buffer.from(headerToken, 'utf8');

    // Check length first to prevent early return
    if (cookieBuffer.length !== headerBuffer.length) {
      return false;
    }

    // Constant-time comparison
    return crypto.timingSafeEqual(cookieBuffer, headerBuffer);
  } catch {
    return false;
  }
};
```

---

### C. Timing-Safe Authentication Mistakes

#### ❌ Mistake: Early Return on User Not Found
```typescript
// WRONG - Timing attack reveals whether user exists
const verifyPin = (pin, restaurantId) => {
  const user = findUser(restaurantId);

  if (!user) {
    return { success: false }; // ❌ FAST - user doesn't exist
  }

  const isValid = bcrypt.compareSync(pin, user.pin_hash); // ~100ms

  if (!isValid) {
    return { success: false }; // ❌ SLOWER - user exists but wrong PIN
  }

  return { success: true };
};

// Attacker timing: Fast response = no user, Slow response = user exists
```

**✅ Correct:**
```typescript
const DUMMY_HASH = bcrypt.hashSync('dummy', 10); // Pre-computed

const verifyPin = (pin, restaurantId) => {
  const users = findAllUsers(restaurantId);

  if (!users.length) {
    // STILL run bcrypt to consume same time
    bcrypt.compareSync(pin, DUMMY_HASH); // ~100ms
    return { success: false, error: 'Invalid PIN' }; // ✅ Generic error
  }

  // Try all users, report generic error
  for (const user of users) {
    const isValid = bcrypt.compareSync(pin, user.pin_hash);
    if (isValid) {
      return { success: true, user };
    }
  }

  return { success: false, error: 'Invalid PIN' }; // ✅ Generic error
};

// Attacker timing: ALL failures take same time (~100ms)
```

---

#### ❌ Mistake: Different Error Messages for Different Failures
```typescript
// WRONG - Timing attack can identify user existence
const validatePin = async (pin, restaurantId) => {
  const user = await findUser(restaurantId);

  if (!user) {
    return { error: 'User not found' }; // ❌ Reveals no user exists
  }

  if (user.locked_until > now) {
    return { error: 'Account locked' }; // ❌ Reveals user exists
  }

  if (!bcrypt.compareSync(pin, user.pin_hash)) {
    return { error: 'Invalid PIN' }; // ❌ Reveals user exists
  }

  return { success: true };
};

// Attacker can enumerate users by error message timing
```

**✅ Correct:**
```typescript
const validatePin = async (pin, restaurantId) => {
  const user = await findUser(restaurantId);
  const hashToCompare = user?.pin_hash || DUMMY_HASH;

  // Timing-safe comparison (always ~100ms)
  const isValid = bcrypt.compareSync(pin, hashToCompare);

  // Generic error regardless of reason
  if (!user || !isValid || (user.locked_until > now)) {
    return { error: 'Invalid PIN' }; // ✅ Generic for ALL failures
  }

  return { success: true };
};

// Attacker timing: ALL failures take same time
```

---

### D. PIN Attempt Counter Mistakes

#### ❌ Mistake: Not Locking After Failed Attempts
```typescript
// WRONG - No brute force protection
const validatePin = (pin, restaurantId) => {
  const user = findUser(restaurantId);

  if (!bcrypt.compareSync(pin, user.pin_hash)) {
    // Missing: don't increment attempts or lock
    return { success: false };
  }

  return { success: true };
};

// Attacker can try unlimited PINs
```

**✅ Correct:**
```typescript
const validatePin = (pin, restaurantId) => {
  const user = findUser(restaurantId);

  // Check if locked first
  if (user.locked_until && user.locked_until > now) {
    return { success: false, error: 'Invalid PIN' }; // Generic error
  }

  if (!bcrypt.compareSync(pin, user.pin_hash)) {
    // Increment attempts
    const attempts = user.attempts + 1;

    // Lock if >= 5 attempts
    if (attempts >= 5) {
      user.locked_until = now + 15 minutes;
    }

    updateUser({ attempts, locked_until: user.locked_until });
    return { success: false, error: 'Invalid PIN' };
  }

  // Reset attempts on success
  updateUser({ attempts: 0, locked_until: null });
  return { success: true };
};

// ✅ Max 5 failures, then locked for 15 minutes
```

---

### E. Webhook Security Mistakes

#### ❌ Mistake: Simple String Comparison for Signature
```typescript
// WRONG - Vulnerable to timing attacks
const verifySignature = (signature, secret, payload) => {
  const expected = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return signature === expected; // ❌ Timing attack
};
```

**✅ Correct:**
```typescript
const verifySignature = (signature, secret, payload) => {
  const expected = crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison
  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
};
```

---

#### ❌ Mistake: Not Verifying Webhook Timestamp
```typescript
// WRONG - Vulnerable to replay attacks
const handleWebhook = (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;

  if (!verifySignature(signature, WEBHOOK_SECRET, JSON.stringify(payload))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook immediately
  // ❌ Same webhook can be replayed forever
  processPayment(payload);
};
```

**✅ Correct:**
```typescript
const handleWebhook = (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.body.created_at;
  const payload = req.body;

  // 1. Verify signature
  if (!verifySignature(signature, WEBHOOK_SECRET, JSON.stringify(payload))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Verify timestamp (must be within 5 minutes)
  const webhookTime = new Date(timestamp);
  const now = new Date();
  const ageMins = (now - webhookTime) / 1000 / 60;

  if (ageMins > 5) {
    return res.status(401).json({ error: 'Webhook timestamp too old' });
  }

  // ✅ Old webhooks are rejected
  processPayment(payload);
};
```

---

### F. Multi-Tenancy Mistakes

#### ❌ Mistake: Not Filtering by Restaurant ID
```typescript
// WRONG - Returns data from all restaurants
const getOrders = async (req, res) => {
  const orders = await db.query('SELECT * FROM orders'); // ❌ NO FILTER
  res.json(orders);
};
```

**✅ Correct:**
```typescript
const getOrders = async (req, res) => {
  const { restaurantId } = req; // Set by auth middleware
  const orders = await db.query(
    'SELECT * FROM orders WHERE restaurant_id = $1',
    [restaurantId]
  ); // ✅ FILTERED
  res.json(orders);
};
```

---

#### ❌ Mistake: Trusting Client-Provided Restaurant ID
```typescript
// WRONG - Client can request any restaurant
const getOrders = async (req, res) => {
  const { restaurantId } = req.query; // ❌ From client
  const orders = await db.query(
    'SELECT * FROM orders WHERE restaurant_id = $1',
    [restaurantId]
  );
  res.json(orders);
};
```

**✅ Correct:**
```typescript
const getOrders = async (req, res) => {
  const { restaurantId } = req; // ✅ From auth middleware (JWT verified)
  // restaurantId comes from JWT token, validated by auth.ts
  const orders = await db.query(
    'SELECT * FROM orders WHERE restaurant_id = $1',
    [restaurantId]
  );
  res.json(orders);
};
```

---

### G. Configuration & Secrets Mistakes

#### ❌ Mistake: Default Secret Value
```typescript
// WRONG - Default secret in code is production vulnerability
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';

const token = jwt.sign(payload, jwtSecret); // ❌ Uses default in production
```

**✅ Correct:**
```typescript
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error(
    'JWT_SECRET environment variable is required.\n' +
    'Find it in your Supabase Dashboard: Settings > API > JWT Secret'
  );
}

const token = jwt.sign(payload, jwtSecret);
```

---

#### ❌ Mistake: STRICT_AUTH Can't Be Re-Enabled
```typescript
// WRONG - If disabled in dev, hard to remember to enable in prod
const strictAuth = false; // ❌ Forgot to enable for production
```

**✅ Correct:**
```typescript
// Defaults to ENABLED, must explicitly opt out
const strictAuth = process.env.STRICT_AUTH !== 'false';

if (!strictAuth) {
  logger.warn('STRICT_AUTH disabled - development only');
}
```

---

## Summary Checklist

Before committing code, verify:

- [ ] No tokens in localStorage
- [ ] Auth tokens in HTTPOnly cookies only
- [ ] CSRF tokens in readable cookies + X-CSRF-Token header
- [ ] STRICT_AUTH defaults to true
- [ ] DEMO_MODE must be explicitly 'enabled'
- [ ] All secrets required in production (no fallbacks)
- [ ] PIN verification uses dummy hash when user not found
- [ ] PIN attempts increment atomically
- [ ] Webhook signatures verified with timing-safe comparison
- [ ] Webhook timestamps verified (< 5 minutes old)
- [ ] All queries filter by restaurant_id from JWT
- [ ] Restaurant_id format validated against UUID regex
- [ ] Security events logged (auth failures, access denials, etc.)
- [ ] Tests exist for all security features
- [ ] CORS allows credentials: true
- [ ] Cookie sameSite is 'strict'

---

## Related Documents

- `CLAUDE.md` - Architecture decisions and patterns
- `plans/security-remediation-v2.md` - Implementation plan
- `docs/ADR-006.md` - Dual authentication pattern
- `docs/ADR-010.md` - Remote-first database
- `docs/solutions/auth-issues/` - Auth troubleshooting

---

**Last Updated**: 2025-12-29
**Maintainers**: Claude Code (Prevention Strategist)
**Review Cycle**: After each security release, minimum quarterly
