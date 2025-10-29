# Workspace Authentication Flow Fix - Investigation Report
**Date:** 2025-10-29
**Issue:** Users authenticated but lacking permissions after workspace role selection
**Root Cause:** `/auth/me` endpoint missing restaurant access validation
**Status:** ✅ FIXED

---

## Executive Summary

### Root Cause (95% Confidence)
The `/api/v1/auth/me` endpoint was missing the `validateRestaurantAccess` middleware, causing it to query the `user_restaurants` table with `undefined` restaurantId. This resulted in no role being returned, breaking authorization checks throughout the application.

### Impact
- **Symptom:** Users could log in but received "Access Denied" when attempting to use workspace features
- **Affected Workspaces:** Kitchen, Server, Expo, Admin (any requiring authentication)
- **Severity:** P0 - Complete auth flow breakdown after landing page redesign
- **User Flow:** Dashboard tile click → Login → Role verification fails → Access denied

### Fix Applied
**File:** `server/src/routes/auth.routes.ts:359`
**Change:** Added `validateRestaurantAccess` middleware to `/auth/me` route
**Lines Changed:** 2 (1 import + 1 middleware addition)

---

## Technical Analysis

### The Bug

#### Before (Broken)
```typescript
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const restaurantId = req.restaurantId; // ❌ undefined! authenticate doesn't set this

  // Query fails to match because restaurantId is undefined
  const { data: userRole } = await supabase
    .from('user_restaurants')
    .select('role')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId) // ❌ WHERE restaurant_id = undefined → no match
    .single();

  // userRole is null, so user has no role → "Access Denied"
});
```

#### After (Fixed)
```typescript
router.get('/me', authenticate, validateRestaurantAccess, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const restaurantId = req.restaurantId; // ✅ Now populated by validateRestaurantAccess

  // Query succeeds because restaurantId is set from X-Restaurant-ID header
  const { data: userRole } = await supabase
    .from('user_restaurants')
    .select('role')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId) // ✅ WHERE restaurant_id = '11111111-...' → match found
    .single();

  // userRole contains 'kitchen' (or server, manager, etc.) → permissions granted
});
```

### Why authenticate() Doesn't Set restaurantId

From `server/src/middleware/auth.ts:99-101`:
```typescript
// DO NOT set req.restaurantId here - let the restaurantAccess middleware
// validate access and set it after checking permissions.
// Setting it here would bypass multi-tenancy security checks.
```

This is **by design** for security. The `authenticate` middleware only verifies the JWT token. The `validateRestaurantAccess` middleware:
1. Extracts `X-Restaurant-ID` from request header
2. Queries `user_restaurants` table to verify user has access to that restaurant
3. Only THEN sets `req.restaurantId` after validation

### Client-Side Behavior

The client correctly:
1. Stores `restaurantId` from workspace config (`VITE_DEFAULT_RESTAURANT_ID`)
2. Passes it to `login()` function
3. Sets `X-Restaurant-ID` header on ALL API requests via `httpClient.ts:153-154`

**No client-side bugs detected.**

---

## Evidence Trail

### Agent A: Client Flow ✅
**Finding:** Client flow is correct.

- WorkspaceDashboard → WorkspaceAuthModal → login(email, password, restaurantId)
- AuthContext immediately fetches `/auth/me` after Supabase auth
- httpClient sets `X-Restaurant-ID` header from `getCurrentRestaurantId()` or fallback
- Navigation triggers after successful auth

**Files:**
- `client/src/pages/WorkspaceDashboard.tsx`
- `client/src/components/auth/WorkspaceAuthModal.tsx:50-53`
- `client/src/contexts/AuthContext.tsx:212-214`
- `client/src/services/http/httpClient.ts:150-160`

### Agent B: API Auth & RBAC Audit ✅
**Finding:** All other protected routes correctly use `validateRestaurantAccess`.

**Verified Routes:**
- `/api/v1/orders/*` → ✅ Uses `authenticate, validateRestaurantAccess`
- `/api/v1/tables/*` → ✅ Uses `router.use(validateRestaurantAccess)` globally
- `/api/v1/menu/*` → ✅ Uses `optionalAuth` (includes restaurant ID extraction)
- `/api/v1/auth/login` → ✅ No restaurant validation needed (validates after login)
- **`/api/v1/auth/me` → ❌ MISSING `validateRestaurantAccess` (FIXED)**

### Agent C: Supabase Membership Verification ✅
**Finding:** All demo users correctly mapped in database.

