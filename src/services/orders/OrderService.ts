import { BaseService } from '@/services/base/BaseService'
import { Order, OrderFilters } from '@/services/types'
import { orderSubscription, mockOrderGenerator, startOrderProgression } from '@/services/realtime/orderSubscription'
import { 
  validateTableNumber, 
  validateItemName,
  validateModifiers,
  validateNotes,
  validateQuantity,
  validatePrice
} from '@/utils'
import { mockData } from '@/services/mockData'

export interface IOrderService {
  getOrders(filters?: OrderFilters): Promise<{ orders: Order[]; total: number }>
  getOrderById(orderId: string): Promise<Order>
  updateOrderStatus(orderId: string, status: Order['status']): Promise<{ success: boolean; order: Order }>
  submitOrder(orderData: Partial<Order>): Promise<{ success: boolean; orderId: string; order: Order }>
  subscribeToOrders(callback: (order: Order) => void): () => void
}

export class OrderService extends BaseService implements IOrderService {
  async getOrders(filters?: OrderFilters): Promise<{ orders: Order[]; total: number }> {
    this.checkRateLimit('getOrders')
    await this.delay(500)
    
    let filtered = [...mockData.orders]
    
    if (filters?.status) {
      filtered = filtered.filter(order => order.status === filters.status)
    }
    
    if (filters?.tableId) {
      filtered = filtered.filter(order => 
        mockData.tables.find(t => t.id === filters.tableId && t.currentOrderId === order.id)
      )
    }
    
    return { orders: filtered, total: filtered.length }
  }

  async getOrderById(orderId: string): Promise<Order> {
    await this.delay(300)
    const order = mockData.orders.find(o => o.id === orderId)
    if (!order) throw new Error('Order not found')
    return order
  }

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<{ success: boolean; order: Order }> {
    this.checkRateLimit('updateOrderStatus')
    await this.delay(400)
    
    const order = mockData.orders.find(o => o.id === orderId)
    if (!order) throw new Error('Order not found')
    
    const previousStatus = order.status
    order.status = status
    
    // Emit real-time event
    orderSubscription.emitOrderStatusChanged(orderId, status, previousStatus)
    
    console.log('Mock: Updated order status', { orderId, status })
    return { success: true, order }
  }

  async submitOrder(orderData: Partial<Order>): Promise<{ success: boolean; orderId: string; order: Order }> {
    this.checkRateLimit('submitOrder')
    await this.delay(600)
    
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
        notes: validatedNotes,
        price: validatedPrice
      }
    })
    
    // Validate total amount
    const validatedTotalAmount = orderData.totalAmount !== undefined ?
      validatePrice(orderData.totalAmount) : 0
    if (validatedTotalAmount === null) {
      throw new Error('Invalid total amount')
    }
    
    const newOrder: Order = {
      id: `order-${Date.now()}`,
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

  subscribeToOrders(callback: (order: Order) => void): () => void {
    // Start order progression simulation
    const stopProgression = startOrderProgression()
    
    // Simulate new orders coming in
    const interval = setInterval(() => {
      const randomOrder = mockOrderGenerator.generateOrder()
      mockData.orders.push(randomOrder)
      orderSubscription.emitOrderCreated(randomOrder)
      callback(randomOrder)
    }, 20000) // New order every 20 seconds
    
    // Return unsubscribe function
    return () => {
      clearInterval(interval)
      stopProgression()
    }
  }
}

// Export singleton instance
export const orderService = new OrderService()