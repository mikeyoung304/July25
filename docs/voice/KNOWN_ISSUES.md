# WebRTC Voice System - Known Issues

**Last Updated:** August 17, 2025  
**Priority:** HIGH - Production Blocker

## Issue #1: Duplicate Recording and Response

### Severity: HIGH
### Status: UNRESOLVED
### First Reported: August 17, 2025

### Description
The WebRTC voice system records and processes user speech twice, resulting in duplicate transcriptions and malformed AI responses.

### Reproduction Steps
1. Navigate to `/test-webrtc`
2. Click "Connect Voice" button
3. Hold the "HOLD ME" button
4. Say: "Hello, can you tell me about the menu?"
5. Release the button

### Expected Behavior
- Single transcription: "Hello, can you tell me about the menu?"
- Single AI response: "I can help you with our menu offerings..."

### Actual Behavior
- Duplicate transcription appears twice in history
- AI responds with duplicated text: "You You" or similar repetition

### Evidence
```javascript
// Console output showing duplication
[12:06:30 PM] Hello, can you tell me about the menu?
[12:06:30 PM] Hello, can you tell me about the menu?
// AI response
"You You"
```

### Root Cause Analysis

#### Hypothesis 1: Audio Buffer Double Processing
The audio buffer might be processed twice due to:
- Multiple commit events being sent
- Server-side processing triggering twice
- Client-side buffer not clearing properly

#### Hypothesis 2: Event Handler Duplication
Despite fixes, event handlers might still be duplicated:
- React re-renders causing multiple handler attachments
- WebRTC event listeners not being cleaned up
- Browser-specific event propagation issues

#### Hypothesis 3: OpenAI API Behavior
The Realtime API might be:
- Processing the same audio twice internally
- Responding to both VAD and manual triggers
- Caching and replaying audio segments

### Attempted Solutions

| Date | Solution | Code Changes | Result |
|------|----------|--------------|--------|
| 2025-08-17 | Disable VAD | `turn_detection: null` | ❌ Failed |
| 2025-08-17 | Add explicit response.create | Added manual trigger after commit | ❌ Failed |
| 2025-08-17 | Remove touch handlers | Eliminated onTouchStart/End | ❌ Failed |
| 2025-08-17 | Add debounce | 500ms commit throttle | ❌ Failed |
| 2025-08-17 | Message queue | Queue events before DC ready | ✅ Fixed races, ❌ Duplication persists |
| 2025-08-17 | Response tracking | Track activeResponseId | ✅ Fixed cancellation, ❌ Duplication persists |

### Code Snippets

#### Current Recording Stop Implementation
```javascript
stopRecording(): void {
  if (!this.isRecording) return;
  
  // Prevent double commits within 500ms
  const now = Date.now();
  if (now - this.lastCommitTime < 500) {
    console.warn('[WebRTCVoice] Ignoring rapid stop recording');
    return;
  }
  
  if (this.mediaStream) {
    // Disable microphone
    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
    }
    
    this.lastCommitTime = now;
    
    // Commit audio buffer
    this.sendEvent({
      type: 'input_audio_buffer.commit'
    });
    
    // Request response after delay
    setTimeout(() => {
      this.sendEvent({
        type: 'response.create'
      });
    }, 100);
    
    this.isRecording = false;
    this.emit('recording.stopped');
  }
}
```

#### Session Configuration
```javascript
{
  turn_detection: null,  // Completely disabled
  max_response_output_tokens: 20,
  temperature: 0.6,
  instructions: 'Give ONE SHORT answer only. Maximum 10 words.'
}
```

### Workaround
Currently, no reliable workaround exists. Users experience duplicate responses consistently.

### Next Investigation Steps

1. **Add Unique Session IDs**
```javascript
// Track each recording with unique ID
const sessionId = crypto.randomUUID();
console.log(`[Recording ${sessionId}] Started`);
```

2. **Implement Event Deduplication**
```javascript
// Client-side deduplication based on content + timestamp
const seen = new Set();
const key = `${event.text}-${event.timestamp}`;
if (!seen.has(key)) {
  seen.add(key);
  processEvent(event);
}
```

3. **Server-Side Logging**
- Add detailed logging to ephemeral token endpoint
- Track all WebRTC events server-side
- Correlate client and server logs

4. **OpenAI API Testing**
- Test with OpenAI's official example code
- Compare network traffic captures
- Try different model versions

### Impact
- **User Experience**: Confusing duplicate responses
- **API Costs**: Double the expected API usage
- **Production Readiness**: Blocker for production deployment

### Related Issues
- None currently identified

### References
- [OpenAI Realtime Known Issues](https://platform.openai.com/docs/api-reference/realtime#known-issues)
- [WebRTC Common Problems](https://webrtc.org/getting-started/common-problems)
- Internal investigation thread: #voice-duplication-bug

---

## Issue #2: TypeError on Button Interaction

### Severity: MEDIUM
### Status: RESOLVED
### First Reported: August 17, 2025
### Resolved: August 17, 2025

### Description
Button event handlers were receiving undefined events, causing TypeErrors.

### Resolution
Updated event handlers to not expect event parameters, matching HoldToRecordButton component interface.

```javascript
// Before
const handleRecordStart = (e: MouseEvent) => {
  e.preventDefault();  // Error: e is undefined
}

// After
const handleRecordStart = () => {
  // No event parameter needed
}
```

---

## Issue #3: WebRTC Connection Race Conditions

### Severity: MEDIUM
### Status: RESOLVED
### First Reported: August 17, 2025
### Resolved: August 17, 2025

### Description
Messages sent before data channel opened were lost.

### Resolution
Implemented message queue that buffers events until data channel is ready.

```javascript
private messageQueue: any[] = [];
private dcReady = false;

sendEvent(event: any): void {
  if (this.dcReady && this.dc?.readyState === 'open') {
    this.dc.send(JSON.stringify(event));
  } else {
    this.messageQueue.push(event);
  }
}
```

---

## Monitoring and Alerts

To monitor these issues in production:

1. **Set up error tracking**
```javascript
window.addEventListener('error', (e) => {
  if (e.message.includes('WebRTC')) {
    // Send to monitoring service
  }
});
```

2. **Track duplicate rate**
```javascript
// Monitor duplicate transcriptions
const transcriptionCounts = new Map();
// Track and alert if count > 1 for same content
```

3. **Performance metrics**
```javascript
// Track recording duration vs transcription count
if (transcriptionCount > 1 && recordingDuration < 10000) {
  console.error('Duplicate detection:', { count, duration });
}
```