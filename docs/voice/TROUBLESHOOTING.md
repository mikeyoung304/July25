# Voice System Troubleshooting Guide

## Common Issues & Solutions

### 1. Connect Voice Button Not Working (SOLVED 2025-09-09)

#### Symptoms
- Click "Connect Voice" button but nothing happens
- Console shows successful connection (OpenAI returns 201) but UI doesn't update
- "WARNING: No handlers for event 'session.created'" in console
- Connection state never changes from "disconnected" to "connected"

#### Root Cause
**React hooks dependency hell** - The WebRTC client was being destroyed and recreated on every render due to unstable dependencies in the useEffect hook.

#### What Was Happening
1. Connection succeeded (OpenAI returned 201)
2. Component re-rendered (due to state changes)
3. Callbacks got recreated (new function references)
4. useEffect saw "changed" dependencies
5. WebRTC client was destroyed and recreated
6. UI showed disconnected despite successful connection

#### Solution
Fixed in commits on 2025-09-09 by:
1. **Storing callbacks in refs** (`useWebRTCVoice.ts`)
2. **Removing callback dependencies** from the main useEffect
3. **Stabilizing callbacks** in `VoiceControlWebRTC.tsx` with useCallback
4. Only keeping stable dependencies `[debug, restaurantId]` in useEffect

#### How to Verify Fix
Open browser console and look for:
```
[useWebRTCVoice] Connection state changed: connected
[useWebRTCVoice] isConnected changed: true
```

### 2. Microphone Permission Issues

#### Symptoms
- Voice control shows "Microphone Permission Required"
- Cannot enable microphone

#### Solutions
1. Check browser settings for microphone permissions
2. Ensure HTTPS is being used (required for WebRTC)
3. Clear browser cache and reload

### 3. Authentication Token Issues

#### Symptoms
- "Authentication required" error when connecting
- "Token expired" messages

#### Solutions
1. Ensure user is logged in (check localStorage for auth tokens)
2. Refresh the page to get new tokens
3. Check AuthContext is properly syncing tokens to auth bridge

### 4. WebSocket Connection Issues

#### Symptoms
- Frequent disconnections
- "Connection lost" messages

#### Solutions
1. Check network stability
2. Verify backend server is running
3. Check for CORS issues in browser console

## Debugging Steps

### 1. Check Console Logs
Enable verbose logging by looking for these key messages:
- `[WebRTCVoice] Starting connection...`
- `[WebRTCVoice] Token received`
- `[WebRTCVoice] OpenAI response status: 201`
- `[useWebRTCVoice] Connection state changed: connected`

### 2. Verify Authentication
```javascript
// In browser console
localStorage.getItem('auth_user_data')
localStorage.getItem('auth_session')
```

### 3. Check React Component Lifecycle
Look for cleanup messages indicating component unmounting:
- `[useWebRTCVoice] Cleaning up WebRTC client`

If you see this frequently, it indicates the component is being recreated too often.

## Prevention Tips

### For Developers

1. **Avoid Unstable Dependencies in useEffect**
   - Use refs for callbacks that don't need to trigger re-renders
   - Keep dependency arrays minimal with only stable values

2. **Use useCallback for Event Handlers**
   - Wrap event handlers passed to child components
   - Prevents unnecessary re-renders

3. **Monitor Component Re-renders**
   - Use React DevTools Profiler
   - Look for excessive re-renders in voice components

## Historical Context

This voice connection issue persisted for several weeks because every attempt to fix it by adding more logging or state updates actually caused MORE re-renders, making the problem worse. It was a vicious cycle where debugging attempts exacerbated the issue.

The fix required understanding that React's dependency tracking was causing the entire WebRTC infrastructure to be torn down and rebuilt on every render, even though the connection was succeeding at the network level.

## Related Documentation
- [Voice System Architecture](./VOICE_SYSTEM_ARCHITECTURE.md)
- [React Hooks Pitfalls](./REACT_HOOKS_PITFALLS.md)
- [WebRTC Implementation Details](../../client/src/modules/voice/README.md)