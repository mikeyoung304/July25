/**
 * WebSocket Service for Real-time Updates
 * Implements WebSocket connections for live order updates and kitchen display synchronization
 * Follows Luis's API pattern with automatic reconnection and error handling
 */

import { EventEmitter } from '@/services/utils/EventEmitter'
import { getCurrentRestaurantId } from '@/services/http/httpClient'
import { supabase } from '@/core/supabase'
import { toCamelCase, toSnakeCase } from '@/services/utils/caseTransform'

export interface WebSocketConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface WebSocketMessage<T = unknown> {
  type: string
  payload: T
  timestamp: string
  restaurantId?: string
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<Omit<WebSocketConfig, 'url'>> & { url: string }
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectionState: ConnectionState = 'disconnected'
  private isIntentionallyClosed = false

  constructor(config: WebSocketConfig = {}) {
    super()
    
    // Set default configuration
    this.config = {
      url: config.url || this.buildWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10
    }
  }

  /**
   * Build WebSocket URL based on API base URL
   */
  private buildWebSocketUrl(): string {
    let apiBaseUrl = 'http://localhost:3001'
    
    // Skip import.meta in test environment
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
      try {
        // @ts-ignore - import.meta is available in Vite but not in Jest
        if (import.meta?.env?.VITE_API_BASE_URL) {
          // @ts-ignore
          apiBaseUrl = import.meta.env.VITE_API_BASE_URL
        }
      } catch {
        // Fallback for environments without import.meta
      }
    }
    
    // Convert HTTP to WS protocol
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws')
    return `${wsUrl}/ws`
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.connectionState === 'connected') {
      console.warn('WebSocket already connected')
      return
    }

    this.isIntentionallyClosed = false
    this.setConnectionState('connecting')

    try {
      // Get auth token for WebSocket authentication
      let token = 'test-token' // Default for development
      
      // Try to get real session in production
      if (import.meta.env.PROD) {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No authentication session available')
        }
        token = session.access_token
      }

      // Get restaurant ID with fallback for development
      const restaurantId = getCurrentRestaurantId() || '11111111-1111-1111-1111-111111111111'

      // Build WebSocket URL with auth params
      const wsUrl = new URL(this.config.url)
      wsUrl.searchParams.set('token', token)
      wsUrl.searchParams.set('restaurant_id', restaurantId)

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl.toString())
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      this.setConnectionState('error')
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    this.cleanup()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    this.setConnectionState('disconnected')
  }

  /**
   * Send a message through WebSocket
   */
  send<T = unknown>(type: string, payload: T): void {
    if (!this.isConnected()) {
      console.warn('Cannot send message - WebSocket not connected')
      return
    }

    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      restaurantId: getCurrentRestaurantId() || undefined
    }

    try {
      // Convert to snake_case for backend
      const serializedMessage = JSON.stringify(toSnakeCase(message))
      this.ws!.send(serializedMessage)
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe<T = unknown>(
    messageType: string,
    callback: (payload: T) => void
  ): () => void {
    const handler = (message: WebSocketMessage) => {
      if (message.type === messageType) {
        callback(message.payload as T)
      }
    }
    
    this.on('message', handler)
    
    // Return unsubscribe function
    return () => {
      this.off('message', handler)
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  private handleOpen(): void {
    console.warn('WebSocket connected')
    this.reconnectAttempts = 0
    this.setConnectionState('connected')
    this.emit('connected')
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Parse and convert from snake_case
      const message = toCamelCase(JSON.parse(event.data)) as WebSocketMessage
      
      // Emit generic message event
      this.emit('message', message)
      
      // Emit specific message type event
      this.emit(`message:${message.type}`, message.payload)
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event)
    this.setConnectionState('error')
    this.emit('error', event)
  }

  private handleClose(event: CloseEvent): void {
    console.warn('WebSocket closed:', event.code, event.reason)
    this.setConnectionState('disconnected')
    this.emit('disconnected', event)
    
    // Schedule reconnection if not intentionally closed
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect()
    }
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.emit('stateChange', state)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('maxReconnectAttemptsReached')
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectInterval * this.reconnectAttempts,
      30000 // Max 30 seconds
    )
    
    console.warn(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService()