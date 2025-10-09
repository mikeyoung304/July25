# Authentication v6.0 - Testing Checklist

## ✅ Status: Code Complete, Ready for Testing

**Commit**: `93055bc` - refactor: migrate to pure supabase auth and remove race conditions

---

## What Was Fixed

### The Problem
- Demo login flow was broken due to **race condition** between:
  1. Backend login response
  2. Supabase session persistence
  3. Page navigation
  4. Auth context initialization on new page

### The Solution
- **Removed backend `/login` dependency** - frontend authenticates directly with Supabase
- **Removed 5-second timeout bandaid** - no longer needed
- **Simplified auth flow** - single source of truth (Supabase)
- **Better error handling** - clear logs for debugging

### Changes Made
1. `client/src/contexts/AuthContext.tsx`:
   - `login()` now calls `supabase.auth.signInWithPassword()` directly
   - `loginAsDemo()` simplified to use standard `login()`
   - `initializeAuth()` enhanced with better logging
   - Removed timeout hack

2. Documentation:
   - `docs/AUTHENTICATION_ARCHITECTURE.md` - full architecture guide
   - `docs/MIGRATION_V6_AUTH.md` - migration guide and troubleshooting

---

## Testing Instructions

### Prerequisites

**1. Ensure dev servers are running**:
```bash
npm run dev
# Should show:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3001
```

**2. Verify environment variables**:
```bash
# Frontend (client/.env)
cat client/.env | grep VITE_DEMO_PANEL
# Should show: VITE_DEMO_PANEL=1

# Backend (server/.env)
cat server/.env | grep SUPABASE_JWT_SECRET
# Should have value (not empty)
```

---

## Manual Test Cases

### Test 1: Demo Login (Server Role)
**Goal**: Verify demo login works without errors

**Steps**:
1. Open http://localhost:5173 in **incognito window**
2. Open browser console (F12)
3. Click "Server" demo button
4. Observe console logs

**Expected Results**:
- ✅ See log: `🔐 Attempting Supabase login`
- ✅ See log: `✅ Supabase authentication successful`
- ✅ See log: `✅ Login complete`
- ✅ Redirect to `/server` page
- ✅ Top-right badge shows "server Authenticated"
- ✅ NO "Auth loading timeout" warning
- ✅ NO redirect to `/unauthorized`

**If Failed**: Check `docs/MIGRATION_V6_AUTH.md` troubleshooting section

---

### Test 2: Session Persistence
**Goal**: Verify session survives page refresh

**Steps**:
1. After Test 1 (logged in as server)
2. Press F5 to refresh page
3. Observe console logs

**Expected Results**:
- ✅ See log: `🔄 Initializing auth context...`
- ✅ See log: `✅ Found existing Supabase session`
- ✅ See log: `✅ User authenticated`
- ✅ Still on `/server` page (not redirected)
- ✅ Still see "server Authenticated" badge
- ✅ Page loads < 2 seconds

**If Failed**: Check localStorage in browser console:
```javascript
localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token')
// Should return JSON with access_token
```

---

### Test 3: Authorization (Role-Based Access)
**Goal**: Verify role checks work correctly

**Steps**:
1. Logged in as "Server" (from Test 1)
2. Manually navigate to: http://localhost:5173/manager
3. Observe behavior

**Expected Results**:
- ✅ See log: `🔐 Authorization check` with `canAccess: false`
- ✅ Redirect to `/unauthorized` page
- ✅ See "Access Denied" message

**Additional Tests**:
- Navigate to `/server` → ✅ Should work (server role has access)
- Navigate to `/kitchen` → ❌ Should be denied (server role lacks access)

---

### Test 4: Logout
**Goal**: Verify logout clears session

**Steps**:
1. Logged in as any role
2. Click logout button (top-right)
3. Check browser console + localStorage

**Expected Results**:
- ✅ Redirect to `/login` page
- ✅ "Authenticated" badge disappears
- ✅ Console log: `Logout successful`
- ✅ localStorage cleared:
  ```javascript
  localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token')
  // Should return null
  ```

---

### Test 5: Multiple Roles
**Goal**: Verify different roles work correctly

**Steps**:
1. Logout (if logged in)
2. Click "Manager" demo button
3. Check you're on `/` (dashboard)
4. Logout
5. Click "Kitchen" demo button
6. Check you're on `/kitchen`

**Expected Results**:
- ✅ Manager → Dashboard (`/`)
- ✅ Server → Server view (`/server`)
- ✅ Kitchen → Kitchen view (`/kitchen`)
- ✅ Expo → Expo view (`/expo`)
- ✅ Each login shows correct role in badge

---

### Test 6: Network Conditions
**Goal**: Verify behavior when backend is slow/unreachable

**Steps**:
1. In Chrome DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Try logging in as "Server"
4. Observe behavior

