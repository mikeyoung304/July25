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

import { transcriptionService } from './transcription/TranscriptionService'

// Voice transcription function
export async function submitAudioForTranscription(audioBlob?: Blob): Promise<{ success: boolean; transcript: string }> {
  // If no blob provided, return error
  if (!audioBlob) {
    return {
      success: false,
      transcript: 'No audio data provided'
    }
  }

  // Use the transcription service
  const result = await transcriptionService.transcribeAudio(audioBlob)
  
  return {
    success: result.success,
    transcript: result.transcript || result.error || 'Transcription failed'
  }
}

import type { Order, OrderFilters, Table } from './types'

// Default restaurant ID for backward compatibility
const DEFAULT_RESTAURANT_ID = 'rest-1'

// Maintain backward compatibility with existing API structure
export const api = {
  // Orders
  getOrders: (filters?: OrderFilters) => orderService.getOrders(DEFAULT_RESTAURANT_ID, filters),
  getOrderById: (orderId: string) => orderService.getOrderById(DEFAULT_RESTAURANT_ID, orderId),
  updateOrderStatus: (orderId: string, status: Order['status']) => orderService.updateOrderStatus(DEFAULT_RESTAURANT_ID, orderId, status),
  submitOrder: (orderData: Partial<Order>) => orderService.submitOrder(DEFAULT_RESTAURANT_ID, orderData),
  subscribeToOrders: (callback: (order: Order) => void) => orderService.subscribeToOrders(DEFAULT_RESTAURANT_ID, callback),
  
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