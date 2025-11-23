# Voice Ordering Troubleshooting Guide

**Last Updated:** 2025-01-23
**Status:** Active
**Audience:** Developers, Operations Team, Support Engineers

## Quick Reference

| Issue | Severity | First Action |
|-------|----------|--------------|
| Session never initializes | P0 | Check browser console, network tab |
| No transcription events | P0 | Check model is `gpt-4o-transcribe` |
| Agent doesn't know menu | P0 | Check backend token config |
| Agent speaks wrong language | P0 | Check backend instructions |
| Connection timeout | P1 | Check network, verify token valid |
| Cart not updating | P2 | Check function call logs |
| Session expires | P3 | Normal - auto-reconnects |

---

## Critical Issues (P0)

### Voice Session Never Initializes

**Impact:** Voice ordering completely non-functional. Connection never establishes.

**Symptoms:**
- User clicks "Tap to Start"
- Status shows "Voice service is preparing..." indefinitely
- WebSocket/connection status shows "Disconnected" (never changes)
- Recording status shows "Inactive"
- Debug panel shows "Waiting for voice logs..." forever
- NO console logs appear (specifically no "📤 Sending session.update" log)
- NO `session.created` event fires

**What This Means:**
The WebRTC connection to OpenAI Realtime API is failing before the session even starts. This is BEFORE the transcription phase, so the issue is in connection establishment, not model configuration.

**Diagnostic Steps:**

#### Step 1: Check Browser Console (CRITICAL)
```javascript
// Open DevTools Console and look for:
// ✅ Expected logs if working:
"🔵 [WebRTC] STEP 1: Starting connection with token:"
"🔵 [WebRTC] STEP 2: Microphone setup complete"
"🔵 [WebRTC] STEP 3: Sending SDP to OpenAI..."
"🔵 [WebRTC] STEP 4: Remote description set, waiting for data channel..."
"🟢 [WebRTC] STEP 5: Data channel OPENED - connection established!"
"🎯 [WebRTCVoiceClient] Session created event received"
"📤 [WebRTCVoiceClient] Sending session.update:"

// ❌ Problem indicators:
"🔴 [WebRTC] OpenAI SDP exchange FAILED:"  // SDP exchange failure
"Connection timeout after 15 seconds"      // Connection timeout
"getUserMedia error"                        // Microphone access issue
"Failed to get ephemeral token"            // Backend API failure
// OR: No logs at all → connection never started
```

#### Step 2: Check Network Tab
```
In DevTools > Network tab:

1. Filter for "realtime"
2. Look for these requests:

   ✅ POST /api/v1/realtime/session
      Status: Should be 200
      Response: Should have client_secret, menu_context

   ✅ POST https://api.openai.com/v1/realtime?model=...
      Status: Should be 200
      Response: SDP answer

   ❌ If either is missing or failed:
      - 401: Token/auth issue
      - 400: SDP format issue
      - 500: Server error
      - Failed/CORS: Network block
```

#### Step 3: Test Infrastructure
```javascript
// Run in browser console to test components:

// Test 1: Backend reachable?
fetch('https://july25.onrender.com/api/v1/health')
  .then(r => r.json())
  .then(d => console.log('Backend:', d))
  .catch(e => console.error('Backend unreachable:', e));

// Test 2: OpenAI API reachable?
fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03')
  .then(r => console.log('OpenAI reachable, status:', r.status))
  .catch(e => console.error('OpenAI blocked:', e));

// Test 3: WebRTC supported?
console.log('RTCPeerConnection:', typeof RTCPeerConnection !== 'undefined');
console.log('getUserMedia:', typeof navigator.mediaDevices?.getUserMedia !== 'undefined');
```

**Root Causes (in order of likelihood):**

#### 1. SDP Exchange Failure (40% probability)

**What**: Frontend creates WebRTC offer (SDP), sends to OpenAI, but OpenAI rejects it.

**How to detect**:
- Network tab shows POST to `api.openai.com/v1/realtime` with 400/401/500 status
- Console shows: `🔴 [WebRTC] OpenAI SDP exchange FAILED`

**Possible reasons**:
- Ephemeral token invalid/expired
- SDP malformed
- Model parameter incorrect
- OpenAI API outage

