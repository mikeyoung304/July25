/**
 * OrderService - Supports both mock data and real API calls
 * following Luis's API specification
 */

import { Order, OrderItem, OrderItemModifier, OrderStatus, OrderType } from '@rebuild/shared'
import { logger } from '@/services/logger'
import { httpClient } from '@/services/http/httpClient'

export interface IOrderService {
  getOrders(filters?: OrderFilters): Promise<Order[]>
  getOrderById(orderId: string): Promise<Order>
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>
  submitOrder(orderData: Partial<Order>): Promise<Order>
  validateOrder(orderData: Partial<Order>): boolean
}

export interface OrderFilters {
  status?: OrderStatus | OrderStatus[]
  tableNumber?: string
  tableId?: string
  orderType?: OrderType
  dateRange?: {
    start: Date
    end: Date
  }
}

export class OrderService implements IOrderService {
  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    try {
      const params: Record<string, unknown> = {}
      
      if (filters?.status) {
        params.status = Array.isArray(filters.status) 
          ? filters.status.join(',') 
          : filters.status
      }
      if (filters?.tableNumber) {
        params.table_number = filters.tableNumber
      }
      if (filters?.orderType) {
        params.type = filters.orderType
      }
      if (filters?.dateRange) {
        params.startDate = filters.dateRange.start.toISOString()
        params.endDate = filters.dateRange.end.toISOString()
      }

      const response = await httpClient.get<any>('/api/v1/orders', { params })
      
      // Handle both array response and object with orders property
      let orders: any[] = []
      if (Array.isArray(response)) {
        orders = response
      } else if (response.orders && Array.isArray(response.orders)) {
        orders = response.orders
      } else {
        logger.warn('API returned invalid orders data:', response)
        return []
      }
      
      // Map response to match Order type
      const mappedOrders = orders.map((order: any) => ({
        ...order,
        items: order.items || [],
        status: order.status || 'new',
        type: order.type || 'dine-in',
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString(),
        subtotal: order.subtotal || order.total || 0,
        tax: order.tax || 0
      }))

      return mappedOrders
    } catch (error) {
      logger.warn('API call failed, falling back to mock data:', error)
      return this.getMockOrders()
    }
  }

  async getOrderById(orderId: string): Promise<Order> {
    try {
      const response = await httpClient.get<any>(`/api/v1/orders/${orderId}`)
      return {
        ...response,
        items: response.items || [],
        status: response.status || 'new',
        type: response.type || response.type || 'dine-in',
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        subtotal: response.subtotal || 0,
        tax: response.tax || 0,
        total: response.total || response.total || 0,
        payment_status: response.payment_status || response.payment_status || 'pending'
      }
    } catch (error) {
      logger.warn('API call failed, falling back to mock data:', error)
      const mockOrders = this.getMockOrders()
      const order = mockOrders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found')
      return order
    }
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    try {
      const response = await httpClient.patch<any>(`/api/v1/orders/${orderId}/status`, { status })
      return {
        ...response,
        items: response.items || [],
        status: response.status || 'new',
        type: response.type || response.type || 'dine-in',
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        subtotal: response.subtotal || 0,
        tax: response.tax || 0,
        total: response.total || response.total || 0,
        payment_status: response.payment_status || response.payment_status || 'pending'
      }
    } catch (error) {
      logger.warn('API call failed, falling back to mock data:', error)
      const mockOrders = this.getMockOrders()
      const order = mockOrders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found')
      order.status = status
      order.updated_at = new Date().toISOString()
      return order
    }
  }

  async submitOrder(orderData: Partial<Order>): Promise<Order> {
    logger.info('[OrderService] submitOrder called with:', orderData)
    
    // Validate order data
    if (!this.validateOrder(orderData)) {
      logger.error('[OrderService] Order validation failed, throwing error')
      throw new Error('Invalid order data - check console for details')
    }

    logger.info('[OrderService] Validation passed, sending to API...')
    
    try {
      const response = await httpClient.post<any>('/api/v1/orders', orderData)
      logger.info('[OrderService] API response:', response)
      return {
        ...response,
        items: response.items || [],
        status: response.status || 'new',
        type: response.type || response.type || 'dine-in',
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        subtotal: response.subtotal || 0,
        tax: response.tax || 0,
        total: response.total || response.total || 0,
        payment_status: response.payment_status || response.payment_status || 'pending'
      }
    } catch (error) {
      logger.warn('API call failed, creating mock order:', error)
      
      // Create mock order
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        restaurant_id: orderData.restaurant_id || 'default',
        order_number: `#${Math.floor(Math.random() * 10000)}`,
        table_number: orderData.table_number || '1',
        items: orderData.items || [],
        status: 'new',
        type: (orderData.type || 'dine-in') as OrderType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: orderData.subtotal || orderData.total || 0,
        tax: orderData.tax || 0,
        total: orderData.total || 0,
        payment_status: 'pending'
      }

      return newOrder
    }
  }

  validateOrder(orderData: Partial<Order>): boolean {
    logger.info('[OrderService] Validating order:', orderData)
    
    if (!orderData.items || orderData.items.length === 0) {
      logger.warn('[OrderService] Validation failed: No items in order')
      return false
    }

    logger.info(`[OrderService] Checking ${orderData.items.length} items...`)
    
    for (let i = 0; i < orderData.items.length; i++) {
      const item = orderData.items[i]
      logger.info(`[OrderService] Validating item ${i}:`, item)
      
      // Check for either id or menu_item_id (support both formats)
      const hasId = item.id || item.menu_item_id
      if (!hasId) {
        logger.warn(`[OrderService] Item ${i} missing id or menu_item_id:`, { id: item.id, menu_item_id: item.menu_item_id })
        return false
      }
      
      if (!item.name) {
        logger.warn(`[OrderService] Item ${i} missing name`)
        return false
      }
      
      if (!item.quantity || item.quantity <= 0) {
        logger.warn(`[OrderService] Item ${i} invalid quantity:`, item.quantity)
        return false
      }

      if (item.modifiers && !this.validateModifiers(item.modifiers)) {
        logger.warn(`[OrderService] Item ${i} has invalid modifiers:`, item.modifiers)
        return false
      }

      if (item.special_instructions && !this.validateNotes(item.special_instructions)) {
        logger.warn(`[OrderService] Item ${i} has invalid special instructions:`, item.special_instructions)
        return false
      }
    }

    logger.info('[OrderService] Order validation passed!')
    return true
  }

  private validateModifiers(modifiers: OrderItemModifier[]): boolean {
    return modifiers.every(modifier => 
      modifier.id && 
      modifier.name && 
      typeof modifier.price === 'number'
    )
  }

  private validateNotes(notes: string): boolean {
    return typeof notes === 'string' && notes.length <= 500
  }

  private getMockOrders(): Order[] {
    return [
      {
        id: 'order-1',
        restaurant_id: 'default',
        order_number: '#1001',
        table_number: '1',
        items: [
          {
            id: 'item-1',
            menu_item_id: '1',
            name: 'Classic Burger',
            quantity: 2,
            price: 12.99,
            subtotal: 25.98,
            modifiers: [
              {
                id: 'mod-1',
                name: 'extra cheese',
                price: 1.50
              }
            ],
            special_instructions: 'Well done'
          }
        ],
        status: 'new',
        type: 'dine-in' as OrderType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: 25.98,
        tax: 2.60,
        total: 28.58,
        payment_status: 'pending'
      }
    ]
  }
}

export const orderService = new OrderService() 