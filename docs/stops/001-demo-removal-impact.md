# STOP: Critical Decision Point - Demo Mode Removal
Generated: 2025-01-30

## 🛑 STOPPING REASON
Major breaking changes have been implemented that completely remove demo/test authentication. This will impact:
1. Development workflows
2. Any existing integrations using test tokens
3. WebSocket connections without proper auth
4. API requests without Supabase sessions

## Changes Made So Far

### Client-Side Changes
✅ **Removed from httpClient.ts:**
- No more `Bearer test-token` fallback
- Restaurant ID now REQUIRED (no hardcoded fallback)
- Throws error if no restaurant context

✅ **Removed from useApiRequest.ts:**
- Deleted getDemoToken import
- No test-token fallback
- No default restaurant ID fallback

✅ **Removed from WebSocketServiceV2.ts:**
- No getDemoToken usage
- No test-token fallback
- Requires Supabase session for connection

✅ **Removed from AuthContext.tsx:**
- Deleted loginAsDemo method entirely
- Removed demo credential mappings
- No hardcoded restaurant IDs

✅ **Deleted files:**
- `/client/src/services/auth/demoAuth.ts` - DELETED

✅ **Cleaned App.tsx:**
- Removed DEMO_AUTH_TOKEN sessionStorage cleanup

### Server-Side Changes
✅ **Modified auth.ts middleware:**
- Rejects ALL test-token attempts
- No anonymous WebSocket connections
- No development mode bypasses
- Removed STRICT_AUTH conditionals

## 🚨 IMMEDIATE IMPACTS

### 1. Development Environment WILL BREAK
- Developers cannot use test tokens
- Must have real Supabase users seeded
- Must authenticate properly even in dev

### 2. WebSocket Connections WILL FAIL
- No token = no connection
- Must have valid Supabase session first
- Will break Kitchen Display, Expo, real-time features

### 3. API Calls WILL FAIL
- No authentication = 401 Unauthorized
- No restaurant context = Error thrown
- No fallbacks anywhere

### 4. Existing Tests MAY BREAK
- Any tests using 'test-token' will fail
- Need to mock Supabase auth properly
- Integration tests need real auth flow

## 📊 Risk Assessment

### HIGH RISK Areas:
1. **Kitchen Display System** - Requires WebSocket auth
2. **POS Operations** - Requires restaurant context
3. **Voice Ordering** - WebSocket dependent
4. **Development Workflow** - No quick auth bypass

### MEDIUM RISK Areas:
1. **CI/CD Pipeline** - Tests may fail
2. **Demo Deployments** - Need real users
3. **Documentation** - References outdated methods

## 🤔 Critical Questions

1. **Are demo users properly seeded in Supabase?**
   - Found seed script: `/scripts/seed-demo-users.js`
   - Uses credentials: Demo123!
   - But are they actually in the database?

2. **How will developers authenticate locally?**
   - Need login UI with seeded credentials
   - Need to display available demo users
   - Must use REAL Supabase sign-in

3. **What about automated testing?**
   - Need proper auth mocking strategy
   - Can't use test-token anymore
   - May need test-specific Supabase project

4. **Restaurant Context Management?**
   - Currently throwing errors if missing
   - Need proper context provider setup
   - How to select restaurant on login?

## 🔄 Options Moving Forward

### Option 1: Continue with Full Removal (RECOMMENDED)
**Pros:**
- Clean, secure architecture
- No demo backdoors
- Forces proper auth implementation

**Cons:**
- Development friction
- Need immediate login UI work
- May break existing workflows

### Option 2: Partial Rollback
**Pros:**
- Keep dev workflows intact
- Gradual migration possible
- Less immediate breakage

**Cons:**
- Security holes remain
- Technical debt continues
- Defeats purpose of cleanup

### Option 3: Implement Dev-Only Helper
**Pros:**
- Clean production code
- Developer convenience
- Visible demo credentials

**Cons:**
- Still need login UI
- More implementation work
- Complexity in dev vs prod

## ✅ Completed Implementation Requirements
If continuing with Option 1:

1. ✅ Remove all test-token references
2. ✅ Remove loginAsDemo methods  
3. ✅ Delete demoAuth.ts service
4. ✅ Require auth for WebSocket
5. ✅ Require restaurant context

## ⏭️ Next Steps Required
1. **Implement login page with demo helper** (Phase 3)
2. **Fix protected routes** (Phase 3)
3. **Update CORS headers** (Phase 4)
4. **Fix hardcoded IDs** (Phase 5)
5. **Test everything** (Phase 6)

## 🎯 Recommendation
**CONTINUE WITH OPTION 1** - We're already deep into the changes. Going back now would be worse than pushing forward. The next phase (Phase 3) will implement the login UI with demo credential display, which addresses the main developer experience concern.

## 📝 Decision Required
**Should we continue with the complete demo removal, or rollback and take a different approach?**

The system is currently in a broken state until Phase 3 is complete. This is expected and part of the migration process.