**Fix**:
```bash
# 1. Verify backend generates valid tokens
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111" | jq .

# Should have:
# - client_secret.value (string starting with 'ek_')
# - expires_at (future timestamp)
# - menu_context (3000+ characters)

# 2. Check if token is actually being sent to OpenAI
# (Network tab → Headers → Authorization should have "Bearer ek_...")

# 3. If SDP is malformed, check WebRTCConnection.ts:197-198
# Ensure createOffer() is succeeding
```

#### 2. Data Channel Never Opens (30% probability)

**What**: SDP exchange succeeds, but data channel `onopen` event never fires.

**How to detect**:
- Console shows: "🔵 STEP 4: Remote description set, waiting for data channel..."
- But NEVER shows: "🟢 STEP 5: Data channel OPENED"
- After 15 seconds: "Connection timeout"

**Possible reasons**:
- ICE candidate gathering failing
- Firewall blocking UDP traffic
- Network NAT issues
- STUN server unreachable

**Fix**:
```javascript
// Test ICE gathering:
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
const dc = pc.createDataChannel('test');
dc.onopen = () => console.log('✅ Data channel opened');
dc.onerror = (e) => console.error('❌ Data channel error:', e);

pc.createOffer().then(offer => {
  pc.setLocalDescription(offer);
  console.log('ICE gathering started...');
});

pc.onicecandidate = e => {
  if (e.candidate) {
    console.log('ICE candidate:', e.candidate.type, e.candidate.protocol);
  } else {
    console.log('ICE gathering complete');
  }
};

// Should see multiple ICE candidates (host, srflx, relay)
// If no candidates → network blocking WebRTC
```

**Workaround**:
- Try from different network
- Disable VPN
- Check firewall allows UDP ports
- Add TURN server fallback (requires config change)

#### 3. Backend API Call Failing (15% probability)

**What**: Frontend never successfully calls `/api/v1/realtime/session`.

**How to detect**:
- Network tab shows NO request to `/api/v1/realtime/session`
- OR shows request with 4xx/5xx status
- Console shows: "Failed to get ephemeral token: {status}"

**Possible reasons**:
- VITE_API_BASE_URL misconfigured
- CORS blocking request
- Auth token missing/invalid
- Restaurant ID invalid

**Fix**:
```bash
# 1. Check environment variable in production:
#    Vercel dashboard → Settings → Environment Variables
#    VITE_API_BASE_URL should be: https://july25.onrender.com

# 2. Test backend endpoint directly:
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H "Content-Type: application/json" \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111"

# Should return 200 with token

# 3. If CORS error, verify backend allows origin:
#    Server should have: Access-Control-Allow-Origin: https://july25-client.vercel.app
```

#### 4. Connection Timeout (10% probability)

**What**: Connection takes >15 seconds and times out.

**How to detect**:
- Console shows: "Connection timeout after 15 seconds"
- Steps 1-4 complete but step 5 never happens

**Possible reasons**:
- Slow network
- OpenAI API high latency
- Microphone permission prompt blocking (but user confirmed not the issue)

**Fix**:
```typescript
// Increase timeout in WebRTCConnection.ts:88:
const CONNECTION_TIMEOUT = 30000; // Increase from 15000 to 30000

// OR add progress indicator:
setTimeout(() => {
  console.log('⏳ Connection taking longer than usual...');
  // Show UI message to user
}, 10000);
```

#### 5. JavaScript Error Breaking Flow (5% probability)

**What**: Uncaught exception during connection setup stops execution.

**How to detect**:
- Console shows red error with stack trace
- Error occurs during connection but isn't caught
- Execution stops mid-flow

**Fix**:
```typescript
// Add try/catch around connection code
try {
  await this.connection.connect(ephemeralToken);
} catch (error) {
  console.error('Connection failed:', error);
  this.emit('error', error);
  throw error; // Re-throw after logging
}
```

**Temporary Diagnostic Logging:**

If none of the above identifies the issue, add this logging:

