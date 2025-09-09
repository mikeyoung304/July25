/**
 * WebSocket Service V2 - Race Condition Fixed Version
 * Implements proper connection state management to prevent race conditions
 */

import { EventEmitter } from '@/services/utils/EventEmitter'
import { logger } from '@/services/logger'
import { getCurrentRestaurantId } from '@/services/http/httpClient'
import { supabase } from '@/core/supabase'
import { toSnakeCase } from '@/services/utils/caseTransform'
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

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

export class WebSocketServiceV2 extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<Omit<WebSocketConfig, 'url'>> & { url: string }
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private connectionState: ConnectionState = 'disconnected'
  private connectionPromise: Promise<void> | null = null
  private isIntentionallyClosed = false
  private lastHeartbeat: number = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatInterval = 30000 // 30 seconds
  private messageQueue: WebSocketMessage[] = [] // Queue messages during connection

  constructor(config: WebSocketConfig = {}) {
    super()
    
    this.config = {
      url: config.url || this.buildWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 2000,
      maxReconnectAttempts: config.maxReconnectAttempts || 15
    }
  }

  /**
   * Build WebSocket URL based on API base URL
   */
  private buildWebSocketUrl(): string {
    const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3001'
    return apiBaseUrl.replace(/^http/, 'ws')
  }

  /**
   * Connect to WebSocket server with proper race condition handling
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      logger.debug('WebSocket already connected')
      return
    }

    // If currently connecting, return the existing promise
    if (this.connectionState === 'connecting' && this.connectionPromise) {
      logger.debug('WebSocket connection already in progress')
      return this.connectionPromise
    }

    // If reconnecting, also return existing promise
    if (this.connectionState === 'reconnecting' && this.connectionPromise) {
      logger.debug('WebSocket reconnection in progress')
      return this.connectionPromise
    }

    // Create new connection promise
    this.connectionPromise = this.performConnection()
    
    try {
      await this.connectionPromise
    } finally {
      this.connectionPromise = null
    }
  }

  /**
   * Perform the actual connection
   */
  private async performConnection(): Promise<void> {
    this.isIntentionallyClosed = false
    this.setConnectionState('connecting')

    try {
      // Get authentication token
      const token = await this.getAuthToken()
      const restaurantId = getCurrentRestaurantId() || '11111111-1111-1111-1111-111111111111'

      // Build WebSocket URL with auth params
      const wsUrl = new URL(this.config.url)
      if (token) {
        wsUrl.searchParams.set('token', token)
      } else {
        logger.warn('⚠️ Connecting WebSocket without authentication token')
      }
      wsUrl.searchParams.set('restaurant_id', restaurantId)

      // Create new WebSocket connection
      await this.createWebSocketConnection(wsUrl.toString())
      
    } catch (error) {
      logger.error('Failed to connect to WebSocket:', error)
      this.setConnectionState('error')
      
      // Only schedule reconnect if not intentionally closed
      if (!this.isIntentionallyClosed) {
        this.scheduleReconnect()
      }
      
      throw error
    }
  }

  /**
   * Create and setup WebSocket connection
   */
  private createWebSocketConnection(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing connection if any
        if (this.ws) {
          this.ws.onopen = null
          this.ws.onmessage = null
          this.ws.onerror = null
          this.ws.onclose = null
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.close()
          }
        }

        this.ws = new WebSocket(url)
        
        // Set up one-time connection handlers
        const handleOpen = () => {
          this.handleOpen()
          resolve()
        }
        
        const handleError = (event: Event) => {
          this.handleError(event)
          reject(new Error('WebSocket connection failed'))
        }
        
        // Set up event handlers
        this.ws.onopen = handleOpen
        this.ws.onerror = handleError
        this.ws.onmessage = this.handleMessage.bind(this)
        this.ws.onclose = this.handleClose.bind(this)
        
        // Add connection timeout
        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close()
            reject(new Error('WebSocket connection timeout'))
          }
        }, 10000) // 10 second timeout
        
        // Clear timeout on successful connection
        this.ws.addEventListener('open', () => {
          clearTimeout(connectionTimeout)
        }, { once: true })
        
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Get authentication token
   */
  private async getAuthToken(): Promise<string | null> {
    // Use the unified getAuthToken that checks AuthContext first
    try {
      const { getAuthToken } = await import('@/services/auth')
      const token = await getAuthToken()
      logger.info('🔐 Using unified auth token for WebSocket')
      return token
    } catch (error) {
      logger.warn('⚠️ No authentication token for WebSocket:', error)
      return null
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    logger.info('✅ WebSocket connected')
    this.setConnectionState('connected')
    this.reconnectAttempts = 0
    this.startHeartbeat()
    
    // Flush message queue
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.send(message)
      }
    }
    
    this.emit('connected')
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage
      
      // Handle heartbeat
      if (message.type === 'pong') {
        this.lastHeartbeat = Date.now()
        return
      }
      
      // Transform snake_case to camelCase for frontend consumption
      const transformedMessage = {
        ...message,
        payload: message.payload // Keep payload as-is for now
      }
      
      // Emit specific event type
      this.emit(message.type, transformedMessage)
      
      // Also emit generic message event
      this.emit('message', transformedMessage)
      
    } catch (error) {
      logger.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    logger.error('WebSocket error:', event)
    this.setConnectionState('error')
    this.emit('error', event)
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    logger.info('WebSocket disconnected', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean 
    })
    
    this.stopHeartbeat()
    this.setConnectionState('disconnected')
    this.emit('disconnected', event)
    
    // Only reconnect if not intentionally closed
    if (!this.isIntentionallyClosed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return // Already scheduled
    }
    
    this.reconnectAttempts++
    
    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    const jitter = Math.random() * 1000
    const delay = exponentialDelay + jitter
    
    logger.info(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`)
    
    this.setConnectionState('reconnecting')
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(error => {
        logger.error('Reconnection failed:', error)
      })
    }, delay)
  }

  /**
   * Send message through WebSocket
   */
  send<T = unknown>(message: WebSocketMessage<T>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not connected, queueing message')
      this.messageQueue.push(message as WebSocketMessage)
      
      // Try to connect if not already connecting
      if (this.connectionState === 'disconnected') {
        this.connect().catch(error => {
          logger.error('Failed to reconnect for message send:', error)
        })
      }
      return
    }
    
    try {
      // Transform to snake_case for backend
      const transformedMessage = {
        ...message,
        payload: toSnakeCase(message.payload),
        restaurant_id: getCurrentRestaurantId()
      }
      
      this.ws.send(JSON.stringify(transformedMessage))
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error)
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ 
          type: 'ping', 
          payload: null, 
          timestamp: new Date().toISOString() 
        })
        
        // Check for heartbeat timeout
        if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > this.heartbeatInterval * 2) {
          logger.warn('Heartbeat timeout, reconnecting...')
          this.ws.close()
        }
      }
    }, this.heartbeatInterval)
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      // Only emit if there are listeners to avoid "no handlers" warnings
      if (this.listenerCount('connectionStateChange') > 0) {
        this.emit('connectionStateChange', state)
      }
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    this.stopHeartbeat()
    
    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    // Clear message queue
    this.messageQueue = []
    
    // Close WebSocket connection
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect')
      }
      this.ws = null
    }
    
    this.setConnectionState('disconnected')
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }
}

// Export singleton instance
export const webSocketServiceV2 = new WebSocketServiceV2()

// Also export for compatibility
export default webSocketServiceV2