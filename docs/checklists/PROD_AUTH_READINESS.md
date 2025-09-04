# Production Auth Readiness Checklist
Generated: 2025-09-03

## ✅ Architecture Requirements
- [x] Single backend on port 3001
- [x] Frontend on port 5173  
- [x] Strict server/client separation
- [ ] No microservices
- [ ] No auth bypass headers in production

## ✅ Authentication Flow
- [x] Supabase JWT in `Authorization: Bearer <token>`
- [x] CSRF protection (cookie + header)
- [x] X-Restaurant-ID header on all requests
- [ ] User-scoped DB clients for RLS
- [ ] Service key only for provisioning

## ❌ Database & RLS (NEEDS FIXING)
- [ ] RLS enabled on ALL tables
- [ ] Every operation scoped by restaurant_id
- [ ] User context available via auth.uid()
- [ ] Policies enforce tenant isolation
- [ ] No service key for user CRUD

## ⚠️ Current Blockers

### 1. Service Key Usage (CRITICAL)
**Status**: ❌ All routes use service key
**Fix**: Apply `attachUserClient` middleware
**Files**: `server/src/routes/tables.routes.ts`

### 2. Missing User Context
**Status**: ❌ `auth.uid()` is NULL
**Fix**: Use `req.userSupabase` instead of `supabase`
**Impact**: All 7 table operations

### 3. Demo Auth Incompatible
**Status**: ⚠️ Local JWT won't work with RLS
**Options**:
- Quick: Bypass RLS for demo users
- Proper: Create real Supabase users

### 4. Auth Tables Unknown
**Status**: ❓ Need to verify existence
**Tables Required**:
- user_restaurants (for role checks)
- user_profiles (for user data)
- user_pins (for PIN auth)

## ✅ Security Measures
- [x] JWT signature validation
- [x] Token expiration (1hr managers, 12hr staff)
- [x] Rate limiting on auth endpoints
- [x] Audit logging (auth_logs table)
- [ ] No long-term demo hacks

## ✅ API Boundary
- [x] Database: snake_case
- [x] API: camelCase
- [x] Proper field transformation
- [x] Restaurant context preserved

## 🔧 Required Actions

1. **Immediate (Breaks Floor Plan)**:
   - [ ] Add `attachUserClient` middleware
   - [ ] Replace service client with user client
   - [ ] Test floor plan save

2. **Before Production**:
   - [ ] Verify auth tables exist
   - [ ] Test all RLS policies
   - [ ] Remove test token bypass
   - [ ] Implement proper demo auth

3. **Nice to Have**:
   - [ ] Integration tests for RLS
   - [ ] Monitoring for RLS violations
   - [ ] Automated policy testing

## 📊 Success Metrics

- Floor plan saves without RLS errors
- All CRUD operations respect tenant boundaries
- No service key usage in user endpoints
- Auth logs show successful operations
- Zero 42501 errors in production

## 🚨 Risk Assessment

**Current State**: HIGH RISK
- RLS policies exist but aren't enforced
- Any authenticated user could potentially access any restaurant's data
- Service key usage bypasses all security

**After Fix**: LOW RISK
- RLS enforces tenant isolation
- User operations properly scoped
- Service key reserved for admin only

## 📝 Sign-off

- [ ] Engineering Review
- [ ] Security Review
- [ ] Production Deployment Approved
- [ ] Rollback Plan Documented
- [ ] Monitoring Configured