```typescript
// File: client/src/modules/voice/services/WebRTCConnection.ts

// Add at line 150:
console.log('🔵 DIAGNOSTIC START:', {
  timestamp: new Date().toISOString(),
  token: ephemeralToken.substring(0, 15) + '...',
  tokenLength: ephemeralToken.length
});

// Add at line 208:
console.log('🔵 DIAGNOSTIC SDP:', {
  endpoint: `https://api.openai.com/v1/realtime?model=${model}`,
  sdpLength: offer.sdp?.length,
  hasToken: !!ephemeralToken
});

// Add at line 220:
const responseBody = await sdpResponse.text();
console.error('🔴 DIAGNOSTIC FAILURE:', {
  status: sdpResponse.status,
  statusText: sdpResponse.statusText,
  body: responseBody.substring(0, 200),
  headers: Array.from(sdpResponse.headers.entries())
});

// Add at line 421:
console.log('🟢 DIAGNOSTIC SUCCESS:', {
  timestamp: new Date().toISOString(),
  channel: dc.label,
  state: dc.readyState
});
```

Deploy these logs, test in production, and share the console output for analysis.

**Emergency Rollback:**

If the issue is urgent and no fix is immediately available:

```bash
# Revert to last known working commit
git log --oneline --all | grep voice  # Find last working commit
git revert <commit-sha> --no-commit
git commit -m "Rollback: Revert voice changes to restore functionality"
git push

# Then investigate root cause offline
```

**References:**
- Investigation report: `/tmp/VOICE_WEBRTC_CONNECTION_FAILURE_INVESTIGATION.md`
- Fix plan: `/tmp/VOICE_FIX_PLAN.md`
- WebRTC Connection code: `client/src/modules/voice/services/WebRTCConnection.ts`
- Session Config code: `client/src/modules/voice/services/VoiceSessionConfig.ts`

---

### No Transcription Events Received

**Impact:** Voice ordering completely non-functional. Orders cannot be processed.

**Symptoms:**
- Recording indicator shows (mic is active)
- Audio transmits successfully (check network tab: 49KB+ sent, 1140+ packets)
- OpenAI agent responds with voice
- NO transcript text appears in UI
- Console shows: `❌ No conversation.item.input_audio_transcription.delta events`
- State machine stuck in `waiting_user_final` for 10 seconds, then timeout

**Root Causes (in order of likelihood):**

#### 1. Using Deprecated `whisper-1` Model (Most Common)

**Background:** OpenAI deprecated `whisper-1` model for Realtime API in January 2025. This was a silent deprecation - no error messages, no advance notice.

**Diagnostic:**
```bash
# Check current model in source code
grep -n "model:" client/src/modules/voice/services/VoiceSessionConfig.ts

# Should show:
# 253:        model: 'gpt-4o-transcribe'

# If it shows 'whisper-1', that's the problem
```

**Fix:**
1. Edit `client/src/modules/voice/services/VoiceSessionConfig.ts`
2. Find the `input_audio_transcription` configuration (around line 252)
3. Update:
```typescript
// BEFORE (Broken)
input_audio_transcription: {
  model: 'whisper-1',
  language: 'en'
}

// AFTER (Fixed)
input_audio_transcription: {
  model: 'gpt-4o-transcribe'  // Auto-detects language
}
```
4. Remove the `language` parameter (gpt-4o-transcribe auto-detects)
5. Rebuild and deploy

**Verification:**
```javascript
// In browser console, after connecting:
// Look for session.update log showing:
📤 [WebRTCVoiceClient] Sending session.update:
  model: "gpt-4o-transcribe"  // ✅ Correct

// Then test voice ordering and look for:
📝 [VoiceEventHandler] Got transcript delta: "I'd like"
📝 [VoiceEventHandler] Got transcript delta: " a greek salad"
✅ [VoiceEventHandler] Got transcript completed: "I'd like a greek salad"
```

**References:**
- Detailed RCA: `docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`
- Fix commit: `3a5d126f`
- OpenAI Community: https://community.openai.com/t/cant-get-the-user-transcription-in-realtime-api/1076308

#### 2. Audio Buffer Not Committed

**Diagnostic:**
```javascript
// Check browser console for:
'input_audio_buffer.commit' event  // Should appear when button released

