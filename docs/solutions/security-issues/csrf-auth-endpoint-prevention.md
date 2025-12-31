# CSRF/Auth Endpoint Prevention Strategies

**Last Updated:** 2025-12-31

**Problem:** CSRF middleware blocks auth endpoints because users don't have CSRF tokens before authenticating. CSRF tokens are only set AFTER successful login.

**Root Cause:** Authentication flows must be exempt from CSRF protection since the user hasn't authenticated yet to receive a CSRF token.

**Fix Applied:** Exempted these endpoints from CSRF in `server.ts` (lines 189-204):
- `/api/v1/auth/login`
- `/api/v1/auth/pin-login`
- `/api/v1/auth/station-login`
- `/api/v1/auth/refresh`

---

## 1. Prevention Checklist for Adding New Auth Endpoints

Use this checklist when adding new authentication endpoints:

### Endpoint Design
- [ ] Does the endpoint authenticate a user (create a session)?
  - [ ] If YES → Must be exempt from CSRF
  - [ ] If NO → Apply normal CSRF protection
- [ ] Does the endpoint establish initial authentication state?
  - [ ] If YES → User will not have CSRF token yet → Exempt
  - [ ] If NO → User is already authenticated → Apply CSRF
- [ ] Is this an alternative login method?
  - [ ] If YES → Add to CSRF exemption list in `server.ts`
  - [ ] If NO → Ensure CSRF protection is active

### Implementation Steps
- [ ] **Add endpoint to auth.routes.ts** with appropriate request/response handling
- [ ] **Set both cookies on success:**
  ```typescript
  setAuthCookie(res, token);      // HTTPOnly auth cookie
  setCsrfCookie(res);              // Readable CSRF token
  ```
- [ ] **Add to CSRF exemption list in server.ts** (lines 197-200):
  ```typescript
  if (req.path.startsWith('/api/v1/auth/your-new-method') || /* existing routes */) {
    return next();
  }
  ```
- [ ] **Add rate limiting** (authRateLimiters) to prevent brute force:
  ```typescript
  authRateLimiters.checkSuspicious,  // Detect suspicious patterns
  authRateLimiters.yourMethod,       // Method-specific limiter
  ```
- [ ] **Log authentication events** (auth_success/auth_fail) without PII
- [ ] **Write tests** verifying the endpoint works without CSRF token

### Documentation
- [ ] Add endpoint to this list (update Auth Methods section below)
- [ ] Document the authentication method in CLAUDE.md
- [ ] Add security rationale to ADR-006 (Dual Authentication Pattern) if it's a new pattern

---

## 2. Code Review Checklist Item

Add to your PR template or code review process:

```markdown
### CSRF & Authentication Security

- [ ] **Auth Endpoints Exempt?**
  - [ ] New auth endpoints are listed in `server.ts` CSRF exemption (lines 189-204)
  - [ ] Both auth and CSRF cookies are set on successful login
  - [ ] Rate limiting is applied to prevent brute force

- [ ] **No CSRF Leaks?**
  - [ ] Protected endpoints (non-GET) require X-CSRF-Token header
  - [ ] CSRF token is cleared on logout
  - [ ] CSRF cookie has httpOnly=false (JS can read), auth token is httpOnly=true

- [ ] **Authentication Flow?**
  - [ ] User → No CSRF token → Auth endpoint → Exempt from CSRF ✓
  - [ ] Auth success → CSRF token set → Protected endpoints → CSRF required ✓
  - [ ] No early returns that skip CSRF exemption logic

- [ ] **Logging?**
  - [ ] No credentials logged (email/password/PIN/token)
  - [ ] No token values in logs (only user_id and restaurant_id)
```

---

## 3. Test Case: Verify Auth Endpoints Don't Require CSRF

Add this test to verify CSRF exemption works:

