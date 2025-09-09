# Debug Guide: Voice Authentication Issue

## Current Issue
When you click "Connect Voice" after logging in, the system can't find your auth token. This means the session bridge isn't getting the token from AuthContext.

## Debug Steps in Browser Console

### 1. After Login, Check Session State
Open browser console (F12) and run:
```javascript
// Check if AuthContext has session
localStorage.getItem('auth_session')
```

If this returns null, the session isn't being stored properly.

### 2. Check Console Logs
Look for these messages after login:
- `[Auth] AuthContext session updated: present` - Good!
- `[Auth] AuthContext session updated: cleared` - Bad!
- `[Auth] getAuthToken called` - Should show when clicking voice

### 3. Manual Test of Auth Bridge
In browser console, run:
```javascript
// Import and check auth service
import('@/services/auth').then(auth => {
  auth.getAuthToken().then(token => {
    console.log('Token found:', token ? 'YES' : 'NO');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'none');
  }).catch(err => {
    console.error('No token:', err.message);
  });
});
```

## Potential Issues & Fixes

### Issue 1: Session Not Stored in AuthContext
The login response might not include the session data.

**Check:** After login, look in Network tab for `/api/v1/auth/login` response.
Should have:
```json
{
  "user": {...},
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "expires_in": 3600
  },
  "restaurantId": "..."
}
```

### Issue 2: AuthContext Not Setting Session
The session might not be stored in state.

**Check:** In React DevTools, find AuthProvider and check:
- `session` should have `accessToken` field
- `user` should be populated

### Issue 3: Bridge Not Syncing
The session might not be synced to the bridge.

**Check:** Console should show:
```
[AuthContext] Session synced to auth bridge: present
```

## Quick Fix to Try

1. **Clear Everything & Restart:**
```bash
# In terminal
rm -rf client/node_modules/.vite
# Ctrl+C to stop servers
npm run dev
```

2. **Fresh Login:**
- Open http://localhost:5173 in incognito/private window
- Open DevTools Console before logging in
- Login with server@restaurant.com / Demo123!
- Watch console for auth messages
- Try voice ordering

3. **If Still Broken, Add Debug Code:**

Edit `/client/src/contexts/AuthContext.tsx` line ~178:
```typescript
if (response.session) {
  console.log('🔴 LOGIN RESPONSE SESSION:', response.session);
  const expiresAt = response.session.expires_in 
    ? Math.floor(Date.now() / 1000) + response.session.expires_in
    : undefined;
  
  const sessionData = {
    accessToken: response.session.access_token,
    refreshToken: response.session.refresh_token,
    expiresIn: response.session.expires_in,
    expiresAt
  };
  
  console.log('🔴 SETTING SESSION:', sessionData);
  setSession(sessionData);
}
```

## Expected Working Flow

1. Login → Server returns session with tokens
2. AuthContext stores session in state
3. useEffect syncs session to auth bridge
4. Voice button clicked → getAuthToken() checks bridge
5. Token found → Voice connects

## Current Code Locations

- **Auth Bridge:** `/client/src/services/auth/index.ts`
- **AuthContext:** `/client/src/contexts/AuthContext.tsx` (lines 427-447)
- **Voice Client:** `/client/src/modules/voice/services/WebRTCVoiceClient.ts` (line 232)
- **Login Handler:** `/client/src/contexts/AuthContext.tsx` (lines 158-198)

## What I Found
The authentication bridge is implemented correctly, but the session might not be getting stored properly when you login. The error "Authentication required. Please log in." means `authContextSession` is null when voice is clicked.

## Next Step
Please:
1. Open browser console
2. Login fresh
3. Check for `[Auth] AuthContext session updated: present` message
4. Try voice
5. Share what console shows

The issue is likely that the session from login isn't being stored in AuthContext's state properly.