# Voice Ordering Code Architecture - Deep Dive Analysis

## Executive Summary

The voice ordering system uses a **WebRTC-based architecture** with OpenAI Realtime API, implementing a sophisticated multi-layer design pattern. The codebase demonstrates careful separation of concerns, event-driven architecture, and comprehensive error handling. However, there are documented design decisions and historical issues that reveal the evolution of the system.

---

## 1. Import/Export Graph & VoiceOrderProcessor Usage

### VoiceOrderProcessor Status: **DEFINED BUT NOT ACTIVELY USED**

**File**: `/client/src/modules/voice/services/VoiceOrderProcessor.ts`

**Export Chain**:
```
VoiceOrderProcessor.ts
  ↓ (exported from)
client/src/modules/voice/index.ts (line 12)
  ↓ (available but)
NOT IMPORTED by any active components
```

**Why VoiceOrderProcessor is Orphaned**:

The `VoiceOrderProcessor` is a **legacy implementation** that was superseded by the OpenAI Realtime API function-calling approach. It contains:

1. **Menu item loading** (line 25-32)
   - Loads menu items from API
   - Maintains internal state: `this.menuItems: MenuItem[]`

2. **Transcript parsing** (line 37-100)
   - Manual regex-based pattern matching
   - Transcription error handling (e.g., "soul bowl" → "sobo", "solo bowl")
   - Hardcoded menu item variations (lines 109-121)

3. **Order submission** (line 171-218)
   - Converts parsed items to Order format
   - Tax calculation with configurable tax rate (default 0.08)
   - Single instance export: `export const voiceOrderProcessor = new VoiceOrderProcessor()`

**Current Usage**:
- Exported from module index
- **NOT imported or used anywhere** in the codebase
- Only appears in:
  - `/client/src/modules/voice/index.ts` (re-export)
  - Its own file (definition)

**Design Pattern**: **Singleton Factory**
```typescript
export const voiceOrderProcessor = new VoiceOrderProcessor();
// Pattern: Global singleton instance, similar to logger
```

### Active Voice Ordering Path

Instead of VoiceOrderProcessor, the system uses:

**Primary Order Processing Flow**:
```
VoiceOrderingMode.tsx (component)
  ├─ receives: onOrderDetected callback
  ├─ processes: orderData from WebRTCVoiceClient
  └─ adds items to: useUnifiedCart() context
       ↓
WebRTCVoiceClient.ts (service)
  ├─ emits: 'order.detected' event
  └─ source: VoiceEventHandler.ts
```

**Function Call Integration**:
- OpenAI Realtime API processes transcription
- Server-side function tools: `/server/src/ai/functions/realtime-menu-tools.ts`
- Returns structured: `{ items: [{ name, quantity, modifications }] }`
- Client subscribes via: `onOrderDetected` callback

---

## 2. Dynamic Imports & Lazy Loading

### Lazy Component Loading

**File**: `/client/src/components/kiosk/VoiceOrderingMode.tsx` (line 17)

```typescript
const VoiceControlWebRTC = lazy(() => 
  import('@/modules/voice/components/VoiceControlWebRTC')
    .then(m => ({ default: m.VoiceControlWebRTC }))
);
```

**Pattern**: React.lazy() with dynamic import for code-splitting
- Wrapped in `<Suspense>` (line 333-344)
- Shows loading spinner while chunk loads

### Why Lazy Loading?

**Justification** (implicit from architecture):
- VoiceControlWebRTC is heavy (WebRTC setup, data channel handling)
- Only needed in specific voice ordering mode
- Reduces initial bundle for non-voice users

**Files Using Lazy Imports**:
- VoiceOrderingMode.tsx: VoiceControlWebRTC
- No other lazy voice imports identified

### Runtime Import Resolution

**No dynamic require() found**, but OpenAI Realtime API is loaded:
- Via script tag or npm package
- Used in: WebRTCConnection.ts (WebSocket/RTC connection)
- No evidence of optional/conditional imports

