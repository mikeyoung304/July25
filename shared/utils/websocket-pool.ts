/**
 * WebSocket Pool - Environment Safe Wrapper
 * Provides server-safe WebSocket pool implementation
 */

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

export interface WebSocketMessage {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  maxRetries?: number;
  retryCount?: number;
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

// Type guards for environment detection
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof globalThis !== 'undefined' && 'WebSocket' in globalThis;
}

function isWebSocketAvailable(): boolean {
  return typeof globalThis !== 'undefined' && 'WebSocket' in globalThis;
}

// Server-safe WebSocket Pool implementation
export class WebSocketPool {
  private isBrowser: boolean;
  
  constructor(_config?: Partial<WebSocketPoolConfig>) {
    this.isBrowser = isBrowserEnvironment();
    
    if (!this.isBrowser) {
      console.warn('WebSocketPool: Server environment - WebSocket not available');
    }
  }
  
  async connect(): Promise<boolean> {
    if (!this.isBrowser || !isWebSocketAvailable()) {
      return false;
    }
    
    // In browser, dynamically import and use actual implementation
    try {
      const { WebSocketPool: BrowserWebSocketPool } = await import('./websocket-pool.browser');
      const instance = new BrowserWebSocketPool();
      await instance.initialize(); // Use initialize instead of connect
      return true;
    } catch (e) {
      console.warn('Failed to load browser WebSocket implementation:', e);
      return false;
    }
  }
  
  disconnect(): void {
    // No-op in server environment
  }
  
  send(_message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    return false;
  }
  
  subscribe(
    _pattern: string | RegExp,
    _callback: (message: WebSocketMessage, connectionId: string) => void,
    _connectionPreference?: string[]
  ): () => void {
    return () => {};
  }
  
  unsubscribe(_subscriptionId: string): void {
    // No-op
  }
  
  getHealthStatus(): PoolHealth | null {
    return null;
  }
  
  getStatistics(): PoolStatistics | null {
    return null;
  }
}

export const createWebSocketPool = (config?: Partial<WebSocketPoolConfig>) => 
  new WebSocketPool(config);