// If missing, check:
- Button release event firing correctly
- WebRTCVoiceClient.stopRecording() being called
```

**Fix:**
- Verify `onMouseUp`/`onTouchEnd` events bound correctly
- Check `stopRecording()` calls `this.eventHandler.sendEvent({ type: 'input_audio_buffer.commit' })`

#### 3. Ephemeral Token Expired

**Diagnostic:**
```javascript
// Check token age in console:
const tokenAge = Date.now() - tokenExpiresAt;
console.log('Token age (ms):', tokenAge);
// If > 60000ms (60 seconds), token expired
```

**Fix:**
- Token auto-refreshes every 60 seconds
- If refresh failing, check `/api/v1/realtime/session` endpoint
- Verify backend can fetch OpenAI ephemeral tokens

#### 4. Network Interruption

**Diagnostic:**
- Check Network tab: WebRTC connection state
- Look for `RTCIceConnectionState: 'disconnected'` or `'failed'`

**Fix:**
- Client will auto-reconnect with exponential backoff
- If persistent, check firewall/proxy settings for WebRTC

---

## High Priority Issues (P1)

### Agent Doesn't Know Menu (CRITICAL - Now P0)

**Impact:** Voice ordering completely non-functional. Agent has NO knowledge of menu items.

**Symptoms:**
- AI responds: "What menu are you talking about?"
- AI responds: "I don't have access to the menu"
- AI can't add items to cart
- Function calls for `add_to_order` never occur
- Agent may speak in Spanish or other languages (using OpenAI defaults)

**Root Cause (as of Nov 23, 2025):**
Backend creates ephemeral tokens WITHOUT session configuration. OpenAI uses default instructions and ignores frontend session.update. See [INC-008](../../../claude-lessons3/07-api-integration-issues/LESSONS.md#inc-008-openai-session-config-ignored).

**Diagnostic:**

#### Step 1: Check What Instructions OpenAI Received
```bash
# Test backend ephemeral token creation
curl -X POST https://july25.onrender.com/api/v1/realtime/session \
  -H "x-restaurant-id: grow" \
  | jq '.instructions' | head -5

# ✅ CORRECT response (custom instructions):
"CRITICAL SYSTEM DIRECTIVE: YOU MUST SPEAK ONLY IN ENGLISH..."
"You are an English-speaking customer service agent at Grow Restaurant..."
"🎤 GREETING..." (may include deployment marker)
"🔴 CRITICAL SYSTEM KNOWLEDGE - THIS IS YOUR MENU:"

# ❌ WRONG response (OpenAI defaults):
"Your knowledge cutoff is 2023-10. You are a helpful, witty, and friendly AI..."

# If wrong → Backend not including instructions at token creation
```

#### Step 2: Check Backend Code
```bash
# Verify backend includes instructions when creating token
grep -A 20 "buildKioskInstructions" server/src/routes/realtime.routes.ts

# Should see function that builds instructions with menu context
# Should see token creation including instructions parameter
```

#### Step 3: Check Frontend Logs (May be Misleading)
```javascript
// Frontend logs may show menu context loaded and session.update sent
// This is MISLEADING - OpenAI ignores session.update!
console.log('📤 [WebRTCVoiceClient] Sending session.update:', {
  hasMenuContext: true,  // ✅ Frontend has menu
  menuContextLength: 6515  // ✅ Frontend sends it
});
// But OpenAI uses token instructions, NOT session.update

// The ONLY reliable check is: What did backend PUT IN the token?
```

**Fix (Backend - Required):**

```typescript
// File: server/src/routes/realtime.routes.ts

// 1. Add instruction builder function (after imports)
function buildKioskInstructions(menuContext: string): string {
  let instructions = `CRITICAL SYSTEM DIRECTIVE: YOU MUST SPEAK ONLY IN ENGLISH.
DO NOT use Spanish, French, or any other language unless the customer EXPLICITLY requests it.

You are an English-speaking customer service agent at Grow Restaurant in the United States.
// ... (full instructions from VoiceSessionConfig.ts)
`;

  // Add menu context
  if (menuContext) {
    instructions += `\n\n🔴 CRITICAL SYSTEM KNOWLEDGE - THIS IS YOUR MENU:\n`;
    instructions += `You work at Grow Restaurant. The menu below is YOUR menu - you KNOW these items.\n`;
    instructions += `NEVER say "I don't know the menu" or ask "what menu" - YOU ARE THE MENU EXPERT.\n`;
    instructions += menuContext;
  }

  return instructions;
}

