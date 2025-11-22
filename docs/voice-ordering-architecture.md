# Voice Ordering Architecture - Complete Analysis

**Document Date:** 2025-11-22  
**Framework:** OpenAI Realtime API with WebRTC  
**Current Status:** Production-ready (v6.0.14)  
**Key Model:** gpt-4o-realtime-preview-2025-06-03

---

## Executive Summary

The voice ordering system uses a **distributed architecture** with three layers:

1. **Client Layer** (Browser) - WebRTC peer connection, real-time transcription
2. **Server Layer** (Express) - Ephemeral token generation, menu context loading
3. **OpenAI Layer** - Realtime API with function calling (add_to_order, confirm_order, remove_from_order)

The system supports two distinct contexts:
- **Kiosk Mode**: Customer-facing, educational, friendly tone
- **Server Mode**: Staff-facing, rapid-fire, minimal confirmations

---

## 1. CLIENT-SIDE VOICE IMPLEMENTATION

### 1.1 Core Components

#### **VoiceSessionConfig** (`client/src/modules/voice/services/VoiceSessionConfig.ts`)
**Single Responsibility:** Manage OpenAI Realtime session configuration and ephemeral token lifecycle.

**Key Responsibilities:**
- Fetch ephemeral tokens from backend (60-second expiry)
- Schedule token refresh (10 seconds before expiry)
- Build session configuration with AI instructions and tools
- Load and cache menu context
- Manage context-specific instructions (kiosk vs server)

**Token Management:**
```typescript
// Token lifecycle
1. fetchEphemeralToken() → POST /api/v1/realtime/session
2. Token expires in 60 seconds
3. scheduleTokenRefresh() triggers 10 seconds before expiry
4. New token fetched automatically for next session
```

**Session Configuration Example:**
```typescript
{
  modalities: ['text', 'audio'],  // Enable both speech input and audio output
  instructions: "<detailed AI instructions>",  // Context-specific
  voice: 'alloy',  // OpenAI Realtime voice
  input_audio_format: 'pcm16',  // 16-bit PCM
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'gpt-4o-transcribe',  // Fixed: was whisper-1 (deprecated)
    language: 'en'  // Force English (prevent Spanish auto-detection)
  },
  turn_detection: null | { type: 'server_vad', ... },  // Optional VAD
  temperature: 0.6,  // Minimum for Realtime API
  max_response_output_tokens: 200-500,  // Server: 200, Kiosk: 500
  tools: [ ... ]  // Function calling definitions
}
```

**Critical Fixes Applied:**
- **Model Fix (2025-01-18):** Changed from deprecated `whisper-1` to `gpt-4o-transcribe`
- **Language Policy:** Force `language: 'en'` to prevent Spanish auto-detection (common issue)
- **Menu Context Validation:** CRITICAL - Backend MUST return menu context, or session fails
- **Token Expiry Handling:** Uses OpenAI's actual `expires_at` value, not hardcoded 60s

---

#### **WebRTCConnection** (`client/src/modules/voice/services/WebRTCConnection.ts`)
**Single Responsibility:** Manage WebRTC peer connection lifecycle, media streams, and data channels.

**Key Components:**
- **Peer Connection Setup:** RTCPeerConnection with Google STUN servers
- **Media Handling:** 
  - Microphone input (muted initially, enabled on user action)
  - Remote audio track (AI responses via hidden audio element)
- **Data Channel:** Bidirectional JSON event communication with OpenAI
- **Error Handling:** Connection timeout (15s), reconnection with exponential backoff

**Connection Flow:**
```
1. Create RTCPeerConnection
   ├── Audio track (microphone) - MUTED initially
   └── Data channel 'oai-events' (ordered)

2. Create and send SDP offer to OpenAI
   POST https://api.openai.com/v1/realtime?model=<model>

3. Receive SDP answer from OpenAI

4. Set remote description (establishes connection)

5. Data channel onopen → emit 'dataChannelReady'
   (Critical: handler set BEFORE data channel opens to avoid race condition)

6. Microphone enabled on user action (startRecording)
   ├── enableMicrophone() sets audioTrack.enabled = true
   └── Verifies audio transmission via WebRTC stats

7. Audio muted on stop (stopRecording)
   └── disableMicrophone() sets audioTrack.enabled = false
```