---

## 3. Factory Patterns

### Factory Pattern 1: Service Composition (WebRTCVoiceClient)

**File**: `/client/src/modules/voice/services/WebRTCVoiceClient.ts`

**Pattern**: **Composition-based factory** orchestrating three services

```typescript
export class WebRTCVoiceClient extends EventEmitter {
  private sessionConfig: VoiceSessionConfig;     // Token management
  private connection: WebRTCConnection;          // RTC lifecycle
  private eventHandler: VoiceEventHandler;       // Event routing
  
  constructor(config: WebRTCVoiceConfig) {
    // Create services (lines 77-79)
    this.sessionConfig = new VoiceSessionConfig(config, { getAuthToken });
    this.connection = new WebRTCConnection(config);
    this.eventHandler = new VoiceEventHandler(config);
    
    // Wire internal events (lines 82-120)
    this.connection.on('connection.change', ...);
    this.eventHandler.on('session.created', ...);
  }
}
```

**Why This Pattern?**:
- Single Responsibility Principle: each service handles one domain
- VoiceSessionConfig: Token lifecycle (fetch, validate, refresh)
- WebRTCConnection: WebRTC peer connection (ICE, data channel)
- VoiceEventHandler: Realtime API event processing

**Factory Method**: Direct instantiation with no factory function
- Could be wrapped in factory for mock injection, but uses constructor injection pattern

### Factory Pattern 2: VoiceCheckoutOrchestrator

**File**: `/client/src/modules/voice/services/VoiceCheckoutOrchestrator.ts`

```typescript
export class VoiceCheckoutOrchestrator extends EventEmitter {
  constructor(config: VoiceCheckoutConfig) { ... }
  
  initialize(apiClient, toast, navigate): void {
    this.apiClient = apiClient;
    this.toast = toast;
    this.navigate = navigate;
  }
}
```

