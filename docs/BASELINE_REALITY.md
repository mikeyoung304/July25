---
owner: Mike Young
status: red
last_verified_date: 2025-09-16
last_verified_commit: 29babce
version: v0.2
---

# Baseline Reality

## Stack Architecture

- **Monorepo Structure**: Workspaces for `client/`, `server/`, `shared/`
- **Frontend**: React 19.1.0, TypeScript 5.8.3, Vite 5.4.19 on port 5173
- **Backend**: Express 4.18.2, TypeScript 5.3.3, unified on port 3001
- **Database**: Supabase (PostgreSQL) with multi-tenant via `restaurant_id`
- **Authentication**: Supabase JWT (RS256) + local PIN/kiosk tokens (HS256)
- **Real-time**: WebRTC via OpenAI Realtime API + WebSocket for order events

## Voice Modes (Current Implementation)

### Employee Mode
- **Client Signal**: `mode: 'employee'` in WebRTCVoiceConfig
- **Server Behavior**: Sets `process.env.VOICE_MODE = 'server'` (realtime.routes.ts:59)
- **No TTS**: `visualFeedbackOnly: true` in client config
- **Direct to Kitchen**: Orders bypass payment gate if authenticated as staff role
- **Browser Constraints**: ESM-safe code only, CommonJS require() not available
- **Node-only Libraries**: Must remain server-side, cannot be bundled for browser

### Customer Mode
- **Client Signal**: `mode: 'customer'` (default) in WebRTCVoiceConfig
- **Server Behavior**: Sets `process.env.VOICE_MODE = 'customer'`
- **Payment Required**: Orders require payment_token (**⚠️ ENFORCED server-side but client doesn't send tokens**)
- **Full Voice**: TTS enabled for conversational ordering

### Browser Runtime Limitations
- **No Dynamic Imports**: require() function unavailable in browser context
- **ESM Modules Only**: All client code must use import/export syntax
- **Security Policy**: No eval() or dynamic code execution permitted
- **Safe Event Parsing**: RealtimeGuards module provides secure message handling

## Authentication Posture

- **Token Validation**: `server/src/middleware/auth.ts` via AuthenticationService
- **Restaurant Context**: Required for writes (header > query > body > token fallback)
- **Staff Roles**: owner, admin, manager, server (from ROLE_SCOPES)
- **Dev Bypass**: `validateRestaurantAccess` has development bypass for missing membership (auth.ts:178)

## Order State Machine

Per `server/src/services/orders.service.ts`:
1. `new` → Initial state on creation
2. `confirmed` → After payment/validation
3. `preparing` → Kitchen started
4. `ready` → Ready for pickup/delivery
5. `completed` → Order fulfilled
6. `cancelled` → Order cancelled

Payment states (`awaiting_payment`, `paid`) exist in types but not enforced in main flow.

## Test Status

- **Client**: Vitest 3.2.4 configured but many tests fail
- **Server**: Vitest configured, partial coverage
- **Coverage**: Target 60% statements (not met)
- **TypeScript**: 560+ errors, mostly in tests (app runs)
- **Known Issue**: Jest→Vitest migration incomplete, missing global shims

## API Field Contract Status

The server includes transform logic to handle legacy snake_case fields:
- Server expects: `tableNumber`, `customerName`, `type`
- Client was sending: `table_number`, `customer_name`, `order_type`
- Transform layer: server/src/dto/order.dto.ts:56-78

**UPDATE**: Client now using camelCase consistently (fixed 2025-01-15).

## Recent Changes

- BuildPanel agent system removed (per CLAUDE.md)
- Unified backend on port 3001 (ADR-002)
- Cart system unified to UnifiedCartContext (ADR-003)
- Voice system consolidated to WebRTC only (ADR-004)
- Authentication normalized (ADR-007)