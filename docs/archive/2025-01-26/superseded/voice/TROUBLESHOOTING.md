# WebRTC Voice System Troubleshooting Guide

**Last Updated:** August 17, 2025  
**Status:** Active Development

## Critical Issue: Duplicate Recording/Response

### Problem Description
When a user speaks once, the system:
1. Records the audio twice
2. Transcribes the same speech twice
3. AI responds with duplicated text (e.g., "You You" instead of "You")

### Symptoms in Console
```
[WebRTCVoice] User said: Hello, can you tell me about the menu?
[WebRTCVoice] User said: Hello, can you tell me about the menu?
[WebRTCVoice] AI said: You You
```

### Investigation Timeline

#### Attempt 1: Disable VAD (Voice Activity Detection)
**Theory:** Server VAD was auto-triggering responses
**Fix Applied:**
```javascript
turn_detection: null  // Changed from server_vad
```
**Result:** ❌ Issue persists

#### Attempt 2: Add Explicit Response Creation
**Theory:** Without VAD, manual response trigger needed
**Fix Applied:**
```javascript
stopRecording(): void {
  this.sendEvent({ type: 'input_audio_buffer.commit' });
  setTimeout(() => {
    this.sendEvent({ type: 'response.create' });
  }, 100);
}
```
**Result:** ❌ Issue persists

#### Attempt 3: Fix Double Event Handlers
**Theory:** Button had both mouse and touch handlers
**Fix Applied:**
```javascript
// Removed touch handlers
<HoldToRecordButton
  onMouseDown={handleRecordStart}
  onMouseUp={handleRecordStop}
  // Removed: onTouchStart, onTouchEnd
/>
```
**Result:** ❌ Issue persists

#### Attempt 4: Add Debounce Protection
**Theory:** Rapid commits causing duplication
**Fix Applied:**
```javascript
if (now - this.lastCommitTime < 500) {
  console.warn('[WebRTCVoice] Ignoring rapid stop recording');
  return;
}
```
**Result:** ❌ Issue persists

#### Attempt 5: Implement Message Queue
**Theory:** Race conditions with data channel
**Fix Applied:**
```javascript
private messageQueue: any[] = [];
private dcReady = false;
// Queue messages when channel not ready
```
**Result:** ✅ Fixed race conditions, ❌ Duplicate issue persists

#### Attempt 6: Track Active Responses
**Theory:** Canceling non-existent responses causes errors
**Fix Applied:**
```javascript
private activeResponseId: string | null = null;
// Only cancel if response exists
```
**Result:** ✅ Fixed cancellation errors, ❌ Duplicate issue persists

### Current Status
The duplicate recording issue remains unresolved. The system is functional but produces duplicate transcriptions and responses.

## Common Error Messages

### 1. "Cannot read properties of undefined (reading 'preventDefault')"
**Cause:** Event handler mismatch with HoldToRecordButton component
**Solution:** Remove event parameters from handlers
```javascript
// Wrong
const handleRecordStart = (e: MouseEvent) => { e.preventDefault(); }

// Correct
const handleRecordStart = () => { /* no event param */ }
```

### 2. "Cannot send event, data channel not open"
**Cause:** Trying to send events before WebRTC data channel is ready
**Solution:** Message queue implementation (already applied)

### 3. "Cancellation failed: no active response found"
**Cause:** Attempting to cancel a response that doesn't exist
**Solution:** Track activeResponseId (already applied)

### 4. "Failed to set remote answer sdp: The order of m-lines"
**Cause:** Adding audio tracks multiple times
**Solution:** Remove duplicate addTransceiver call (already applied)

### 5. "Called in wrong state: stable"
**Cause:** Multiple simultaneous connection attempts
**Solution:** Add isConnecting flag (already applied)

## Console Log Analysis

### Healthy Connection Log
```
[WebRTCVoice] Starting connection...
[WebRTCVoice] Fetching ephemeral token...
[WebRTCVoice] Got ephemeral token, expires at: [timestamp]
[WebRTCVoice] Audio track initial state - enabled: false
[WebRTCVoice] Audio track added to peer connection in MUTED state
[WebRTCVoice] ICE connection state: connected
[WebRTCVoice] Data channel opened
[WebRTCVoice] Session created successfully
[WebRTCVoice] Configuring session with manual control...
[WebRTCVoice] Session configured for manual control - buffer cleared
```

### Recording Flow Log
```
[WebRTCVoice] Microphone ENABLED - now transmitting audio
[WebRTCVoice] Recording started - hold button to continue recording
[WebRTCVoice] Microphone DISABLED - stopped transmitting audio
[WebRTCVoice] Audio committed - VAD will trigger response if speech detected
[WebRTCVoice] Manual response requested after commit
[WebRTCVoice] User said: [transcription]
[WebRTCVoice] AI said: [response]
```

## Debug Commands

### Check WebRTC Connection
```javascript
// In browser console
const client = document.querySelector('[data-webrtc-client]')?.__client;
console.log('Connection state:', client?.getConnectionState());
console.log('Recording:', client?.isCurrentlyRecording());
```

### Monitor Network Traffic
```javascript
// Enable verbose logging
localStorage.setItem('WEBRTC_DEBUG', 'true');
location.reload();
```

### Force Reconnection
```javascript
// In browser console
const client = document.querySelector('[data-webrtc-client]')?.__client;
client?.disconnect();
setTimeout(() => client?.connect(), 1000);
```

## Performance Metrics

### Expected Latencies
- Token generation: ~100-200ms
- WebRTC connection: ~500-1000ms
- Speech-to-text: ~200-500ms
- AI response generation: ~500-1000ms
- Total end-to-end: ~1500-2500ms

### Monitoring
```javascript
// Add performance marks
performance.mark('recording-start');
// ... recording ...
performance.mark('recording-end');
performance.measure('recording-duration', 'recording-start', 'recording-end');
console.log('Recording took:', performance.getEntriesByName('recording-duration')[0].duration);
```

## Browser Compatibility

### Supported Browsers
- Chrome 90+ ✅
- Edge 90+ ✅
- Safari 15+ ⚠️ (may need permissions)
- Firefox 95+ ⚠️ (WebRTC implementation differences)

### Required Permissions
- Microphone access (mandatory)
- Autoplay permission (for audio responses)

## Future Investigation Areas

1. **Audio Buffer Management**
   - Investigate if audio chunks are being duplicated in buffer
   - Check if commit is being processed twice
   - Review WebRTC track state management

2. **Event Flow Analysis**
   - Add unique IDs to each recording session
   - Trace events from start to finish
   - Identify where duplication occurs

3. **OpenAI API Behavior**
   - Test with different turn_detection settings
   - Analyze raw WebRTC data channel messages
   - Compare with OpenAI's reference implementation

4. **Alternative Approaches**
   - Consider WebSocket fallback for audio streaming
   - Implement client-side deduplication
   - Add server-side request tracking

## Support Resources

- [OpenAI Realtime API Support](https://platform.openai.com/docs/api-reference/realtime)
- [WebRTC Troubleshooting Guide](https://webrtc.org/getting-started/troubleshooting)
- Internal Slack: #voice-system-dev
- GitHub Issues: [Project Issues](https://github.com/organization/rebuild-6.0/issues)