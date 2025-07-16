/**
 * OrderService - Supports both mock data and real API calls
 * following Luis's API specification
 */

import { HttpServiceAdapter } from '@/services/base/HttpServiceAdapter'
import { Order, OrderFilters } from '@/services/types'
import { orderSubscription, mockOrderGenerator as _mockOrderGenerator, startOrderProgression, initializeOrderStore, OrderEvent } from '@/services/realtime/orderSubscription'
import { 
  validateTableNumber, 
  validateItemName,
  validateModifiers,
  validateNotes,
  validateQuantity,
  validatePrice
} from '@/utils'
import { mockData } from '@/services/mockData'

// Map legacy 'delivered' status to 'completed' for backward compatibility
const mapOrderStatus = (status: string): Order['status'] => {
  if (status === 'delivered') {
    return 'completed'
  }
  return status as Order['status']
}

export interface IOrderService {
  getOrders(restaurantId: string, filters?: OrderFilters): Promise<{ orders: Order[]; total: number }>
  getOrderById(restaurantId: string, orderId: string): Promise<Order>
  updateOrderStatus(restaurantId: string, orderId: string, status: Order['status']): Promise<{ success: boolean; order: Order }>
  submitOrder(restaurantId: string, orderData: Partial<Order>): Promise<{ success: boolean; orderId: string; order: Order }>
  subscribeToOrders(restaurantId: string, callback: (order: Order) => void): () => void
}

export class OrderService extends HttpServiceAdapter implements IOrderService {
  constructor() {
    super()
    // Initialize order store with mock data for real-time updates
    initializeOrderStore(mockData.orders)
  }

  async getOrders(restaurantId: string, filters?: OrderFilters): Promise<{ orders: Order[]; total: number }> {
    this.checkRateLimit('getOrders')
    
    return this.execute(
      // Real API call
      async () => {
        const params: Record<string, unknown> = {}
        
        // Add filters as query parameters
        if (filters?.status) {
          params.status = filters.status
        }
        if (filters?.tableId) {
          params.table_id = filters.tableId
        }
        if (filters?.search) {
          params.search = filters.search
        }
        if (filters?.dateFrom) {
          params.date_from = filters.dateFrom.toISOString()
        }
        if (filters?.dateTo) {
          params.date_to = filters.dateTo.toISOString()
        }
        
        // API returns paginated response
        const response = await this.httpClient.get<{
          orders: Order[]
          total: number
          page: number
          pageSize: number
        }>('/api/v1/orders', { params })
        
        this.logServiceCall('GET', '/api/v1/orders', params, response)
        
        // Map order statuses for backward compatibility
        const mappedOrders = response.orders.map(order => ({
          ...order,
          status: mapOrderStatus(order.status)
        }))
        
        return { orders: mappedOrders, total: response.total }
      },
      // Mock implementation
      async () => {
        await this.delay(500)
        
        let filtered = [...mockData.orders].filter(order => order.restaurant_id === restaurantId)
        
        if (filters?.status) {
          filtered = filtered.filter(order => order.status === filters.status)
        }
        
        if (filters?.tableId) {
          filtered = filtered.filter(order => 
            mockData.tables.find(t => t.id === filters.tableId && t.current_order_id === order.id)
          )
        }
        
        const mappedOrders = filtered.map(order => ({
          ...order,
          status: mapOrderStatus(order.status)
        }))
        
        return { orders: mappedOrders, total: mappedOrders.length }
      }
    )
  }

  async getOrderById(restaurantId: string, orderId: string): Promise<Order> {
    return this.execute(
      // Real API call
      async () => {
        const response = await this.httpClient.get<Order>(`/api/v1/orders/${orderId}`)
        
        this.logServiceCall('GET', `/api/v1/orders/${orderId}`, null, response)
        
        // Verify the order belongs to the correct restaurant
        if (response.restaurant_id !== restaurantId) {
          throw new Error('Order not found')
        }
        
        return {
          ...response,
          status: mapOrderStatus(response.status)
        }
      },
      // Mock implementation
      async () => {
        await this.delay(300)
        const order = mockData.orders.find(o => o.id === orderId && o.restaurant_id === restaurantId)
        if (!order) throw new Error('Order not found')
        return {
          ...order,
          status: mapOrderStatus(order.status)
        }
      }
    )
  }

