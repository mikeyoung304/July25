/* eslint-env browser */
import { EventEmitter } from '../../../services/utils/EventEmitter';
import { getAuthToken } from '../../../services/auth';
import { VoiceSessionConfig } from './VoiceSessionConfig';
import { WebRTCConnection } from './WebRTCConnection';
import { VoiceEventHandler } from './VoiceEventHandler';

export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
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
 * This is an orchestrator that delegates to specialized services:
 * - VoiceSessionConfig: Session configuration and token management
 * - WebRTCConnection: WebRTC peer connection lifecycle
 * - VoiceEventHandler: Realtime API event processing
 */
export class WebRTCVoiceClient extends EventEmitter {
  private config: WebRTCVoiceConfig;

  // Delegated services
  private sessionConfig: VoiceSessionConfig;
  private connection: WebRTCConnection;
  private eventHandler: VoiceEventHandler;

  // Turn state machine (managed by orchestrator)
  private turnState: TurnState = 'idle';
  private isRecording = false;
  private lastCommitTime = 0;

  // Connection state tracking
  private connectionState: ConnectionState = 'disconnected';
  private isConnecting = false;

  constructor(config: WebRTCVoiceConfig) {
    super();
    this.config = config;

    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Initializing orchestrator with services');
    }

    // Create services
    this.sessionConfig = new VoiceSessionConfig(config, { getAuthToken });
    this.connection = new WebRTCConnection(config);
    this.eventHandler = new VoiceEventHandler(config);

    // Wire connection events
    this.connection.on('connection.change', (state: ConnectionState) => {
      this.connectionState = state;
      this.emit('connection.change', state);
    });

    this.connection.on('error', (error: Error) => {
      this.emit('error', error);
    });

    // Wire data channel ready event
    this.connection.on('dataChannelReady', (dc: RTCDataChannel) => {
      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Data channel ready, attaching to event handler');
      }
      this.eventHandler.setDataChannel(dc);
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

    // Handle session.created event to send session configuration
    this.eventHandler.on('session.created', () => {
      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Session created, sending configuration');
      }
      const sessionConfigObj = this.sessionConfig.buildSessionConfig();
      this.eventHandler.sendEvent({
        type: 'session.update',
        session: sessionConfigObj
      });

      // Clear audio buffer immediately after session config
      this.eventHandler.sendEvent({
        type: 'input_audio_buffer.clear'
      });
    });

    // Handle reconnection events
    this.connection.on('reconnect.needed', async () => {
      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Reconnection needed, fetching new token');
      }
      await this.handleReconnect();
    });

    this.connection.on('disconnection', () => {
      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Connection lost, cleaning up');
      }
      this.handleDisconnection();
    });

    // Handle specific error types from event handler
    this.eventHandler.on('rate_limit_error', () => {
      console.warn('[WebRTCVoiceClient] Rate limit exceeded');
      // Let external listeners handle this
    });

    this.eventHandler.on('session_expired', async () => {
      console.warn('[WebRTCVoiceClient] Session expired, reconnecting');
      await this.handleSessionExpired();
    });
  }

  /**
   * Connect to OpenAI Realtime API via WebRTC
   */
  async connect(): Promise<void> {
    // Prevent duplicate connections
    if (this.isConnecting || this.connectionState === 'connected') {
      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Already connecting or connected, skipping...');
      }
      return;
    }

    this.isConnecting = true;

    try {
      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Starting connection sequence...');
      }

      // Step 1: Fetch ephemeral token via session config service
      await this.sessionConfig.fetchEphemeralToken();

      // Step 2: Get token and connect via connection service
      const token = this.sessionConfig.getToken();
      if (!token) {
        throw new Error('Failed to get ephemeral token');
      }

      await this.connection.connect(token);

      this.isConnecting = false;

      if (this.config.debug) {
        console.log('[WebRTCVoiceClient] Connection established successfully');
      }

    } catch (error) {
      console.error('[WebRTCVoiceClient] Connection failed:', error);
      this.isConnecting = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start recording (enable microphone)
   */
  startRecording(): void {
    // State machine guard: only allow from idle state
    if (this.turnState !== 'idle') {
      console.warn(`[WebRTCVoiceClient] Cannot start recording in state: ${this.turnState}`);
      return;
    }

    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Turn state: idle → recording');
    }
    this.turnState = 'recording';

    // Update event handler turn state
    this.eventHandler.setTurnState('recording');

    // Clear audio buffer before starting
    this.eventHandler.sendEvent({
      type: 'input_audio_buffer.clear'
    });

    // Enable microphone to start transmitting
    this.connection.enableMicrophone();

    this.isRecording = true;
    this.emit('recording.started');

    // Clear any response text in the UI
    this.emit('response.text', '');
    this.emit('transcript', { text: '', isFinal: false, confidence: 0, timestamp: Date.now() });

    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Recording started - hold button to continue');
    }
  }

  /**
   * Stop recording (mute microphone and commit audio buffer)
   */
  stopRecording(): void {
    // State machine guard: only allow from recording state
    if (this.turnState !== 'recording') {
      console.warn(`[WebRTCVoiceClient] Cannot stop recording in state: ${this.turnState}`);
      return;
    }

    // Debounce protection
    const now = Date.now();
    if (now - this.lastCommitTime < 250) {
      console.warn('[WebRTCVoiceClient] Ignoring rapid stop - debouncing');
      return;
    }

    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Turn state: recording → committing');
    }

    // IMMEDIATELY mute microphone to stop transmission
    this.connection.disableMicrophone();

    this.lastCommitTime = now;
    this.isRecording = false;

    // State transition: recording → committing
    this.turnState = 'committing';
    this.eventHandler.setTurnState('committing');

    // Commit the audio buffer
    this.eventHandler.sendEvent({
      type: 'input_audio_buffer.commit'
    });

    // State transition: committing → waiting_user_final
    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Turn state: committing → waiting_user_final');
    }
    this.turnState = 'waiting_user_final';
    this.eventHandler.setTurnState('waiting_user_final');

    this.emit('recording.stopped');

    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Waiting for user transcript to finalize...');
    }
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(): Promise<void> {
    try {
      // Check if token is still valid
      if (!this.sessionConfig.isTokenValid()) {
        await this.sessionConfig.fetchEphemeralToken();
      }

      const token = this.sessionConfig.getToken();
      if (token) {
        await this.connection.connect(token);
      }
    } catch (error) {
      console.error('[WebRTCVoiceClient] Reconnection failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpired(): Promise<void> {
    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Handling session expiration...');
    }

    try {
      // Disconnect current session
      this.connection.disconnect();

      // Fetch new token and reconnect
      await this.sessionConfig.fetchEphemeralToken();
      const token = this.sessionConfig.getToken();

      if (token) {
        await this.connection.connect(token);
      }
    } catch (error) {
      console.error('[WebRTCVoiceClient] Failed to recover from session expiration:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.connectionState = 'disconnected';
    this.resetTurnState();
  }

  /**
   * Reset turn state
   */
  private resetTurnState(): void {
    this.turnState = 'idle';
    this.isRecording = false;
    this.eventHandler.setTurnState('idle');
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    // Clear all state flags
    this.isRecording = false;
    this.isConnecting = false;

    // Disconnect services
    this.connection.disconnect();
    this.sessionConfig.clearTokenRefresh();
    this.eventHandler.reset();

    // Reset turn state
    this.resetTurnState();

    this.connectionState = 'disconnected';

    if (this.config.debug) {
      console.log('[WebRTCVoiceClient] Disconnected');
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
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}
