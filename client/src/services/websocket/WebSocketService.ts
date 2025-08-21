/**
 * WebSocket Service for Real-time Updates
 * Implements WebSocket connections for live order updates and kitchen display synchronization
 * Follows Luis's API pattern with automatic reconnection and error handling
 */

import { EventEmitter } from '@/services/utils/EventEmitter'
import { logger } from '@/services/logger'
import { getCurrentRestaurantId } from '@/services/http/httpClient'
import { supabase } from '@/core/supabase'
import { toSnakeCase, toCamelCase } from '@/services/utils/caseTransform'
import { env } from '@/utils/env'

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
  private lastHeartbeat: number = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatInterval = 30000 // 30 seconds

  constructor(config: WebSocketConfig = {}) {
    super()
    
    // Set default configuration with enhanced resilience settings
    this.config = {
      url: config.url || this.buildWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 2000, // Faster initial reconnect
      maxReconnectAttempts: config.maxReconnectAttempts || 15 // More attempts
    }
  }

  /**
   * Build WebSocket URL based on API base URL
   */
  private buildWebSocketUrl(): string {
    let apiBaseUrl = 'http://localhost:3001'
    
    // Get API base URL from environment
    if (env.VITE_API_BASE_URL) {
      apiBaseUrl = env.VITE_API_BASE_URL
    }
    
    // Convert HTTP to WS protocol
    const wsUrl = apiBaseUrl.replace(/^http/, 'ws')
    return wsUrl // WebSocket server runs on root path, not /ws
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    // Check both WebSocket state and connection state
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.warn('WebSocket already connected or connecting')
      return
    }

    this.isIntentionallyClosed = false
    this.setConnectionState('connecting')

    try {
      // Get auth token for WebSocket authentication
      let token = 'test-token' // Default for development
      
      // Try to get auth token - prioritize Supabase session, then demo token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.access_token) {
        // Use Supabase session token if available
        token = session.access_token
        logger.info('🔐 Using Supabase session for WebSocket')
      } else {
        // No Supabase session - try to get demo token for friends & family
        try {
          const { getDemoToken } = await import('@/services/auth/demoAuth')
          token = await getDemoToken()
          logger.info('🔑 Using demo token for WebSocket')
        } catch (demoError) {
          console.warn('Failed to get demo token:', demoError)
          // In development, fall back to test token
          if (!env.PROD) {
            logger.info('🔧 Using test token for WebSocket (dev mode)')
          } else {
            console.error('No authentication available for WebSocket')
          }
        }
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
    this.stopHeartbeat()
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
    logger.info(`[WebSocket] Creating subscription for message type: '${messageType}'`)
    
    const handler = (message: WebSocketMessage) => {
      logger.info(`[WebSocket] Subscription handler checking: ${message.type} === ${messageType}?`)
      if (message.type === messageType) {
        logger.info(`[WebSocket] Match! Calling callback for ${messageType}`)
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
    this.lastHeartbeat = Date.now()
    this.setConnectionState('connected')
    this.startHeartbeat()
    this.emit('connected')
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Parse the message - server sends with payload wrapper
      const rawMessage = JSON.parse(event.data)
      
      logger.info('[WebSocket] Raw message received:', { type: rawMessage.type, payload: rawMessage.payload ? 'has payload' : 'no payload' })
      
      // DIAGNOSTIC: Log the full structure for order events
      if (rawMessage.type && rawMessage.type.startsWith('order:')) {
        logger.info('[WebSocket] Order event structure:', {
          type: rawMessage.type,
          hasPayload: !!rawMessage.payload,
          payloadKeys: rawMessage.payload ? Object.keys(rawMessage.payload) : [],
          hasOrder: !!(rawMessage.payload && rawMessage.payload.order)
        })
      }
      
      // Server sends snake_case data, we need to transform it
      // The structure is: { type: 'order:created', payload: { order: snake_case_order }, timestamp: ... }
      const message: WebSocketMessage = {
        type: rawMessage.type,
        payload: rawMessage.payload, // Keep the wrapper structure, transform will happen in handlers
        timestamp: rawMessage.timestamp,
        restaurantId: rawMessage.restaurant_id || rawMessage.restaurantId
      }
      
      // DIAGNOSTIC: Log emission
      logger.info(`[WebSocket] Emitting 'message' event with type: ${message.type}`)
      
      // Handle heartbeat responses
      if (message.type === 'pong') {
        this.handleHeartbeat()
        return
      }
      
      // Update heartbeat on any message
      this.handleHeartbeat()
      
      // Emit generic message event
      this.emit('message', message)
      
      logger.info(`[WebSocket] Emitting specific event 'message:${message.type}'`)
      
      // Emit specific message type event with the full payload
      // The orderUpdates handler will handle the transformation
      this.emit(`message:${message.type}`, message.payload)
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event)
    this.setConnectionState('error')
    // Stop heartbeat on error to prevent memory leak
    this.stopHeartbeat()
    this.emit('error', event)
  }

  private handleClose(event: CloseEvent): void {
    console.warn('WebSocket closed:', event.code, event.reason)
    this.setConnectionState('disconnected')
    this.stopHeartbeat()
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
    // Clear any existing reconnect timer first to prevent memory leaks
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.emit('maxReconnectAttemptsReached')
      return
    }
    
    this.reconnectAttempts++
    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
    const jitter = Math.random() * 1000 // Add up to 1 second jitter
    const delay = Math.min(baseDelay + jitter, 30000) // Max 30 seconds
    
    console.warn(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms (exponential backoff)`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null // Clear reference after execution
      this.connect()
    }, delay)
  }

  private cleanup(): void {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // Stop heartbeat
    this.stopHeartbeat()
    
    // Remove all WebSocket event handlers to prevent memory leaks
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      
      // Close connection if still open
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Cleanup')
      }
      
      this.ws = null
    }
    
    // Clear all event listeners from EventEmitter
    this.removeAllListeners()
  }

  /**
   * Start heartbeat mechanism to detect dead connections
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now()
      
      // Check if we haven't received any data recently
      if (now - this.lastHeartbeat > this.heartbeatInterval * 2) {
        console.warn('WebSocket heartbeat timeout - connection may be dead')
        if (this.ws) {
          this.ws.close()
        }
        return
      }
      
      // Send ping if connected
      if (this.isConnected()) {
        this.send('ping', { timestamp: now })
      }
    }, this.heartbeatInterval)
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Handle heartbeat response
   */
  private handleHeartbeat(): void {
    this.lastHeartbeat = Date.now()
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService()