---
title: Cross-Origin HTTPOnly Cookie Auth Failure (SameSite=strict)
slug: cross-origin-samesite-cookie-auth-failure
problem_type: authentication
components:
  - auth.routes.ts
  - httpClient
  - Demo Login Flow
  - PIN Login Flow
symptoms:
  - All demo logins (Server, Kitchen, Admin, Expo) return 401 Unauthorized after successful login
  - Console shows "No authentication available for API request"
  - Workspaces fall back to mock data instead of real restaurant data
  - HTTPOnly cookies are set but not sent with cross-origin requests
  - Login appears successful but subsequent API calls fail authentication
root_cause: |
  JWT was only returned in HTTPOnly cookie with SameSite=strict. SameSite=strict cookies
  are NOT sent with cross-origin requests (Vercel frontend → Render backend). The client
  couldn't access the token for localStorage fallback because the dual-auth pattern
  (ADR-006) requires token in BOTH cookie AND response body for cross-origin deployments.
severity: high
date_solved: 2025-12-31
tags:
  - authentication
  - cross-origin
  - cookies
  - samesite
  - httponly
  - dual-auth
  - adr-006
  - vercel
  - render
related_docs:
  - docs/explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md
  - docs/solutions/security-issues/httponly-cookie-auth.md
  - docs/solutions/security-issues/csrf-protection.md
  - docs/solutions/auth-issues/websocket-station-auth-dual-pattern.md
---

# Cross-Origin HTTPOnly Cookie Auth Failure (SameSite=strict)

## Problem

Cross-origin authentication failure between Vercel frontend (july25-client.vercel.app) and Render backend (july25.onrender.com). After successful login, all subsequent API requests returned 401 Unauthorized.

## Symptoms Observed

1. Demo logins appeared to succeed (200 response) but subsequent API calls failed
2. Console showed "No authentication available for API request (no Supabase session, no localStorage token)"
3. All workspaces fell back to mock data instead of real restaurant data
4. Browser DevTools showed `auth_token` cookie was set but not included in request headers
5. WebSocket showed "Disconnected" status

## Root Cause

The `SameSite=strict` cookie policy was working as designed - it prevents cookies from being sent with cross-origin requests as a CSRF protection mechanism.

**The Issue:** The server was setting the HTTPOnly cookie correctly but NOT including the token in the response body, breaking the dual-auth pattern (ADR-006).

### Cookie Configuration (Lines 22-30)

```typescript
function setAuthCookie(res: Response, token: string): void {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',  // <-- This blocks cross-origin cookie transmission
    maxAge: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    path: '/'
  });
}
```

### Why SameSite=strict Breaks Cross-Origin Auth

| Scenario | Cookie | Response Body Token | Auth Works? |
|----------|--------|---------------------|-------------|
| Same-origin (localhost:5173 → localhost:3001) | Sent | Available | Yes (cookie) |
| Cross-origin (vercel.app → render.com) | **NOT sent** | Available | Yes (localStorage) |
| Cross-origin WITHOUT fix | NOT sent | **Missing** | **NO** |

## Solution

Include the JWT token in the response body alongside the HTTPOnly cookie so clients can store it in localStorage for cross-origin authentication.

### Email Login Fix (Lines 151-168)

```typescript
// Return user AND token (token is ALSO in HTTPOnly cookie for same-origin)
// Cross-origin deployments (Vercel → Render) need the token in response body
// because SameSite=strict cookies are not sent with cross-origin requests
res.json({
  user: {
    id: authData.user.id,
    email: authData.user.email,
    role: userRole.role,
    scopes
  },
  // Include access_token for cross-origin deployments where HTTPOnly cookies fail
  session: {
    access_token: customToken,  // <-- JWT for cross-origin localStorage auth
    refresh_token: authData.session?.refresh_token,
    expires_in: AUTH_TOKEN_EXPIRY_HOURS * 60 * 60
  },
  restaurantId
});
```

### PIN Login Fix (Lines 243-254)

```typescript
res.json({
  user: {
    id: result.userId,
    email: result.userEmail,
    role: result.role,
    scopes
  },
  token,  // <-- JWT for cross-origin localStorage auth
  expiresIn: 12 * 60 * 60,
  restaurantId
});
```

## The Dual Authentication Pattern (ADR-006)

This solution implements the dual-auth pattern correctly:

1. **Server sets JWT in BOTH places:**
   - HTTPOnly cookie (`auth_token`) - secure, same-origin only
   - Response body (`access_token` / `token`) - for cross-origin fallback

2. **Client's httpClient checks BOTH sources:**
   - First tries Supabase Auth session
   - Falls back to localStorage token (stored from response body)

3. **On cross-origin requests:**
   - Cookie is NOT sent (blocked by `SameSite=strict`)
   - Client sends JWT from localStorage via `Authorization: Bearer <token>` header
   - Server authenticates via the Authorization header instead

## Files Changed

| File | Change |
|------|--------|
| `server/src/routes/auth.routes.ts` | Added `access_token` to email login response |
| `server/src/routes/auth.routes.ts` | Added `token` to PIN login response |
| `client/src/contexts/AuthContext.tsx` | Added localStorage sync on token refresh |

## Prevention Strategies

### Checklist for New Auth Endpoints

- [ ] Return JWT in response body (not just cookie)
- [ ] Document cross-origin deployment requirements
- [ ] Test with frontend and backend on different domains

### Code Review Checklist

- [ ] Login/auth endpoints return token in response body
- [ ] Response includes both cookie and body token
- [ ] Client stores token in localStorage on login
- [ ] httpClient checks localStorage as fallback

### Architecture Guidance

| Deployment | Cookie Only | Dual-Auth |
|------------|-------------|-----------|
| Same domain (app.example.com → api.example.com) | Can work with `SameSite=lax` | Recommended |
| Different domains (vercel.app → render.com) | **Will NOT work** | **Required** |
| Development (localhost) | Works | Works |

## Verification

Tested all workspaces after fix:

| Workspace | Status | Data |
|-----------|--------|------|
| Server | Working | 16 tables, 52/62 seats |
| Kitchen | Working | 16 active orders |
| Admin | Working | Floor Plan, Menu, Analytics |
| Expo | Working | 16 active orders |

## Related Documentation

- [ADR-006: Dual Authentication Pattern](../../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
- [HTTPOnly Cookie Auth](../security-issues/httponly-cookie-auth.md)
- [CSRF Protection](../security-issues/csrf-protection.md)
- [WebSocket Station Auth](./websocket-station-auth-dual-pattern.md)
