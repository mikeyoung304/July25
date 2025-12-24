/* eslint-env browser */
import { EventEmitter } from '@/services/utils/EventEmitter';
import { getAuthToken, getOptionalAuthToken } from '@/services/auth';
import { VoiceSessionConfig } from './VoiceSessionConfig';
import { WebRTCConnection } from './WebRTCConnection';
import { VoiceEventHandler } from './VoiceEventHandler';
import { VoiceStateMachine, VoiceState, VoiceEvent } from './VoiceStateMachine';
import { logger } from '@/services/logger';

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

        // Handle RECORDING timeout - perform side effects only
        // State machine will auto-transition to IDLE via TIMEOUT_OCCURRED
        if (state === VoiceState.RECORDING) {
          logger.warn('[WebRTCVoiceClient] RECORDING timeout (45s) - stopping recording');
          try {
            // Guard: only proceed if still in RECORDING state
            if (this.stateMachine.canStopRecording()) {
              // Disable microphone immediately to stop audio capture
              this.connection.disableMicrophone();
              // Emit timeout event for UI feedback
              this.emit('recording.timeout', { duration_ms: 45000, message: 'Recording timed out after 45s' });
              // Note: State machine will auto-transition to IDLE via TIMEOUT_OCCURRED
            } else {
              logger.debug('[WebRTCVoiceClient] State changed before timeout handler, skipping');
            }
          } catch (error) {
            logger.error('[WebRTCVoiceClient] Failed to handle recording timeout:', error);
          }
          return;
        }

        // Handle AWAITING_SESSION_READY timeout - emit session.configured event
        // State machine will auto-transition to IDLE via TIMEOUT_OCCURRED (graceful fallback)
        // OpenAI may not always send session.updated, but the session is likely ready
        if (state === VoiceState.AWAITING_SESSION_READY) {
          logger.info('⏱️ [WebRTCVoiceClient] Session ready timeout - emitting session.configured');
          try {
            // Guard: only proceed if still in AWAITING_SESSION_READY state
            if (this.stateMachine.isState(VoiceState.AWAITING_SESSION_READY)) {
              // Emit event for UI feedback - state machine handles transition
              this.emit('session.configured');
            } else {
              logger.debug('[WebRTCVoiceClient] State already changed, skipping timeout handler');
            }
          } catch (error) {
            logger.error('[WebRTCVoiceClient] Failed to emit session.configured:', error);
          }
        }
      },
      maxHistorySize: 50
    });

    // Wire connection events
    this.connection.on('connection.change', (state: ConnectionState) => {
      this.connectionState = state;
      this.emit('connection.change', state);
    });

    this.connection.on('error', (error: Error) => {
      // Transition state machine to ERROR state
      try {
        this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, { error: String(error) });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state on connection error:', transitionError);
      }
      this.emit('error', error);
    });

    // Handle connection timeout specifically
    this.connection.on('connection.timeout', (data: { duration: number }) => {
      logger.warn(`[WebRTCVoiceClient] Connection timed out after ${data.duration}ms`);

      const error = new Error(`Connection timed out after ${Math.round(data.duration / 1000)} seconds. Please check your internet connection.`);
      (error as any).type = 'CONNECTION_TIMEOUT';
      (error as any).recoverable = true;

      try {
        this.stateMachine.transition(VoiceEvent.TIMEOUT_OCCURRED, {
          type: 'connection',
          duration: data.duration
        });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition on timeout:', transitionError);
        // Force to error state as fallback
        this.stateMachine.forceState(VoiceState.TIMEOUT, 'Connection timeout');
      }

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

    // ORCHESTRATION: Handle transcript.finalized event
    // This is where we decide to request a response from OpenAI
    // Event handler only emits semantic events, orchestration happens here
    this.eventHandler.on('transcript.finalized', (data: { itemId: string; transcript: string; timestamp: number }) => {
      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Transcript finalized, requesting AI response', {
          itemId: data.itemId,
          transcriptLength: data.transcript.length
        });
      }

      // Send response.create to OpenAI to generate AI response
      this.eventHandler.sendEvent({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'RESPOND IN ENGLISH. Respond about their order with appropriate follow-up questions. Use smart follow-ups: dressing for salads, bread for sandwiches, sides for entrées. Keep it under 2 sentences.',
        }
      });

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] response.create sent to OpenAI');
      }
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
      const MAX_CONFIG_SIZE = 30000; // 30KB

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

      // Fail fast if session config is too large
      if (sessionConfigJson.length > MAX_CONFIG_SIZE) {
        const error = new Error(
          `Session config too large (${sessionConfigJson.length} bytes). ` +
          `Max: ${MAX_CONFIG_SIZE} bytes. Reduce menu size or instructions.`
        );
        logger.error('🚨 [WebRTCVoiceClient] Session config TOO LARGE - aborting!', {
          configSize: sessionConfigJson.length,
          maxSize: MAX_CONFIG_SIZE,
          menuContextLength: this.sessionConfig.getMenuContext().length,
          instructionsLength: sessionConfigObj.instructions?.length || 0
        });

        // Transition state machine to ERROR state
        try {
          this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, {
            error: String(error),
            code: 'CONFIG_TOO_LARGE'
          });
        } catch (transitionError) {
          logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state on config size error:', transitionError);
        }

        // Emit error event for UI feedback
        this.emit('error', error);
        return; // Don't send oversized config to OpenAI
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

      // NOTE: Timeout fallback is now handled by VoiceStateMachine's onTimeout callback
      // This ensures single source of truth for timeout logic (see STATE_TIMEOUTS config)

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

    // PHASE 2: Handle VAD speech.stopped - auto-transition from RECORDING
    // When VAD detects end of speech with create_response: true, OpenAI auto-commits audio
    // We need to transition the state machine to match
    this.eventHandler.on('speech.stopped', () => {
      if (this.stateMachine.isState(VoiceState.RECORDING)) {
        logger.info('[WebRTCVoiceClient] VAD detected speech end, auto-transitioning from RECORDING');
        try {
          // Disable microphone to stop audio capture
          this.connection.disableMicrophone();
          // Transition: RECORDING → COMMITTING_AUDIO
          this.stateMachine.transition(VoiceEvent.RECORDING_STOPPED);
          // With create_response: true, OpenAI auto-commits and creates response
          // So we also transition through COMMITTING_AUDIO
          this.stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);
          this.emit('recording.stopped');
        } catch (error) {
          logger.error('[WebRTCVoiceClient] Failed to handle VAD speech.stopped:', error);
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

    // Handle response.started - AI has begun responding
    this.eventHandler.on('response.started', (data: { responseId: string; timestamp: number }) => {
      // Check if transition is valid from current state (more flexible than strict state check)
      if (this.stateMachine.canTransition(VoiceEvent.RESPONSE_STARTED)) {
        try {
          this.stateMachine.transition(VoiceEvent.RESPONSE_STARTED, data);
          if (this.config.debug) {
            logger.info('[WebRTCVoiceClient] Response started', { responseId: data.responseId });
          }
        } catch (error) {
          logger.error('[WebRTCVoiceClient] Invalid state transition on response.started:', error);
        }
      } else {
        logger.warn('[WebRTCVoiceClient] Received response.started in unexpected state', {
          currentState: this.stateMachine.getState(),
          responseId: data.responseId,
          timestamp: data.timestamp
        });
      }
    });

    // Handle response.complete - AI finished responding, return to IDLE
    this.eventHandler.on('response.complete', () => {
      if (this.stateMachine.isState(VoiceState.AWAITING_RESPONSE)) {
        try {
          this.stateMachine.transition(VoiceEvent.RESPONSE_COMPLETE);
          logger.info('[WebRTCVoiceClient] Response complete, returning to IDLE - ready for next turn');
        } catch (error) {
          logger.error('[WebRTCVoiceClient] Failed to transition to IDLE on response.complete:', error);
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

    // Handle ICE disconnection during active recording states
    // This ensures button returns to idle when network drops mid-recording
    this.connection.on('ice.disconnection', (data: { reason: string }) => {
      const currentState = this.stateMachine.getState();
      const activeRecordingStates = [
        VoiceState.RECORDING,
        VoiceState.COMMITTING_AUDIO,
        VoiceState.AWAITING_TRANSCRIPT
      ];

      if (activeRecordingStates.includes(currentState)) {
        logger.warn(`[WebRTCVoiceClient] Network disconnected during ${currentState}`, data);

        // Disable microphone immediately to stop audio capture
        this.connection.disableMicrophone();

        // Force state machine to ERROR state
        this.stateMachine.forceState(VoiceState.ERROR, `Network disconnection: ${data.reason}`);

        // Emit error event for UI feedback
        const error = new Error('Network connection lost during recording');
        (error as any).type = 'NETWORK_DISCONNECTION';
        (error as any).recoverable = true;
        this.emit('error', error);
      }
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
      // Transition state machine to ERROR state
      try {
        this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, { error: String(error) });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state on startRecording error:', transitionError);
      }
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

      // Commit the audio buffer
      this.eventHandler.sendEvent({
        type: 'input_audio_buffer.commit'
      });

      // Transition: COMMITTING_AUDIO → AWAITING_TRANSCRIPT
      this.stateMachine.transition(VoiceEvent.AUDIO_COMMITTED);

      this.emit('recording.stopped');

      if (this.config.debug) {
        logger.info('[WebRTCVoiceClient] Waiting for transcript from OpenAI...');
      }

    } catch (error) {
      logger.error('[WebRTCVoiceClient] Failed to stop recording:', error);
      // Transition state machine to ERROR state
      try {
        this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, { error: String(error) });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state on stopRecording error:', transitionError);
      }
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
      // Transition state machine to ERROR state
      try {
        this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, { error: String(error) });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state on reconnect error:', transitionError);
      }
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
      // Transition state machine to ERROR state
      try {
        this.stateMachine.transition(VoiceEvent.ERROR_OCCURRED, { error: String(error) });
      } catch (transitionError) {
        logger.error('[WebRTCVoiceClient] Failed to transition to ERROR state on session expiration error:', transitionError);
      }
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