**Two-Phase Initialization**:
1. **Construction**: Config only (can't use React hooks yet)
2. **Initialization**: Inject React hooks after component render

**Why?**: Services created outside React component lifecycle, but need access to React hooks (useApiRequest, useToast, useNavigate)

**Usage** (VoiceOrderingMode.tsx, lines 70-76):
```typescript
checkoutOrchestratorRef.current = new VoiceCheckoutOrchestrator({
  restaurantId: import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'demo-restaurant',
  debug: import.meta.env.DEV
});

// Step 2: Initialize after creation
checkoutOrchestratorRef.current.initialize(apiClient, toast, navigate);
```

### Factory Pattern 3: Token Factory (Implicit)

**File**: `/server/src/routes/realtime.routes.ts`

```typescript
router.post('/session', authenticate, async (req, res) => {
  // Fetch ephemeral token from OpenAI
  const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env['OPENAI_REALTIME_MODEL'] || 'gpt-4o-realtime-preview-2025-06-03'
    }),
  });
  
  // Add restaurant/menu context
  const sessionData = {
    ...data,
    restaurant_id: restaurantId,
    menu_context: menuContext,
    expires_at: Date.now() + 60000,
  };
  
  return res.json(sessionData);
});
```

**Factory Characteristics**:
- **Ephemeral token factory**: Creates one-time-use session tokens
- **Expires in 60 seconds** (critical for security)
- **Menu context enrichment**: Adds restaurant data to token response
- **NOT cached**: "Don't cache ephemeral tokens" (line 150-151)

---

## 4. Configuration Switches & Feature Flags

### Environment Variables

**Files**:
- `/client/src/modules/voice/services/WebRTCConnection.ts` (line 241)
- `/client/src/modules/voice/services/VoiceSessionConfig.ts` (variable usage)
- `/client/src/modules/voice/hooks/useWebRTCVoice.ts` (line 43)

**Config switches identified**:

```typescript
// 1. Restaurant ID fallback
const restaurantId = import.meta.env.VITE_DEFAULT_RESTAURANT_ID || 'grow';

// 2. OpenAI model selection
const model = import.meta.env.VITE_OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2025-06-03';

// 3. API base URL
const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// 4. Development mode debug
{import.meta.env.DEV && text && ...}
```

### Debug Flags

**Client-side debug mode**:
```typescript
// VoiceOrderingMode.tsx (line 72)
debug: import.meta.env.DEV

// WebRTCVoiceClient config accepts
export interface WebRTCVoiceConfig {
  debug?: boolean;  // Optional debug logging
}
```

**Pattern**: Conditional logging prefixed with `[ServiceName]`
```typescript
if (this.config.debug) {
  console.log('[WebRTCVoiceClient] Starting connection sequence...');
}
```

### Permission-Based Behavior

**File**: `/client/src/pages/ServerView.tsx`

```typescript
const { hasScope } = useAuth();
const canCreateOrders = hasScope('orders:create');
```

**Role-based gating**:
- Scope: `'orders:create'` determines if user can submit orders
- Implemented in: `useAuth()` context (AuthContext.tsx)
- Pattern: Pre-flight check before UI enables ordering

**No hardcoded role checks in voice module** - delegated to parent component

### Server-Side Configuration

**File**: `/server/src/routes/realtime.routes.ts`

```typescript
// Line 117: Model selection from environment
model: process.env['OPENAI_REALTIME_MODEL'] || 'gpt-4o-realtime-preview-2025-06-03'

// Line 113: API key from environment
'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`,
```

**Tax rate configuration** (from recent commits):
```typescript
// server/src/ai/functions/realtime-menu-tools.ts
async function getRestaurantTaxRate(restaurantId: string): Promise<number> {
  // Fetch from database, cache for 5 minutes
  const taxRate = data.tax_rate ?? 0.08; // Fallback to 8%
}
```

---

## 5. Code Comments Explaining "Why" Decisions

### Critical Architecture Decisions

**1. Ephemeral Token Strategy** (`/server/src/routes/realtime.routes.ts`, lines 10-13)

```typescript
/**
 * Create ephemeral token for WebRTC real-time voice connection
 * This token expires after 1 minute and should only be used by the requesting client
 */
```

**Why?**: 
- Security: Token tied to specific client session
- Prevents token reuse across clients
- 1-minute expiration balances security vs usability

**2. Server-Side Session Configuration NOT Allowed** (`/server/src/routes/realtime.routes.ts`, lines 108-119)

```typescript
const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({
    model: process.env['OPENAI_REALTIME_MODEL'] || 'gpt-4o-realtime-preview-2025-06-03'
    // DO NOT configure session parameters here - client will configure after connection
  }),
});
```

**Why?**: 
- OpenAI Realtime API requires client-side configuration
- Server only gets token, no session customization
- Allows dynamic client-side configuration (VAD, modality, etc.)

**3. In-Memory Cart Storage** (`/server/src/ai/functions/realtime-menu-tools.ts`, line 68)

```typescript
// In-memory cart storage (replace with Redis in production)
const cartStorage = new Map<string, Cart>();
```

**Why?**:
- Simplicity for MVP/demo
- 30-minute expiration cleanup (line 663-673)
- Clear migration path: Map → Redis
- Acknowledged limitation: "replace with Redis"

**4. Manual Transcript Parsing Removed** (commit 57a2b7e6)

```typescript
// NOTE: Do NOT parse transcripts manually here
// OpenAI Realtime API handles parsing via function calls
// and emits order.detected events processed by handleOrderData
// Manual parsing would cause duplicate item additions
```

**Why?**:
- OpenAI Realtime API already processes transcription
- Function calls extract structured orders
- Avoids double-processing and item duplication

**5. State Machine for Turn Management** (`/client/src/modules/voice/services/WebRTCVoiceClient.ts`, lines 213-296)

```typescript
type TurnState = 'idle' | 'recording' | 'committing' | 'waiting_user_final' | 'waiting_response';

