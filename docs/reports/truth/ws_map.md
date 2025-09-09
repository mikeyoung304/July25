# WebSocket Service Mapping
Generated: 2025-01-30

## WebSocket Service Exports
Multiple competing implementations found:

### WebSocketService.ts (Primary)
- Exports: `WebSocketService` class and `webSocketService` instance
- Location: `client/src/services/websocket/WebSocketService.ts`

### WebSocketServiceV2.ts (Duplicate)
- Exports: `WebSocketServiceV2` class and `webSocketServiceV2` instance  
- Location: `client/src/services/websocket/WebSocketServiceV2.ts`
- Issue: Returns 'test-token' as fallback

### Index Export
- `client/src/services/websocket/index.ts` exports from WebSocketService (not V2)
- Also exports helper functions: `connectWebSocket`, `disconnectWebSocket`

## Issues Found
1. **Duplicate implementations** - WebSocketService and WebSocketServiceV2
2. **Test token fallback** - V2 returns 'test-token' when no auth
3. **No .once() usage found** - Good, not using problematic pattern
4. **Multiple exports** - Could cause confusion about which to use

## WebSocket Authentication Issues
- WebSocketServiceV2 has hardcoded 'test-token' fallback
- Both services check for sessionStorage tokens
- No proper Supabase session integration

## Recommended Actions
1. Delete WebSocketServiceV2.ts entirely
2. Update WebSocketService.ts to require Supabase session
3. Remove test-token fallbacks
4. Ensure single export from index.ts