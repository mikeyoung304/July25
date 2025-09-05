# WebSocket Map
Generated: 2025-09-05

## WebSocket Authentication Flow

### Client Side (`client/src/services/websocket/WebSocketService.ts`)

#### Token Attachment (Lines 81-112)
**Method**: URL parameters (SECURITY RISK)
```
ws://localhost:3001?token=<token>&restaurant_id=<id>
```

**Token Priority**:
1. Supabase session token (lines 85-90)
2. Test token in dev mode (lines 93-95)
3. No token with warning (line 110)

**Issues**:
- ⚠️ Token exposed in URL/logs
- ⚠️ Test token hardcoded for dev
- ⚠️ No header-based auth option

#### Connection Management
- **Reconnection**: Exponential backoff, 15 attempts max
- **Heartbeat**: 30-second interval
- **State tracking**: connecting/connected/disconnected/error

### Server Side (`server/src/middleware/auth.ts`)

#### WebSocket Auth Verification (Lines 133-207)
**Function**: `verifyWebSocketAuth()`

**Token Extraction**: URL parameter `?token=`
**Test Token Bypass**: Lines 144-156
- Same conditions as HTTP bypass
- Returns test user for `test-token`

**Demo Token Handling**: Lines 162-183
- Checks if `sub` starts with `demo:`
- Verifies with KIOSK_JWT_SECRET
- Separate from Supabase tokens

**Regular Token**: Lines 185-192
- Verifies with Supabase JWT secret
- Falls back to anon key

## Critical Issues Found

### 1. NO .once() usage found
✅ WebSocket properly uses standard event handlers (onopen, onmessage, etc.)
✅ No misuse of .once() pattern detected

### 2. Token in URL
⚠️ **HIGH RISK**: Tokens visible in:
- Server logs
- Browser history
- Network debugging tools
- Proxy logs

### 3. Test Token Bypass
⚠️ Lines 93-95 in client, 144-156 in server
- Hardcoded 'test-token' string
- Only protected by dev mode check

## WebSocket Service Export

### Main Export
**File**: `client/src/services/websocket/index.ts`
```typescript
export { webSocketService } from './WebSocketService'
export { connectionManager } from './ConnectionManager'
```

### Service Creation
**Singleton Pattern**: Created once and exported
- No multiple instances
- Shared across components

## Recommendations for Phase 2

### Must Fix:
1. **Move token from URL to first message**
   ```typescript
   // After connection open
   ws.send(JSON.stringify({ 
     type: 'auth', 
     token: token 
   }))
   ```

2. **Remove test-token bypass completely**
   - Delete lines 93-95 in WebSocketService.ts
   - Delete lines 144-156 in auth.ts

3. **Add STRICT_AUTH flag**
   ```typescript
   if (process.env.STRICT_AUTH === 'true') {
     // No bypasses allowed
   }
   ```

### Already Good:
- ✅ Proper reconnection logic
- ✅ Connection state management
- ✅ No .once() misuse
- ✅ Heartbeat implementation
- ✅ Event emitter pattern

## Files to Modify:
1. `client/src/services/websocket/WebSocketService.ts` - Move auth to message
2. `server/src/middleware/auth.ts` - Update verifyWebSocketAuth()
3. `server/src/services/websocket/server.ts` - Handle auth message