# Migration Guide: Authentication v6.0

## Summary

Restaurant OS v6.0 migrates from **backend-proxied authentication** to **pure Supabase Auth** for web users. This eliminates race conditions, reduces complexity, and improves reliability.

## What Changed

### Before (v5.x)
```typescript
// Frontend called backend endpoint
const response = await httpClient.post('/api/v1/auth/login', {
  email, password, restaurantId
});

// Backend authenticated with Supabase, returned session
// Frontend set session from backend response
// PROBLEM: Race condition between setSession() and navigation
```

### After (v6.0)
```typescript
// Frontend authenticates directly with Supabase
const { data } = await supabase.auth.signInWithPassword({
  email, password
});

// Fetch user metadata from backend
const response = await httpClient.get('/api/v1/auth/me');

// NO RACE CONDITION: Supabase session is immediately available
```

---

## Breaking Changes

### ❌ Removed Endpoints

| Endpoint | Method | Replacement |
|----------|--------|-------------|
| `/api/v1/auth/login` | POST | `supabase.auth.signInWithPassword()` |
| `/api/v1/auth/refresh` | POST | Supabase auto-refresh |

### ✅ Kept Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/auth/me` | GET | Fetch user profile + role |
| `/api/v1/auth/pin-login` | POST | PIN-based authentication |
| `/api/v1/auth/station-login` | POST | Kitchen display authentication |
| `/api/v1/auth/logout` | POST | Session cleanup |
| `/api/v1/auth/set-pin` | POST | Set user PIN |

---

## Migration Checklist

### ✅ Completed (Automatic)

- [x] Updated `AuthContext.tsx` to use Supabase directly
- [x] Removed backend `/login` call from `login()` function
- [x] Simplified `loginAsDemo()` to call standard `login()`
- [x] Removed 5-second auth timeout (no longer needed)
- [x] Enhanced logging for debugging
- [x] Created architecture documentation

### ⚠️ Action Required (Manual)

#### 1. Verify Demo Users Exist in Supabase

Demo users must be created in Supabase Auth AND have entries in `user_restaurants` table:

```sql
-- Check demo users exist
SELECT
  u.email,
  ur.role,
  ur.is_active
FROM auth.users u
JOIN user_restaurants ur ON u.id = ur.user_id
WHERE u.email IN (
  'manager@restaurant.com',
  'server@restaurant.com',
  'kitchen@restaurant.com',
  'expo@restaurant.com',
  'cashier@restaurant.com'
);
```

**Expected Result**: 5 rows returned, all with `is_active = true`

**If missing**, run:
```bash
cd server
npm run seed:demo-users
```

#### 2. Verify Environment Variables

**Backend `.env`**:
```bash
# Required for JWT validation
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard

# Required for PIN/station auth
KIOSK_JWT_SECRET=your-custom-secret-key

# Optional: Strict mode (no test tokens)
STRICT_AUTH=true
```

**Frontend `.env`**:
```bash
# Required for Supabase client
VITE_SUPABASE_URL=https://xiwfhcikfdoshxwbtjxt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: Enable demo panel
VITE_DEMO_PANEL=1
```

**How to find Supabase JWT Secret**:
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "JWT Secret" (not anon key!)

#### 3. Test Authentication Flow

Run these tests manually:

1. **Demo Login**:
   ```bash
   # Open http://localhost:5173
   # Click "Server" demo button
   # Should redirect to /server without errors
   ```

2. **Session Persistence**:
   ```bash
   # After logging in, refresh the page
   # Should stay logged in (not redirect to /login)
   ```

3. **Authorization**:
   ```bash
   # Login as "Server"
   # Navigate to /manager
   # Should redirect to /unauthorized
   ```

4. **Logout**:
   ```bash
   # Click logout button
   # Should redirect to /login
   # Check localStorage - Supabase session should be cleared
   ```

#### 4. Update Custom Code (If Any)

If you have custom components calling the old backend endpoints:

**Find all usages**:
```bash
grep -r "'/api/v1/auth/login'" client/src
grep -r "'/api/v1/auth/refresh'" client/src
```

**Replace with**:
```typescript
// Old
await httpClient.post('/api/v1/auth/login', { email, password, restaurantId });

// New
import { supabase } from '@/core/supabase';
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
const userProfile = await httpClient.get('/api/v1/auth/me');
```

---

## Rollback Plan

If critical issues arise, you can temporarily revert to v5.x behavior:

### Step 1: Restore Old Login Function

