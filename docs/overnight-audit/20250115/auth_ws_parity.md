# Authentication HTTP↔WebSocket Parity Analysis

## Executive Summary
✅ **PARITY CONFIRMED**: Both HTTP and WebSocket use the same unified AuthenticationService for token validation.

## Authentication Flow Evidence

### 1. HTTP Authentication Path
**File**: `server/src/middleware/auth.ts`
- **Line 18-93**: `authenticate()` function
- **Line 44**: Calls `authService.validateToken(authHeader, restaurantId)`
- **Line 112-114**: Rejects test tokens explicitly

### 2. WebSocket Authentication Path
**File**: `server/src/utils/websocket.ts`
- **Line 42**: Calls `verifyWebSocketAuth(request)`
- **Line 44-46**: Closes connection if auth fails

**File**: `server/src/middleware/auth.ts`
- **Line 242-278**: `verifyWebSocketAuth()` function
- **Line 258**: Calls same `authService.validateToken()` with extracted token

### 3. Unified Token Validation
**File**: `server/src/services/auth/AuthenticationService.ts`
- **Line 140-200**: `validateToken()` - single source of truth
- **Line 148-150**: Rejects test tokens in production
- **Line 154**: Determines token type (supabase/station/pin/kiosk)
- **Line 180-198**: Resolves actual roles from database for Supabase tokens

## Key Security Features

### Token Type Detection (AuthenticationService.ts)
```typescript
// Line 118-133
private getTokenType(decoded: TokenPayload): TokenType {
  if (decoded.iss?.includes('supabase')) return 'supabase';
  if (decoded.auth_method === 'pin') return 'pin';
  if (decoded.auth_method === 'station') return 'station';
  if (decoded.sub?.startsWith('customer:') ||
      decoded.sub?.startsWith('demo:') ||
      decoded.sub?.startsWith('kiosk:')) return 'kiosk';
  return 'kiosk'; // Default
}
```

### Restaurant Context Enforcement
- **HTTP**: Lines 28-75 in auth.ts - Strict extraction from headers/query/body
- **WebSocket**: Line 248 in auth.ts - Extracted from URL params
- **Both**: Require restaurant context for write operations

## Bypass Detection

### Development Bypasses (WITH GUARDS)
1. **Restaurant Membership Bypass** (`auth.ts:334-358`)
   - Only in `NODE_ENV=development` OR `BYPASS_RESTAURANT_MEMBERSHIP=true`
   - Logs warning when activated
   - Still requires valid authentication

2. **Test Token Rejection** (`auth.ts:112-115`)
   - Explicitly rejects `test-token` string
   - Logs error: "Test tokens are not allowed"

### NO Production Bypasses Found
- No backdoors in WebSocket upgrade
- No demo tokens accepted without proper JWT validation
- All paths require valid JWT signatures

## Conclusion
✅ **VERIFIED**: HTTP and WebSocket authentication have complete parity through unified `AuthenticationService.validateToken()`. No authentication bypasses exist in production mode.