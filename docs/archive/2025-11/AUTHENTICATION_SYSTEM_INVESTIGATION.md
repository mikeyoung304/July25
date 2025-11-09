# COMPREHENSIVE AUTHENTICATION SYSTEM INVESTIGATION REPORT

**Investigation Date:** November 8, 2025  
**Scope:** Complete auth flow, session management, token handling, protected routes  
**Status:** THOROUGH ANALYSIS COMPLETE

---

## EXECUTIVE SUMMARY

The authentication system has a **well-architected foundation** with proper separation of concerns, but contains **several critical race conditions and potential blocking operations** that can cause:

1. **Sign-in freezes** after successful login before navigation
2. **Subsequent page load hangs** due to auth state check loops
3. **Race conditions** between manual and automatic state management
4. **Blocking logout operations** with 5-second timeout
5. **Modal state mismatches** causing permission display bugs

**Risk Level: MEDIUM-HIGH** for user-facing freezes and UX issues

---

## 1. COMPLETE AUTHENTICATION FLOW

### 1.1 Sign-In Flow (Email/Password)

```
User clicks "Sign In" (Login.tsx:35)
    ↓
AuthContext.login() [line 183-242]
    ├─ Step 1: supabase.auth.signInWithPassword() [line 191]
    │   └─ Triggers Supabase SIGNED_IN event (async)
    │
    ├─ Step 2: httpClient.get('/api/v1/auth/me') [line 211]
    │   └─ Waits for backend to return user details
    │
    ├─ Step 3: setUser() [line 223]
    │   └─ Updates React state immediately
    │
    └─ setIsLoading(false) [line 240]
        └─ Signals UI that login is complete

WHILE STEP 2 IS RUNNING (PARALLEL):
    ↓
Supabase SIGNED_IN event fires [line 131]
    ├─ onAuthStateChange listener triggered [line 134]
    │   ├─ httpClient.get('/api/v1/auth/me') [line 141] ← DUPLICATE CALL
    │   └─ setUser() [line 149] ← DUPLICATE STATE UPDATE
    │
    └─ Potential race: Two async fetches competing to setUser()

Navigator navigates [Login.tsx:40]
    └─ Redirect to /dashboard (or intended destination)
```

**Backend Auth Endpoints Called:**
- `POST /api/v1/auth/login` → Returns `user`, `session`, `restaurantId`
- `GET /api/v1/auth/me` → Returns `user`, `restaurantId` (called 1-2x during login)

### 1.2 PIN-Based Login Flow

```
User enters PIN (PinLogin.tsx:29)
    ↓
AuthContext.loginWithPin() [line 245-284]
    ├─ httpClient.post('/api/v1/auth/pin-login', {pin, restaurantId}) [line 248]
    │   └─ Backend validates PIN against bcrypt hash
    │   └─ Returns: {user, token, expiresIn, restaurantId}
    │
    ├─ setUser() [line 258]
    ├─ setSession() [line 268] 
    │   └─ JWT token stored in state (NOT Supabase)
    │
    └─ localStorage.setItem('auth_session', {...}) [line 271]
        └─ Persists PIN session to localStorage (no Supabase involved)

Navigator navigates [PinLogin.tsx:34]
    └─ Redirect to /server
```

**Key Difference:** PIN auth does NOT trigger Supabase onAuthStateChange, uses localStorage instead

### 1.3 Station Login Flow

```
Manager initiates station login (StationLogin.tsx)
    ↓
AuthContext.loginAsStation() [line 287-334]
    ├─ Requires existing authentication (manager must be logged in first)
    ├─ httpClient.post('/api/v1/auth/station-login', {...}) [line 290]
    │   └─ Backend creates JWT token for kitchen/expo station
    │
    ├─ setUser() with synthetic station user [line 309]
    ├─ setSession() with expiresAt [line 318]
    │
    └─ localStorage.setItem('auth_session', {...}) [line 321]
        └─ Persists station session to localStorage
```

**Backend Endpoints:**
- `POST /api/v1/auth/pin-login` (line 250)
- `POST /api/v1/auth/station-login` (line 290, requires authentication)

