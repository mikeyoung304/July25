/**
 * Enterprise WebSocket Service
 * Implements enterprise-grade WebSocket management with automatic cleanup,
 * memory monitoring, and connection pooling
 */

import { EventEmitter } from '@/services/utils/EventEmitter';
import { getCurrentRestaurantId } from '@/services/http/httpClient';
import { toCamelCase, toSnakeCase } from '@/services/utils/caseTransform';
import { env } from '@/utils/env';
import { ManagedService, CleanupManager, MemoryMonitor } from '@rebuild/shared';

export interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  connectionTimeout?: number;
  pingInterval?: number;
  maxMessageQueueSize?: number;
}

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  restaurantId?: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'terminated';

export interface ConnectionStats {
  totalConnections: number;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  lastError?: string;
  uptime: number;
  connectionStartTime: number;
}

/**
 * Enterprise WebSocket Service with managed lifecycle
 */
export class EnterpriseWebSocketService extends ManagedService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private isIntentionallyClosed = false;
  private eventEmitter: EventEmitter;
  private messageQueue: WebSocketMessage[] = [];
  private stats: ConnectionStats;
  private pingTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private unregisterWebSocket: (() => void) | null = null;
  
  constructor(config: WebSocketConfig = {}) {
    super('EnterpriseWebSocketService');
    
    this.eventEmitter = new EventEmitter();
    
    // Set default configuration
    this.config = {
      url: config.url || this.buildWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      connectionTimeout: config.connectionTimeout || 15000,
      pingInterval: config.pingInterval || 30000,
      maxMessageQueueSize: config.maxMessageQueueSize || 100
    };
    
    this.stats = {
      totalConnections: 0,
      reconnectAttempts: 0,
      messagesSent: 0,
      messagesReceived: 0,
      uptime: 0,
      connectionStartTime: 0
    };
  }

  async initialize(): Promise<void> {
    if (this.status !== 'uninitialized') {
      return;
    }
    
    this.status = 'initializing';
    
    // Setup cleanup for timers
    this.registerCleanup(() => {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
    });
    
    // Setup cleanup for event emitter
    this.registerCleanup(() => {
      this.eventEmitter.removeAllListeners();
    });
    
    // Setup cleanup for message queue
    this.registerCleanup(() => {
      this.messageQueue = [];
    });
    
    this.status = 'ready';
    console.log('EnterpriseWebSocketService initialized');
  }

  /**
   * Build WebSocket URL based on API base URL
   */
  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = env.API_BASE_URL ? 
      env.API_BASE_URL.replace(/^https?:\/\//, '') : 
      window.location.host;
    
    return `${protocol}//${host}`;
  }

  /**
   * Connect to WebSocket with enterprise features
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN || 
        this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    if (this.status !== 'ready') {
      throw new Error('Service not initialized');
    }

    this.updateConnectionState('connecting');
    this.isIntentionallyClosed = false;
    
    try {
      this.ws = new WebSocket(this.config.url);
      this.stats.totalConnections++;
      this.stats.connectionStartTime = Date.now();
      
      // Register WebSocket for automatic cleanup
      if (this.unregisterWebSocket) {
        this.unregisterWebSocket();
      }
      this.unregisterWebSocket = this.registerWebSocket('primary', this.ws, {
        timeout: this.config.connectionTimeout
      });
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          console.error('WebSocket connection timeout');
          this.ws.close();
          this.updateConnectionState('error');
        }
      }, this.config.connectionTimeout);
      
      this.registerInterval('connection-timeout', this.connectionTimeout);
      
      this.setupWebSocketHandlers();
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.updateConnectionState('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully');
      
      // Clear connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.updateConnectionState('connected');
      this.reconnectAttempts = 0;
      this.stats.reconnectAttempts = 0;
      
      // Start ping timer
      this.startPingTimer();
      
      // Process queued messages
      this.processMessageQueue();
      
      this.eventEmitter.emit('connected');
    };

    this.ws.onmessage = (event) => {
      this.stats.messagesReceived++;
      
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Handle pong responses
        if (message.type === 'pong') {
          return;
        }
        
        // Transform snake_case to camelCase for client consumption
        const transformedPayload = toCamelCase(message.payload);
        
        this.eventEmitter.emit('message', {
          ...message,
          payload: transformedPayload
        });
        
        // Emit specific message type events
        this.eventEmitter.emit(`message:${message.type}`, transformedPayload);
        
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
        this.eventEmitter.emit('error', { 
          type: 'parse_error', 
          error,
          rawData: event.data 
        });
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.stats.lastError = 'WebSocket error occurred';
      this.updateConnectionState('error');
      this.eventEmitter.emit('error', { type: 'connection_error', error });
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      
      // Update uptime
      if (this.stats.connectionStartTime > 0) {
        this.stats.uptime += Date.now() - this.stats.connectionStartTime;
      }
      
      // Clear timers
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.updateConnectionState('disconnected');
      this.eventEmitter.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Schedule reconnect if not intentionally closed
      if (!this.isIntentionallyClosed && this.status === 'ready') {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Start ping timer to keep connection alive
   */
  private startPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({
          type: 'ping',
          payload: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.pingInterval);
    
    this.registerInterval('ping', this.pingTimer);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessageImmediately(message);
      }
    }
  }

  /**
   * Send message immediately
   */
  private sendMessageImmediately(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      // Transform camelCase to snake_case for server
      const transformedPayload = toSnakeCase(message.payload);
      const serverMessage = {
        ...message,
        payload: transformedPayload,
        restaurant_id: message.restaurantId || getCurrentRestaurantId()
      };

      this.ws.send(JSON.stringify(serverMessage));
      this.stats.messagesSent++;
      return true;
      
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      this.eventEmitter.emit('error', { type: 'send_error', error, message });
      return false;
    }
  }

  /**
   * Send message with queueing
   */
  sendMessage<T = unknown>(message: WebSocketMessage<T>): boolean {
    // Add restaurant ID if not present
    if (!message.restaurantId) {
      message.restaurantId = getCurrentRestaurantId();
    }

    // If connected, send immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.sendMessageImmediately(message);
    }

    // Otherwise, queue the message
    if (this.messageQueue.length >= this.config.maxMessageQueueSize) {
      console.warn('Message queue is full, dropping oldest message');
      this.messageQueue.shift();
    }

    this.messageQueue.push(message);
    return true;
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: (...args: any[]) => void): () => void {
    this.eventEmitter.on(event, callback);
    
    // Return unsubscribe function and register for cleanup
    const unsubscribe = () => this.eventEmitter.off(event, callback);
    this.registerSubscription(`event-${event}-${Date.now()}`, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Subscribe to specific message types
   */
  onMessage<T = unknown>(
    messageType: string, 
    callback: (payload: T) => void
  ): () => void {
    return this.on(`message:${messageType}`, callback);
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateConnectionState('terminated');
      this.eventEmitter.emit('terminated');
      return;
    }

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.stats.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
    
    this.registerInterval('reconnect', this.reconnectTimer);
  }

  /**
   * Update connection state and emit events
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      const previousState = this.connectionState;
      this.connectionState = state;
      
      this.eventEmitter.emit('stateChange', { 
        from: previousState, 
        to: state,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Disconnect gracefully
   */
  disconnect(): void {
    console.log('EnterpriseWebSocketService: Starting graceful disconnect...');
    this.isIntentionallyClosed = true;
    
    // Trigger managed cleanup
    this.cleanup().catch(error => {
      console.error('EnterpriseWebSocketService cleanup failed:', error);
    });
  }

  /**
   * Managed cleanup implementation
   */
  async cleanup(): Promise<void> {
    console.log('EnterpriseWebSocketService: Performing managed cleanup...');
    
    this.isIntentionallyClosed = true;
    
    // Clear message queue
    this.messageQueue = [];
    
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
    
    this.updateConnectionState('disconnected');
    
    // Call parent cleanup
    await super.cleanup();
    
    console.log('EnterpriseWebSocketService: Cleanup completed');
  }

  /**
   * Health check implementation
   */
  isHealthy(): boolean {
    return super.isHealthy() && 
           this.connectionState === 'connected' && 
           this.messageQueue.length < this.config.maxMessageQueueSize && 
           this.reconnectAttempts < this.config.maxReconnectAttempts;
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    // Update current uptime
    if (this.connectionState === 'connected' && this.stats.connectionStartTime > 0) {
      this.stats.uptime += Date.now() - this.stats.connectionStartTime;
      this.stats.connectionStartTime = Date.now();
    }
    
    return { ...this.stats };
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Force reconnect
   */
  reconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.connect().catch(error => {
      console.error('Manual reconnection failed:', error);
    });
  }

  /**
   * Get service status for monitoring
   */
  getServiceStatus(): {
    status: string;
    connectionState: ConnectionState;
    stats: ConnectionStats;
    config: Required<WebSocketConfig>;
    queueSize: number;
    healthy: boolean;
  } {
    return {
      status: this.getStatus(),
      connectionState: this.connectionState,
      stats: this.getStats(),
      config: this.config,
      queueSize: this.messageQueue.length,
      healthy: this.isHealthy()
    };
  }
}