**Critical Implementation Details:**

- **Audio Track State Management:**
  ```typescript
  // Audio track is MUTED initially (even if permission granted)
  audioTrack.enabled = false;  // No transmission yet
  
  // Only enabled when user explicitly holds microphone button
  enableMicrophone() → audioTrack.enabled = true
  disableMicrophone() → audioTrack.enabled = false
  ```

- **Data Channel Handler Timing:**
  ```typescript
  // CRITICAL FIX: Set onmessage BEFORE opening
  // Prevents race condition where initial events (session.created)
  // arrive before handler is attached
  this.dc.onmessage = (event) => {
    this.emit('dataChannelMessage', event.data);
  };
  ```

- **WebRTC Stats Verification:** After 2 seconds of recording, checks `outbound-rtp` audio stats to verify bytes are actually being transmitted.

---

#### **WebRTCVoiceClient** (`client/src/modules/voice/services/WebRTCVoiceClient.ts`)
**Single Responsibility:** Orchestrate all voice services - session config, connection, and event handling.

**Service Delegation Pattern:**
```
WebRTCVoiceClient (Orchestrator)
├── VoiceSessionConfig (Token management)
├── WebRTCConnection (Peer connection)
└── VoiceEventHandler (Event routing)
```

**Turn State Machine:**
```
idle ─→ recording ─→ committing ─→ waiting_user_final ─→ waiting_response ─→ idle
       (user holds)  (user releases)  (await transcript)   (await response)   (done)

Safety: 10-second timeout in waiting_user_final state (prevents stuck state)
```

**Key Methods:**
- `connect()` - Establish WebRTC connection and fetch ephemeral token
- `startRecording()` - Transition to "recording" state, enable microphone
- `stopRecording()` - Commit audio buffer, transition to "waiting_user_final"
- `disconnect()` - Clean up all services and reset state

---

#### **VoiceEventHandler** (`client/src/modules/voice/services/VoiceEventHandler.ts`)
**Single Responsibility:** Process 20+ OpenAI Realtime API event types and emit structured events.

**Event Processing Pipeline:**

```typescript
Realtime API Events
  ├── session.created → emit 'session.created'
  ├── input_audio_buffer.speech_started → emit 'speech.started'
  ├── input_audio_buffer.speech_stopped → emit 'speech.stopped'
  ├── conversation.item.input_audio_transcription.delta → accumulate user transcript
  ├── conversation.item.input_audio_transcription.completed → emit 'transcript' (final)
  ├── response.text.delta → emit 'response.text' (partial)
  ├── response.text.done → emit 'response.text' (final)
  ├── response.function_call_arguments.done → parse & emit 'order.detected'
  ├── response.done → emit 'response.complete'
  └── error → emit 'error' with diagnostic context
```

**Transcript Accumulation (LRU Cache):**
- Maintains conversation history with max 50 items
- Maps item_id → { text, final, role: 'user'|'assistant' }
- Handles partial deltas + complete events
- Defensive: Creates missing entries if conversation.item.created event is lost

**Function Call Handling:**
- Parses JSON arguments from `response.function_call_arguments.done`
- **Supported Functions:**
  - `add_to_order` - Emit 'order.detected' + 'order.items.added'
  - `confirm_order` - Emit 'order.confirmation'
  - `remove_from_order` - Emit 'order.item.removed'

**Message Queuing:**
- If data channel not open, queue events in memory
- Flush queue when data channel becomes ready
- Prevents loss of early session configuration messages

---

### 1.2 Kiosk Mode AI Instructions

**Target:** Customer-facing, educational, 1-2 sentence responses

**Core Principles:**
1. **Immediate Action:** Call `add_to_order` when items mentioned
2. **Smart Follow-ups:** Category-specific questions (dressing for salads, bread for sandwiches)
3. **Confirmation:** Always confirm final order, price, and pickup/dine-in
4. **Transcription Handling:** Map common misheard items (Soul Bowl, Peach Arugula, etc.)

