# Restaurant OS v6.0 - Role & Permissions Audit Report
**Date:** 2025-10-06
**Issue:** Blank screen after login, unauthorized access errors

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** Missing `/unauthorized` route causes blank page when authorization fails.

**SYMPTOMS:**
1. Manager login → blank white page
2. Browser back button → see HomePage (colored blocks)
3. Click "Server" → "Unauthorized" error
4. Navigation issues suggest authorization failures

---

## System Architecture

### Authentication Flow
```
1. User clicks demo role → DevAuthOverlay.tsx
2. Calls login(email, password, restaurantId)
3. Backend: /api/v1/auth/login
4. Queries user_restaurants table for role
5. Returns: { user: { id, email, role }, session, restaurantId }
6. Frontend: stores user.role in AuthContext
7. Navigate to roleRoutes[role.id] (currently '/' for manager)
```

### Authorization Flow
```
1. User navigates to route
2. ProtectedRoute checks:
   a. isAuthenticated (user && session exist)
   b. canAccess(requiredRoles, requiredScopes)
3. canAccess logic:
   - hasRequiredRole = requiredRoles.length === 0 || requiredRoles.includes(user.role)
   - hasRequiredScope = !requiredScopes || requiredScopes.some(scope => user.scopes?.includes(scope))
   - return hasRequiredRole && hasRequiredScope
4. If fails → Navigate to "/unauthorized"
```

---

## Role Definitions (Database Schema)

### Valid Roles
Source: `supabase/migrations/20250130_auth_tables.sql:20`

```sql
role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'server', 'cashier', 'kitchen', 'expo'))
```

### Role-Based Permissions Matrix

| Role | API Scopes | Route Access |
|------|-----------|--------------|
| **owner** | ALL scopes (full system access) | ALL routes including AdminRoute |
| **manager** | All except `system:config` | ALL routes including AdminRoute (same as owner) |
| **server** | orders:*, payments:*, tables:manage | ServerRoute |
| **cashier** | orders:read, payments:* | (undefined - no route guard) |
| **kitchen** | orders:read, orders:status | KitchenRoute |
| **expo** | orders:read, orders:status | KitchenRoute |

**Update (2025-10-10):** Managers now have full admin access. For operational purposes, owners and managers have equivalent permissions.

---

## Route Protection Analysis

### Route Guard Definitions
**File:** `client/src/components/auth/ProtectedRoute.tsx:76-106`

```typescript
ManagerRoute  → requiredRoles: ['owner', 'manager']
ServerRoute   → requiredRoles: ['owner', 'manager', 'server']
KitchenRoute  → requiredRoles: ['owner', 'manager', 'kitchen', 'expo']
AdminRoute    → requiredRoles: ['owner']
```

### Protected Routes Map

| Route | Guard | Required Roles | Manager Access? |
|-------|-------|----------------|-----------------|
| `/` | ProtectedRoute | NONE (just auth) | ✅ YES |
| `/home` | ProtectedRoute | NONE (just auth) | ✅ YES |
| `/login` | Public | NONE | ✅ YES |
| `/dashboard` | ManagerRoute | owner, manager | ✅ YES |
| `/server` | ServerRoute | owner, manager, server | ✅ YES |
| `/kitchen` | KitchenRoute | owner, manager, kitchen, expo | ✅ YES |
| `/expo` | KitchenRoute | owner, manager, kitchen, expo | ✅ YES |
| `/admin` | AdminRoute | owner, manager | ✅ YES |
| `/performance` | ManagerRoute | owner, manager | ✅ YES |
| `/history` | ServerRoute | owner, manager, server | ✅ YES |
| `/kiosk` | Public | NONE | ✅ YES |
| `/order` | Public | NONE | ✅ YES |

---

## Critical Issues Found

### 🔴 CRITICAL: Missing `/unauthorized` Route

**File:** `client/src/components/auth/ProtectedRoute.tsx:63`

```typescript
// Redirect to unauthorized page or home
return <Navigate to="/unauthorized" replace />;
```

**Problem:** Route `/unauthorized` is **NOT DEFINED** in AppRoutes.tsx
**Effect:** User sees blank white page when authorization fails
**Fix:** Add unauthorized page OR change redirect to `/`

---

