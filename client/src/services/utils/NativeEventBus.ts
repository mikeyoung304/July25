/**
 * Native EventTarget wrapper - replaces custom EventEmitter
 * Uses browser's built-in EventTarget API for better performance and smaller bundle
 */

import { logger } from '@/services/logger';

export class NativeEventBus extends EventTarget {
  private listenerCounts = new Map<string, number>();
  private maxListeners = 10;

  emit(eventType: string, detail?: any): boolean {
    const event = new CustomEvent(eventType, { detail });
    const hadListeners = (this.listenerCounts.get(eventType) || 0) > 0;
    
    if (import.meta.env.DEV) {
      logger.info(`[EventBus] Emitting '${eventType}'`, { 
        listeners: this.listenerCounts.get(eventType) || 0,
        detail 
      });
    }
    
    this.dispatchEvent(event);
    return hadListeners;
  }

  on(eventType: string, handler: (event: CustomEvent) => void): this {
    const count = (this.listenerCounts.get(eventType) || 0) + 1;
    this.listenerCounts.set(eventType, count);
    
    // Warn about potential memory leak
    if (count > this.maxListeners && import.meta.env.DEV) {
      console.warn(
        `[EventBus] Possible memory leak: ${count} listeners for '${eventType}'`
      );
    }
    
    this.addEventListener(eventType, handler as EventListener);
    return this;
  }

  off(eventType: string, handler: (event: CustomEvent) => void): this {
    const count = this.listenerCounts.get(eventType) || 0;
    if (count > 0) {
      this.listenerCounts.set(eventType, count - 1);
    }
    
    this.removeEventListener(eventType, handler as EventListener);
    return this;
  }

  removeAllListeners(eventType?: string): this {
    if (eventType) {
      // Remove specific event type
      this.listenerCounts.delete(eventType);
      // Note: Can't remove all listeners for a specific event with native API
      // Users must remove their specific handlers
    } else {
      // Clear all tracking
      this.listenerCounts.clear();
    }
    return this;
  }

  listenerCount(eventType: string): number {
    return this.listenerCounts.get(eventType) || 0;
  }

  setMaxListeners(n: number): this {
    this.maxListeners = n;
    return this;
  }
}

// Export a compat layer for easier migration
export class EventEmitter extends NativeEventBus {
  // Compatibility shim - same API as old EventEmitter
}