/**
 * OpenAI Realtime API TypeScript Type Definitions
 * Complete type system for WebSocket events and configurations
 */

// ============================================
// SESSION CONFIGURATION TYPES
// ============================================

export type AudioFormat = 'pcm16' | 'g711_ulaw' | 'g711_alaw';
export type Modality = 'text' | 'audio';
export type Voice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
export type TranscriptionModel = 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe';

export interface TurnDetection {
  type: 'server_vad' | 'none';
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
}

export interface InputAudioTranscription {
  model: TranscriptionModel;
}

export interface ToolFunction {
  name: string;
  description?: string;
  parameters?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export interface SessionConfiguration {
  modalities?: Modality[];
  instructions?: string; // Added based on API documentation
  voice?: Voice;
  input_audio_format?: AudioFormat;
  output_audio_format?: AudioFormat;
  input_audio_transcription?: InputAudioTranscription;
  turn_detection?: TurnDetection;
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_response_output_tokens?: number | 'inf';
}

// ============================================
// CLIENT EVENT TYPES
// ============================================

export interface SessionUpdateEvent {
  type: 'session.update';
  session: SessionConfiguration;
}

export interface InputAudioBufferAppendEvent {
  type: 'input_audio_buffer.append';
  audio: string; // base64 encoded audio
}

export interface InputAudioBufferCommitEvent {
  type: 'input_audio_buffer.commit';
}

export interface InputAudioBufferClearEvent {
  type: 'input_audio_buffer.clear';
}

export interface ConversationItemCreateEvent {
  type: 'conversation.item.create';
  previous_item_id?: string;
  item: ConversationItem;
}

export interface ConversationItemTruncateEvent {
  type: 'conversation.item.truncate';
  item_id: string;
  content_index: number;
  audio_end_ms: number;
}

export interface ConversationItemDeleteEvent {
  type: 'conversation.item.delete';
  item_id: string;
}

export interface ResponseCreateEvent {
  type: 'response.create';
  response?: {
    modalities?: Modality[];
    instructions?: string;
    voice?: Voice;
    output_audio_format?: AudioFormat;
    tools?: Tool[];
    tool_choice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
    temperature?: number;
    max_output_tokens?: number | 'inf';
  };
}

export interface ResponseCancelEvent {
  type: 'response.cancel';
}

export type ClientEvent =
  | SessionUpdateEvent
  | InputAudioBufferAppendEvent
  | InputAudioBufferCommitEvent
  | InputAudioBufferClearEvent
  | ConversationItemCreateEvent
  | ConversationItemTruncateEvent
  | ConversationItemDeleteEvent
  | ResponseCreateEvent
  | ResponseCancelEvent;

// ============================================
// SERVER EVENT TYPES
// ============================================

export interface ErrorEvent {
  type: 'error';
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string;
    event_id?: string;
  };
}

export interface SessionCreatedEvent {
  type: 'session.created';
  session: Session;
}

export interface SessionUpdatedEvent {
  type: 'session.updated';
  session: Session;
}

export interface InputAudioBufferCommittedEvent {
  type: 'input_audio_buffer.committed';
  previous_item_id: string | null;
  item_id: string;
}

export interface InputAudioBufferClearedEvent {
  type: 'input_audio_buffer.cleared';
}

export interface InputAudioBufferSpeechStartedEvent {
  type: 'input_audio_buffer.speech_started';
  audio_start_ms: number;
  item_id: string;
}

export interface InputAudioBufferSpeechStoppedEvent {
  type: 'input_audio_buffer.speech_stopped';
  audio_end_ms: number;
  item_id: string;
}

export interface ConversationCreatedEvent {
  type: 'conversation.created';
  conversation: Conversation;
}

export interface ConversationItemCreatedEvent {
  type: 'conversation.item.created';
  previous_item_id: string | null;
  item: ConversationItem;
}

export interface ConversationItemInputAudioTranscriptionCompletedEvent {
  type: 'conversation.item.input_audio_transcription.completed';
  item_id: string;
  content_index: number;
  transcript: string;
}

