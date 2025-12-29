# Voice Order Workflow Analysis - Server Account Perspective

## Executive Summary

The voice order system for server accounts has **significant gaps in UX feedback, error handling, and state management**, particularly around permission verification and order submission. The workflow is split between WebRTC/OpenAI realtime API (client) and REST endpoints (server), creating potential race conditions and timeout issues.

---

## 1. Authentication Flow for Server Accounts

### Current Implementation

**Entry Point:** `/server` route (ServerView component)
- File: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/pages/ServerView.tsx` (line 87)

```tsx
<RoleGuard suggestedRoles={['server', 'admin']} pageTitle="Server View - Dining Room">
```

**Auth Pipeline:**
1. Client-side role check via `RoleGuard` component
2. Server verifies JWT token via `authenticate` middleware (lines 23-108 in auth.ts)
3. Restaurant access validated with `X-Restaurant-ID` header
4. RBAC scope check via `requireScopes(ApiScope.ORDERS_CREATE)` on POST /api/v1/orders

### Issues

**Issue #1: Missing Scope Verification Before UI Rendering**
- Line 87 (ServerView.tsx): RoleGuard checks role but NOT scopes
- RBAC.ts lines 139-146 show servers have these scopes:
  ```
  ORDERS_CREATE
  ORDERS_READ
  ORDERS_UPDATE
  ORDERS_STATUS
  PAYMENTS_PROCESS
  PAYMENTS_READ
  TABLES_MANAGE
  ```
- **Problem:** If server's `orders:create` scope is missing/revoked, UI renders fully, then fails silently on submission

**Issue #2: Silent Auth Failure on Order Submission**
- File: `useVoiceOrderWebRTC.ts` lines 225-234
  ```typescript
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ||
    JSON.parse(localStorage.getItem('auth_session') || '{}').session?.accessToken

  if (!token) {
    toast.error('Please log in to submit orders')
    return false
  }
  ```
- Dual fallback (Supabase + localStorage) masks which auth method is failing
- No diagnostic logging about token source or expiration

**Issue #3: No Pre-connection Scope Validation**
- WebRTCVoiceClient (lines 68-145) connects WITHOUT checking if user has `orders:create` scope
- Server can spend 5-30 seconds recording voice before auth/scope check happens

---

## 2. Complete Click Sequence for Voice Order Initiation

### Optimal Flow (When Everything Works)

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: FLOOR PLAN INTERACTION                                  │
└─────────────────────────────────────────────────────────────────┘
UI Component: ServerFloorPlan (canvas-based)
- File: /client/src/pages/components/ServerFloorPlan.tsx
- User clicks on table/seat in canvas
- Triggers: handleTableClick() → setSelectedTableId()

↓ Result: selectedTableId set in state, SeatSelectionModal opens

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: SEAT SELECTION MODAL                                    │
└─────────────────────────────────────────────────────────────────┘
UI Component: SeatSelectionModal
- File: /client/src/pages/components/SeatSelectionModal.tsx
- Shows table.seats (e.g., 4 seats available)
- User clicks on specific seat number
- Triggers: onSeatSelect(seatNumber) → setSelectedSeat(seatNumber)

↓ Result: selectedSeat set, ready for voice order

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: START VOICE ORDER BUTTON                                │
└─────────────────────────────────────────────────────────────────┘
UI Component: SeatSelectionModal (button)
- Button text: "Start Voice Order"
- Triggers: handleStartVoiceOrder()
  - Code: ServerView.tsx lines 37-42
  - Sets: voiceOrder.setShowVoiceOrder(true)

↓ Result: VoiceOrderModal opens, VoiceControlWebRTC initializes

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: MICROPHONE PERMISSION REQUEST                           │
└─────────────────────────────────────────────────────────────────┘
UI Component: VoiceControlWebRTC
- File: /client/src/modules/voice/components/VoiceControlWebRTC.tsx
- Lines 125-146: Permission prompt renders if permissionState === 'prompt'
- User must click: "Enable Microphone" button
- Browser native dialog appears

⚠️  UNINTUITIVE STEP:
- User sees two separate permission requests:
  1. Browser native microphone dialog
  2. App-level "Enable Microphone" button
- Can confuse users about which permission is being requested

↓ Result: Navigator.mediaDevices.getUserMedia() called (line 101)
         - If granted: permissionState → 'granted', auto-connects
         - If denied: permissionState → 'denied', shows error

┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: VOICE CONNECTION ESTABLISHMENT                          │
└─────────────────────────────────────────────────────────────────┘
Process: useWebRTCVoice hook
- File: /client/src/modules/voice/hooks/useWebRTCVoice.ts
- Calls: connect() → clientRef.current.connect()
- WebRTCVoiceClient.connect() flow:

  A. Get session token (VoiceSessionConfig.getSessionToken)
  B. Fetch ephemeral token from OpenAI API
  C. Create WebRTC peer connection (createPeerConnection)
  D. Create data channel for realtime API events
  E. Connect to OpenAI endpoint (wss://api.openai.com/v1/realtime)

⚠️  TIMING ISSUE:
- Steps A-E take 2-8 seconds depending on:
  - Network latency to OpenAI
  - Browser WebRTC stack initialization
  - No user feedback during this period (lines 226-227 show "Connecting...")

⚠️  ERROR HANDLING GAP:
- If OpenAI API is down: generic error message
- No retry mechanism or fallback
- User has wasted permission grant

↓ Result: connectionState → 'connected', data channel ready

┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: VOICE RECORDING                                          │
└─────────────────────────────────────────────────────────────────┘
UI Component: HoldToRecordButton
- File: /client/src/modules/voice/components/HoldToRecordButton.tsx
- User presses and holds button
- Events: mousedown → startRecording(), mouseup → stopRecording()

Process:
  A. startRecording() called (line 112, VoiceControlWebRTC.tsx)
  B. WebRTCVoiceClient.startRecording() begins audio capture
  C. Audio data streamed to OpenAI via data channel (binary audio)
  D. OpenAI processes in realtime, returns partial transcripts

⚠️  UX ISSUES:
- Recording state only shows "Recording..." text (line 233)
- No visual waveform or audio level indicator
- No guidance on when to release button
- Hard to know if audio is being captured correctly

↓ Result: Audio captured and streamed to OpenAI

┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: TRANSCRIPTION & ORDER PARSING                           │
└─────────────────────────────────────────────────────────────────┘
Process: OpenAI Realtime API (server-side)
- OpenAI converts audio → text (speech recognition)
- Runs function calling: add_to_order() with parsed items
- Returns order event with items: [{ name, quantity, modifiers }]

VoiceEventHandler processes events:
- File: /client/src/modules/voice/services/VoiceEventHandler.ts
- Listens for 'order.detected' event
- Calls: onOrderDetected callback (useVoiceOrderWebRTC hook)

⚠️  PARSING ISSUES:
- OpenAI's fuzzy matching doesn't always work
- Example from code (VoiceOrderProcessor.ts lines 110-117):
  - "soul bowl" → matches correctly
  - "sobo" → edge case (unclear if works)
  - "halapeno pimento" → may not match "Jalapeño Pimento"

↓ Result: Transcript shown in UI, order items added to cart

┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: USER REVIEWS & CONFIRMS ORDER                           │
└─────────────────────────────────────────────────────────────────┘
UI Component: VoiceOrderModal (lines 88-172)
- Displays:
  - Current transcript (line 98-110)
  - Order items list (lines 112-162)
  - Processing indicator (lines 164-171)
  - Submit button (disabled if no items)

⚠️  MISSING FEEDBACK:
- No total price displayed
- No tax calculation shown
- No confirmation of what was understood
- If items were unmatched: buried in earlier toast messages

User can:
  1. Add more items (hold mic again)
  2. Remove items (trash icon)
  3. Submit order (green button)

↓ Result: User clicks "Submit Order" button

┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: ORDER SUBMISSION TO SERVER                              │
└─────────────────────────────────────────────────────────────────┘
API: POST /api/v1/orders
- File: server/src/routes/orders.routes.ts lines 41-92
- Headers:
  - Authorization: Bearer {token}
  - X-Restaurant-ID: {restaurantId}
  - X-Client-Flow: 'server' (from useVoiceOrderWebRTC line 242)

Payload structure:
  {
    table_number: "Table 5",
    seat_number: 2,
    items: [
      {
        id: string,
        menu_item_id: UUID,
        name: string,
        quantity: number,
        price: number,
        modifications: string[]
      }
    ],
    total_amount: number,
    customer_name: string,
    type: 'dine-in'
  }

⚠️  CRITICAL VALIDATION ISSUE (Line 76-78):
- Code checks: if (!orderData.items || orderData.items.length === 0)
- BUT items array structure must match OrderPayload schema
- If schema validation fails: returns 400 Bad Request
- Error message doesn't explain which field is wrong

Server Processing (lines 87):
  await OrdersService.createOrder(restaurantId, orderData)
  - Writes to database
  - Updates table status to 'occupied'
  - Broadcasts via WebSocket to kitchen display

⚠️  NO TIMEOUT HANDLING:
- Network timeout default: 30 seconds (browser)
- No explicit timeout in submitOrder() function
- User sees spinning button indefinitely if API hangs

↓ Result: Order created, response returned (201 Created)

┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: POST-ORDER STATE MANAGEMENT                            │
└─────────────────────────────────────────────────────────────────┘
Code: useVoiceOrderWebRTC.ts lines 275-283
  - setOrderedSeats([...orderedSeats, selectedSeat])
  - setLastCompletedSeat(selectedSeat)
  - setShowPostOrderPrompt(true)
  - setOrderItems([])

UI Component: PostOrderPrompt
- Shows options: "Add Next Seat" or "Finish Table"
- Allows multi-seat ordering workflow

⚠️  HIDDEN STATE ISSUE:
- orderedSeats maintained in hook state
- If modal closed/reopened: state may be lost
- No persistence to localStorage or sessionStorage
```

