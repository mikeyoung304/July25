/* eslint-env browser */
import { EventEmitter } from '../../../services/utils/EventEmitter';
import { LRUCache } from 'lru-cache';
import { logger } from '../../../services/logger';

/**
 * Maximum allowed transcript length (characters)
 * Prevents DoS attacks via extremely long transcripts
 */
const MAX_TRANSCRIPT_LENGTH = 10000;

/**
 * Validate and sanitize transcript text
 * Returns sanitized string or null if invalid
 *
 * @param text - Raw transcript text from OpenAI Realtime API
 * @returns Sanitized transcript or null if invalid
 */
function validateTranscript(text: string | undefined | null): string | null {
  // Null/undefined check
  if (text == null) {
    return null;
  }

  // Type check
  if (typeof text !== 'string') {
    logger.warn('[VoiceEventHandler] Invalid transcript type', { type: typeof text });
    return null;
  }

  // Empty string check
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Length validation (DoS protection)
  if (trimmed.length > MAX_TRANSCRIPT_LENGTH) {
    logger.warn('[VoiceEventHandler] Transcript too long, truncating', {
      originalLength: trimmed.length,
      maxLength: MAX_TRANSCRIPT_LENGTH
    });
    return trimmed.slice(0, MAX_TRANSCRIPT_LENGTH);
  }

  // Sanitize for display (XSS protection)
  // Remove HTML tags and script injection attempts
  const sanitized = trimmed
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers

  return sanitized;
}

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

/**
 * VoiceEventHandler Service
 *
 * Handles all event processing and routing for the OpenAI Realtime API.
 * Manages the data channel, message queuing, event deduplication, and
 * transcript accumulation.
 *
 * Responsibilities:
 * - Process incoming Realtime API events (20+ event types)
 * - Route events to appropriate handlers
 * - Manage transcript accumulation (user and assistant)
 * - Detect orders via function calls
 * - Handle turn state transitions
 * - Queue messages when data channel not ready
 * - Deduplicate events
 *
 * Events Emitted:
 * - session.created: Session initialized
 * - transcript: TranscriptEvent (user speech)
 * - speech.started: User started speaking
 * - speech.stopped: User stopped speaking
 * - response.text: AI response text (partial)
 * - response.complete: AI response finished
 * - order.detected: Order items detected
 * - order.confirmation: Order confirmation action
 * - order.item.removed: Item removed from order
 * - order.items.added: Items added to order
 * - error: Error occurred
 */
export class VoiceEventHandler extends EventEmitter implements IVoiceEventHandler {
  private dc: RTCDataChannel | null = null;
  private dcReady: boolean = false;
  private messageQueue: OutboundEvent[] = [];
  private flushPending: boolean = false;
  private seenEventIds = new Set<string>();
  private turnId: number = 0;
  private eventIndex: number = 0;
  private transcriptMap = new LRUCache<string, {
    text: string;
    final: boolean;
    role: 'user' | 'assistant'
  }>({
    max: 50, // Keep last 50 conversation items
    // No dispose callback - cache eviction is just memory management
    // Transcript cleanup happens naturally via conversation flow
  });

  // State tracking for event handling
  private currentUserItemId: string | null = null;
  private activeResponseId: string | null = null;

  // DEPRECATED: Kept only for backward compatibility with tests
  // DO NOT use internally - VoiceStateMachine is the single source of truth
  private turnState: TurnState = 'idle';

  constructor(
    private config: WebRTCVoiceConfig
  ) {
    super();
  }

  /**
   * Set the data channel for event communication
   * Called by WebRTCConnection when data channel is ready
   *
   * CRITICAL FIX 2025-11-24: The data channel may already be open when we receive it
   * (WebRTCConnection's onopen fires first, then emits dataChannelReady).
   * We must check readyState and flush queued messages immediately if already open.
   */
  setDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    this.setupDataChannel();

