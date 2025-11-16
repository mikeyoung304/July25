# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: JWT Scope Bug Investigation

---

# JWT Scope Bug - Technical Summary

**Quick Reference for Developers**

---

## The Bug in 30 Seconds

**What**: JWT tokens issued by login endpoints were missing the `scope` field  
**Impact**: All permission checks failed (users couldn't access authorized features)  
**Duration**: November 2-12, 2025 (10 days)  
**Root Cause**: Demo auth removal didn't transfer JWT payload requirements to remaining endpoints  
**Fix**: Add `scope: scopes` to JWT payload in login and pin-login endpoints  

---

## Exact Code Change

### Location 1: `/api/v1/auth/login`

```typescript
// server/src/routes/auth.routes.ts, lines 95-106

// BEFORE:
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  auth_method: 'email',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};

// AFTER:
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADDED THIS LINE
  auth_method: 'email',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60)
};
```

### Location 2: `/api/v1/auth/pin-login`

```typescript
// server/src/routes/auth.routes.ts, lines 181-190

// BEFORE:
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
};

// AFTER:
const payload = {
  sub: result.userId,
  email: result.userEmail,
  role: result.role,
  restaurant_id: restaurantId,
  scope: scopes,  // ✅ ADDED THIS LINE
  auth_method: 'pin',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60)
};
```

**Key Point**: The `scopes` variable was already being fetched from the database and returned in the response body. It just wasn't being included in the JWT payload.

---

## Why This Broke Everything

### The Permission Check Flow

```
1. User calls /api/v1/auth/login
   Response: { user: { scopes: ["orders:create", "staff:manage"] }, token: "..." }

2. Client stores token and uses it for API requests
   Header: Authorization: Bearer <token>

3. Server validates token in middleware:
   auth.ts:99 -> req.user.scopes = decoded.scope || []
                                     (undefined, so [] )

4. API endpoint needs permission:
   rbac.ts:307 -> if (!userScopes.includes(scope))
                    return Forbidden()

5. PERMISSION DENIED - despite user having correct role!
```

### The "Split Brain" Problem

```
HTTP Response Body:     JWT Token Payload:
{                       {
  user: {                 sub: "user-123",
    scopes: [✅]          role: "manager",
  },                      ❌ NO scope field
  token: "..."
}
```

The client side saw the scopes (in response body), but the server couldn't access them (missing from JWT).

---

## Where the Bug Was Introduced

### Commit: `5dc74903` (Nov 2, 2025)

**Removed demo-session endpoint** which had the correct JWT structure:

```typescript
// Removed from demo-session endpoint:
const payload = {
  sub: demoUserId,
  role: role,
  restaurant_id: restaurantId,
  scope: roleScopes,  // ✅ This was preserved
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};
```

**But didn't add it to remaining endpoints**:

```typescript
// Remaining login endpoint (MISSING scope):
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  restaurant_id: restaurantId,
  auth_method: 'email',
  // ... scope NOT added here
};
```

---

## Middleware Expectations

### `auth.ts` (line 99) - What It Expected

```typescript
req.user = {
  id: decoded.sub,
  email: decoded.email,
  role: userRole,
  scopes: decoded.scope || [],  // ⚠️ Expected to find scope in JWT
  restaurant_id: decoded.restaurant_id
};
```

**The middleware was correct** - it just couldn't find what the endpoint wasn't providing.

### `rbac.ts` (lines 237-338) - The Fallback

```typescript
// If scope not in JWT, fallback to database query:
const userRole = await getUserRestaurantRole(req.user.id, restaurantId);
const userScopes = getScopesForRole(userRole);  // Query database
```

**This fallback masked the bug** - the system still worked, but inefficiently.

---

## Why Tests Didn't Catch It

### E2E Test Pattern (Incorrect)

```typescript
const response = await fetch('/api/v1/auth/login', { ... });
const body = await response.json();

// ✅ Tests checked response body
expect(body.user.scopes).toContain('orders:create');

// ❌ Tests did NOT check JWT payload
// The token itself was never decoded and validated
```

### What Tests Should Check

```typescript
import jwt from 'jsonwebtoken';

const response = await fetch('/api/v1/auth/login', { ... });
const { session } = await response.json();

// Decode JWT and verify scope field exists
const decoded = jwt.decode(session.access_token);
expect(decoded.scope).toBeDefined();  // ⚠️ Would have caught this!
expect(decoded.scope).toEqual(response.user.scopes);
```

---

## Impact by Timeline

| Timeframe | Status | Users Affected |
|-----------|--------|----------------|
| Nov 2-8 (6 days) | BUG UNDETECTED | All users silently affected |
| Nov 8 (15 min) | FALSE FIX REVERTED | Worse - wrong direction |
| Nov 8-12 (4 days) | BUG ACTIVE AGAIN | All users still affected |
| Nov 12 onward | FIXED | All users restored to full function |

---

## Prevention Checklist

For future JWT/auth changes:

- [ ] **Document JWT payload schema** at top of endpoint file
- [ ] **Add type definitions** for JWT payload  
  ```typescript
  interface JWTPayload {
    sub: string;
    scope: string[];  // Make required
    role: string;
    restaurant_id: string;
  }
  ```
- [ ] **Test JWT structure** not just response body
- [ ] **Audit middleware consumers** before removing JWT fields
- [ ] **Remove fallback logic** - fail fast if data missing
- [ ] **Add logging** for scope count or missing fields
- [ ] **Review database fallbacks** - they hide bugs!

---

## Key Files

| File | Line | What It Does |
|------|------|--------------|
| `server/src/routes/auth.routes.ts` | 95-106 | Login endpoint JWT creation |
| `server/src/routes/auth.routes.ts` | 181-190 | PIN login endpoint JWT creation |
| `server/src/middleware/auth.ts` | 99 | Reads `decoded.scope` from JWT |
| `server/src/middleware/rbac.ts` | 304 | Fallback query if no scope in JWT |

---

## Lessons Learned

1. **JWT payloads are implicit contracts** - missing a field doesn't error, it silently fails
2. **Fallback logic hides bugs** - the database fallback made this invisible for 6 days
3. **Test JWT structure, not just response** - two sources of truth must be validated
4. **Demo cleanup is high-risk** - legacy code sometimes has institutional knowledge
5. **Permission systems are tightly coupled** - one field affects all three layers (endpoint, middleware, API)

---

## Related Documentation

- Full RCA: `JWT_SCOPE_BUG_ROOT_CAUSE_ANALYSIS.md`
- Auth Architecture: `docs/AUTHENTICATION_ARCHITECTURE.md`
- RBAC Setup: `server/src/middleware/rbac.ts` (lines 47-102)

