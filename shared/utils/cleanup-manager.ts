/**
 * Enterprise-Grade Cleanup Manager
 * Provides centralized resource management and cleanup patterns for singleton services
 * 
 * ENTERPRISE FEATURES:
 * - Automatic cleanup on page unload
 * - Service lifecycle management
 * - Memory leak prevention
 * - Resource tracking and monitoring
 * - Graceful shutdown patterns
 */

// Type declarations for environments where DOM types may not be available
declare global {
  interface WebSocket {
    readonly readyState: number;
    close(code?: number, reason?: string): void;
    addEventListener(type: string, listener: EventListener, options?: boolean | AddEventListenerOptions): void;
    removeEventListener(type: string, listener: EventListener): void;
  }
}

export interface CleanupResource {
  id: string;
  name: string;
  cleanup: () => void | Promise<void>;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'websocket' | 'subscription' | 'interval' | 'listener' | 'media' | 'service';
}

export interface ServiceLifecycle {
  initialize(): void | Promise<void>;
  cleanup(): void | Promise<void>;
  getStatus(): 'uninitialized' | 'initializing' | 'ready' | 'cleaning' | 'destroyed';
  isHealthy(): boolean;
}

class CleanupManagerImpl {
  private resources = new Map<string, CleanupResource>();
  private services = new Map<string, ServiceLifecycle>();
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;
  private cleanupOrder: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
  
  constructor() {
    this.setupGlobalCleanup();
  }
  
  /**
   * Register a cleanup resource
   */
  register(resource: CleanupResource): () => void {
    if (this.isShuttingDown) {
      console.warn(`Cannot register resource ${resource.id} during shutdown`);
      return () => {};
    }
    
    this.resources.set(resource.id, resource);
    
    // Return unregister function
    return () => {
      this.resources.delete(resource.id);
    };
  }
  
  /**
   * Register a service with full lifecycle management
   */
  registerService<T extends ServiceLifecycle>(
    name: string,
    service: T,
    cleanup?: () => void | Promise<void>
  ): T {
    if (this.isShuttingDown) {
      throw new Error(`Cannot register service ${name} during shutdown`);
    }
    
    this.services.set(name, service);
    
    // Auto-register cleanup if provided
    if (cleanup) {
      this.register({
        id: `service-${name}`,
        name: `Service: ${name}`,
        cleanup,
        priority: 'high',
        category: 'service'
      });
    }
    
    return service;
  }
  
  /**
   * Register WebSocket connection cleanup
   */
  registerWebSocket(
    id: string,
    websocket: any, // Using any to avoid DOM dependency issues
    options: { 
      closeCode?: number;
      closeReason?: string;
      timeout?: number;
    } = {}
  ): () => void {
    const { closeCode = 1000, closeReason = 'Normal closure', timeout = 5000 } = options;
    
    return this.register({
      id: `websocket-${id}`,
      name: `WebSocket: ${id}`,
      cleanup: async () => {
        if (websocket && typeof websocket.close === 'function') {
          const CONNECTING = 0;
          const OPEN = 1;
          const CLOSED = 3;
          
          if (websocket.readyState === OPEN || websocket.readyState === CONNECTING) {
            websocket.close(closeCode, closeReason);
            
            // Wait for close with timeout
            await new Promise<void>((resolve) => {
              const timeoutId = setTimeout(resolve, timeout);
              
              const onClose = () => {
                clearTimeout(timeoutId);
                if (websocket.removeEventListener) {
                  websocket.removeEventListener('close', onClose);
                }
                resolve();
              };
              
              if (websocket.readyState === CLOSED) {
                clearTimeout(timeoutId);
                resolve();
              } else if (websocket.addEventListener) {
                websocket.addEventListener('close', onClose, { once: true });
              } else {
                // Fallback if addEventListener not available
                resolve();
              }
            });
          }
        }
      },
      priority: 'critical',
      category: 'websocket'
    });
  }
  
  /**
   * Register subscription cleanup
   */
  registerSubscription(
    id: string,
    unsubscribe: () => void,
    name?: string
  ): () => void {
    return this.register({
      id: `subscription-${id}`,
      name: name || `Subscription: ${id}`,
      cleanup: unsubscribe,
      priority: 'high',
      category: 'subscription'
    });
  }
  
  /**
   * Register interval/timeout cleanup
   */
  registerInterval(
    id: string,
    intervalId: number | NodeJS.Timeout,
    name?: string
  ): () => void {
    return this.register({
      id: `interval-${id}`,
      name: name || `Interval: ${id}`,
      cleanup: () => clearInterval(intervalId as number),
      priority: 'medium',
      category: 'interval'
    });
  }
  
  /**
   * Register event listener cleanup
   */
  registerEventListener<T extends EventTarget>(
    id: string,
    target: T,
    event: string,
    listener: any, // Using any to avoid DOM dependency issues
    name?: string
  ): () => void {
    return this.register({
      id: `listener-${id}`,
      name: name || `Listener: ${id}`,
      cleanup: () => {
        if (target && typeof target.removeEventListener === 'function') {
          target.removeEventListener(event, listener);
        }
      },
      priority: 'medium',
      category: 'listener'
    });
  }
  