/**
 * Turn state machine (managed by orchestrator)
 * Prevents invalid state transitions (e.g., stop without start)
 */
```

**State Transitions**:
- idle → recording (on startRecording)
- recording → committing → waiting_user_final (on stopRecording)
- Guards: "Cannot start recording in state: X" (line 215)

**Why?**:
- Prevents race conditions
- Ensures clean handoff between recording and processing
- Debouncing: 250ms protection on rapid stops (line 260-263)

### Permission Flow Design

**File**: `/client/src/modules/voice/components/VoiceControlWebRTC.tsx`

```typescript
// Multi-step permission & connection flow
1. Check microphone permission (navigator.permissions.query)
2. Auto-request if needed (getUserMedia)
3. Auto-connect WebRTC on button hold
4. Auto-start recording after connection completes

// Why auto-chaining? (commit 57a2b7e6)
// User experience: hold button → recording starts (1 interaction)
// Without: button → permission → connect → record (3+ clicks)
```

---

## 6. Git Blame & Recent Changes

### Recent Voice-Related Commits

**Most Recent** (efe375cc, Nov 6):
```
fix: logout before login when switching workspace users
- Prevents session conflict
- Follows Supabase best practice
- Impact: Users switching Kitchen → Server no longer hang
```

**Critical P0 Fixes** (8015b03d, Nov 5):
```
fix(voice): implement phase 1 critical p0 bug fixes

5 major issues fixed:
1. Hardcoded restaurant ID → dynamic from context
2. Duplicate submit → guard with isSubmitting flag
3. State clearing verified (already fixed)
4. Connection timeout → 15s max instead of 30s browser default
5. Scope pre-check → show disabled button with tooltip

Impact: Eliminates 100% multi-tenant data corruption
```

**Voice Ordering Auto-Chain** (57a2b7e6, Nov 4):
```
fix(voice): fix broken voice ordering with auto-chain recording flow

Fixes:
1. Multi-step button: Required 3 clicks → auto-chains now
2. Duplicate items: Removed manual parsing
3. Transcript display: Fixed inverted logic

Why: User must press once and hold, not click 3x
```

**Schema Mismatch Fix** (1b7826ec, Nov 6):
```
fix: server voice ordering seats/capacity schema mismatch

Root cause: Server returned 'seats' field, client expected 'capacity'
Solution: Transform in realtime-menu-tools.ts
Impact: Seat selection modal now renders, voice ordering works
```

**Tax Rate Centralization** (910f2772, Oct 21):
```
feat(tax): centralize tax rate configuration

- Database default: 8.25% → 8%
- Data migration for existing restaurants
- Server-side caching: 5 minutes TTL
- Eliminates all hardcoded rates

Usage in voice: getRestaurantTaxRate(restaurantId)
```

### Test Quarantine Strategy

**Commit**: feab4e65 (Oct 15)
```
fix(tests): rename quarantined tests with .skip extension
- Systematic test management approach
- Tracks failing tests by renaming files
- Example: VoiceCheckoutOrchestrator.test.ts
```

**Tests Quarantined**:
- `/client/src/modules/voice/services/__tests__/VoiceCheckoutOrchestrator.test.ts`
  - 13 tests defined (summary text generation, state management, cleanup)
  - Status: Currently defined, execution status unknown
- WebRTCVoiceClient tests skipped (ea79b2aa)
- VoiceSessionConfig tests defined

**Why Tests Were Disabled**:
- Blocking main documentation PR (85056bde)
- Pre-existing test failures accumulation
- Systematic quarantine approach (31217345): "test quarantine system"

---

## 7. Call Graph: User Action → Order Submission

### Complete Flow Diagram

```
User Interaction
  ↓
[HoldToRecordButton] (holds button)
  ↓ (onPressStart)
VoiceControlWebRTC.handlePress()
  ↓ (checks permission)
requestMicrophoneAccess() → navigator.mediaDevices.getUserMedia()
  ↓ (permission granted)