### 1.4 Session Initialization on App Load

```
App Component Mounts [App.tsx]
    ↓
AuthProvider useEffect [AuthContext.tsx:63-180]
    ├─ initializeAuth() [line 64]
    │   ├─ supabase.auth.getSession() [line 69]
    │   │   └─ Checks Supabase session cookie
    │   │
    │   ├─ If Supabase session exists:
    │   │   └─ httpClient.get('/api/v1/auth/me') [line 76]
    │   │       └─ Fetch user details from backend
    │   │
    │   ├─ Else if NO Supabase session:
    │   │   └─ localStorage.getItem('auth_session') [line 99]
    │   │       └─ Check for PIN/station session
    │   │
    │   └─ setIsLoading(false) [line 124]
    │
    └─ Subscribe to auth events [line 131]
        └─ Listen for SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED events

ProtectedRoute checks [ProtectedRoute.tsx:34-56]
    ├─ If isLoading === true → Show loading spinner
    ├─ If isLoading === false && !isAuthenticated → Redirect to /login
    └─ If isAuthenticated && hasPermission → Render children
```

---

## 2. CRITICAL ISSUES IDENTIFIED

### ISSUE #1: DUAL STATE MANAGEMENT RACE CONDITION ⚠️ CRITICAL

**Location:** `AuthContext.tsx` lines 131-175 vs 183-242

**Problem:** Both `login()` method AND `onAuthStateChange` listener call the same endpoint and update the same state:

```typescript
// Location A: login() method (lines 211-230)
const response = await httpClient.get('/api/v1/auth/me');
setUser(response.user);                    // ← Manual update
setRestaurantId(response.restaurantId);
setSession({...});

// Location B: onAuthStateChange listener (lines 141-156)
const response = await httpClient.get('/api/v1/auth/me');
setUser(response.user);                    // ← Duplicate update
setRestaurantId(response.restaurantId);
setSession({...});
```

**Race Condition Scenario:**
1. User calls `login()` → Supabase fires SIGNED_IN event
2. Race: `/auth/me` calls execute in parallel
3. Whichever completes last wins the state update
4. If onAuthStateChange response is OLDER, state gets stale user data

**Impact:**
- WorkspaceAuthModal shows wrong user email (documented bug in auth-state-bug-analysis.md)
- Permission checks use stale role data
- Subsequent navigation to protected routes may fail

**Code Evidence:**
```typescript
// AuthContext.tsx:183-242 - login() method
const login = async (email: string, password: string, restaurantId: string) => {
  logger.info('🔐 login() START', { email, restaurantId });
  setIsLoading(true);
  try {
    const { data: authData } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // FETCH #1: This call completes and sets user state
    const response = await httpClient.get('/api/v1/auth/me');
    setUser(response.user);                          // ← Manual state update
    setRestaurantId(response.restaurantId);
    setSession({
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in,
      expiresAt: authData.session.expires_at
    });

    logger.info('✅ login() COMPLETE');
  } finally {
    setIsLoading(false);
  }
};

// AuthContext.tsx:131-175 - onAuthStateChange listener
const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    try {
      // FETCH #2: This also calls the same endpoint
      const response = await httpClient.get('/api/v1/auth/me');
      setUser(response.user);                        // ← Automatic update (duplicate!)
      setRestaurantId(response.restaurantId);
      setSession({...});
    } catch (error) {
      logger.error('❌ onAuthStateChange: Failed to fetch user details:', error);
    }
  }
});
```

**Root Cause:** Design assumes only ONE code path should manage login state, but both manual and automatic paths exist

---

### ISSUE #2: BLOCKING LOGOUT WITH 5-SECOND TIMEOUT ⚠️ HIGH

**Location:** `AuthContext.tsx` lines 337-382

**Problem:** Logout operation has a hard 5-second timeout that blocks state clearing:

