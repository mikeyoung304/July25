/**
 * Type definitions for OpenAI Realtime API events
 *
 * These interfaces define the structure of events exchanged with the
 * OpenAI Realtime API via WebRTC data channel.
 *
 * @see https://platform.openai.com/docs/guides/realtime
 */

/**
 * Base interface for event types from OpenAI Realtime API
 */
export interface RealtimeEvent {
  type: string;
  event_id?: string;
}

/**
 * Session configuration from OpenAI Realtime API
 */
export interface SessionConfig {
  id?: string;
  object?: string;
  model?: string;
  modalities?: string[];
  instructions?: string;
  voice?: string;
  input_audio_format?: string;
  output_audio_format?: string;
  input_audio_transcription?: {
    model?: string;
    language?: string;
  } | null;
  turn_detection?: {
    type?: string;
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  } | null;
  tools?: Array<{
    type?: string;
    name?: string;
    description?: string;
    parameters?: Record<string, unknown>;
  }>;
  tool_choice?: string;
  temperature?: number;
  max_response_output_tokens?: number | string;
}

/**
 * Session created event
 */
export interface SessionCreatedEvent extends RealtimeEvent {
  type: 'session.created';
  session: SessionConfig;
}

/**
 * Session updated event
 */
export interface SessionUpdatedEvent extends RealtimeEvent {
  type: 'session.updated';
  session: SessionConfig;
}

/**
 * Speech started event
 */
export interface SpeechStartedEvent extends RealtimeEvent {
  type: 'input_audio_buffer.speech_started';
  audio_start_ms?: number;
  item_id?: string;
}

/**
 * Speech stopped event
 */
export interface SpeechStoppedEvent extends RealtimeEvent {
  type: 'input_audio_buffer.speech_stopped';
  audio_end_ms?: number;
  item_id?: string;
}

/**
 * Audio buffer committed event
 */
export interface AudioBufferCommittedEvent extends RealtimeEvent {
  type: 'input_audio_buffer.committed';
  previous_item_id?: string;
  item_id?: string;
}

/**
 * Audio buffer cleared event
 */
export interface AudioBufferClearedEvent extends RealtimeEvent {
  type: 'input_audio_buffer.cleared';
}

/**
 * Conversation item structure
 */
export interface ConversationItem {
  id?: string;
  object?: string;
  type?: string;
  status?: string;
  role?: 'user' | 'assistant' | 'system';
  content?: Array<{
    type?: string;
    text?: string;
    audio?: string;
    transcript?: string;
  }>;
}

/**
 * Conversation item created event
 */
export interface ConversationItemCreatedEvent extends RealtimeEvent {
  type: 'conversation.item.created';
  previous_item_id?: string;
  item: ConversationItem;
}

/**
 * Transcript delta event
 */
export interface TranscriptDeltaEvent extends RealtimeEvent {
  type: 'conversation.item.input_audio_transcription.delta';
  item_id: string;
  content_index?: number;
  delta: string;
}

/**
 * Transcript completed event
 */
export interface TranscriptCompletedEvent extends RealtimeEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  item_id: string;
  content_index?: number;
  transcript: string;
}

/**
 * Response structure
 */
export interface Response {
  id?: string;
  object?: string;
  status?: string;
  status_details?: Record<string, unknown> | null;
  output?: Array<{
    id?: string;
    object?: string;
    type?: string;
    status?: string;
    role?: string;
    content?: unknown[];
  }>;
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

/**
 * Response created event
 */
export interface ResponseCreatedEvent extends RealtimeEvent {
  type: 'response.created';
  response: Response;
}

/**
 * Assistant transcript delta event
 */
export interface AssistantTranscriptDeltaEvent extends RealtimeEvent {
  type: 'response.audio_transcript.delta';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  delta: string;
}

/**
 * Assistant transcript done event
 */
export interface AssistantTranscriptDoneEvent extends RealtimeEvent {
  type: 'response.audio_transcript.done';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  transcript: string;
}

/**
 * Response text delta event
 */
export interface ResponseTextDeltaEvent extends RealtimeEvent {
  type: 'response.text.delta';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  delta: string;
}

/**
 * Response text done event
 */
export interface ResponseTextDoneEvent extends RealtimeEvent {
  type: 'response.text.done';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  text: string;
}

/**
 * Response audio delta event
 */
export interface ResponseAudioDeltaEvent extends RealtimeEvent {
  type: 'response.audio.delta';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  content_index?: number;
  delta: string;
}

/**
 * Response done event
 */
export interface ResponseDoneEvent extends RealtimeEvent {
  type: 'response.done';
  response: Response;
}

/**
 * Function call start event
 */
export interface FunctionCallStartEvent extends RealtimeEvent {
  type: 'response.function_call_arguments.start';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  call_id?: string;
  name: string;
}

/**
 * Function call delta event
 */
export interface FunctionCallDeltaEvent extends RealtimeEvent {
  type: 'response.function_call_arguments.delta';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  call_id?: string;
  delta: string;
}

/**
 * Function call done event
 */
export interface FunctionCallDoneEvent extends RealtimeEvent {
  type: 'response.function_call_arguments.done';
  response_id?: string;
  item_id?: string;
  output_index?: number;
  call_id?: string;
  name: string;
  arguments: string;
}

/**
 * Error event
 */
export interface ErrorEvent extends RealtimeEvent {
  type: 'error';
  error: {
    type?: string;
    code?: string;
    message?: string;
    param?: string | null;
    event_id?: string;
  };
}

/**
 * Order item structure for function calls
 */
export interface OrderItem {
  name: string;
  quantity?: number;
  modifiers?: string[];
}

/**
 * Add to order function arguments
 */
export interface AddToOrderArgs {
  items: OrderItem[];
}

/**
 * Confirm order function arguments
 */
export interface ConfirmOrderArgs {
  action: string;
}

/**
 * Remove from order function arguments
 */
export interface RemoveFromOrderArgs {
  itemName: string;
  quantity?: number;
}

/**
 * Outbound event to send to OpenAI Realtime API
 */
export interface OutboundEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Configuration for voice client
 */
export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

/**
 * Transcript event structure
 */
export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

/**
 * Order event structure
 */
export interface OrderEvent {
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
  }>;
  confidence: number;
  timestamp: number;
}

/**
 * Turn state machine states
 * @deprecated Use VoiceStateMachine instead - this type is kept for backward compatibility with tests
 */
export type TurnState =
  | 'idle'
  | 'recording'
  | 'committing'
  | 'waiting_user_final'
  | 'waiting_response';

/**
 * Interface for VoiceEventHandler service
 *
 * Single Responsibility: Process and route Realtime API events
 */
export interface IVoiceEventHandler {
  // Data channel management
  setDataChannel(dc: RTCDataChannel): void;

  // Event processing
  handleRealtimeEvent(event: RealtimeEvent): void;
  sendEvent(event: OutboundEvent): void;

  // Queue management
  flushMessageQueue(): void;
  clearMessageQueue(): void;

  // State
  isDataChannelReady(): boolean;
  getCurrentTurnId(): number;
  getCurrentEventIndex(): number;
}