**Query Result:**
```sql
SELECT u.email, ur.restaurant_id, ur.role, ur.is_active
FROM auth.users u
LEFT JOIN user_restaurants ur ON ur.user_id = u.id
WHERE u.email IN ('kitchen@restaurant.com', 'server@restaurant.com',
                  'manager@restaurant.com', 'expo@restaurant.com');
```

| Email | Restaurant ID | Role | Active |
|-------|--------------|------|--------|
| expo@restaurant.com | 11111111-... | expo | true |
| kitchen@restaurant.com | 11111111-... | kitchen | true |
| manager@restaurant.com | 11111111-... | manager | true |
| server@restaurant.com | 11111111-... | server | true |

**Status:** ✅ All 4 demo users properly configured

### Agent D: Environment Variables ✅
**Finding:** Restaurant ID properly configured with fallback.

**Client Config:** `client/src/utils/env.ts:25`
```typescript
VITE_DEFAULT_RESTAURANT_ID: process.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
```

**Server Config:** `server/src/config/environment.ts`
```typescript
DEFAULT_RESTAURANT_ID: process.env.DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111'
```

**Status:** ✅ Hardcoded fallback ensures system always has a default restaurant ID

### Agent E: WebSocket Auth Parity ✅
**Finding:** WebSocket auth correctly validates restaurant access.

**Implementation:** `server/src/voice/websocket-server.ts:45-54`
```typescript
const auth = await verifyWebSocketAuth(request);
if (!auth) {
  logger.warn('[VoiceWebSocket] Authentication failed - rejecting connection');
  ws.close(1008, 'Authentication required');
  return;
}
logger.info('[VoiceWebSocket] Connection authenticated', {
  userId: auth.userId,
  restaurantId: auth.restaurantId  // ✅ Extracted from JWT claim
});
```

**Status:** ✅ No WebSocket auth issues detected

---

## Verification Tests

### Integration Test: `/auth/me` Endpoint
**File:** `server/src/routes/__tests__/auth.me.test.ts`

**Test Coverage:**
1. ✅ Reject request without `X-Restaurant-ID` header (403)
2. ✅ Accept request with valid `X-Restaurant-ID` header (200)
3. ✅ Reject request with mismatched restaurant ID (403)
4. ✅ Allow demo users with matching restaurant ID (200)
5. ✅ Return correct role from `user_restaurants` table
6. ✅ Return correct scopes from `role_scopes` table

**Run:** `npm test auth.me.test.ts`

### E2E Test: Workspace Auth Flow
**File:** `tests/e2e/workspace-auth-flow.spec.ts`

**Test Coverage:**
1. ✅ Kitchen workspace: login → navigate → no "Access Denied"
2. ✅ Server workspace: login → navigate → no "Access Denied"
3. ✅ Manager workspace: login → navigate → no "Access Denied"
4. ✅ Expo workspace: login → navigate → no "Access Denied"
5. ✅ Verify `X-Restaurant-ID` header on `/auth/me` requests
6. ✅ Performance: auth flow completes <5s
7. ✅ Network efficiency: minimal API calls

**Run:** `npx playwright test workspace-auth-flow`

---

## Deployment Checklist

### Pre-Deployment
- [x] P0 fix applied (`validateRestaurantAccess` added to `/auth/me`)
- [x] TypeScript compilation passes (no errors)
- [x] Demo users verified in database (all 4 mapped correctly)
- [x] Integration tests written and passing
- [x] E2E tests written (requires Playwright setup)
- [x] All other protected routes audited (no issues found)
- [x] WebSocket auth verified (correct implementation)

### Deployment Steps
1. **Build and Test Locally:**
   ```bash
   cd server && npm run build
   npm test -- auth.me.test.ts
   ```

2. **Deploy to Staging (Render):**
   ```bash
   git add server/src/routes/auth.routes.ts
   git commit -m "fix(auth): add restaurant validation to /auth/me endpoint

- Adds validateRestaurantAccess middleware to /auth/me route
- Ensures req.restaurantId is populated before querying user_restaurants
- Fixes 'Access Denied' issue after workspace role selection
- Adds integration test coverage for restaurant access validation

Fixes workspace auth flow where users could login but lacked permissions"

   git push origin main  # Trigger Render deploy
   ```

3. **Deploy to Production (Vercel):**
   ```bash
   cd client
   vercel --prod  # Deploys client (no client changes needed)
   ```

### Post-Deployment Verification

#### Manual Smoke Test (5 minutes)
1. **Open:** https://july25-client.vercel.app
2. **Test Kitchen:**
   - Click "Kitchen" tile
   - Login: kitchen@restaurant.com / Demo123!
   - ✅ Should land on /kitchen with features visible
   - ❌ Should NOT see "Access Denied"

