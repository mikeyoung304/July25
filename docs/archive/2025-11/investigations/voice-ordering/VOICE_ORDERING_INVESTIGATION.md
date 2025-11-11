# Voice Ordering Investigation Summary

## Original Issue
Voice ordering not transcribing when clicking the record button. User screenshot showed:
- Message: "Waiting for user transcript to finalize..."
- Voice Debug Panel showing "WebSocket: disconnected" status
- Session refreshing after ~20 seconds with "Refreshing ephemeral token..."

## Root Cause Identified from User Screenshots
**The WebSocket connection is disconnecting immediately or failing to stay connected.**

This is why:
1. Session creates successfully on the server (confirmed in Render logs)
2. WebSocket briefly connects
3. Then DISCONNECTS before user can record
4. When user presses button, `isConnected = false`, so recording cannot start

## Fixes Applied (May Be Addressing Symptoms, Not Root Cause)

### Fix 1: State Machine Timeout
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCVoiceClient.ts:313-318`

Added 10-second timeout to prevent state machine from getting stuck in `waiting_user_final`:

```typescript
this.turnStateTimeout = setTimeout(() => {
  if (this.turnState === 'waiting_user_final') {
    console.warn('[WebRTCVoiceClient] Timeout waiting for transcript, resetting to idle');
    this.resetTurnState();
  }
}, 10000);
```

**Commit**: "fix: resolve voice ordering state machine deadlock in waiting_user_final"

### Fix 2: Diagnostic Logging
**File**: `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts:304-379`

Added comprehensive logging to verify:
- Media stream state
- Audio track state (enabled, readyState, muted)
- WebRTC stats (bytesSent, packetsSent)

**Result from User Testing**: Logs confirmed microphone IS being enabled correctly:
- hasMediaStream: true
- audioTrack enabled: true
- readyState: "live"
- muted: false

## The ACTUAL Problem (Still Unresolved)

**The WebSocket/RTCDataChannel is disconnecting**, as shown in Voice Debug Panel.

### Potential Root Causes to Investigate

1. **Token Expiration/Invalid Configuration**
   - Server logs show: `{"status": "healthy", "api_key": true, "api_key_valid": true}`
   - But session may be expiring too quickly
   - Check `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/VoiceSessionConfig.ts`

2. **WebRTC Connection Lifecycle Issues**
   - DataChannel may be closing immediately after opening
   - Check `/Users/mikeyoung/CODING/rebuild-6.0/client/src/modules/voice/services/WebRTCConnection.ts`
   - Examine `dataChannel.onclose`, `dataChannel.onerror` handlers

3. **Ephemeral Token Fetching**
   - Token refresh may be triggering too aggressively
   - Check token validity period
   - Check `/api/voice/ephemeral-token` endpoint

## Investigation Attempts

### Automated Testing with Playwright
Created `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/voice-ordering-debug.spec.ts`

**Progress**:
- ✅ Successfully navigate to production URL (`https://july25-client.vercel.app/`)
- ✅ Wait for splash screen
- ✅ Click Server button
- ✅ Authenticate with demo credentials
- ✅ Load ServerView floor plan
- ❌ **BLOCKED**: Cannot automate clicking canvas-based floor plan tables to open seat selection modal

**Challenge**: Floor plan uses HTML Canvas (not SVG), making automated clicking difficult without exact coordinate mapping.

## Files Modified

1. `client/src/modules/voice/services/WebRTCVoiceClient.ts` - State machine timeout
2. `client/src/modules/voice/services/WebRTCConnection.ts` - Diagnostic logging & WebRTC stats
3. `client/src/modules/voice/components/VoiceControlWebRTC.tsx` - Debug logging
4. `client/src/modules/voice/hooks/useWebRTCVoice.ts` - Debug logging

## Next Steps (Recommended)

### Option A: Manual Browser Testing with Debug Logs
1. Open Chrome DevTools
2. Navigate to `https://july25-client.vercel.app/`
3. Click Server → Authenticate → Select table → Select seat → Click Voice
4. Check console for WebRTC connection events:
   - `[WebRTCConnection]` logs
   - `[WebRTCVoiceClient]` logs
   - `[VoiceEventHandler]` logs
5. Look for disconnection events or errors

### Option B: Server-Side Investigation
1. Check Render logs when voice modal opens
2. Look for ephemeral token generation errors
3. Check OpenAI API response/errors
4. Verify WebRTC offer/answer exchange

### Option C: Direct Code Investigation
Focus on these specific areas:

1. **VoiceSessionConfig.ts** - Token management
   - `fetchEphemeralToken()` method
   - `isTokenValid()` method
   - Token expiration logic

2. **WebRTCConnection.ts** - Connection lifecycle
   - `createDataChannel()` method
   - DataChannel event handlers (`onopen`, `onclose`, `onerror`)
   - `handleDataChannel()` method

3. **VoiceEventHandler.ts** - Event processing
   - `setupDataChannel()` method (lines 145-185)
   - Check for premature cleanup or disconnection

## Key Code Sections to Review

### WebRTCConnection DataChannel Setup
File: `client/src/modules/voice/services/WebRTCConnection.ts`

The data channel setup and event handlers are critical:
```typescript
// Around line 200-250
private createDataChannel(pc: RTCPeerConnection): void {
  // ... data channel creation
  dc.onopen = () => { /* ... */ }
  dc.onclose = () => { /* THIS MAY BE FIRING TOO EARLY */ }
  dc.onerror = () => { /* CHECK FOR ERRORS HERE */ }
}
```

### VoiceEventHandler DataChannel
File: `client/src/modules/voice/services/VoiceEventHandler.ts:145-185`

```typescript
private setupDataChannel(): void {
  // ...
  this.dc.onclose = () => {
    // This sets dcReady = false
    // May be causing "disconnected" status
  }
}
```

## Commits Made

1. `12c5ed4b` - feat: create claudelessons directory for future debugging reference
2. `5915e83d` - docs: post-mortem analysis of react #318 hydration bug
3. `3949d61a` - fix: critical react hydration bug blocking voice and touch ordering
4. Latest (uncommitted) - fix: resolve voice ordering state machine deadlock + diagnostic logging

## Environment

- **Production URL**: `https://july25-client.vercel.app/`
- **Deploy Trigger**: Push to `main` branch
- **Backend**: Render (API key configured and valid)
- **OpenAI Model**: gpt-4o-realtime-preview

## Questions for User

1. Can you manually test and share the browser console logs when the Voice modal opens?
2. Does the WebSocket disconnection happen immediately, or after some delay?
3. Are there any errors in the Render backend logs when opening the voice modal?
