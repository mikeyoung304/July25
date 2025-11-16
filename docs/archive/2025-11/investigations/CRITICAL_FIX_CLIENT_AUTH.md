# ARCHIVED

> **⚠️ ARCHIVED DOCUMENTATION**
> This file has been archived on 2025-11-14.
> For current documentation, see [docs/README.md](/docs/README.md)
> Category: Investigations

---

# 🚨 CRITICAL FIX: Client Email Login Must Use Backend JWT

**Date**: November 12, 2025
**Discovered By**: Playwright MCP automated testing
**Severity**: CRITICAL - All email/password logins have broken authorization
**Status**: ❌ NOT FIXED - Requires client code change + deployment

---

## Executive Summary

**The JWT scope fix IS deployed on the backend and DOES work.**

**However**: The client's email/password login bypasses the backend's custom JWT generation and uses Supabase's JWT directly, which has NO scopes.

**Impact**: Anyone logging in via email/password gets 401 "Missing required scope" errors.

**Solution**: Make email/password login call `/api/v1/auth/login` (backend endpoint) instead of calling Supabase directly, matching how PIN login already works.

---

## Root Cause Analysis

### How It Should Work (PIN Login - ✅ WORKS)

```
Client → POST /api/v1/auth/pin-login
       ↓
Backend:
  1. Validates PIN
  2. Fetches scopes from role_scopes table
  3. Generates custom JWT with scopes ✅
  4. Returns custom JWT
       ↓
Client:
  - Stores custom JWT
  - Uses it for API calls
  - Authorization works ✅
```

### How It's Broken (Email Login - ❌ BROKEN)

```
Client → supabase.auth.signInWithPassword()
       ↓
Supabase:
  - Authenticates user
  - Returns Supabase JWT (NO scopes) ❌
       ↓
Client:
  - Stores Supabase JWT
  - Uses it for API calls
  - Backend sees no scopes → 401 error ❌
```

### Evidence from Playwright Test

**Token actually being used by client:**
```json
{
  "iss": "https://xiwfhcikfdoshxwbtjxt.supabase.co/auth/v1",
  "sub": "b764e66c-0524-4d9b-bd62-bae0de920cdb",
  "email": "server@restaurant.com",
  "role": "authenticated",  ← Generic Supabase role, not our role
  "scope": MISSING           ← ❌ NO SCOPE FIELD
}
```

**Expected token (what backend generates):**
```json
{
  "sub": "b764e66c-0524-4d9b-bd62-bae0de920cdb",
  "email": "server@restaurant.com",
  "role": "server",           ← Our actual role
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "scope": [                  ← ✅ HAS SCOPES
    "orders:create",
    "orders:read",
    "orders:update",
    "orders:status",
    "payments:process",
    "payments:read",
    "tables:manage"
  ],
  "auth_method": "email",
  "iat": 1762968800,
  "exp": 1762997600
}
```

---

## The Fix

### File to Modify

**`client/src/contexts/AuthContext.tsx`** - Lines 185-245

### Current Code (BROKEN):

```typescript
const login = async (email: string, password: string, restaurantId: string) => {
  logger.info('🔐 login() START', { email, restaurantId });
  setIsLoading(true);
  try {
    // 1. Authenticate with Supabase directly ❌
    logger.info('🔐 Step 1: Calling supabase.auth.signInWithPassword');
    const supabaseStart = Date.now();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    const supabaseDuration = Date.now() - supabaseStart;
    logger.info(`🔐 Step 1 complete: Supabase auth (${supabaseDuration}ms)`);

    if (authError || !authData.session) {
      logger.error('❌ Supabase authentication failed:', authError);
      throw new Error(authError?.message || 'Login failed');
    }

    // 2. Fetch user profile and role from backend
    logger.info('🔐 Step 2: Fetching user from /api/v1/auth/me');
    const authMeStart = Date.now();

    const response = await httpClient.get<{ user: User; restaurantId: string }>(
      '/api/v1/auth/me'
    );

    const authMeDuration = Date.now() - authMeStart;
    logger.info(`🔐 Step 2 complete: User fetched (${authMeDuration}ms)`, {
      email: response.user?.email,
      role: response.user?.role
    });

    // 3. Update React state immediately (don't wait for onAuthStateChange)
    logger.info('🔐 Step 3: Setting user state in React context');
    setUser(response.user);
    setRestaurantId(response.restaurantId);
    setCurrentRestaurantId(response.restaurantId);
    setSession({
      accessToken: authData.session.access_token,  // ❌ Supabase token!
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in,
      expiresAt: authData.session.expires_at
    });

    logger.info('✅ login() COMPLETE', { email: response.user?.email });

  } catch (error) {
    logger.error('❌ login() FAILED:', error);
    await supabase.auth.signOut();
    throw error;
  } finally {
    setIsLoading(false);
  }
};
```