export interface ConversationItemInputAudioTranscriptionFailedEvent {
  type: 'conversation.item.input_audio_transcription.failed';
  item_id: string;
  content_index: number;
  error: {
    type: string;
    code?: string;
    message: string;
    param?: string;
  };
}

export interface ConversationItemTruncatedEvent {
  type: 'conversation.item.truncated';
  item_id: string;
  content_index: number;
  audio_end_ms: number;
}

export interface ConversationItemDeletedEvent {
  type: 'conversation.item.deleted';
  item_id: string;
}

export interface ResponseCreatedEvent {
  type: 'response.created';
  response: Response;
}

export interface ResponseDoneEvent {
  type: 'response.done';
  response: Response;
}

export interface ResponseOutputItemAddedEvent {
  type: 'response.output_item.added';
  response_id: string;
  output_index: number;
  item: ConversationItem;
}

export interface ResponseOutputItemDoneEvent {
  type: 'response.output_item.done';
  response_id: string;
  output_index: number;
  item: ConversationItem;
}

export interface ResponseContentPartAddedEvent {
  type: 'response.content_part.added';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: ContentPart;
}

export interface ResponseContentPartDoneEvent {
  type: 'response.content_part.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  part: ContentPart;
}

export interface ResponseTextDeltaEvent {
  type: 'response.text.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponseTextDoneEvent {
  type: 'response.text.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  text: string;
}

export interface ResponseAudioTranscriptDeltaEvent {
  type: 'response.audio_transcript.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponseAudioTranscriptDoneEvent {
  type: 'response.audio_transcript.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  transcript: string;
}

export interface ResponseAudioDeltaEvent {
  type: 'response.audio.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64 encoded audio
}

export interface ResponseAudioDoneEvent {
  type: 'response.audio.done';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
}

export interface ResponseFunctionCallArgumentsDeltaEvent {
  type: 'response.function_call_arguments.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  delta: string;
}

export interface ResponseFunctionCallArgumentsDoneEvent {
  type: 'response.function_call_arguments.done';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  arguments: string;
}

export interface RateLimitsUpdatedEvent {
  type: 'rate_limits.updated';
  rate_limits: RateLimit[];
}

export type ServerEvent =
  | ErrorEvent
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | InputAudioBufferCommittedEvent
  | InputAudioBufferClearedEvent
  | InputAudioBufferSpeechStartedEvent
  | InputAudioBufferSpeechStoppedEvent
  | ConversationCreatedEvent
  | ConversationItemCreatedEvent
  | ConversationItemInputAudioTranscriptionCompletedEvent
  | ConversationItemInputAudioTranscriptionFailedEvent
  | ConversationItemTruncatedEvent
  | ConversationItemDeletedEvent
  | ResponseCreatedEvent
  | ResponseDoneEvent
  | ResponseOutputItemAddedEvent
  | ResponseOutputItemDoneEvent
  | ResponseContentPartAddedEvent
  | ResponseContentPartDoneEvent
  | ResponseTextDeltaEvent
  | ResponseTextDoneEvent
  | ResponseAudioTranscriptDeltaEvent
  | ResponseAudioTranscriptDoneEvent
  | ResponseAudioDeltaEvent
  | ResponseAudioDoneEvent
  | ResponseFunctionCallArgumentsDeltaEvent
  | ResponseFunctionCallArgumentsDoneEvent
  | RateLimitsUpdatedEvent;

// ============================================
// DATA MODEL TYPES
// ============================================

export interface Session {
  id: string;
  object: 'realtime.session';
  model: string;
  modalities: Modality[];
  voice: Voice;
  input_audio_format: AudioFormat;
  output_audio_format: AudioFormat;
  input_audio_transcription: InputAudioTranscription | null;
  turn_detection: TurnDetection | null;
  tools: Tool[];
  tool_choice: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string } };
  temperature: number;
  max_response_output_tokens: number | 'inf';
}

export interface Conversation {
  id: string;
  object: 'realtime.conversation';
}

