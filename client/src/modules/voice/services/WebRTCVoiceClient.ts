/* eslint-env browser */
import { EventEmitter } from '../../../services/utils/EventEmitter';
import { getAuthToken, getOptionalAuthToken } from '../../../services/auth';
import { VoiceSessionConfig } from './VoiceSessionConfig';
import { WebRTCConnection } from './WebRTCConnection';
import { VoiceEventHandler } from './VoiceEventHandler';
import { VoiceStateMachine, VoiceState, VoiceEvent } from './VoiceStateMachine';
import { logger } from '../../../services/logger';

export type VoiceContext = 'kiosk' | 'server';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  context?: VoiceContext;
  debug?: boolean;
  enableVAD?: boolean; // Optional: enable server VAD mode
  muteAudioOutput?: boolean; // Optional: mute AI voice responses (transcription only)
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  timestamp: number;
}

export interface OrderEvent {
  items: Array<{
    name: string;
    quantity: number;
    modifiers?: string[];
  }>;
  confidence: number;
  timestamp: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// DEPRECATED: Legacy TurnState type - replaced by VoiceStateMachine
// Kept for backward compatibility with external consumers
export type TurnState =
  | 'idle'
  | 'recording'
  | 'committing'
  | 'waiting_user_final'
  | 'waiting_response';

/**
 * WebRTC client for OpenAI Realtime API
 * Provides low-latency voice transcription and responses
 *
 * PHASE 2 REFACTOR: Now uses VoiceStateMachine for deterministic state management
 *
 * This is an orchestrator that delegates to specialized services:
 * - VoiceSessionConfig: Session configuration and token management
 * - WebRTCConnection: WebRTC peer connection lifecycle
 * - VoiceEventHandler: Realtime API event processing
 * - VoiceStateMachine: Event-driven state management (NEW in Phase 2)
 */
export class WebRTCVoiceClient extends EventEmitter {
  private config: WebRTCVoiceConfig;

  // Delegated services
  private sessionConfig: VoiceSessionConfig;
  private connection: WebRTCConnection;
  private eventHandler: VoiceEventHandler;
  private stateMachine: VoiceStateMachine; // PHASE 2: State machine replaces ad-hoc flags

  // Connection state tracking (kept for backward compatibility)
  private connectionState: ConnectionState = 'disconnected';

  constructor(config: WebRTCVoiceConfig) {
    super();
    this.config = config;

    if (this.config.debug) {
      logger.info('[WebRTCVoiceClient] Initializing orchestrator with services (Phase 2: State Machine)');
    }

    // Create services
    this.sessionConfig = new VoiceSessionConfig(config, { getAuthToken, getOptionalAuthToken });
    this.connection = new WebRTCConnection(config);
    this.eventHandler = new VoiceEventHandler(config);

    // PHASE 2: Initialize state machine
    this.stateMachine = new VoiceStateMachine({
      onStateChange: (fromState, toState, event) => {
        if (this.config.debug) {
          logger.info(`[WebRTCVoiceClient] State transition: ${fromState} --[${event}]--> ${toState}`);
        }
        // Emit legacy connection.change events for backward compatibility
        this.emitLegacyConnectionState(toState);
      },
      onTimeout: (state) => {
        logger.warn(`[WebRTCVoiceClient] State machine timeout in state: ${state}`);
        this.emit('state.timeout', { state });
      },
      maxHistorySize: 50
    });

    // Wire connection events
    this.connection.on('connection.change', (state: ConnectionState) => {
      this.connectionState = state;
      this.emit('connection.change', state);
    });

    this.connection.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // Wire session config events
    this.sessionConfig.on('token.refresh.failed', (data: { error: any }) => {
      this.emit('token.refresh.failed', data);
    });

    // Wire data channel ready event
    this.connection.on('dataChannelReady', (dc: RTCDataChannel) => {
      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Data channel ready, attaching to event handler');
      }
      this.eventHandler.setDataChannel(dc);
    });

    // Wire data channel messages - forward to event handler
    // CRITICAL FIX: Messages are now handled by WebRTCConnection's onmessage
    // before emitting dataChannelReady, preventing race condition
    this.connection.on('dataChannelMessage', (data: string) => {
      this.eventHandler.handleRawMessage(data);
    });

