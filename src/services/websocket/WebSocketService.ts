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
  heartbeatInterval?: number
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
  private config: Required<WebSocketConfig>
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private connectionState: ConnectionState = 'disconnected'
  private messageQueue: WebSocketMessage[] = []
  private isIntentionallyClosed = false

  constructor(config: WebSocketConfig = {}) {
    super()
    
    // Set default configuration
    this.config = {
      url: config.url || this.buildWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    }
  }

  /**
   * Build WebSocket URL based on API base URL
   */
  private buildWebSocketUrl(): string {
    let apiBaseUrl = 'http://localhost:3001'
    
    // Try to get from import.meta if available (Vite)
    try {
      if (import.meta?.env?.VITE_API_BASE_URL) {
        apiBaseUrl = import.meta.env.VITE_API_BASE_URL
      }
    } catch {
      // Fallback for test environment
      if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
        apiBaseUrl = process.env.VITE_API_BASE_URL
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication session available')
      }

      // Get restaurant ID
      const restaurantId = getCurrentRestaurantId()
      if (!restaurantId) {
        throw new Error('No restaurant ID available')
      }

      // Build WebSocket URL with auth params
      const wsUrl = new URL(this.config.url)
      wsUrl.searchParams.set('token', session.access_token)
      wsUrl.searchParams.set('restaurant_id', restaurantId)

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl.toString())

      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)

    } catch (error) {
      console.error('Failed to connect WebSocket:', error)
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
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.setConnectionState('disconnected')
  }

  /**
   * Send a message through WebSocket
   */
  send<T = unknown>(type: string, payload: T): void {
    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      restaurantId: getCurrentRestaurantId() || undefined
    }

    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      // Transform to snake_case before sending
      const transformedMessage = toSnakeCase(message)
      this.ws.send(JSON.stringify(transformedMessage))
    } else {
      // Queue message for later delivery
      console.warn('WebSocket not connected, queueing message:', type)
      this.messageQueue.push(message)
    }
  }

  /**
   * Subscribe to specific message types
   */
  subscribe(type: string, callback: (payload: unknown) => void): () => void {
    this.on(`message:${type}`, callback)
    
    // Return unsubscribe function
    return () => {
      this.off(`message:${type}`, callback)
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  // Private methods

  private handleOpen(): void {
    console.log('WebSocket connected')
    this.setConnectionState('connected')
    this.reconnectAttempts = 0
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Flush message queue
    this.flushMessageQueue()
    
    // Emit connected event
    this.emit('connected')
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      // Transform from snake_case to camelCase
      const message = toCamelCase(data) as WebSocketMessage
      
      // Emit specific message type event
      this.emit(`message:${message.type}`, message.payload)
      
      // Emit general message event
      this.emit('message', message)
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
      this.emit('error', new Error('Invalid message format'))
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event)
    this.setConnectionState('error')
    this.emit('error', new Error('WebSocket connection error'))
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason)
    this.cleanup()
    
    if (!this.isIntentionallyClosed && event.code !== 1000) {
      // Unexpected close, attempt reconnection
      this.scheduleReconnect()
    }
    
    this.setConnectionState('disconnected')
    this.emit('disconnected', { code: event.code, reason: event.reason })
  }

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.emit('stateChange', state)
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('error', new Error('Failed to reconnect after maximum attempts'))
      return
    }
    
    this.reconnectAttempts++
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )
    
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('ping', { timestamp: new Date().toISOString() })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message.type, message.payload)
      }
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()
    
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