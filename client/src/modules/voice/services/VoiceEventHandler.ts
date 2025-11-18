/* eslint-env browser */
import { EventEmitter } from '../../../services/utils/EventEmitter';

/**
 * Interface for event types from OpenAI Realtime API
 */
export interface RealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
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
  sendEvent(event: any): void;

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
  private messageQueue: any[] = [];
  private seenEventIds = new Set<string>();
  private turnId: number = 0;
  private eventIndex: number = 0;
  private transcriptMap = new Map<string, {
    text: string;
    final: boolean;
    role: 'user' | 'assistant'
  }>();

  // State tracking for event handling
  private turnState: TurnState = 'idle';
  private currentUserItemId: string | null = null;
  private activeResponseId: string | null = null;

  constructor(
    private config: WebRTCVoiceConfig
  ) {
    super();
  }

  /**
   * Set the data channel for event communication
   * Called by WebRTCConnection when data channel is ready
   */
  setDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    this.setupDataChannel();
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
      console.error('[VoiceEventHandler] Failed to parse message:', error);
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
        // Debug: '[VoiceEventHandler] Data channel opened'
      }

      this.dcReady = true;

      // Flush any queued messages
      if (this.messageQueue.length > 0) {
        // Debug: `[VoiceEventHandler] Flushing ${this.messageQueue.length} queued messages`
        for (const msg of this.messageQueue) {
          this.dc!.send(JSON.stringify(msg));
        }
        this.messageQueue = [];
      }
    };

    // NOTE: onmessage removed - now handled by WebRTCConnection
    // This prevents race condition where messages arrive before handler is attached

    this.dc.onerror = (error) => {
      console.error('[VoiceEventHandler] Data channel error:', error);
      this.emit('error', error);
    };

    this.dc.onclose = () => {
      if (this.config.debug) {
        // Debug: '[VoiceEventHandler] Data channel closed'
      }
      this.dcReady = false;
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

    if (this.config.debug) {
      // Debug: `${logPrefix} ${event.type}`, event
    }

    // Route to specific handlers based on event type
    switch (event.type) {
      case 'session.created':
        this.handleSessionCreated(event, logPrefix);
        break;

      case 'session.updated':
        this.handleSessionUpdated(event, logPrefix);
        break;

      case 'input_audio_buffer.speech_started':
        this.handleSpeechStarted(event, logPrefix);
        break;

      case 'input_audio_buffer.speech_stopped':
        this.handleSpeechStopped(event, logPrefix);
        break;

      case 'input_audio_buffer.committed':
        this.handleAudioBufferCommitted(event, logPrefix);
        break;

      case 'input_audio_buffer.cleared':
        this.handleAudioBufferCleared(event, logPrefix);
        break;

      case 'conversation.item.created':
        this.handleConversationItemCreated(event, logPrefix);
        break;

      case 'conversation.item.input_audio_transcription.delta':
        this.handleTranscriptDelta(event, logPrefix);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        this.handleTranscriptCompleted(event, logPrefix);
        break;

      case 'response.created':
        this.handleResponseCreated(event, logPrefix);
        break;

      case 'response.audio_transcript.delta':
        this.handleAssistantTranscriptDelta(event, logPrefix);
        break;

      case 'response.audio_transcript.done':
        this.handleAssistantTranscriptDone(event, logPrefix);
        break;

      case 'response.text.delta':
        this.handleResponseTextDelta(event, logPrefix);
        break;

      case 'response.audio.delta':
        this.handleResponseAudioDelta(event, logPrefix);
        break;

      case 'response.done':
        this.handleResponseDone(event, logPrefix);
        break;

      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'rate_limits.updated':
        // Known benign events - log but don't warn
        // Debug: `${logPrefix} ${event.type}`
        break;

      case 'response.function_call_arguments.start':
        this.handleFunctionCallStart(event, logPrefix);
        break;

      case 'response.function_call_arguments.delta':
        this.handleFunctionCallDelta(event, logPrefix);
        break;

      case 'response.function_call_arguments.done':
        this.handleFunctionCallDone(event, logPrefix);
        break;

      case 'error':
        this.handleError(event, logPrefix);
        break;

      default:
        // Log truly unhandled events
        console.log(`⚠️ [VoiceEventHandler] Unhandled event: ${event.type}`, event);
    }
  }

  /**
   * Handle session.created event
   * Emitted when the Realtime API session is initialized
   */
  private handleSessionCreated(event: any, logPrefix: string): void {
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
  private handleSessionUpdated(event: any, logPrefix: string): void {
    console.log('✅ [VoiceEventHandler] session.updated received from OpenAI - config accepted!', {
      hasTools: event.session?.tools?.length > 0,
      toolsCount: event.session?.tools?.length || 0,
      instructionsLength: event.session?.instructions?.length || 0
    });
  }

  /**
   * Handle speech_started event
   * Emitted when server VAD detects speech
   */
  private handleSpeechStarted(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Speech started detected`
    if (this.turnState === 'recording') {
      this.emit('speech.started');
    }
  }

  /**
   * Handle speech_stopped event
   * Emitted when server VAD detects end of speech
   */
  private handleSpeechStopped(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Speech stopped detected`
    if (this.turnState === 'recording') {
      this.emit('speech.stopped');
    }
  }

  /**
   * Handle audio_buffer.committed event
   * Emitted when audio buffer is committed for processing
   */
  private handleAudioBufferCommitted(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Audio buffer committed`
  }

  /**
   * Handle audio_buffer.cleared event
   * Emitted when audio buffer is cleared
   */
  private handleAudioBufferCleared(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Audio buffer cleared`
  }

  /**
   * Handle conversation.item.created event
   * Track conversation items by role (user or assistant)
   */
  private handleConversationItemCreated(event: any, logPrefix: string): void {
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
  private handleTranscriptDelta(event: any, logPrefix: string): void {
    if (event.item_id && event.delta) {
      let entry = this.transcriptMap.get(event.item_id);

      // DEFENSIVE: Create missing entry if conversation.item.created was lost
      if (!entry) {
        console.warn(`[VoiceEventHandler] DEFENSIVE: Creating missing transcript entry for ${event.item_id}`);
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
  private handleTranscriptCompleted(event: any, logPrefix: string): void {
    if (event.item_id && event.transcript) {
      let entry = this.transcriptMap.get(event.item_id);

      // DEFENSIVE: Create missing entry if conversation.item.created was lost
      if (!entry) {
        console.warn(`[VoiceEventHandler] DEFENSIVE: Creating missing transcript entry for ${event.item_id}`);
        entry = { text: event.transcript, final: true, role: 'user' };
        this.transcriptMap.set(event.item_id, entry);
        this.currentUserItemId = event.item_id;
      }

      if (entry.role === 'user') {
        entry.text = event.transcript; // Use full transcript, not accumulation
        entry.final = true;

        const finalTranscript: TranscriptEvent = {
          text: event.transcript,
          isFinal: true,
          confidence: 0.95,
          timestamp: Date.now(),
        };
        this.emit('transcript', finalTranscript);
        // Debug: `${logPrefix} User transcript completed: "${event.transcript}"`

        // State transition: waiting_user_final → waiting_response
        if (this.turnState === 'waiting_user_final' &&
            event.item_id === this.currentUserItemId) {
          // Debug: `${logPrefix} Turn state: waiting_user_final → waiting_response`
          this.turnState = 'waiting_response';

          // Send exactly one response.create
          this.sendEvent({
            type: 'response.create',
            response: {
              modalities: ['text', 'audio'],
              instructions: 'CRITICAL: Respond in ENGLISH ONLY. DO NOT use Spanish under any circumstances. Respond about their order with appropriate follow-up questions in English. Use smart follow-ups: dressing for salads, bread for sandwiches, sides for entrées. Keep it under 2 sentences.',
            }
          });
          // Debug: `${logPrefix} Manual response.create sent`
        }
      }
    }
  }

  /**
   * Handle response.created event
   * Track the active response and initialize assistant transcript
   */
  private handleResponseCreated(event: any, logPrefix: string): void {
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
    }
  }

  /**
   * Handle assistant transcript delta
   * Accumulate assistant response and emit partial text
   */
  private handleAssistantTranscriptDelta(event: any, logPrefix: string): void {
    if (event.delta && this.turnState === 'waiting_response') {
      // Find the assistant item for this response
      const assistantItems = Array.from(this.transcriptMap.entries())
        .filter(([_, entry]) => entry.role === 'assistant' && !entry.final);

      if (assistantItems.length > 0) {
        const [itemId, entry] = assistantItems[assistantItems.length - 1];
        entry.text += event.delta;
        // Debug: `${logPrefix} Assistant transcript delta (len=${event.delta.length})`

        // Emit partial response
        this.emit('response.text', entry.text);
      }
    }
  }

  /**
   * Handle assistant transcript done
   * Finalize assistant transcript
   */
  private handleAssistantTranscriptDone(event: any, logPrefix: string): void {
    if (event.transcript) {
      const assistantItems = Array.from(this.transcriptMap.entries())
        .filter(([_, entry]) => entry.role === 'assistant' && !entry.final);

      if (assistantItems.length > 0) {
        const [itemId, entry] = assistantItems[assistantItems.length - 1];
        entry.text = event.transcript;
        entry.final = true;
        // Debug: `${logPrefix} Assistant transcript done: "${event.transcript}"`

        this.emit('response.complete', event.transcript);
      }
    }
  }

  /**
   * Handle response text delta (text-only responses)
   */
  private handleResponseTextDelta(event: any, logPrefix: string): void {
    if (this.turnState === 'waiting_response') {
      this.emit('response.text', event.delta);
    }
  }

  /**
   * Handle response audio delta
   * Audio is handled via WebRTC audio track
   */
  private handleResponseAudioDelta(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Audio delta received (${event.delta?.length || 0} bytes)`
  }

  /**
   * Handle response.done event
   * Complete the turn and transition back to idle
   */
  private handleResponseDone(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Response done`
    if (this.turnState === 'waiting_response') {
      // Debug: `${logPrefix} Turn state: waiting_response → idle`
      this.turnState = 'idle';
      this.currentUserItemId = null;
      this.activeResponseId = null;
      // Increment turn ID for next turn
      this.turnId++;
      this.eventIndex = 0;
    }
    this.emit('response.complete', event.response);
  }

  /**
   * Handle function call start event
   */
  private handleFunctionCallStart(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Function call started: ${event.name}`
  }

  /**
   * Handle function call delta event
   */
  private handleFunctionCallDelta(event: any, logPrefix: string): void {
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
  private handleFunctionCallDone(event: any, logPrefix: string): void {
    // Debug: `${logPrefix} Function call complete: ${event.name}`, event.arguments

    try {
      const args = JSON.parse(event.arguments);

      if (event.name === 'add_to_order') {
        // Validate and filter items with names
        const validItems = (args.items || []).filter((item: any) => {
          if (!item?.name) {
            console.warn(`${logPrefix} Skipping item without name:`, item);
            return false;
          }
          return true;
        });

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
        // Emit order confirmation event
        // Debug: `${logPrefix} Emitting order.confirmation: ${args.action}`
        this.emit('order.confirmation', {
          action: args.action,
          timestamp: Date.now()
        });
      } else if (event.name === 'remove_from_order') {
        // Emit item removal event
        // Debug: `${logPrefix} Emitting order.item.removed: ${args.itemName}`
        this.emit('order.item.removed', {
          itemName: args.itemName,
          quantity: args.quantity,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(`${logPrefix} Failed to parse function call arguments:`, error);
      console.error('Raw arguments:', event.arguments);
    }
  }

  /**
   * Handle error events from the API
   */
  private handleError(event: any, logPrefix: string): void {
    console.error('[VoiceEventHandler] API error:', JSON.stringify(event.error, null, 2));
    console.error('[VoiceEventHandler] Full error event:', JSON.stringify(event, null, 2));

    const errorMessage = event.error?.message || event.error?.error?.message || 'OpenAI API error';

    // CRITICAL: Detect session configuration errors
    if (errorMessage.toLowerCase().includes('session') ||
        errorMessage.toLowerCase().includes('configuration') ||
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('too large') ||
        errorMessage.toLowerCase().includes('exceeded')) {
      console.error('[VoiceEventHandler] CRITICAL: Session configuration error detected');
      console.error('[VoiceEventHandler] This may be due to oversized instructions, invalid parameters, or API limits');
      console.error('[VoiceEventHandler] Error code:', event.error?.code);
      console.error('[VoiceEventHandler] Error type:', event.error?.type);
    }

    const error = new Error(errorMessage);
    this.emit('error', error);

    // Handle specific error types
    if (event.error?.code === 'rate_limit_exceeded') {
      console.warn('[VoiceEventHandler] Rate limit exceeded');
      this.emit('rate_limit_error');
    } else if (event.error?.code === 'session_expired') {
      console.warn('[VoiceEventHandler] Session expired');
      this.emit('session_expired');
    }
  }

  /**
   * Send event to OpenAI via data channel
   * Queues messages if data channel is not ready
   */
  sendEvent(event: any): void {
    if (this.dcReady && this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event));

      const logPrefix = `[RT] t=${this.turnId}#${String(++this.eventIndex).padStart(2, '0')}`;
      if (this.config.debug) {
        // Debug: `${logPrefix} Sent: ${event.type}`
      } else {
        // Debug: `${logPrefix} → ${event.type}`
      }
    } else {
      // Queue the message for later
      this.messageQueue.push(event);
      // Debug: `[VoiceEventHandler] Queued event (${event.type}) - DC not ready. Queue size: ${this.messageQueue.length}`
    }
  }

  /**
   * Flush all queued messages
   * Called when data channel becomes ready
   */
  flushMessageQueue(): void {
    if (this.dcReady && this.dc && this.dc.readyState === 'open') {
      if (this.messageQueue.length > 0) {
        // Debug: `[VoiceEventHandler] Flushing ${this.messageQueue.length} messages`
        for (const msg of this.messageQueue) {
          this.dc.send(JSON.stringify(msg));
        }
        this.messageQueue = [];
      }
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
   */
  setTurnState(state: TurnState): void {
    this.turnState = state;
  }

  /**
   * Get current turn state
   * @internal
   */
  getTurnState(): TurnState {
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
    this.turnState = 'idle';
    this.currentUserItemId = null;
    this.activeResponseId = null;
  }
}
