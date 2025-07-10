/**
 * Order Updates WebSocket Handler
 * Manages real-time order updates for Kitchen Display System
 */

import { webSocketService } from './WebSocketService'
import { Order } from '@/services/types'
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

  /**
   * Initialize order updates handler
   */
  initialize(): void {
    // Subscribe to order-related WebSocket messages
    this.subscriptions.push(
      webSocketService.subscribe('order:created', (payload) => 
        this.handleOrderCreated(payload as { order: Order })),
      webSocketService.subscribe('order:updated', (payload) => 
        this.handleOrderUpdated(payload as { order: Order })),
      webSocketService.subscribe('order:deleted', (payload) => 
        this.handleOrderDeleted(payload as { orderId: string })),
      webSocketService.subscribe('order:status_changed', (payload) => 
        this.handleOrderStatusChanged(payload as { orderId: string; status: string; previousStatus: string })),
      webSocketService.subscribe('order:item_status_changed', (payload) => 
        this.handleItemStatusChanged(payload as { orderId: string; itemId: string; status: string; previousStatus: string; updatedBy?: string }))
    )

    // Handle connection state changes
    webSocketService.on('connected', () => {
      console.log('Order updates connected')
      // Request current order state after reconnection
      webSocketService.send('orders:sync', { requestFullSync: true })
    })

    webSocketService.on('disconnected', () => {
      console.warn('Order updates disconnected')
      toast.error('Lost connection to order updates. Reconnecting...')
    })

    webSocketService.on('error', (error) => {
      console.error('Order updates error:', error)
    })
  }

  /**
   * Cleanup handler
   */
  cleanup(): void {
    // Unsubscribe from all WebSocket events
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    this.orderUpdateCallbacks = []
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
  private handleOrderCreated(payload: { order: Order }): void {
    console.log('New order created:', payload.order.id)
    
    this.notifySubscribers({
      action: 'created',
      order: payload.order
    })

    // Show notification for new orders
    toast.success(`New order #${payload.order.orderNumber} received!`, {
      duration: 5000,
      position: 'top-right'
    })
  }

  /**
   * Handle order updated
   */
  private handleOrderUpdated(payload: { order: Order }): void {
    console.log('Order updated:', payload.order.id)
    
    this.notifySubscribers({
      action: 'updated',
      order: payload.order
    })
  }

  /**
   * Handle order deleted
   */
  private handleOrderDeleted(payload: { orderId: string }): void {
    console.log('Order deleted:', payload.orderId)
    
    this.notifySubscribers({
      action: 'deleted',
      orderId: payload.orderId
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
    console.log('Order status changed:', payload.orderId, payload.previousStatus, '->', payload.status)
    
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
    console.log('Item status changed:', payload.orderId, payload.itemId, payload.previousStatus, '->', payload.status)
    
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