---

## 3. State Transitions During Voice Ordering

### State Machine (Visual)

```
┌─────────────┐
│   IDLE      │  ← Initial state
└──────┬──────┘
       │ onClick("Start Voice Order")
       ↓
┌──────────────────────────────┐
│   REQUESTING_PERMISSION      │  ← Awaiting navigator.mediaDevices.getUserMedia()
│   permissionState = 'prompt' │
└──────┬─────────────┬──────────┘
       │ Granted     │ Denied
       ↓             ↓
┌──────────────────────────────┐  ┌──────────────────────┐
│   CONNECTING_TO_VOICE        │  │   PERMISSION_DENIED  │
│   connectionState =          │  │   (user must enable  │
│   'connecting'               │  │    in browser)       │
└──────┬───────────────────────┘  └──────────────────────┘
       │ Success (2-8 sec)
       ↓
┌──────────────────────────────┐
│   READY_TO_RECORD            │  ← Can now press mic button
│   connectionState = 'connected'
│   isRecording = false        │
└──────┬──────────────────────┬───┐
       │                      │   │
       │ Click mic           │   │ No audio (user leaves)
       ↓                      │   │
┌──────────────────────────────┐│  │
│   RECORDING                  ││  │ timeout (60s)
│   isRecording = true         ││  │
│   → Streaming audio to OAI   ││  ↓
└──────┬───────────┬───────────┘│  ┌──────────────────────┐
       │           │            │  │   SESSION_TIMEOUT    │
       │Release    │            │  │   (reconnect needed) │
       │button     │            └──→                      │
       ↓           ↓               └──────────────────────┘
┌──────────────────────────────┐
│   PROCESSING                 │  ← OpenAI processing response
│   isProcessing = true        │     (may take 1-5 seconds)
│   → Waiting for transcript   │
│   → Waiting for function call│
└──────┬──────────────────────┬┘
       │ Success              │ Error (speech not understood)
       ↓                      ↓
┌──────────────────────────────┐ ┌──────────────────────┐
│   ITEMS_RECEIVED             │ │   RECOGNITION_FAILED │
│   Items added to cart        │ │   Toast error shown  │
│   → Can add more items       │ │   → User must retry  │
│   → Or submit                │ └──────────────────────┘
└──────┬──────────┬────────────┘
       │          │
       │Submit    │Add more
       │button    │(loop back)
       ↓          └────────────────┐
┌──────────────────────────────┐   │
│   SUBMITTING_ORDER           │   │
│   isProcessing = true        │   │
│   POST /api/v1/orders sent   │   │
└──────┬──────────┬────────────┘   │
       │          │                 │
       │Success   │Error (4xx/5xx)  │
       ↓          ↓                 │
┌──────────────────────────────┐ ┌─────────────────────┐
│   ORDER_SUBMITTED            │ │   SUBMISSION_ERROR  │
│ Show: PostOrderPrompt        │ │ Toast: error msg    │
│ Options:                     │ │ User can retry or   │
│ - Add Next Seat              │ │ cancel              │
│ - Finish Table               │ │ Order NOT created   │
└──────┬──────┬────────────────┘ └─────────────────────┘
       │      │
       │      │Finish
       │      ↓
       │   ┌──────────────────────┐
       │   │   FINISHED           │
       │   │   Reset all state    │
       │   │   Return to table    │
       │   │   selection          │
       │   └──────────────────────┘
       │
       │Add Next Seat
       ↓
   [Loop back to: READY_TO_RECORD]
```