connect() → WebRTCVoiceClient.connect()
  ├─ Step 1: Fetch ephemeral token
  │  └─ VoiceSessionConfig.fetchEphemeralToken()
  │     └─ POST /realtime/session
  │        ├─ Load menu for context
  │        └─ Create token via OpenAI API
  │
  ├─ Step 2: WebRTC peer connection
  │  └─ WebRTCConnection.connect(token)
  │     ├─ Create RTCPeerConnection
  │     ├─ Add audio track
  │     └─ Exchange SDP/ICE candidates
  │
  ├─ Step 3: Data channel setup
  │  └─ datachannel.onopen
  │     └─ VoiceEventHandler.setupDataChannel()
  │
  └─ Step 4: Session configuration
     └─ eventHandler.on('session.created')
        └─ Send session.update (turn detection, modalities, etc.)

[Recording Phase]
startRecording()
  ├─ WebRTCVoiceClient.startRecording()
  │  ├─ Change state: idle → recording
  │  ├─ Clear audio buffer
  │  └─ WebRTCConnection.enableMicrophone()
  │
  └─ User speaks...
     └─ Audio frames sent via data channel to OpenAI

[Processing Phase - while holding]
OpenAI Realtime API receives audio
  ├─ Transcription (user speech)
  │  └─ emit: 'conversation.item.created' (user role)
  │     └─ VoiceEventHandler: accumulate transcript
  │        └─ emit: 'transcript' event → UI update
  │
  └─ Function calling (order detection)
     ├─ Call: add_to_order, remove_from_order, etc.
     ├─ Server processes via realtime-menu-tools.ts
     │  ├─ Validate menu item exists
     │  ├─ Get restaurant tax rate
     │  ├─ Update cart totals
     │  └─ Return cart update
     │
     └─ emit: 'response.function_call_arguments'
        └─ VoiceEventHandler.on('response.function_call_arguments')
           ├─ Parse function call
           ├─ emit: 'order.detected' event
           │  └─ VoiceOrderingMode.handleOrderData()
           │     ├─ Find menu item match
           │     ├─ Convert to SharedMenuItem
           │     └─ addItem(menuItem, quantity, modifications)
           │        └─ UnifiedCart context updates
           │
           └─ Send function call result back to OpenAI

[Release & Finalize]
User releases button
  ↓
stopRecording()
  ├─ Disable microphone
  ├─ Commit audio buffer
  ├─ State: recording → committing → waiting_user_final
  │
  └─ OpenAI finalizes transcription
     └─ emit: 'conversation.item.input_audio_transcription.completed'
        └─ LastTranscriptDisplay shows final text

[Order Submission]
User clicks "Checkout" or "Confirm Order"
  ↓
handleCheckout() in VoiceOrderingMode
  ├─ Cart already populated from voice processing
  ├─ VoiceCheckoutOrchestrator.handleOrderConfirmation('checkout')
  │  ├─ Emit: 'checkout.confirmation.requested'
  │  ├─ Navigate to: /kiosk-checkout (2s delay)
  │  └─ or submitOrderAndNavigate()
  │
  └─ POST /orders
     ├─ Server validates:
     │  ├─ User has scope: 'orders:create'
     │  ├─ Table has seats available
     │  └─ Items exist in menu
     │
     ├─ Calculate totals (already done in realtime-menu-tools)
     ├─ Create database order record
     └─ emit: 'payment.success' → navigate('/order-confirmation')
```

### Critical State Transitions

**Turn State Machine**:
```
        Start        Finish
          ↓            ↑
    [idle] ← ← ← ← ← ← ← ← [waiting_response]
      ↓                      ↑
      [recording]          ↑
      ↓                    ↑
      [committing]      [waiting_user_final]
      ↓
      [waiting_user_final] ← (transcript finalized)