```typescript
const logout = async () => {
  setIsLoading(true);
  try {
    // 5-second blocking operation
    const signOutPromise = supabase.auth.signOut();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Logout timeout')), 5000)  // ← 5 second block
    );

    try {
      await Promise.race([signOutPromise, timeoutPromise]);  // ← Waits up to 5 seconds
      logger.info('✅ Supabase signOut complete');
    } catch (timeoutError) {
      logger.warn('⚠️ Supabase signOut timed out, forcing local cleanup');
    }

    // Local cleanup happens AFTER the 5-second timeout
    setUser(null);
    setSession(null);
    setRestaurantId(null);
    localStorage.removeItem('auth_session');
  } finally {
    setIsLoading(false);
  }
};
```

**Blocking Timeline:**
```
User clicks logout
    ↓ (0ms)
supabase.auth.signOut() starts
    ↓
Promise.race() waits...
    ├─ If signOut completes in <5 seconds: ✅ Immediate
    └─ If signOut hangs: ⏳ WAITS 5 SECONDS before timeout
    
State clearing happens ONLY AFTER race completes
```

**Why This Causes Freezes:**
1. If Supabase WebSocket cleanup hangs, UI is unresponsive for 5 seconds
2. setIsLoading(false) is delayed
3. User sees frozen logout button
4. Navigation is blocked until cleanup completes

**Network Condition Scenario:**
- Poor network connection
- WebSocket disconnect hangs
- Supabase.auth.signOut() waits for cleanup
- 5-second timeout fires
- State finally clears (but user waited 5+ seconds)

---

### ISSUE #3: ISLOADING KEEPS UI FROZEN DURING AUTH CHECKS ⚠️ MEDIUM

**Location:** `ProtectedRoute.tsx` lines 34-44

**Problem:** While `isLoading === true`, ProtectedRoute shows loading spinner indefinitely:

```typescript
if (isLoading) {
  logger.info('🔄 ProtectedRoute: Auth still loading...', { path: location.pathname });
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="text-gray-600 text-sm">Checking authentication...</p>
      </div>
    </div>
  );
}
```

**Timeline of isLoading State:**

```
User at /dashboard (protected route)
    ↓
ProtectedRoute renders, calls useAuth()
    ├─ isLoading === true initially [line 55]
    ├─ Shows spinner [line 37-42]
    │
    └─ Waits for AuthContext to set isLoading = false

AuthContext.login() [line 183]
    └─ setIsLoading(true) [line 185]
    ├─ supabase.auth.signInWithPassword() [line 191]
    ├─ httpClient.get('/api/v1/auth/me') [line 211] ← Can take 1-2 seconds
    └─ setIsLoading(false) [line 240]

User navigates BEFORE setIsLoading(false)
    └─ New ProtectedRoute ALSO sees isLoading=true
    └─ Shows spinner on new page

Freeze Duration: Duration of /auth/me API call (1-2 seconds typical, can be longer)
```

**Problematic Flow:**

1. `isLoading` is set to `true` for ALL operations
2. Any error or slow network keeps `isLoading` in true state
3. No timeout or max loading time
4. If `/auth/me` hangs, loading spinner never goes away

**Evidence from Code:**

```typescript
// AuthContext.tsx line 55
const [isLoading, setIsLoading] = useState(true);  // Starts true

// AuthContext.tsx line 183-240
const login = async (email: string, password: string, restaurantId: string) => {
  logger.info('🔐 login() START', { email, restaurantId });
  setIsLoading(true);  // ← Set to true
  try {
    // ... network requests ...
    const response = await httpClient.get('/api/v1/auth/me');  // ← Can hang
  } finally {
    setIsLoading(false);  // ← Only set to false here (in finally block)
  }
};
```

---

### ISSUE #4: ONLOAD AUTH INITIALIZATION DOESN'T TIMEOUT ⚠️ MEDIUM

**Location:** `AuthContext.tsx` lines 63-180 (useEffect)

**Problem:** Initial auth check has no timeout:

```typescript
useEffect(() => {
  const initializeAuth = async () => {
    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();  // ← No timeout
      
      if (supabaseSession) {
        const response = await httpClient.get('/api/v1/auth/me');  // ← No timeout
        setUser(response.user);
      }
    } finally {
      setIsLoading(false);  // ← Only happens after all requests
    }
  };
  
  initializeAuth();
}, []);
```

**Problematic Scenario:**