### State Variables (useVoiceOrderWebRTC hook)

```typescript
// Voice interaction state
showVoiceOrder: boolean
currentTranscript: string
orderItems: OrderItem[]
isVoiceActive: boolean
isProcessing: boolean

// WebRTC connection state (useWebRTCVoice hook)
connectionState: 'disconnected' | 'connecting' | 'connected' | 'error'
isRecording: boolean
isListening: boolean
transcript: string
error: Error | null

// Multi-seat ordering state
orderedSeats: number[]
showPostOrderPrompt: boolean
lastCompletedSeat: number | null
```

### Critical State Inconsistencies

**Issue #1: Async State Race Condition**
- File: useVoiceOrderWebRTC.ts lines 204-294
- submitOrder() function is async but doesn't prevent duplicate submissions
- User can click "Submit Order" twice if response is slow
- Result: Two orders created for same seat

```typescript
// MISSING: if (isSubmitting) return false
const submitOrder = useCallback(async (table, seat) => {
  // No guard against concurrent calls
  setOrderItems([])  // Line 281 - clears state even if submit fails
  return true
})
```

**Issue #2: Permission State Not Persisted**
- permissionState is local component state (VoiceControlWebRTC.tsx line 29)
- User navigates away → returns → must re-grant permission
- No localStorage caching of permission status

**Issue #3: WebSocket Disconnection Not Handled**
- If OpenAI connection drops mid-order: no automatic reconnection
- User continues trying to add items → all go to /dev/null
- No visual indicator that connection was lost

---

## 4. Role-Based Restrictions & Permissions

### Server Role Scope Map

From `rbac.ts` lines 139-147:

```typescript
server: [
  ApiScope.ORDERS_CREATE,        // Can create orders
  ApiScope.ORDERS_READ,          // Can view orders
  ApiScope.ORDERS_UPDATE,        // Can update orders
  ApiScope.ORDERS_STATUS,        // Can change order status
  ApiScope.PAYMENTS_PROCESS,     // Can process payments
  ApiScope.PAYMENTS_READ,        // Can view payment info
  ApiScope.TABLES_MANAGE         // Can manage table status
]
```

