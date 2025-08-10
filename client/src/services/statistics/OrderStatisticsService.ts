import { OrderStatistics, DateRangeParams } from '@/services/types'
import { OrderHistoryService, orderHistoryService } from '@/services/orders/OrderHistoryService'

export interface IOrderStatisticsService {
  getOrderStatistics(params?: DateRangeParams): Promise<OrderStatistics>
}

export class OrderStatisticsService implements IOrderStatisticsService {
  constructor(private orderHistoryService: OrderHistoryService) {}

  async getOrderStatistics(params?: DateRangeParams): Promise<OrderStatistics> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const { orders } = await this.orderHistoryService.getOrderHistory(params)
    
    // Calculate statistics
    const stats: OrderStatistics = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.total, 0) / orders.length : 0,
      averagePreparationTime: orders.filter(o => o.estimated_ready_time).reduce((sum, o) => sum + (o.estimated_ready_time || 0), 0) / orders.filter(o => o.estimated_ready_time).length,
      ordersByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: orders.filter(o => new Date(o.created_at).getHours() === hour).length
      }))
    }
    
    return stats
  }
}

// Export singleton instance
export const orderStatisticsService = new OrderStatisticsService(orderHistoryService)