```
App loads
    ↓
AuthProvider useEffect runs [line 63]
    ├─ supabase.auth.getSession() [line 69]
    │   └─ If Supabase backend unresponsive: ⏳ HANGS INDEFINITELY
    │
    └─ setIsLoading(false) never called
        └─ App stuck on splash screen / loading spinner

Total freeze time: Until browser timeout (30-60 seconds) or manual page reload
```

**Impact:**
- User opens app, sees loading spinner
- Backend is slow/down
- App never loads
- No error message or retry

---

### ISSUE #5: RACE CONDITION BETWEEN LOGOUT AND LOGIN ⚠️ MEDIUM-HIGH

**Location:** `AuthContext.tsx` lines 337-382 + 131-175

**Problem:** onAuthStateChange SIGNED_OUT event can execute AFTER login has started:

```typescript
// Scenario:
1. User logs in as manager@restaurant.com
2. User clicks logout button
   └─ logout() calls supabase.auth.signOut() [line 344]
   └─ BUT setUser(null) happens BEFORE Supabase event [line 364]

3. Before Supabase event finishes, user clicks login with expo@restaurant.com
   └─ login() calls supabase.auth.signInWithPassword() [line 191]
   └─ Triggers new SIGNED_IN event

4. Meanwhile, OLD SIGNED_OUT event finally fires [line 160-175]
   └─ onAuthStateChange executes: setUser(null) [line 162]
   └─ OVERWRITES the expo@ user with null!

5. Browser shows: No user authenticated (blank screen)
6. Then SIGNED_IN fires again
   └─ restores expo@ user

Result: Brief flicker, potential state inconsistency
```

**Timeline:**
```
t=0ms:   logout() starts
t=50ms:  supabase.auth.signOut() called (async)
t=100ms: setUser(null) happens (immediate)
t=150ms: login() called with new credentials
t=200ms: supabase.auth.signInWithPassword() fires (new event)
t=300ms: NEW SIGNED_IN event fires → setUser(newUser)
t=400ms: OLD SIGNED_OUT event fires → setUser(null) ❌ OVERWRITES
t=500ms: SIGNED_IN event fires again → setUser(newUser) ✅ recovers
```

---

### ISSUE #6: RESTAURANT ID MIGHT NOT SYNC WITH AUTH ⚠️ MEDIUM

**Location:** `AuthContext.tsx` lines 80-81, 150, 224, 259, 310

**Problem:** Restaurant ID set multiple places, no guarantee it matches authenticated restaurant:

```typescript
// During login, restaurantId comes from:
// 1. Frontend parameter (user selects it) [line 183]
setRestaurantId(response.restaurantId);  // ← Comes from /auth/me response

// During PIN login:
setRestaurantId(response.restaurantId);  // ← Comes from PIN login response

// httpClient uses this for X-Restaurant-ID header
httpClient.get('/api/v1/auth/me', {
  headers: { 'x-restaurant-id': restaurantId }  // ← Must match user's restaurant
});
```

**Race Condition:**
1. User logs in to restaurant "grow"
2. restaurantId set to "grow"
3. User switches restaurants (changes X-Restaurant-ID header)
4. onAuthStateChange fires
5. setRestaurantId() is called with different value
6. API calls now use wrong restaurant context

**Result:** User authenticated to wrong restaurant

---

### ISSUE #7: MODAL SHOWS PREVIOUS USER AFTER QUICK LOGOUT/LOGIN ⚠️ MEDIUM

**Location:** `WorkspaceDashboard.tsx` lines 44-56

**Problem:** Modal has 150ms delay before navigation, but component might capture stale user:

```typescript
const handleSuccess = () => {
  closeModal()
  // CRITICAL: Add small delay to allow React state update to propagate
  // The login() function calls setUser(), but React state updates are async
  // Without this delay, ProtectedRoute might check canAccess() before user state updates
  if (intendedDestination) {
    setTimeout(() => {
      navigate(intendedDestination)
    }, 150)  // ← 150ms delay for state propagation
  }
}
```

**Issue:** The delay assumes 150ms is enough, but:
- Race conditions can take longer to resolve
- Multiple rapid logins can bypass this
- Modal component might still show stale user email