**Language Policy:**
- Default to English
- Support Spanish only if explicitly requested ("¿Habla español?")

**Follow-up Question Examples:**
```
SALADS:
  "What dressing? (Vidalia Onion, Balsamic, Greek, Ranch...)"
  "Add protein? (+$4 chicken, +$6 salmon)"

SANDWICHES:
  "Bread? (white, wheat, flatbread)"
  "Side? (potato salad, fruit cup, cucumber salad...)"
  "Toasted?"

BOWLS/ENTREES:
  "Fajita Keto → Add rice for +$1?"
  "Greek → Dairy (feta/tzatziki) okay?"
  "Soul → Pork sausage okay?"
```

---

### 1.3 Server Mode AI Instructions

**Target:** Staff-facing, rapid-fire, 5-10 word responses

**Core Principles:**
1. **Speed:** Never explain menu items (staff knows menu)
2. **Defaults:** Use standard defaults, only ask if staff pauses
3. **Brevity:** "3 Greek, $42" not "I've added three Greek salads..."
4. **Batch Support:** Handle multi-item batches in single turn
5. **Allergy Capture:** Detect and flag allergies in specialInstructions
6. **Rush Orders:** Flag with `rushOrder: true` if staff says "rush" or "ASAP"

**Workflow Commands:**
```
"2 Greek salads, one with chicken, one no feta"
→ AI: "Added. 2 Greek. $42."

"Soul bowl, allergy to pork"
→ AI: "Soul Bowl, noted pork allergy. $14."

"That's it" / "Done"
→ AI confirms submission with item count + total
```

---

## 2. SERVER-SIDE IMPLEMENTATION

### 2.1 Realtime Session Endpoint

**Route:** `POST /api/v1/realtime/session`  
**Authentication:** Optional (supports both authenticated and anonymous/kiosk demo)  
**Response Time:** ~100-200ms (includes menu loading)

**Request Headers:**
```
Authorization: Bearer <user-token> (optional for kiosk demo)
x-restaurant-id: <uuid or slug>
Content-Type: application/json
```

**Response:**
```json
{
  "id": "sess_...",  // OpenAI session ID
  "client_secret": {
    "value": "sk_realtime_..."  // Ephemeral token (60s expiry)
  },
  "expires_at": 1700000000000,  // OpenAI's actual expiry
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "menu_context": "📋 FULL MENU...",  // Menu formatted for AI
}
```

**Implementation Details:**

```typescript
// 1. Resolve restaurant ID (supports UUID and slug)
const restaurantId = resolveRestaurantId(
  req.restaurantId || req.headers['x-restaurant-id']
);

// 2. Load menu data with category mapping
const [menuData, categories] = await Promise.all([
  MenuService.getItems(restaurantId),
  MenuService.getCategories(restaurantId)
]);

// 3. Format menu context (5KB limit to prevent session.update rejection)
const menuContext = formatMenuWithAllergenInfo(menuData, categories);

// 4. Validate OPENAI_API_KEY (check for malformed keys with newlines)
if (apiKey.includes('\n') || apiKey.includes('\\n')) {
  // Vercel CLI adds newlines - reject with helpful error
  return res.status(500).json({
    error: 'OPENAI_API_KEY contains invalid characters',
    details: 'Fix: Use "echo -n" when setting environment variables'
  });
}

// 5. Request ephemeral token from OpenAI
const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({ model: env.OPENAI_REALTIME_MODEL })
  // NOTE: Don't configure session here - client does after connection
});

// 6. Attach menu context to response
return res.json({
  ...data,
  menu_context: menuContext,
  restaurant_id: restaurantId
});
```

### 2.2 Menu Context Formatting

**Format:** Human-readable grouped by category with allergen info

