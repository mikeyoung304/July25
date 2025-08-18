import { VoiceSocketMessage } from '../hooks/useVoiceSocket';
import { RuntimeMemoryMonitor } from '@rebuild/shared';

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
  private status: 'uninitialized' | 'initializing' | 'ready' = 'uninitialized';
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
  private memoryMonitorInterval: number | null = null;
  private unregisterWebSocket: (() => void) | null = null;
  private cleanupCallbacks: (() => void)[] = [];

  private constructor(url: string) {
    this.url = url;
    this.setupMemoryMonitoring();
  }

  private registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  private registerWebSocket(id: string, ws: WebSocket): () => void {
    // Return a cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }

  private registerInterval(id: string, interval: NodeJS.Timeout): void {
    // Register interval for cleanup tracking
    this.registerCleanup(() => {
      clearTimeout(interval);
    });
  }

  static getInstance(url: string): VoiceSocketManager {
    if (!VoiceSocketManager.instance) {
      VoiceSocketManager.instance = new VoiceSocketManager(url);
      VoiceSocketManager.instance.initialize();
    }
    return VoiceSocketManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.status !== 'uninitialized') {
      return;
    }
    
    this.status = 'initializing';
    
    // Setup cleanup for reconnection timeout
    this.registerCleanup(() => {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    });
    
    // Setup cleanup for memory monitoring
    this.registerCleanup(() => {
      if (this.memoryMonitorInterval) {
        clearInterval(this.memoryMonitorInterval);
        this.memoryMonitorInterval = null;
      }
    });
    
    this.status = 'ready';
    console.log('VoiceSocketManager initialized with enterprise cleanup patterns');
  }

  private setupMemoryMonitoring(): void {
    // Monitor memory usage every 30 seconds
    this.memoryMonitorInterval = window.setInterval(() => {
      const memoryInfo = RuntimeMemoryMonitor.getMemoryTrend();
      
      if (memoryInfo.leakWarning) {
        console.warn('VoiceSocketManager: Memory leak detected', {
          current: memoryInfo.current,
          trend: memoryInfo.trend,
          listeners: this.listeners.size,
          queueSize: this.messageQueue.length,
          unacknowledgedChunks: this.unacknowledgedChunks
        });
        
        // Auto-cleanup on memory pressure
        this.performEmergencyCleanup();
      }
    }, 30000);
  }

  private performEmergencyCleanup(): void {
    console.log('VoiceSocketManager: Performing emergency cleanup due to memory pressure');
    
    // Clear message queue
    this.messageQueue = [];
    
    // Reset counters
    this.unacknowledgedChunks = 0;
    
    // Remove stale listeners (keep only recent ones)
    if (this.listeners.size > 10) {
      const listenerEntries = Array.from(this.listeners.entries());
      const keepCount = Math.min(5, listenerEntries.length);
      const recentListeners = listenerEntries.slice(-keepCount);
      
      this.listeners.clear();
      recentListeners.forEach(([id, listener]) => {
        this.listeners.set(id, listener);
      });
      
      console.log(`Cleaned up listeners: ${listenerEntries.length} -> ${this.listeners.size}`);
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.updateConnectionStatus('connecting');
    this.ws = new WebSocket(this.url);
    
    // Register WebSocket for automatic cleanup
    if (this.unregisterWebSocket) {
      this.unregisterWebSocket();
    }
    this.unregisterWebSocket = this.registerWebSocket('primary', this.ws);

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
        
        // Register timeout for cleanup
        this.registerInterval('reconnect', this.reconnectTimeout);
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
    console.log('VoiceSocketManager: Starting graceful disconnect...');
    this.shouldReconnect = false;
    
    // Trigger managed cleanup
    this.cleanup().catch(error => {
      console.error('VoiceSocketManager cleanup failed:', error);
    });
  }

  async cleanup(): Promise<void> {
    console.log('VoiceSocketManager: Performing managed cleanup...');
    
    // Clear state
    this.shouldReconnect = false;
    
    // Clear listeners and queues to prevent memory leaks
    this.listeners.clear();
    this.messageQueue = [];
    this.unacknowledgedChunks = 0;
    
    // Cleanup WebSocket properly
    if (this.unregisterWebSocket) {
      this.unregisterWebSocket();
      this.unregisterWebSocket = null;
    }
    
    // Close WebSocket if still open
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Service cleanup');
    }
    this.ws = null;
    
    // Reset singleton instance
    VoiceSocketManager.instance = null;
    
    // Cleanup completed
    
    console.log('VoiceSocketManager: Cleanup completed');
  }

  isHealthy(): boolean {
    return this.connectionStatus === 'connected' && 
           this.listeners.size < 50 && // Reasonable listener limit
           this.messageQueue.length < 100 && // Reasonable queue limit
           this.unacknowledgedChunks < this.maxUnacknowledgedChunks;
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }
}

export default VoiceSocketManager;