export interface ContentPart {
  type: 'text' | 'audio' | 'input_text' | 'input_audio';
  text?: string;
  audio?: string; // base64 encoded
  transcript?: string | null;
}

export interface ConversationItem {
  id?: string;
  object?: 'realtime.item';
  type: 'message' | 'function_call' | 'function_call_output';
  status?: 'completed' | 'in_progress' | 'incomplete';
  role?: 'user' | 'assistant' | 'system';
  content?: ContentPart[];
  call_id?: string;
  name?: string;
  arguments?: string;
  output?: string;
}

export interface Response {
  id: string;
  object: 'realtime.response';
  status: 'in_progress' | 'completed' | 'cancelled' | 'incomplete' | 'failed';
  status_details: {
    type?: 'completed' | 'cancelled' | 'failed' | 'incomplete' | 'content_filter';
    reason?: 'turn_detected' | 'client_cancelled' | 'max_output_tokens' | 'content_filter' | 'error';
    error?: {
      type?: string;
      code?: string;
      message?: string;
      param?: string;
    };
  } | null;
  output: ConversationItem[];
  usage: {
    total_tokens: number;
    input_tokens: number;
    output_tokens: number;
    input_token_details?: {
      cached_tokens: number;
      text_tokens: number;
      audio_tokens: number;
    };
    output_token_details?: {
      text_tokens: number;
      audio_tokens: number;
    };
  } | null;
}

export interface RateLimit {
  name: 'requests' | 'tokens' | 'input_tokens' | 'output_tokens';
  limit: number;
  remaining: number;
  reset_seconds: number;
}

// ============================================
// CLIENT CLASS INTERFACE
// ============================================

export interface RealtimeClientOptions {
  apiKey: string;
  endpoint?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  debug?: boolean;
}

export interface RealtimeClientInterface {
  connect(): Promise<void>;
  disconnect(): void;
  sendEvent(event: ClientEvent): void;
  on(event: 'open' | 'close' | 'error', handler: Function): void;
  on(event: 'message', handler: (event: ServerEvent) => void): void;
  off(event: string, handler: Function): void;
}

// ============================================
// UTILITY TYPES
// ============================================

export type EventHandler<T extends ServerEvent> = (event: T) => void;

export type EventHandlerMap = {
  [K in ServerEvent['type']]?: EventHandler<Extract<ServerEvent, { type: K }>>;
};

export interface AudioChunk {
  data: Buffer;
  timestamp: number;
  duration: number;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  timestamp?: number;
  duration?: number;
}

// ============================================
// ERROR TYPES
// ============================================

export class RealtimeAPIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public type?: string,
    public param?: string,
    public eventId?: string
  ) {
    super(message);
    this.name = 'RealtimeAPIError';
  }
}

export class ConnectionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public attemptNumber?: number
  ) {
    super(message);
    this.name = 'ConnectionError';
  }
}

// ============================================
// CONSTANTS
// ============================================

export const REALTIME_API_CONSTANTS = {
  ENDPOINTS: {
    WEBSOCKET: 'wss://api.openai.com/v1/realtime',
    TRANSCRIPTION: 'wss://api.openai.com/v1/realtime?intent=transcription'
  },
  AUDIO: {
    SAMPLE_RATE: 24000,
    CHANNELS: 1,
    BIT_DEPTH: 16,
    CHUNK_DURATION_MS: 100,
    CHUNK_SIZE_SAMPLES: 2400,
    CHUNK_SIZE_BYTES: 4800
  },
  LIMITS: {
    MAX_AUDIO_BUFFER_SIZE: 15 * 60 * 1000, // 15 minutes in ms
    MAX_RESPONSE_TOKENS: 4096,
    MAX_CONVERSATION_ITEMS: 100
  },
  PRICING: {
    TEXT_INPUT_PER_1M: 5,
    TEXT_OUTPUT_PER_1M: 20,
    AUDIO_INPUT_PER_1M: 100,
    AUDIO_OUTPUT_PER_1M: 200
  }
} as const;