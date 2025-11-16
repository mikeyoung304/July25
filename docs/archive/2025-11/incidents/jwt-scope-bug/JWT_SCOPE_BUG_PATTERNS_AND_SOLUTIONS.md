# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: JWT Scope Bug Investigation

---

# JWT Scope Bug - Patterns, Anti-Patterns, and Solutions

---

## Anti-Pattern: The "Split Brain" Architecture

### Definition

A "Split Brain" anti-pattern occurs when:
1. One component (HTTP response) claims data is available
2. Another component (JWT token) doesn't actually provide it
3. Fallback logic masks the inconsistency

### Example (The Bug)

```typescript
// ANTI-PATTERN: Data in response but not in JWT

// Endpoint: server/src/routes/auth.routes.ts:117-131
res.json({
  user: {
    id: authData.user.id,
    email: authData.user.email,
    role: userRole.role,
    scopes  // ✅ Scopes sent in response body
  },
  session: {
    access_token: customToken  // ⚠️ But NOT in token
  }
});

// Token payload was missing scope field:
const payload = {
  sub: authData.user.id,
  email: authData.user.email,
  role: userRole.role,
  // ❌ scope field NOT here
};
const customToken = jwt.sign(payload, jwtSecret);
```

### Symptoms

```
┌─────────────────────────┬────────────────────────┐
│ HTTP Response Body      │ JWT Token Payload      │
├─────────────────────────┼────────────────────────┤
│ scopes: [...]      ✅   │ MISSING scope field ❌ │
│ role: "manager"    ✅   │ role: "manager"    ✅  │
│ id: "user-123"     ✅   │ sub: "user-123"    ✅  │
└─────────────────────────┴────────────────────────┘

Result: Silent failure - appears to work,
        but permission checks fail
```

### Why It's Dangerous

```typescript
// Later, when using the token:

// 1. Middleware decodes JWT (missing scope field)
const decoded = jwt.verify(token, secret);
// decoded = { sub, email, role, ... } - NO scope

// 2. Middleware sets request context
req.user.scopes = decoded.scope || [];  // undefined -> []

// 3. RBAC check fails silently
if (!req.user.scopes.includes('orders:create')) {
  throw Forbidden();  // User denied, but they should have access!
}
```

---

## Pattern: Correct JWT Implementation

### Single Source of Truth

```typescript
// CORRECT PATTERN: All data in JWT

router.post('/login', async (req, res, next) => {
  try {
    // 1. Authenticate user
    const authData = await authenticate(email, password);
    
    // 2. Fetch scopes (do this BEFORE creating JWT)
    const scopes = await fetchUserScopes(authData.user.id);
    
    // 3. Create complete JWT payload
    const jwtSecret = process.env['SUPABASE_JWT_SECRET'];
    const payload = {
      sub: authData.user.id,
      email: authData.user.email,
      role: authData.user.role,
      restaurant_id: restaurantId,
      scope: scopes,  // ✅ All authorization data in JWT
      auth_method: 'email',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 28800
    };
    
    // 4. Sign JWT with all data
    const token = jwt.sign(payload, jwtSecret);
    
    // 5. Response mirrors what's in JWT
    res.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.role,
        scopes  // ✅ Same scopes as in JWT
      },
      session: {
        access_token: token  // ✅ Contains scope
      }
    });
    
  } catch (error) {
    next(error);
  }
});
```

### Key Principles

1. **Fetch authorization data BEFORE signing JWT**
   ```typescript
   // ✅ Correct order:
   const scopes = await fetchScopes();
   const token = jwt.sign({ scope: scopes }, secret);
   
   // ❌ Wrong order (doesn't compile):
   const token = jwt.sign({ scope: scopes }, secret);  // scopes undefined
   const scopes = await fetchScopes();  // Too late
   ```

2. **All claims needed by downstream middleware MUST be in JWT**
   ```typescript
   // Check what auth.ts expects:
   req.user.scopes = decoded.scope || [];  // Middleware expects 'scope'
   
   // So JWT must have it:
   const payload = { scope: scopes, ... };
   ```

3. **Response body matches JWT payload**
   ```typescript
   // ✅ Correct - they match:
   const payload = { scope: scopes, role, ... };
   const token = jwt.sign(payload, secret);
   
   res.json({
     user: { scopes, role, ... },  // Same data
     session: { access_token: token }
   });
   ```

---

## Anti-Pattern: Fallback Logic Masking Bugs

### The Problem

```typescript
// ANTI-PATTERN: Fallback hides missing data

export function requireScopes(...requiredScopes: ApiScope[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // If scopes missing from JWT, fallback to database
    let userScopes = req.user.scopes;  // undefined due to bug
    
    if (!userScopes || userScopes.length === 0) {
      // ❌ FALLBACK: Query database instead of failing
      const userRole = await getUserRestaurantRole(req.user.id, restaurantId);
      userScopes = getScopesForRole(userRole);  // Now works!
    }
    
    // System continues to work, but slowly and silently broken
    if (userScopes.includes(requiredScope)) {
      next();
    }
  };
}
```

### Why Fallbacks Hide Bugs