  /**
   * Register media stream cleanup
   */
  registerMediaStream(
    id: string,
    stream: any, // Using any to avoid DOM dependency issues
    name?: string
  ): () => void {
    return this.register({
      id: `media-${id}`,
      name: name || `MediaStream: ${id}`,
      cleanup: () => {
        if (stream && typeof stream.getTracks === 'function') {
          const tracks = stream.getTracks();
          if (Array.isArray(tracks)) {
            tracks.forEach((track: any) => {
              if (track && typeof track.stop === 'function') {
                track.stop();
              }
            });
          }
        }
      },
      priority: 'critical',
      category: 'media'
    });
  }
  
  /**
   * Manually cleanup a specific resource
   */
  async cleanup(resourceId: string): Promise<boolean> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return false;
    }
    
    try {
      await resource.cleanup();
      this.resources.delete(resourceId);
      return true;
    } catch (error) {
      console.error(`Failed to cleanup resource ${resourceId}:`, error);
      return false;
    }
  }
  
  /**
   * Cleanup all resources by priority
   */
  async shutdownAll(): Promise<void> {
    if (this.isShuttingDown) {
      return this.shutdownPromise || Promise.resolve();
    }
    
    this.isShuttingDown = true;
    
    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }
  
  private async performShutdown(): Promise<void> {
    console.warn('CleanupManager: Starting graceful shutdown...');
    
    const resourcesByPriority = this.groupResourcesByPriority();
    
    for (const priority of this.cleanupOrder) {
      const resources = resourcesByPriority[priority] || [];
      
      if (resources.length > 0) {
        console.warn(`CleanupManager: Cleaning up ${resources.length} ${priority} priority resources...`);
        
        // Cleanup resources in parallel within the same priority level
        await Promise.allSettled(
          resources.map(async (resource) => {
            try {
              await resource.cleanup();
              console.warn(`✓ Cleaned up: ${resource.name}`);
            } catch (error) {
              console.error(`✗ Failed to cleanup ${resource.name}:`, error);
            }
          })
        );
      }
    }
    
    // Cleanup services
    const serviceCleanups = Array.from(this.services.values()).map(async (service) => {
      try {
        if (service.getStatus() !== 'destroyed') {
          await service.cleanup();
        }
      } catch (error) {
        console.error('Service cleanup failed:', error);
      }
    });
    
    await Promise.allSettled(serviceCleanups);
    
    this.resources.clear();
    this.services.clear();
    
    console.warn('CleanupManager: Graceful shutdown completed');
  }
  
  private groupResourcesByPriority(): Record<string, CleanupResource[]> {
    const groups: Record<string, CleanupResource[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };
    
    for (const resource of this.resources.values()) {
      if (groups[resource.priority]) {
        groups[resource.priority].push(resource);
      }
    }
    
    return groups;
  }
  
  /**
   * Get status of all resources
   */
  getStatus(): {
    totalResources: number;
    resourcesByPriority: Record<string, number>;
    resourcesByCategory: Record<string, number>;
    services: Array<{ name: string; status: string; healthy: boolean }>;
    isShuttingDown: boolean;
  } {
    const resourcesByPriority: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    const resourcesByCategory: Record<string, number> = {
      websocket: 0,
      subscription: 0,
      interval: 0,
      listener: 0,
      media: 0,
      service: 0
    };
    
    for (const resource of this.resources.values()) {
      if (resourcesByPriority[resource.priority] !== undefined) {
        resourcesByPriority[resource.priority]++;
      }
      if (resourcesByCategory[resource.category] !== undefined) {
        resourcesByCategory[resource.category]++;
      }
    }
    
    const services = Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      status: service.getStatus(),
      healthy: service.isHealthy()
    }));
    
    return {
      totalResources: this.resources.size,
      resourcesByPriority,
      resourcesByCategory,
      services,
      isShuttingDown: this.isShuttingDown
    };
  }
  
  /**
   * Setup global cleanup handlers
   */
  private setupGlobalCleanup(): void {
    // Browser environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      const win = globalThis as any;
      // Handle page unload
      if (win.window && win.window.addEventListener) {
        win.window.addEventListener('beforeunload', () => {
          // Synchronous cleanup only
          const criticalResources = Array.from(this.resources.values())
            .filter(r => r.priority === 'critical');
          
          criticalResources.forEach(resource => {
            try {
              const result = resource.cleanup();
              // If it returns a promise, we can't wait for it in beforeunload
              if (result instanceof Promise) {
                console.warn(`Critical resource ${resource.name} cleanup is async and may not complete`);
              }
            } catch (error) {
              console.error(`Emergency cleanup failed for ${resource.name}:`, error);
            }
          });
        });
        
        // Handle page hide (more reliable than beforeunload)
        win.window.addEventListener('pagehide', () => {
          this.shutdownAll().catch(error => {
            console.error('Emergency shutdown failed:', error);
          });
        });
      }
      
      // Handle visibility change (app backgrounded)
      if (win.document && win.document.addEventListener) {
        win.document.addEventListener('visibilitychange', () => {
          if (win.document.visibilityState === 'hidden') {
            // Cleanup non-critical resources when app is backgrounded
            const nonCriticalResources = Array.from(this.resources.values())
              .filter(r => r.priority === 'low' || r.priority === 'medium');
            
            nonCriticalResources.forEach(resource => {
              this.cleanup(resource.id).catch(error => {
                console.error(`Background cleanup failed for ${resource.name}:`, error);
              });
            });
          }
        });
      }
    }
    
    // Node.js environment
    if (typeof process !== 'undefined') {
      const gracefulShutdown = (signal: string) => {
        console.warn(`Received ${signal}, starting graceful shutdown...`);
        this.shutdownAll()
          .then(() => {
            console.warn('Graceful shutdown completed');
            process.exit(0);
          })
          .catch((error) => {
            console.error('Graceful shutdown failed:', error);
            process.exit(1);
          });
      };
      
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      
      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        console.error('Uncaught exception, emergency shutdown:', error);
        this.shutdownAll()
          .finally(() => process.exit(1));
      });
      
      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason) => {
        console.error('Unhandled promise rejection:', reason);
        // Don't shut down immediately, just log
      });
    }
  }
}