### Permission Checks

**Client-Side (ServerView.tsx line 87):**
```tsx
<RoleGuard suggestedRoles={['server', 'admin']} />
```
- ✓ Prevents non-servers from seeing UI
- ✗ Doesn't check if scope was revoked
- ✗ Doesn't verify orders:create specifically

**Server-Side (orders.routes.ts line 95):**
```typescript
router.post('/voice', 
  authenticate, 
  validateRestaurantAccess, 
  requireScopes(ApiScope.ORDERS_CREATE),  // ← Explicit scope check
  async (req, res) => { ... }
)
```
- ✓ Strict scope enforcement on API
- ✗ But POST /api/v1/orders (line 41) uses `optionalAuth` + different validation
- ✗ `X-Client-Flow: 'server'` header doesn't trigger different auth path

### Missing Permission Scenarios

**Scenario 1: Scope Revoked**
- Admin removes `orders:create` from server's token
- Server UI still renders fully
- Click "Submit Order" → 403 Forbidden
- No warning about which permission is missing

**Scenario 2: Restaurant Access Revoked**
- Server's JWT has old restaurantId
- Submits order with mismatched restaurantId
- Server-side restaurantAccess middleware blocks it
- User sees generic "Authorization failed" error

**Scenario 3: Cross-Restaurant Voice Order Attempt**
- Server at Restaurant A tries to order at Restaurant B
- RoleGuard doesn't check restaurantId on ServerView
- Voice order connects successfully (no restaurant check)
- Order submission fails with 403
- **Gap:** 3-8 seconds wasted on connection

---

## 5. Console Logs & Debugging Information

### Logging Locations

**Client-Side Logging:**

1. **useVoiceOrderWebRTC.ts** (lines 43, 104, 122, etc.)
   ```typescript
   logger.info('[useVoiceOrderWebRTC] OrderParser initialized with', menuItems.length, 'items')
   logger.info('[handleOrderData] Received AI order data:', { orderData })
   logger.warn('[handleOrderData] Could not match item:', { name, confidence })
   ```
   - Issues: No error.stack included, no request IDs for correlation
   - Missing: Timestamp precision (logs are grouped but not individually timed)

2. **VoiceControlWebRTC.tsx**
   ```typescript
   console.error('Microphone permission denied:', err)
   console.warn('Cannot query microphone permission:', err)
   ```
   - Issues: Uses console directly instead of logger
   - Missing: Structured logging format, session context

3. **WebRTCVoiceClient.ts** (lines 73, 94, 124, etc.)
   ```typescript
   console.log('[WebRTCVoiceClient] Initializing orchestrator')
   console.log('[WebRTCVoiceClient] Data channel ready')
   ```
   - Issues: Only logs if debug=true
   - Missing: Performance metrics (connection time, latency)

**Server-Side Logging:**

1. **auth.ts** (lines 43, 77, 83)
   ```typescript
   logger.error('⛔ STRICT_AUTH enabled - test token rejected')
   logger.warn("⚠️ auth: role 'kiosk_demo' is deprecated")
   logger.debug('Unauthenticated request with restaurant ID')
   ```
   - Good: Level-based filtering (info/warn/error)
   - Issue: No request ID for multi-step flows

2. **rbac.ts** (lines 325, 334)
   ```typescript
   rbacLogger.debug('RBAC check passed', { userId, role, scopes })
   rbacLogger.error('RBAC middleware error:', error)
   ```
   - Good: Structured logging with context
   - Missing: Timestamp correlation with client logs

3. **orders.routes.ts** (lines 30, 80, 119, 158)
   ```typescript
   routeLogger.info('Creating order', {
     restaurantId,
     itemCount: orderData.items.length,
     isCustomerOrder,
     isAuthenticated: !!req.user
   })
   routeLogger.error('AI order parsing failed', { error })
   ```
   - Good: Contextual information included
   - Missing: Voice-specific logging (confidence, speech_duration, matched_items)

### Missing Debug Information

**Critical Gaps:**

1. No request/session correlation ID across client-server
   - Makes it impossible to trace a single voice order end-to-end
   - Need: X-Request-ID header in all API calls

2. No performance metrics logged
   - How long did WebRTC connection take?
   - How long did speech recognition take?
   - How long did order submission take?
   - Need: timing instrumentation

3. No voice-specific metrics
   - Speech confidence score not logged server-side
   - Transcription accuracy not tracked
   - AI parsing confidence score logged (line 150 of orders.routes.ts) but not used downstream

4. Error logs don't include actionable info
   - Example (line 285, useVoiceOrderWebRTC.ts):
     ```typescript
     const errorText = await response.text()
     console.error('Order submission failed:', errorText)
     ```
   - Problem: errorText is logged to console, not to logger
   - User sees generic toast message, can't see actual error

5. Network errors not distinguished from auth errors
   - Example: timeout vs 401 vs 403 all show same "Failed to submit order" message

---

## 6. Network Requests During Voice Order Placement

### Request Timeline

