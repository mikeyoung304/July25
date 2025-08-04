import { VoiceSocketMessage } from '../hooks/useVoiceSocket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface VoiceSocketListener {
  onMessage?: (message: VoiceSocketMessage) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
}

class VoiceSocketManager {
  private static instance: VoiceSocketManager | null = null;
  private ws: WebSocket | null = null;
  private listeners: Map<string, VoiceSocketListener> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 3000;
  private maxReconnectDelay = 30000;
  private reconnectAttempts = 0;
  private unacknowledgedChunks = 0;
  private maxUnacknowledgedChunks = 3;
  private messageQueue: (string | ArrayBuffer | Blob)[] = [];
  private processing = false;
  private url: string;
  private shouldReconnect = true;

  private constructor(url: string) {
    this.url = url;
  }

  static getInstance(url: string): VoiceSocketManager {
    if (!VoiceSocketManager.instance) {
      VoiceSocketManager.instance = new VoiceSocketManager(url);
    }
    return VoiceSocketManager.instance;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.updateConnectionStatus('connecting');
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.warn('Voice WebSocket connected (singleton)');
      this.updateConnectionStatus('connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 3000;
      this.unacknowledgedChunks = 0;
      this.messageQueue = [];

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      this.processMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.warn('WebSocket message:', data);

        switch (data.type) {
          case 'progress':
            if (this.unacknowledgedChunks > 0) {
              this.unacknowledgedChunks--;
              console.warn(`Progress: ${data.bytesReceived} bytes received, ${this.unacknowledgedChunks} chunks pending`);
            }
            this.processMessageQueue();
            break;

          case 'error':
            if (data.message === 'overrun') {
              console.error('Audio overrun detected - too many unacknowledged chunks');
              this.unacknowledgedChunks = 0;
              this.messageQueue = [];
            }
            break;

          case 'ping':
            this.ws?.send(JSON.stringify({ type: 'pong' }));
            break;
        }

        // Notify all listeners
        this.listeners.forEach(listener => {
          listener.onMessage?.(data);
        });
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateConnectionStatus('error');
    };

    this.ws.onclose = (event) => {
      console.warn('WebSocket disconnected:', event.code, event.reason);
      this.updateConnectionStatus('disconnected');
      this.ws = null;
      this.unacknowledgedChunks = 0;

      // Exponential backoff for reconnection
      if (this.shouldReconnect && !this.reconnectTimeout) {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
        
        console.warn(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          this.connect();
        }, delay);
      }
    };
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    this.connectionStatus = status;
    this.listeners.forEach(listener => {
      listener.onConnectionChange?.(status);
    });
  }

  private async processMessageQueue(): Promise<void> {
    if (this.processing || this.messageQueue.length === 0) {
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.processing = true;

    while (this.messageQueue.length > 0 && this.unacknowledgedChunks < this.maxUnacknowledgedChunks) {
      const message = this.messageQueue.shift();
      if (message) {
        if (message instanceof Blob || message instanceof ArrayBuffer || typeof message === 'string') {
          this.unacknowledgedChunks++;
          this.ws.send(message);
        }
      }
    }

    this.processing = false;
  }

  send(data: string | ArrayBuffer | Blob): boolean {
    if (data instanceof Blob || data instanceof ArrayBuffer) {
      if (this.unacknowledgedChunks >= this.maxUnacknowledgedChunks) {
        console.warn(`Flow control: dropping audio chunk, ${this.unacknowledgedChunks} unacknowledged chunks`);
        return false;
      }
      this.messageQueue.push(data);
      this.processMessageQueue();
      return true;
    } else if (typeof data === 'string') {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(data);
        return true;
      }
    }
    return false;
  }

  sendJSON(message: VoiceSocketMessage): boolean {
    return this.send(JSON.stringify(message));
  }

  addListener(id: string, listener: VoiceSocketListener): void {
    this.listeners.set(id, listener);
    // Immediately notify of current status
    listener.onConnectionChange?.(this.connectionStatus);
  }

  removeListener(id: string): void {
    this.listeners.delete(id);
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    // Clear listeners and queues to prevent memory leaks
    this.listeners.clear();
    this.messageQueue = [];
    this.unacknowledgedChunks = 0;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
    VoiceSocketManager.instance = null;
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
}

export default VoiceSocketManager;