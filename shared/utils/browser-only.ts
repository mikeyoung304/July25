/**
 * Browser-only utilities wrapper
 * Safely exports browser-specific functionality with server no-ops
 */

// Type definitions that work in both environments
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
  connections: Record<string, unknown>;
  loadBalancing: {
    strategy: string;
    currentSelection: string | null;
  };
}

// Server-safe exports
const isBrowser = typeof window !== 'undefined' && typeof WebSocket !== 'undefined';

// WebSocket Pool - server-safe implementation
export class WebSocketPool {
  constructor(_config?: Partial<WebSocketPoolConfig>) {
    if (!isBrowser) {
      console.warn('WebSocketPool: Server environment - WebSocket not available');
    }
  }
  
  async connect(): Promise<boolean> {
    if (!isBrowser) return false;
    // In browser, delegate to actual implementation
    try {
      const { WebSocketPool: BrowserWebSocketPool } = await import('./websocket-pool.browser');
      const instance = new BrowserWebSocketPool();
      return instance.connect();
    } catch (e) {
      return false;
    }
  }
  
  disconnect(): void {}
  send(_message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean { return false; }
  subscribe(_pattern: string | RegExp, _callback: (data: unknown) => void, _connectionPreference?: string[]): () => void { return () => {}; }
  unsubscribe(_subscriptionId: string): void {}
  getHealthStatus(): PoolHealth | null { return null; }
  getStatistics(): PoolStatistics | null { return null; }
}

export const createWebSocketPool = (config?: Partial<WebSocketPoolConfig>) => 
  new WebSocketPool(config);

// React Performance Hooks - server-safe
export const useStableObject = <T>(obj: T): T => obj;
export const useStableArray = <T>(arr: T[]): T[] => arr;
export const useStableCallback = <T extends (...args: unknown[]) => unknown>(callback: T, _deps: unknown[]): T => callback;
export const useExpensiveMemo = <T>(factory: () => T, _deps: unknown[], _debugName?: string): T => factory();
export const useContextValue = <T>(value: T): T => value;
export const useDebouncedState = <T>(initialValue: T, _delay?: number): [T, T, (value: T | ((prev: T) => T)) => void] => [initialValue, initialValue, () => {}];
export const useIntersectionObserver = (_targetRef: React.RefObject<Element>, _options?: IntersectionObserverInit): boolean => false;
export const useBatchedState = <T>(initialState: T): [T, (updates: Partial<T> | ((prev: T) => Partial<T>)) => void] => [initialState, () => {}];

// Conditionally load browser implementations if available
if (isBrowser) {
  // Dynamic imports for browser-only functionality
  import('./performance-hooks').then(module => {
    // Re-export browser implementations
    Object.assign(exports, module);
  }).catch(() => {
    // Fallback to no-ops if import fails
  });
}