### Fixed Code (WORKING):

```typescript
const login = async (email: string, password: string, restaurantId: string) => {
  logger.info('🔐 login() START', { email, restaurantId });
  setIsLoading(true);
  try {
    // Call backend /api/v1/auth/login endpoint (matches PIN login pattern)
    logger.info('🔐 Calling /api/v1/auth/login');
    const loginStart = Date.now();

    const response = await httpClient.post<{
      user: User;
      session: {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };
      restaurantId: string;
    }>('/api/v1/auth/login', {
      email,
      password,
      restaurantId
    });

    const loginDuration = Date.now() - loginStart;
    logger.info(`🔐 Login complete (${loginDuration}ms)`, {
      email: response.user?.email,
      role: response.user?.role,
      scopes: response.user?.scopes?.length
    });

    // Verify the token has scopes (for debugging)
    if (!response.user?.scopes || response.user.scopes.length === 0) {
      logger.warn('⚠️  User has no scopes - this may cause authorization issues');
    } else {
      logger.info('✅ User has scopes:', response.user.scopes);
    }

    // Update React state with backend-provided token (has scopes!)
    setUser(response.user);
    setRestaurantId(response.restaurantId);
    setCurrentRestaurantId(response.restaurantId);
    setSession({
      accessToken: response.session.access_token,   // ✅ Backend JWT with scopes!
      refreshToken: response.session.refresh_token,
      expiresIn: response.session.expires_in,
      expiresAt: Date.now() / 1000 + response.session.expires_in
    });

    // Also sign in to Supabase to maintain Supabase session consistency
    // This ensures Supabase client methods work, but we use our custom JWT for API calls
    await supabase.auth.setSession({
      access_token: response.session.access_token,
      refresh_token: response.session.refresh_token
    });

    logger.info('✅ login() COMPLETE', { email: response.user?.email });

  } catch (error) {
    logger.error('❌ login() FAILED:', error);
    throw error;
  } finally {
    setIsLoading(false);
  }
};
```

### Key Changes:

1. **Line 193-196**: Replace `supabase.auth.signInWithPassword()` with `httpClient.post('/api/v1/auth/login')`
2. **Line 207-215**: Remove separate `/api/v1/auth/me` call (backend returns user in login response)
3. **Line 229**: Use `response.session.access_token` (backend JWT with scopes)
4. **New lines**: Add `supabase.auth.setSession()` to maintain Supabase client consistency

---

## Why This Is Better

### Before (Broken Architecture):
```
Client ─┬─> Supabase (get token) ─────> Use Supabase token ❌
        └─> Backend /auth/me (get user) ─> Ignore backend token
```

### After (Correct Architecture):
```
Client ──> Backend /auth/login ──> Get custom JWT with scopes ✅
                                 └> Use backend JWT for all API calls
```

### Benefits:
1. ✅ Matches PIN login architecture (consistency)
2. ✅ Uses backend JWT with scopes (authorization works)
3. ✅ Single API call instead of two (performance)
4. ✅ Backend controls JWT generation (security)
5. ✅ Can add custom claims easily (extensibility)

---

## Testing the Fix

### Step 1: Apply the code change

```bash
# Edit client/src/contexts/AuthContext.tsx
# Replace login function with fixed version above
```

### Step 2: Build and deploy client

```bash
cd client
npm run build
vercel --prod
```

### Step 3: Test in production

1. **Clear browser storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Login with email/password**:
   - Email: `server@restaurant.com`
   - Password: `ServerPass123!`

3. **Verify token has scopes** (in Console):
   ```javascript
   const authSession = localStorage.getItem('auth_session');
   const session = JSON.parse(authSession);
   const token = session.session.accessToken;

   // Decode JWT
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('Has scopes:', !!payload.scope);
   console.log('Scopes:', payload.scope);
   ```

   Expected output:
   ```
   Has scopes: true
   Scopes: ["orders:create", "orders:read", ...]
   ```

4. **Try to submit an order**:
   - Select table and seat
   - Add items to cart
   - Click "Send Order"
   - Should get: ✅ 201 Created (not 401)

### Step 4: Automated test

Run the Playwright test to verify:

