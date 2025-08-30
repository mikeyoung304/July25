/**
 * Browser-only WebSocket Pool Implementation
 * Moved from websocket-pool.ts to separate browser concerns from server compilation
 */

// Browser environment check and type declarations
declare const globalThis: typeof global & {
  WebSocket?: typeof WebSocket;
  window?: typeof window;
  IntersectionObserver?: typeof IntersectionObserver;
};

import { ManagedService, CleanupManager } from './cleanup-manager';

// Import MemoryMonitor safely
let MemoryMonitor: any = { forceGarbageCollection: () => {}, getMemoryStatus: () => ({ current: null }) };
// Dynamic import not needed in browser context

export interface WebSocketPoolConfig {
  urls: string[];
  maxConnections: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  messageQueueSize: number;
  loadBalancingStrategy: 'round-robin' | 'least-connections' | 'health-based';
  enableFailover: boolean;
  healthCheckInterval: number;
}

export interface PooledWebSocketConnection {
  id: string;
  url: string;
  socket: any; // WebSocket type, but browser-safe
  state: 'connecting' | 'connected' | 'disconnected' | 'failed';
  lastActivity: number;
  messagesSent: number;
  messagesReceived: number;
  health: number; // 0-1 score
  reconnectAttempts: number;
  lastError?: Error;
  messageQueue: WebSocketMessage[];
}

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  maxRetries?: number;
  retryCount?: number;
}

export interface MessageSubscription {
  id: string;
  pattern: string | RegExp;
  callback: (message: WebSocketMessage, connectionId: string) => void;
  connectionPreference?: string[];
}

export interface PoolHealth {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageHealth: number;
  messageQueueSize: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
}

export interface PoolStatistics {
  health: PoolHealth;
  connections: Record<string, {
    url: string;
    state: string;
    health: number;
    messagesSent: number;
    messagesReceived: number;
    lastActivity: number;
    reconnectAttempts: number;
  }>;
  loadBalancing: {
    strategy: string;
    currentSelection: string | null;
  };
}

/**
 * Enterprise WebSocket Connection Pool
 * Browser-only implementation with automatic failover and load balancing
 */
export class WebSocketPool extends ManagedService {
  private config: WebSocketPoolConfig;
  private connections = new Map<string, PooledWebSocketConnection>();
  private subscriptions = new Map<string, MessageSubscription>();
  private loadBalancingIndex = 0;
  private heartbeatTimer: NodeJS.Timeout | undefined = undefined;
  private healthCheckTimer: NodeJS.Timeout | undefined = undefined;
  private messageId = 0;

  constructor(config: Partial<WebSocketPoolConfig> = {}) {
    super('WebSocketPool');

    this.config = {
      urls: [],
      maxConnections: 5,
      maxReconnectAttempts: 3,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
      messageQueueSize: 100,
      loadBalancingStrategy: 'health-based',
      enableFailover: true,
      healthCheckInterval: 5000,
      ...config
    };

    this.setupResourceCleanup();
  }

  private setupResourceCleanup(): void {
    CleanupManager.register({
      id: `websocket-pool-${this.id}`,
      cleanup: () => this.cleanup(),
      priority: 'high'
    });
  }

  /**
   * Initialize connections to all configured URLs
   */
  async connect(): Promise<boolean> {
    if (this.config.urls.length === 0) {
      throw new Error('No WebSocket URLs configured');
    }

    try {
      // Create connections
      const connectionPromises = this.config.urls.slice(0, this.config.maxConnections).map(url => 
        this.createConnection(url)
      );

      await Promise.allSettled(connectionPromises);

      // Start health monitoring
      this.startHealthMonitoring();

      return this.getActiveConnections().length > 0;
    } catch (error) {
      console.error('WebSocketPool connection failed:', error);
      return false;
    }
  }