```
📋 FULL MENU (Summer Lunch Menu - prices may vary):
=====================================

SALADS:
  • Greek Salad - $12.99 [Ask: dressing? add protein?]
    Fresh arugula and feta cheese
  • Peach Arugula Salad - $14.99 [Ask: dressing? add protein?]
    Peach, arugula, candied walnuts
  ...

SANDWICHES:
  • BLT Sandwich - $9.99 [Ask: bread type? side?]
  ...

ENTREES:
  • Grilled Salmon - $22.99 [Includes 2 sides + cornbread]
  ...

🔍 ALLERGEN INFO:
• Nuts: peanut noodles
• Dairy: feta, mozzarella, cheddar, tzatziki, sour cream
• Gluten: bread, flatbread, naan, couscous
• Pork: bacon, sausage, prosciutto

✅ REQUIRED FOLLOW-UPS:
• Salads → dressing choice
• Sandwiches → bread + side choice
• Entrées → 2 side choices
• All orders → dine-in or to-go?
```

**Size Constraints:**
- **Max 5KB** menu context (conservative limit)
- Prevents `session.update` rejection from OpenAI
- Truncation message appended if exceeded

---

### 2.3 Menu Health Check Endpoint

**Route:** `GET /api/v1/realtime/menu-check/:restaurantId`  
**Response Time:** ~50-100ms (cached)

**Response:**
```json
{
  "status": "healthy",
  "restaurant_id": "11111111-1111-1111-1111-111111111111",
  "item_count": 42,
  "available_item_count": 40,
  "category_count": 8,
  "categories_with_items": 7,
  "timestamp": "2025-11-22T12:00:00Z"
}
```

**Use Case:** Monitor voice ordering capability in production

---

### 2.4 Health Check Endpoint

**Route:** `GET /api/v1/realtime/health`

**Response:**
```json
{
  "status": "healthy" | "unhealthy",
  "checks": {
    "api_key": true,
    "api_key_valid": true,
    "model_configured": true,
    "model": "gpt-4o-realtime-preview-2025-06-03"
  },
  "timestamp": "2025-11-22T12:00:00Z"
}
```

---

### 2.5 OpenAI API Integration

**Model:** `gpt-4o-realtime-preview-2025-06-03`

**Key Configuration:**
```typescript
{
  model: 'gpt-4o-realtime-preview-2025-06-03',  // Latest model
  voice: 'alloy',  // Available: alloy, echo, fable, onyx, nova, shimmer
  temperature: 0.6,  // Minimum for Realtime API (controls randomness)
  max_response_output_tokens: 200 (server) | 500 (kiosk),
  input_audio_format: 'pcm16',  // 16-bit PCM @ 24kHz
  output_audio_format: 'pcm16',
  input_audio_transcription: {
    model: 'gpt-4o-transcribe',  // NOT whisper-1 (deprecated)
    language: 'en'  // Force English transcription
  }
}
```

**Audio Format:**
- **Sample Rate:** 24kHz (fixed by OpenAI)
- **Bit Depth:** 16-bit PCM
- **Channels:** Mono
- **Buffer Size:** ~384 samples per frame

---

## 3. REALTIME API FUNCTION TOOLS

### 3.1 Function Definitions

#### Kiosk Mode Tools

**1. add_to_order**
```typescript
{
  type: 'function',
  name: 'add_to_order',
  description: "Add items when customer mentions menu items",
  parameters: {
    items: [{
      name: string,           // "Greek Salad", "Soul Bowl", etc.
      quantity: integer,      // 1, 2, 3...
      modifications?: string[],  // "no onions", "extra cheese"
      specialInstructions?: string
    }]
  }
}
```

**2. confirm_order**
```typescript
{
  type: 'function',
  name: 'confirm_order',
  description: "Confirm order and proceed to checkout",
  parameters: {
    action: 'checkout' | 'review' | 'cancel'
  }
}
```

**3. remove_from_order**
```typescript
{
  type: 'function',
  name: 'remove_from_order',
  description: "Remove items when customer changes mind",
  parameters: {
    itemName: string,
    quantity?: integer  // Optional - removes all if not specified
  }
}
```

#### Server Mode Tools

Same structure plus additional fields:
- `allergyNotes`: string - Capture dietary restrictions
- `rushOrder`: boolean - Flag for "rush" / "ASAP" requests

