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
import { getErrorMessage } from '@rebuild/shared'

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

// Consolidated state machine for connection management
// Eliminates separate boolean flags (isConnecting, isReconnecting) that could cause race conditions
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<Omit<WebSocketConfig, 'url'>> & { url: string }
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  // Single source of truth for connection state - no separate boolean flags needed
  private connectionState: ConnectionState = 'disconnected'
  private isIntentionallyClosed = false
  private lastHeartbeat: number = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private heartbeatInterval = 30000 // 30 seconds
  // Store pending auth for first-message authentication
  private pendingAuth: { token: string; restaurantId: string } | null = null
  // Track if auth has been confirmed by server
  private isAuthenticated = false

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
   * Uses consolidated state machine to prevent race conditions
   */
  async connect(): Promise<void> {
    // Consolidated state check: only connect if disconnected or in error state
    // This eliminates race conditions from separate boolean flags
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      logger.debug('[WebSocket] Already connected or connecting, skipping...', { state: this.connectionState })
      return
    }

    // Allow connection during reconnecting state only if WebSocket is actually closed
    // This handles the edge case where reconnect timer fires but we want to connect immediately
    if (this.connectionState === 'reconnecting') {
      // Clear the pending reconnect timer since we're connecting now
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
      }
      logger.debug('[WebSocket] Connecting during reconnection phase')
    }

    // Track whether we were in reconnecting state for retry logic
    const wasReconnecting = this.connectionState === 'reconnecting'

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

      // Store auth for first-message authentication (more secure - no token in URL)
      // Token is sent as first message after connection opens, not in URL
      // This prevents token leakage in server logs, browser history, proxy logs
      if (token) {
        this.pendingAuth = { token, restaurantId }
      } else {
        this.pendingAuth = null
        logger.warn('⚠️ Connecting WebSocket without authentication token')
      }
      this.isAuthenticated = false

      // Build WebSocket URL without token (security improvement)
      const wsUrl = new URL(this.config.url)
      // Only send restaurant_id in URL for routing, not the sensitive token
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
      logger.error('Failed to connect to WebSocket', { component: 'WebSocket', error: getErrorMessage(error) })
      this.setConnectionState('error')
      this.scheduleReconnect()
    }
    // No finally block needed - state is managed through setConnectionState()
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true
    this.isAuthenticated = false // Reset auth flag on disconnect
    this.pendingAuth = null // Clear any pending auth
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
      logger.warn('Cannot send message - WebSocket not connected', { component: 'WebSocket' })
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
      logger.error('Failed to send WebSocket message', { component: 'WebSocket', error: getErrorMessage(error) })
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
    logger.info('WebSocket connection opened, sending auth...', { component: 'WebSocket' })
    this.reconnectAttempts = 0
    // State transition happens when auth completes (auth:success) or immediately in dev mode
    this.lastHeartbeat = Date.now()

    // Send first-message authentication (security improvement: token not in URL)
    if (this.pendingAuth && this.ws) {
      logger.info('🔐 Sending WebSocket first-message auth', { component: 'WebSocket' })
      this.ws.send(JSON.stringify({
        type: 'auth',
        token: this.pendingAuth.token,
        restaurant_id: this.pendingAuth.restaurantId,
        timestamp: new Date().toISOString()
      }))
      // Clear pending auth after sending (token should not be kept in memory longer than needed)
      this.pendingAuth = null
    } else {
      // No auth to send - connection may be rejected by server
      logger.warn('WebSocket opened without auth to send', { component: 'WebSocket' })
      // Still emit connected for backward compatibility in dev mode
      if (import.meta.env.DEV) {
        this.setConnectionState('connected')
        this.startHeartbeat()
        this.emit('connected')
      }
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Parse the message - server sends with payload wrapper
      const rawMessage = JSON.parse(event.data)

      // Handle auth responses (first-message authentication)
      if (rawMessage.type === 'auth:success') {
        logger.info('🔐 WebSocket authentication successful', { component: 'WebSocket' })
        this.isAuthenticated = true
        this.setConnectionState('connected')
        this.startHeartbeat()
        this.emit('connected')
        return
      }

      if (rawMessage.type === 'auth:failed') {
        logger.error('❌ WebSocket authentication failed', { component: 'WebSocket', error: rawMessage.error })
        this.isAuthenticated = false
        this.setConnectionState('error')
        this.emit('error', new Error(rawMessage.error || 'Authentication failed'))
        // Don't schedule reconnect for auth failures - likely a token issue
        return
      }

      // Handle initial 'connected' message (before auth completes)
      if (rawMessage.type === 'connected' && rawMessage.auth_required) {
        logger.debug('WebSocket connected, awaiting auth response...', { component: 'WebSocket' })
        return
      }

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
      logger.error('Failed to parse WebSocket message', { component: 'WebSocket', error: getErrorMessage(error) })
    }
  }

  private handleError(event: Event): void {
    logger.error('WebSocket error', { component: 'WebSocket', event: event.type })
    this.setConnectionState('error')
    // Stop heartbeat on error to prevent memory leak
    this.stopHeartbeat()
    this.emit('error', event)
  }

  private handleClose(event: CloseEvent): void {
    logger.warn('WebSocket closed', { component: 'WebSocket', code: event.code, reason: event.reason })
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
    // Consolidated state check: only schedule reconnect if not already reconnecting
    if (this.connectionState === 'reconnecting') {
      logger.warn('Reconnection already scheduled, skipping...', { component: 'WebSocket' })
      return
    }

    // Clear any existing reconnect timer first to prevent memory leaks
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', { component: 'WebSocket', attempts: this.reconnectAttempts, maxAttempts: this.config.maxReconnectAttempts })
      this.setConnectionState('error')
      this.emit('maxReconnectAttemptsReached')
      return
    }

    // Transition to reconnecting state
    this.setConnectionState('reconnecting')
    this.reconnectAttempts++

    // Improved exponential backoff with jitter
    // Start with 2 seconds, double each time, max 30 seconds
    const baseDelay = Math.min(2000 * Math.pow(2, this.reconnectAttempts - 1), 30000)

    // Add 0-25% jitter to prevent thundering herd
    const jitterPercent = Math.random() * 0.25
    const jitter = baseDelay * jitterPercent

    const delay = Math.min(baseDelay + jitter, 30000) // Ensure max 30 seconds

    logger.warn('Scheduling reconnection attempt', { component: 'WebSocket', attempt: this.reconnectAttempts, maxAttempts: this.config.maxReconnectAttempts, delayMs: Math.round(delay), strategy: 'exponential backoff with jitter' })

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null // Clear reference after execution

      // Only reconnect if still in reconnecting state and not intentionally closed
      // connect() will handle the state transition to 'connecting'
      if (this.connectionState === 'reconnecting' && !this.isIntentionallyClosed) {
        try {
          await this.connect()
        } catch (error) {
          // connect() failed, will be handled by error/close handlers which may schedule another reconnect
          logger.error('Reconnection attempt failed', { component: 'WebSocket', error: getErrorMessage(error) })
        }
      }
    }, delay)
  }

  private cleanup(): void {
    // Reset auth state (connection state is managed via setConnectionState)
    this.isAuthenticated = false
    this.pendingAuth = null

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
        logger.warn('WebSocket heartbeat timeout - connection may be dead', { component: 'WebSocket', lastHeartbeat: this.lastHeartbeat, now, timeoutMs: this.heartbeatInterval * 2 })
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