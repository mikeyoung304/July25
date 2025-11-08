# Voice Ordering Architecture - Key Findings Summary

## Critical Discovery: VoiceOrderProcessor is Dead Code

**Status**: DEFINED BUT UNUSED
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceOrderProcessor.ts` (Lines 1-222)

### What It Does (Lines 18-222)
- Singleton class that manually parses voice transcripts
- Loads menu items and matches against transcription
- Handles transcription variations (e.g., "soul bowl" → "sobo", "solo bowl")
- Submits orders with tax calculation

### Why It's Unused
The system was refactored to use **OpenAI Realtime API function calls** instead:
- Server-side: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/functions/realtime-menu-tools.ts`
- Client receives: `onOrderDetected` event from WebRTCVoiceClient
- Real implementation flows through: VoiceOrderingMode.tsx → UnifiedCart context

### Recommendation
**Remove VoiceOrderProcessor** - It's legacy dead code that adds bundle size without providing value.

---

## Import/Export Graph - COMPLETE MAPPING

### Active Voice Ordering Chain
```
1. VoiceOrderingMode.tsx (ENTRY POINT)
   └─ imports: VoiceCheckoutOrchestrator
   └─ imports: OrderParser
   └─ lazy-loads: VoiceControlWebRTC
   └─ uses: useUnifiedCart context

2. VoiceControlWebRTC.tsx (COMPONENT)
   └─ imports: useWebRTCVoice hook
   └─ imports: HoldToRecordButton
   └─ emits: onOrderDetected callback

3. useWebRTCVoice.ts (HOOK)
   └─ creates: WebRTCVoiceClient instance
   └─ subscribed to: 'order.detected' event

4. WebRTCVoiceClient.ts (SERVICE - ORCHESTRATOR)
   └─ creates: VoiceSessionConfig (token management)
   └─ creates: WebRTCConnection (WebRTC lifecycle)
   └─ creates: VoiceEventHandler (event routing)
   └─ emits: 'order.detected' (parsed from function calls)

5. Server: realtime-menu-tools.ts (FUNCTION TOOLS)
   └─ receives: Function calls from OpenAI Realtime API
   └─ processes: add_to_order, remove_from_order, etc.
   └─ returns: Cart updates with tax calculations
```

### Unused/Legacy Imports
```
VoiceOrderProcessor.ts (NEVER IMPORTED)
  └─ exported from: /client/src/modules/voice/index.ts
  └─ imported by: NOBODY
  └─ status: Dead code

parseVoiceOrder() from orderIntegration.ts (LEGACY)
  └─ used by: KioskDemo.tsx only
  └─ replaced by: OpenAI function calls in production code
  └─ status: Demo/fallback only
```

---

## Dynamic Imports & Lazy Loading

**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kiosk/VoiceOrderingMode.tsx` (Line 17)

```typescript
const VoiceControlWebRTC = lazy(() => 
  import('@/modules/voice/components/VoiceControlWebRTC')
    .then(m => ({ default: m.VoiceControlWebRTC }))
);
```

**Why**: 
- Reduces initial bundle size
- Only loads heavy WebRTC component when needed
- Wrapped in `<Suspense>` with loading spinner

**Note**: No dynamic imports found for menu tools - they're always required.

---

## Factory Patterns Identified

### Pattern 1: Service Composition Factory
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts` (Lines 68-79)

Orchestrator that creates and wires three specialized services:
1. VoiceSessionConfig - Token lifecycle
2. WebRTCConnection - RTC peer connection
3. VoiceEventHandler - Event routing

### Pattern 2: Two-Phase Initialization
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts` (Lines 62-87)

Construction: Config only
Initialization: React hooks injected after (useApiRequest, useToast, useNavigate)

**Usage**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kiosk/VoiceOrderingMode.tsx` (Lines 70-76)

