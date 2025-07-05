import { BaseService } from '@/services/base/BaseService'
import { OrderStatistics, DateRangeParams } from '@/services/types'
import { OrderHistoryService } from '@/services/orders/OrderHistoryService'

export interface IOrderStatisticsService {
  getOrderStatistics(params?: DateRangeParams): Promise<OrderStatistics>
}

export class OrderStatisticsService extends BaseService implements IOrderStatisticsService {
  constructor(private orderHistoryService: OrderHistoryService) {
    super()
  }

  async getOrderStatistics(params?: DateRangeParams): Promise<OrderStatistics> {
    await this.delay(300)
    
    const { orders } = await this.orderHistoryService.getOrderHistory(params)
    
    // Calculate statistics
    const stats: OrderStatistics = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === 'completed').length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0,
      averagePreparationTime: orders.filter(o => o.preparationTime).reduce((sum, o) => sum + (o.preparationTime || 0), 0) / orders.filter(o => o.preparationTime).length,
      ordersByHour: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: orders.filter(o => new Date(o.orderTime).getHours() === hour).length
      }))
    }
    
    return stats
  }
}

// Export singleton instance
export const orderStatisticsService = new OrderStatisticsService()