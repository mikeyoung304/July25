# Voice Ordering Debugging Runbook

**Last Updated:** 2025-01-18
**Applies To:** OpenAI Realtime API + WebRTC Voice Ordering
**Related Incidents:** [CL-VOICE-001](../knowledge/incidents/CL-VOICE-001-context-prop-missing.md), [CL-VOICE-002](../knowledge/incidents/CL-VOICE-002-transcription-missing.md)

---

## Quick Diagnosis Flowchart

```
Voice ordering not working?
    ↓
[1] Can user click/hold button?
    ├─ NO → UI/Permission issue (see §1)
    └─ YES
        ↓
[2] Does microphone indicator appear?
    ├─ NO → Audio input issue (see §2)
    └─ YES
        ↓
[3] Does agent respond at all?
    ├─ NO → Connection issue (see §3)
    └─ YES
        ↓
[4] Does agent have menu knowledge?
    ├─ NO → Context configuration issue (see §4)
    └─ YES
        ↓
[5] Does cart update when ordering?
    ├─ NO → Transcription or function calling issue (see §5)
    └─ YES → ✅ Working!
```

---

## §1: UI/Permission Issues

### Symptoms
- Button doesn't respond to click
- No visual feedback when pressed
- Console errors about permissions

### Diagnostic Commands
```bash
# Check if VoiceOrderingMode is rendered
grep -r "VoiceOrderingMode" client/src/pages/
grep -r "VoiceOrderingMode" client/src/components/

# Check if component is lazy-loaded correctly
grep -r "React.lazy.*VoiceOrderingMode" client/src/
```

### Console Checks
```javascript
// Look for permission errors
navigator.permissions.query({name: 'microphone'}).then(result => {
  console.log('Microphone permission:', result.state);
});

// Check if component mounted
document.querySelector('[data-voice-ordering]') !== null
```

### Common Causes
1. **Browser microphone permission denied**
   - Fix: Click lock icon in address bar → Allow microphone
2. **Component not mounted**
   - Fix: Check routing, ensure /kiosk/order loads VoiceOrderingMode
3. **Button event handler not attached**
   - Fix: Check onMouseDown/onTouchStart bindings

### Resolution Steps
1. Hard refresh (Cmd+Shift+R)
2. Clear browser permissions and re-grant
3. Check console for React errors
4. Verify component is in DOM: `document.querySelector('[class*="Voice"]')`

---

## §2: Audio Input Issues

### Symptoms
- Button responds but no "Listening..." indicator
- No audio transmission stats in console
- Microphone permission granted but no audio

### Diagnostic Console Logs
Look for:
```
✅ [WebRTCConnection] Microphone ENABLED
✅ [WebRTCConnection] Audio track state: { enabled: true, readyState: 'live' }
✅ [WebRTCConnection] Audio transmission stats: { bytesSent: 68785, packetsSent: 1668 }
```

If missing:
```
❌ [WebRTCConnection] No media stream available
❌ [WebRTCConnection] No audio track found
```

### Common Causes
1. **getUserMedia failed**
   ```javascript
   // Check in console:
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => console.log('✅ Audio OK:', stream))
     .catch(err => console.error('❌ Audio failed:', err));
   ```

2. **Audio track disabled**
   ```javascript
   // Check track state
   const stream = document.querySelector('audio')?.srcObject;
   stream?.getAudioTracks().forEach(track => {
     console.log('Track:', track.id, 'enabled:', track.enabled, 'state:', track.readyState);
   });
   ```

3. **Wrong audio input selected**
   - Fix: Check browser settings → Audio input device

### Resolution Steps
1. Verify microphone works in other apps
2. Check browser console for getUserMedia errors
3. Try different browser (Chrome/Safari)
4. Check OS microphone permissions (System Preferences → Privacy)
5. Look for audio transmission stats 2s after pressing button

---

## §3: Connection Issues

### Symptoms
- No agent response at all
- Connection state shows "disconnected" or "error"
- No session.created event

### Diagnostic Console Logs
Look for connection sequence:
```
✅ [WebRTCVoiceClient] Starting connection sequence...
✅ [VoiceSessionConfig] Fetching ephemeral token...
✅ [WebRTCConnection] WebRTC connection established
✅ [WebRTCConnection] Data channel opened
✅ [VoiceEventHandler] session.created received
✅ [WebRTCVoiceClient] session.update sent
```

