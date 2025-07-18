// Common types and interfaces used across services

// Import OrderItem type for use in this file
import type { OrderItem as CommonOrderItem } from '@/types/common'

// Re-export as OrderItem for backward compatibility
export type OrderItem = CommonOrderItem

export interface Order {
  id: string
  restaurant_id: string
  orderNumber: string
  tableNumber: string
  items: OrderItem[]
  status: 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  orderTime: Date
  completedTime?: Date
  customerId?: string
  totalAmount: number
  paymentStatus: 'pending' | 'paid'
  notes?: string
  preparationTime?: number // in minutes
  orderType?: 'dine-in' | 'drive-thru' | 'takeout'
}

// Table type has been moved to @/modules/floor-plan/types/index.ts
// to avoid duplication and ensure consistency

export interface MenuItem {
  id: string
  restaurant_id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
  imageUrl?: string
  calories?: number
  modifiers?: {
    id: string
    name: string
    price: number
  }[]
}

export interface OrderFilters {
  status?: string
  tableId?: string
  search?: string
  dateFrom?: Date
  dateTo?: Date
  type?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface DateRangeParams {
  startDate?: Date
  endDate?: Date
}

export interface OrderHistoryParams extends PaginationParams, DateRangeParams {
  searchQuery?: string
}

export interface OrderStatistics {
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  averageOrderValue: number
  averagePreparationTime: number
  ordersByHour: Array<{
    hour: number
    count: number
  }>
}