    // Wire event handler events - proxy all to external listeners
    const eventsToProxy = [
      'session.created',
      'transcript',
      'speech.started',
      'speech.stopped',
      'response.text',
      'response.complete',
      'order.detected',
      'order.confirmation',
      'order.item.removed',
      'order.items.added',
      'error',
      'rate_limit_error',
      'session_expired'
    ];

    eventsToProxy.forEach(eventName => {
      this.eventHandler.on(eventName, (...args: any[]) => {
        this.emit(eventName, ...args);
      });
    });

    // PHASE 2: Handle session.created event - transition to SESSION_CREATED state
    this.eventHandler.on('session.created', () => {
      logger.info('🎯 [WebRTCVoiceClient] Session created event received');

      // Transition state machine
      try {
        this.stateMachine.transition(VoiceEvent.SESSION_CREATED);
      } catch (error) {
        logger.error('[WebRTCVoiceClient] Invalid state transition on session.created:', error);
        return;
      }

      const sessionConfigObj = this.sessionConfig.buildSessionConfig();

      // CRITICAL: Always log session config size to diagnose oversized messages
      const sessionConfigJson = JSON.stringify(sessionConfigObj);
      const configSizeKB = (sessionConfigJson.length / 1024).toFixed(2);

      // Log session configuration for debugging
      logger.info('📤 [WebRTCVoiceClient] Sending session.update:', {
        sizeKB: configSizeKB,
        instructionsLength: sessionConfigObj.instructions?.length || 0,
        toolsCount: sessionConfigObj.tools?.length || 0,
        toolNames: sessionConfigObj.tools?.map((t: any) => t.name) || [],
        hasMenuContext: this.sessionConfig.getMenuContext().length > 0,
        menuContextLength: this.sessionConfig.getMenuContext().length,
        hasMenuInInstructions: sessionConfigObj.instructions.includes('📋 FULL MENU')
      });

      if (sessionConfigJson.length > 50000) {
        logger.error('🚨 [WebRTCVoiceClient] Session config TOO LARGE (>50KB)!');
      }

      logger.info('🚀 [WebRTCVoiceClient] Sending session.update to OpenAI now...');

      const sessionUpdatePayload = {
        type: 'session.update',
        session: sessionConfigObj
      };

      // Log the ACTUAL payload being sent
      logger.info('📨 [WebRTCVoiceClient] ACTUAL session.update payload:', {
        type: sessionUpdatePayload.type,
        session: {
          modalities: sessionConfigObj.modalities,
          instructions: sessionConfigObj.instructions?.substring(0, 200) + '...',
          instructionsLength: sessionConfigObj.instructions?.length,
          toolsCount: sessionConfigObj.tools?.length,
          toolNames: sessionConfigObj.tools?.map((t: any) => t.name),
          voice: sessionConfigObj.voice,
          inputAudioFormat: sessionConfigObj.input_audio_format,
          outputAudioFormat: sessionConfigObj.output_audio_format,
          inputAudioTranscription: sessionConfigObj.input_audio_transcription,
          turnDetection: sessionConfigObj.turn_detection,
          temperature: sessionConfigObj.temperature,
          maxTokens: sessionConfigObj.max_response_output_tokens
        }
      });

      logger.info('🔍 [WebRTCVoiceClient] CRITICAL: input_audio_transcription setting:', sessionConfigObj.input_audio_transcription);

      this.eventHandler.sendEvent(sessionUpdatePayload);
      logger.info('✅ [WebRTCVoiceClient] session.update sent');

      // PHASE 2: Use dual confirmation strategy (event + timeout fallback)
      // Set a 3-second timeout to transition to IDLE if no session.updated received
      setTimeout(() => {
        if (this.stateMachine.isState(VoiceState.AWAITING_SESSION_READY)) {
          logger.info('⏱️ [WebRTCVoiceClient] Session ready timeout - proceeding to IDLE (fallback)');
          try {
            this.stateMachine.transition(VoiceEvent.SESSION_READY, { confirmed_via: 'timeout' });
            this.emit('session.configured');
          } catch (error) {
            logger.error('[WebRTCVoiceClient] Failed to transition to IDLE on timeout:', error);
          }
        }
      }, 3000);

      // Clear audio buffer immediately after session config
      this.eventHandler.sendEvent({
        type: 'input_audio_buffer.clear'
      });
    });

