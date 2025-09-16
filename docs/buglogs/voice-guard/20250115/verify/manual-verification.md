# Voice System Manual Verification Guide
**Date**: 2025-01-15
**Branch**: hardening/voice-session-guard-20250115

## Verification Steps

### 1. Employee Path Verification

```bash
# Start development server
npm run dev

# Open browser to http://localhost:5173/server
```

**Test Steps:**
1. Login as employee (use PIN or email)
2. Click "Connect Voice" button
3. Verify in console: `[voice.session.created]` with mode: 'employee'
4. Verify temperature is 0.7 (employee default)
5. Speak an order: "Two burgers and a coke"
6. Verify items appear in cart
7. Submit order
8. Open `/kitchen` in another tab - verify order appears

**Expected Logs:**
```
voice.session.created: { mode: 'employee', temperature: 0.7 }
voice.session.normalized: { changes: {}, finalConfig: { temperature: 0.7 } }
```

### 2. Microphone Permission Testing

**Block Permission:**
1. In Chrome: Settings > Privacy > Site Settings > Microphone > Block localhost
2. Refresh page and try to connect voice
3. Verify friendly error message appears with guidance
4. Verify "NotAllowedError" in console
5. Re-enable permission and verify reconnection works

### 3. Network Disconnection Testing

**Simulate Connection Loss:**
1. Connect voice successfully
2. Open DevTools > Network > Throttle to "Offline"
3. Verify reconnection attempts in console
4. Verify exponential backoff: 200ms, 500ms, 1s, 2s
5. Re-enable network
6. Verify automatic reconnection succeeds

### 4. Customer Path Verification

```bash
# Test kiosk mode
# Open browser to http://localhost:5173/kiosk
```

**Test Steps:**
1. Select "Voice Ordering"
2. Verify temperature is 0.85 (customer default)
3. Start voice order
4. Without payment token: Verify order blocked with 402 error
5. With payment token: Verify order succeeds and appears in KDS

### 5. Environment Override Testing

```bash
# Set environment variables
export VOICE_TEMPERATURE=1.0
export VOICE_MAX_TOKENS=200

# Restart server
npm run dev
```

**Verify:**
1. Connect voice session
2. Check logs for "Environment override for temperature"
3. Verify temperature is clamped between 0.6-2.0
4. Verify max tokens applied but still clamped to limits

### 6. Device Change Testing

**Test Device Changes:**
1. Connect voice successfully
2. Plug in/unplug a USB microphone or headset
3. Verify "Device change detected" in console
4. Verify "Refresh devices" button appears
5. Click button and verify device list updates
6. Verify voice still works with new device

### 7. Connectivity Panel Testing

**Dev Mode Panel:**
1. Enable debug mode in voice settings or add `?debug=true` to URL
2. Connect voice
3. Click "Connectivity details" expander
4. Verify real-time status updates:
   - Connection state (green when connected)
   - Reconnection attempts counter
   - Device count
   - Last error (if any)

## Success Criteria

✅ Server-side normalizer clamps all parameters to valid ranges
✅ Environment overrides work but are still clamped
✅ Mic permission errors show friendly UI with guidance
✅ Network disconnections trigger exponential backoff reconnect
✅ Device changes are detected and handled gracefully
✅ Metrics are logged for all session lifecycle events
✅ Employee mode uses temperature 0.7, customer uses 0.85
✅ No require() or Node.js globals in client code
✅ CI guards prevent future drift

## Console Commands for Testing

```javascript
// Check current session config
localStorage.getItem('voice_session_config')

// Simulate device change
navigator.mediaDevices.dispatchEvent(new Event('devicechange'))

// Check metrics in console
console.log(window.__voiceMetrics)

// Force disconnect (in DevTools console)
window.__webrtcClient?.disconnect()
```

## Artifacts to Capture

1. Screenshot of successful employee voice order
2. Screenshot of mic permission error UI
3. Console logs showing reconnection attempts
4. Screenshot of connectivity details panel
5. Network tab showing session creation with normalized config

Save all artifacts to: `docs/buglogs/voice-guard/20250115/verify/`