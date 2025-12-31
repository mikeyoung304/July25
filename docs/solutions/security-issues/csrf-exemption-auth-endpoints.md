---
title: "CSRF Exemption for Authentication Endpoints"
slug: csrf-exemption-auth-endpoints
category: security-issues
severity: high
component: server/src/middleware/csrf.ts, server/src/server.ts
date_solved: 2025-12-31
---

# CSRF Exemption for Authentication Endpoints

## Problem Summary

Authentication endpoints (login, PIN auth, refresh) were blocked by CSRF protection middleware, preventing users from logging in with error "CSRF token required". This is a classic chicken-and-egg problem: CSRF tokens are set AFTER successful authentication, but CSRF protection requires tokens BEFORE authentication.

## Symptoms

- User attempts to sign in (POST to `/api/v1/auth/login`)
- Request fails with HTTP 403: `{"error":"CSRF token required"}`
- Other endpoints work fine (health check, etc.)
- Direct API tests show CSRF validation failing on all POST requests
- Error occurs on production (Render) deployments

## Root Cause

**File:** `server/src/server.ts:189-204`

CSRF protection middleware was applied globally to ALL POST/PUT/DELETE requests:

```typescript
// BEFORE - Blocks all requests, including auth
app.use(csrfProtection);
```

The CSRF token lifecycle is:
1. User starts unauthenticated (no CSRF token)
2. User POST to `/api/v1/auth/login` with credentials
3. CSRF middleware rejects: no cookie + no header = 403
4. User never reaches login handler
5. User never gets CSRF token from `setCsrfCookie()`

**Authentication flow** in `server/src/routes/auth.routes.ts`:
```typescript
export async function login(req: Request, res: Response) {
  // ... validate credentials ...
  setCsrfCookie(res);  // ← Token set AFTER login succeeds
  res.json({ token, user });
}
```

**CSRF validation** in `server/src/middleware/csrf.ts:49-90`:
```typescript
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    res.status(403).json({ error: 'CSRF token required' });
    return;
  }
  // ... token validation ...
}
```

The problem: users don't have a CSRF token to send when they're not authenticated yet.

## Solution

### Exempt Auth Endpoints from CSRF Protection

**File:** `server/src/server.ts:189-204`

Use middleware to skip CSRF protection for endpoints that execute before authentication:

```typescript
// CSRF protection - exempt endpoints that don't have CSRF token yet
app.use((req, res, next) => {
  // Exempt Stripe webhooks from CSRF (they use signature verification instead)
  if (req.path === '/api/v1/payments/webhook') {
    return next();
  }
  // Exempt auth endpoints - users don't have CSRF token before authenticating
  // CSRF token is set AFTER successful login via setCsrfCookie()
  if (req.path.startsWith('/api/v1/auth/login') ||
      req.path.startsWith('/api/v1/auth/pin-login') ||
      req.path.startsWith('/api/v1/auth/station-login') ||
      req.path.startsWith('/api/v1/auth/refresh')) {
    return next();
  }
  return csrfProtection(req, res, next);
});
```

### Why These Endpoints?

| Endpoint | Why Exempt |
|----------|-----------|
| `/api/v1/auth/login` | Primary login - no user context yet |
| `/api/v1/auth/pin-login` | PIN-based auth (KDS) - no user context yet |
| `/api/v1/auth/station-login` | Station/shared device auth - no user context yet |
| `/api/v1/auth/refresh` | Token refresh - uses existing auth token, not CSRF |
| `/api/v1/payments/webhook` | Stripe webhook - uses signature verification instead |

### Token Lifecycle (Now Fixed)

1. User navigates to login page
2. User POST to `/api/v1/auth/login` (CSRF exempt)
3. Server validates credentials
4. **CSRF token generated and set via `setCsrfCookie(res)`**
5. User gets response with CSRF token in cookie
6. **Subsequent requests include CSRF token** ✓
7. All other POST/PUT/DELETE requests protected by CSRF middleware

## Security Implications

### Remains Secure Because:

1. **Auth endpoints are stateless** - No user context to exploit
   - Cannot forge auth requests on behalf of users (no credentials to fake)
   - Credentials must be in request body (not cookies)

2. **Credentials require user interaction** - Cannot be automatically submitted
   - Email/password cannot be read from cookies
   - PIN cannot be read from cookies

3. **All post-auth requests still protected** - CSRF protection applies after login
   - Once user has token, all mutations require CSRF validation
   - Tokens are tied to browser session via cookies

4. **Stripe webhooks use signature verification** - Not CSRF-vulnerable
   - Uses `X-Stripe-Signature` header + webhook secret
   - Cannot be triggered from browser

## Prevention

1. **Document auth endpoint exemptions** - CSRF isn't needed before auth
2. **Always exempt endpoints that precede authentication** - Pattern for future auth methods
3. **Verify token is set immediately after auth** - Use `setCsrfCookie()` in all login handlers
4. **Test auth endpoints both with and without CSRF tokens** - Should work when no token
5. **Apply CSRF to all post-auth endpoints** - All mutations after login should require tokens

## Testing Checklist

```bash
# Auth endpoints should work WITHOUT CSRF token
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@restaurant.com","password":"Demo123!"}'
# ✓ Should return 200 with token + CSRF cookie

# Other POST endpoints should FAIL without CSRF token
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{"items":[]}'
# ✗ Should return 403: CSRF token required

# Same endpoint should SUCCEED with CSRF token
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token_from_login>" \
  -b "csrf_token=<token_from_login>" \
  -d '{"items":[]}'
# ✓ Should proceed with validation
```

## References

- **Implementation:** `server/src/server.ts:189-204`
- **CSRF Protection:** `server/src/middleware/csrf.ts`
- **Related:** `docs/solutions/security-issues/csrf-protection.md`
- **Related:** `docs/solutions/security-issues/httponly-cookie-auth.md`
- **Related ADR:** `docs/explanation/architecture-decisions/ADR-009-error-handling-philosophy.md`

---

*Created: 2025-12-31*
*Aligned with: Compound Engineering North Star*
*Category: Security (Authentication & CSRF Interaction)*
