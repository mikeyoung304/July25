import { Order, OrderType, OrderHistoryParams } from '@/services/types'
import { mockOrderGenerator } from '@/services/realtime/orderSubscription'
// import { api } from '@/services/api'

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
      
      const total = Math.random() * 100 + 10;
      const tax = total * 0.08; // 8% tax
      const subtotal = total - tax;
      
      this.historicalOrders.push({
        id: `hist-${i}`,
        restaurant_id: 'rest-1',
        order_number: String(1000 - i).padStart(4, '0'),
        table_number: String(Math.floor(Math.random() * 20) + 1),
        items: mockOrderGenerator.generateOrder().items,
        status: Math.random() > 0.95 ? 'cancelled' : 'completed',
        type: 'dine-in' as OrderType,
        created_at: orderTime.toISOString(),
        updated_at: orderTime.toISOString(),
        completed_at: completedTime.toISOString(),
        subtotal,
        tax,
        total,
        payment_status: 'paid',
        estimated_ready_time: new Date(orderTime.getTime() + 15 * 60000).toISOString()
      } as Order)
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
      filtered = filtered.filter(order => new Date(order.created_at) >= params.startDate!)
    }
    
    if (params?.endDate) {
      filtered = filtered.filter(order => new Date(order.created_at) <= params.endDate!)
    }
    
    if (params?.searchQuery) {
      const query = params.searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(query) ||
        order.table_number.toLowerCase().includes(query) ||
        order.items.some(item => item.name.toLowerCase().includes(query))
      )
    }
    
    // Pagination
    const page = params?.page || 1
    const pageSize = params?.limit || 20
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