Plus server-specific function:
- `confirm_seat_order`: action = 'submit' | 'review' | 'next_seat' | 'finish_table'

---

### 3.2 Menu Tools (Server-side Cart Management)

**Location:** `server/src/ai/functions/realtime-menu-tools.ts`

**Tools Available:**
- `find_menu_items`: Search by name, category, price, dietary
- `get_item_details`: Get full item info (allergens, ingredients, etc.)
- `add_to_order`: Add to in-memory cart
- `remove_from_order`: Remove from cart
- `get_current_order`: Get cart summary
- `get_store_info`: Hours, address, contact
- `get_specials`: Daily specials
- `clear_order`: Reset cart

**Cart Storage:**
- In-memory Map<sessionId, Cart>
- Expires after 30 minutes of inactivity
- Cleanup runs every 5 minutes

**Tax Rate Handling:**
- Fetches from restaurants table (cached 5 minutes)
- Applies to subtotal when adding/removing items
- Default fallback: 0.08 (8%)

---

## 4. DATA FLOW & SEQUENCE DIAGRAMS

### 4.1 Connection Establishment Sequence

```
Client                  Server              OpenAI Realtime API
  |                       |                       |
  +---(1) getToken()----->|                       |
  |    (fetch ephem)      |                       |
  |                       +--(2) Load Menu------->|
  |                       |                       |
  |<---(3) Return Token + Menu Context-----------+
  |       + expires_at                           |
  |       + restaurant_id                        |
  |                       |                       |
  +---(4) Create RTCPeerConnection               |
  |       + Microphone (muted)                   |
  |       + Data channel                         |
  |                       |                       |
  +---(5) Send SDP Offer + Token---------------->|
  |       POST /v1/realtime?model=...            |
  |                       |                       |
  |<---(6) Receive SDP Answer + Session ID-------+
  |                       |                       |
  +---(7) Set Remote Description                 |
  |                       |                       |
  +---(8) Data Channel Opens                     |
  |       emit 'dataChannelReady'                |
  |                       |                       |
  +---(9) Session Config Message                 |
  |       {'type': 'session.update', ...}        |
  |-----(10) Handle Session Created-------->|
  |       {'type': 'session.created'}           |
  |                       |                       |
  |<~~~~~~ READY FOR VOICE INPUT ~~~~~~~>|
```

### 4.2 Voice Capture & Processing Sequence

```
User                    Client              OpenAI Realtime API
  |                       |                       |
  +-- Hold Mic Button --->|                       |
  |     (startRecording)  |                       |
  |                       +--(1) Enable Microphone
  |                       |     audioTrack.enabled = true
  |                       |                       |
  |<--- "Click" ------+---|                       |
  |   (speech started)    |                       |
  |                       +--(2) Transmit Audio-->|
  |                       |     (PCM16 chunks)    |
  |                       |                       |
  +-~ Speech Output ~~~-->|                       |
  |  (5-10 seconds)       +--(3) Transcribe-------->
  |                       |     (live updates)    |
  |                       |<--(4) Transcript Delta-|
  |                       |     Partial text      |
  |                       |                       |
  +-- Release Button ---->|                       |
  |   (stopRecording)     |--(5) Disable Microphone
  |                       |    audioTrack.enabled = false
  |                       |                       |
  |                       |--(6) Commit Audio Buffer
  |                       |     input_audio_buffer.commit
  |                       |                       |
  |                       |<--(7) Transcript Completed
  |                       |     Final transcript  |
  |                       |                       |
  |                       |--(8) Response.Create-->
  |                       |     Trigger response  |
  |                       |                       |
  |                       |<--(9) Response Text Delta
  |                       |     Partial response  |
  |                       |                       |
  |<- Display Response ---+                       |
  |                       |<--(10) Audio Stream---
  |                       |      (WebRTC)        |
  |<- Play AI Voice ------+                       |
  |                       |<--(11) Response Done--
  |                       |     (done=true)      |
  |                       |                       |
  +~~~~~~ READY FOR NEXT TURN ~~~~~~>
```

### 4.3 Order Detection Sequence

