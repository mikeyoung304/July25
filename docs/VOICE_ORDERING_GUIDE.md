# Voice Ordering Guide

## Overview

AI-powered voice ordering system with speech recognition and natural language processing.

**Interfaces:**
- **Kiosk** (`/kiosk`) - In-store touchscreen
- **Drive-Thru** (`/drive-thru`) - Vehicle ordering

## Quick Start

```bash
npm run dev  # Starts everything on port 3001
```

**Access:**
- Kiosk: http://localhost:5173/kiosk
- Drive-Thru: http://localhost:5173/drive-thru
- Kitchen: http://localhost:5173/kitchen

## How It Works

1. **Hold button** → "Welcome to Grow! What can I get started for you today?"
2. **Speak naturally** → "I'll have a bacon burger with no pickles"
3. **Release button** → Order appears on screen
4. **Press again** → Modify or add items

## Architecture

### Frontend
- **UnifiedVoiceRecorder** - Handles recording and WebSocket streaming
- **VoiceOrderContext** - Manages order state
- **Real-time updates** - WebSocket connection to backend

### Backend (Port 3001)
- **WebSocket endpoint** - Audio streaming and transcription
- **OpenAI integration** - Speech-to-text and order parsing
- **Order processing** - Natural language to structured data

### Data Flow
```
User speaks → WebSocket → OpenAI Whisper → GPT-4 parsing → Structured order → Kitchen display
```

## Key Features

- **Natural language**: "Two burgers, one without pickles"
- **Modifications**: "Actually, make that three"
- **Questions**: "What desserts do you have?"
- **Real-time feedback**: Instant transcription display
- **Error recovery**: Automatic reconnection

## Configuration

### Environment Variables
```env
OPENAI_API_KEY=your-key-here
```

### Menu Upload
```bash
cd server && npm run upload:menu
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No microphone access | Check browser permissions |
| Connection failed | Verify backend is running on 3001 |
| No transcription | Check OpenAI API key |
| Menu not recognized | Run menu upload script |

## Testing

```bash
# Test voice flow
cd server && npm run test:voice:flow

# Check integration
npm run check:integration
```

## Performance

- Audio chunks: 100ms intervals
- Transcription: <2s latency
- Order parsing: <1s
- WebSocket: Auto-reconnect with backoff