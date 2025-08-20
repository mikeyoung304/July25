import { logger } from '@/services/logger'

/**
 * Browser-compatible EventEmitter implementation
 * Provides a simple event emitter for WebSocket service
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void

export class EventEmitter {
  private events = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)
    // DIAGNOSTIC: Log handler registration
    logger.info(`[EventEmitter] Handler registered for event '${event}', total handlers: ${this.events.get(event)!.size}`)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } else {
      this.events.clear()
    }
    return this
  }
}