```
User                 Client             OpenAI API          Emit Event
  |                    |                    |                    |
  +"Greek salad"------>|                    |                    |
  |                    +--(1) Send Audio-->|                    |
  |                    |                   |                    |
  |                    |<-(2) Transcript---+-"Greek salad"------|
  |                    |                   |                    |
  |                    |                   |-(3) Function Call |
  |                    |                   |   add_to_order    |
  |                    |<-(4) Function Arguments Done---------  |
  |                    |   {"name": "Greek Salad", "qty": 1} |
  |                    |                   |                    |
  |                    |-------(5) Parse & Emit------->|
  |                    |   event: 'order.detected'    |
  |                    |   { items, confidence: 0.95 }|
  |                    |                   |                    |
  |<-- Update UI ------+                   |                    |
  |  Add to order list                     |                    |
  |                    |                   |                    |
  |                    |<-(6) AI Response--+--"Greek salad..."|
  |<-- Play Response --+-- "What dressing?"                    |
  |  (audio output)    |                   |                    |
```

---

## 5. CONFIGURATION & SETUP COMPLEXITY

### 5.1 Environment Variables Required

**Client-side (public):**
```env
VITE_API_BASE_URL=http://localhost:3001  # Backend URL
VITE_DEMO_PANEL=1                         # Enable dev auth overlay
VITE_OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
```

**Server-side (secret):**
```env
OPENAI_API_KEY=sk_realtime_...           # CRITICAL - No newlines!
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
SUPABASE_SERVICE_KEY=...                 # For menu loading
SUPABASE_URL=...
```

### 5.2 Common Setup Issues

**Issue 1: OPENAI_API_KEY Contains Newlines**
- **Cause:** Vercel CLI adds `\n` when setting env vars
- **Symptom:** "Invalid characters in API key"
- **Fix:** Use `echo -n` instead of `echo` when setting variable
- **Detection:** Endpoint checks for `\n`, `\\n`, `\r` in API key

**Issue 2: Menu Context Not Returned**
- **Cause:** MenuService.getItems() returns empty array
- **Symptom:** "CRITICAL: Backend returned no menu context"
- **Fix:** Verify menu items exist in database for restaurant_id
- **Fallback:** Session fails with 503 error (explicit, not silent)

**Issue 3: WebRTC Audio Not Transmitting**
- **Symptom:** Transcript never received despite microphone enabled
- **Cause:** Audio track not properly enabled OR microphone permission denied
- **Diagnostics:** Client logs WebRTC stats (outbound-rtp bytes sent)

**Issue 4: Session.update Rejected (Oversized Config)**
- **Symptom:** OpenAI API error "message too large"
- **Cause:** Menu context > 50KB OR instructions > 30KB
- **Fix:** Menu context limited to 5KB, truncated with message if needed

---

## 6. VOICE-TO-ORDER CONVERSION

### 6.1 Client-side VoiceOrderProcessor

**Location:** `client/src/modules/voice/services/VoiceOrderProcessor.ts`

**Workflow:**
```
User Voice Input
  ↓
VoiceEventHandler emits 'order.detected'
  ↓
VoiceOrderProcessor.parseTranscriptForItems()
  ├── Match against menu items (fuzzy matching)
  ├── Extract quantity (words: "two", "couple", or numbers)
  ├── Extract modifiers ("no cheese", "extra sauce")
  └── Return ParsedOrderItem[]
  ↓
Add to VoiceOrderContext
  ├── Calculate subtotal (price × quantity + modifiers)
  └── Update UI with running total
  ↓
submitCurrentOrder()
  ├── Convert to OrderItem[]
  ├── Calculate subtotal + tax (8% default)
  └── POST /api/orders
```

**Transcription Error Handling:**
```typescript
const transcriptionMap = {
  'Soul Bowl': ['soul bowl', 'sobo', 'solo bowl', 'sowl bowl'],
  'Peach Arugula': ['peach arugula', 'peach a ruler', 'peach rugula'],
  'Jalapeño Pimento': ['jalapeño pimento', 'holla peno', 'jalapeno pimento'],
  'Succotash': ['succotash', 'suck a tash', 'succa tash'],
  // ... more variations
};
```