**Expected Results**:
- ✅ Loading spinner appears
- ✅ Login completes (may take 10-15 seconds)
- ✅ NO timeout warning after 5 seconds
- ✅ Eventually redirects to `/server`

**If hangs**: Check backend logs for errors

---

## Console Logs Reference

### Normal Login Flow
```
🔐 Attempting Supabase login {email: "server@restaurant.com", restaurantId: "11111111-..."}
✅ Supabase authentication successful
[httpClient] Using Supabase session token for API request
✅ Login complete {email: "server@restaurant.com", role: "server", scopes: ["orders.write", "tables.write"]}
🚀 Navigating to /server
```

### Session Restoration (Page Refresh)
```
🔄 Initializing auth context...
✅ Found existing Supabase session
[httpClient] Using Supabase session token for API request
✅ User authenticated {role: "server"}
✅ Auth initialization complete
```

### Authorization Check
```
🔐 canAccess check {userRole: "server", userScopes: ["orders.write", "tables.write"], requiredRoles: ["owner", "manager"], hasRequiredRole: false, result: false}
🔐 Authorization check {path: "/manager", requiredRoles: ["owner", "manager"], canAccess: false}
Access denied: Insufficient permissions {path: "/manager", requiredRoles: ["owner", "manager"]}
```

---

## Known Issues (Expected Behavior)

### 1. WebSocket Warnings
You may see:
```
WebSocket heartbeat timeout - connection may be dead
```
**Status**: Not related to auth fix - separate issue
**Impact**: None - WebSocket reconnects automatically

### 2. Analytics 400 Error
You may see:
```
POST /api/v1/analytics/performance 400 (Bad Request)
```
**Status**: Not related to auth fix - analytics endpoint issue
**Impact**: None - doesn't affect auth or core functionality

### 3. Preload Warnings
You may see:
```
<link rel=preload> uses an unsupported `as` value
```
**Status**: Vite build optimization warning
**Impact**: None - purely cosmetic

---

## Troubleshooting

### Issue: Login fails with "Invalid email or password"

**Possible Causes**:
1. Demo users not seeded in Supabase
2. Wrong Supabase credentials in `.env`

**Solution**:
```bash
# Check if demo users exist
# Go to Supabase Dashboard → Authentication → Users
# Should see: server@restaurant.com, manager@restaurant.com, etc.

# If missing, re-seed:
cd server
npm run seed:demo-users
```

---

### Issue: "Failed to fetch user details" after login

**Cause**: Backend `/api/v1/auth/me` endpoint failed

**Solution**:
```bash
# Check backend is running
curl http://localhost:3001/api/v1/health

# Check backend logs for JWT validation errors
# Look for: "Token verification failed" or "Invalid token"

# Verify JWT secret matches Supabase
# Backend .env SUPABASE_JWT_SECRET must match:
# Supabase Dashboard → Settings → API → JWT Secret
```

---

### Issue: Still seeing "Auth loading timeout" warning

**Cause**: You didn't pull latest code

**Solution**:
```bash
git pull origin main
npm install
npm run dev
```

---

## Success Criteria

All tests pass when:

- [x] ✅ Code changes committed (93055bc)
- [ ] ⏳ Test 1: Demo login works
- [ ] ⏳ Test 2: Session persists after refresh
- [ ] ⏳ Test 3: Authorization checks work
- [ ] ⏳ Test 4: Logout clears session
- [ ] ⏳ Test 5: All roles work correctly
- [ ] ⏳ Test 6: Handles slow network

**Once all tests pass**: Ready for deployment!

---

## Next Steps

### Immediate (You)
1. Run through all 6 manual tests above
2. Check off items in "Success Criteria"
3. Report any failures in GitHub issue

### Short-term (After Testing)
1. Deploy to staging environment
2. Test with real data
3. Deploy to production

### Long-term (Future Improvements)
1. Add automated E2E tests (Playwright)
2. Add session monitoring/analytics
3. Consider adding 2FA for owner accounts

---

## Documentation

- **Architecture**: `docs/AUTHENTICATION_ARCHITECTURE.md`
- **Migration Guide**: `docs/MIGRATION_V6_AUTH.md`
- **Code**: `client/src/contexts/AuthContext.tsx` (see inline comments)

---

## Support

If tests fail or you encounter issues:

1. **Check browser console** for error logs
2. **Check backend logs** for API errors
3. **Check Supabase logs** (Dashboard → Logs → Auth)
4. **Review docs**: `docs/MIGRATION_V6_AUTH.md` troubleshooting section
5. **Create GitHub issue** with:
   - Test case that failed
   - Browser console logs
   - Backend logs
   - Steps to reproduce

---

**Status**: ✅ Ready for testing
**Estimated testing time**: 15-20 minutes
**Blocker**: None - all code changes complete
