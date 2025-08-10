// Common type definitions used across the application
// NOTE: These types are legacy and will be migrated to @rebuild/shared
// For now, they coexist with the shared types

import type { OrderStatus as SharedOrderStatus, OrderItemModifier } from '@rebuild/shared'

export interface Order {
  id: string
  order_number: string
  customerName: string
  items: OrderItem[]
  status: OrderStatus
  prepTime: number
  elapsedTime: number
  station?: Station
  timestamp: string
  restaurant_id: string
}

export interface OrderItem {
  id: string
  name: string
  quantity: number
  price?: number
  modifiers?: OrderItemModifier[] // Updated to match shared types
  notes?: string
  category?: string
}

// Extend shared OrderStatus to include legacy statuses
export type OrderStatus = SharedOrderStatus

export type Station = 'grill' | 'fryer' | 'salad' | 'expo' | 'bar'

export interface StationConfig {
  id: Station
  name: string
  color: string
  icon?: string
}

export interface FilterState {
  search: string
  station: Station | 'all'
  status: OrderStatus | 'all'
  dateRange: DateRange
}

export interface DateRange {
  start: Date | null
  end: Date | null
}

// Re-export from here for backward compatibility
export * from './filters'
export * from './station'