```
Bug introduced (Nov 2)
    ↓
No error thrown (fallback queries database instead)
    ↓
Tests pass (fallback makes it work)
    ↓
Performance degrades (extra DB queries per request)
    ↓
Bug detected 6 days later (when perf impact noticed)
    ↓
4 more days to properly fix (root cause misunderstood)
```

### Solution: Fail Fast

```typescript
// CORRECT PATTERN: No fallback, fail loud

export function requireScopes(...requiredScopes: ApiScope[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // ✅ No fallback - fail immediately if missing
    if (!req.user.scopes) {
      logger.error('FATAL: JWT missing scope field', {
        userId: req.user.id,
        path: req.path
      });
      return next(Unauthorized('JWT misconfiguration'));
    }
    
    if (req.user.scopes.length === 0) {
      logger.error('FATAL: User has no scopes', {
        userId: req.user.id,
        role: req.user.role,
        path: req.path
      });
      return next(Forbidden('No authorization scopes'));
    }
    
    // Only proceed if scopes are present and valid
    if (req.user.scopes.some(s => requiredScopes.includes(s))) {
      next();
    } else {
      next(Forbidden('Insufficient permissions'));
    }
  };
}
```

---

## Pattern: Explicit JWT Schema Contracts

### TypeScript Type Guard

```typescript
// Define what EVERY JWT must contain

interface JWTPayload {
  // ✅ Required claims
  sub: string;                    // User ID
  role: string;                   // User role
  restaurant_id: string;          // Restaurant context
  scope: string[];                // Authorization scopes (REQUIRED)
  
  // Optional claims
  email?: string;
  auth_method?: 'email' | 'pin' | 'station';
  
  // Standard JWT claims
  iat: number;                    // Issued at
  exp: number;                    // Expiration
}

// Use type when creating JWT
function createJWT(user: User, scopes: string[]): string {
  const payload: JWTPayload = {  // ✅ TypeScript enforces all required fields
    sub: user.id,
    role: user.role,
    restaurant_id: restaurantId,
    scope: scopes,  // ✅ Must provide scopes
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 28800
  };
  
  return jwt.sign(payload, secret);
}

// Use type when reading JWT
function validateJWT(token: string): JWTPayload {
  const decoded = jwt.verify(token, secret) as JWTPayload;
  
  // ✅ TypeScript ensures decoded.scope exists
  return decoded;
}
```

### Runtime Validation

```typescript
// Even with TypeScript, add runtime checks

function verifyJWTPayload(decoded: any): JWTPayload {
  // Check required fields
  if (!decoded.sub) throw Error('Missing sub claim');
  if (!decoded.role) throw Error('Missing role claim');
  if (!decoded.restaurant_id) throw Error('Missing restaurant_id claim');
  
  // ✅ CRITICAL: Check scope field
  if (!decoded.scope) {
    throw Error('FATAL: JWT missing scope field - auth system misconfigured');
  }
  if (!Array.isArray(decoded.scope)) {
    throw Error('scope field must be an array');
  }
  if (decoded.scope.length === 0) {
    logger.warn('User has empty scope array', { userId: decoded.sub });
  }
  
  return decoded as JWTPayload;
}
```

---

## Pattern: Integration Tests for JWT

### What NOT to Test (Insufficient)

```typescript
// ❌ INSUFFICIENT - only tests response body
describe('Login Endpoint', () => {
  it('should return user with scopes', async () => {
    const response = await login({ email, password, restaurantId });
    
    expect(response.status).toBe(200);
    expect(response.body.user.scopes).toBeDefined();
    expect(response.body.user.scopes).toContain('orders:create');
    
    // ⚠️ Never checks if token actually has scopes!
  });
});
```

### What TO Test (Comprehensive)

```typescript
// ✅ COMPREHENSIVE - tests JWT structure and integration

describe('Login Endpoint - JWT Structure', () => {
  it('should include scopes in JWT token', async () => {
    const response = await login(credentials);
    
    // 1. Response includes scopes
    expect(response.body.user.scopes).toBeDefined();
    expect(response.body.user.scopes).toContain('orders:create');
    
    // 2. JWT token includes same scopes
    const decoded = jwt.decode(response.body.session.access_token);
    expect(decoded.scope).toBeDefined();
    expect(decoded.scope).toEqual(response.body.user.scopes);
    
    // 3. JWT has required fields
    expect(decoded.sub).toBe(response.body.user.id);
    expect(decoded.role).toBe(response.body.user.role);
    expect(decoded.restaurant_id).toBe(response.restaurantId);
  });
  
  it('should have non-empty scopes for manager role', async () => {
    const managerResponse = await login(managerCredentials);
    const decoded = jwt.decode(managerResponse.body.session.access_token);
    
    expect(decoded.scope).toBeDefined();
    expect(decoded.scope.length).toBeGreaterThan(0);
    expect(decoded.scope).toContain('staff:manage');
    expect(decoded.scope).toContain('orders:create');
  });
  
  it('should work with RBAC middleware', async () => {
    // Login and get token
    const loginResponse = await login(credentials);
    const token = loginResponse.body.session.access_token;
    
    // Use token for API call that requires scopes
    const apiResponse = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ /* order data */ })
    });
    
    // Should succeed because JWT has required scope
    expect(apiResponse.status).toBe(201);  // Created
  });
});
```

