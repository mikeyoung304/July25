/**
 * Order Updates WebSocket Handler
 * Manages real-time order updates for Kitchen Display System
 */

import { webSocketService } from './WebSocketService'
import { logger } from '@/services/logger'
import { Order } from '@rebuild/shared'
import { toast } from 'react-hot-toast'
import { toCamelCase } from '../utils/caseTransform'

export interface OrderUpdatePayload {
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'item_status_changed'
  order?: Order
  orderId?: string
  itemId?: string
  status?: string
  previousStatus?: string
  updatedBy?: string
}

export class OrderUpdatesHandler { 
  private subscriptions: Array<() => void> = []
  private orderUpdateCallbacks: Array<(update: OrderUpdatePayload) => void> = []
  private connectionHandlers: { connected?: () => void; disconnected?: () => void; error?: (error: any) => void } = {}

  /**
   * Initialize order updates handler
   */
  initialize(): void {
    logger.info('[OrderUpdates] Initializing order updates handler...')
    logger.info('[OrderUpdates] WebSocket connected?', webSocketService.isConnected())
    
    // Subscribe to order-related WebSocket messages
    this.subscriptions.push(
      webSocketService.subscribe('order:created', (payload) => {
        logger.info('[OrderUpdates] Raw order:created payload:', payload)
        this.handleOrderCreated(payload)
      }),
      webSocketService.subscribe('order:updated', (payload) => 
        this.handleOrderUpdated(payload)),
      webSocketService.subscribe('order:deleted', (payload) => 
        this.handleOrderDeleted(payload)),
      webSocketService.subscribe('order:status_changed', (payload) => 
        this.handleOrderStatusChanged(payload)),
      webSocketService.subscribe('order:item_status_changed', (payload) => 
        this.handleItemStatusChanged(payload))
    )

    // Handle connection state changes
    this.connectionHandlers.connected = () => {
      console.warn('[OrderUpdates] WebSocket connected event received')
      // Re-initialize subscriptions on reconnection to ensure they're active
      this.reinitializeSubscriptions()
      // Request current order state after reconnection
      webSocketService.send('orders:sync', { requestFullSync: true })
    }
    
    this.connectionHandlers.disconnected = () => {
      console.warn('Order updates disconnected')
      toast.error('Lost connection to order updates. Reconnecting...')
    }
    
    this.connectionHandlers.error = (error) => {
      console.error('Order updates error:', error)
    }

    webSocketService.on('connected', this.connectionHandlers.connected)
    webSocketService.on('disconnected', this.connectionHandlers.disconnected)
    webSocketService.on('error', this.connectionHandlers.error)
    
    logger.info('[OrderUpdates] Initialization complete, subscriptions:', this.subscriptions.length)
  }

  /**
   * Cleanup handler
   */
  cleanup(): void {
    // Unsubscribe from all WebSocket events
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    this.orderUpdateCallbacks = []
    
    // Remove connection event listeners
    if (this.connectionHandlers.connected) {
      webSocketService.off('connected', this.connectionHandlers.connected)
    }
    if (this.connectionHandlers.disconnected) {
      webSocketService.off('disconnected', this.connectionHandlers.disconnected)
    }
    if (this.connectionHandlers.error) {
      webSocketService.off('error', this.connectionHandlers.error)
    }
    this.connectionHandlers = {}
  }

  /**
   * Subscribe to order updates
   */
  onOrderUpdate(callback: (update: OrderUpdatePayload) => void): () => void {
    this.orderUpdateCallbacks.push(callback)
    
    // Return unsubscribe function
    return () => {
      const index = this.orderUpdateCallbacks.indexOf(callback)
      if (index > -1) {
        this.orderUpdateCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify all subscribers of an order update
   */
  private notifySubscribers(update: OrderUpdatePayload): void {
    this.orderUpdateCallbacks.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in order update callback:', error)
      }
    })
  }

  /**
   * Handle new order created
   */
  private handleOrderCreated(payload: any): void {
    logger.info('[OrderUpdates] Raw payload received:', { value: payload)
    
    // The payload IS { order: snake_case_order }, extra: so we need to extract and transform
    const rawOrder = payload.order || payload
    
    if (!rawOrder }) {
      console.error('[OrderUpdates] No order in payload:', payload)
      return
    }
    
    // Transform snake_case to camelCase
    const order = toCamelCase(rawOrder) as Order
    
    if (!order || !order.id) {
      console.error('[OrderUpdates] Invalid order after transformation:', order)
      return
    }
    
    logger.info('[OrderUpdates] New order created:', { id: order.id, orderNumber: order.order_number })
    
    this.notifySubscribers({
      action: 'created',
      order: order  // Now properly transformed to camelCase
    })

    // Show notification for new orders
    toast.success(`New order #${order.orderNumber} received!`, {
      duration: 5000,
      position: 'top-right'
    })
  }