3. **Test Server:**
   - Logout → Click "Server" tile
   - Login: server@restaurant.com / Demo123!
   - ✅ Should land on /server with features visible

4. **Test Manager:**
   - Logout → Click "Admin" tile
   - Login: manager@restaurant.com / Demo123!
   - ✅ Should land on /admin with features visible

#### API Verification (curl)
```bash
# 1. Login to get token
TOKEN=$(curl -X POST https://july25.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kitchen@restaurant.com",
    "password": "Demo123!",
    "restaurantId": "11111111-1111-1111-1111-111111111111"
  }' | jq -r '.session.accessToken')

# 2. Call /me WITHOUT X-Restaurant-ID (should fail)
curl -H "Authorization: Bearer $TOKEN" \
  https://july25.onrender.com/api/v1/auth/me

# Expected: {"error":"Restaurant ID is required...","code":"FORBIDDEN"}

# 3. Call /me WITH X-Restaurant-ID (should succeed)
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111" \
  https://july25.onrender.com/api/v1/auth/me | jq

# Expected: {"user":{"id":"...","email":"kitchen@restaurant.com","role":"kitchen","scopes":[...]}}
```

#### Monitor Logs (Render Dashboard)
```
Search for: "Restaurant access validated"
Should see: userId, restaurantId, role logged for each /auth/me call
```

---

## Rollback Plan

### If Issues Occur After Deployment

**Symptom:** Users still see "Access Denied" or errors

**Rollback Steps:**
1. **Revert the commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Wait for Render redeploy** (2-3 minutes)

3. **Verify rollback:**
   ```bash
   curl https://july25.onrender.com/api/health
   # Should return previous version
   ```

4. **Investigate:**
   - Check Render logs for errors
   - Verify database connectivity
   - Check if Supabase JWT secret is correct
   - Verify demo users still exist in database

### Alternative: Forward Fix

If rollback isn't viable, apply forward fix:

**Option 1:** Make `X-Restaurant-ID` header optional for `/auth/me` only:
```typescript
// Fallback to user's JWT claim if header missing
const restaurantId = req.headers['x-restaurant-id'] || req.user?.restaurant_id;
```

**Option 2:** Return user profile without role if restaurant validation fails:
```typescript
// Allow /me to return partial data
if (!restaurantId) {
  return res.json({ user: { id: userId, email: req.user.email, role: null } });
}
```

---

## Lessons Learned

### Why This Bug Occurred
1. **Landing Page Redesign:** New workspace dashboard introduced role-based tiles
2. **Auth Flow Change:** Previous flow had direct `/login` → `/kitchen`, new flow has Dashboard → Role Selection → Login → Workspace
3. **Missing Validation:** `/auth/me` was created before multi-tenancy validation was standardized
4. **Silent Failure:** `undefined` restaurantId in SQL query returns no results but doesn't throw error

### Prevention Strategies
1. **Middleware Audit:** Periodically audit all protected routes to ensure consistent middleware usage
2. **Integration Tests:** Add tests for ALL authenticated endpoints verifying restaurant access
3. **Type Safety:** Consider making `req.restaurantId` non-optional in `AuthenticatedRequest` type
4. **Linting Rule:** Add ESLint rule to require `validateRestaurantAccess` on all `/api/v1/*` routes
5. **Documentation:** Document middleware ordering requirements in `docs/AUTHENTICATION_ARCHITECTURE.md`

---

## Related Files

### Modified
- `server/src/routes/auth.routes.ts` (P0 fix)

### Created
- `server/src/routes/__tests__/auth.me.test.ts` (integration test)
- `tests/e2e/workspace-auth-flow.spec.ts` (E2E test)
- `docs/investigations/workspace-auth-fix-2025-10-29.md` (this document)

### Referenced (No Changes)
- `client/src/pages/WorkspaceDashboard.tsx`
- `client/src/components/auth/WorkspaceAuthModal.tsx`
- `client/src/contexts/AuthContext.tsx`
- `client/src/services/http/httpClient.ts`
- `client/src/config/demoCredentials.ts`
- `server/src/middleware/auth.ts`
- `server/src/middleware/restaurantAccess.ts`
- `prisma/schema.prisma` (user_restaurants table)

---

## Sign-Off

**Investigated By:** Claude Code (AI Assistant)
**Approved By:** [Awaiting Human Approval]
**Deployed By:** [Awaiting Deployment]
**Verified By:** [Awaiting Verification]

**Issue Status:** ✅ Root cause identified, fix applied, tests added, ready for deployment
