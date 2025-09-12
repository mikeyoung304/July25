# Voice Server Mode Fact-Finding Report

## Date: 2025-09-10
## Status: Critical Issues Identified

## 8 Key Questions & Answers

### 1. Voice Path Split
**Q: Where is the branch between kiosk voice and server voice implemented?**

**A: NO EXPLICIT SPLIT EXISTS**
- Both Server and Kiosk modes use the same `VoiceControlWebRTC` component (`client/src/modules/voice/components/VoiceControlWebRTC.tsx`)
- Server page uses `useVoiceOrderWebRTC` hook (`client/src/pages/hooks/useVoiceOrderWebRTC.ts:22-231`)
- Kiosk uses `VoiceCheckoutOrchestrator` (`client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts`)
- **CRITICAL GAP**: No mode differentiation - server voice has TTS/conversation features it shouldn't

### 2. Order Creation
**Q: On server "Confirm," which endpoint is called?**

**A: `/api/v1/orders` (POST)**
- Called in `useVoiceOrderWebRTC.ts:162` in `submitOrder` function
- Endpoint defined in `server/src/routes/orders.routes.ts:36-53`
- Authentication: Uses Bearer token from session (`session.accessToken`)
- Restaurant context: Passed via `X-Restaurant-ID` header

### 3. Cart Binding
**Q: Does server voice write into UnifiedCartContext or bypass it?**

**A: BYPASSES UnifiedCartContext**
- Server voice maintains its own order state in `useVoiceOrderWebRTC` hook
- Order items stored in local state: `const [orderItems, setOrderItems] = useState<OrderItem[]>([])`
- **CRITICAL GAP**: Not using UnifiedCartContext violates single source of truth principle

### 4. Payment Handoff
**Q: After confirm, what triggers payment?**

**A: NO PAYMENT TRIGGERED**
- `submitOrder` function only creates the order via POST `/api/v1/orders`
- No subsequent call to:
  - `/api/v1/terminal/checkout` (Square Terminal)
  - `/api/v1/payments/create` (Square Web Payments)
- **CRITICAL GAP**: Order creation succeeds but no payment flow initiated

### 5. KDS Emission
**Q: Does confirm lead to order:created event?**

**A: YES - But with limitations**
- Order creation in `OrdersService.createOrder` (server/src/services/orders.service.ts:173-174):
  ```typescript
  if (this.wss) {
    broadcastNewOrder(this.wss, data);  // Emits 'order:created' event
  }
  ```
- WebSocket broadcast defined in `server/src/utils/websocket.ts:167-181`
- **ISSUE**: Event includes `restaurant_id` but status is only 'pending', not 'confirmed'

### 6. Auth Context
**Q: Which token is used on server page?**

**A: PIN/RS256 JWT Token**
- Server page uses `useAuth()` hook which provides Supabase JWT
- Token type: RS256 signed JWT from Supabase
- Required scopes verified in route: `requireScope(['orders:create'])` (orders.routes.ts:37)
- **CONFIRMED**: Has proper `orders:create` scope, but missing `payments:process` integration

### 7. Shared Client
**Q: Do flows diverge after transcription?**

**A: MINIMAL DIVERGENCE**
- Both use `WebRTCVoiceClient` (`client/src/modules/voice/services/WebRTCVoiceClient.ts`)
- Server: `handleVoiceTranscript` → local parsing → `submitOrder`
- Kiosk: `handleVoiceTranscript` → `VoiceCheckoutOrchestrator` → cart context
- **ISSUE**: Server mode doesn't disable TTS responses or agent conversation

### 8. Square Integration
**Q: Where is Create Terminal Checkout invoked?**

**A: NOT INVOKED IN SERVER FLOW**
- Terminal checkout endpoint exists: `/api/v1/terminal/checkout` (server/src/routes/terminal.routes.ts:26-131)
- Requires: `orderId` and `deviceId` in request body
- **CRITICAL GAP**: Server flow never calls this endpoint after order creation

## Root Cause Summary

The server voice flow is broken at multiple points:

1. **No Mode Differentiation**: Server and kiosk use same conversational voice component
2. **Cart Bypass**: Not using UnifiedCartContext (violates architecture)
3. **Payment Gap**: Order created but no payment flow triggered
4. **Missing Integration**: No call to Square Terminal checkout after order confirmation
5. **Incomplete Flow**: submitOrder() only creates order, doesn't proceed to payment

## Critical Code References

- Server Voice Hook: `client/src/pages/hooks/useVoiceOrderWebRTC.ts`
- Voice Modal: `client/src/pages/components/VoiceOrderModal.tsx`
- Order Creation: `server/src/services/orders.service.ts:71-191`
- Terminal Checkout: `server/src/routes/terminal.routes.ts:26-131`
- WebSocket Events: `server/src/utils/websocket.ts:152-181`
- Cart Context: `client/src/contexts/UnifiedCartContext.tsx` (NOT USED)

## Next Steps

Proceed to Part 2: Reproduction & Trace to capture the exact failure mode in runtime.