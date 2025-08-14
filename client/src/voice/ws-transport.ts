/**
 * WebSocket Transport for Voice Streaming
 * Handles connection, reconnection, message queuing, and event emission
 */

export interface VoiceStreamMessage {
  type: 'audio' | 'transcript' | 'response' | 'error' | 'heartbeat' | 'pong';
  data?: any;
  timestamp?: number;
}

export interface TranscriptData {
  text: string;
  isFinal: boolean;
  confidence?: number;
}

export interface ResponseData {
  text: string;
  audioUrl?: string;
  audioData?: string; // base64 encoded audio
}

export interface AudioData {
  chunk: string; // base64 encoded PCM16 audio
  hasVoice: boolean;
  timestamp: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface VoiceTransportEvents {
  connectionChange: (state: ConnectionState) => void;
  transcript: (data: TranscriptData) => void;
  response: (data: ResponseData) => void;
  error: (error: Error) => void;
  heartbeat: () => void;
}

/**
 * Simple EventEmitter implementation
 */
class EventEmitter<T extends Record<string, (...args: any[]) => void>> {
  private listeners: Map<keyof T, Array<T[keyof T]>> = new Map();

  on<K extends keyof T>(event: K, listener: T[K]): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

export interface VoiceTransportConfig {
  url: string;
  reconnectDelay: number;
  maxReconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageQueueMaxSize: number;
}

export const DEFAULT_CONFIG: VoiceTransportConfig = {
  url: 'ws://localhost:3001/voice-stream',
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageQueueMaxSize: 100,
};

/**
 * WebSocket transport for voice streaming with automatic reconnection
 */
export class VoiceTransport extends EventEmitter<VoiceTransportEvents> {
  private config: VoiceTransportConfig;
  private ws: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: VoiceStreamMessage[] = [];
  private shouldReconnect: boolean = true;

  constructor(config: Partial<VoiceTransportConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return;
    }

    this.setConnectionState('connecting');
    
    try {
      this.ws = new WebSocket(this.config.url);
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimeout();
    this.clearHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setConnectionState('disconnected');
  }

  /**
   * Send audio data
   */
  sendAudio(chunk: string, hasVoice: boolean): boolean {
    const message: VoiceStreamMessage = {
      type: 'audio',
      data: {
        chunk,
        hasVoice,
        timestamp: Date.now(),
      } as AudioData,
      timestamp: Date.now(),
    };

    return this.sendMessage(message);
  }

  /**
   * Send a generic message
   */
  sendMessage(message: VoiceStreamMessage): boolean {
    if (this.connectionState === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.handleConnectionError(error as Error);
        return false;
      }
    } else {
      // Queue message if not connected
      if (this.messageQueue.length < this.config.messageQueueMaxSize) {
        this.messageQueue.push(message);
        return true;
      } else {
        console.warn('Message queue full, dropping message');
        return false;
      }
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

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Voice WebSocket connected');
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.startHeartbeat();
      this.processMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: VoiceStreamMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.emit('error', new Error('Failed to parse server message'));
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleConnectionError(new Error('WebSocket error'));
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      this.ws = null;
      this.clearHeartbeat();
      
      if (this.shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.setConnectionState('disconnected');
      }
    };
  }

  private handleMessage(message: VoiceStreamMessage): void {
    switch (message.type) {
      case 'transcript':
        this.emit('transcript', message.data as TranscriptData);
        break;
      
      case 'response':
        this.emit('response', message.data as ResponseData);
        break;
      
      case 'error':
        this.emit('error', new Error(message.data?.message || 'Server error'));
        break;
      
      case 'heartbeat':
        // Respond to server heartbeat
        this.sendMessage({ type: 'pong', timestamp: Date.now() });
        this.emit('heartbeat');
        break;
      
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handleConnectionError(error: Error): void {
    this.emit('error', error);
    
    if (this.connectionState !== 'error') {
      this.setConnectionState('error');
      
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = baseDelay + jitter;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionState === 'connected') {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.sendMessage({ type: 'heartbeat', timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionChange', state);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.shouldReconnect = false;
    this.disconnect();
    this.removeAllListeners();
    this.messageQueue = [];
  }
}