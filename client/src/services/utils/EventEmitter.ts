import { logger } from '@/services/logger'

/**
 * Browser-compatible EventEmitter implementation with memory leak prevention
 * Provides a simple event emitter for WebSocket service
 */

 
type EventHandler = (...args: any[]) => void

// Maximum number of listeners per event before warning
const MAX_LISTENERS = 10

export class EventEmitter {
  private events = new Map<string, Set<EventHandler>>()
  private maxListeners = MAX_LISTENERS
  private listenerWarnings = new Set<string>()

  on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    
    const handlers = this.events.get(event)!
    handlers.add(handler)
    
    // Warn about potential memory leak if too many listeners
    if (handlers.size > this.maxListeners && !this.listenerWarnings.has(event)) {
      console.warn(
        `[EventEmitter] WARNING: Possible memory leak detected. ` +
        `${handlers.size} listeners added for event '${event}'. ` +
        `Consider increasing maxListeners or cleaning up old listeners.`
      )
      this.listenerWarnings.add(event)
    }
    
    // DIAGNOSTIC: Log handler registration
    logger.info(`[EventEmitter] Handler registered for event '${event}', total handlers: ${handlers.size}`)
    return this
  }

  off(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.events.delete(event)
      }
    }
    return this
  }

   
  emit(event: string, ...args: any[]): boolean {
    const handlers = this.events.get(event)
    
    // DIAGNOSTIC: Log emission attempt
    logger.info(`[EventEmitter] Emitting '${event}', handlers: ${handlers ? handlers.size : 0}`)
    
    if (!handlers || handlers.size === 0) {
      logger.info(`[EventEmitter] WARNING: No handlers for event '${event}'`)
      return false
    }
    
    handlers.forEach(handler => {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
    
    return true
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event)
      this.listenerWarnings.delete(event)
    } else {
      this.events.clear()
      this.listenerWarnings.clear()
    }
    return this
  }

  setMaxListeners(n: number): this {
    this.maxListeners = n
    return this
  }

  getMaxListeners(): number {
    return this.maxListeners
  }

  listenerCount(event: string): number {
    const handlers = this.events.get(event)
    return handlers ? handlers.size : 0
  }

  eventNames(): string[] {
    return Array.from(this.events.keys())
  }
}