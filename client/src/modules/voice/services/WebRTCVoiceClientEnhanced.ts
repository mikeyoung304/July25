/**
 * Enhanced WebRTC Voice Client with Expert Recommendations
 *
 * Implements:
 * - Connection resilience with exponential backoff
 * - Message queue for offline/reconnection scenarios
 * - Structured event handling
 * - Performance monitoring
 * - Session keepalive
 */

import { EventEmitter } from '@/services/utils/EventEmitter';
import { logger } from '@/services/monitoring/logger';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface VoiceClientConfig {
  restaurantId: string;
  userId?: string;
  debug?: boolean;
  mode?: 'customer' | 'server' | 'kiosk' | 'drive-thru';
  maxReconnectAttempts?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  keepAliveIntervalMs?: number;
  queueMaxSize?: number;
}

export interface PerformanceMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  totalDisconnects: number;
  averageLatency: number;
  messagesQueued: number;
  messagesSent: number;
  lastError?: string;
  uptime: number;
}

export class WebRTCVoiceClientEnhanced extends EventEmitter {
  private config: VoiceClientConfig;
  private state: ConnectionState = 'disconnected';
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;

  // Resilience features
  private reconnectAttempts = 0;
  private backoffMs = 500;
  private reconnectTimer?: NodeJS.Timeout;
  private keepAliveTimer?: NodeJS.Timeout;

  // Message queue for resilience
  private messageQueue: string[] = [];
  private readonly maxQueueSize: number;