  /**
   * Handle order updated
   */
  private handleOrderUpdated(payload: any): void {
    logger.info('[OrderUpdates] Update payload received:', { value: payload)
    
    // Extract and transform the order
    const rawOrder = payload.order || payload
    
    if (!rawOrder) {
      console.error('[OrderUpdates] No order in update payload:', extra: payload })
      return
    }
    
    // Transform snake_case to camelCase
    const order = toCamelCase(rawOrder) as Order
    
    if (!order || !order.id) {
      console.error('[OrderUpdates] Invalid order update after transformation:', order)
      return
    }
    
    logger.info('[OrderUpdates] Order updated:', { value: order.id)
    
    this.notifySubscribers({
      action: 'updated', extra: order: order  // Now properly transformed to camelCase
    } })
  }

  /**
   * Handle order deleted
   */
  private handleOrderDeleted(payload: any): void {
    const orderId = payload.orderId || payload.id
    
    if (!orderId) {
      console.error('[OrderUpdates] Invalid order delete payload:', payload)
      return
    }
    
    logger.info('[OrderUpdates] Order deleted:', { value: orderId)
    
    this.notifySubscribers({
      action: 'deleted', extra: orderId: orderId
    } })
  }

  /**
   * Handle order status change
   */
  private handleOrderStatusChanged(payload: {
    orderId: string
    status: string
    previousStatus: string
    updatedBy?: string
  }): void {
    console.warn('Order status changed:', payload.orderId, payload.previousStatus, '->', payload.status)
    
    this.notifySubscribers({
      action: 'status_changed',
      orderId: payload.orderId,
      status: payload.status,
      previousStatus: payload.previousStatus,
      updatedBy: payload.updatedBy
    })

    // Show notification for important status changes
    if (payload.status === 'ready') {
      toast.success(`Order is ready for pickup!`, {
        duration: 10000,
        position: 'top-right'
      })
    }
  }

  /**
   * Handle order item status change
   */
  private handleItemStatusChanged(payload: {
    orderId: string
    itemId: string
    status: string
    previousStatus: string
    updatedBy?: string
  }): void {
    console.warn('Item status changed:', payload.orderId, payload.itemId, payload.previousStatus, '->', payload.status)
    
    this.notifySubscribers({
      action: 'item_status_changed',
      orderId: payload.orderId,
      itemId: payload.itemId,
      status: payload.status,
      previousStatus: payload.previousStatus,
      updatedBy: payload.updatedBy
    })
  }

  /**
   * Reinitialize subscriptions (useful after reconnection)
   */
  private reinitializeSubscriptions(): void {
    logger.info('[OrderUpdates] Reinitializing subscriptions after reconnection...')
    
    // Clear old subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    
    // Re-create subscriptions
    this.subscriptions.push(
      webSocketService.subscribe('order:created', { value: (payload) => {
        logger.info('[OrderUpdates] Raw order:created payload:', extra: payload })
        this.handleOrderCreated(payload)
      }),
      webSocketService.subscribe('order:updated', (payload) => 
        this.handleOrderUpdated(payload)),
      webSocketService.subscribe('order:deleted', (payload) => 
        this.handleOrderDeleted(payload)),
      webSocketService.subscribe('order:status_changed', (payload) => 
        this.handleOrderStatusChanged(payload)),
      webSocketService.subscribe('order:item_status_changed', (payload) => 
        this.handleItemStatusChanged(payload))
    )
    
    logger.info('[OrderUpdates] Subscriptions reinitialized:', { value: this.subscriptions.length)
  }
  
  /**
   * Request full order sync
   */
  requestSync(): void {
    if (webSocketService.isConnected()) {
      webSocketService.send('orders:sync', extra: { requestFullSync: true } })
    }
  }

  /**
   * Update order status
   */
  updateOrderStatus(orderId: string, status: string): void {
    webSocketService.send('order:update_status', {
      orderId,
      status,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * Update order item status
   */
  updateItemStatus(orderId: string, itemId: string, status: string): void {
    webSocketService.send('order:update_item_status', {
      orderId,
      itemId,
      status,
      timestamp: new Date().toISOString()
    })
  }
}

// Create singleton instance
export const orderUpdatesHandler = new OrderUpdatesHandler()