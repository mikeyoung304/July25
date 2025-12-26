/**
 * Type definitions for voice module
 */

// Re-export all Realtime API event types
export type {
  RealtimeEvent,
  SessionConfig,
  SessionCreatedEvent,
  SessionUpdatedEvent,
  SpeechStartedEvent,
  SpeechStoppedEvent,
  AudioBufferCommittedEvent,
  AudioBufferClearedEvent,
  ConversationItem,
  ConversationItemCreatedEvent,
  TranscriptDeltaEvent,
  TranscriptCompletedEvent,
  Response,
  ResponseCreatedEvent,
  AssistantTranscriptDeltaEvent,
  AssistantTranscriptDoneEvent,
  ResponseTextDeltaEvent,
  ResponseTextDoneEvent,
  ResponseAudioDeltaEvent,
  ResponseDoneEvent,
  FunctionCallStartEvent,
  FunctionCallDeltaEvent,
  FunctionCallDoneEvent,
  ErrorEvent,
  OrderItem,
  AddToOrderArgs,
  ConfirmOrderArgs,
  RemoveFromOrderArgs,
  OutboundEvent,
  WebRTCVoiceConfig,
  TranscriptEvent,
  OrderEvent,
  TurnState,
  IVoiceEventHandler,
} from './realtime-events.types';

// Legacy placeholder types (kept for backward compatibility)
export type KioskVoiceCaptureConfig = Record<string, never>

export type KioskVoiceCaptureState = Record<string, never>