```
T=0ms   [CLIENT] User clicks "Start Voice Order"
         │
         ├─→ SeatSelectionModal closes
         └─→ VoiceOrderModal opens
             └─→ VoiceControlWebRTC.tsx mounts
                 └─→ useWebRTCVoice hook initializes

T=100ms [CLIENT] Microphone permission check
         │
         └─→ navigator.permissions.query({ name: 'microphone' })
             └─→ if granted: auto-connect

T=100-500ms [CLIENT] User clicks "Enable Microphone" (if not auto-granted)
         │
         └─→ navigator.mediaDevices.getUserMedia({ audio: true })
             └─→ Browser shows native permission dialog
             └─→ User grants/denies
             └─→ connect() called on grant

T=500-1000ms [CLIENT] WebRTCVoiceClient.connect() sequence
         │
         ├─→ VoiceSessionConfig.getSessionToken()
         │   └─→ getAuthToken() → get Supabase session
         │
         ├─→ POST to get OpenAI ephemeral token
         │   URL: (internal fetch, not visible in Network tab)
         │   Headers: Authorization: Bearer {supabase_token}
         │   Payload: { model: "gpt-4o-realtime-preview-2024-10-01" }
         │   Response: { token: "ephemeral_..." }
         │
         ├─→ createPeerConnection()
         │   └─→ new RTCPeerConnection({ iceServers: [...] })
         │
         └─→ Connect to OpenAI Realtime WebSocket
             URL: wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01
             Headers: 
               Authorization: Bearer {ephemeral_token}
               OpenAI-Beta: realtime=v1

T=1500-3000ms [CLIENT] WebRTC ICE negotiation
         │
         ├─→ Browser collects ICE candidates
         ├─→ Exchanges SDP with OpenAI servers
         └─→ Media connection established

T=3000-8000ms [READY] Voice connection ready
         │
         └─→ connectionState = 'connected'
             ui shows: "Ready to record" button
             user can now press mic

T=8000ms [CLIENT] User presses & holds microphone button
         │
         └─→ HoldToRecordButton.onMouseDown triggered
             └─→ WebRTCVoiceClient.startRecording()
                 └─→ Audio capture begins
                 └─→ Audio streamed to OpenAI via data channel (binary)

T=8000-15000ms [STREAMING] Audio streamed to OpenAI
         │
         └─→ OpenAI processes in realtime:
             - Converts audio to text (speech recognition)
             - Generates partial transcripts
             - Returns via data channel:
               {
                 "type": "response.text.delta",
                 "delta": "I'd like a "
               }

T=12000ms [CLIENT] User releases microphone button
         │
         └─→ HoldToRecordButton.onMouseUp triggered
             └─→ WebRTCVoiceClient.stopRecording()
                 └─→ Final audio chunk sent
                 └─→ Signals end of input

T=12000-18000ms [PROCESSING] OpenAI final processing
         │
         └─→ OpenAI:
             - Completes speech recognition
             - Runs function calling: add_to_order()
             - Sends function result
             - Streaming response text back

T=15000-20000ms [CLIENT] Transcript & Order Events Received
         │
         ├─→ Data channel event: "response.text" (final transcript)
         │   handled by: VoiceEventHandler.handleResponseText()
         │
         ├─→ Data channel event: "order.detected"
         │   {
         │     "items": [
         │       {
         │         "name": "Greek Salad",
         │         "quantity": 1,
         │         "modifiers": ["extra feta"]
         │       }
         │     ],
         │     "confidence": 0.87
         │   }
         │   handled by: useVoiceOrderWebRTC.handleOrderData()
         │
         └─→ OrderParser.findBestMenuMatch() called
             └─→ Fuzzy matching against menu items
             └─→ Returns: { menuItem, confidence }
             └─→ Item added to orderItems state

T=20000ms [CLIENT] UI Updated
         │
         └─→ VoiceOrderModal shows:
             - Current transcript
             - Matched order items
             - "Submit Order" button enabled

T=20000-25000ms [CLIENT] User reviews order & clicks "Submit Order"
         │
         └─→ Triggers: submitOrder(selectedTable, selectedSeat)

T=25000ms [CLIENT→SERVER] Order Submission Request
         │
         └─→ POST /api/v1/orders
             URL: http://localhost:3000/api/v1/orders (or production URL)
             Method: POST
             Headers:
               Content-Type: application/json
               Authorization: Bearer {supabase_token}
               X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
               X-Client-Flow: server
             Payload:
               {
                 "table_number": "5",
                 "seat_number": 2,
                 "items": [
                   {
                     "id": "voice-{timestamp}-{rand}",
                     "menu_item_id": "{uuid}",
                     "name": "Greek Salad",
                     "quantity": 1,
                     "price": 14.99,
                     "modifications": ["extra feta"]
                   }
                 ],
                 "notes": "Voice order from 5, Seat 2",
                 "total_amount": 16.20,
                 "customer_name": "Table 5 - Seat 2",
                 "type": "dine-in"
               }

T=25000-26000ms [SERVER] Order Processing
         │
         ├─→ authenticate middleware: JWT verified
         │   (Supabase token payload checked)
         │
         ├─→ validateRestaurantAccess middleware
         │   X-Restaurant-ID: 11111111-1111-1111-1111-111111111111
         │   ✓ Matched with user's restaurant_id in JWT
         │
         ├─→ validateBody: OrderPayload schema validation
         │   ✓ All required fields present and typed correctly
         │
         ├─→ Orders route handler (lines 41-92)
         │   - clientFlow = 'server'
         │   - NOT a customer order (isCustomerOrder = false)
         │   - Requires authentication: ✓ passed
         │   - Checks scopes: ✓ orders:create present
         │
         └─→ OrdersService.createOrder()
             └─→ Inserts into database:
                 INSERT INTO orders (
                   restaurant_id,
                   type,
                   status,
                   items,
                   subtotal,
                   tax,
                   total,
                   table_number,
                   seat_number
                 ) VALUES (...)
                 
                 UPDATE tables SET current_order_id = ... WHERE id = ...
                 UPDATE tables SET status = 'occupied' WHERE id = ...

T=26000-27000ms [SERVER] WebSocket Broadcast
         │
         └─→ Kitchen Display System notified:
             - New order received
             - Table 5, Seat 2
             - Items: Greek Salad x1
             
             Other displays updated:
             - Server's order count +1
             - Table 5 status changed to 'occupied'

T=27000ms [SERVER→CLIENT] Success Response (201 Created)
         │
         └─→ Response:
             {
               "success": true,
               "order": {
                 "id": "{order_uuid}",
                 "order_number": 1234,
                 "status": "new",
                 "items": [...],
                 "total": 16.20
               }
             }

T=27000-28000ms [CLIENT] Success Handling
         │
         ├─→ submitOrder() returns true
         ├─→ toast.success("Order submitted for Table 5, Seat 2!")
         ├─→ setOrderedSeats([2])
         ├─→ setLastCompletedSeat(2)
         ├─→ setShowPostOrderPrompt(true)
         ├─→ setOrderItems([])
         └─→ VoiceOrderModal closes
             PostOrderPrompt opens with options:
             - "Add Next Seat" (loop back to seat selection)
             - "Finish Table" (reset all state)
```