// 2. Add tools builder function
function buildKioskTools(): any[] {
  return [
    {
      type: 'function',
      name: 'add_to_order',
      // ... (full tool definitions from VoiceSessionConfig.ts)
    },
    // confirm_order, remove_from_order
  ];
}

// 3. Update token creation (in /session endpoint)
const instructions = buildKioskInstructions(menuContext);
const tools = buildKioskTools();

const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: { /* ... */ },
  body: JSON.stringify({
    model: env.OPENAI_REALTIME_MODEL,
    // CRITICAL: Include ALL session config here
    modalities: ['text', 'audio'],
    instructions,  // Includes menu context
    voice: 'alloy',
    tools,
    tool_choice: 'auto',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16',
    input_audio_transcription: {
      model: 'gpt-4o-transcribe',
      language: 'en'
    },
    turn_detection: null,  // Manual PTT
    temperature: 0.6,
    max_response_output_tokens: 500
  }),
});
```

**Alternative Fix (If Backend Can't Be Modified):**

OpenAI's ephemeral token API requires instructions at token creation. There is NO workaround for client-side session.update being ignored. Backend modification is mandatory.

**Old Diagnostic (Pre-Nov 23 - No Longer Primary Issue):**
```tsx
// In VoiceOrderingMode.tsx or similar:

// ❌ WRONG
<VoiceControlWebRTC
  onTranscript={handleTranscript}
  onOrderDetected={handleOrder}
/>

// ✅ CORRECT
<VoiceControlWebRTC
  context="kiosk"  // <-- CRITICAL PROP
  onTranscript={handleTranscript}
  onOrderDetected={handleOrder}
/>
```

**Verification:**
```javascript
// After fix, console should show:
✅ [VoiceSessionConfig] Menu context loaded: {
  lines: 150,
  length: 4234,
  preview: "MENU ITEMS:..."
}

// And in session.update:
hasMenuInInstructions: true  // ✅
toolsCount: 3  // ✅ (add_to_order, confirm_order, remove_from_order)
```

### Connection Timeout (>15 seconds)

**Symptoms:**
- "Connecting..." message shows for >15 seconds
- Eventually shows: "Connection failed. Please try again."

**Root Causes:**

#### 1. Network Issues
**Diagnostic:**
- Check browser DevTools > Network tab
- Look for failed requests to `https://api.openai.com/v1/realtime`

**Fix:**
- Verify internet connection
- Check firewall/proxy settings
- Test on different network

#### 2. Invalid Ephemeral Token
**Diagnostic:**
```javascript
// Check token fetch response:
const response = await fetch('/api/v1/realtime/session');
const data = await response.json();
console.log('Token data:', data);

// Should have:
// - client_secret.value (string, 60+ characters)
// - expires_at (timestamp)
// - menu_context (string, 3000-5000 characters)
```

**Fix:**
- Verify backend OpenAI API key is valid
- Check backend logs for token creation errors
- Ensure restaurant ID is valid

#### 3. WebRTC Connection Issues
**Diagnostic:**
```javascript
// Check ICE connection state:
pc.oniceconnectionstatechange = () => {
  console.log('ICE state:', pc.iceConnectionState);
};

// States: new → checking → connected → completed
// Problem states: failed, disconnected
```

**Fix:**
- Check STUN/TURN server configuration
- Verify browser WebRTC support: `!!window.RTCPeerConnection`
- Test in different browser

---

## Medium Priority Issues (P2)

### Cart Not Updating After Voice Order

**Symptoms:**
- AI confirms order: "Added Greek Salad to your order"
- Cart UI doesn't update
- No items appear in cart

**Root Causes:**

#### 1. Function Call Failing
**Diagnostic:**
```javascript
// Check for function call events:
'response.function_call_arguments.delta'  // Arguments streaming in
'response.function_call_arguments.done'   // Complete function call

// Then check execution:
'🔧 [VoiceEventHandler] Tool call: add_to_order'
'  items: [{ name: "Greek Salad", quantity: 1 }]'
```