### 6.2 AI-side Function Call Parsing

**In VoiceEventHandler:**
```typescript
case 'response.function_call_arguments.done':
  const args = JSON.parse(event.arguments);
  
  if (event.name === 'add_to_order') {
    emit 'order.detected' with {
      items: args.items,  // [{ name, quantity, modifications?, ... }]
      confidence: 0.95,
      timestamp: Date.now()
    };
  }
```

---

## 7. AUTHENTICATION & SECURITY

### 7.1 Dual Auth Pattern (ADR-006)

**Session Endpoint supports two auth modes:**

1. **Authenticated (Production Users)**
   - Requires valid JWT in Authorization header
   - Linked to Supabase user account
   - Standard email/password flow

2. **Anonymous (Kiosk Demo)**
   - No token required (optional auth)
   - Supported via demo mode flag
   - Uses `getOptionalAuthToken()` fallback

**Implementation:**
```typescript
// VoiceSessionConfig.ts
const authToken = this.authService.getOptionalAuthToken
  ? await this.authService.getOptionalAuthToken()  // Try optional first
  : await this.authService.getAuthToken();          // Fall back to required

const headers: Record<string, string> = { 'x-restaurant-id': restaurantId };
if (authToken) {
  headers['Authorization'] = `Bearer ${authToken}`;
}
```

### 7.2 Ephemeral Token Security

- **Lifetime:** 60 seconds (one-time use)
- **Scope:** Client-specific, tied to session ID
- **No Caching:** `Cache-Control: no-store, no-cache, must-revalidate`
- **Auto-refresh:** New token fetched 10 seconds before expiry

---

## 8. PERFORMANCE CHARACTERISTICS

### 8.1 Latency Breakdown

| Component | Latency | Notes |
|-----------|---------|-------|
| Ephemeral token fetch | 100-200ms | Includes menu loading |
| WebRTC connection | 500-1000ms | SDP exchange + ICE |
| First transcript delta | 200-500ms | Real-time transcription |
| AI response generation | 1000-3000ms | Context-aware, function calling |
| Audio playback start | 500-1000ms | Stream buffering |
| **Total E2E latency** | **2-5 seconds** | User says → hears response |

### 8.2 Memory Usage

**Client-side:**
- WebRTCVoiceClient: ~2-5MB (peak during active session)
- LRU transcript cache: ~1-2MB (50 conversation items)
- Audio buffers: ~5-10MB (WebRTC internal)

**Server-side:**
- Menu cache (NodeCache): ~1-5MB per restaurant
- Cart storage (in-memory): ~100KB per active session
- Supabase connections: ~1MB per connection pool

---

## 9. ERROR HANDLING & RECOVERY

### 9.1 Automatic Recovery Mechanisms

| Error Type | Detection | Recovery |
|-----------|-----------|----------|
| WebRTC connection timeout | 15s without connection | Emit 'error', allow retry |
| Ephemeral token expiry | isTokenValid() check | Fetch new token before next session |
| Data channel close | onclose event | Emit 'disconnection', manual reconnect |
| Menu load failure | Empty array return | Fail fast with 503 error |
| API key validation | Newline detection | Return 500 with fix instructions |
| Session configuration error | OpenAI error event | Log diagnostic details, retry |

### 9.2 Turn State Machine Safety

```typescript
// 10-second safety timeout prevents stuck states
this.turnStateTimeout = setTimeout(() => {
  if (this.turnState === 'waiting_user_final') {
    logger.warn('Timeout waiting for transcript, resetting to idle');
    this.resetTurnState();
  }
}, 10000);
```

---

## 10. TESTING INFRASTRUCTURE

### 10.1 Available Tests

**Client-side:**
```bash
# Voice module tests (skipped in CI)
npm test -- VoiceSessionConfig.test.ts
npm test -- WebRTCConnection.test.ts
npm test -- VoiceEventHandler.test.ts
npm test -- VoiceCheckoutOrchestrator.test.ts
```

