# Demo References Code Inventory
Generated: 2025-01-30

## Summary
- **Total Demo References Found**: 57+ occurrences across multiple files
- **Critical Security Issues**: test-token hardcoded, demo auth methods still active

## Test Token References
Found in critical authentication paths:
- `client/src/App.tsx` - Still checking for DEMO_AUTH_TOKEN in sessionStorage
- `client/src/core/api/unifiedApiClient.ts` - Returns 'test-token' as fallback
- `client/src/hooks/useApiRequest.ts` - Injects 'Bearer test-token' in headers
- `client/src/services/websocket/WebSocketServiceV2.ts` - Returns 'test-token'
- `client/src/services/auth/demoAuth.ts` - Demo auth service still exists

## loginAsDemo Method
Still present in AuthContext:
- `client/src/contexts/AuthContext.tsx` - loginAsDemo method implemented and exported

## x-demo-token-version Header
- `client/src/services/auth/demoAuth.ts` - Still setting demo token version header

## Hardcoded Restaurant ID (11111111-1111-1111-1111-111111111111)
Found in 27 files:
### Client Files:
- DevAuthOverlay.tsx
- AppRoutes.tsx
- AuthContext.tsx
- UnifiedCartContext.tsx
- unifiedApiClient.ts
- RestaurantContext.tsx
- useOrderSubmission.ts
- CartContext.tsx
- useWebRTCVoice.ts
- useVoiceOrderWebRTC.ts
- KioskPage.tsx
- Login.tsx
- LoginV2.tsx
- PinLogin.tsx
- StationLogin.tsx
- api.ts
- demoAuth.ts
- httpClient.ts
- RestaurantIdProvider.tsx
- TableService.ts
- WebSocketService.test.ts
- WebSocketService.ts
- WebSocketServiceV2.ts
- env.ts

### Server Files:
- environment.ts
- auth.routes.ts
- server.ts

## Duplicate Login Pages
- `Login.tsx` - Original login page
- `LoginV2.tsx` - Duplicate login implementation
- Both pages contain hardcoded restaurant IDs and demo logic

## Demo Auth Service
- `client/src/services/auth/demoAuth.ts` - Complete demo auth service still exists
  - Manages DEMO_AUTH_TOKEN
  - Has version migration logic
  - Sets demo headers

## Critical Files Requiring Cleanup
1. **AuthContext.tsx** - Remove loginAsDemo method
2. **demoAuth.ts** - Delete entire file
3. **DevAuthOverlay.tsx** - Remove or refactor for dev-only display
4. **httpClient.ts** - Remove test-token injection
5. **useApiRequest.ts** - Remove test-token fallback
6. **WebSocketService*.ts** - Remove test-token returns
7. **All Login pages** - Consolidate and remove hardcoded IDs