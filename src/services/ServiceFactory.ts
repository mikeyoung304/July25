// Service factory for dependency injection
import { OrderService, IOrderService } from './orders/OrderService'
import { OrderHistoryService, IOrderHistoryService } from './orders/OrderHistoryService'
import { TableService, ITableService } from './tables/TableService'
import { MenuService, IMenuService } from './menu/MenuService'
import { OrderStatisticsService, IOrderStatisticsService } from './statistics/OrderStatisticsService'

class ServiceFactory {
  private static instance: ServiceFactory
  
  private orderService: IOrderService
  private orderHistoryService: IOrderHistoryService
  private tableService: ITableService
  private menuService: IMenuService
  private orderStatisticsService: IOrderStatisticsService
  
  private constructor() {
    this.orderService = new OrderService()
    this.orderHistoryService = new OrderHistoryService()
    this.tableService = new TableService()
    this.menuService = new MenuService()
    this.orderStatisticsService = new OrderStatisticsService(this.orderHistoryService)
  }
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }
  
  getOrderService(): IOrderService {
    return this.orderService
  }
  
  getOrderHistoryService(): IOrderHistoryService {
    return this.orderHistoryService
  }
  
  getTableService(): ITableService {
    return this.tableService
  }
  
  getMenuService(): IMenuService {
    return this.menuService
  }
  
  getOrderStatisticsService(): IOrderStatisticsService {
    return this.orderStatisticsService
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance()

// Export service instances for convenience
export const orderService = serviceFactory.getOrderService()
export const orderHistoryService = serviceFactory.getOrderHistoryService()
export const tableService = serviceFactory.getTableService()
export const menuService = serviceFactory.getMenuService()
export const orderStatisticsService = serviceFactory.getOrderStatisticsService()