### Potential Failure Points

**1. OpenAI Connection Timeout (T=1500-3000ms)**
- Symptom: User sees "Connecting..." indefinitely
- Root cause: OpenAI API down, network latency > 5 seconds
- Recovery: None (requires refresh)
- **Recommendation:** Set explicit 15-second timeout, show "Connection failed" option

**2. Speech Recognition Fails (T=8000-18000ms)**
- Symptom: Order items not added to cart
- Root cause: User spoke too quietly, background noise, unclear pronunciation
- Recovery: User can try again (loops back to recording)
- **Recommendation:** Show confidence score, suggest rephrasing

**3. Fuzzy Matching Fails (T=15000-20000ms)**
- Symptom: Item not found toast appears, item not in cart
- Root cause: Menu item name doesn't match AI's parsed name
- Recovery: User must manually select from menu (breaks voice flow)
- **Recommendation:** Show unmatched items with suggestions for nearest matches

**4. Order Submission Timeout (T=25000-27000ms)**
- Symptom: Submit button spinning, no response
- Root cause: Server unreachable, database slow, network timeout
- Recovery: None (user can retry)
- **Recommendation:** Explicit 30-second timeout, show "Retry" option

**5. Duplicate Order Submission (T=27000ms)**
- Symptom: Two orders created for same seat
- Root cause: User clicks "Submit Order" twice before response received
- Recovery: Manual deletion from database
- **Recommendation:** Disable submit button after first click, disable during submission

**6. Authentication Token Expired**
- Symptom: 401 Unauthorized on order submission
- Root cause: Session expired during 20+ second voice order process
- Recovery: None (requires re-login)
- **Recommendation:** Proactive token refresh before submission, or extend expiration

---

## 7. User Journey Mapping - Problems Identified

### Unintuitive Steps

**Issue 1: Two-Level Permission Requests**
- **Step 4** in click sequence shows app-level "Enable Microphone" button AND browser dialog
- User confusion: "Why two permission dialogs?"
- **Fix:** Detect when permission is already granted, skip app-level button

**Issue 2: Silent Scope Failures**
- Server sees full UI despite missing `orders:create` scope
- Click "Submit Order" → 403 error → generic "Authorization failed" toast
- User has no idea what went wrong
- **Fix:** Check scope before opening voice modal, show why it's disabled

**Issue 3: Long Connection Wait**
- Connection takes 3-8 seconds but shows only "Connecting..." text
- User unsure if it's stuck or working
- **Fix:** Show progress: "Connecting (2/5)..." or percentage

**Issue 4: Unclear Confirmation**
- After voice order, no summary screen before submission
- User clicks "Submit Order" without verifying items/price
- **Fix:** Show modal: "Ready to submit order for Table 5, Seat 2? (3 items, $48.97)"

---

### Missing Visual Cues

**Cue 1: Audio Input Level**
- While recording, no waveform or level meter
- User doesn't know if microphone is working
- **Fix:** Add real-time audio level visualization

**Cue 2: Transcription Confidence**
- Item added to cart without showing "Matched: Greek Salad (87% confidence)"
- User doesn't know if item was correctly understood
- **Fix:** Show confidence score in order items list

**Cue 3: Total Price Before Submission**
- VoiceOrderModal doesn't show subtotal/tax/total
- User submits blind on pricing
- **Fix:** Add summary: "Subtotal: $14.99 + Tax: $1.20 = Total: $16.19"