    // CRITICAL FIX: If channel is already open, flush immediately
    // This handles the race condition where WebRTCConnection's onopen fires
    // before VoiceEventHandler receives the data channel
    if (dc.readyState === 'open') {
      logger.info('[VoiceEventHandler] Data channel already open, flushing queued messages');
      this.dcReady = true;
      this.flushMessageQueue();
    }
  }

  /**
   * Handle raw message from data channel
   * Called by WebRTCConnection's onmessage handler (prevents race condition)
   */
  handleRawMessage(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.handleRealtimeEvent(parsed);
    } catch (error) {
      logger.error('[VoiceEventHandler] Failed to parse message', { error });
    }
  }

  /**
   * Set up data channel event handlers
   * NOTE: onmessage is now handled by WebRTCConnection to prevent race condition
   */
  private setupDataChannel(): void {
    if (!this.dc) return;

    this.dc.onopen = () => {
      if (this.config.debug) {
        logger.debug('[VoiceEventHandler] Data channel opened');
      }

      this.dcReady = true;
      this.flushMessageQueue();
    };

    // NOTE: onmessage removed - now handled by WebRTCConnection
    // This prevents race condition where messages arrive before handler is attached

    this.dc.onerror = (error) => {
      logger.error('[VoiceEventHandler] Data channel error', { error });
      this.emit('error', error);
    };

    this.dc.onclose = () => {
      if (this.config.debug) {
        logger.debug('[VoiceEventHandler] Data channel closed');
      }
      this.dcReady = false;
      this.flushPending = false;
    };
  }

  /**
   * Handle events from OpenAI Realtime API
   *
   * This is the core event processing method that routes 20+ event types
   * to their appropriate handlers. It manages:
   * - Event deduplication
   * - Transcript accumulation
   * - Order detection via function calls
   * - Turn state transitions
   * - Response streaming
   */
  handleRealtimeEvent(event: RealtimeEvent): void {
    // Deduplication check
    if (event.event_id && this.seenEventIds.has(event.event_id)) {
      if (this.config.debug) {
        // Debug: `[VoiceEventHandler] Duplicate event ignored: ${event.event_id}`
      }
      return;
    }
    if (event.event_id) {
      this.seenEventIds.add(event.event_id);
      // Keep set size bounded
      if (this.seenEventIds.size > 1000) {
        const firstId = this.seenEventIds.values().next().value;
        this.seenEventIds.delete(firstId);
      }
    }

    // Instrumentation
    this.eventIndex++;
    const logPrefix = `[RT] t=${this.turnId}#${String(this.eventIndex).padStart(2, '0')}`;

    // Log events for debugging (gated by debug mode in production)
    if (this.config.debug) {
      logger.info('[VoiceEventHandler] Received event', { type: event.type });
    }

    if (this.config.debug) {
      // Debug: `${logPrefix} ${event.type}`, event
    }

    // Route to specific handlers based on event type
    switch (event.type) {
      case 'session.created':
        this.handleSessionCreated(event as SessionCreatedEvent, logPrefix);
        break;

      case 'session.updated':
        this.handleSessionUpdated(event as SessionUpdatedEvent, logPrefix);
        break;

      case 'input_audio_buffer.speech_started':
        this.handleSpeechStarted(event as SpeechStartedEvent, logPrefix);
        break;

      case 'input_audio_buffer.speech_stopped':
        this.handleSpeechStopped(event as SpeechStoppedEvent, logPrefix);
        break;

      case 'input_audio_buffer.committed':
        this.handleAudioBufferCommitted(event as AudioBufferCommittedEvent, logPrefix);
        break;

      case 'input_audio_buffer.cleared':
        this.handleAudioBufferCleared(event as AudioBufferClearedEvent, logPrefix);
        break;

      case 'conversation.item.created':
        this.handleConversationItemCreated(event as ConversationItemCreatedEvent, logPrefix);
        break;

      case 'conversation.item.input_audio_transcription.delta': {
        const deltaEvent = event as TranscriptDeltaEvent;
        logger.debug(`📝 [VoiceEventHandler] Got transcript delta:`, deltaEvent.delta);
        this.handleTranscriptDelta(deltaEvent, logPrefix);
        break;
      }

      case 'conversation.item.input_audio_transcription.completed': {
        const completedEvent = event as TranscriptCompletedEvent;
        logger.debug(`✅ [VoiceEventHandler] Got transcript completed:`, completedEvent.transcript);
        this.handleTranscriptCompleted(completedEvent, logPrefix);
        break;
      }

      case 'response.created':
        this.handleResponseCreated(event as ResponseCreatedEvent, logPrefix);
        break;

      case 'response.audio_transcript.delta':
        this.handleAssistantTranscriptDelta(event as AssistantTranscriptDeltaEvent, logPrefix);
        break;

      case 'response.audio_transcript.done':
        this.handleAssistantTranscriptDone(event as AssistantTranscriptDoneEvent, logPrefix);
        break;

      case 'response.text.delta':
        this.handleResponseTextDelta(event as ResponseTextDeltaEvent, logPrefix);
        break;

      case 'response.text.done': {
        const textDoneEvent = event as ResponseTextDoneEvent;
        logger.debug(`📄 [VoiceEventHandler] Got response.text.done:`, textDoneEvent.text);
        // Text response completed - emit for display
        if (textDoneEvent.text) {
          this.emit('response.text', textDoneEvent.text);
        }
        break;
      }

      case 'response.audio.delta':
        this.handleResponseAudioDelta(event as ResponseAudioDeltaEvent, logPrefix);
        break;

      case 'response.audio.done':
        // Audio playback completed - this is handled via WebRTC audio track
        // Debug: `${logPrefix} Audio playback done`
        break;

      case 'response.done':
        this.handleResponseDone(event as ResponseDoneEvent, logPrefix);
        break;

      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'rate_limits.updated':
      case 'output_audio_buffer.started':
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.speech_started':
      case 'output_audio_buffer.speech_stopped':
      case 'output_audio_buffer.committed':
      case 'output_audio_buffer.cleared':
        // Known benign events - log but don't warn
        // Debug: `${logPrefix} ${event.type}`
        break;

      case 'response.function_call_arguments.start':
        this.handleFunctionCallStart(event as FunctionCallStartEvent, logPrefix);
        break;

      case 'response.function_call_arguments.delta':
        this.handleFunctionCallDelta(event as FunctionCallDeltaEvent, logPrefix);
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCallDone(event as FunctionCallDoneEvent, logPrefix);
        break;

      case 'error':
        this.handleError(event as ErrorEvent, logPrefix);
        break;

      default:
        // Log truly unhandled events
        logger.warn(`⚠️ [VoiceEventHandler] Unhandled event: ${event.type}`, event);
    }
  }

  /**
   * Handle session.created event
   * Emitted when the Realtime API session is initialized
   */
  private handleSessionCreated(event: SessionCreatedEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Session created successfully`
    if (this.config.debug) {
      // Debug: 'Session details:', JSON.stringify(event.session, null, 2)
    }
    this.emit('session.created', event.session);
  }

  /**
   * Handle session.updated event
   * Emitted when session configuration is updated
   */
  private handleSessionUpdated(event: SessionUpdatedEvent, logPrefix: string): void {
    logger.info('[VoiceEventHandler] session.updated received from OpenAI', {
      hasTools: event.session?.tools?.length ?? 0 > 0,
      toolsCount: event.session?.tools?.length ?? 0,
      instructionsLength: event.session?.instructions?.length ?? 0
    });

    // CRITICAL: Emit the event so WebRTCVoiceClient can set isSessionConfigured flag
    this.emit('session.updated');
  }

  /**
   * Handle speech_started event
   * Emitted when server VAD detects speech
   */
  private handleSpeechStarted(event: SpeechStartedEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Speech started detected`
    // DEPRECATED: turnState check kept for test compatibility
    if (this.turnState === 'recording') {
      this.emit('speech.started');
    }
  }

  /**
   * Handle speech_stopped event
   * Emitted when server VAD detects end of speech
   */
  private handleSpeechStopped(event: SpeechStoppedEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Speech stopped detected`
    // DEPRECATED: turnState check kept for test compatibility
    if (this.turnState === 'recording') {
      this.emit('speech.stopped');
    }
  }

  /**
   * Handle audio_buffer.committed event
   * Emitted when audio buffer is committed for processing
   */
  private handleAudioBufferCommitted(event: AudioBufferCommittedEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Audio buffer committed`
  }

  /**
   * Handle audio_buffer.cleared event
   * Emitted when audio buffer is cleared
   */
  private handleAudioBufferCleared(event: AudioBufferClearedEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Audio buffer cleared`
  }

  /**
   * Handle conversation.item.created event
   * Track conversation items by role (user or assistant)
   */
  private handleConversationItemCreated(event: ConversationItemCreatedEvent, logPrefix: string): void {
    if (event.item?.role === 'user' && event.item?.id) {
      this.currentUserItemId = event.item.id;
      // Debug: `${logPrefix} User item created: ${this.currentUserItemId}`
      // Initialize transcript entry
      this.transcriptMap.set(event.item.id, { text: '', final: false, role: 'user' });
    } else if (event.item?.role === 'assistant' && event.item?.id) {
      // Debug: `${logPrefix} Assistant item created: ${event.item.id}`
      this.transcriptMap.set(event.item.id, { text: '', final: false, role: 'assistant' });
    }
  }

  /**
   * Handle transcript delta event
   * Accumulate user transcript deltas and emit partial transcripts
   */
  private handleTranscriptDelta(event: TranscriptDeltaEvent, logPrefix: string): void {
    if (event.item_id && event.delta) {
      let entry = this.transcriptMap.get(event.item_id);

      // DEFENSIVE: Create missing entry if conversation.item.created was lost
      if (!entry) {
        logger.warn('[VoiceEventHandler] DEFENSIVE: Creating missing transcript entry', { itemId: event.item_id });
        entry = { text: '', final: false, role: 'user' };
        this.transcriptMap.set(event.item_id, entry);
        this.currentUserItemId = event.item_id;
      }

      if (entry.role === 'user') {
        entry.text += event.delta;
        // Debug: `${logPrefix} User transcript delta (len=${event.delta.length})`

        // Emit partial transcript
        const partialTranscript: TranscriptEvent = {
          text: entry.text,
          isFinal: false,
          confidence: 0.9,
          timestamp: Date.now(),
        };
        this.emit('transcript', partialTranscript);
      }
    }
  }

  /**
   * Handle transcript completed event
   * Finalize user transcript and trigger response if needed
   */
  private handleTranscriptCompleted(event: TranscriptCompletedEvent, logPrefix: string): void {
    if (!event.item_id) {
      return;
    }

    // TODO-025: Validate complete transcript before processing
    const validatedTranscript = validateTranscript(event.transcript);
    if (!validatedTranscript) {
      logger.warn('[VoiceEventHandler] Invalid complete transcript, skipping', {
        itemId: event.item_id,
        transcriptLength: event.transcript?.length
      });
      return;
    }

    let entry = this.transcriptMap.get(event.item_id);

    // DEFENSIVE: Create missing entry if conversation.item.created was lost
    if (!entry) {
      logger.warn('[VoiceEventHandler] DEFENSIVE: Creating missing transcript entry', { itemId: event.item_id });
      entry = { text: validatedTranscript, final: true, role: 'user' };
      this.transcriptMap.set(event.item_id, entry);
      this.currentUserItemId = event.item_id;
    }

    if (entry.role === 'user') {
      entry.text = validatedTranscript; // Use full transcript, not accumulation
      entry.final = true;

      const finalTranscript: TranscriptEvent = {
        text: validatedTranscript,
        isFinal: true,
        confidence: 0.95,
        timestamp: Date.now(),
      };
      this.emit('transcript', finalTranscript);
      // Debug: `${logPrefix} User transcript completed: "${validatedTranscript}"`

      // Always send response.create after final transcript
      if (event.item_id === this.currentUserItemId) {
        // Send exactly one response.create
        this.sendEvent({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
            instructions: 'RESPOND IN ENGLISH. Respond about their order with appropriate follow-up questions. Use smart follow-ups: dressing for salads, bread for sandwiches, sides for entrées. Keep it under 2 sentences.',
          }
        });
        // Debug: `${logPrefix} Manual response.create sent`
      }
    }
  }

  /**
   * Handle response.created event
   * Track the active response and initialize assistant transcript
   */
  private handleResponseCreated(event: ResponseCreatedEvent, logPrefix: string): void {
    if (event.response?.id) {
      this.activeResponseId = event.response.id;
      // Debug: `${logPrefix} Response created: ${this.activeResponseId}`
      // Initialize assistant transcript entry
      if (event.response.output && event.response.output.length > 0) {
        const itemId = event.response.output[0].id;
        if (itemId) {
          this.transcriptMap.set(itemId, { text: '', final: false, role: 'assistant' });
        }
      }

      // Emit event for state machine transition
      this.emit('response.started', {
        responseId: event.response.id,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle assistant transcript delta
   * Accumulate assistant response and emit partial text
   */
  private handleAssistantTranscriptDelta(event: AssistantTranscriptDeltaEvent, logPrefix: string): void {
    // TODO-025: Validate assistant transcript delta
    const validatedDelta = validateTranscript(event.delta);
    if (!validatedDelta) {
      logger.warn('[VoiceEventHandler] Invalid assistant transcript delta, skipping', {
        deltaLength: event.delta?.length
      });
      return;
    }

    // Find the assistant item for this response
    const assistantItems = Array.from(this.transcriptMap.entries())
      .filter(([_, entry]) => entry.role === 'assistant' && !entry.final);

    if (assistantItems.length > 0) {
      const [itemId, entry] = assistantItems[assistantItems.length - 1];
      entry.text += validatedDelta;
      // Debug: `${logPrefix} Assistant transcript delta (len=${validatedDelta.length})`

      // Emit partial response
      this.emit('response.text', entry.text);
    }
  }

  /**
   * Handle assistant transcript done
   * Finalize assistant transcript
   */
  private handleAssistantTranscriptDone(event: AssistantTranscriptDoneEvent, logPrefix: string): void {
    // TODO-025: Validate complete assistant transcript
    const validatedTranscript = validateTranscript(event.transcript);
    if (!validatedTranscript) {
      logger.warn('[VoiceEventHandler] Invalid assistant transcript, skipping', {
        transcriptLength: event.transcript?.length
      });
      return;
    }

    const assistantItems = Array.from(this.transcriptMap.entries())
      .filter(([_, entry]) => entry.role === 'assistant' && !entry.final);

    if (assistantItems.length > 0) {
      const [itemId, entry] = assistantItems[assistantItems.length - 1];
      entry.text = validatedTranscript;
      entry.final = true;
      // Debug: `${logPrefix} Assistant transcript done: "${validatedTranscript}"`

      this.emit('response.complete', validatedTranscript);
    }
  }

  /**
   * Handle response text delta (text-only responses)
   */
  private handleResponseTextDelta(event: ResponseTextDeltaEvent, logPrefix: string): void {
    this.emit('response.text', event.delta);
  }

  /**
   * Handle response audio delta
   * Audio is handled via WebRTC audio track
   */
  private handleResponseAudioDelta(event: ResponseAudioDeltaEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Audio delta received (${event.delta?.length || 0} bytes)`
  }

  /**
   * Handle response.done event
   * Complete the turn and transition back to idle
   */
  private handleResponseDone(event: ResponseDoneEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Response done`
    this.turnState = 'idle'; // DEPRECATED: Only for test compatibility
    this.currentUserItemId = null;
    this.activeResponseId = null;
    // Increment turn ID for next turn
    this.turnId++;
    this.eventIndex = 0;
    this.emit('response.complete', event.response);
  }

  /**
   * Handle function call start event
   */
  private handleFunctionCallStart(event: FunctionCallStartEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Function call started: ${event.name}`
  }

  /**
   * Handle function call delta event
   */
  private handleFunctionCallDelta(event: FunctionCallDeltaEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Function call delta for: ${event.name}`
  }

  /**
   * Handle function call done event
   * Parse function call arguments and emit structured events
   *
   * Supported functions:
   * - add_to_order: Add items to order
   * - confirm_order: Confirm and proceed to checkout
   * - remove_from_order: Remove items from order
   */
  private handleFunctionCallDone(event: FunctionCallDoneEvent, logPrefix: string): void {
    // Debug: `${logPrefix} Function call complete: ${event.name}`, event.arguments

    try {
      const args = JSON.parse(event.arguments) as AddToOrderArgs | ConfirmOrderArgs | RemoveFromOrderArgs;

      if (event.name === 'add_to_order') {
        const addArgs = args as AddToOrderArgs;
        // Validate and filter items with names, normalize quantity
        const validItems = (addArgs.items || [])
          .filter((item: OrderItem) => {
            if (!item?.name) {
              logger.warn('[VoiceEventHandler] Skipping item without name', { item, logPrefix });
              return false;
            }
            return true;
          })
          .map((item: OrderItem) => ({
            name: item.name,
            quantity: item.quantity ?? 1, // Default to 1 if not specified
            modifiers: item.modifiers
          }));

        // Emit structured order event with items
        const orderEvent: OrderEvent = {
          items: validItems,
          confidence: 0.95,
          timestamp: Date.now(),
        };

        // Debug: `${logPrefix} Emitting order.detected with ${orderEvent.items.length} items`
        this.emit('order.detected', orderEvent);

        // Also emit for legacy compatibility
        if (orderEvent.items.length > 0) {
          this.emit('order.items.added', {
            items: orderEvent.items,
            timestamp: Date.now()
          });
        }
      } else if (event.name === 'confirm_order') {
        const confirmArgs = args as ConfirmOrderArgs;
        // Emit order confirmation event
        // Debug: `${logPrefix} Emitting order.confirmation: ${confirmArgs.action}`
        this.emit('order.confirmation', {
          action: confirmArgs.action,
          timestamp: Date.now()
        });
      } else if (event.name === 'remove_from_order') {
        const removeArgs = args as RemoveFromOrderArgs;
        // Emit item removal event
        // Debug: `${logPrefix} Emitting order.item.removed: ${removeArgs.itemName}`
        this.emit('order.item.removed', {
          itemName: removeArgs.itemName,
          quantity: removeArgs.quantity,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      logger.error('[VoiceEventHandler] Failed to parse function call arguments', {
        error,
        logPrefix,
        // Don't log raw arguments - may contain PII
      });
    }
  }

  /**
   * Handle error events from the API
   */
  private handleError(event: ErrorEvent, logPrefix: string): void {
    // Log error details safely (no raw event objects to avoid PII exposure)
    logger.error('[VoiceEventHandler] API error', {
      code: event.error?.code,
      type: event.error?.type,
      message: event.error?.message,
    });

    const errorMessage = event.error?.message || 'OpenAI API error';

    // CRITICAL: Detect session configuration errors
    if (errorMessage.toLowerCase().includes('session') ||
        errorMessage.toLowerCase().includes('configuration') ||
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('too large') ||
        errorMessage.toLowerCase().includes('exceeded')) {
      logger.error('[VoiceEventHandler] CRITICAL: Session configuration error detected', {
        code: event.error?.code,
        type: event.error?.type,
        hint: 'May be due to oversized instructions, invalid parameters, or API limits'
      });
    }

    const error = new Error(errorMessage);
    this.emit('error', error);

    // Handle specific error types
    if (event.error?.code === 'rate_limit_exceeded') {
      logger.warn('[VoiceEventHandler] Rate limit exceeded');
      this.emit('rate_limit_error');
    } else if (event.error?.code === 'session_expired') {
      logger.warn('[VoiceEventHandler] Session expired');
      this.emit('session_expired');
    }
  }

  /**
   * Send event to OpenAI via data channel
   * Queues messages if data channel is not ready
   */
  sendEvent(event: OutboundEvent): void {
    if (this.dcReady && this.dc && this.dc.readyState === 'open') {
      try {
        const payload = JSON.stringify(event);

        // Warn if payload is too large (OpenAI likely rejects >50KB)
        if (payload.length > 50000) {
          logger.error('[VoiceEventHandler] Event payload too large - OpenAI may reject', { payloadLength: payload.length });
        }

        this.dc.send(payload);

        const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
        if (this.config.debug) {
          // Debug: `${logPrefix} Sent: ${event.type}`
        } else {
          // Debug: `${logPrefix} → ${event.type}`
        }
      } catch (error) {
        logger.error('[VoiceEventHandler] Failed to send event', { error, eventType: event.type });
        this.emit('error', new Error(`Failed to send ${event.type}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    } else {
      // Queue the message for later
      this.messageQueue.push(event);
      // Log queued events to help diagnose data channel issues
      logger.warn('[VoiceEventHandler] Queued event - data channel not ready', {
        eventType: event.type,
        queueSize: this.messageQueue.length,
        dcReady: this.dcReady,
        hasDataChannel: !!this.dc,
        readyState: this.dc?.readyState
      });
    }
  }

  /**
   * Flush all queued messages
   * Called when data channel becomes ready
   *
   * CRITICAL: Uses flushPending flag to prevent duplicate flushes from
   * both setDataChannel() and setupDataChannel.onopen()
   */
  flushMessageQueue(): void {
    // Prevent duplicate flushes
    if (this.flushPending || this.messageQueue.length === 0) return;
    if (!this.dc || this.dc.readyState !== 'open') return;

    this.flushPending = true;

    try {
      // Use splice to get all messages AND clear the queue in one operation (memory optimization)
      const messages = this.messageQueue.splice(0);

      if (this.config.debug) {
        logger.debug('[VoiceEventHandler] Flushing queued messages', { count: messages.length });
      }

      for (let i = 0; i < messages.length; i++) {
        // Check state before each send (TOCTOU protection)
        if (!this.dc || this.dc.readyState !== 'open') {
          // Channel closed during flush, re-queue remaining messages
          const remaining = messages.slice(i);
          this.messageQueue = [...remaining, ...this.messageQueue];
          logger.warn('[VoiceEventHandler] Channel closed during flush, re-queued messages', {
            requeued: remaining.length,
          });
          break;
        }
        this.dc.send(JSON.stringify(messages[i]));
      }
    } catch (error) {
      logger.error('[VoiceEventHandler] Flush failed', { error });
      this.emit('dataChannel.flushFailed', error);
    } finally {
      this.flushPending = false;
    }
  }

  /**
   * Clear all queued messages
   * Called on disconnect
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  /**
   * Check if data channel is ready
   */
  isDataChannelReady(): boolean {
    return this.dcReady;
  }

  /**
   * Get current turn ID
   */
  getCurrentTurnId(): number {
    return this.turnId;
  }

  /**
   * Get current event index
   */
  getCurrentEventIndex(): number {
    return this.eventIndex;
  }

  /**
   * Update turn state (called by orchestrator)
   * @internal
   * @deprecated No longer used - VoiceStateMachine is the single source of truth
   */
  setTurnState(state: TurnState): void {
    // DEPRECATED: Only maintained for backward compatibility with tests
    // DO NOT rely on this internally - VoiceStateMachine is the single source of truth
    this.turnState = state;
  }

  /**
   * Get current turn state
   * @internal
   * @deprecated No longer used - VoiceStateMachine is the single source of truth
   */
  getTurnState(): TurnState {
    // DEPRECATED: Only maintained for backward compatibility with tests
    // DO NOT rely on this internally - VoiceStateMachine is the single source of truth
    return this.turnState;
  }

  /**
   * Reset state for new session
   * Called by orchestrator on disconnect
   */
  reset(): void {
    this.dcReady = false;
    this.messageQueue = [];
    this.seenEventIds.clear();
    this.turnId = 0;
    this.eventIndex = 0;
    this.transcriptMap.clear();
    this.turnState = 'idle'; // DEPRECATED: Only for test compatibility
    this.currentUserItemId = null;
    this.activeResponseId = null;
  }
}