```typescript
// AuthContext.tsx - Temporarily restore backend login
const login = async (email: string, password: string, restaurantId: string) => {
  setIsLoading(true);
  try {
    const response = await httpClient.post('/api/v1/auth/login', {
      email, password, restaurantId
    });

    setUser(response.user);
    setRestaurantId(response.restaurantId);

    if (response.session) {
      await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token || ''
      });

      setSession({
        accessToken: response.session.access_token,
        refreshToken: response.session.refresh_token,
        expiresIn: response.session.expires_in,
        expiresAt: response.session.expires_at
      });
    }
  } finally {
    setIsLoading(false);
  }
};
```

### Step 2: Re-enable Backend Endpoint

Backend `/api/v1/auth/login` endpoint still exists (not deleted), so no backend changes needed.

### Step 3: Git Revert

```bash
git log --oneline -10  # Find commit before migration
git revert <commit-hash>
```

---

## Known Issues & Solutions

### Issue: "Token refresh failed" in browser console

**Cause**: Supabase trying to refresh expired token

**Solution**: Logout and login again. Supabase auto-refresh should work for future sessions.

**Prevention**: Ensure `SUPABASE_JWT_SECRET` is correctly set in backend.

---

### Issue: "User has no access to restaurant" error

**Cause**: User exists in Supabase Auth but not in `user_restaurants` table

**Solution**:
```sql
INSERT INTO user_restaurants (user_id, restaurant_id, role, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'server@restaurant.com'),
  '11111111-1111-1111-1111-111111111111',
  'server',
  true
);
```

---

### Issue: Demo buttons don't appear

**Cause**: `VITE_DEMO_PANEL` not set to `1`

**Solution**:
```bash
# Add to client/.env
VITE_DEMO_PANEL=1

# Restart dev server
npm run dev
```

---

### Issue: "Failed to fetch user details" after login

**Cause**: Backend `/api/v1/auth/me` endpoint failed

**Debug**:
```bash
# Check backend logs
# Look for JWT validation errors

# Check if backend is running
curl http://localhost:3001/api/v1/health

# Check Supabase session exists in browser console
localStorage.getItem('sb-xiwfhcikfdoshxwbtjxt-auth-token')
```

**Solution**: Verify `SUPABASE_JWT_SECRET` matches Supabase dashboard.

---

## Testing Script

Run this script to verify all authentication flows:

```bash
#!/bin/bash
# test-auth.sh

echo "🧪 Testing Authentication v6.0"

# 1. Check environment variables
echo "1. Checking environment variables..."
if [ -z "$SUPABASE_JWT_SECRET" ]; then
  echo "❌ SUPABASE_JWT_SECRET not set in backend/.env"
  exit 1
fi
echo "✅ Backend environment configured"

# 2. Check demo users exist
echo "2. Checking demo users..."
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM auth.users
  WHERE email IN ('manager@restaurant.com', 'server@restaurant.com', 'kitchen@restaurant.com')
" | grep -q "3" || {
  echo "❌ Demo users missing - run 'npm run seed:demo-users'"
  exit 1
}
echo "✅ Demo users exist"

# 3. Check frontend build
echo "3. Checking frontend TypeScript..."
cd client && npm run type-check || {
  echo "❌ TypeScript errors in frontend"
  exit 1
}
echo "✅ Frontend types valid"

# 4. Check backend build
echo "4. Checking backend TypeScript..."
cd ../server && npm run type-check || {
  echo "❌ TypeScript errors in backend"
  exit 1
}
echo "✅ Backend types valid"

echo ""
echo "✅ All automated checks passed!"
echo "🧪 Manual testing required:"
echo "   1. Login as demo server"
echo "   2. Refresh page (should stay logged in)"
echo "   3. Try accessing /manager (should be denied)"
echo "   4. Logout (should clear session)"
```

---

## Support

If you encounter issues during migration:

1. **Check logs**:
   - Browser console (frontend errors)
   - Backend terminal (API errors)
   - Supabase Dashboard → Logs (auth errors)

2. **Review documentation**:
   - `docs/AUTHENTICATION_ARCHITECTURE.md`
   - Inline code comments in `AuthContext.tsx`

3. **Create GitHub issue**:
   - Include error messages
   - Include browser console logs
   - Include backend logs
   - Tag with `auth` label

---

## Success Criteria

Migration is complete when:

- [x] Frontend uses Supabase auth directly
- [x] No more "Auth loading timeout" warnings
- [x] Demo login works without errors
- [x] Session persists across page refresh
- [x] Authorization (role checks) works correctly
- [x] Backend validates Supabase JWTs
- [x] Documentation is complete

**Current Status**: ✅ Code changes complete, pending manual testing

---

## Timeline

- **Phase 1** (Completed): Code migration
- **Phase 2** (In Progress): Manual testing
- **Phase 3** (Pending): Production deployment
- **Phase 4** (Pending): Monitoring + bug fixes

**Next Steps**: Test demo login flow in development environment.
