# Voice Authentication Test Guide

## Changes Implemented
✅ Added authentication bridge between AuthContext and getAuthToken()
✅ Connected AuthContext session to bridge on session changes
✅ Modified getAuthToken to check AuthContext first, then Supabase

## Testing Steps

### 1. Verify You're Logged In
1. Go to http://localhost:5173
2. You should be on the Server View page
3. Check console for: `[AuthContext] Session synced to auth bridge: present`

### 2. Test Voice Ordering
1. Click on any green (available) table
2. Select a seat number (e.g., Seat 1)
3. Click "Start Voice Order"
4. Look for the microphone permission prompt (if first time)
5. Grant microphone access

### Expected Console Output:
```
[Auth] AuthContext session updated: present
[Auth] Using token from AuthContext
[WebRTCVoice] Got ephemeral token
[WebRTCVoice] Connected to OpenAI Realtime
```

### 3. Test Voice Commands
Once connected:
1. Hold the microphone button
2. Say: "Add a cheeseburger"
3. Release the button
4. The item should appear in the order list

### 4. Verify WebSocket Connection
The WebSocket should now authenticate properly:
- No more "WebSocket authentication failed" errors
- Real-time updates should work

## Troubleshooting

### If Voice Still Doesn't Connect:
1. Open browser console (F12)
2. Look for these messages:
   - `[Auth] AuthContext session updated: present` - Should appear after login
   - `[Auth] Using token from AuthContext` - Should appear when clicking voice
   - Any error messages starting with `[Auth]` or `[WebRTCVoice]`

### Common Issues:
- **"Authentication required"**: Session not synced yet, refresh the page
- **"No microphone permission"**: Grant browser microphone access
- **"Failed to get ephemeral token"**: Check if backend is running on port 3001

## What Was Fixed

The core issue was that voice services were trying to get auth tokens from Supabase directly, but after login, tokens only existed in AuthContext. The fix creates a bridge that allows non-React services to access AuthContext tokens.

### Before:
```
Voice → getAuthToken() → Supabase (empty!) → ❌ Failed
```

### After:
```
Voice → getAuthToken() → AuthContext Bridge → ✅ Success
```

## Next Steps if Working:
1. Test WebSocket authentication
2. Test with different login methods (PIN, station)
3. Test token refresh scenarios
4. Test logout/login cycles

## Report Results
Please test and report:
1. Does voice ordering connect?
2. Can you add items via voice?
3. Any console errors?
4. WebSocket status?