**Cue 4: Table Status Change**
- After order submission, table status changed but not reflected in floor plan
- Server still sees table as "available" in their view
- **Fix:** Update floor plan in real-time, show "Table 5 - occupied"

**Cue 5: Connection Status**
- Indicator shows "connected" but doesn't distinguish between:
  - Waiting for speech (idle but ready)
  - Listening (actively recording)
  - Processing (waiting for response)
  - Error (connection lost but user still recording)
- **Fix:** Use distinct colors/icons for each state

---

### Race Conditions & Timing Issues

**Race Condition 1: Concurrent Recording**
- User holds mic, then presses again before release
- Second startRecording() call while first is active
- **Issue:** WebRTC state machine doesn't guard against this
- **Fix:** Add: `if (isRecording) return` in startRecording()

**Race Condition 2: Multi-Submission**
- submitOrder() called twice before first response received
- Both requests succeed, creating 2 orders for same seat
- **Issue:** No submission lock in place
- **Fix:** 
  ```typescript
  const [isSubmitting, setIsSubmitting] = useState(false)
  if (isSubmitting) return false
  setIsSubmitting(true)
  try { ... } finally { setIsSubmitting(false) }
  ```

**Race Condition 3: Permission Change During Recording**
- User grants microphone permission
- System dialog appears (e.g., "Recording indicator about to appear")
- User denies permission in settings
- Recording continues in background undetected
- **Issue:** No listener on permission changes during active recording
- **Fix:** Listen to permission changes (PermissionStatus.addEventListener)

**Race Condition 4: Token Expiration During Long Recording**
- User holds mic for 30 seconds (edge case)
- Supabase token expires mid-way (default 1 hour)
- stopRecording() called → submit order with expired token
- **Issue:** No token refresh triggered before submission
- **Fix:** Refresh token proactively if close to expiration

**Race Condition 5: Modal Close During Submission**
- User closes VoiceOrderModal while POST /api/v1/orders is in flight
- Component unmounts → state updates on unmounted component (React warning)
- Order may or may not be created (depends on timing)
- **Issue:** No abort controller for fetch request
- **Fix:**
  ```typescript
  const abortControllerRef = useRef(new AbortController())
  useEffect(() => {
    return () => abortControllerRef.current.abort()
  }, [])
  // In submitOrder: fetch(..., { signal: abortControllerRef.current.signal })
  ```

---

### Broken or Incomplete Functionality

**Broken 1: Hardcoded Restaurant ID**
- File: useVoiceOrderWebRTC.ts line 241
  ```typescript
  'X-Restaurant-ID': '11111111-1111-1111-1111-111111111111'
  ```
- **Issue:** Always uses demo restaurant ID
- **Impact:** Server's actual restaurant not used; order created at wrong location
- **Fix:** Get restaurantId from auth context or JWT

**Broken 2: No Multi-Seat State Persistence**
- File: useVoiceOrderWebRTC.ts line 309
  ```typescript
  setOrderedSeats([])  // Lost if user refreshes page
  ```
- **Issue:** Ordering multiple seats, then page refresh → progress lost
- **Impact:** User must start over on next table
- **Fix:** Persist to sessionStorage:
  ```typescript
  useEffect(() => {
    sessionStorage.setItem('orderedSeats', JSON.stringify(orderedSeats))
  }, [orderedSeats])
  ```

**Broken 3: No Fallback if OrderParser Not Initialized**
- File: useVoiceOrderWebRTC.ts lines 137-141
  ```typescript
  if (!orderParserRef.current) {
    logger.error('[handleOrderData] OrderParser not initialized')
    toast.error('Voice ordering not ready. Please refresh the page.')
    return
  }
  ```
- **Issue:** Toast shows cryptic message, user must refresh
- **Impact:** Voice order flow interrupted, must start over
- **Fix:** Add initialization guard before opening modal

**Broken 4: No Handling for Unmatched Items**
- File: useVoiceOrderWebRTC.ts lines 188-195
  ```typescript
  if (unmatchedItems.length > 0) {
    toast.error(`Could not find menu items: ${unmatchedItems.join(', ')}`)
  }
  ```
- **Issue:** Toast appears but doesn't block submission
- **Impact:** User submits incomplete order without realizing items were dropped
- **Fix:** Add items to "unmatched" section for manual selection, or block submission

**Broken 5: No Voice Order Cancellation Confirmation**
- File: ServerView.tsx lines 73-78
  ```typescript
  const handleCloseModals = useCallback(() => {
    setSelectedTableId(null)
    setSelectedSeat(null)
    setShowSeatSelection(false)
    voiceOrder.resetVoiceOrder()
  }, [])
  ```
- **Issue:** Clicking X to close VoiceOrderModal immediately discards order items
- **Impact:** User loses items accidentally (no "Are you sure?" prompt)
- **Fix:**
  ```typescript
  if (orderItems.length > 0) {
    if (!confirm('Discard order items?')) return
  }
  ```

---

## 8. Recommendations for Improvement

### Priority 1 (Critical)

1. **Add Pre-Submission Scope Check**
   - Before opening VoiceOrderModal, verify orders:create scope
   - Show disabled UI with reason if missing
   - File: ServerView.tsx → add useAuth hook

