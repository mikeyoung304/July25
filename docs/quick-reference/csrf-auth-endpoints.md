# CSRF & Auth Endpoint Quick Reference

Quick reference for which endpoints require CSRF protection, authentication, or are exempt.

## CSRF Protection Matrix

| Endpoint Pattern | CSRF Required | Auth Required | Reason |
|-----------------|---------------|---------------|--------|
| `POST /api/v1/auth/login` | No | No | User doesn't have CSRF token yet |
| `POST /api/v1/auth/pin-login` | No | No | User doesn't have CSRF token yet |
| `POST /api/v1/auth/station-login` | No | Yes (manager) | Station setup by manager |
| `POST /api/v1/auth/refresh` | No | No | Token refresh is self-validating |
| `POST /api/v1/auth/logout` | Yes | Yes | Authenticated user action |
| `POST /api/v1/payments/webhook` | No | No | Uses Stripe signature verification |
| `POST /api/v1/orders` (kiosk/online) | No | No | Public ordering via X-Client-Flow |
| `POST /api/v1/payments/*` (kiosk/online) | No | No | Public ordering via X-Client-Flow |
| All other POST/PUT/DELETE | Yes | Varies | Standard CSRF protection |

## X-Client-Flow Header Values

| Value | Description | CSRF Exempt |
|-------|-------------|-------------|
| `kiosk` | Self-service kiosk ordering | Yes |
| `online` | Online/web checkout | Yes |
| `server` | Server POS (authenticated staff) | No |
| (none) | Standard authenticated request | No |

## Adding New CSRF Exemptions

When an endpoint needs CSRF exemption, add to `server/src/server.ts`:

```typescript
// In the CSRF middleware section
app.use((req, res, next) => {
  // ... existing exemptions ...

  // NEW: Your exemption with justification
  if (req.path === '/api/v1/your-endpoint') {
    return next();  // Exempt because: [reason]
  }

  return csrfProtection(req, res, next);
});
```

**Justification required for exemptions:**
- Webhook endpoints (use signature verification instead)
- Pre-auth endpoints (user cannot have CSRF token)
- Public endpoints with alternative security measures

## Alternative Security for Exempt Endpoints

| Exemption Type | Alternative Security |
|----------------|---------------------|
| Stripe webhooks | Signature verification via `stripe.webhooks.constructEvent()` |
| Auth endpoints | Rate limiting, timing-safe comparison |
| Public orders | X-Client-Flow validation, server-side totals, rate limiting |

## Code Locations

| File | Responsibility |
|------|---------------|
| `server/src/middleware/csrf.ts` | CSRF token generation and validation |
| `server/src/server.ts` | CSRF exemption middleware |
| `server/src/routes/auth.routes.ts` | Auth endpoints (set CSRF cookie on login) |
| `client/src/services/http/httpClient.ts` | X-CSRF-Token header injection |

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 403 on login | N/A - login is exempt | Check other middleware |
| 403 on authenticated POST | Missing X-CSRF-Token header | Client should read `csrf_token` cookie |
| 403 on kiosk order | Missing X-Client-Flow header | Add header to request |
| Token mismatch | Cookie expired or cleared | Re-login to get new token |

## Related Documentation

- [CSRF Public Ordering Exemption](../solutions/auth-issues/csrf-public-ordering-exemption.md)
- [Cross-Origin Auth Fix](../solutions/auth-issues/cross-origin-samesite-cookie-auth-failure.md)
- [ADR-006: Dual Authentication](../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
