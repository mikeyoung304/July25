# Voice Ordering System Debug Guide

## Issues Fixed

### 1. ✅ Drive-Thru Missing from Navigation
- **Issue**: Drive-thru route existed at `/drive-thru` but wasn't in the navigation menu
- **Fix**: Added Drive-Thru link to Navigation.tsx

### 2. ✅ Transcription Not Working
- **Issue**: VoiceControl component requires WebSocket connection to AI Gateway at `ws://localhost:3002/voice-stream`
- **Fix**: Added fallback mode with mock transcriptions when WebSocket is unavailable

## How to Start Everything

### Option 1: With AI Gateway (Full Voice Transcription)

**Terminal 1 - Start AI Gateway with WebSocket:**
```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
./start-ai-gateway-websocket.sh
```

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```

### Option 2: Without AI Gateway (Mock Mode)

Just start the frontend:
```bash
npm run dev
```

The voice control will work in mock mode, providing sample transcriptions for testing.

## Testing Voice Ordering

1. **Navigate to Voice Kiosk**: http://localhost:5173/kiosk
2. **Navigate to Drive-Thru**: http://localhost:5173/drive-thru
3. **Click and hold** the microphone button to record
4. **Release** to stop recording and get transcription

## What Happens in Each Mode

### With AI Gateway Running:
- Real-time audio streaming via WebSocket
- Actual transcription (requires OpenAI API key in .env)
- AI-powered conversational responses
- Dynamic order parsing based on menu context

### Without AI Gateway (Mock Mode):
- Simulated transcriptions from a preset list
- Basic order functionality testing
- No AI responses (uses fallback messages)
- Good for UI/UX testing

## Debugging Tips

### Check Console for:
1. **WebSocket Status**: Look for "WebSocket connected" or connection errors
2. **Fallback Mode**: "Using fallback transcription mode" indicates mock mode
3. **Microphone Permissions**: Browser may block microphone access

### Common Issues:

**"WebSocket connection failed"**
- AI Gateway not running
- Wrong port (should be 3002)
- Start with: `./start-ai-gateway-websocket.sh`

**"No transcription appearing"**
- Check browser console for errors
- Ensure microphone permissions granted
- Try mock mode first to test UI

**"AI Gateway won't start"**
- Install dependencies: `npm install express cors dotenv ws openai`
- Check port 3002 is free: `lsof -i :3002`
- Add OpenAI API key to .env file

## Architecture Overview

```
Frontend (5173)
    ↓
VoiceControl Component
    ↓
WebSocket (ws://localhost:3002/voice-stream)
    ↓
AI Gateway (3002)
    ↓
OpenAI Whisper API (transcription)
    ↓
OpenAI Chat API (conversational AI)
```

## Files Modified
- `/src/components/layout/Navigation.tsx` - Added Drive-Thru link
- `/src/modules/voice/components/VoiceControl.tsx` - Added WebSocket error handling and fallback mode

## Next Steps
1. Add OpenAI API key to `.env` file for real transcription
2. Test both Kiosk and Drive-Thru pages
3. Monitor console for any errors
4. Report any issues with specific error messages