```typescript
// server/tests/security/csrf-auth-exemption.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../test-utils/app';
import { mockSupabaseAuth, mockRateLimiters } from '../test-utils/mocks';

describe('CSRF Exemption for Auth Endpoints', () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRateLimiters();  // Disable rate limiters for testing
    app = createTestApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/login - No CSRF Required', () => {
    it('should succeed without CSRF token (users have no token yet)', async () => {
      mockSupabaseAuth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { refresh_token: 'token' }
        },
        error: null
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
          restaurantId: '11111111-1111-1111-1111-111111111111'
        });
        // NO X-CSRF-Token header sent - should still succeed

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();

      // Verify CSRF cookie was SET in response
      const setCookie = response.headers['set-cookie'] || [];
      const csrfCookie = setCookie.find((c: string) => c.includes('csrf_token'));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toMatch(/httpOnly=false|; Path=\/|secure=/);
    });
  });

  describe('POST /api/v1/auth/pin-login - No CSRF Required', () => {
    it('should succeed without CSRF token', async () => {
      // Mock PIN validation
      const response = await request(app)
        .post('/api/v1/auth/pin-login')
        .send({
          pin: '1234',
          restaurantId: '11111111-1111-1111-1111-111111111111'
        });
        // NO X-CSRF-Token header

      // Should NOT return 403 CSRF error
      expect(response.status).not.toBe(403);
      expect(response.body.error).not.toMatch(/CSRF/i);
    });
  });

  describe('POST /api/v1/auth/station-login - No CSRF Required', () => {
    it('should succeed without CSRF token (during initial auth)', async () => {
      // First authenticate with email to get auth token
      const authToken = await authenticateAsManager();

      // Station login doesn't need CSRF on the endpoint itself
      const response = await request(app)
        .post('/api/v1/auth/station-login')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stationType: 'kitchen',
          stationName: 'KDS-1',
          restaurantId: '11111111-1111-1111-1111-111111111111'
        });
        // NO X-CSRF-Token header

      expect(response.status).not.toBe(403);
      expect(response.body.error).not.toMatch(/CSRF/i);
    });
  });

  describe('POST /api/v1/auth/refresh - No CSRF Required', () => {
    it('should succeed without CSRF token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'refresh-token-value'
        });
        // NO X-CSRF-Token header

      expect(response.status).not.toBe(403);
      expect(response.body.error).not.toMatch(/CSRF/i);
    });
  });

  describe('Protected Endpoints STILL Require CSRF', () => {
    it('should block non-auth POST without CSRF token', async () => {
      const authToken = await authenticateAsManager();

      const response = await request(app)
        .post('/api/v1/orders')  // Protected endpoint
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-restaurant-id', '11111111-1111-1111-1111-111111111111')
        .send({ /* order data */ });
        // NO X-CSRF-Token header

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/CSRF.*required/i);
    });

    it('should succeed with valid CSRF token', async () => {
      const { authToken, csrfToken } = await authenticateAsManagerWithCsrf();

      const response = await request(app)
        .post('/api/v1/orders')  // Protected endpoint
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-restaurant-id', '11111111-1111-1111-1111-111111111111')
        .set('Cookie', `csrf_token=${csrfToken}`)
        .set('x-csrf-token', csrfToken)
        .send({ /* order data */ });

      expect(response.status).not.toBe(403);
    });
  });
});

// Helper functions
async function authenticateAsManager() {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'manager@test.com',
      password: 'password123',
      restaurantId: '11111111-1111-1111-1111-111111111111'
    });
  return response.body.session?.access_token;
}

async function authenticateAsManagerWithCsrf() {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'manager@test.com',
      password: 'password123',
      restaurantId: '11111111-1111-1111-1111-111111111111'
    });

  const setCookie = response.headers['set-cookie'] || [];
  const csrfCookie = setCookie.find((c: string) => c.includes('csrf_token'));
  const csrfValue = csrfCookie?.match(/csrf_token=([^;]+)/)?.[1];

  return {
    authToken: response.body.session?.access_token,
    csrfToken: csrfValue
  };
}
```

**Run the test:**
```bash
npm test -- server/tests/security/csrf-auth-exemption.test.ts
```

---

## 4. Pattern to Follow for Future Auth Endpoints

Use this template when adding a new authentication method:

### Step 1: Add Route Handler
```typescript
// server/src/routes/auth.routes.ts

router.post('/your-new-auth-method',
  authRateLimiters.checkSuspicious,
  authRateLimiters.yourMethod,  // Create specific limiter
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { /* auth data */ } = req.body;

      // Validate input
      if (!requiredField) {
        throw BadRequest('Missing required field');
      }

      // Perform authentication (verify creds, validate PIN, etc.)
      const result = await yourAuthLogic(/* ... */);

      if (!result.isValid) {
        logger.warn('auth_fail', {
          reason: 'your_reason',
          restaurant_id: restaurantId
        });
        throw Unauthorized(result.error || 'Authentication failed');
      }

      // Generate JWT token
      const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
      if (!jwtSecret) {
        logger.error('⛔ JWT_SECRET not configured');
        throw new Error('Server authentication not configured');
      }

      const payload = {
        sub: result.userId,
        email: result.userEmail,
        role: result.role,
        restaurant_id: restaurantId,
        scope: result.scopes,
        auth_method: 'your_method',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)  // 8 hours
      };

      const token = jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });

      logger.info('auth_success', {
        user_id: result.userId,
        restaurant_id: restaurantId
      });

      // Set BOTH cookies on success
      setAuthCookie(res, token);      // HTTPOnly cookie
      setCsrfCookie(res);              // Readable CSRF token

      res.json({
        user: {
          id: result.userId,
          email: result.userEmail,
          role: result.role,
          scopes: result.scopes
        },
        expiresIn: 8 * 60 * 60,
        restaurantId
      });

    } catch (error) {
      next(error);
    }
  }
);
```