If connection fails:
```
❌ [WebRTCConnection] Connection failed: <error>
❌ Failed to get ephemeral token
❌ OpenAI SDP exchange failed: 401/403/500
```

### Common Causes
1. **Authentication failure**
   ```bash
   # Check if ephemeral token endpoint works:
   curl -X POST http://localhost:3001/api/v1/realtime/ephemeral \
     -H "Authorization: Bearer $(cat .env | grep VITE_SUPABASE_ANON_KEY | cut -d= -f2)"
   ```

2. **OpenAI API key invalid**
   ```bash
   # Check server env:
   grep OPENAI_API_KEY server/.env
   ```

3. **CORS/network issues**
   - Check browser Network tab for failed requests

4. **Server not running**
   ```bash
   # Verify server is up:
   curl http://localhost:3001/health
   ```

### Resolution Steps
1. Check server logs: `npm run dev` (server terminal)
2. Verify OpenAI API key is valid
3. Check ephemeral token endpoint returns 200
4. Look for CORS errors in browser console
5. Verify WebSocket/WebRTC connections not blocked by firewall

---

## §4: Context Configuration Issues

### Symptoms
- Agent responds but says "I don't have access to the menu"
- Agent can't call functions (no add_to_order events)
- Cart doesn't update

### Diagnostic Console Logs
Look for:
```
✅ [VoiceSessionConfig] Building session config...
   context: "kiosk"  ← MUST BE "kiosk"!
   hasMenuContext: true
   menuContextLength: 2934

✅ [VoiceSessionConfig] Config built:
   instructionsLength: 5490  ← Should be >3000
   toolsCount: 3  ← MUST be 3!
   toolNames: ["add_to_order", "confirm_order", "remove_from_order"]
   hasMenuInInstructions: true  ← MUST be true!
```

If wrong context:
```
❌ context: undefined or "server"
❌ toolsCount: 0
❌ hasMenuInInstructions: false
```

### Common Causes
1. **Missing context prop (CL-VOICE-001)**
   ```tsx
   // WRONG:
   <VoiceControlWebRTC onTranscript={...} />

   // CORRECT:
   <VoiceControlWebRTC context="kiosk" onTranscript={...} />
   ```

2. **Menu context not loaded**
   ```bash
   # Check if backend sends menu_context:
   grep -A 10 "menu_context" server/src/routes/realtime.routes.ts
   ```

3. **Tools not registered**
   ```bash
   # Check tool definitions:
   grep -r "add_to_order\|confirm_order" client/src/modules/voice/
   ```

### Resolution Steps
1. **Verify context prop:**
   ```bash
   grep -n "context=" client/src/components/kiosk/VoiceOrderingMode.tsx
   ```
   Should show: `context="kiosk"`

2. **Check session config logs:**
   - Look for `hasMenuInInstructions: true`
   - Verify `toolsCount: 3`

3. **Test menu loading:**
   ```bash
   # Check API response:
   curl http://localhost:3001/api/v1/realtime/ephemeral | jq '.menu_context'
   ```

4. **Verify tools are sent to OpenAI:**
   Look for in console:
   ```
   📤 [WebRTCVoiceClient] ACTUAL session.update payload:
      toolNames: ["add_to_order", "confirm_order", "remove_from_order"]
   ```

---

## §5: Transcription/Function Calling Issues

### Symptoms
- Agent responds with text
- No items added to cart
- Console shows "Timeout waiting for transcript"
- Agent knows menu but doesn't execute orders

### Diagnostic Console Logs

**CRITICAL:** Look for transcription events:
```
✅ 🔔 conversation.item.input_audio_transcription.delta: "I'd like"
✅ 🔔 conversation.item.input_audio_transcription.delta: " a greek"
✅ 🔔 conversation.item.input_audio_transcription.completed: "I'd like a greek salad"
✅ 🔔 response.function_call_arguments.done: { name: "add_to_order", ... }
```

If transcription broken (CL-VOICE-002):
```
❌ NO 🔔 conversation.item.input_audio_transcription events
❌ Timeout waiting for transcript, resetting to idle
❌ 🔔 response.text.done: "{"item":"Greek salad","modifications":"no modifications"}"
   ↑ Text response WITHOUT function call = BROKEN
```