### 🟡 MEDIUM: Authorization Logic Issues

#### Issue 1: Empty Role Requirements Always Pass
**File:** `client/src/contexts/AuthContext.tsx:460-461`

```typescript
const hasRequiredRole = requiredRoles.length === 0 ||
                       requiredRoles.includes(user.role || '');
```

**Behavior:**
- If `requiredRoles = []` → always returns TRUE
- `/` and `/home` have `requiredRoles = []`
- **Manager SHOULD have access** (this is working correctly)

#### Issue 2: Scope Check Without Scopes
**File:** Same as above, line 464-466

```typescript
const hasRequiredScope = !requiredScopes ||
                        requiredScopes.length === 0 ||
                        requiredScopes.some(scope => hasScope(scope));
```

**Problem:** Frontend doesn't receive `scopes` from backend
**Backend Response:** (auth.routes.ts:183-188)
```typescript
user: {
  id: authData.user.id,
  email: authData.user.email,
  role: userRole.role  // ❌ NO SCOPES
}
```

**Impact:**
- Scope-based authorization FAILS
- Frontend `user.scopes` is UNDEFINED
- hasScope() returns FALSE for all scopes
- Routes requiring scopes will be blocked

---

### 🟢 LOW: Navigation Flow Issues

#### Current Flow (After Recent Fix)
```typescript
// DevAuthOverlay.tsx:98-104
const roleRoutes = {
  manager: '/',      // ✅ FIXED: Goes to HomePage (colored blocks)
  server: '/server',
  kitchen: '/kitchen',
  expo: '/expo',
  cashier: '/'       // ✅ FIXED: Goes to HomePage
};
```

**Expected Behavior:**
1. Login as manager
2. Navigate to `/`
3. ProtectedRoute checks: requireAuth=true, requiredRoles=[]
4. Manager is authenticated → PASS
5. No role requirements → PASS
6. Render HomePage with colored blocks

**Actual Behavior (Current):**
1. Login as manager ✅
2. Navigate to `/` ✅
3. ??? Something causes redirect or blank page

---

## Debugging Investigation Needed

### Required Data Collection

To diagnose the blank screen, we need to check:

1. **User Object After Login:**
   ```javascript
   // In browser console after login
   console.log(JSON.stringify(localStorage.getItem('auth_session'), null, 2))
   ```

   Expected output:
   ```json
   {
     "user": {
       "id": "...",
       "email": "manager@restaurant.com",
       "role": "manager"
     },
     "session": { ... },
     "restaurantId": "11111111-1111-1111-1111-111111111111"
   }
   ```

2. **Backend Role Query Result:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT ur.role, ur.is_active, au.email
   FROM user_restaurants ur
   JOIN auth.users au ON au.id = ur.user_id
   WHERE au.email = 'manager@restaurant.com'
   AND ur.restaurant_id = '11111111-1111-1111-1111-111111111111';
   ```

   Expected: `role: 'manager', is_active: true`

3. **Browser Console Logs:**
   Look for logger output:
   - "Login successful"
   - "Access denied: Not authenticated"
   - "Access denied: Insufficient permissions"

4. **Network Tab:**
   - Check `/api/v1/auth/login` response body
   - Check `/api/v1/auth/me` response (if called)

---

## Recommended Fixes

### Priority 1: Add Unauthorized Page
```typescript
// client/src/components/layout/AppRoutes.tsx

<Route path="/unauthorized" element={
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Unauthorized Access</h1>
      <p>You don't have permission to access this page.</p>
      <Link to="/" className="text-blue-500 underline mt-4">
        Return to Home
      </Link>
    </div>
  </div>
} />
```

### Priority 2: Include Scopes in Backend Response
```typescript
// server/src/routes/auth.routes.ts:183-195

// Fetch user scopes from role_scopes table
const { data: scopes } = await supabase
  .from('role_scopes')
  .select('scope_name')
  .eq('role', userRole.role);

res.json({
  user: {
    id: authData.user.id,
    email: authData.user.email,
    role: userRole.role,
    scopes: scopes?.map(s => s.scope_name) || []  // ✅ ADD THIS
  },
  session: { ... },
  restaurantId
});
```

### Priority 3: Add Logging to ProtectedRoute
```typescript
// client/src/components/auth/ProtectedRoute.tsx:54-65

