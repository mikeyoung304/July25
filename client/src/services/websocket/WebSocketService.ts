/**
 * WebSocket Service for Real-time Updates
 * Implements WebSocket connections for live order updates and kitchen display synchronization
 * Follows Luis's API pattern with automatic reconnection and error handling
 */

import { EventEmitter } from '@/services/utils/EventEmitter'
import { logger } from '@/services/logger'
import { getCurrentRestaurantId } from '@/services/http/httpClient'
import { supabase } from '@/core/supabase'
import { toSnakeCase } from '@/services/utils/caseTransform'
import { getWsUrl } from '@/config'

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
  // Guard flag: prevents concurrent reconnection attempts and timer scheduling
  private isReconnecting = false
  // Guard flag: prevents concurrent connection attempts (separate from isReconnecting)
  private isConnecting = false
  private lastHeartbeat: number = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatInterval = 30000 // 30 seconds

  constructor(config: WebSocketConfig = {}) {
    super()

    // Dev-only instrumentation for e2e tests
    if (import.meta.env.DEV) {
      (window as any).__dbgWS = (window as any).__dbgWS || { connectCount: 0, subCount: 0 }
      // Expose service instance for Playwright e2e tests (dev only)
      // This allows tests to access the service without using require() in browser context
      ;(window as any).__webSocketService = this
    }

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
    // Use centralized config for WebSocket URL
    return getWsUrl()
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    // Guard: prevent concurrent connection attempts
    if (this.isConnecting) {
      logger.debug('[WebSocket] Connection attempt already in progress, skipping...')
      return
    }

    // Guard: prevent double connection attempts
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.warn('[WebSocket] Already connected or connecting, skipping...')
      return
    }

    // Guard: prevent connection during reconnection cycle
    if (this.isReconnecting) {
      console.warn('[WebSocket] Reconnection in progress, skipping connect...')
      return
    }

    this.isConnecting = true
    this.isIntentionallyClosed = false
    this.setConnectionState('connecting')

    try {
      // Get auth token for WebSocket authentication
      // Uses dual-auth pattern per ADR-006: Supabase session OR localStorage JWT
      let token: string | null = null

      // 1. Try Supabase session first (primary auth)
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.access_token) {
        token = session.access_token
        logger.info('🔐 Using Supabase session for WebSocket')
      } else {
        // 2. Fallback to localStorage for demo/PIN/station sessions (per ADR-006)
        const savedSession = localStorage.getItem('auth_session')
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession)
            if (parsed.session?.accessToken && parsed.session?.expiresAt) {
              // Check if token is still valid
              if (parsed.session.expiresAt > Date.now() / 1000) {
                token = parsed.session.accessToken
                logger.info('🔐 Using localStorage session token (demo/PIN/station) for WebSocket')
              } else {
                logger.warn('⚠️ localStorage session token expired for WebSocket')
              }
            }
          } catch (parseError) {
            logger.error('Failed to parse localStorage auth session for WebSocket:', parseError)
          }
        }

        // 3. If still no token, handle based on environment
        if (!token) {
          if (import.meta.env.DEV) {
            logger.warn('⚠️ WebSocket connecting without authentication (dev mode)')
          } else {
            logger.error('❌ No authentication available for WebSocket connection')
            this.setConnectionState('error')
            throw new Error('Authentication required for WebSocket connection')
          }
        }
      }

      // Get restaurant ID with fallback for development
      const restaurantId = getCurrentRestaurantId() || 'grow'

      // Build WebSocket URL with auth params
      const wsUrl = new URL(this.config.url)
      if (token) {
        wsUrl.searchParams.set('token', token)
      } else {
        logger.warn('⚠️ Connecting WebSocket without authentication token')
      }
      wsUrl.searchParams.set('restaurant_id', restaurantId)

      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl.toString())

      // Dev-only: Track connection count
      if (import.meta.env.DEV && (window as any).__dbgWS) {
        (window as any).__dbgWS.connectCount++
      }

      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onerror = this.handleError.bind(this)
      this.ws.onclose = this.handleClose.bind(this)

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      this.setConnectionState('error')
      this.scheduleReconnect()
    } finally {
      // Always reset isConnecting flag to allow future connection attempts
      this.isConnecting = false
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    this.isReconnecting = false // Reset reconnection flag on disconnect
    this.isConnecting = false // Reset connection flag on disconnect
    this.stopHeartbeat()

    // Clear reconnect timer first to prevent reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      // Close with proper code and reason
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect')
      }
      this.ws = null

      // Dev-only: Decrement connection count
      if (import.meta.env.DEV && (window as any).__dbgWS) {
        (window as any).__dbgWS.connectCount--
      }
    }

    this.setConnectionState('disconnected')

    // Clean up after setting state and closing connection
    this.cleanup()
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

    // Dev-only: Track subscription count
    if (import.meta.env.DEV && (window as any).__dbgWS) {
      (window as any).__dbgWS.subCount++
    }

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

      // Dev-only: Decrement subscription count
      if (import.meta.env.DEV && (window as any).__dbgWS) {
        (window as any).__dbgWS.subCount--
      }
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
    this.isReconnecting = false // Reset reconnection flag on successful connection
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
    // Guard: Prevent double reconnection scheduling
    if (this.isReconnecting) {
      console.warn('[WebSocket] Reconnection already scheduled, skipping...')
      return
    }

    // Clear any existing reconnect timer first to prevent memory leaks
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      this.isReconnecting = false
      this.emit('maxReconnectAttemptsReached')
      return
    }

    this.isReconnecting = true
    this.reconnectAttempts++

    // Improved exponential backoff with jitter
    // Start with 2 seconds, double each time, max 30 seconds
    const baseDelay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000)

    // Add 0-25% jitter to prevent thundering herd
    const jitterPercent = Math.random() * 0.25
    const jitter = baseDelay * jitterPercent

    const delay = Math.min(baseDelay + jitter, 30000) // Ensure max 30 seconds

    console.warn(`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${Math.round(delay)}ms (exponential backoff with jitter)`)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null // Clear reference after execution

      // Reset isReconnecting BEFORE calling connect() so that connect() is not blocked
      // This flag is only meant to prevent external connect() calls during the delay period
      this.isReconnecting = false

      // Only reconnect if still disconnected
      if (!this.isConnected() && !this.isIntentionallyClosed) {
        try {
          await this.connect()
        } catch (error) {
          // connect() failed, will be handled by error/close handlers which may schedule another reconnect
          console.error('[WebSocket] Reconnection attempt failed:', error)
        }
      }
    }, delay)
  }

  private cleanup(): void {
    // Reset connection and reconnection state
    this.isReconnecting = false
    this.isConnecting = false

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
    
    // Use setTimeout recursively instead of setInterval for better test compatibility
    const runHeartbeat = () => {
      if (!this.isConnected()) {
        return
      }
      
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
      
      // Schedule next heartbeat
      if (this.isConnected()) {
        this.heartbeatTimer = setTimeout(runHeartbeat, this.heartbeatInterval)
      }
    }
    
    // Start the first heartbeat
    this.heartbeatTimer = setTimeout(runHeartbeat, this.heartbeatInterval)
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
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