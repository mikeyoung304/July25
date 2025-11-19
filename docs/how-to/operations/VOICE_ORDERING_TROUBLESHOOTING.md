# Voice Ordering Troubleshooting Guide

**Last Updated:** 2025-01-18
**Status:** Active
**Audience:** Developers, Operations Team, Support Engineers

## Quick Reference

| Issue | Severity | First Action |
|-------|----------|--------------|
| No transcription events | P0 | Check model is `gpt-4o-transcribe` |
| Agent doesn't know menu | P1 | Verify `context="kiosk"` prop |
| Connection timeout | P1 | Check network, verify token valid |
| Cart not updating | P2 | Check function call logs |
| Session expires | P3 | Normal - auto-reconnects |

---

## Critical Issues (P0)

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

### Agent Doesn't Know Menu

**Symptoms:**
- AI responds: "I don't have access to the menu"
- AI can't add items to cart
- Function calls for `add_to_order` never occur

**Root Cause:** Missing `context="kiosk"` prop on `VoiceControlWebRTC` component

**Diagnostic:**
```javascript
// Check browser console logs:
console.log('🔨 [VoiceSessionConfig] Building session config...', {
  context: this.context,  // Should be 'kiosk', not undefined
  hasMenuContext: this.menuContext.length > 0,  // Should be true
  menuContextLength: this.menuContext.length  // Should be ~3000-5000
});
```

**Fix:**
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
**Last Updated:** 2025-01-18
**Version:** 1.0
