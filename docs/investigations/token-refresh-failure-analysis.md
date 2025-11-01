# Token Refresh Failure Analysis


**Last Updated:** 2025-10-27

**Date:** October 27, 2025
**Issue:** Authenticated users unable to access workspaces due to token refresh failures
**Status:** ROOT CAUSE IDENTIFIED

## Problem Statement

User is signed in as `server@restaurant.com` but unable to access the Server workspace. Render logs show:

```
[POST]401 /api/v1/auth/logout - No token provided
[POST]401 /api/v1/auth/refresh - Invalid refresh token
{"level":"warn","message":"token_refresh_fail","reason":"invalid_token"}
```

## Root Cause: Logout Sequence Order

### The Issue

Our recent fix for the auth state race condition (commit `60e76993`) inadvertently created a NEW problem with the logout flow.

**Previous Fix (for auth state bug):**
We reordered `AuthContext.tsx` logout to call `supabase.auth.signOut()` BEFORE clearing React state:

```typescript
// client/src/contexts/AuthContext.tsx:388-413
const logout = async () => {
  setIsLoading(true);
  try {
    logger.info('🚪 Starting logout sequence...');

    // CRITICAL FIX: Sign out from Supabase FIRST
    await supabase.auth.signOut();  // ← This invalidates the session immediately
    logger.info('✅ Supabase signOut complete');

    // Call logout endpoint (after Supabase signout to ensure token is invalid)
    await httpClient.post('/api/v1/auth/logout').catch(err => {
      logger.warn('Backend logout call failed (non-critical):', err);
    });

    // Clear local state
    setUser(null);
    setSession(null);
    setRestaurantId(null);
    localStorage.removeItem('auth_session');
```

### Why This Breaks Logout

**Step-by-step breakdown:**

1. **User clicks "Switch Account"** → calls `logout()`

2. **`supabase.auth.signOut()` is called FIRST** (line 396)
   - This immediately invalidates the Supabase session
   - The session object is cleared from Supabase's internal state
   - Any subsequent calls to `supabase.auth.getSession()` return null

3. **`httpClient.post('/api/v1/auth/logout')` is called** (line 400)
   - `httpClient` tries to get the auth token (httpClient.ts:113-114):
     ```typescript
     const { data: { session } } = await supabase.auth.getSession()
     if (session?.access_token) {
       headers.set('Authorization', `Bearer ${session.access_token}`)
     }
     ```
   - But the session was already cleared in step 2!
   - No `Authorization` header is added to the request

4. **Backend receives logout request without token** (auth.routes.ts:314)
   ```typescript
   router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
   ```
   - The `authenticate` middleware requires a Bearer token (auth.ts:32-34)
   - No token present → returns `401 No token provided`

### Why Token Refresh Fails

The refresh token errors are a **secondary symptom**:

1. User is logged in with a valid Supabase session
2. Token is approaching expiration
3. Frontend tries to refresh using the refresh token
4. But the session was already invalidated by a previous logout attempt
5. Backend correctly rejects the invalid refresh token
6. Frontend still has stale session state in React context

**From Render logs:**
```json
{"level":"warn","message":"token_refresh_fail","reason":"invalid_token"}
{"error":"Invalid refresh token",...}
```

This happens because the refresh endpoint (auth.routes.ts:413-448) tries to use an already-invalidated refresh token.

## Why the Original Bug Required This Fix

**Context:** We fixed a race condition where `WorkspaceAuthModal` displayed the PREVIOUS user's email after logout + login.

**Original Problem:** The logout sequence was:
```typescript
// OLD (before commit 60e76993):
setUser(null);  // Clear React state
await supabase.auth.signOut();  // Then sign out
```

**Race Condition:**
1. `setUser(null)` clears React state immediately
2. `supabase.auth.signOut()` triggers `SIGNED_OUT` event asynchronously
3. User immediately logs in as new user → `SIGNED_IN` event fires
4. `login()` sets `setUser(newUser)`
5. **Delayed `SIGNED_OUT` event from step 2 finally fires!**
6. `onAuthStateChange` listener calls `setUser(null)` again
7. This overwrites the new user with null!

**Fix:** Call `supabase.auth.signOut()` FIRST to ensure the `SIGNED_OUT` event completes before any new login can start.

## The Dilemma

We have **two competing requirements**:

1. **Auth State Fix:** `supabase.auth.signOut()` must be called BEFORE clearing React state to prevent race condition
2. **Logout Endpoint:** Backend `/logout` endpoint needs a valid token, which requires calling it BEFORE `supabase.auth.signOut()`

## Solutions

### Option 1: Remove Backend Logout Call (SIMPLEST)

**The backend logout endpoint doesn't actually do anything critical:**