    // PHASE 2: Handle session.updated event (if OpenAI sends it)
    // This event is rare but if received, confirms session is ready immediately
    this.eventHandler.on('session.updated', () => {
      logger.info('✅ [WebRTCVoiceClient] session.updated received (explicit confirmation from OpenAI)');

      if (this.stateMachine.isState(VoiceState.AWAITING_SESSION_READY)) {
        try {
          this.stateMachine.transition(VoiceEvent.SESSION_READY, { confirmed_via: 'event' });
          this.emit('session.configured');
        } catch (error) {
          logger.error('[WebRTCVoiceClient] Failed to transition to IDLE on session.updated:', error);
        }
      }
    });

    // PHASE 2: Handle transcript completion - transition to AWAITING_RESPONSE
    this.eventHandler.on('transcript', (event: any) => {
      if (event.isFinal && this.stateMachine.isState(VoiceState.AWAITING_TRANSCRIPT)) {
        try {
          this.stateMachine.transition(VoiceEvent.TRANSCRIPT_RECEIVED);
        } catch (error) {
          logger.error('[WebRTCVoiceClient] Invalid state transition on transcript:', error);
        }
      }
    });

    // Handle reconnection events
    this.connection.on('reconnect.needed', async () => {
      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Reconnection needed, fetching new token');
      }
      await this.handleReconnect();
    });