**Fix:**
- Verify `onOrderDetected` callback is bound correctly
- Check `VoiceEventHandler` function call execution logic

#### 2. Fuzzy Menu Matching Failing
**Diagnostic:**
```javascript
// Check item name normalization:
const itemNameLower = item.name.toLowerCase();
const menuNameLower = menuItem.name.toLowerCase();

// If no match found, check variations:
console.log('Looking for:', itemNameLower);
console.log('Menu items:', menuItems.map(m => m.name.toLowerCase()));
```

**Fix:**
- Add variations to fuzzy matching logic in `VoiceOrderingMode.tsx`
- Update AI instructions with correct menu item names

**Common Variations:**
```typescript
const variations: Record<string, string[]> = {
  'soul bowl': ['soul', 'bowl', 'sobo', 'solo bowl'],
  'greek salad': ['greek', 'greek salad', 'the greek'],
  'peanut noodles': ['peanut', 'noodles', 'peanut noodle'],
  'jalapeño pimento': ['jalapeno', 'pimento', 'holla pino']
};
```

#### 3. Cart State Not Refreshing
**Diagnostic:**
```javascript
// Check cart context:
const { addItem } = useCart();
console.log('Cart context available:', !!addItem);
```

**Fix:**
- Verify component wrapped in `CartProvider`
- Check React state updates triggering re-renders

---

## Low Priority Issues (P3)

### Session Expires After 60 Seconds

**Symptoms:**
- Connection works fine for ~60 seconds
- Then shows: "Session expired. Reconnecting..."
- Brief interruption, then reconnects

**Root Cause:** Ephemeral tokens have 60-second lifespan (OpenAI limitation)

**Expected Behavior:** This is NORMAL. Client automatically:
1. Detects token expiring (10 seconds before)
2. Fetches new token from backend
3. Reconnects WebRTC session
4. Restores previous state

**No Fix Needed** - This is working as designed.

### Background Noise Interfering

**Symptoms:**
- Transcription includes kitchen sounds, music
- Accuracy reduced in noisy environments

**Mitigation:**
1. Client-side noise suppression (already enabled):
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});
```

2. Instruct users to:
- Hold button closer to mouth
- Speak clearly and slightly louder
- Pause music/reduce background noise when ordering

3. Consider:
- Better microphone hardware (directional mic)
- Acoustic treatment of ordering area
- Push-to-talk enforcement (no VAD mode)

---

## Diagnostic Tools

### Browser Console Commands

```javascript
// 1. Check current transcription model
const config = window.__voiceClient__?.getSessionConfig?.();
console.log('Model:', config?.input_audio_transcription?.model);
// Should be: 'gpt-4o-transcribe'

// 2. Check connection state
const state = window.__voiceClient__?.getConnectionState?.();
console.log('Connection state:', state);
// Should be: 'connected'

// 3. Check token expiry
const expiry = window.__voiceClient__?.getTokenExpiry?.();
console.log('Token expires in (seconds):', (expiry - Date.now()) / 1000);

// 4. Check menu context
const menu = window.__voiceClient__?.getMenuContext?.();
console.log('Menu context length:', menu?.length);
console.log('Menu preview:', menu?.substring(0, 200));

// 5. Force disconnect and reconnect
window.__voiceClient__?.disconnect?.();
window.__voiceClient__?.connect?.();
```

### Backend Diagnostic Endpoints

```bash
# Check ephemeral token creation
curl -X POST http://localhost:3001/api/v1/realtime/session \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "x-restaurant-id: $RESTAURANT_ID"

# Should return:
# {
#   "client_secret": { "value": "..." },
#   "expires_at": 1234567890,
#   "menu_context": "MENU ITEMS:..."
# }
```

### State Machine Transition History (Phase 2)

**New in January 2025:** The VoiceStateMachine tracks the last 50 state transitions for debugging race conditions and unexpected behavior.

**Access Transition History:**

```javascript
// In browser console
const client = window.__voiceClient__;
const history = client?.stateMachine?.getTransitionHistory?.();

