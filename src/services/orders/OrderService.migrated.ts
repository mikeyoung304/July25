/**
 * OrderService - Migrated to use HttpServiceAdapter
 * This service now supports both mock data and real API calls
 * following Luis's API specification
 */

import { HttpServiceAdapter } from '@/services/base/HttpServiceAdapter'
import { Order, OrderFilters } from '@/services/types'
import { orderSubscription, mockOrderGenerator, startOrderProgression, initializeOrderStore } from '@/services/realtime/orderSubscription'
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
            mockData.tables.find(t => t.id === filters.tableId && t.currentOrderId === order.id)
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

  async updateOrderStatus(
    restaurantId: string, 
    orderId: string, 
    status: Order['status']
  ): Promise<{ success: boolean; order: Order }> {
    this.checkRateLimit('updateOrderStatus')
    
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
        
        return { 
          success: true, 
          order: {
            ...response,
            status: mapOrderStatus(response.status)
          }
        }
      },
      // Mock implementation
      async () => {
        await this.delay(400)
        
        const order = mockData.orders.find(o => o.id === orderId && o.restaurant_id === restaurantId)
        if (!order) throw new Error('Order not found')
        
        const previousStatus = order.status
        order.status = status
        
        // Emit real-time event
        orderSubscription.emitOrderStatusChanged(orderId, status, previousStatus)
        
        console.log('Mock: Updated order status', { orderId, status })
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

  async submitOrder(
    restaurantId: string, 
    orderData: Partial<Order>
  ): Promise<{ success: boolean; orderId: string; order: Order }> {
    this.checkRateLimit('submitOrder')
    
    // Validate table number
    const tableNumber = orderData.tableNumber ? 
      validateTableNumber(orderData.tableNumber) : '1'
    if (!tableNumber) {
      throw new Error('Invalid table number')
    }
    
    // Validate and sanitize items
    const validatedItems = (orderData.items || []).map(item => {
      const validatedName = item.name ? validateItemName(item.name) : null
      if (!validatedName) {
        throw new Error(`Invalid item name: ${item.name}`)
      }
      
      const validatedQuantity = validateQuantity(item.quantity)
      if (!validatedQuantity) {
        throw new Error(`Invalid quantity for ${item.name}`)
      }
      
      const validatedModifiers = item.modifiers ? 
        validateModifiers(item.modifiers) : undefined
      
      const validatedNotes = item.notes ? 
        validateNotes(item.notes) : undefined
      
      const validatedPrice = item.price !== undefined ? 
        validatePrice(item.price) : undefined
      
      return {
        ...item,
        name: validatedName,
        quantity: validatedQuantity,
        modifiers: validatedModifiers,
        notes: validatedNotes !== null ? validatedNotes : undefined,
        price: validatedPrice !== null ? validatedPrice : undefined
      }
    })
    
    // Validate total amount
    const validatedTotalAmount = orderData.totalAmount !== undefined ?
      validatePrice(orderData.totalAmount) : 0
    if (validatedTotalAmount === null) {
      throw new Error('Invalid total amount')
    }
    
    return this.execute(
      // Real API call
      async () => {
        const orderPayload = {
          tableNumber,
          items: validatedItems,
          totalAmount: validatedTotalAmount,
          notes: orderData.notes && validateNotes(orderData.notes) || undefined,
          orderType: orderData.orderType || 'dine-in'
        }
        
        const response = await this.httpClient.post<Order>(
          '/api/v1/orders',
          orderPayload
        )
        
        this.logServiceCall('POST', '/api/v1/orders', orderPayload, response)
        
        return { 
          success: true, 
          orderId: response.id, 
          order: response 
        }
      },
      // Mock implementation
      async () => {
        await this.delay(600)
        
        const newOrder: Order = {
          id: `order-${Date.now()}`,
          restaurant_id: restaurantId,
          orderNumber: String(mockData.orders.length + 1).padStart(3, '0'),
          tableNumber,
          items: validatedItems,
          status: 'new',
          orderTime: new Date(),
          totalAmount: validatedTotalAmount,
          paymentStatus: 'pending',
          notes: orderData.notes && validateNotes(orderData.notes) || undefined
        }
        
        mockData.orders.push(newOrder)
        
        // Emit real-time event
        orderSubscription.emitOrderCreated(newOrder)
        
        console.log('Mock: Submitted order', newOrder)
        return { success: true, orderId: newOrder.id, order: newOrder }
      }
    )
  }

  subscribeToOrders(restaurantId: string, callback: (order: Order) => void): () => void {
    // For now, this remains mock-only as WebSocket implementation is pending
    // TODO: Implement real WebSocket subscription when Task 7 is completed
    
    // Start order progression simulation
    const stopProgression = startOrderProgression()
    
    // Subscribe to order events for this restaurant
    const unsubscribe = orderSubscription.subscribe(`restaurant-${restaurantId}`, (event) => {
      if (event.type === 'ORDER_CREATED' && event.order.restaurant_id === restaurantId) {
        callback(event.order)
      }
    })
    
    // Simulate new orders coming in for this restaurant
    const interval = setInterval(() => {
      const randomOrder = mockOrderGenerator.generateOrder()
      // Ensure the order has the correct restaurant_id
      randomOrder.restaurant_id = restaurantId
      mockData.orders.push(randomOrder)
      orderSubscription.emitOrderCreated(randomOrder)
    }, 20000) // New order every 20 seconds
    
    // Return unsubscribe function
    return () => {
      clearInterval(interval)
      stopProgression()
      unsubscribe()
    }
  }
}

// Export singleton instance
export const orderService = new OrderService()