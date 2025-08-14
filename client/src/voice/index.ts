/**
 * Client-side Voice Pipeline Exports
 */

// Audio Pipeline Components
export {
  AudioPipeline,
  AudioCapture,
  AudioResampler,
  AudioFramer,
  SimpleVAD,
  AudioEncoder,
  DEFAULT_AUDIO_CONFIG,
  type AudioConfig,
} from './audio-pipeline';

// WebSocket Transport
export {
  VoiceTransport,
  DEFAULT_CONFIG as DEFAULT_TRANSPORT_CONFIG,
  type VoiceTransportConfig,
  type VoiceStreamMessage,
  type TranscriptData,
  type ResponseData,
  type AudioData,
  type ConnectionState,
  type VoiceTransportEvents,
} from './ws-transport';

// React Hook
export {
  useVoiceOrder,
  type VoiceOrderState,
  type VoiceOrderConfig,
  type UseVoiceOrderReturn,
} from './useVoiceOrder';