console.table(history);
// Shows:
// | from_state | event | to_state | timestamp | metadata |
// |------------|-------|----------|-----------|----------|
// | DISCONNECTED | CONNECT_REQUESTED | CONNECTING | 1234567890 | {} |
// | CONNECTING | CONNECTION_ESTABLISHED | AWAITING_SESSION_CREATED | 1234567891 | {} |
// | ... | ... | ... | ... | ... |
```

**Use Cases:**

1. **Diagnosing Stuck States:** Identify why state machine stuck in AWAITING_TRANSCRIPT
2. **Identifying Errors:** Find which event caused ERROR state
3. **Verifying Session Ready:** Check session ready confirmation method (event vs timeout)
4. **Debugging Invalid Transitions:** Track invalid state transition attempts

**Example: Debugging Session Ready Issue**

```javascript
const history = client.stateMachine.getTransitionHistory();
const sessionReadyTransition = history.find(t => t.event === 'SESSION_READY');

console.log('Session ready confirmed via:', sessionReadyTransition?.metadata?.confirmed_via);
// Output: "timeout" or "event"

// If always "timeout", OpenAI session.updated event not firing
```

**Related:** VoiceStateMachine.ts:1-535, ADR-012

---

### Network Diagnostics

```bash
# 1. Check OpenAI API accessibility
curl -I https://api.openai.com/v1/realtime

# 2. Test WebRTC STUN server
# In browser console:
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});
pc.createDataChannel('test');
pc.createOffer().then(offer => pc.setLocalDescription(offer));
pc.onicecandidate = e => console.log('ICE candidate:', e.candidate);
```

---

## Monitoring Recommendations

### Key Metrics to Track

1. **Transcription Event Rate**
   - `conversation.item.input_audio_transcription.completed` events per minute
   - Alert if drops below threshold

2. **Connection Success Rate**
   - WebRTC connections established / attempted
   - Target: >99%

3. **Order Completion Rate**
   - Orders submitted / voice sessions started
   - Target: >75%

4. **State Machine Timeouts**
   - Count of `waiting_user_final` timeouts
   - Should be <1% of sessions

### Alerting Rules

```yaml
# Example alerting configuration

- alert: VoiceTranscriptionFailure
  expr: rate(voice_transcription_events[5m]) < 0.1
  for: 5m
  severity: P0
  message: "Voice transcription events dropped significantly"

- alert: VoiceConnectionFailures
  expr: rate(voice_connection_failures[5m]) > 0.05
  for: 5m
  severity: P1
  message: "Voice connection failure rate >5%"

- alert: VoiceOrderCompletionLow
  expr: voice_order_completion_rate < 0.65
  for: 15m
  severity: P2
  message: "Voice order completion rate <65%"
```

---

## Escalation Path

### Level 1: Support Team
- Check this troubleshooting guide
- Verify basic configuration (model, context prop)
- Restart browser/device
- Test on different network

### Level 2: Engineering Team
- Review browser console logs
- Check backend logs for token creation
- Verify OpenAI API key validity
- Test in development environment

### Level 3: Voice System Maintainer (@mikeyoung)
- Deep dive into WebRTC connection state
- Analyze OpenAI Realtime API responses
- Review recent OpenAI API changes
- Check for silent deprecations

---

## Recent Changes & Known Issues

### January 2025: whisper-1 Deprecation
- **Date:** ~2025-01-15
- **Impact:** Complete transcription failure
- **Fix:** Update to `gpt-4o-transcribe` model
- **Status:** Fixed (commit `3a5d126f`)

### Known Issues
1. None currently

---

## References

- **Main Architecture Doc:** `docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md`
- **ADR-005:** `docs/explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md`
- **RCA Archive:** `docs/archive/2025-01/VOICE_FIX_TRANSCRIPTION_MODEL_2025-01-18.md`
- **OpenAI Realtime API Docs:** https://platform.openai.com/docs/guides/realtime
- **OpenAI Community:** https://community.openai.com/c/api/realtime-api/

---

**Maintainer:** @mikeyoung
**Last Updated:** 2025-01-23
**Version:** 1.1
