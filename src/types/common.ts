// Common type definitions used across the application

export interface Order {
  id: string
  orderNumber: string
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
  modifiers?: string[]
  notes?: string
  category?: string
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled'

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