// Singleton instance
export const CleanupManager = new CleanupManagerImpl();

// Base class for services with automatic cleanup
export abstract class ManagedService implements ServiceLifecycle {
  protected status: 'uninitialized' | 'initializing' | 'ready' | 'cleaning' | 'destroyed' = 'uninitialized';
  protected cleanupRegistry: Array<() => void | Promise<void>> = [];
  
  constructor(protected serviceName: string) {
    CleanupManager.registerService(serviceName, this, () => this.cleanup());
  }
  
  protected registerCleanup(cleanup: () => void | Promise<void>): void {
    this.cleanupRegistry.push(cleanup);
  }
  
  protected registerWebSocket(id: string, ws: any): () => void {
    const unregister = CleanupManager.registerWebSocket(`${this.serviceName}-${id}`, ws);
    this.registerCleanup(unregister);
    return unregister;
  }
  
  protected registerSubscription(id: string, unsubscribe: () => void): () => void {
    const unregister = CleanupManager.registerSubscription(`${this.serviceName}-${id}`, unsubscribe);
    this.registerCleanup(unregister);
    return unregister;
  }
  
  protected registerInterval(id: string, intervalId: number | NodeJS.Timeout): () => void {
    const unregister = CleanupManager.registerInterval(`${this.serviceName}-${id}`, intervalId);
    this.registerCleanup(unregister);
    return unregister;
  }
  
  public abstract initialize(): void | Promise<void>;
  
  public async cleanup(): Promise<void> {
    if (this.status === 'cleaning' || this.status === 'destroyed') {
      return;
    }
    
    this.status = 'cleaning';
    
    // Run all registered cleanups
    await Promise.allSettled(
      this.cleanupRegistry.map(async (cleanup) => {
        try {
          await cleanup();
        } catch (error) {
          console.error(`Cleanup failed in ${this.serviceName}:`, error);
        }
      })
    );
    
    this.cleanupRegistry = [];
    this.status = 'destroyed';
  }
  
  public getStatus(): 'uninitialized' | 'initializing' | 'ready' | 'cleaning' | 'destroyed' {
    return this.status;
  }
  
  public isHealthy(): boolean {
    return this.status === 'ready';
  }
}

// Memory monitoring utilities
export class CleanupMemoryMonitor {
  private static measurements: Array<{ timestamp: number; used: number; total: number }> = [];
  private static maxMeasurements = 100;
  
  static measure(): { used: number; total: number } | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const measurement = {
        timestamp: Date.now(),
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize
      };
      
      this.measurements.push(measurement);
      
      // Keep only recent measurements
      if (this.measurements.length > this.maxMeasurements) {
        this.measurements = this.measurements.slice(-this.maxMeasurements);
      }
      
      return { used: measurement.used, total: measurement.total };
    }
    
    return null;
  }
  
  static getMemoryTrend(): {
    current: { used: number; total: number } | null;
    trend: 'increasing' | 'decreasing' | 'stable' | 'unknown';
    leakWarning: boolean;
  } {
    const current = this.measure();
    
    if (this.measurements.length < 10) {
      return { current, trend: 'unknown', leakWarning: false };
    }
    
    const recent = this.measurements.slice(-10);
    const older = this.measurements.slice(-20, -10);
    
    if (older.length === 0) {
      return { current, trend: 'unknown', leakWarning: false };
    }
    
    const recentAvg = recent.reduce((sum, m) => sum + m.used, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.used, 0) / older.length;
    
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (percentChange > 5) trend = 'increasing';
    else if (percentChange < -5) trend = 'decreasing';
    
    // Memory leak warning if consistently increasing
    const leakWarning = trend === 'increasing' && percentChange > 20;
    
    return { current, trend, leakWarning };
  }
}