---

## 3. SESSION MANAGEMENT ANALYSIS

### Token Refresh Flow

```typescript
// AuthContext.tsx lines 483-519 (Auto-refresh logic)
useEffect(() => {
  if (!session?.expiresAt || !session.refreshToken) return;

  // Calculate when to refresh (5 minutes before expiry)
  const refreshTime = (session.expiresAt - 300) * 1000 - Date.now();

  if (refreshTime <= 0) {
    // Token already expired
    refreshSession().catch(() => logout());
    return;
  }

  // Schedule single refresh via ref
  refreshTimerRef.current = setTimeout(() => {
    refreshSession().catch(error => {
      logger.error('Auto-refresh failed:', error);
      logout();  // ← Logs out on refresh failure
    });
  }, refreshTime);
}, [session?.expiresAt, session?.refreshToken, refreshSession]);
```

**Token Lifecycle:**
1. Login → Token received with `expiresAt` timestamp
2. 5 minutes before expiry → `refreshSession()` called automatically
3. `POST /api/v1/auth/refresh` endpoint called with refresh token
4. New tokens received → State updated
5. On failure → User logged out automatically

**Potential Issues:**
- If refresh fails, automatic logout happens (no retry)
- User loses session without warning
- PIN/station sessions don't use refresh tokens (12-hour hard expiry)

---

## 4. PROTECTED ROUTE ANALYSIS

### Route Protection Logic

```typescript
// ProtectedRoute.tsx lines 23-96
export function ProtectedRoute({
  children,
  requiredRoles = [],
  requiredScopes = [],
  fallbackPath = '/',
  requireAuth = true
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, canAccess, user } = useAuth();
  
  // 1. Check if still loading
  if (isLoading) {
    return <LoadingSpinner />;  // ← Can indefinitely freeze here
  }

  // 2. Check authentication
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={fallbackPath} />;  // ← Redirect to login
  }

  // 3. Check authorization (roles/scopes)
  if (requiredRoles.length > 0 || requiredScopes.length > 0) {
    const canAccessResult = canAccess(requiredRoles, requiredScopes);
    
    if (!canAccessResult) {
      return <Navigate to="/unauthorized" />;  // ← Redirect to unauthorized page
    }
  }

  return <>{children}</>;  // ← Render component
}
```

**Issue:** No timeout for loading state - if AuthContext never sets `isLoading = false`, page is frozen indefinitely

---

## 5. TOKEN STORAGE ANALYSIS

### Supabase (Email/Password) Auth

**Storage Location:** Supabase internal session management + browser cookies
- Access token stored in `supabase.auth` session
- Refresh token stored in `supabase.auth` session
- Also stored in localStorage by Supabase JS client (configurable)

**Current Config:**
```typescript
// client/src/core/supabase.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// No explicit persistence config = auto-persist to localStorage
```

### PIN/Station Auth

**Storage Location:** `localStorage`
```typescript
// AuthContext.tsx line 271-275
localStorage.setItem('auth_session', JSON.stringify({
  user: response.user,
  session: sessionData,
  restaurantId: response.restaurantId
}));

// httpClient.ts lines 121-137 (fallback token retrieval)
const savedSession = localStorage.getItem('auth_session')
if (savedSession) {
  const parsed = JSON.parse(savedSession)
  if (parsed.session?.accessToken && parsed.session?.expiresAt) {
    if (parsed.session.expiresAt > Date.now() / 1000) {
      headers.set('Authorization', `Bearer ${parsed.session.accessToken}`)
    }
  }
}
```

**Security Concerns:**
- Tokens stored in localStorage (vulnerable to XSS)
- No token rotation for PIN auth
- 12-hour hard expiry (no refresh capability)
- PIN tokens include plaintext email (information disclosure)

---

## 6. SUPABASE EVENT HANDLERS