### Common Causes

1. **Transcription model deprecated (CL-VOICE-002)**
   ```typescript
   // Check model in VoiceSessionConfig.ts:
   input_audio_transcription: {
     model: 'whisper-1'  // ← May be deprecated!
   }

   // Try instead:
   input_audio_transcription: {
     model: 'gpt-4o-transcribe'  // ← New model (2025)
   }
   ```

2. **OpenAI model access not enabled**
   - Go to OpenAI Dashboard → Project Settings → Models
   - Enable `gpt-4o-transcribe` for Realtime API

3. **Billing/credits issue**
   - Check OpenAI account balance
   - Verify Realtime API usage not exceeded

4. **Turn detection misconfigured**
   ```typescript
   // We use manual PTT mode:
   turn_detection: null

   // If this breaks, try:
   turn_detection: {
     type: 'server_vad',
     create_response: false  // Manual triggering
   }
   ```

### Resolution Steps

#### Step 1: Verify Transcription Events
1. Deploy version with event logging (commit 09f8b343)
2. Test voice ordering
3. Check console for `🔔 conversation.item.input_audio_transcription.*` events

#### Step 2: Try Alternative Model
```typescript
// Edit: client/src/modules/voice/services/VoiceSessionConfig.ts
input_audio_transcription: {
  model: 'gpt-4o-transcribe'  // Instead of whisper-1
}
```

#### Step 3: Check OpenAI Account
- [ ] Account has positive balance
- [ ] Realtime API enabled
- [ ] `gpt-4o-transcribe` model enabled in project settings
- [ ] No rate limiting active

#### Step 4: Verify Function Call Path
```bash
# Check if function handlers exist:
grep -n "handleFunctionCall\|add_to_order" \
  client/src/modules/voice/services/VoiceEventHandler.ts

# Should find handlers around line 627
```

#### Step 5: Test with Diagnostic Logging
Add to `VoiceEventHandler.ts`:
```typescript
case 'response.function_call_arguments.done':
  console.log('🎯 FUNCTION CALL RECEIVED:', event.name, event.arguments);
  // ... existing handler
  break;
```

---

## Complete Diagnostic Checklist

Run through this checklist in order:

### Level 1: Basic Connectivity
- [ ] Page loads without errors
- [ ] Button is clickable
- [ ] Microphone permission granted
- [ ] "Listening..." indicator appears when holding button
- [ ] Connection state shows "connected"

### Level 2: Audio Transmission
- [ ] Console shows: `[WebRTCConnection] Microphone ENABLED`
- [ ] Console shows: `Audio transmission stats: { bytesSent: >0 }`
- [ ] No audio errors in console
- [ ] Audio track `readyState: 'live'`

### Level 3: OpenAI Session
- [ ] Console shows: `session.created received`
- [ ] Console shows: `session.update sent`
- [ ] Console shows: `context: "kiosk"`
- [ ] Console shows: `toolsCount: 3`
- [ ] Console shows: `hasMenuInInstructions: true`

### Level 4: Transcription
- [ ] Console shows: `🔔 conversation.item.input_audio_transcription.delta`
- [ ] Console shows: `🔔 conversation.item.input_audio_transcription.completed`
- [ ] NO "Timeout waiting for transcript" warnings
- [ ] Transcript text appears in UI

### Level 5: Function Calling
- [ ] Console shows: `🔔 response.function_call_arguments.done`
- [ ] Function name is `add_to_order` or `confirm_order`
- [ ] Console shows: `order.items.added` event
- [ ] Cart updates with item
- [ ] Item appears in cart UI

---

## Emergency Recovery Procedures

### If Nothing Works
1. **Hard refresh** (Cmd+Shift+R)
2. **Clear all site data** (Chrome: Settings → Privacy → Clear browsing data)
3. **Try incognito/private mode**
4. **Try different browser**
5. **Restart development servers**
   ```bash
   # Kill all node processes
   pkill -f node

   # Restart
   npm run dev
   ```

### If Transcription Broken (Most Common - CL-VOICE-002)
1. Check OpenAI Dashboard → Billing
2. Check OpenAI Dashboard → Project Settings → Models
3. Enable `gpt-4o-transcribe` if available
4. Try model change:
   ```bash
   # Edit VoiceSessionConfig.ts
   model: 'whisper-1'  →  model: 'gpt-4o-transcribe'
   ```
