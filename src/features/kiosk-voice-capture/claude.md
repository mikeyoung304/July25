# Context: kiosk-voice-capture Feature

## Overview
- Purpose: Voice-first ordering interface for self-service kiosks, enabling natural speech ordering
- Primary Components: VoiceCapture (UI), useKioskVoiceCapture (state hook), audio processing utilities
- State Management: Local component state + feature hook for voice capture logic
- Integration Points: Order API, KDS system, Restaurant Context, Speech-to-text services

## Architecture Notes
- Follow the established Janus Module Architecture
- All external data access through services directory
- Use RestaurantContext for multi-tenant data
- Implement with TypeScript and functional components
- Accessibility-first design with WCAG compliance

## Performance Goals
- Voice activation response time < 200ms
- Audio capture buffer optimization for real-time processing
- Minimize re-renders during voice capture
- Progressive enhancement for browsers without speech API support

## Implementation Status
- ✅ VoiceCapture component with TDD tests
- ✅ Basic UI: "Tap to Order" button and "Listening..." state
- ✅ Microphone permissions handling with MicrophonePermission component
- ✅ Audio capture with useAudioCapture hook
- ✅ RecordingIndicator component for visual feedback
- ✅ TranscriptionDisplay component for showing results
- ✅ Error handling for permission denied and device not found
- ✅ Mock speech-to-text integration
- ✅ 22 comprehensive tests covering all components
- 🔲 Real speech-to-text service integration (OpenAI Whisper or Web Speech API)
- 🔲 Order intent parsing (convert speech to structured order data)
- 🔲 Integration with order processing system

## Component Architecture

### Atomic Components
- **MicrophonePermission**: Handles permission states and error messages
- **RecordingIndicator**: Shows animated recording status
- **TranscriptionDisplay**: Shows transcription results with confidence levels

### Hooks
- **useAudioCapture**: Manages MediaStream, MediaRecorder, and permission states

### Main Component
- **VoiceCapture**: Orchestrates all components and manages overall state

## Testing Strategy
- Unit tests for each atomic component
- Integration tests for VoiceCapture
- Mock MediaDevices API for consistent testing
- Mock MediaRecorder for audio capture simulation