if (requiredRoles.length > 0 || requiredScopes.length > 0) {
  const canAccessResult = canAccess(requiredRoles, requiredScopes);

  // 🔍 ADD DEBUG LOGGING
  logger.info('Authorization check:', {
    path: location.pathname,
    userRole: user?.role,
    requiredRoles,
    requiredScopes,
    canAccess: canAccessResult
  });

  if (!canAccessResult) {
    logger.warn('Access denied: Insufficient permissions', ...);
    return <Navigate to="/unauthorized" replace />;
  }
}
```

---

## Testing Checklist

### Manager Role Tests
- [ ] Login as manager@restaurant.com
- [ ] Verify redirect to `/` (HomePage with colored blocks)
- [ ] Click "Server" button → should load `/server` (has manager in requiredRoles)
- [ ] Click "Kitchen" button → should load `/kitchen` (has manager in requiredRoles)
- [ ] Click "Admin" button → should load `/admin` (manager now has access)
- [ ] Check browser console for auth logs
- [ ] Verify user.role === 'manager' in localStorage

### Other Roles Tests
- [ ] server@restaurant.com → can access `/server`, blocked from `/admin` (requires owner/manager role)
- [ ] kitchen@restaurant.com → can access `/kitchen`, blocked from `/server`
- [ ] cashier@restaurant.com → can access `/`, where should they go?

---

## Database Verification Queries

```sql
-- 1. Check if demo users exist
SELECT email, id FROM auth.users
WHERE email IN (
  'manager@restaurant.com',
  'server@restaurant.com',
  'kitchen@restaurant.com',
  'expo@restaurant.com',
  'cashier@restaurant.com'
);

-- 2. Check user_restaurants assignments
SELECT ur.role, ur.is_active, au.email
FROM user_restaurants ur
JOIN auth.users au ON au.id = ur.user_id
WHERE ur.restaurant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY ur.role;

-- 3. Check manager's scopes
SELECT rs.scope_name
FROM role_scopes rs
WHERE rs.role = 'manager'
ORDER BY rs.scope_name;

-- 4. Recent auth logs
SELECT event_type, au.email, created_at
FROM auth_logs al
JOIN auth.users au ON au.id = al.user_id
ORDER BY created_at DESC
LIMIT 10;
```

---

## Architecture Recommendations

### 1. Consolidate Dashboard Pages

**Current Confusion:**
- `/` → HomePage (big colored blocks)
- `/dashboard` → Dashboard (small card grid)

**Recommendation:** Pick ONE as the main landing page for managers

### 2. Role-Specific Landing Pages

```typescript
const roleRoutes = {
  owner: '/admin',      // Full control panel
  manager: '/',         // Main dashboard (HomePage)
  server: '/server',    // Table/order management
  kitchen: '/kitchen',  // Kitchen display
  expo: '/expo',        // Expo station
  cashier: '/cashier'   // ⚠️ MISSING - needs to be created
};
```

### 3. Centralized Permission Definitions

Create `client/src/config/permissions.ts`:
```typescript
export const ROUTE_PERMISSIONS = {
  '/': { requireAuth: true },
  '/dashboard': { roles: ['owner', 'manager'] },
  '/server': { roles: ['owner', 'manager', 'server'] },
  '/kitchen': { roles: ['owner', 'manager', 'kitchen', 'expo'] },
  '/admin': { roles: ['owner'] },
  // etc...
} as const;
```

---

## Next Steps

1. **Immediate:** Add `/unauthorized` route to fix blank page
2. **Short-term:** Add scopes to backend auth response
3. **Medium-term:** Add debug logging throughout auth flow
4. **Long-term:** Consolidate dashboard pages and create role-specific views

---

## Files Modified in Recent Session

1. `client/tailwind.config.js` - Added `macon-background: '#F7F3ED'`
2. `client/src/components/auth/DevAuthOverlay.tsx` - Changed manager route to `/`

---

## Contact for Further Investigation

If issues persist, provide:
1. Browser console logs (all messages)
2. Network tab screenshot of `/api/v1/auth/login` response
3. Result of localStorage.getItem('auth_session')
4. Result of Supabase SQL queries above
