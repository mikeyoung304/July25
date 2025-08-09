/**
 * OrderService - Supports both mock data and real API calls
 * following Luis's API specification
 */

import { Order, OrderItem, OrderStatus, OrderType } from '@rebuild/shared'
import { httpClient } from '@/services/http/httpClient'

export interface IOrderService {
  getOrders(filters?: OrderFilters): Promise<Order[]>
  getOrderById(orderId: string): Promise<Order>
  updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order>
  submitOrder(orderData: Partial<Order>): Promise<Order>
  validateOrder(orderData: Partial<Order>): boolean
}

export interface OrderFilters {
  status?: OrderStatus[]
  tableNumber?: string
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
        params.status = filters.status.join(',')
      }
      if (filters?.tableNumber) {
        params.tableNumber = filters.tableNumber
      }
      if (filters?.orderType) {
        params.orderType = filters.orderType
      }
      if (filters?.dateRange) {
        params.startDate = filters.dateRange.start.toISOString()
        params.endDate = filters.dateRange.end.toISOString()
      }

      const response = await httpClient.get<{ orders: any[] }>('/api/v1/orders', { params })
      
      // Map response to match Order type
      const mappedOrders = response.orders.map((order: any) => ({
        ...order,
        items: order.items || [],
        status: order.status || 'new',
        orderType: order.orderType || 'dine-in',
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString(),
        subtotal: order.subtotal || order.totalAmount || 0,
        tax: order.tax || 0
      }))

      return mappedOrders
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error)
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
        orderType: response.orderType || 'dine-in',
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        subtotal: response.subtotal || response.totalAmount || 0,
        tax: response.tax || 0
      }
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error)
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
        orderType: response.orderType || 'dine-in',
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        subtotal: response.subtotal || response.totalAmount || 0,
        tax: response.tax || 0
      }
    } catch (error) {
      console.warn('API call failed, falling back to mock data:', error)
      const mockOrders = this.getMockOrders()
      const order = mockOrders.find(o => o.id === orderId)
      if (!order) throw new Error('Order not found')
      order.status = status
      order.updated_at = new Date().toISOString()
      return order
    }
  }

  async submitOrder(orderData: Partial<Order>): Promise<Order> {
    // Validate order data
    if (!this.validateOrder(orderData)) {
      throw new Error('Invalid order data')
    }

    try {
      const response = await httpClient.post<any>('/api/v1/orders', orderData)
      return {
        ...response,
        items: response.items || [],
        status: response.status || 'new',
        orderType: response.orderType || 'dine-in',
        created_at: response.created_at || new Date().toISOString(),
        updated_at: response.updated_at || new Date().toISOString(),
        subtotal: response.subtotal || response.totalAmount || 0,
        tax: response.tax || 0
      }
    } catch (error) {
      console.warn('API call failed, creating mock order:', error)
      
      // Create mock order
      const newOrder: Order = {
        id: `order-${Date.now()}`,
        restaurant_id: orderData.restaurant_id || 'default',
        orderNumber: `#${Math.floor(Math.random() * 10000)}`,
        tableNumber: orderData.tableNumber || '1',
        items: orderData.items || [],
        status: 'new',
        orderTime: new Date(),
        totalAmount: orderData.totalAmount || 0,
        paymentStatus: 'pending',
        orderType: orderData.orderType || 'dine-in',
        type: 'order',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: orderData.subtotal || orderData.totalAmount || 0,
        tax: orderData.tax || 0
      }

      return newOrder
    }
  }

  validateOrder(orderData: Partial<Order>): boolean {
    if (!orderData.items || orderData.items.length === 0) {
      return false
    }

    for (const item of orderData.items) {
      if (!item.id || !item.name || item.quantity <= 0) {
        return false
      }

      if (item.modifiers && !this.validateModifiers(item.modifiers)) {
        return false
      }

      if (item.notes && !this.validateNotes(item.notes)) {
        return false
      }
    }

    return true
  }

  private validateModifiers(modifiers: string[]): boolean {
    return modifiers.every(modifier => typeof modifier === 'string' && modifier.length > 0)
  }

  private validateNotes(notes: string): boolean {
    return typeof notes === 'string' && notes.length <= 500
  }

  private getMockOrders(): Order[] {
    return [
      {
        id: 'order-1',
        restaurant_id: 'default',
        orderNumber: '#1001',
        tableNumber: '1',
        items: [
          {
            id: 'item-1',
            menu_item_id: '1',
            name: 'Classic Burger',
            quantity: 2,
            price: 12.99,
            subtotal: 25.98,
            modifiers: ['extra cheese'],
            notes: 'Well done'
          }
        ],
        status: 'new',
        orderTime: new Date(),
        totalAmount: 25.98,
        paymentStatus: 'pending',
        orderType: 'dine-in',
        type: 'order',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subtotal: 25.98,
        tax: 2.60
      }
    ]
  }
}

export const orderService = new OrderService()