```bash
npx playwright test tests/e2e/production-complete-flow.spec.ts
```

Should see:
```
✅ JWT HAS SCOPE FIELD!
Scopes: ["orders:create", ...]
✅ ORDER CREATED SUCCESSFULLY!
```

---

## Impact Analysis

### Who Is Affected:
- ✅ **Email/password login** - BROKEN (this fix resolves it)
- ✅ **PIN login** - Already works correctly (no changes needed)
- ⚠️  **Station login** - May have same issue (check separately)

### What Works After Fix:
- ✅ Email login will use backend JWT with scopes
- ✅ Order submission will work
- ✅ All role-based authorization will work
- ✅ Multi-tenant isolation will work

### Deployment Requirements:
1. **Client code change** (AuthContext.tsx)
2. **Client rebuild** (npm run build)
3. **Client deployment** (Vercel)
4. **No server changes needed** (backend already works)

### Estimated Time:
- Code change: 5 minutes
- Testing locally: 10 minutes
- Deployment: 2 minutes
- Verification: 5 minutes
- **Total: ~20 minutes**

---

## Rollback Plan

If the fix causes issues:

### Revert Code:
```bash
git revert <commit-hash-of-fix>
git push origin main
```

### Or Revert Manually:
Replace the fixed login function with the original one (calling Supabase directly).

**Note**: This means authorization will be broken again, but the system will be stable.

---

## Additional Considerations

### Backend API Response Format

Verify `/api/v1/auth/login` returns:
```typescript
{
  user: {
    id: string;
    email: string;
    role: string;
    scopes: string[];  // ← Must include this
  },
  session: {
    access_token: string;  // ← Backend JWT with scopes
    refresh_token: string;
    expires_in: number;
  },
  restaurantId: string;
}
```

### httpClient Configuration

Ensure `httpClient` uses the stored token:

```typescript
// Should be in httpClient.ts
const authSession = localStorage.getItem('auth_session');
if (authSession) {
  const session = JSON.parse(authSession);
  headers['Authorization'] = `Bearer ${session.session.accessToken}`;
}
```

### Session Management

After fix, the flow will be:
1. Login → Backend generates custom JWT
2. Store custom JWT in localStorage
3. httpClient automatically uses it for all API calls
4. Backend validates custom JWT and extracts scopes
5. Authorization works ✅

---

## Why This Wasn't Caught Earlier

### The Confusion:
1. ✅ Backend JWT scope fix WAS deployed
2. ✅ PIN login works correctly (uses backend JWT)
3. ❌ Email login bypasses backend JWT (uses Supabase JWT)
4. ❌ Testing via curl used backend endpoint (worked)
5. ❌ Testing via UI used email login (didn't work)

### The Insight:
**Playwright automated testing revealed the actual token being used in the browser.**

Without seeing the localStorage contents, it appeared that "the fix wasn't deployed" when in reality, the client was using the wrong token.

---

## Verification Checklist

After deploying the fix:

- [ ] Email login works
- [ ] Token in localStorage has `scope` field
- [ ] Order submission returns 201 (not 401)
- [ ] All roles (server, kitchen, manager) can perform their actions
- [ ] Playwright test passes
- [ ] No console errors
- [ ] Multi-tenant isolation still works

---

## Related Documentation

- **AUTH_BUG_ROOT_CAUSE_ANALYSIS.md** - Original analysis of JWT scope issue
- **AUTH_FIX_DEPLOYMENT_SUMMARY.md** - Backend deployment status
- **P0.9_AUTH_STABILIZATION_SYNTHESIS.md** - Comprehensive auth audit
- **tests/e2e/production-complete-flow.spec.ts** - Automated test that found this

---

## Next Steps

1. **Apply this fix** to AuthContext.tsx
2. **Test locally** with email login
3. **Deploy to production**
4. **Verify with Playwright test**
5. **Monitor for any issues**
6. **Consider applying same fix** to station login if it has same pattern

---

## Success Criteria

Fix is successful when:
- ✅ Email login generates token with `scope` field
- ✅ Order submission works (201 response)
- ✅ No 401 "Missing required scope" errors
- ✅ Playwright test passes
- ✅ All roles can perform authorized actions

---

**Fix Priority**: P0 - CRITICAL
**Risk Level**: LOW (matches existing PIN login pattern)
**Estimated Impact**: Fixes authorization for all email/password users
**Recommendation**: Deploy immediately after code review

---

**Document Created**: November 12, 2025
**Last Updated**: November 12, 2025
**Status**: Ready for implementation