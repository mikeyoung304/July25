# HTTP Bypass Map
Generated: 2025-09-05

## CRITICAL FINDINGS

### Test Token Bypasses

#### 1. Server Middleware Auth (`server/src/middleware/auth.ts`)
**Lines 36-56**: Test token bypass
- **Trigger**: `Bearer test-token` in Authorization header
- **Conditions**: 
  - NODE_ENV === 'development' OR 'test'
  - NOT in production (multiple checks)
  - Must be localhost (no cloud env vars)
- **Grants**: Full admin access with all scopes
- **Risk**: HIGH if conditions fail

#### 2. WebSocket Auth (`server/src/middleware/auth.ts`)
**Lines 144-156**: WebSocket test token
- **Trigger**: `?token=test-token` in WebSocket URL
- **Conditions**: Same as HTTP bypass
- **Grants**: Test user ID and default restaurant
- **Risk**: HIGH - tokens visible in logs

### Demo/Kiosk Token System

#### 1. Client Demo Login (`client/src/contexts/AuthContext.tsx`)
**Lines 284-309**: Demo authentication flow
- **Protection**: `VITE_DEMO_AUTH !== '1'` OR production build
- **Method**: Uses real Supabase accounts with demo credentials
- **Accounts**: manager, server, kitchen, expo, cashier
- **Risk**: MEDIUM - real accounts but protected

#### 2. Server Kiosk JWT (`server/src/middleware/auth.ts`)
**Lines 61-76**: Kiosk JWT verification
- **Secret**: KIOSK_JWT_SECRET environment variable
- **Fallback**: Tries kiosk first, then Supabase
- **Risk**: LOW - proper JWT verification

### Session Storage Patterns

#### Client Auth Context
**Lines 218-222**: PIN session storage
- Stores full auth session in localStorage
- Includes user, session, restaurantId
- Expires based on server-provided expiry

## RECOMMENDATIONS

### Phase 2 Actions Required:
1. ✅ Remove test-token bypass entirely (lines 36-56, 144-156)
2. ✅ Add STRICT_AUTH=true flag to disable all bypasses
3. ✅ Remove demo login method or gate behind stricter env check
4. ⚠️ Move WebSocket tokens from URL to headers/first message
5. ✅ Clear localStorage/sessionStorage on logout

### Security Controls Already Present:
- Multiple production checks (NODE_ENV, cloud flags)
- JWT signature verification for all tokens
- Scoped permissions in tokens
- Restaurant ID validation

## Files to Modify:
1. `server/src/middleware/auth.ts` - Remove test token logic
2. `client/src/contexts/AuthContext.tsx` - Remove/restrict demo login
3. `client/src/services/http/httpClient.ts` - Check for token injection
4. WebSocket client - Move token from URL to secure channel