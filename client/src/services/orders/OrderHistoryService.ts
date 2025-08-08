import { Order, OrderHistoryParams } from '@/services/types'
import { mockOrderGenerator } from '@/services/realtime/orderSubscription'
import { api } from '@/services/api'

export interface IOrderHistoryService {
  getOrderHistory(params?: OrderHistoryParams): Promise<{
    orders: Order[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>
}

export class OrderHistoryService implements IOrderHistoryService {
  private historicalOrders: Order[] = []

  constructor() {
    this.generateHistoricalOrders()
  }

  private generateHistoricalOrders(): void {
    const now = new Date()
    
    // Generate 50 completed orders for demo
    for (let i = 0; i < 50; i++) {
      const orderTime = new Date(now.getTime() - (i * 60 * 60 * 1000)) // 1 hour apart
      const completedTime = new Date(orderTime.getTime() + (15 + Math.random() * 30) * 60 * 1000) // 15-45 min later
      
      this.historicalOrders.push({
        id: `hist-${i}`,
        restaurant_id: 'rest-1',
        orderNumber: String(1000 - i).padStart(4, '0'),
        tableNumber: String(Math.floor(Math.random() * 20) + 1),
        items: mockOrderGenerator.generateOrder().items,
        status: Math.random() > 0.95 ? 'cancelled' : 'completed',
        orderTime,
        completedTime,
        totalAmount: Math.random() * 100 + 10,
        paymentStatus: 'paid',
        preparationTime: Math.round((completedTime.getTime() - orderTime.getTime()) / 60000)
      })
    }
  }

  async getOrderHistory(params?: OrderHistoryParams): Promise<{
    orders: Order[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Apply filters
    let filtered = [...this.historicalOrders]
    
    if (params?.startDate) {
      filtered = filtered.filter(order => order.orderTime >= params.startDate!)
    }
    
    if (params?.endDate) {
      filtered = filtered.filter(order => order.orderTime <= params.endDate!)
    }
    
    if (params?.searchQuery) {
      const query = params.searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(query) ||
        order.tableNumber.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      )
    }
    
    // Pagination
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    
    const paginatedOrders = filtered.slice(startIndex, endIndex)
    
    return {
      orders: paginatedOrders,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize)
    }
  }
}

// Export singleton instance
export const orderHistoryService = new OrderHistoryService()