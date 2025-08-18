# Demo Auth Setup - Friends & Family Testing

## Overview

This application is configured for **friends and family demo testing** with simplified authentication that doesn't require real user accounts. The system uses a "kiosk mode" auth pattern for easy access while maintaining security boundaries.

## Current Setup

### Authentication Flow

```
User (Browser) → Demo Token Request → Backend JWT → Access Granted
```

1. **Demo/Kiosk Mode** (Default for Development)
   - Automatically generates demo JWT tokens
   - No login required - perfect for testing
   - Restaurant ID: `11111111-1111-1111-1111-111111111111`

2. **Backend Authentication**
   - Uses JWT tokens with KIOSK_JWT_SECRET
   - Tokens expire after 24 hours
   - Automatically refreshes when needed

### Environment Variables

```bash
# Required for demo auth (already set in .env)
KIOSK_JWT_SECRET=demo-secret-key-for-local-development-only
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# OpenAI for voice features
OPENAI_API_KEY=your-key-here
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview-2025-06-03
```

## Features Available in Demo Mode

### ✅ Full Access To:
- **Voice Ordering** - WebRTC real-time transcription
- **Kitchen Display** - Real-time order management
- **Server View** - Table management
- **Kiosk Mode** - Self-service ordering
- **Drive-Thru** - Voice-based ordering

### 🔒 Security Notes:
- Demo tokens are only valid for the demo restaurant
- No access to production data
- Tokens auto-expire and refresh
- CORS configured for local development

## Testing the Voice Features

### WebRTC Voice (New - Lower Latency)
1. Navigate to http://localhost:5173/test-webrtc
2. Click "Connect Voice"
3. Allow microphone access
4. Hold the button and speak
5. See real-time transcription (~200ms latency)

### Regular Voice Ordering
1. Go to Kiosk or Drive-Thru page
2. Click microphone button
3. Say your order naturally
4. Watch it populate automatically

## Common Issues & Solutions

### "KIOSK_JWT_SECRET not configured"
```bash
# Add to .env file:
KIOSK_JWT_SECRET=demo-secret-key-for-local-development-only
# Restart the server
npm run dev
```

### "Failed to get demo token"
- Check backend is running on port 3001
- Verify KIOSK_JWT_SECRET is set
- Restart both frontend and backend

### Voice Not Working
- Check browser microphone permissions
- Ensure OPENAI_API_KEY is valid
- Verify you're using Chrome/Edge (best WebRTC support)

## Development Commands

```bash
# Start everything (frontend + backend)
npm run dev

# Frontend only (port 5173)
npm run dev:client

# Backend only (port 3001)
npm run dev:server

# Test WebRTC voice
open http://localhost:5173/test-webrtc
```

## For Production/Deployment

When moving beyond friends & family testing:

1. **Replace Demo Auth** with real Supabase authentication
2. **Update JWT Secret** to a secure random value
3. **Enable HTTPS** for WebRTC features
4. **Configure proper CORS** origins
5. **Set up real restaurant IDs** in the database

## Technical Details

### Auth Service Architecture
```typescript
// client/src/services/auth/index.ts
getAuthToken() {
  if (DEV || USE_MOCK_DATA) {
    return getDemoToken(); // Uses kiosk auth
  }
  return getSupabaseToken(); // Production path
}
```

### WebRTC Connection Flow
1. Get demo auth token
2. Request ephemeral token from backend
3. Establish WebRTC connection to OpenAI
4. Stream audio bidirectionally
5. Receive real-time transcriptions

## Next Steps for Friends & Family Testing

1. **Share the local URL** with testers on your network
2. **Test voice commands** like:
   - "I'd like a large pizza with pepperoni"
   - "Add a coke to my order"
   - "That's all for my order"
3. **Report issues** with specific error messages
4. **Note latency** and transcription accuracy

---

*Last Updated: Current Implementation (WebRTC + Demo Auth)*
*Status: Ready for friends & family testing*