```typescript
// server/src/routes/auth.routes.ts:314-351
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Log logout event to auth_logs table (for auditing)
  await supabase.from('auth_logs').insert({...});

  // 2. Try to sign out from Supabase (fails silently for PIN/station auth)
  await supabaseAuth.auth.signOut();

  // 3. Return success response
  res.json({ success: true, message: 'Logged out successfully' });
});
```

**What it does:**
- Logs the logout event (nice to have, not critical)
- Calls `supabaseAuth.auth.signOut()` (but we already do this on frontend!)
- Returns success message (unused by frontend)

**Proposed Fix:**
Just remove the backend logout call entirely. The frontend `supabase.auth.signOut()` is sufficient.

```typescript
// client/src/contexts/AuthContext.tsx
const logout = async () => {
  setIsLoading(true);
  try {
    logger.info('🚪 Starting logout sequence...');

    // Sign out from Supabase (sufficient for auth invalidation)
    await supabase.auth.signOut();
    logger.info('✅ Supabase signOut complete');

    // NO BACKEND CALL NEEDED - frontend signOut() handles everything

    // Clear local state
    setUser(null);
    setSession(null);
    setRestaurantId(null);
    localStorage.removeItem('auth_session');

    logger.info('✅ Logout successful');
  } catch (error) {
    logger.error('❌ Logout failed:', error);
    // ... error handling
  }
};
```

**Pros:**
- Simplest fix
- Maintains race condition fix
- Reduces network overhead
- Frontend handles all auth state

**Cons:**
- Lose audit logging for logout events (minor)
- Backend can't track who logged out when (can be added elsewhere if needed)

### Option 2: Make Backend Logout Endpoint Optional (ALTERNATIVE)

Make the `/logout` endpoint work without authentication:

```typescript
// server/src/routes/auth.routes.ts
router.post('/logout', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  // If authenticated, log the event
  if (req.user) {
    await supabase.from('auth_logs').insert({
      user_id: req.user.id,
      restaurant_id: req.restaurantId,
      event_type: 'logout',
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
  }

  // Return success regardless
  res.json({ success: true, message: 'Logged out successfully' });
});
```

**Pros:**
- Keeps audit logging when possible
- Gracefully handles missing tokens
- More robust

**Cons:**
- More complex
- Still requires backend change

### Option 3: Send Token Explicitly (COMPLEX)

Extract and send the token before signing out:

```typescript
const logout = async () => {
  setIsLoading(true);
  try {
    // Get token BEFORE signing out
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Call backend with explicit token
    if (token) {
      await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).catch(err => logger.warn('Backend logout failed:', err));
    }

    // Clear state...
  }
};
```

**Pros:**
- Keeps all functionality
- Maintains audit logging

**Cons:**
- Most complex
- Still uses invalidated token (may fail anyway)
- More code to maintain

## Recommended Fix

**Implement Option 1** - Remove the backend logout call entirely.

**Rationale:**
1. The frontend `supabase.auth.signOut()` is the single source of truth for auth
2. Audit logging can be added to the frontend if needed
3. Simpler code, fewer failure points
4. Maintains the race condition fix
5. Backend logout endpoint adds no critical functionality

## Impact on User's Current Issue

The user's current issue is likely a combination of:

1. **Invalid logout attempts** creating noise in the logs (401 errors)
2. **Token refresh failures** because the session state is confused between frontend and backend
3. **Stale session data** in the frontend trying to use invalidated tokens

**Fixing the logout flow will resolve:**
- The 401 "No token provided" errors
- The cascading token refresh failures
- The confused session state

## Files to Modify

1. **`/client/src/contexts/AuthContext.tsx`**
   - Remove `httpClient.post('/api/v1/auth/logout')` call from `logout()` function
   - Lines 399-403 (the backend call and error handling)

## Testing Plan

1. **Local Test:** Login → Logout → Login as different user → Verify no 401 errors
2. **Integration Test:** Test rapid logout/login sequences
3. **E2E Test:** Puppeteer test covering full auth flow
4. **Production Test:** Monitor Render logs after deployment for 401 errors

## Related Issues

- Original auth state bug: Fixed in commit `60e76993`
- Investigation: `/docs/investigations/auth-state-bug-analysis.md`
- CHANGELOG: Entry for auth state race condition fix

## Notes

The backend logout endpoint was added for **audit logging** purposes, but it's not critical for authentication to work correctly. The frontend `supabase.auth.signOut()` handles all necessary auth invalidation.

If audit logging is important, we can:
1. Add frontend-side logging to a dedicated audit endpoint
2. Track logout events via Supabase's built-in auth event hooks
3. Use analytics/monitoring tools instead

The key insight is that **authentication state management should be owned by the frontend**, and the backend should be stateless (just validate tokens, don't manage sessions).
