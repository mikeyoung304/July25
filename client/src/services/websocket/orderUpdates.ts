/**
 * Order Updates WebSocket Handler
 * Manages real-time order updates for Kitchen Display System
 */

import { webSocketService } from './WebSocketService'
import { logger } from '@/services/logger'
import { Order } from '@rebuild/shared'
import { toast } from 'react-hot-toast'

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
        this.handleOrderStatusChanged(payload as { orderId: string; status: string; previousStatus: string; updatedBy?: string })),
      webSocketService.subscribe('order:item_status_changed', (payload) => 
        this.handleItemStatusChanged(payload as { orderId: string; itemId: string; status: string; previousStatus: string; updatedBy?: string }))
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
      // Only show error toast if we were actually connected (i.e., authenticated)
      // This prevents showing errors on unauthenticated pages like the landing page
      if (webSocketService.isConnected() || this.isInitialized) {
        toast.error('Lost connection to order updates. Reconnecting...')
      }
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
    logger.info('[OrderUpdates] Raw payload received:', payload)
    
    // The payload contains { order: snake_case_order } - extract the order
    const rawOrder = payload.order || payload
    
    if (!rawOrder) {
      console.error('[OrderUpdates] No order in payload:', payload)
      return
    }
    
    // Use order data as-is (snake_case matches our shared types)
    const order = rawOrder as Order
    
    if (!order || !order.id) {
      console.error('[OrderUpdates] Invalid order after transformation:', order)
      return
    }
    
    logger.info('[OrderUpdates] New order created:', { id: order.id, orderNumber: order.order_number })
    
    this.notifySubscribers({
      action: 'created',
      order: order  // Order data in snake_case format as expected
    })

    // Only show notification on kitchen-related pages, not on customer/kiosk pages
    const isKitchenPage = window.location.pathname.includes('/kitchen') || 
                         window.location.pathname.includes('/expo') ||
                         window.location.pathname.includes('/admin');
    
    if (isKitchenPage) {
      toast.success(`New order #${order.order_number} received!`, {
        duration: 5000,
        position: 'top-right'
      })
    }
  }

  /**
   * Handle order updated
   */
  private handleOrderUpdated(payload: any): void {
    logger.info('[OrderUpdates] Update payload received:', payload)
    
    // Extract the order data
    const rawOrder = payload.order || payload
    
    if (!rawOrder) {
      console.error('[OrderUpdates] No order in update payload:', payload)
      return
    }
    
    // Use order data as-is (snake_case matches our shared types)
    const order = rawOrder as Order
    
    if (!order || !order.id) {
      console.error('[OrderUpdates] Invalid order update after transformation:', order)
      return
    }
    
    logger.info('[OrderUpdates] Order updated:', order.id)
    
    this.notifySubscribers({
      action: 'updated',
      order: order  // Order data in snake_case format as expected
    })
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
    
    logger.info('[OrderUpdates] Order deleted:', orderId)
    
    this.notifySubscribers({
      action: 'deleted',
      orderId: orderId
    })
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
    
    // CRITICAL FIX: Properly clear old subscriptions to prevent duplicates
    if (this.subscriptions && this.subscriptions.length > 0) {
      logger.info(`[OrderUpdates] Clearing ${this.subscriptions.length} old subscriptions`)
      this.subscriptions.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe()
          } catch (error) {
            console.warn('[OrderUpdates] Error unsubscribing:', error)
          }
        }
      })
      this.subscriptions = []
    }
    
    // Add a small delay to ensure old subscriptions are fully cleared
    setTimeout(() => {
      // Re-create subscriptions
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
          this.handleOrderStatusChanged(payload as { orderId: string; status: string; previousStatus: string; updatedBy?: string })),
        webSocketService.subscribe('order:item_status_changed', (payload) => 
          this.handleItemStatusChanged(payload as { orderId: string; itemId: string; status: string; previousStatus: string; updatedBy?: string }))
      )
      
      logger.info('[OrderUpdates] Subscriptions reinitialized:', this.subscriptions.length)
    }, 100)
  }
  
  /**
   * Request full order sync
   */
  requestSync(): void {
    if (webSocketService.isConnected()) {
      webSocketService.send('orders:sync', { requestFullSync: true })
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