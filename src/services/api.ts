// Legacy API wrapper for backward compatibility
// This file delegates to the new domain-specific services

import { 
  orderService,
  orderHistoryService,
  tableService,
  menuService,
  orderStatisticsService
} from './ServiceFactory'

export * from './types'

// Maintain backward compatibility with existing API structure
export const api = {
  // Orders
  getOrders: orderService.getOrders.bind(orderService),
  getOrderById: orderService.getOrderById.bind(orderService),
  updateOrderStatus: orderService.updateOrderStatus.bind(orderService),
  submitOrder: orderService.submitOrder.bind(orderService),
  subscribeToOrders: orderService.subscribeToOrders.bind(orderService),
  
  // Tables
  getTables: tableService.getTables.bind(tableService),
  getTableById: tableService.getTableById.bind(tableService),
  updateTableStatus: tableService.updateTableStatus.bind(tableService),
  
  // Menu
  getMenuItems: menuService.getMenuItems.bind(menuService),
  
  // Order History
  getOrderHistory: orderHistoryService.getOrderHistory.bind(orderHistoryService),
  
  // Statistics
  getOrderStatistics: orderStatisticsService.getOrderStatistics.bind(orderStatisticsService)
}