    this.connection.on('disconnection', () => {
      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Connection lost, cleaning up');
      }
      this.handleDisconnection();
    });

    // Handle specific error types from event handler
    this.eventHandler.on('rate_limit_error', () => {
      logger.warn('[WebRTCVoiceClient] Rate limit exceeded');
      // Let external listeners handle this
    });

    this.eventHandler.on('session_expired', async () => {
      logger.warn('[WebRTCVoiceClient] Session expired, reconnecting');
      await this.handleSessionExpired();
    });
  }

  /**
   * Connect to OpenAI Realtime API via WebRTC
   * PHASE 2: Uses state machine for connection lifecycle
   */
  async connect(): Promise<void> {
    // PHASE 2: Use state machine guard - prevent duplicate connections
    if (this.stateMachine.isConnecting() || this.stateMachine.isConnected()) {
      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Already connecting or connected, skipping...');
      }
      return;
    }

    try {
      // Transition to CONNECTING state
      this.stateMachine.transition(VoiceEvent.CONNECT_REQUESTED);

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Starting connection sequence...');
      }

      // Step 1: Fetch ephemeral token via session config service
      await this.sessionConfig.fetchEphemeralToken();

      // Step 2: Get token and connect via connection service
      const token = this.sessionConfig.getToken();
      if (!token) {
        throw new Error('Failed to get ephemeral token');
      }

      await this.connection.connect(token);

      // Transition to AWAITING_SESSION_CREATED
      this.stateMachine.transition(VoiceEvent.CONNECTION_ESTABLISHED);

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Connection established, awaiting session.created');
      }

    } catch (error) {
      logger.error('[WebRTCVoiceClient] Connection failed:', error);

      // Transition to ERROR state
      try {
        this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, { error: String(error) });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state:', transitionError);
      }

      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start recording (enable microphone)
   * PHASE 2: Uses state machine guard conditions
   */
  startRecording(): void {
    // PHASE 2: Use state machine guard - only allow from IDLE state
    if (!this.stateMachine.canStartRecording()) {
      logger.warn(`[WebRTCVoiceClient] Cannot start recording in state: ${this.stateMachine.getState()}`);

      // If not ready yet, emit special event
      if (!this.stateMachine.isReady()) {
        logger.warn('⚠️ [WebRTCVoiceClient] Cannot start recording - session not yet ready');
        this.emit('session.not.ready');
      }
      return;
    }

    try {
      // Transition to RECORDING state
      this.stateMachine.transition(VoiceEvent.RECORDING_STARTED);

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Recording started');
      }

      // Update event handler turn state (for backward compatibility)
      this.eventHandler.setTurnState('recording');

      // Clear audio buffer before starting
      this.eventHandler.sendEvent({
        type: 'input_audio_buffer.clear'
      });

      // Enable microphone to start transmitting
      this.connection.enableMicrophone();

      this.emit('recording.started');

      // Clear any response text in the UI
      this.emit('response.text', '');
      this.emit('transcript', { text: '', isFinal: false, confidence: 0, timestamp: Date.now() });

    } catch (error) {
      logger.error('[WebRTCVoiceClient] Failed to start recording:', error);
      this.emit('error', error);
    }
  }

  /**
   * Stop recording (mute microphone and commit audio buffer)
   * PHASE 2: Uses state machine transitions, removes debounce workaround
   */
  stopRecording(): void {
    // PHASE 2: Use state machine guard - only allow from RECORDING state
    if (!this.stateMachine.canStopRecording()) {
      logger.warn(`[WebRTCVoiceClient] Cannot stop recording in state: ${this.stateMachine.getState()}`);
      return;
    }

    try {
      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Stopping recording...');
      }

      // IMMEDIATELY mute microphone to stop transmission
      this.connection.disableMicrophone();

      // Transition: RECORDING → COMMITTING_AUDIO
      this.stateMachine.transition(VoiceEvent.RECORDING_STOPPED);

      // Update event handler turn state (for backward compatibility)
      this.eventHandler.setTurnState('committing');

      // Commit the audio buffer
      this.eventHandler.sendEvent({
        type: 'input_audio_buffer.commit'
      });

      // Transition: COMMITTING_AUDIO → AWAITING_TRANSCRIPT
      this.stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);

      // Update event handler turn state (for backward compatibility)
      this.eventHandler.setTurnState('waiting_user_final');

      this.emit('recording.stopped');

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Waiting for transcript from OpenAI...');
      }

    } catch (error) {
      logger.error('[WebRTCVoiceClient] Failed to stop recording:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle reconnection
   * PHASE 2: Uses state machine reset
   */
  private async handleReconnect(): Promise<void> {
    try {
      // Reset state machine to disconnected
      this.stateMachine.reset();

      // Check if token is still valid
      if (!this.sessionConfig.isTokenValid()) {
        await this.sessionConfig.fetchEphemeralToken();
      }

      const token = this.sessionConfig.getToken();
      if (token) {
        await this.connection.connect(token);
      }
    } catch (error) {
      logger.error('[WebRTCVoiceClient] Reconnection failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle session expiration
   * PHASE 2: Uses state machine reset
   */
  private async handleSessionExpired(): Promise<void> {
    if (this.config.debug) {
      logger.info('[WebRTCVoiceClient] Handling session expiration...');
    }

    try {
      // Disconnect current session
      this.connection.disconnect();
      this.stateMachine.reset();

      // Fetch new token and reconnect
      await this.sessionConfig.fetchEphemeralToken();
      const token = this.sessionConfig.getToken();

      if (token) {
        await this.connection.connect(token);
      }
    } catch (error) {
      logger.error('[WebRTCVoiceClient] Failed to recover from session expiration:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle disconnection
   * PHASE 2: Uses state machine
   */
  private handleDisconnection(): void {
    this.connectionState = 'disconnected';
    this.stateMachine.reset();
    this.eventHandler.setTurnState('idle'); // For backward compatibility
  }

  /**
   * Disconnect and clean up
   * PHASE 2: Uses state machine reset
   */
  disconnect(): void {
    // Disconnect services
    this.connection.disconnect();
    this.sessionConfig.clearTokenRefresh();
    this.eventHandler.reset();

    // Reset state machine
    this.stateMachine.reset();

    this.connectionState = 'disconnected';

    if (this.config.debug) {
      logger.info('[WebRTCVoiceClient] Disconnected');
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if currently recording
   * PHASE 2: Uses state machine
   */
  isCurrentlyRecording(): boolean {
    return this.stateMachine.isState(VoiceState.RECORDING);
  }

  /**
   * Helper method to emit legacy connection.change events for backward compatibility
   * Maps VoiceState to ConnectionState
   */
  private emitLegacyConnectionState(state: VoiceState): void {
    let legacyState: ConnectionState;

    if (state === VoiceState.DISCONNECTED) {
      legacyState = 'disconnected';
    } else if ([VoiceState.CONNECTING, VoiceState.AWAITING_SESSION_CREATED, VoiceState.AWAITING_SESSION_READY].includes(state)) {
      legacyState = 'connecting';
    } else if ([VoiceState.ERROR, VoiceState.TIMEOUT].includes(state)) {
      legacyState = 'error';
    } else {
      legacyState = 'connected';
    }

    if (legacyState !== this.connectionState) {
      this.connectionState = legacyState;
      this.emit('connection.change', legacyState);
    }
  }
}
