/**
 * Browser-compatible EventEmitter implementation
 * Provides a simple event emitter for WebSocket service
 */

type EventHandler = (...args: any[]) => void

export class EventEmitter {
  private events = new Map<string, Set<EventHandler>>()

  on(event: string, handler: EventHandler): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(handler)
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
    if (!handlers || handlers.size === 0) {
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