  async updateOrderStatus(restaurantId: string, orderId: string, status: Order['status']): Promise<{ success: boolean; order: Order }> {
    return this.execute(
      // Real API call
      async () => {
        const response = await this.httpClient.patch<Order>(
          `/api/v1/orders/${orderId}/status`,
          { status }
        )
        
        this.logServiceCall('PATCH', `/api/v1/orders/${orderId}/status`, { status }, response)
        
        // Verify the order belongs to the correct restaurant
        if (response.restaurant_id !== restaurantId) {
          throw new Error('Order not found')
        }
        
        const updatedOrder = {
          ...response,
          status: mapOrderStatus(response.status)
        }
        
        return { success: true, order: updatedOrder }
      },
      // Mock implementation
      async () => {
        await this.delay(300)
        const order = mockData.orders.find(o => o.id === orderId && o.restaurant_id === restaurantId)
        if (!order) throw new Error('Order not found')
        
        const previousStatus = order.status
        order.status = status
        order.completedTime = status === 'completed' ? new Date() : undefined
        
        // Notify subscribers
        orderSubscription.emitOrderStatusChanged(
          orderId,
          mapOrderStatus(status),
          mapOrderStatus(previousStatus)
        )
        
        return { 
          success: true, 
          order: {
            ...order,
            status: mapOrderStatus(order.status)
          }
        }
      }
    )
  }

  async submitOrder(restaurantId: string, orderData: Partial<Order>): Promise<{ success: boolean; orderId: string; order: Order }> {
    // Validate order data
    if (!orderData.tableNumber) throw new Error('Table number is required')
    validateTableNumber(orderData.tableNumber)
    
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain at least one item')
    }
    
    // Validate each item
    orderData.items.forEach((item, index) => {
      if (!validateItemName(item.name)) {
        throw new Error(`Invalid item name at position ${index + 1}`)
      }
      if (!validateQuantity(item.quantity)) {
        throw new Error(`Invalid quantity for ${item.name}`)
      }
      if (item.price !== undefined && !validatePrice(item.price)) {
        throw new Error(`Invalid price for ${item.name}`)
      }
      if (item.modifiers && !validateModifiers(item.modifiers)) {
        throw new Error(`Invalid modifiers for ${item.name}`)
      }
      if (item.notes && !validateNotes(item.notes)) {
        throw new Error(`Invalid notes for ${item.name}`)
      }
    })
    
    return this.execute(
      // Real API call
      async () => {
        const response = await this.httpClient.post<{
          success: boolean
          orderId: string
          order: Order
        }>('/api/v1/orders', {
          restaurant_id: restaurantId,
          table_number: orderData.tableNumber,
          items: orderData.items,
          notes: orderData.notes,
          order_type: orderData.orderType
        })
        
        this.logServiceCall('POST', '/api/v1/orders', orderData, response)
        
        return {
          success: response.success,
          orderId: response.orderId,
          order: {
            ...response.order,
            status: mapOrderStatus(response.order.status)
          }
        }
      },
      // Mock implementation
      async () => {
        await this.delay(500)
        
        const table = mockData.tables.find(t => 
          t.restaurant_id === restaurantId && t.label === orderData.tableNumber
        )
        if (!table) throw new Error('Table not found')
        
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          restaurant_id: restaurantId,
          orderNumber: String(parseInt(mockData.orders[mockData.orders.length - 1]?.orderNumber || '0') + 1).padStart(3, '0'),
          tableNumber: orderData.tableNumber!,
          items: orderData.items!,
          status: 'new',
          orderTime: new Date(),
          totalAmount: orderData.totalAmount!,
          paymentStatus: 'pending',
          orderType: orderData.orderType || 'dine-in'
        }
        
        mockData.orders.push(newOrder)
        table.status = 'occupied'
        table.current_order_id = newOrder.id
        
        // Start order progression simulation
        startOrderProgression()
        
        // Notify subscribers
        orderSubscription.emitOrderCreated(newOrder)
        
        return { 
          success: true, 
          orderId: newOrder.id, 
          order: {
            ...newOrder,
            status: mapOrderStatus(newOrder.status)
          }
        }
      }
    )
  }

  subscribeToOrders(restaurantId: string, callback: (order: Order) => void): () => void {
    // Generate unique subscription ID
    const subscriptionId = `order-sub-${Date.now()}-${Math.random()}`
    
    // Wrap callback to handle events and filter by restaurant
    const eventCallback = (event: OrderEvent) => {
      if (event.type === 'ORDER_CREATED' || event.type === 'ORDER_UPDATED') {
        if (event.order.restaurant_id === restaurantId) {
          callback({
            ...event.order,
            status: mapOrderStatus(event.order.status)
          })
        }
      }
    }
    
    // TODO: Implement real WebSocket subscription when Task 7 is completed
    // For now, use the mock subscription
    return orderSubscription.subscribe(subscriptionId, eventCallback)
  }

  // Reset method for tests
  reset(): void {
    // Reset http client state
    this.resetRateLimit()
    // Re-initialize order store with fresh mock data
    initializeOrderStore(mockData.orders)
  }
}

export const orderService = new OrderService()