**Server-side:**
```bash
# Menu tools
npm run test:server -- realtime-menu-tools.test.ts

# Realtime routes
npm run test:server -- realtime.routes.test.ts
```

### 10.2 Manual Testing

**Health Check:**
```bash
curl http://localhost:3001/api/v1/realtime/health
# Expected: { "status": "healthy", "checks": {...} }
```

**Menu Check:**
```bash
curl http://localhost:3001/api/v1/realtime/menu-check/11111111-1111-1111-1111-111111111111
# Expected: { "status": "healthy", "item_count": X, ... }
```

**Session Creation:**
```bash
curl -X POST http://localhost:3001/api/v1/realtime/session \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111" \
  -H "Content-Type: application/json"
# Expected: { "id": "sess_...", "client_secret": {...}, "menu_context": "..." }
```

---

## 11. MONITORING & DIAGNOSTICS

### 11.1 Logging

**Key Log Points:**
```typescript
// Client
'[VoiceSessionConfig] Fetching ephemeral token'
'[VoiceSessionConfig] Menu context loaded: X lines'
'[WebRTCConnection] Audio track enabled - transmitting audio'
'[VoiceEventHandler] Got transcript delta: "user said..."'
'[WebRTCVoiceClient] Function call: add_to_order'

// Server
'[realtime-routes] Creating ephemeral token for real-time session'
'[realtime-routes] Loaded menu for voice context: X items'
'[realtime-routes] Ephemeral token created successfully'
'[realtime-routes] Failed to load menu context - cannot proceed'
```

### 11.2 Debugging Tips

**Enable Debug Mode:**
```typescript
new WebRTCVoiceClient({
  restaurantId: '11111111-1111-1111-1111-111111111111',
  debug: true  // Enables verbose logging
});
```

**Monitor WebRTC Stats:**
- Open browser DevTools → Console
- Check for messages like:
  - `[WebRTCConnection] Audio transmission stats (after 2s)`
  - `CRITICAL: No outbound-rtp audio track found in stats!`

**Capture Network Requests:**
- Network tab shows:
  - `POST /api/v1/realtime/session` (token request)
  - `POST https://api.openai.com/v1/realtime?model=...` (SDP offer)

---

## 12. FUTURE IMPROVEMENTS & CONSIDERATIONS

### 12.1 Performance Optimizations
- [ ] Implement Redis for cart storage (instead of in-memory)
- [ ] Cache menu context for 15 minutes (currently reloaded per session)
- [ ] Implement WebRTC connection pooling for rapid re-connections
- [ ] Add client-side VAD for better UX (reduce network overhead)

### 12.2 Feature Enhancements
- [ ] Support for multiple languages (not just English/Spanish)
- [ ] Voice-based loyalty program integration
- [ ] Real-time order status updates via WebRTC
- [ ] Multi-customer seat management (server mode)

### 12.3 Production Readiness
- [ ] Implement session encryption (TLS for ephemeral tokens)
- [ ] Add rate limiting on token generation endpoint
- [ ] Implement analytics pipeline for voice ordering metrics
- [ ] Add fallback to Whisper API if Realtime API unavailable

---

## Summary Table

| Aspect | Detail |
|--------|--------|
| **Framework** | OpenAI Realtime API + WebRTC |
| **Models** | gpt-4o-realtime-preview-2025-06-03 (voice), gpt-4o-transcribe (transcription) |
| **Authentication** | Dual pattern (JWT + optional) |
| **Menu Context** | 5KB max, formatted with allergen info |
| **Ephemeral Tokens** | 60s lifetime, auto-refresh |
| **Turn Latency** | 2-5 seconds E2E |
| **Function Calling** | 3-8 functions (context-dependent) |
| **State Machine** | 5 states, 10s safety timeout |
| **Error Recovery** | Automatic reconnection, explicit failures |
| **Supported Contexts** | Kiosk (customer) + Server (staff) |
| **Languages** | English primary, Spanish optional |

---

**Last Updated:** 2025-11-22  
**Status:** Production-ready (v6.0.14)  
**Maintainer:** Claude Code / Rebuild Team
