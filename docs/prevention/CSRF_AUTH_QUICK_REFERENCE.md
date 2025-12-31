# CSRF/Auth Endpoint Quick Reference

**Last Updated:** 2025-12-31

## The Problem in 30 Seconds

CSRF middleware requires an X-CSRF-Token header on all state-changing requests. But on login endpoints, users DON'T have a token yet. So auth endpoints must be CSRF-exempt, then set the CSRF token AFTER successful authentication.

## The Solution

Auth endpoints bypass CSRF → Set both auth & CSRF cookies on success → All other endpoints require CSRF

## Endpoints Exempt from CSRF

```
/api/v1/auth/login           - Email login (no CSRF needed yet)
/api/v1/auth/pin-login       - PIN login (no CSRF needed yet)
/api/v1/auth/station-login   - Station auth (no CSRF needed yet)
/api/v1/auth/refresh         - Token refresh (no CSRF needed yet)
```

## Where This is Configured

1. **Exemption Logic** → `/Users/mikeyoung/CODING/rebuild-6.0/server/src/server.ts` lines 189-204
2. **CSRF Implementation** → `/Users/mikeyoung/CODING/rebuild-6.0/server/src/middleware/csrf.ts`
3. **Auth Routes** → `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/auth.routes.ts`

## Adding a New Auth Endpoint

### Checklist
- [ ] Add route to `/auth.routes.ts`
- [ ] Call `setAuthCookie(res, token)` to set auth token
- [ ] Call `setCsrfCookie(res)` to set CSRF token (so next requests can use it)
- [ ] Add endpoint path to CSRF exemption list in `server.ts` (lines 197-200)
- [ ] Add rate limiting to prevent brute force
- [ ] Write tests to verify it works WITHOUT CSRF token
- [ ] Verify protected endpoints still REQUIRE CSRF

### Code Pattern

```typescript
router.post('/my-auth-method',
  authRateLimiters.checkSuspicious,
  authRateLimiters.myMethod,
  async (req, res, next) => {
    try {
      const result = await validateAuth(req.body);

      // Generate JWT token
      const token = jwt.sign(payload, jwtSecret);

      // Set BOTH cookies
      setAuthCookie(res, token);      // HTTPOnly (JS can't read)
      setCsrfCookie(res);              // Readable (JS reads for header)

      res.json({ user, ... });
    } catch (error) {
      next(error);
    }
  }
);
```

## Code Review Checklist

When reviewing auth-related PRs, check:

- [ ] New auth endpoints in CSRF exemption list in `server.ts`?
- [ ] Both `setAuthCookie()` and `setCsrfCookie()` called on success?
- [ ] Auth token is HTTPOnly? CSRF token is readable?
- [ ] Protected endpoints still require CSRF header?
- [ ] No credentials logged (email/password/PIN)?
- [ ] Rate limiting applied?

## Common Mistakes

| Mistake | Problem | Fix |
| ------- | ------- | --- |
| Only set auth cookie | CSRF token never set → Protected endpoints fail | Call both `setAuthCookie()` AND `setCsrfCookie()` |
| Forget to add to exemption list | New auth endpoint blocked by CSRF | Add to `server.ts` lines 197-200 |
| No rate limiting | Brute force attacks | Add `authRateLimiters.method` |
| Log credentials | Security vulnerability | Only log user_id, restaurant_id |
| HTTPOnly=false for auth | JavaScript can steal token | Keep auth_token as `httpOnly: true` |

## Testing

Verify auth endpoints DON'T require CSRF:

```bash
# Should succeed without X-CSRF-Token header
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pwd","restaurantId":"123"}'

# Check response includes csrf_token cookie
# curl -v will show: Set-Cookie: csrf_token=...
```

Verify protected endpoints DO require CSRF:

```bash
# Should fail with 403 CSRF token required
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{}'

# Should succeed with CSRF token
curl -X POST http://localhost:3001/api/v1/orders \
  -H "Authorization: Bearer token" \
  -H "X-CSRF-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Why This Pattern Works

```
User visits app
    ↓
No auth token yet
    ↓
POST /api/v1/auth/login (no CSRF token available)
    ↓
Server validates credentials
    ↓
Server sets auth_token cookie (HTTPOnly, for all requests)
Server sets csrf_token cookie (readable, for CSRF validation)
    ↓
Client reads csrf_token from cookie
    ↓
All future POST/PUT/DELETE requests include X-CSRF-Token header
    ↓
CSRF middleware validates: cookie token === header token
    ↓
Request succeeds (assuming auth token is valid)
```

## Full Details

For comprehensive guidance on adding new endpoints, testing, and prevention:
→ `/Users/mikeyoung/CODING/rebuild-6.0/docs/solutions/security-issues/csrf-auth-endpoint-prevention.md`

## Related Documentation

- ADR-006 (Dual Auth Pattern): `/docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md`
- CSRF Protection Details: `/docs/solutions/security-issues/csrf-protection.md`
- Auth Security Tests: `/server/tests/security/auth-security.test.ts`