2. **Fix Hardcoded Restaurant ID**
   - Get restaurantId from auth context, not hardcoded UUID
   - File: useVoiceOrderWebRTC.ts line 241
   - Source: auth context or JWT restaurant_id field

3. **Add Duplicate Submit Guard**
   - Disable submit button during POST request
   - Use AbortController for fetch
   - File: useVoiceOrderWebRTC.ts submitOrder()

4. **Add Unmatched Item Handling**
   - Don't silently drop items that don't match menu
   - Show dialog: "Could not match: 'thing'. Try another item?"
   - File: useVoiceOrderWebRTC.ts handleOrderData()

### Priority 2 (Important)

5. **Add Pre-Submission Order Review**
   - Modal: "Submit order for Table 5, Seat 2?"
   - Show: items list + total price (with tax)
   - File: VoiceOrderModal.tsx

6. **Add Confidence Scores to UI**
   - Show per-item: "Greek Salad (87% confidence)"
   - Allow user to remove/modify low-confidence items
   - File: VoiceOrderModal.tsx orderItems display

7. **Add Audio Level Visualization**
   - Waveform or peak meter while recording
   - Visual feedback that microphone is working
   - File: VoiceControlWebRTC.tsx recording display

8. **Add Explicit Connection Timeouts**
   - Show "Connection failed, retry?" after 15 seconds
   - Prevent indefinite "Connecting..." state
   - File: WebRTCVoiceClient.ts connect()

9. **Add Request ID Correlation**
   - Generate X-Request-ID on client
   - Include in all API calls
   - Log on server to trace end-to-end
   - Files: useVoiceOrderWebRTC.ts, submitOrder()

10. **Add Multi-Seat State Persistence**
    - Save orderedSeats to sessionStorage
    - Restore on page reload
    - File: useVoiceOrderWebRTC.ts

### Priority 3 (Nice-to-Have)

11. **Add Voice Response Feedback**
    - AI should say: "I got Greek Salad, is that correct?"
    - User can say "yes" or "no"
    - File: VoiceEventHandler.ts

12. **Add Performance Metrics Dashboard**
    - Show "Speech recognized in 2.3 seconds"
    - Show "Order submitted in 1.2 seconds"
    - File: New component VoiceMetricsDashboard.tsx

13. **Add Suggested Items for Low Confidence**
    - If "thing" not found, suggest: "Did you mean: Soul Bowl, Pita Bowl?"
    - File: useVoiceOrderWebRTC.ts

14. **Add Retry Logic with Exponential Backoff**
    - Connection fails → retry after 1s → 2s → 4s
    - File: WebRTCVoiceClient.ts

---

## 9. Implementation Checklist

### High Priority Fixes

- [ ] Add scope verification before opening voice modal
- [ ] Fix hardcoded restaurant ID in useVoiceOrderWebRTC
- [ ] Add submit button guard (isSubmitting state)
- [ ] Add AbortController for fetch requests
- [ ] Add error handling for unmatched items
- [ ] Add request ID generation and logging

### Medium Priority Improvements

- [ ] Add pre-submission order review modal
- [ ] Add confidence scores to order items display
- [ ] Add audio level visualization during recording
- [ ] Add 15-second connection timeout with retry UI
- [ ] Add multi-seat state persistence

### Testing Coverage

- [ ] Test voice order with missing orders:create scope
- [ ] Test duplicate submission (click twice)
- [ ] Test connection timeout (simulate network failure)
- [ ] Test unmatched items (say menu item that doesn't exist)
- [ ] Test page reload mid-order (multi-seat flow)
- [ ] Test with expired auth token
- [ ] Test modal close while submitting

---

## Appendix: Code References

### File Locations

| Functionality | File |
|---|---|
| Server voice view | `/client/src/pages/ServerView.tsx` |
| Voice order hook | `/client/src/pages/hooks/useVoiceOrderWebRTC.ts` |
| Voice order modal | `/client/src/pages/components/VoiceOrderModal.tsx` |
| Voice control UI | `/client/src/modules/voice/components/VoiceControlWebRTC.tsx` |
| WebRTC client | `/client/src/modules/voice/services/WebRTCVoiceClient.ts` |
| Order submission API | `/server/src/routes/orders.routes.ts` |
| Auth middleware | `/server/src/middleware/auth.ts` |
| RBAC middleware | `/server/src/middleware/rbac.ts` |
| OrderParser | `/client/src/modules/orders/services/OrderParser.ts` |

### Key Functions

| Function | File | Lines |
|---|---|---|
| ServerView component | ServerView.tsx | 16-181 |
| useVoiceOrderWebRTC hook | useVoiceOrderWebRTC.ts | 23-368 |
| submitOrder | useVoiceOrderWebRTC.ts | 204-294 |
| handleOrderData | useVoiceOrderWebRTC.ts | 121-196 |
| POST /api/v1/orders | orders.routes.ts | 41-92 |
| authenticate middleware | auth.ts | 23-108 |
| RBAC requireScopes | rbac.ts | 237-338 |
| WebRTCVoiceClient.connect | WebRTCVoiceClient.ts | (partial file read) |

