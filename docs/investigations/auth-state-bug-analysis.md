# Authentication State Bug - Root Cause Analysis


**Last Updated:** 2025-10-27

**Date:** October 27, 2025
**Issue:** WorkspaceAuthModal displays wrong user email after logout + login sequence
**Status:** ROOT CAUSE IDENTIFIED

## Problem Statement

When users log out and log back in as a different role, the WorkspaceAuthModal shows the PREVIOUS user's email instead of the current user's email.

**Example:**
1. User logs in as `kitchen@restaurant.com`
2. User tries to access Server workspace → sees "Insufficient Permissions" modal showing `kitchen@restaurant.com` (CORRECT)
3. User clicks "Switch Account" → logs out → logs in as `expo@restaurant.com`
4. User tries to access Server workspace → modal STILL shows `kitchen@restaurant.com` (BUG!)

**Evidence:**
- User screenshot shows modal displaying `kitchen@restaurant.com`
- Render logs show backend authenticated as `expo@restaurant.com` (user ID: 804ef712-2952-420d-b101-8a56383989f5)
- Frontend and backend disagree on current user

## Root Cause: Dual User State Management

### The Problem

The `AuthContext.tsx` manages user state in TWO places simultaneously:

1. **Manual state management** in `login()` and `logout()` methods
2. **Automatic state management** via `onAuthStateChange` listener

This creates a **race condition** where competing state updates can overwrite each other.

### Code Analysis

**Location 1: Manual user state setting in `login()` (lines 171-233)**
```typescript
const login = async (email: string, password: string, restaurantId: string) => {
  // 1. Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  // 2. Fetch user from backend
  const response = await httpClient.get('/api/v1/auth/me');

  // 3. MANUALLY set user state
  setUser(response.user);  // ← Manual update
  setRestaurantId(response.restaurantId);
  setSession({...});
}
```

**Location 2: Automatic user state setting in `onAuthStateChange` (lines 132-163)**
```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // ALSO fetch user from backend
    const response = await httpClient.get('/api/v1/auth/me');

    // ALSO set user state
    setUser(response.user);  // ← Automatic update (duplicate!)
    setRestaurantId(response.restaurantId);
    setSession({...});
  } else if (event === 'SIGNED_OUT') {
    // ALSO clear user state
    setUser(null);  // ← Automatic clear
    setSession(null);
    setRestaurantId(null);
  }
});
```

### The Race Condition

When `login()` is called:
1. `supabase.auth.signInWithPassword()` triggers → Fires `SIGNED_IN` event
2. `login()` fetches `/api/v1/auth/me` and calls `setUser()`
3. `onAuthStateChange` listener ALSO fetches `/api/v1/auth/me` and calls `setUser()`

**Two async operations racing to set the same state!**

### The Logout Bug Scenario

1. User logs in as `kitchen@restaurant.com`
   - Both `login()` and `onAuthStateChange` set user to kitchen@
   - Modal component captures kitchen@ in its local state/closure

2. User clicks "Switch Account" → `logout()` is called
   - `logout()` immediately calls `setUser(null)` (line 385)
   - Then calls `await supabase.auth.signOut()` (line 393)
   - This triggers `SIGNED_OUT` event asynchronously

3. User immediately logs in as `expo@restaurant.com`
   - `login()` calls `supabase.auth.signInWithPassword()`
   - Triggers `SIGNED_IN` event
   - `login()` fetches `/auth/me` and sets user to expo@

4. **BUT**: The delayed `SIGNED_OUT` event from step 2 now fires!
   - `onAuthStateChange` listener sets `setUser(null)`
   - This OVERWRITES the expo@ user with null!

5. Then `SIGNED_IN` event fires again
   - Sets user back to expo@

**Final state sequence:** kitchen@ → null → expo@ → **null** → expo@

During this race condition, if the modal re-renders at the wrong time, it captures the WRONG user state.

### Additional Issue: Closure Capture

The `WorkspaceAuthModal` component uses `useAuth()` to get the current user:

```typescript
const { login, isAuthenticated, user, logout } = useAuth()
```

If the component doesn't properly re-render when the auth context updates, it might have a STALE `user` object captured in its closure.

## Solution

### Option 1: Remove Duplicate State Management (RECOMMENDED)

**Remove manual state setting from `login()` and rely solely on `onAuthStateChange`:**

```typescript
const login = async (email: string, password: string, restaurantId: string) => {
  setIsLoading(true);
  try {
    // Just trigger Supabase auth - let onAuthStateChange handle state updates
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      throw new Error(authError?.message || 'Login failed');
    }

    // Don't manually set user - onAuthStateChange will handle it
    logger.info('✅ Login complete');
  } catch (error) {
    logger.error('Login failed:', error);
    await supabase.auth.signOut();
    throw error;
  } finally {
    setIsLoading(false);
  }
};
```

**Pros:**
- Single source of truth for auth state
- No race conditions
- Supabase handles all state transitions

**Cons:**
- Slight delay before user state is available (need to wait for onAuthStateChange)

### Option 2: Disable onAuthStateChange for Login/Logout

**Add a flag to prevent onAuthStateChange from interfering:**

```typescript
const isManualAuthRef = useRef(false);

const login = async (email, password, restaurantId) => {
  isManualAuthRef.current = true;  // Flag: manual login in progress

  // ... existing login code ...

  setUser(response.user);
  isManualAuthRef.current = false;  // Clear flag
};

supabase.auth.onAuthStateChange(async (event, session) => {
  if (isManualAuthRef.current) {
    // Skip if manual auth is in progress
    logger.info('Skipping onAuthStateChange during manual auth');
    return;
  }

  // ... rest of onAuthStateChange logic ...
});
```

**Pros:**
- Keeps both mechanisms
- Fixes race condition

**Cons:**
- More complex
- Still has two state management paths

### Option 3: Debounce State Updates

**Add debouncing to prevent rapid state changes:**

```typescript
const userUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const setUserDebounced = useCallback((newUser: User | null) => {
  if (userUpdateTimerRef.current) {
    clearTimeout(userUpdateTimerRef.current);
  }

  userUpdateTimerRef.current = setTimeout(() => {
    setUser(newUser);
    userUpdateTimerRef.current = null;
  }, 100);
}, []);
```

**Pros:**
- Handles rapid updates gracefully

**Cons:**
- Adds latency
- Doesn't solve root cause

## Recommended Fix

**Implement Option 1** - Remove duplicate state management and rely solely on `onAuthStateChange`.

This is the cleanest solution that follows Supabase's recommended patterns and eliminates the race condition at its source.

## Testing Plan

1. **Unit Test**: Auth state transitions during rapid logout/login
2. **Integration Test**: WorkspaceAuthModal displays correct email after account switch
3. **E2E Test**: Full user flow with Puppeteer
4. **Manual Test**: Verify on production with actual users

## Files to Modify

- `/client/src/contexts/AuthContext.tsx` - Remove duplicate state management
- `/client/src/components/auth/WorkspaceAuthModal.tsx` - Verify re-rendering behavior
- `/client/src/contexts/__tests__/AuthContext.test.tsx` - Add race condition tests

## Related Issues

- GitHub Issue: #XXX (if applicable)
- Similar bugs in other auth systems: Supabase community forums discuss this pattern
