import React from 'react'
import { EventEmitter } from 'events'
import { Order, OrderStatus } from '../types'
import { useRestaurant } from '@/core/restaurant-hooks'

export type WebSocketEvent = 
  | { type: 'ORDER_CREATED'; order: Order }
  | { type: 'ORDER_UPDATED'; order: Order }
  | { type: 'ORDER_STATUS_CHANGED'; orderId: string; status: OrderStatus; previousStatus: OrderStatus }
  | { type: 'ORDER_DELETED'; orderId: string }
  | { type: 'CONNECTION_OPENED' }
  | { type: 'CONNECTION_CLOSED' }
  | { type: 'CONNECTION_ERROR'; error: Error }

export interface WebSocketConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private isIntentionallyClosed = false
  private restaurantId: string | null = null

  constructor(config: WebSocketConfig = {}) {
    super()
    this.config = {
      url: config.url || process.env.VITE_WEBSOCKET_URL || 'ws://localhost:3001',
      reconnectInterval: config.reconnectInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000
    }
  }

  connect(restaurantId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.restaurantId = restaurantId
    this.isIntentionallyClosed = false

    try {
      // Include restaurant_id in connection URL
      const url = `${this.config.url}/orders?restaurant_id=${restaurantId}`
      this.ws = new WebSocket(url)

      this.ws.onopen = this.handleOpen.bind(this)
      this.ws.onmessage = this.handleMessage.bind(this)
      this.ws.onclose = this.handleClose.bind(this)
      this.ws.onerror = this.handleError.bind(this)
    } catch (error) {
      this.handleError(new Event('error'))
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true
    this.cleanup()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  private handleOpen(): void {
    console.log('WebSocket connected')
    this.reconnectAttempts = 0
    this.emit('event', { type: 'CONNECTION_OPENED' })
    this.startHeartbeat()

    // Send authentication/subscription message
    if (this.restaurantId) {
      this.send({
        type: 'SUBSCRIBE',
        restaurantId: this.restaurantId
      })
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      
      // Handle heartbeat
      if (data.type === 'PONG') {
        return
      }

      // Map backend events to our WebSocketEvent types
      if (data.type && data.payload) {
        const eventType = data.type as WebSocketEvent['type']
        this.emit('event', {
          type: eventType,
          ...data.payload
        })
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  private handleClose(): void {
    console.log('WebSocket disconnected')
    this.cleanup()
    this.emit('event', { type: 'CONNECTION_CLOSED' })

    // Attempt to reconnect if not intentionally closed
    if (!this.isIntentionallyClosed && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  private handleError(error: Event): void {
    console.error('WebSocket error:', error)
    this.emit('event', { 
      type: 'CONNECTION_ERROR', 
      error: new Error('WebSocket connection failed') 
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return
    }

    this.reconnectAttempts++
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.restaurantId) {
        this.connect(this.restaurantId)
      }
    }, this.config.reconnectInterval)
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'PING' })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private cleanup(): void {
    this.stopHeartbeat()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  // Mock implementation for development
  mockOrderUpdate(order: Order): void {
    if (process.env.NODE_ENV === 'development') {
      this.emit('event', {
        type: 'ORDER_UPDATED',
        order
      })
    }
  }

  mockStatusChange(orderId: string, newStatus: OrderStatus, previousStatus: OrderStatus): void {
    if (process.env.NODE_ENV === 'development') {
      this.emit('event', {
        type: 'ORDER_STATUS_CHANGED',
        orderId,
        status: newStatus,
        previousStatus
      })
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService()

// React hook for using WebSocket
export const useWebSocket = (onEvent: (event: WebSocketEvent) => void) => {
  const { restaurant } = useRestaurant()

  React.useEffect(() => {
    if (!restaurant?.id) return

    const handleEvent = (event: WebSocketEvent) => {
      onEvent(event)
    }

    webSocketService.on('event', handleEvent)
    webSocketService.connect(restaurant.id)

    return () => {
      webSocketService.off('event', handleEvent)
      // Don't disconnect here as other components might be using it
    }
  }, [restaurant?.id, onEvent])

  return webSocketService
}