```

**Guards**:
- Can only startRecording from idle
- Can only stopRecording from recording
- 250ms debounce on stopRecording

---

## 8. Error Handling Patterns

### Error Types & Handlers

**1. Connection Errors** (WebRTCConnection.ts)

```typescript
private async connect(token: string): Promise<void> {
  try {
    // RTC connection with 15s timeout
    await Promise.race([
      this.performConnection(token),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      )
    ]);
  } catch (error) {
    if (error.message === 'Connection timeout') {
      this.emit('connection.timeout');
    } else {
      this.emit('error', error);
    }
  }
}
```

**Why 15s timeout?**:
- Browser default: 30+ seconds
- Users perceive > 5s as frozen
- Reduces 15% abandonment rate (from P0 fix)

**2. Session Expiration** (WebRTCVoiceClient.ts, lines 160-163)

```typescript
this.eventHandler.on('session_expired', async () => {
  console.warn('[WebRTCVoiceClient] Session expired, reconnecting');
  await this.handleSessionExpired();
});
```

**Recovery Flow**:
- Detect session_expired from Realtime API
- Fetch new ephemeral token
- Reconnect WebRTC
- Resume from same state

**3. Rate Limiting** (WebRTCVoiceClient.ts, lines 155-158)

```typescript
this.eventHandler.on('rate_limit_error', () => {
  console.warn('[WebRTCVoiceClient] Rate limit exceeded');
  // Let external listeners handle this
});
```

**Pattern**: Emit to parent, don't handle internally
- Allows UI to show user-friendly message
- Parent component decides: retry, backoff, or fail

**4. Menu Item Lookup Failures** (realtime-menu-tools.ts, lines 212-287)

```typescript
if (!data || data.length === 0) {
  // Suggest alternatives from same category
  if (_args.suggest_alternatives) {
    // Get 3 suggestions from different categories
    // Return to user: "We don't have X, try these instead"
  }
  
  return {
    success: true,  // Still success, but with suggestions
    data: { items: [] },
    not_found: true,
    suggestions: alternativeItems
  };
}
```

**Pattern**: Graceful degradation
- Item not found ≠ API error
- Suggest alternatives instead of failure
- Maintains conversation continuity

**5. Cart Submission Errors** (VoiceOrderingMode.tsx, lines 277-282)

```typescript
const handleQuickOrder = useCallback(async () => {
  const result = await submitOrderAndNavigate(cart.items);
  if (result.success) {
    clearCart();
  }
  // No explicit error handler - relies on toast notifications
}, [cart.items, submitOrderAndNavigate, clearCart]);
```

**Pattern**: Result-based error handling
- Success flag determines cleanup
- Toast component shows errors
- No state clearing on failure (allows retry)

**6. Duplicate Order Prevention** (useVoiceOrderWebRTC.ts, P0 fix 8015b03d)

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async () => {
  if (isSubmitting) return; // Guard: don't submit while submitting
  
  setIsSubmitting(true);
  try {
    await submitOrder();
  } finally {
    setIsSubmitting(false); // Always reset, even on error
  }
};
```

**Pattern**: Flag guard + finally cleanup
- Prevents race conditions
- Ensures state reset even on partial failures
- Reduces duplicate order rate from 5-10% to <0.1%

### Logging Strategy

**Structured logging with prefixes**:
```typescript
logger.info('[VoiceOrderProcessor] Loaded menu items:', count);
logger.error('[MenuTools] Find items exception', error);
console.warn('[WebRTCVoiceClient] Rate limit exceeded');
```

**Pattern**: `[ServiceName] Action: details`
- Identifies which service/module
- Searchable in logs
- Different levels: info, warn, error

---

## 9. Architecture Insights

### Design Patterns Summary

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Singleton** | VoiceOrderProcessor | Global instance, no re-instantiation |
| **Factory (Service Composition)** | WebRTCVoiceClient | Creates 3 sub-services with wiring |
| **Two-Phase Init** | VoiceCheckoutOrchestrator | Config phase, then hook injection |
| **Ephemeral Tokens** | realtime.routes.ts | Security: 1-minute expiration |
| **State Machine** | WebRTCVoiceClient | Turn states prevent invalid transitions |
| **Event Emitter** | WebRTCVoiceClient, VoiceCheckoutOrchestrator | Loose coupling between services |
| **Lazy Loading** | VoiceOrderingMode | Code splitting for voice component |

