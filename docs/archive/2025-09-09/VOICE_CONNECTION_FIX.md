# Voice Connection Issue - Root Cause Analysis

## Problem
When clicking "Connect Voice" button, nothing happens - no error messages, no connection attempt visible.

## Root Cause
The WebRTC voice connection fails silently at the very first step because:

1. **Auth Token Retrieval Fails**: The `getAuthToken()` function in the WebRTCVoiceClient returns null/undefined
2. **No Error Propagation**: The connection attempt fails silently without showing errors to the user
3. **Event Handlers Register But Don't Execute**: The console shows event handlers being registered but the actual connection never starts

## Evidence
- Server logs show ephemeral tokens ARE being created successfully
- Browser console shows event handlers registering but NO connection logs (`[WebRTCVoice] Starting connection...`)
- Multiple ephemeral token requests indicate retry attempts but the WebRTC connection never initiates

## The Fix Required

### 1. Fix Auth Token Retrieval
The `getAuthToken()` function needs to properly retrieve the Supabase token from localStorage:

```typescript
// In client/src/services/auth/index.ts
export async function getAuthToken(): Promise<string | null> {
  // Check Supabase auth first
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return session.access_token;
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem('supabase.auth.token');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.access_token || parsed.currentSession?.access_token;
    } catch {
      // Invalid JSON
    }
  }
  
  return null;
}
```

### 2. Add Error Handling in Connection
The connection attempt needs to show errors to the user:

```typescript
// In WebRTCVoiceClient.ts connect() method
async connect(): Promise<void> {
  try {
    console.log('[WebRTCVoice] Starting connection...');
    
    // Step 1: Get auth token
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('No authentication token available. Please log in first.');
    }
    
    // Continue with connection...
  } catch (error) {
    console.error('[WebRTCVoice] Connection failed:', error);
    this.emit('error', error);
    throw error; // Re-throw to show in UI
  }
}
```

### 3. Ensure Auth Context is Available
The voice component needs to be wrapped in the auth context or use the auth hook properly.

## Why This Keeps Happening
This issue persists because:
1. We fixed authentication on the server side but not the client-side token retrieval
2. Silent failures make debugging difficult
3. The auth context isn't properly connected to the voice module

## Immediate Action Items
1. Fix the `getAuthToken()` function to properly retrieve Supabase tokens
2. Add error logging at the start of the connection attempt
3. Ensure errors are displayed in the UI
4. Test with proper authentication flow