### Event Types Handled

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN') {
    // ✅ Fetch user from /auth/me and update state
  } else if (event === 'SIGNED_OUT') {
    // ✅ Clear all user state
  } else if (event === 'TOKEN_REFRESHED') {
    // ✅ Update session tokens
  }
})
```

**Missing Events:**
- No handler for `USER_DELETED`
- No handler for `PASSWORD_RECOVERY`
- No handler for `MFA_CHALLENGE_VERIFIED`

---

## 7. RACE CONDITION SCENARIOS

### Scenario A: Rapid Navigation After Login

```
User clicks login button
    ↓ (0ms)
login() starts
    ├─ isLoading = true
    ├─ supabase.auth.signInWithPassword() [~100ms network]
    └─ httpClient.get('/auth/me') [~200ms network]

User immediately clicks something (before setIsLoading = false)
    ↓ (50ms)
ProtectedRoute component renders with isLoading = true
    └─ Shows loading spinner

User waits...
    ↓ (300ms)
Both requests complete
    ├─ setUser(response.user)
    ├─ setSession(session)
    └─ setIsLoading(false)

ProtectedRoute re-renders
    ├─ isLoading = false
    ├─ isAuthenticated = true
    ├─ canAccess check [calls user?.role]
    └─ Renders component

Result: 300ms+ freeze, blank screen during loading
```

### Scenario B: onAuthStateChange Overwrites Login State

```
login() fetches /auth/me → returns user = {email: "expo@restaurant.com", role: "expo"}
    ↓ (concurrent)
onAuthStateChange SIGNED_IN fires → also fetches /auth/me

Race winner sends first response (e.g., slower onAuthStateChange)
    └─ Returns OLD USER (e.g., {email: "kitchen@restaurant.com", role: "kitchen"})
    └─ Overwrites state: setUser(oldUser)

Result: Wrong user displayed despite successful login
```

### Scenario C: Logout Timeout → Login Race

```
User clicks logout
    ↓ (0ms)
logout() starts
    ├─ setIsLoading(true)
    └─ supabase.auth.signOut() starts (async, no timeout)

WebSocket cleanup hangs in Supabase
    ↓ (50ms)
User immediately clicks "Try Again" button
    └─ login() called

User waits...
    ↓ (5000ms)
Original logout timeout fires
    ├─ Promise.race() rejects
    ├─ setUser(null) executes (clearing new login)
    └─ Crashes new login state

Result: Login state cleared by old logout timeout
```

---

## 8. AUTHENTICATION STATE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER AUTHENTICATION                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│  APP LOADS           │
│  (App.tsx)           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  AuthProvider useEffect [line 63]            │
│  ├─ supabase.auth.getSession() [line 69]    │
│  ├─ Check localStorage [line 99]             │
│  └─ setIsLoading(false) [line 124]          │
│                                              │
│  CONCURRENT: supabase.auth.onAuthStateChange│
│  ├─ Listens for SIGNED_IN/SIGNED_OUT/etc    │
│  └─ Auto-fetches /auth/me [line 141]        │
└──────────┬───────────────────────────────────┘
           │
           ├─ BRANCH A: User Authenticated ─────────────────────┐
           │  ├─ setUser(user) [line 80]                        │
           │  ├─ setSession(session) [line 82-87]              │
           │  ├─ setRestaurantId(restaurantId) [line 81]       │
           │  └─ isAuthenticated = true                         │
           │                                                     │
           ├─ BRANCH B: User Not Authenticated ────────────────┤
           │  ├─ Check localStorage [line 99]                   │
           │  ├─ If found: Restore PIN/station session          │
           │  └─ Else: user = null, isAuthenticated = false     │
           │                                                     │
           └─ BRANCH C: Error ──────────────────────────────────┤
              ├─ Log error [line 121]                            │
              └─ Clear session [line 237]                        │
                                                                 │
                                                                 │
┌───────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                                  │
└───────────────────────────────────────────────────────────────┘

User clicks "Sign In" (Login.tsx:35)
    │
    ▼
┌─────────────────────────────────────────────┐
│ login() [AuthContext line 183]              │
│ ├─ setIsLoading(true)                       │
│ ├─ supabase.auth.signInWithPassword() ◄─────┼─── TRIGGERS SIGNED_IN EVENT
│ │  └─ Returns: {session}                    │
│ ├─ httpClient.get('/auth/me') ◄─────┐       │
│ │  └─ Returns: {user, restaurantId} │       │
│ ├─ setUser(user) ◄──────────┤       │       │
│ ├─ setSession(session)      │       │       │
│ ├─ setRestaurantId(rid)     │       │       │
│ └─ setIsLoading(false)      │       │       │
└────────────┬────────────────┘       │       │
             │                       │       │
             │ CONCURRENT ───────────┘       │
             │                               │
             ▼                               │
   ProtectedRoute checks isLoading          │
   ├─ if true: Show spinner (FREEZE)        │
   ├─ if false: Check isAuthenticated       │
   ├─ if false: Navigate to /login          │
   └─ if true: Check canAccess()            │
                                            │
┌───────────────────────────────────────────┼─────┐
│ onAuthStateChange SIGNED_IN [line 131]    │     │
│ ├─ httpClient.get('/auth/me') ◄───────────┼─┐   │
│ │  └─ Returns: {user, restaurantId}       │ │   │
│ ├─ setUser(user) ◄─────────────────────┐  │ │   │
│ ├─ setSession(session)                 │  │ │   │
│ ├─ setRestaurantId(rid)                │  │ │   │
│ └─ (No isLoading change) ◄─────────────┼──┘ │   │
└────────────┬────────────────────────────────┘   │
             │                                    │
             │ RACE CONDITION ◄───────────────────┘
             │ Which /auth/me response wins?
             │ (Manual or Auto-listener)
             │
             ▼
ProtectedRoute checks permissions
    ├─ canAccess(requiredRoles, requiredScopes)
    │  └─ Uses user?.role (might be stale!)
    ├─ if true: Render protected component
    └─ if false: Navigate to /unauthorized

```

