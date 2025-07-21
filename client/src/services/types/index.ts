// Common types and interfaces used across services
// Re-exports from @rebuild/shared for backward compatibility

import type {
  Order as SharedOrder,
  OrderItem as SharedOrderItem,
  OrderStatus,
  OrderType,
  OrderFilters as SharedOrderFilters,
  MenuItem as SharedMenuItem,
  PaginationParams as SharedPaginationParams,
} from '@rebuild/shared'

// Re-export shared types with local naming for backward compatibility
// Extend OrderItem to match local expectations
export interface OrderItem extends Omit<SharedOrderItem, 'menu_item_id' | 'subtotal' | 'special_instructions'> {
  modifiers?: Array<{
    id: string
    name: string
    price: number
  }>
  notes?: string
}
export type { OrderStatus, OrderType }

// Map shared Order type to local format for backward compatibility
export interface Order extends Omit<SharedOrder, 'order_number' | 'total' | 'payment_status'> {
  orderNumber: string
  tableNumber: string
  orderTime: Date
  completedTime?: Date
  customerId?: string
  totalAmount: number
  paymentStatus: 'pending' | 'paid'
  preparationTime?: number // in minutes
  orderType?: 'dine-in' | 'drive-thru' | 'takeout'
}

// Re-export MenuItem with backward compatibility
export interface MenuItem extends Omit<SharedMenuItem, 'category' | 'category_id' | 'image_url' | 'is_available' | 'created_at' | 'updated_at' | 'modifier_groups'> {
  category: string // Use string instead of MenuCategory for compatibility
  available: boolean // Map from is_available
  imageUrl?: string // Map from image_url
  calories?: number
  modifiers?: {
    id: string
    name: string
    price: number
  }[] // Legacy format for modifiers
}

// Extend shared OrderFilters for local use
export interface OrderFilters extends SharedOrderFilters {
  tableId?: string
  dateFrom?: Date
  dateTo?: Date
}

// Re-export shared types
export type PaginationParams = SharedPaginationParams & {
  pageSize?: number // maps to 'limit' in shared types
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