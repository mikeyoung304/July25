# 🚀 Quick Start Guide - January 2025

## The ONE Command Solution

```bash
npm run dev:ai
```

That's it! This single command now starts everything you need:
- ✅ Frontend on http://localhost:5173
- ✅ AI Gateway with Voice Support on port 3002
- ✅ WebSocket streaming for real-time audio
- ✅ All in one terminal with color-coded output

## What Changed?

We've simplified the architecture:
- **Before**: Required external `macon-ai-gateway` directory
- **Now**: Everything is self-contained in the project
- **Result**: No more confusion about directories or multiple repos

## Key Features

### 🎤 Voice Ordering
- Navigate to `/kiosk` or `/drive-thru`
- Hold the "HOLD ME" button to speak
- Real-time transcription with OpenAI Whisper
- AI-powered order processing

### 🔌 WebSocket Support
- Real-time audio streaming
- Connection status indicators
- Automatic reconnection
- Progress updates during recording

### 🤖 AI Integration
- OpenAI GPT for conversation
- Whisper for speech-to-text
- Context-aware order taking
- Natural language processing

## Configuration

The `.env` file is already configured with your API keys:
```env
OPENAI_API_KEY=sk-svcacct-... # Your actual key is set
VITE_SUPABASE_URL=http://localhost:54321
```

## Testing Voice Ordering

1. Start the app: `npm run dev:ai`
2. Open http://localhost:5173/kiosk
3. Hold the blue button and say "I'd like to order a burger"
4. Release to see transcription
5. Watch as AI processes your order

## Troubleshooting

If you see "Mock mode" in the startup:
- Check that `.env` file has your OPENAI_API_KEY
- Restart with `npm run dev:ai`

If voice doesn't work:
- Allow microphone permissions when prompted
- Check the connection indicator (should be green)
- Look for WebSocket errors in console

## Architecture

```
rebuild-6.0/
├── ai-gateway-websocket.js    # Voice-enabled AI Gateway
├── ai-gateway-voiceHandler.js # Audio processing logic
├── start-unified-dev.js       # Single startup script
└── src/
    └── modules/
        └── voice/             # Voice ordering components
```

---

**Remember**: Just `npm run dev:ai` - everything else is handled! 🎉