---

## 9. RECOMMENDATIONS & FIXES

### CRITICAL (Implement immediately)

1. **Remove duplicate /auth/me call** - Rely only on onAuthStateChange
2. **Add timeout to initial auth check** - Prevent indefinite loading
3. **Add timeout to isLoading state** - Auto-clear after 10 seconds
4. **Debounce rapid login/logout** - Prevent state race conditions

### HIGH (Implement next sprint)

5. **Remove logout timeout** - Use fallback instead of blocking
6. **Add error state to ProtectedRoute** - Show error instead of infinite spinner
7. **Validate restaurantId matches auth** - Prevent cross-restaurant access
8. **Add retry logic to /auth/me** - 3 attempts before failure

### MEDIUM (Plan for refactor)

9. **Consolidate token storage** - Decide on single source of truth
10. **Add session validation endpoint** - Check if token still valid
11. **Implement proper token refresh queue** - Prevent multiple refresh calls
12. **Add events for MFA/password reset** - Handle edge cases

---

## 10. TESTING RECOMMENDATIONS

### Unit Tests Needed

- [ ] Test login with slow /auth/me response (2+ seconds)
- [ ] Test rapid logout → login sequence
- [ ] Test onAuthStateChange race with manual login
- [ ] Test isLoading timeout (doesn't freeze after 10 seconds)
- [ ] Test restaurant ID validation on state update

### Integration Tests Needed

- [ ] Test full authentication flow with real API
- [ ] Test session persistence across page reloads
- [ ] Test session expiration and refresh
- [ ] Test logout with WebSocket cleanup hanging

### E2E Tests Needed

- [ ] Test sign in → navigation → page load flow
- [ ] Test sign out → immediate sign in
- [ ] Test switching between multiple workspaces
- [ ] Test rapid route changes during auth

---

## 11. CONCLUSION

The authentication system is **structurally sound** but has **race condition hazards** that can cause:

1. **UI Freezes** during sign-in due to isLoading state indefinitely true
2. **State Mismatches** when onAuthStateChange overwrites manual login state
3. **Navigation Hangs** while waiting for /auth/me to complete
4. **Blocking Operations** like the 5-second logout timeout

**Key Insight:** The system tries to handle auth in TWO places simultaneously (manual + automatic), which creates unpredictable race conditions.

**Primary Fix:** Consolidate to single path - either all manual or all automatic, not both.

