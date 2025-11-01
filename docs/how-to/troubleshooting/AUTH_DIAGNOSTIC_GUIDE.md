# Auth Diagnostic Guide - Server Login "Access Denied" Issue

**Last Updated:** 2025-10-31

## Problem
Clicking "Server" demo button on production (`https://july25-client.vercel.app`) shows "Access Denied"

## Diagnostic Steps

### Step 1: Check Browser Console
1. Open `https://july25-client.vercel.app` in **incognito**
2. Open DevTools (F12) → Console tab
3. Click "Server" button
4. **Look for these logs:**
   - `🔐 Attempting Supabase login`
   - `✅ Supabase authentication successful`
   - `✅ Login complete`
   - `🔐 canAccess check`
   - Any errors?

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Click "Server" button
3. **Find these requests:**
   - Request to Supabase (should be 200 OK)
   - `GET /api/v1/auth/me` (what status code?)
4. **Click on `/api/v1/auth/me`:**
   - Response tab: What does it return?
   - Headers tab: Is Authorization header present?

### Step 3: Check LocalStorage
After clicking "Server", run in browser console:
```javascript
// Check Supabase session
console.log(localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token'));

// Check if user object is set
// (You'll see this in React DevTools)
```

## Likely Issues & Fixes

### Issue 1: Demo Users Not in Production Database
**Symptom**: Supabase login succeeds but `/api/v1/auth/me` returns 404 or 403

**Fix**:
1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
-- Check if demo users exist
SELECT email, id FROM auth.users
WHERE email IN ('server@restaurant.com', 'manager@restaurant.com');

-- Check if they're in user_restaurants table
SELECT u.email, ur.role, ur.is_active
FROM auth.users u
JOIN user_restaurants ur ON u.id = ur.user_id
WHERE u.email = 'server@restaurant.com';
```

3. If missing, seed demo users in production

### Issue 2: VITE_DEMO_PANEL Not Set
**Symptom**: Demo buttons don't appear OR throw error "Demo login requires VITE_DEMO_PANEL=1"

**Fix**:
1. Go to Vercel Dashboard → july25-client → Settings → Environment Variables
2. Add: `VITE_DEMO_PANEL=1`
3. Redeploy

### Issue 3: Backend API Not Accessible
**Symptom**: `/api/v1/auth/me` fails with CORS error or 500

**Fix**:
1. Check Vercel environment has `VITE_API_BASE_URL` set correctly
2. Check backend is deployed and running
3. Check CORS configuration allows `july25-client.vercel.app`

### Issue 4: Role Mismatch
**Symptom**: Login succeeds but canAccess returns false

**Console should show**:
```
🔐 canAccess check {
  userRole: "server",  // ← Should be "server"
  requiredRoles: ["owner", "manager", "server"],
  hasRequiredRole: true,  // ← Should be true
  result: true  // ← Should be true
}
```

**If userRole is null/undefined**:
- `/api/v1/auth/me` didn't return proper user object
- Check backend logs

## Quick Test Commands

### Test Production Login API
```bash
# 1. Login and get token
curl -X POST https://your-backend.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"server@restaurant.com","password":"Demo123!","restaurantId":"11111111-1111-1111-1111-111111111111"}'

# 2. Use token to test /auth/me
curl https://your-backend.com/api/v1/auth/me \
  -H "Authorization: Bearer <token-from-step-1>"
```

### Check Vercel Environment Variables
```bash
vercel env ls --scope mikeyoung304-gmailcoms-projects
```

## Expected Working Flow

1. Click "Server" button
2. Console: `🔐 Attempting Supabase login {email: "server@restaurant.com"}`
3. Console: `✅ Supabase authentication successful`
4. Network: `GET /api/v1/auth/me` returns 200 with `{user: {role: "server", scopes: [...]}}`
5. Console: `✅ Login complete {role: "server"}`
6. Console: `🔐 canAccess check {userRole: "server", hasRequiredRole: true, result: true}`
7. **Redirect to `/server` page** ✅

## Next Steps After Diagnosis

1. Report back what you found in browser console
2. Share the response from `/api/v1/auth/me`
3. Confirm if demo users exist in production Supabase
4. We'll fix the root cause together