### Pattern 3: Ephemeral Token Factory
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/realtime.routes.ts` (Lines 14-162)

- Creates 1-minute expiration tokens
- Enriches with restaurant/menu context
- NOT cached (line 150)
- Returns to client for WebRTC connection

---

## Configuration Switches & Feature Flags

### Environment Variables
| Variable | File | Default | Usage |
|----------|------|---------|-------|
| `VITE_DEFAULT_RESTAURANT_ID` | `/client/src/modules/voice/hooks/useWebRTCVoice.ts:43` | 'grow' | Restaurant context |
| `VITE_OPENAI_REALTIME_MODEL` | `/client/src/modules/voice/services/WebRTCConnection.ts:241` | 'gpt-4o-realtime-preview-2025-06-03' | AI model selection |
| `VITE_API_BASE_URL` | `/client/src/modules/voice/services/VoiceSessionConfig.ts` | 'http://localhost:3001' | API endpoint |
| `OPENAI_API_KEY` | `/server/src/routes/realtime.routes.ts:113` | (required) | OpenAI authentication |
| `OPENAI_REALTIME_MODEL` | `/server/src/routes/realtime.routes.ts:117` | 'gpt-4o-realtime-preview-2025-06-03' | AI model selection |

### Debug Mode
**File**: `/client/src/components/kiosk/VoiceOrderingMode.tsx` (Line 72)
```typescript
debug: import.meta.env.DEV
```

Enables console logging with `[ServiceName]` prefixes throughout voice modules.

### Permission-Based Behavior
**File**: `/client/src/pages/ServerView.tsx`
```typescript
const canCreateOrders = hasScope('orders:create')
```

Scope check prevents users without order permission from seeing UI.

### Tax Rate Configuration
**File**: `/server/src/ai/functions/realtime-menu-tools.ts` (Lines 73-100)

Per-restaurant tax rate fetched from database with 5-minute cache.
Default fallback: 0.08 (8%)

---

## Code Comments Explaining "Why" Decisions

### 1. Ephemeral Token Security (Lines 10-13, realtime.routes.ts)
WHY: Expires in 1 minute, tied to specific client session

### 2. NO Server-Side Session Config (Lines 108-119, realtime.routes.ts)
WHY: OpenAI API requires client-side configuration

### 3. In-Memory Cart (Line 68, realtime-menu-tools.ts)
WHY: Acknowledged MVP/demo limitation. Plan: Migrate to Redis

### 4. No Manual Transcript Parsing (Comment in VoiceOrderingMode.tsx:169-171)
WHY: OpenAI Realtime already handles parsing via function calls

### 5. State Machine (Lines 213-296, WebRTCVoiceClient.ts)
WHY: Prevents invalid state transitions and race conditions

---

## Git Blame: Recent Changes Revealing Architecture

### Critical P0 Fixes (8015b03d, Nov 5)
Fixed:
1. Hardcoded restaurant ID (multi-tenant data corruption)
2. Duplicate order submission
3. Connection timeout (15s vs 30s browser default)
4. Scope pre-check for orders:create

### Voice Ordering Auto-Chain (57a2b7e6, Nov 4)
Fixed:
1. Multi-step button requiring 3 clicks → auto-chain to 1 hold
2. Removed duplicate parsing
3. Fixed inverted transcript display logic

### Schema Mismatch (1b7826ec, Nov 6)
Fixed:
1. Server returning 'seats', client expecting 'capacity'
2. Seat selection modal now works

### Tax Rate Centralization (910f2772, Oct 21)
Added:
1. Per-restaurant tax rate from database
2. 5-minute cache
3. Fallback to 8% default

---

## Complete Call Graph: User Action → Order

```
[START] User holds microphone button
   ↓
[PERMISSION] navigator.mediaDevices.getUserMedia()
   ↓
[CONNECT] WebRTCVoiceClient.connect()
   ├─ POST /realtime/session (with menu context)
   ├─ RTCPeerConnection established
   └─ Data channel opened
   ↓
[RECORD] User speaks
   ├─ Audio frames sent via data channel
   ├─ OpenAI Realtime processes transcription
   └─ emit: 'transcript' event (partial & final)
   ↓
