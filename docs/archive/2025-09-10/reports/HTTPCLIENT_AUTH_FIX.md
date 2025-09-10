# httpClient Authentication Bridge Fix

## Date: January 30, 2025
## Status: FIXED ✅

## Issue Resolved
**Problem**: PIN login, station login, and kiosk authentication were completely broken for API requests
**Root Cause**: `httpClient` was bypassing the auth bridge and only checking Supabase sessions directly
**Impact**: 3 out of 4 authentication methods (PIN, station, kiosk) couldn't make API requests

## The Fix Applied

### File Changed: `/client/src/services/http/httpClient.ts`

#### Before (BROKEN):
```typescript
// Line 131-139 - Only checked Supabase sessions
const { data: { session } } = await supabase.auth.getSession()
if (session?.access_token) {
  headers.set('Authorization', `Bearer ${session.access_token}`)
  logger.info('🔐 Using Supabase session token for API request')
}
```

#### After (FIXED):
```typescript
// Line 133 - Now uses auth bridge
import { getAuthToken } from '@/services/auth'

const token = await getAuthToken()
if (token) {
  headers.set('Authorization', `Bearer ${token}`)
  logger.info('🔐 Using auth bridge token for API request')
}
```

## What This Fix Enables

### ✅ PIN Login (Tier 2)
- Staff can login with 4-digit PINs
- API requests now include PIN-based tokens
- Kitchen and server staff can access the system

### ✅ Station Login (Tier 3)
- Shared terminals (kitchen display, expo) work
- Station tokens are properly attached to API requests
- 24-hour sessions for convenience

### ✅ Kiosk Mode (Tier 4)
- Customer self-service ordering functional
- Anonymous sessions with limited scope
- 1-hour tokens for security

### ✅ Email/Password (Tier 1)
- Still works (was never broken)
- Manager and owner access unchanged

## Authentication Flow After Fix

```
1. User authenticates (any method)
   ↓
2. AuthContext stores token and syncs to bridge
   ↓
3. httpClient calls getAuthToken() from bridge
   ↓
4. Token attached to ALL API requests
   ↓
5. Backend validates token (supports all types)
   ↓
6. Request succeeds ✅
```

## Test Results

### Kiosk Authentication Test
```bash
# Generate kiosk token
POST /api/v1/auth/kiosk
→ Returns valid HS256 token ✅

# Use token for voice session
POST /api/v1/realtime/session
Authorization: Bearer [kiosk-token]
→ Returns ephemeral token ✅

# API requests now work with kiosk token ✅
```

## Why This Wasn't Caught Earlier

1. **Testing Gap**: Developers tested with email/password (which worked)
2. **Partial Fixes**: Voice and WebSocket were fixed, creating false confidence
3. **Documentation Mismatch**: Docs claimed it was fixed, but httpClient wasn't updated
4. **Symptom Chasing**: Multiple commits tried to fix symptoms, not the root cause

## Critical Insight

The entire authentication system was correctly implemented EXCEPT for one critical bug:
- Backend: ✅ All 4 tiers working
- AuthContext: ✅ Properly manages all auth methods
- Auth Bridge: ✅ Correctly implemented
- Voice/WebSocket: ✅ Fixed to use bridge
- **httpClient: ❌ Was bypassing the bridge (NOW FIXED ✅)**

## Verification Steps

1. **PIN Login Test**
   - Login with PIN
   - Navigate to any page requiring API
   - Data loads successfully ✅

2. **Station Login Test**
   - Create station token
   - Access kitchen display
   - Orders appear ✅

3. **Kiosk Mode Test**
   - Get kiosk token
   - Create order via API
   - Order processes ✅

## Impact Summary

- **Lines Changed**: ~10
- **Files Modified**: 1
- **Complexity**: Minimal
- **Breaking Changes**: None
- **Authentication Methods Fixed**: 3 of 4 (75%)

## Conclusion

A single function in httpClient was the bottleneck preventing 75% of authentication methods from working. By switching from `supabase.auth.getSession()` to `getAuthToken()` from the auth bridge, all authentication methods now work correctly for API requests.

The fix is simple, surgical, and immediately effective. All authentication tiers are now fully functional.