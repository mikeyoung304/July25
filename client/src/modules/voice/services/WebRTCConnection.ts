/* eslint-env browser */
import { EventEmitter } from '../../../services/utils/EventEmitter';
import { logger } from '@/services/logger';

/**
 * Connection states for WebRTC
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Configuration for WebRTC connection
 */
export interface WebRTCVoiceConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
  enableVAD?: boolean;
  muteAudioOutput?: boolean;
}

/**
 * Interface for WebRTC connection management
 */
export interface IWebRTCConnection {
  // Connection lifecycle
  connect(ephemeralToken: string): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;

  // Media management
  setupMicrophone(): Promise<void>;
  enableMicrophone(): void;
  disableMicrophone(): void;
  getMicrophoneStream(): MediaStream | null;

  // State
  getConnectionState(): ConnectionState;
  isConnected(): boolean;
  isConnecting(): boolean;

  // Access to connections
  getDataChannel(): RTCDataChannel | null;
  getPeerConnection(): RTCPeerConnection | null;
}

/**
 * WebRTC connection service
 * Manages peer connection lifecycle, media streams, and data channels
 *
 * Events emitted:
 * - 'connection.change': (state: ConnectionState) - Connection state changed
 * - 'error': (error: Error) - Connection error occurred
 * - 'dataChannelReady': (dc: RTCDataChannel) - Data channel is open and ready
 * - 'track.received': (stream: MediaStream) - Remote audio track received
 */