5. Contact OpenAI support if model not available

### If Context Wrong (CL-VOICE-001)
1. Verify prop exists:
   ```bash
   grep 'context="kiosk"' client/src/components/kiosk/VoiceOrderingMode.tsx
   ```
2. If missing, add it:
   ```tsx
   <VoiceControlWebRTC
     context="kiosk"  // <-- Add this line
     onTranscript={...}
   />
   ```

### If Cart Not Updating
1. Check authentication:
   ```javascript
   // In browser console:
   localStorage.getItem('auth_session')
   ```
2. Check if demo mode active:
   ```javascript
   window.location.href.includes('/kiosk-demo')
   ```
3. Check cart context:
   ```javascript
   // Should show items in React DevTools:
   <UnifiedCartProvider>
   ```

---

## Reference: Event Flow

### Normal Flow (Working)
```
User presses button
  ↓
[UI] onMouseDown → startRecording()
  ↓
[WebRTCConnection] enableMicrophone()
  ↓
[Audio] Browser captures sound → PCM16 encoding
  ↓
[WebRTC] Audio packets sent to OpenAI (check stats after 2s)
  ↓
[OpenAI] Receives audio, processes
  ↓
[OpenAI] Sends conversation.item.input_audio_transcription.delta events
  ↓
[VoiceEventHandler] Accumulates deltas → builds transcript
  ↓
User releases button
  ↓
[UI] onMouseUp → stopRecording()
  ↓
[WebRTCConnection] disableMicrophone()
  ↓
[WebRTCVoiceClient] Commits audio buffer
  ↓
[OpenAI] Sends conversation.item.input_audio_transcription.completed
  ↓
[VoiceEventHandler] Emits transcript event
  ↓
[OpenAI] Processes transcript → Calls add_to_order function
  ↓
[OpenAI] Sends response.function_call_arguments.done
  ↓
[VoiceEventHandler] Emits order.items.added
  ↓
[VoiceOrderingMode] Receives event → Calls addItem()
  ↓
[UnifiedCartContext] Updates cart
  ↓
[UI] Cart displays new item ✅
```

### Broken Flow (CL-VOICE-002)
```
User presses button
  ↓
... (same until) ...
  ↓
[OpenAI] Receives audio, processes
  ↓
❌ NO transcription events sent (model deprecated/disabled)
  ↓
[VoiceEventHandler] Waits for transcript...
  ↓
⏰ 10 second timeout
  ↓
[WebRTCVoiceClient] "Timeout waiting for transcript, resetting to idle"
  ↓
[OpenAI] May send response.text.done (text response, no function call)
  ↓
❌ NO function call → NO order.items.added → NO cart update
```

---

## Quick Reference Commands

```bash
# Find context prop
grep -n 'context=' client/src/components/kiosk/VoiceOrderingMode.tsx

# Check session config
grep -A 15 'buildSessionConfig' client/src/modules/voice/services/VoiceSessionConfig.ts

# Check transcription model
grep -A 3 'input_audio_transcription' client/src/modules/voice/services/VoiceSessionConfig.ts

# Check function handlers
grep -n 'add_to_order\|confirm_order' client/src/modules/voice/services/VoiceEventHandler.ts

# Test ephemeral token
curl -X POST http://localhost:3001/api/v1/realtime/ephemeral

# Check for voice-related errors in last hour
git log --since="1 hour ago" --grep="voice\|realtime" --oneline

# Find all voice event listeners
grep -r "\.on\(" client/src/modules/voice/
```

---

## Related Documentation

- [CL-VOICE-001: Context Prop Missing](../knowledge/incidents/CL-VOICE-001-context-prop-missing.md)
- [CL-VOICE-002: Transcription Missing](../knowledge/incidents/CL-VOICE-002-transcription-missing.md)
- [Voice Ordering Architecture](../../docs/explanation/architecture/VOICE_ORDERING_WEBRTC.md)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)

---

## Maintenance

**Update this runbook when:**
- New voice bugs discovered
- OpenAI API changes
- Architecture changes
- New diagnostic tools added

**Version History:**
- 2025-01-18: Initial version covering CL-VOICE-001 and CL-VOICE-002