  // Performance tracking
  private metrics: PerformanceMetrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    totalDisconnects: 0,
    averageLatency: 0,
    messagesQueued: 0,
    messagesSent: 0,
    uptime: 0
  };
  private connectionStartTime?: number;
  private latencyMeasurements: number[] = [];

  constructor(config: VoiceClientConfig) {
    super();
    this.config = {
      maxReconnectAttempts: 5,
      baseBackoffMs: 500,
      maxBackoffMs: 30000,
      keepAliveIntervalMs: 30000,
      queueMaxSize: 100,
      ...config
    };
    this.maxQueueSize = this.config.queueMaxSize!;
  }

  /**
   * Connect with automatic retry and resilience
   */
  public async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      this.log('Already connected or connecting');
      return;
    }

    this.setState('connecting');
    this.metrics.connectionAttempts++;
    this.connectionStartTime = Date.now();

    try {
      await this.establishConnection();
      this.onConnectionSuccess();
    } catch (error) {
      this.onConnectionError(error as Error);
    }
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect(): void {
    this.log('Disconnecting...');
    this.clearTimers();
    this.closeConnection();
    this.setState('disconnected');
    this.resetBackoff();
  }

  /**
   * Send message with queuing support
   */
  public send(message: any): void {
    const msgString = typeof message === 'string'
      ? message
      : JSON.stringify(message);

    if (this.dc?.readyState === 'open') {
      try {
        this.dc.send(msgString);
        this.metrics.messagesSent++;
        this.log('Message sent', { size: msgString.length });
      } catch (error) {
        this.log('Send failed, queuing message', error);
        this.queueMessage(msgString);
      }
    } else {
      this.queueMessage(msgString);
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    if (this.connectionStartTime) {
      this.metrics.uptime = Date.now() - this.connectionStartTime;
    }
    if (this.latencyMeasurements.length > 0) {
      const sum = this.latencyMeasurements.reduce((a, b) => a + b, 0);
      this.metrics.averageLatency = sum / this.latencyMeasurements.length;
    }
    return { ...this.metrics };
  }

  // Private methods

  private async establishConnection(): Promise<void> {
    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    // Set up event handlers
    this.setupPeerConnectionHandlers();

    // Create data channel for messages
    this.dc = this.pc.createDataChannel('voice', {
      ordered: true,
      maxRetransmits: 3
    });
    this.setupDataChannelHandlers();

    // Add audio track
    await this.setupAudioTrack();

    // Create and set offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Exchange SDP with server
    const answer = await this.negotiateWithServer(offer);
    await this.pc.setRemoteDescription(answer);
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.pc) return;

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      this.log('ICE connection state:', state);

      if (state === 'failed' || state === 'disconnected') {
        this.handleDisconnection();
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      this.log('Connection state:', state);

      if (state === 'connected') {
        this.setState('connected');
      } else if (state === 'failed') {
        this.handleDisconnection();
      }
    };
  }

  private setupDataChannelHandlers(): void {
    if (!this.dc) return;

    this.dc.onopen = () => {
      this.log('Data channel opened');
      this.flushMessageQueue();
    };

    this.dc.onmessage = (event) => {
      this.handleDataChannelMessage(event);
    };

    this.dc.onerror = (error) => {
      this.log('Data channel error:', error);
      this.metrics.lastError = String(error);
    };

    this.dc.onclose = () => {
      this.log('Data channel closed');
    };
  }

  private async setupAudioTrack(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.localStream.getTracks().forEach(track => {
        this.pc?.addTrack(track, this.localStream!);
      });
    } catch (error) {
      throw new Error(`Failed to get user media: ${error}`);
    }
  }

  private async negotiateWithServer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    // This would be replaced with actual server negotiation
    const response = await fetch('/api/v1/voice/negotiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': this.config.restaurantId
      },
      body: JSON.stringify({ offer: offer.sdp })
    });

    if (!response.ok) {
      throw new Error(`Negotiation failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      type: 'answer',
      sdp: data.answer
    };
  }

  private handleDataChannelMessage(event: MessageEvent): void {
    const pingTime = Date.now();

    try {
      const data = JSON.parse(event.data);

      // Handle different message types
      switch (data.type) {
        case 'transcript.delta':
        case 'transcript.final':
          this.emit('transcript', {
            text: data.text,
            isFinal: data.type === 'transcript.final',
            confidence: data.confidence
          });
          break;

        case 'response.text':
          this.emit('response', { text: data.text });
          break;

        case 'order.detected':
          this.emit('order.detected', data.order);
          break;

        case 'session.pong':
          // Calculate latency
          const latency = Date.now() - pingTime;
          this.latencyMeasurements.push(latency);
          if (this.latencyMeasurements.length > 100) {
            this.latencyMeasurements.shift();
          }
          break;

        default:
          this.emit('message', data);
      }
    } catch (error) {
      this.log('Failed to parse message:', error);
    }
  }

  private onConnectionSuccess(): void {
    this.log('Connection established successfully');
    this.metrics.successfulConnections++;
    this.reconnectAttempts = 0;
    this.resetBackoff();
    this.setState('connected');
    this.startKeepAlive();
    this.flushMessageQueue();
    this.emit('connected');
  }

  private onConnectionError(error: Error): void {
    this.log('Connection error:', error);
    this.metrics.lastError = error.message;
    this.setState('error');
    this.emit('error', error);
    this.scheduleReconnect();
  }

  private handleDisconnection(): void {
    this.log('Connection lost');
    this.metrics.totalDisconnects++;
    this.clearTimers();

    if (this.state === 'connected') {
      this.setState('reconnecting');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      this.log('Max reconnection attempts reached');
      this.setState('error');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    // Calculate backoff with jitter
    const base = Math.min(
      this.config.maxBackoffMs || 30000,
      this.backoffMs * 2
    );
    const jitter = Math.floor(Math.random() * 250);
    this.backoffMs = base + jitter;

    this.reconnectAttempts++;
    this.log(`Reconnecting in ${this.backoffMs}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.backoffMs);
  }

  private resetBackoff(): void {
    this.backoffMs = this.config.baseBackoffMs || 500;
    this.reconnectAttempts = 0;
  }

  private startKeepAlive(): void {
    this.keepAliveTimer = setInterval(() => {
      if (this.dc?.readyState === 'open') {
        this.send({ type: 'session.ping', timestamp: Date.now() });
      }
    }, this.config.keepAliveIntervalMs || 30000);
  }

  private queueMessage(message: string): void {
    if (this.messageQueue.length >= this.maxQueueSize) {
      // Remove oldest message if queue is full
      this.messageQueue.shift();
      this.log('Message queue full, dropping oldest message');
    }

    this.messageQueue.push(message);
    this.metrics.messagesQueued++;
    this.log(`Message queued (${this.messageQueue.length} in queue)`);
  }

  private flushMessageQueue(): void {
    if (!this.dc || this.dc.readyState !== 'open') return;

    const queueSize = this.messageQueue.length;
    if (queueSize === 0) return;

    this.log(`Flushing ${queueSize} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        this.dc.send(message);
        this.metrics.messagesSent++;
      } catch (error) {
        // Re-queue on failure
        this.messageQueue.unshift(message);
        this.log('Failed to flush message, re-queuing', error);
        break;
      }
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = undefined;
    }
  }

  private closeConnection(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      const oldState = this.state;
      this.state = state;
      this.emit('stateChange', { from: oldState, to: state });
      this.log(`State: ${oldState} → ${state}`);
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      logger.debug('[WebRTCVoiceClient]', ...args);
    }
  }

  // Public getters

  public get connectionState(): ConnectionState {
    return this.state;
  }

  public get isConnected(): boolean {
    return this.state === 'connected';
  }

  public get queueSize(): number {
    return this.messageQueue.length;
  }
}