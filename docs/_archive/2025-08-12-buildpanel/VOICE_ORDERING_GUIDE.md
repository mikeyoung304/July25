# Voice Ordering Guide

## Overview

AI-powered voice ordering system with speech recognition and natural language processing through BuildPanel service integration.

**Interfaces:**
- **Kiosk** (`/kiosk`) - In-store touchscreen
- **Drive-Thru** (`/drive-thru`) - Vehicle ordering

## Quick Start

```bash
# 1. Start BuildPanel service (port 3003)
# Ensure BuildPanel is running separately

# 2. Configure environment
export USE_BUILDPANEL=true
export BUILDPANEL_URL=http://localhost:3003

# 3. Start Rebuild application
npm run dev  # Starts frontend + backend on port 3001
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
- **WebSocket endpoint** - Audio streaming to buffer
- **BuildPanel integration** - All AI processing via HTTP to port 3003
- **Order processing** - Natural language to structured data via BuildPanel

### BuildPanel Service (Port 3003)
- **Voice processing** - Speech-to-text and AI response generation
- **Restaurant context** - Menu-aware order parsing
- **Response generation** - Natural language responses with order data

### Data Flow
```
User speaks → WebSocket → Audio Buffer → HTTP to BuildPanel → AI Processing → Structured order → Kitchen display
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
USE_BUILDPANEL=true
BUILDPANEL_URL=http://localhost:3003
```

### Menu Sync
```bash
# Menu is automatically synced from BuildPanel service
# BuildPanel maintains restaurant-specific menu context
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No microphone access | Check browser permissions |
| Connection failed | Verify backend is running on 3001 |
| No transcription | Check BuildPanel service on port 3003 |
| Menu not recognized | Verify BuildPanel has restaurant menu data |
| AI features disabled | Set USE_BUILDPANEL=true in environment |

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