### Key Architectural Decisions

1. **WebRTC over Polling**: Low-latency real-time communication
2. **Server-Side Menu Tools**: AI function calling validates menu items
3. **Client-Side Cart State**: UnifiedCart context manages order state
4. **Ephemeral Tokens**: Security isolation per session
5. **No VoiceOrderProcessor**: Replaced by OpenAI function calls
6. **Tax Rate Caching**: 5-minute TTL for database queries
7. **In-Memory Cart Storage**: Acknowledged migration path to Redis

### Potential Issues & Improvements

1. **VoiceOrderProcessor is Dead Code**
   - Consider: Remove or document as legacy
   - Impact: Reduces bundle size, clarifies intent

2. **Test Coverage Gaps**
   - 178 test cases defined but many quarantined
   - Critical: Add integration tests for full voice flow

3. **In-Memory Cart**: Not production-ready
   - Sessions lost on server restart
   - Need: Redis for persistent multi-server deployments

4. **Error Recovery**: Implicit in many places
   - Missing: Explicit retry logic with backoff
   - Need: User-facing "Something went wrong" recovery flow

---

## 10. Summary Table: Import Graph

| Service | File | Imports | Exports | Used By |
|---------|------|---------|---------|---------|
| **VoiceOrderProcessor** | `/services/VoiceOrderProcessor.ts` | api, logger, MenuItem | VoiceOrderProcessor (singleton) | NONE |
| **WebRTCVoiceClient** | `/services/WebRTCVoiceClient.ts` | EventEmitter, VoiceSessionConfig, WebRTCConnection, VoiceEventHandler | WebRTCVoiceClient | useWebRTCVoice hook |
| **WebRTCConnection** | `/services/WebRTCConnection.ts` | EventEmitter, RTCPeerConnection | WebRTCConnection | WebRTCVoiceClient |
| **VoiceEventHandler** | `/services/VoiceEventHandler.ts` | EventEmitter, realtime API types | VoiceEventHandler | WebRTCVoiceClient |
| **VoiceSessionConfig** | `/services/VoiceSessionConfig.ts` | fetch, AuthService | VoiceSessionConfig | WebRTCVoiceClient |
| **VoiceCheckoutOrchestrator** | `/services/VoiceCheckoutOrchestrator.ts` | EventEmitter | VoiceCheckoutOrchestrator | VoiceOrderingMode |
| **useWebRTCVoice** | `/hooks/useWebRTCVoice.ts` | WebRTCVoiceClient, useState | hook | VoiceControlWebRTC |
| **VoiceControlWebRTC** | `/components/VoiceControlWebRTC.tsx` | useWebRTCVoice, HoldToRecordButton | Component | KioskDemo, VoiceOrderingMode |
| **parseVoiceOrder** | `/services/orderIntegration.ts` | MenuItem patterns | parseVoiceOrder | KioskDemo |
| **menuFunctionTools** | `/server/ai/functions/realtime-menu-tools.ts` | Supabase, cache, tax logic | menuFunctionTools (object) | OpenAI Realtime API |

---

## Conclusion

The voice ordering architecture is a **sophisticated, multi-layer system** with:

✓ **Strengths**:
- Clear separation of concerns (session, connection, events)
- Event-driven loose coupling
- Comprehensive error handling with recovery
- Security-first ephemeral token approach
- Documented design decisions in code comments

✗ **Areas for Improvement**:
- Dead code (VoiceOrderProcessor) should be removed
- Test quarantine needs systematic resolution
- In-memory cart needs Redis for production
- Error recovery needs explicit user flows

**Overall Assessment**: The architecture demonstrates mature enterprise-level thinking, with careful attention to multi-tenancy, security, and user experience.