---

## Pattern: Scope Fetch Timing

### Correct Timing

```typescript
// ✅ CORRECT: Fetch scopes BEFORE creating JWT

router.post('/login', async (req, res, next) => {
  try {
    // 1. Authenticate
    const user = await authenticateWithSupabase(email, password);
    
    // 2. Get role
    const userRole = await getUserRole(user.id, restaurantId);
    
    // 3. Fetch scopes (BEFORE JWT)
    const scopes = await fetchScopesForRole(userRole);  // ✅ Must be before
    
    // 4. Create JWT with scopes
    const payload = {
      sub: user.id,
      scope: scopes,  // ✅ Now scopes are available
      // ...
    };
    
    const token = jwt.sign(payload, secret);
    
    // 5. Send response
    res.json({
      user: { scopes },
      session: { access_token: token }
    });
  } catch (e) {
    next(e);
  }
});
```

### Wrong Timing (Won't Work)

```typescript
// ❌ WRONG: Create JWT before scopes are fetched

router.post('/login', async (req, res, next) => {
  try {
    const user = await authenticateWithSupabase(email, password);
    const userRole = await getUserRole(user.id, restaurantId);
    
    // Create JWT FIRST (NO scopes yet)
    const payload = {
      sub: user.id,
      scope: undefined  // ❌ scopes not fetched yet
    };
    
    const token = jwt.sign(payload, secret);
    
    // Fetch scopes AFTER (too late to include in JWT)
    const scopes = await fetchScopesForRole(userRole);
    
    res.json({
      user: { scopes },
      session: { access_token: token }  // ❌ Token doesn't have scopes
    });
  } catch (e) {
    next(e);
  }
});
```

---

## Debugging Guide

### How to Detect This Bug

1. **Check if permission denied despite correct role**
   ```bash
   # Request includes token and correct role
   curl -H "Authorization: Bearer $TOKEN" \
        -H "X-Restaurant-ID: $RESTAURANT" \
        https://api.example.com/api/v1/orders
   
   # Response: 403 Forbidden (but role has permission!)
   ```

2. **Decode JWT and check for scope field**
   ```bash
   # Use jwt.io or:
   node -e "console.log(JSON.stringify(require('jsonwebtoken').decode('$TOKEN'), null, 2))"
   
   # Should see: "scope": ["orders:create", ...]
   # If missing: That's the bug!
   ```

3. **Compare response body vs JWT**
   ```typescript
   // After login:
   const response = await login(creds);
   
   // Check response body has scopes
   console.log(response.user.scopes);  // ["orders:create", ...]
   
   // Decode token and check
   const decoded = jwt.decode(response.session.access_token);
   console.log(decoded.scope);  // ❌ undefined = BUG!
   ```

### How to Fix It

1. **Add scope to JWT payload**
   ```typescript
   const payload = {
     // ... other claims
     scope: scopes,  // ✅ Add this line
   };
   ```

2. **Make sure scopes are fetched first**
   ```typescript
   // Must happen BEFORE jwt.sign()
   const scopes = await fetchScopesForRole(userRole);
   ```

3. **Verify middleware can read it**
   ```typescript
   // In auth.ts, this should work now:
   req.user.scopes = decoded.scope || [];  // No longer empty
   ```

---

## Lessons for Future Development

### 1. JWT Schema Changes Are High-Risk

When modifying JWT structure:
- [ ] Create new interface for JWTPayload
- [ ] Update all middleware that reads it
- [ ] Add comprehensive tests
- [ ] Create migration for old tokens (if needed)
- [ ] Add logging for transition period

### 2. Remove Fallback Logic

Fallbacks hide bugs:
- [ ] Remove database fallback for JWT data
- [ ] Fail fast if required fields missing
- [ ] Add observability for fallback triggers
- [ ] Test without fallback

### 3. Test Data Format, Not Just Success

Integration tests must verify:
- [ ] HTTP response structure
- [ ] JWT token structure  
- [ ] Response body matches JWT
- [ ] Required fields present
- [ ] Field types correct
- [ ] Empty arrays handled

### 4. Document Implicit Contracts

```typescript
/**
 * JWT Payload Contract (CRITICAL)
 * 
 * This endpoint issues JWT tokens with the following structure:
 * {
 *   sub: string (user ID)
 *   role: string (user role)
 *   scope: string[] (authorization scopes) ← REQUIRED
 *   restaurant_id: string (restaurant context)
 *   email?: string (email address)
 *   auth_method?: 'email'|'pin'|'station'
 *   iat: number (issued at)
 *   exp: number (expiration)
 * }
 * 
 * CRITICAL: The 'scope' field is consumed by:
 * - server/src/middleware/auth.ts (line 99)
 * - server/src/middleware/rbac.ts (line 268)
 * 
 * Removing this field will break all permission checks.
 * Do NOT modify this structure without updating the above files.
 */
```