[FUNCTION CALL] OpenAI calls add_to_order()
   ├─ Server: realtime-menu-tools.ts processes
   ├─ Validates menu item & restaurant
   ├─ Gets tax rate from database
   ├─ Updates in-memory cart
   └─ Returns cart state
   ↓
[UPDATE] Client receives order.detected event
   ├─ VoiceOrderingMode.handleOrderData()
   ├─ Finds menu item in local list
   ├─ Converts to SharedMenuItem
   └─ addItem() → UnifiedCart context
   ↓
[FINALIZE] User releases button
   ├─ Audio buffer committed
   └─ Final transcript displayed
   ↓
[CHECKOUT] User clicks "Checkout"
   ├─ VoiceCheckoutOrchestrator.handleOrderConfirmation('checkout')
   ├─ Navigate to /kiosk-checkout
   └─ POST /orders → Server validation & creation
   ↓
[SUCCESS] Order created
   └─ Navigate to /order-confirmation
```

---

## Error Handling Patterns

### 1. Connection Timeout (15 seconds)
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts`

Guard against indefinite browser default (30+ seconds).

### 2. Session Expiration Recovery
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts` (Lines 160-163)

Automatically fetches new token and reconnects.

### 3. Rate Limiting (Emit, Don't Handle)
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts` (Lines 155-158)

Allows parent component to show user-friendly message.

### 4. Item Not Found (Suggest Alternatives)
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/functions/realtime-menu-tools.ts` (Lines 212-287)

Returns suggestions instead of failure, maintains conversation.

### 5. Duplicate Prevention (Flag Guard + Finally)
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/hooks/useVoiceOrderWebRTC.ts`

isSubmitting flag prevents race conditions.

---

## Test Status

**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/__tests__/VoiceCheckoutOrchestrator.test.ts`

- Tests Defined: 13 test cases
- Test Coverage: Order confirmation, payment, state management, cleanup
- Execution Status: Tests defined but quarantine status unclear

**Other Voice Tests**:
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/orderIntegration.test.ts` - 9 test cases defined
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-control.e2e.test.ts` - E2E tests
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-to-kitchen.e2e.test.tsx` - Integration test

**Quarantine Approach**: Tests renamed with `.skip` extension to track failing tests systematically.

---

## Architecture Strengths

1. **Separation of Concerns**
   - Session config separate from RTC connection separate from event handling
   - Easy to test and modify independently

2. **Event-Driven Loose Coupling**
   - Services emit events, parents subscribe
   - No direct references between services

3. **Security-First Design**
   - Ephemeral tokens expire in 60 seconds
   - Per-restaurant tax rates from database
   - Scope-based permission checks

4. **Multi-Tenant Ready**
   - Dynamic restaurant ID from context
   - Restaurant-specific tax rates
   - Isolated session tokens

5. **Documented Design Decisions**
   - Inline comments explain "why" for key architectural choices
   - Clear migration paths (Map → Redis)

---

## Architecture Issues

1. **Dead Code: VoiceOrderProcessor**
   - Should be removed to reduce confusion
   - Adds ~200 lines of unused bundle

2. **Test Quarantine Backlog**
   - Tests exist but unclear if executed
   - Need systematic test restoration

3. **In-Memory Cart Storage**
   - Not production-ready
   - Lost on server restart
   - Need Redis for multi-server deployments

4. **Implicit Error Recovery**
   - Many error paths handled quietly
   - Need explicit user-facing recovery flows

---

## File Inventory

### Core Voice Services
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceEventHandler.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceOrderProcessor.ts` (DEAD CODE)

### Client Components
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/components/VoiceControlWebRTC.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/components/HoldToRecordButton.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/components/TranscriptionDisplay.tsx`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/components/kiosk/VoiceOrderingMode.tsx`

### Server Routes & Functions
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/routes/realtime.routes.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/server/src/ai/functions/realtime-menu-tools.ts`

### Tests
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/__tests__/VoiceCheckoutOrchestrator.test.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/orderIntegration.test.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-control.e2e.test.ts`
- `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-to-kitchen.e2e.test.tsx`

---

**Analysis Complete**: 10 key findings documented with absolute file paths and line numbers.