### Step 2: Add to CSRF Exemption in server.ts
```typescript
// server/src/server.ts, lines 189-204

app.use((req, res, next) => {
  // Exempt Stripe webhooks from CSRF
  if (req.path === '/api/v1/payments/webhook') {
    return next();
  }
  // Exempt auth endpoints - users don't have CSRF token before authenticating
  if (req.path.startsWith('/api/v1/auth/login') ||
      req.path.startsWith('/api/v1/auth/pin-login') ||
      req.path.startsWith('/api/v1/auth/station-login') ||
      req.path.startsWith('/api/v1/auth/refresh') ||
      req.path.startsWith('/api/v1/auth/your-new-auth-method')) {  // ← ADD HERE
    return next();
  }
  return csrfProtection(req, res, next);
});
```

### Step 3: Add Rate Limiter
```typescript
// server/src/middleware/authRateLimiter.ts

// Add to authRateLimiters export
yourMethod: createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // 5 attempts per window
  message: 'Too many auth attempts, please try again later',
  keyGenerator: (req) => {
    return `auth:yourmethod:${req.ip}:${req.body.restaurantId || 'unknown'}`;
  }
})
```

### Step 4: Document Security Decision
Add to ADR-006 (Dual Authentication Pattern):
```markdown
## Your New Auth Method

- **Use Case:** [Brief description]
- **Token Placement:** HTTPOnly cookie (auth) + CSRF cookie (protected endpoints)
- **CSRF Exemption:** `/api/v1/auth/your-new-auth-method` (no token on initial auth)
- **Rate Limiting:** 5 attempts per 15 minutes per IP + restaurant
- **Example Flow:**
  1. Client sends auth credentials → No CSRF token needed
  2. Server validates credentials
  3. Server sets auth cookie (HTTPOnly) + CSRF cookie (readable)
  4. Client uses CSRF token for subsequent protected requests
```

---

## 5. Auth Methods Currently Exempt from CSRF

| Endpoint | Purpose | Why Exempt | Sets CSRF |
| -------- | ------- | ---------- | --------- |
| `/api/v1/auth/login` | Email/password login | User has no token yet | Yes ✓ |
| `/api/v1/auth/pin-login` | PIN login for staff | User has no token yet | Yes ✓ |
| `/api/v1/auth/station-login` | Station authentication | Initial station auth | Yes ✓ |
| `/api/v1/auth/refresh` | Token refresh | Token already expired | No (token already set) |

**All other endpoints** (protected routes, state changes) **require CSRF**.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting to Set CSRF on Login
```typescript
// BAD: Only sets auth cookie
setAuthCookie(res, token);
res.json({ user });

// GOOD: Sets both cookies
setAuthCookie(res, token);      // HTTPOnly auth token
setCsrfCookie(res);              // Readable CSRF token
res.json({ user });
```

### ❌ Mistake 2: Not Exempting New Auth Methods
```typescript
// BAD: New endpoint gets CSRF protection automatically
router.post('/oauth-callback', ...);  // Will fail - users have no CSRF yet!

// GOOD: Add to exemption list in server.ts
if (req.path.startsWith('/api/v1/auth/oauth-callback')) {
  return next();  // Skip CSRF
}
```

### ❌ Mistake 3: Mixing HTTPOnly and Readable Cookies
```typescript
// BAD: Auth token is readable by JS (security risk)
res.cookie('auth_token', token, { httpOnly: false });

// GOOD: Keep roles separated
res.cookie('auth_token', token, { httpOnly: true });    // JS cannot read
res.cookie('csrf_token', csrfToken, { httpOnly: false }); // JS can read
```

### ❌ Mistake 4: CSRF Token in Protected Endpoint
```typescript
// BAD: Setting CSRF token in /me endpoint
router.get('/me', authenticate, async (req, res) => {
  setCsrfCookie(res);  // Unnecessary - already set on login
  res.json({ user });
});

// GOOD: Only set on login/auth endpoints
router.post('/login', async (req, res) => {
  setCsrfCookie(res);  // ✓ Set once on login
  res.json({ user });
});
```

---

## References

- **CSRF Implementation:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/csrf.ts`
- **Auth Routes:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/auth.routes.ts` (lines 189-204)
- **CSRF Exemption Logic:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/server.ts` (lines 189-204)
- **ADR-006:** `/Users/mikeyoung/CODING/rebuild-6.0/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`
- **Auth Rate Limiting:** `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/authRateLimiter.ts`

---

## Related Todos

- **TODO #249:** Hook state leakage in tests (ensure CSRF/auth cleanup between tests)
- **TODO #251:** DRY violation in Supabase mocks (consolidate auth mocking)

---

## Compound Learning

**When to use this guide:**
- Adding new authentication methods
- Debugging "CSRF token required" errors on auth endpoints
- Reviewing auth-related PRs
- Setting up new shared device flows

**If you had to refer to this more than once, consider:**
1. Adding a validation hook in pre-commit to check CSRF exemption list
2. Creating a code generator for new auth endpoints
3. Updating CLAUDE.md with this pattern in the Quick Links section