  /**
   * Create a single WebSocket connection
   */
  private async createConnection(url: string): Promise<PooledWebSocketConnection> {
    const connection: PooledWebSocketConnection = {
      id: `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      socket: new WebSocket(url),
      state: 'connecting',
      lastActivity: Date.now(),
      messagesSent: 0,
      messagesReceived: 0,
      health: 1.0,
      reconnectAttempts: 0,
      messageQueue: []
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        connection.state = 'failed';
        connection.lastError = new Error('Connection timeout');
        reject(connection.lastError);
      }, this.config.connectionTimeout);

      connection.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        connection.state = 'connected';
        connection.lastActivity = Date.now();
        this.connections.set(connection.id, connection);
        this.setupConnectionEventHandlers(connection);
        resolve(connection);
      });

      connection.socket.addEventListener('error', (error) => {
        clearTimeout(timeout);
        connection.state = 'failed';
        connection.lastError = new Error(`WebSocket error: ${error}`);
        reject(connection.lastError);
      });
    });
  }

  /**
   * Setup event handlers for a connection
   */
  private setupConnectionEventHandlers(connection: PooledWebSocketConnection): void {
    connection.socket.addEventListener('message', (event) => {
      connection.lastActivity = Date.now();
      connection.messagesReceived++;
      
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleIncomingMessage(message, connection.id);
      } catch (error) {
        console.warn('Invalid WebSocket message format:', event.data);
      }
    });

    connection.socket.addEventListener('close', (event) => {
      connection.state = 'disconnected';
      this.handleConnectionClose(connection, event.code, event.reason);
    });

    connection.socket.addEventListener('error', (error) => {
      connection.state = 'failed';
      connection.lastError = new Error(`Connection error: ${error}`);
      connection.health = Math.max(0, connection.health - 0.2);
    });
  }

  /**
   * Handle incoming messages and route to subscriptions
   */
  private handleIncomingMessage(message: WebSocketMessage, connectionId: string): void {
    for (const subscription of this.subscriptions.values()) {
      if (this.matchesPattern(message, subscription.pattern)) {
        try {
          subscription.callback(message, connectionId);
        } catch (error) {
          console.error('Subscription callback error:', error);
        }
      }
    }
  }

  /**
   * Check if message matches subscription pattern
   */
  private matchesPattern(message: WebSocketMessage, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return message.type === pattern;
    } else {
      return pattern.test(message.type) || pattern.test(JSON.stringify(message.data));
    }
  }

  /**
   * Handle connection close and attempt reconnection
   */
  private handleConnectionClose(connection: PooledWebSocketConnection, code: number, reason: string): void {
    console.log(`WebSocket connection closed: ${connection.url} (${code}: ${reason})`);
    
    if (this.config.enableFailover && connection.reconnectAttempts < this.config.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectConnection(connection);
      }, this.config.reconnectDelay * Math.pow(2, connection.reconnectAttempts));
    } else {
      this.connections.delete(connection.id);
    }
  }

  /**
   * Attempt to reconnect a failed connection
   */
  private async reconnectConnection(connection: PooledWebSocketConnection): Promise<void> {
    connection.reconnectAttempts++;
    
    try {
      const newConnection = await this.createConnection(connection.url);
      this.connections.delete(connection.id);
      console.log(`WebSocket reconnected: ${connection.url}`);
    } catch (error) {
      console.warn(`WebSocket reconnection failed: ${connection.url}`, error);
      connection.health = Math.max(0, connection.health - 0.3);
    }
  }

  /**
   * Send message through the pool
   */
  send(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    const fullMessage: WebSocketMessage = {
      ...message,
      id: `msg-${++this.messageId}`,
      timestamp: Date.now()
    };

    const connection = this.selectConnection(fullMessage);
    if (!connection) {
      console.warn('No available connections for message:', fullMessage.type);
      return false;
    }

    return this.sendToConnection(connection, fullMessage);
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connection: PooledWebSocketConnection, message: WebSocketMessage): boolean {
    if (connection.state !== 'connected') {
      // Queue message for later
      if (connection.messageQueue.length < this.config.messageQueueSize) {
        connection.messageQueue.push(message);
      }
      return false;
    }

    try {
      connection.socket.send(JSON.stringify(message));
      connection.lastActivity = Date.now();
      connection.messagesSent++;
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      connection.health = Math.max(0, connection.health - 0.1);
      return false;
    }
  }

  /**
   * Select best connection for message using load balancing strategy
   */
  private selectConnection(message: WebSocketMessage): PooledWebSocketConnection | null {
    const activeConnections = this.getActiveConnections();
    if (activeConnections.length === 0) {
      return null;
    }

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.selectRoundRobin(activeConnections);
      
      case 'least-connections':
        return this.selectLeastConnections(activeConnections);
      
      case 'health-based':
      default:
        return this.selectHealthBased(activeConnections);
    }
  }

  /**
   * Round-robin connection selection
   */
  private selectRoundRobin(connections: PooledWebSocketConnection[]): PooledWebSocketConnection {
    this.loadBalancingIndex = (this.loadBalancingIndex + 1) % connections.length;
    return connections[this.loadBalancingIndex];
  }

  /**
   * Select connection with least queued messages
   */
  private selectLeastConnections(connections: PooledWebSocketConnection[]): PooledWebSocketConnection {
    return connections.reduce((best, current) => 
      current.messageQueue.length < best.messageQueue.length ? current : best
    );
  }

  /**
   * Select healthiest connection
   */
  private selectHealthBased(connections: PooledWebSocketConnection[]): PooledWebSocketConnection {
    return connections.reduce((best, current) => 
      current.health > best.health ? current : best
    );
  }

  /**
   * Get active connections
   */
  private getActiveConnections(): PooledWebSocketConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.state === 'connected');
  }

  /**
   * Subscribe to messages matching pattern
   */
  subscribe(
    pattern: string | RegExp,
    callback: (message: WebSocketMessage, connectionId: string) => void,
    connectionPreference?: string[]
  ): () => void {
    const subscription: MessageSubscription = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pattern,
      callback,
      ...(connectionPreference && { connectionPreference })
    };

    this.subscriptions.set(subscription.id, subscription);

    return () => {
      this.subscriptions.delete(subscription.id);
    };
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck(): void {
    for (const connection of this.connections.values()) {
      // Decrease health if connection is inactive
      const inactiveTime = Date.now() - connection.lastActivity;
      if (inactiveTime > this.config.heartbeatInterval * 2) {
        connection.health = Math.max(0, connection.health - 0.1);
      }

      // Process queued messages if connection is healthy
      if (connection.state === 'connected' && connection.messageQueue.length > 0) {
        this.processMessageQueue(connection);
      }
    }
  }

  /**
   * Process queued messages for a connection
   */
  private processMessageQueue(connection: PooledWebSocketConnection): void {
    const messages = connection.messageQueue.splice(0, 10); // Process up to 10 messages at once
    
    for (const message of messages) {
      if (!this.sendToConnection(connection, message)) {
        // Re-queue if send failed
        connection.messageQueue.unshift(message);
        break;
      }
    }
  }

  /**
   * Send heartbeat to all connections
   */
  private sendHeartbeat(): void {
    const heartbeat: WebSocketMessage = {
      id: `heartbeat-${Date.now()}`,
      type: 'heartbeat',
      data: { timestamp: Date.now() },
      timestamp: Date.now(),
      priority: 'low'
    };

    for (const connection of this.getActiveConnections()) {
      this.sendToConnection(connection, heartbeat);
    }
  }

  /**
   * Get pool health status
   */
  getHealthStatus(): PoolHealth {
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(conn => conn.state === 'connected');
    const failedConnections = connections.filter(conn => conn.state === 'failed');

    return {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      failedConnections: failedConnections.length,
      averageHealth: connections.reduce((sum, conn) => sum + conn.health, 0) / connections.length,
      messageQueueSize: connections.reduce((sum, conn) => sum + conn.messageQueue.length, 0),
      totalMessagesSent: connections.reduce((sum, conn) => sum + conn.messagesSent, 0),
      totalMessagesReceived: connections.reduce((sum, conn) => sum + conn.messagesReceived, 0)
    };
  }

  /**
   * Get detailed statistics
   */
  getStatistics(): PoolStatistics {
    const health = this.getHealthStatus();
    const connections: Record<string, any> = {};

    for (const [id, conn] of this.connections.entries()) {
      connections[id] = {
        url: conn.url,
        state: conn.state,
        health: conn.health,
        messagesSent: conn.messagesSent,
        messagesReceived: conn.messagesReceived,
        lastActivity: conn.lastActivity,
        reconnectAttempts: conn.reconnectAttempts
      };
    }

    return {
      health,
      connections,
      loadBalancing: {
        strategy: this.config.loadBalancingStrategy,
        currentSelection: this.getActiveConnections()[this.loadBalancingIndex]?.id || null
      }
    };
  }

  /**
   * Disconnect all connections and cleanup
   */
  disconnect(): void {
    this.cleanup();
  }

  /**
   * Cleanup all resources
   */
  protected async cleanup(): Promise<void> {
    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    // Close all connections
    for (const connection of this.connections.values()) {
      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.close();
        }
      } catch (error) {
        console.warn('Error closing WebSocket connection:', error);
      }
    }

    // Clear collections
    this.connections.clear();
    this.subscriptions.clear();

    console.log('WebSocketPool cleanup completed');
  }
}

/**
 * Factory function to create WebSocketPool instance
 */
export function createWebSocketPool(config: Partial<WebSocketPoolConfig> = {}): WebSocketPool {
  return new WebSocketPool(config);
}