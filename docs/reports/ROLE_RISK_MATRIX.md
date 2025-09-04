# Role Risk Matrix - RLS Readiness Assessment
Generated: 2025-09-03

## Executive Summary
With auth tables missing and all operations using service key, **NO roles will work with RLS enabled** until both migrations and code changes are applied.

## Role-by-Role Analysis

### 🟢 Owner Role
**Current State**: Works via service key bypass
**After Code Fix**: ✅ Will work
**After Migration**: ✅ Full functionality

**Requirements**:
1. User exists in auth.users (via email/password)
2. Entry in user_restaurants with role='owner'
3. Code uses req.userSupabase (not service key)

**Path to Success**:
- Apply auth tables migration
- Update code to use user client
- Test with real owner account

---

### 🟢 Manager Role
**Current State**: Works via service key bypass
**After Code Fix**: ✅ Will work
**After Migration**: ✅ Full functionality

**Requirements**: Same as Owner
**Operations Affected**:
- Floor plan management (tables)
- Menu updates
- Order management
- Reports access

---

### 🟡 Server Role
**Current State**: PIN auth creates Supabase session
**After Code Fix**: ⚠️ Should work if session valid
**After Migration**: ✅ Will work

**Requirements**:
1. User exists in auth.users
2. Entry in user_pins with PIN hash
3. Entry in user_restaurants with role='server'
4. PIN login returns real Supabase token

**Risk**: PIN auth implementation in `userService.authenticateWithPin()` needs verification

---

### 🟡 Cashier Role  
**Current State**: Same as Server (PIN auth)
**After Code Fix**: ⚠️ Should work if session valid
**After Migration**: ✅ Will work

**Requirements**: Same as Server
**Operations Affected**:
- Payment processing
- Order viewing
- Limited order updates

---

### 🔴 Kitchen Role
**Current State**: Station token (local JWT)
**After Code Fix**: ❌ WILL FAIL
**After Migration**: ❌ STILL FAILS

**Problem**: Not a real Supabase user, `auth.uid()` returns NULL

**Solutions**:
1. **Option A**: Create service accounts
   ```typescript
   // Create kitchen user in auth.users
   const { data } = await supabase.auth.admin.createUser({
     email: 'kitchen-station-1@restaurant.local',
     password: generateSecurePassword()
   });
   ```

2. **Option B**: Anonymous auth
   ```typescript
   const { data } = await supabase.auth.signInAnonymously();
   // Grant temporary kitchen permissions
   ```

3. **Option C**: Proxy pattern (keep service key)
   ```typescript
   // Special route for stations only
   if (req.user.type === 'station') {
     req.userSupabase = supabaseAdmin; // Bypass RLS
   }
   ```

---

### 🔴 Expo Role
**Current State**: Station token (local JWT)
**After Code Fix**: ❌ WILL FAIL
**After Migration**: ❌ STILL FAILS

**Problem**: Same as Kitchen
**Solutions**: Same as Kitchen

---

### 🔴 Customer/Kiosk Role
**Current State**: Demo JWT (local)
**After Code Fix**: ❌ WILL FAIL
**After Migration**: ❌ STILL FAILS

**Problem**: `sub: "demo:randomid"` not in auth.users

**Solutions**:
1. **Option A**: Anonymous auth
   ```typescript
   // Kiosk creates anonymous session
   const { data } = await supabase.auth.signInAnonymously();
   ```

2. **Option B**: Temporary users
   ```typescript
   // Create ephemeral customer account
   const { data } = await supabase.auth.signUp({
     email: `kiosk-${uuid}@temp.local`,
     password: randomPassword
   });
   ```

## Risk Summary Table

| Role | Works Now | After Code Fix | After Migration | After Role Fix |
|------|-----------|---------------|-----------------|----------------|
| Owner | ✅ (bypass) | ✅ | ✅ | ✅ |
| Manager | ✅ (bypass) | ✅ | ✅ | ✅ |
| Server | ✅ (bypass) | ⚠️ | ✅ | ✅ |
| Cashier | ✅ (bypass) | ⚠️ | ✅ | ✅ |
| Kitchen | ✅ (bypass) | ❌ | ❌ | ✅ (with fix) |
| Expo | ✅ (bypass) | ❌ | ❌ | ✅ (with fix) |
| Customer | ✅ (bypass) | ❌ | ❌ | ✅ (with fix) |

## Critical Path by Priority

### P0 - Immediate (Breaks Everything)
1. Apply auth tables migration
2. Apply user client middleware
3. Test with Owner/Manager accounts

### P1 - High (Breaks Operations)
1. Fix Kitchen/Expo authentication
2. Fix Customer/Kiosk authentication
3. Verify PIN auth for Servers/Cashiers

### P2 - Medium (Polish)
1. Implement token refresh
2. Add session management
3. Improve error handling

## Remediation Steps

### For Kitchen/Expo (Recommended: Service Accounts)
```sql
-- Create service account users
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES 
  (gen_random_uuid(), 'kitchen-1@restaurant.local', crypt('SecurePassword123!', gen_salt('bf')), NOW()),
  (gen_random_uuid(), 'expo-1@restaurant.local', crypt('SecurePassword123!', gen_salt('bf')), NOW());

-- Grant roles
INSERT INTO user_restaurants (user_id, restaurant_id, role, is_active)
SELECT id, '11111111-1111-1111-1111-111111111111', 
       CASE 
         WHEN email LIKE 'kitchen%' THEN 'kitchen'
         WHEN email LIKE 'expo%' THEN 'expo'
       END, true
FROM auth.users 
WHERE email IN ('kitchen-1@restaurant.local', 'expo-1@restaurant.local');
```

### For Customer/Kiosk (Recommended: Anonymous Auth)
```typescript
// In /api/v1/auth/kiosk endpoint
router.post('/kiosk', async (req, res) => {
  const { restaurantId } = req.body;
  
  // Create anonymous session
  const { data, error } = await supabase.auth.signInAnonymously();
  
  if (error) throw error;
  
  // Set metadata for the session
  await supabase.auth.updateUser({
    data: { 
      restaurant_id: restaurantId,
      role: 'customer',
      is_kiosk: true
    }
  });
  
  res.json({
    token: data.session.access_token,
    expiresIn: data.session.expires_in
  });
});
```

## Success Metrics

- ✅ All auth tables exist
- ✅ User client middleware applied
- ✅ Owner/Manager can perform all operations
- ✅ Servers/Cashiers can process orders
- ✅ Kitchen/Expo displays work
- ✅ Customers can place orders
- ✅ No 42501 (RLS violation) errors
- ✅ Audit logs capture user context