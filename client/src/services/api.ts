// Legacy API wrapper for backward compatibility
// This file delegates to the new domain-specific services

import { 
  orderService,
  orderHistoryService,
  tableService,
  menuService,
  orderStatisticsService
} from '.'

export * from './types'

// Voice transcription removed - use WebRTC real-time voice instead

import type { Order, OrderFilters } from './types'
import type { Table } from '../modules/floor-plan/types'

// Default restaurant ID for backward compatibility - use the actual UUID from .env
const DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'

// Maintain backward compatibility with existing API structure
export const api = {
  // Orders
  getOrders: (filters?: OrderFilters) => orderService.getOrders(filters),
  getOrderById: (orderId: string) => orderService.getOrderById(orderId),
  updateOrderStatus: (orderId: string, status: Order['status']) => orderService.updateOrderStatus(orderId, status),
  submitOrder: (orderData: Partial<Order>) => orderService.submitOrder(orderData),
  createOrder: (orderData: any) => orderService.submitOrder(orderData), // Alias for backward compatibility
  
  // Tables
  getTables: () => tableService.getTables(),
  getTableById: (tableId: string) => tableService.getTableById(tableId),
  updateTableStatus: (tableId: string, status: Table['status']) => tableService.updateTableStatus(tableId, status),
  
  // Menu
  getMenuItems: menuService.getMenuItems.bind(menuService),
  
  // Order History
  getOrderHistory: orderHistoryService.getOrderHistory.bind(orderHistoryService),
  
  // Statistics
  getOrderStatistics: orderStatisticsService.getOrderStatistics.bind(orderStatisticsService)
}