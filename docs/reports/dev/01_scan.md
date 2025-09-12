# Code Scan Results

Timestamp: 2025-09-04

## CORS Setup Files
- **server/src/server.ts** - Main server file with CORS configuration
- **server/src/voice/voice-routes.ts** - Voice routes with CORS handling

## Auth Kiosk Path
- **server/src/routes/auth.routes.ts:23** - POST /api/v1/auth/kiosk endpoint

## WebSocket Service Files
### Client WebSocket Service
- **client/src/services/websocket/WebSocketService.ts** - Main WebSocket service
- **client/src/services/websocket/index.ts** - WebSocket exports
- **client/src/App.tsx:90** - References webSocketService.disconnect() but no import found

### Other WebSocket Files
- client/src/services/websocket/WebSocketServiceV2.ts
- client/src/services/websocket/ConnectionManager.ts
- client/src/services/websocket/orderUpdates.ts
- client/src/hooks/useKitchenOrdersRealtime.ts
- client/src/hooks/useConnectionStatus.ts
- client/src/hooks/useAudioAlerts.ts

## Key Issue
App.tsx line 90 uses `webSocketService` without importing it, causing ReferenceError