export class WebRTCConnection extends EventEmitter implements IWebRTCConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private isConnectingFlag = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private sessionActive = false;

  constructor(private config: WebRTCVoiceConfig) {
    super();
  }

  /**
   * Connect to OpenAI Realtime API via WebRTC
   * @param ephemeralToken - Ephemeral token from session config
   */
  async connect(ephemeralToken: string): Promise<void> {
    // Prevent duplicate connections
    if (this.isConnectingFlag || this.connectionState === 'connected') {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Already connecting or connected, skipping...');
      }
      return;
    }

    this.isConnectingFlag = true;

    // Set up connection timeout (15 seconds)
    const CONNECTION_TIMEOUT = 15000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Connection timeout after 15 seconds'));
      }, CONNECTION_TIMEOUT);
    });

    try {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Starting connection with 15s timeout...');
      }
      this.setConnectionState('connecting');

      // Race between actual connection and timeout
      await Promise.race([
        this._connectInternal(ephemeralToken),
        timeoutPromise
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Emit specific timeout event for UI handling
      if (errorMessage.includes('timeout')) {
        logger.error('[WebRTCConnection] Connection timeout');
        this.emit('connection.timeout', { duration: CONNECTION_TIMEOUT });
      }

      logger.error('[WebRTCConnection] Connection failed:', error);
      this.isConnectingFlag = false;
      this.setConnectionState('error');
      this.emit('error', error);

      // Clean up failed connection
      this.cleanupConnection();

      // Attempt reconnection with proper delay
      this.reconnectAttempts++;
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(5000, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        if (this.config.debug) {
          logger.info(`[WebRTCConnection] Will retry connection in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        }
        setTimeout(() => {
          if (this.connectionState !== 'connected') {
            // Note: reconnect needs new token, so caller should handle this
            this.emit('reconnect.needed');
          }
        }, delay);
      } else {
        logger.error('[WebRTCConnection] Max reconnection attempts reached');
        this.emit('error', new Error('Max reconnection attempts reached'));
      }

      throw error;
    }
  }

  /**
   * Internal connection logic (extracted for timeout handling)
   */
  private async _connectInternal(ephemeralToken: string): Promise<void> {
    try {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Starting internal connection...');
      }

      // Step 1: Create RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
      });

      this.setupPeerConnectionHandlers();

      // Step 2: Set up audio output handler
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      this.audioElement.style.display = 'none';

      // Mute if configured for transcription-only mode
      if (this.config.muteAudioOutput) {
        this.audioElement.muted = true;
        this.audioElement.volume = 0;
      }
      document.body.appendChild(this.audioElement);

      this.pc.ontrack = (event) => {
        if (this.config.debug) {
          logger.info('[WebRTCConnection] Received remote audio track:', event.streams);
        }
        if (this.audioElement && event.streams[0]) {
          this.audioElement.srcObject = event.streams[0];
          this.emit('track.received', event.streams[0]);
        }
      };

      // Step 3: Set up microphone and add track (creates first m-line)
      await this.setupMicrophone();

      // Step 4: Create data channel (creates second m-line)
      this.dc = this.pc.createDataChannel('oai-events', {
        ordered: true,
      });
      this.setupDataChannel();

      // Step 5: Create offer and establish connection
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      if (this.config.debug) {
        // Log the m-lines in the offer to debug ordering
        const mLines = offer.sdp?.match(/m=.*/g);
        logger.info('[WebRTCConnection] SDP m-lines in offer:', mLines);
      }

      // Step 6: Send SDP to OpenAI
      const model = import.meta.env.VITE_OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2025-06-03';
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: 'POST',
          body: offer.sdp,
          headers: {
            'Authorization': `Bearer ${ephemeralToken}`,
            'Content-Type': 'application/sdp',
          },
        }
      );

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI SDP exchange failed: ${sdpResponse.status}`);
      }

      // Step 7: Set remote description
      const answerSdp = await sdpResponse.text();

      // Check if pc still exists and is in correct state
      if (!this.pc) {
        throw new Error('PeerConnection was closed during SDP exchange');
      }

      // Check if we're in the correct state to set remote description
      if (this.pc.signalingState !== 'have-local-offer') {
        logger.error('[WebRTCConnection] Wrong signaling state for setting answer:', this.pc.signalingState);
        throw new Error(`Cannot set remote answer in state: ${this.pc.signalingState}`);
      }

      const answer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: answerSdp,
      };

      if (this.config.debug) {
        logger.info('[WebRTCConnection] Setting remote description...');
      }
      await this.pc.setRemoteDescription(answer);

      this.sessionActive = true;
      this.reconnectAttempts = 0;
      this.isConnectingFlag = false;

      if (this.config.debug) {
        logger.info('[WebRTCConnection] WebRTC connection established');
      }
    } catch (error) {
      // Re-throw error to be caught by outer connect() method
      throw error;
    }
  }

  /**
   * Set up microphone input
   */
  async setupMicrophone(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const audioTrack = this.mediaStream.getAudioTracks()[0];
      if (this.pc && audioTrack) {
        // CRITICAL: Ensure track is MUTED before adding to connection
        if (this.config.debug) {
          logger.info('[WebRTCConnection] Audio track initial state - enabled:', audioTrack.enabled);
        }
        audioTrack.enabled = false;
        if (this.config.debug) {
          logger.info('[WebRTCConnection] Audio track after muting - enabled:', audioTrack.enabled);
        }

        // Add the track to peer connection
        this.pc.addTrack(audioTrack, this.mediaStream);
        if (this.config.debug) {
          logger.info('[WebRTCConnection] Audio track added to peer connection in MUTED state');
        }

        if (this.config.debug) {
          logger.info('[WebRTCConnection] Microphone connected but muted - will only transmit when enabled');
        }
      }
    } catch (error) {
      logger.error('[WebRTCConnection] Microphone setup failed:', error);
      throw new Error('Microphone access denied or unavailable');
    }
  }

  /**
   * Enable microphone (unmute audio track)
   */
  enableMicrophone(): void {
    // Log diagnostic info
    if (this.config.debug) {
      logger.info('[WebRTCConnection] enableMicrophone() called', {
        hasMediaStream: !!this.mediaStream,
        streamId: this.mediaStream?.id,
        trackCount: this.mediaStream?.getTracks().length
      });
    }

    if (!this.mediaStream) {
      logger.error('[WebRTCConnection] No media stream available - cannot enable microphone');
      return;
    }

    const audioTrack = this.mediaStream.getAudioTracks()[0];

    // Log track state for debugging
    if (this.config.debug) {
      logger.info('[WebRTCConnection] Audio track state', {
        hasTrack: !!audioTrack,
        trackId: audioTrack?.id,
        enabled: audioTrack?.enabled,
        readyState: audioTrack?.readyState,
        muted: audioTrack?.muted
      });
    }

    if (!audioTrack) {
      logger.error('[WebRTCConnection] No audio track found - check getUserMedia permissions');
      return;
    }

    audioTrack.enabled = true;

    // Log after enabling
    logger.info('[WebRTCConnection] Microphone ENABLED', {
      enabled: audioTrack.enabled,
      readyState: audioTrack.readyState
    });

    // Check WebRTC stats to verify audio is actually being transmitted
    if (this.pc && this.config.debug) {
      setTimeout(async () => {
        try {
          const stats = await this.pc!.getStats();
          let audioBytesSent = 0;
          let outboundAudioFound = false;

          stats.forEach((stat) => {
            if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
              outboundAudioFound = true;
              audioBytesSent = stat.bytesSent || 0;
              logger.info('[WebRTCConnection] Audio transmission stats (after 2s)', {
                bytesSent: audioBytesSent,
                packetsSent: stat.packetsSent,
                trackId: stat.trackId
              });
            }
          });

          if (!outboundAudioFound) {
            logger.error('[WebRTCConnection] No outbound-rtp audio track found in stats');
          } else if (audioBytesSent === 0) {
            logger.error('[WebRTCConnection] Audio track exists but ZERO bytes sent');
          }
        } catch (err) {
          logger.error('[WebRTCConnection] Failed to get stats', { error: err });
        }
      }, 2000); // Check after 2 seconds of recording
    }
  }

  /**
   * Disable microphone (mute audio track)
   */
  disableMicrophone(): void {
    if (!this.mediaStream) {
      logger.error('[WebRTCConnection] No media stream available');
      return;
    }

    const audioTrack = this.mediaStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = false;
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Microphone DISABLED - stopped transmitting');
      }
    }
  }

  /**
   * Get microphone stream
   */
  getMicrophoneStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Set up data channel for bidirectional event communication
   */
  private setupDataChannel(): void {
    if (!this.dc) return;

    // CRITICAL FIX: Set onmessage handler BEFORE DataChannel opens
    // This prevents race condition where initial OpenAI events (session.created)
    // arrive before VoiceEventHandler can attach its handler
    this.dc.onmessage = (event: MessageEvent) => {
      // Forward raw message to VoiceEventHandler via event emission
      this.emit('dataChannelMessage', event.data);
    };

    this.dc.onopen = () => {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Data channel opened');
      }

      this.setConnectionState('connected');

      // Emit data channel ready event with the channel
      this.emit('dataChannelReady', this.dc);
    };

    this.dc.onerror = (event: Event) => {
      // CRITICAL: Always log data channel errors regardless of debug mode
      const error = new Error('Data channel error');
      error.name = 'DataChannelError';

      logger.error('[WebRTCConnection] Data channel error event', {
        type: event.type,
        readyState: this.dc?.readyState,
        bufferedAmount: this.dc?.bufferedAmount,
      });

      // Emit proper Error object for state machine handling
      this.emit('error', error);
    };

    this.dc.onclose = (event: Event) => {
      // CRITICAL: Always log data channel close regardless of debug mode
      // CloseEvent has code, reason, wasClean properties but types as Event
      const closeEvent = event as CloseEvent;
      const wasUnexpected = !closeEvent.wasClean;

      logger.warn('[WebRTCConnection] Data channel closed', {
        code: closeEvent.code,
        reason: closeEvent.reason,
        wasClean: closeEvent.wasClean,
        wasUnexpected,
        readyState: this.dc?.readyState,
        sessionActive: this.sessionActive,
      });

      // Emit error event if close was unexpected
      if (wasUnexpected && this.sessionActive) {
        const error = new Error(`Data channel closed unexpectedly: ${closeEvent.reason || 'No reason provided'}`);
        error.name = 'DataChannelClosedError';
        this.emit('error', error);
      }

      this.handleDisconnection();
    };
  }

  /**
   * Handle peer connection state changes
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.pc) return;

    this.pc.oniceconnectionstatechange = () => {
      if (this.config.debug) {
        logger.info('[WebRTCConnection] ICE connection state:', this.pc?.iceConnectionState);
      }

      if (this.pc?.iceConnectionState === 'failed' || this.pc?.iceConnectionState === 'disconnected') {
        this.handleDisconnection();
      }
    };

    // Connection state handler - handles all connection lifecycle states
    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (this.config.debug) {
        logger.info('[WebRTCConnection] Connection state:', state);
      }

      switch (state) {
        case 'connected':
          this.emit('connected');
          break;
        case 'disconnected':
          logger.warn('[WebRTCConnection] Connection disconnected');
          this.emit('disconnected');
          break;
        case 'failed':
          logger.error('[WebRTCConnection] Connection failed');
          this.emit('error', new Error('WebRTC connection failed'));
          this.handleDisconnection();
          break;
        case 'closed':
          this.handleDisconnection();
          break;
      }
    };

    // Signaling state handler
    this.pc.onsignalingstatechange = () => {
      const state = this.pc?.signalingState;
      if (this.config.debug) {
        logger.debug('[WebRTCConnection] Signaling state', { state });
      }

      if (state === 'closed') {
        this.handleDisconnection();
      }
    };

    // ICE candidate handler - for debugging connection establishment
    this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate) {
        if (this.config.debug) {
          logger.info('[WebRTCConnection] ICE candidate gathering complete');
        }
      } else if (this.config.debug) {
        logger.debug('[WebRTCConnection] ICE candidate', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
        });
      }
    };

    // ICE gathering state handler
    this.pc.onicegatheringstatechange = () => {
      const state = this.pc?.iceGatheringState;
      if (this.config.debug) {
        logger.debug('[WebRTCConnection] ICE gathering state', { state });
      }
    };
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(): void {
    this.setConnectionState('disconnected');
    this.sessionActive = false;

    // Emit disconnection event for orchestrator to handle
    this.emit('disconnection');
  }

  /**
   * Reconnect to the service
   */
  async reconnect(): Promise<void> {
    if (this.config.debug) {
      logger.info(`[WebRTCConnection] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    }

    // Clean up existing connection
    this.disconnect();

    // Note: Caller must provide new token via connect()
    // We can't reconnect without a fresh ephemeral token
    this.emit('reconnect.needed');
  }

  /**
   * Clean up connection resources without changing state
   */
  private cleanupConnection(): void {
    // Close data channel
    if (this.dc) {
      try {
        // Remove event handlers before closing
        this.dc.onopen = null;
        this.dc.onmessage = null;
        this.dc.onerror = null;
        this.dc.onclose = null;
        this.dc.close();
      } catch {
        // Ignore errors during cleanup
      }
      this.dc = null;
    }

    // Close peer connection and clean up event handlers
    if (this.pc) {
      try {
        // Remove all event handlers to prevent memory leaks
        this.pc.onicecandidate = null;
        this.pc.oniceconnectionstatechange = null;
        this.pc.onconnectionstatechange = null;
        this.pc.ontrack = null;
        this.pc.onsignalingstatechange = null;
        this.pc.onicegatheringstatechange = null;
        this.pc.ondatachannel = null;

        // Close the connection
        if (this.pc.signalingState !== 'closed') {
          this.pc.close();
        }
      } catch (e) {
        logger.warn('[WebRTCConnection] Error cleaning up peer connection:', e);
      }
      this.pc = null;
    }

    // Stop media stream tracks properly
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          // Remove event listeners from track
          track.onended = null;
          track.onmute = null;
          track.onunmute = null;
          // Stop the track
          track.stop();
        } catch {
          // Ignore errors during cleanup
        }
      });
      this.mediaStream = null;
    }

    // Clean up audio element properly to prevent memory leaks
    if (this.audioElement) {
      try {
        // Stop any playing audio
        this.audioElement.pause();

        // Clear the source to release media resources
        this.audioElement.srcObject = null;
        this.audioElement.src = '';
        this.audioElement.load(); // Force release of media buffers

        // Remove all event listeners
        this.audioElement.onloadedmetadata = null;
        this.audioElement.onplay = null;
        this.audioElement.onpause = null;
        this.audioElement.onerror = null;
        this.audioElement.onended = null;
        this.audioElement.onseeking = null;
        this.audioElement.onseeked = null;

        // Remove from DOM
        if (this.audioElement.parentNode) {
          this.audioElement.parentNode.removeChild(this.audioElement);
        }
      } catch (e) {
        logger.warn('[WebRTCConnection] Error cleaning up audio element:', e);
      }
      this.audioElement = null;
    }
  }

  /**
   * Disconnect and clean up
   */
  disconnect(): void {
    // Clear all state flags
    this.sessionActive = false;
    this.isConnectingFlag = false;

    // Use cleanup method
    this.cleanupConnection();

    this.setConnectionState('disconnected');

    if (this.config.debug) {
      logger.info('[WebRTCConnection] Disconnected');
    }
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connection.change', state);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Check if connecting
   */
  isConnecting(): boolean {
    return this.isConnectingFlag;
  }

  /**
   * Get data channel
   */
  getDataChannel(): RTCDataChannel | null {
    return this.dc;
  }

  /**
   * Get peer connection
   */
  getPeerConnection(): RTCPeerConnection | null {
    return this.pc;
  }
}
