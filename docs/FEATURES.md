# Features Overview

## Order Management
- **Multi-channel**: Dine-in, takeout, delivery, online
- **Real-time sync**: WebSocket updates across all clients
- **Status tracking**: Created → Pending → Preparing → Ready → Completed
- **Kitchen display**: Optimized KDS view with urgency indicators

## Voice Ordering
- **Natural language**: "Two burgers medium with fries"
- **Real-time transcription**: See what's being captured
- **Smart parsing**: Automatically extracts items and modifiers
- **Multi-mode**: Hold-to-talk or tap-to-toggle

## Unified Components
- **BaseOrderCard**: Single component, multiple display modes
- **UnifiedVoiceRecorder**: Consistent voice interface
- **Shared UI library**: Reusable components across views
- **Type safety**: Shared types between client and server

## Performance & Monitoring
- **Bundle optimization**: Vendor splitting, modern targets
- **Performance tracking**: Component render times, API latency
- **Error boundaries**: Graceful error handling
- **Health checks**: System status endpoints

## Developer Experience
- **Single command start**: `npm run dev`
- **TypeScript**: Full type safety
- **Hot reload**: Instant feedback during development
- **Quality gates**: Linting, type checking, testing