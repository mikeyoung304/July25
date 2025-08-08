import type { StationType } from './station'
import type { Order } from '@/services/types'

export type OrderStatus = Order['status']

export type SortBy = 
  | 'orderTime' 
  | 'orderNumber' 
  | 'tableNumber' 
  | 'status' 
  | 'itemCount'

export type SortDirection = 'asc' | 'desc'

export interface TimeRange {
  start?: Date
  end?: Date
  preset?: 'last15min' | 'last30min' | 'last1hour' | 'today' | 'custom'
}

export interface OrderFilters {
  status: OrderStatus[]
  stations: (StationType | 'all')[]
  timeRange: TimeRange
  searchQuery: string
  sortBy: SortBy
  sortDirection: SortDirection
}

export interface FilterStats {
  totalOrders: number
  filteredOrders: number
  ordersByStatus: Record<OrderStatus, number>
  ordersByStation: Record<StationType, number>
}

// Default filter values
export const defaultFilters: OrderFilters = {
  status: ['new', 'preparing', 'ready'],
  stations: ['all'],
  timeRange: { preset: 'today' },
  searchQuery: '',
  sortBy: 'orderTime',
  sortDirection: 'desc'
}

// Filter helper functions
export const applyFilters = (orders: Order[], filters: OrderFilters): Order[] => {
  return orders.filter(order => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(order.status)) {
      return false
    }

    // Station filter - handled separately as it needs item-level checking
    // This will be implemented in the component that has access to stationRouting

    // Time range filter
    if (filters.timeRange.start || filters.timeRange.end) {
      const orderDate = new Date(order.orderTime)
      if (filters.timeRange.start && orderDate < filters.timeRange.start) {
        return false
      }
      if (filters.timeRange.end && orderDate > filters.timeRange.end) {
        return false
      }
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      const matchesOrderNumber = order.orderNumber.toLowerCase().includes(query)
      const matchesTableNumber = order.tableNumber.toLowerCase().includes(query)
      const matchesItems = order.items.some(item => 
        item.name.toLowerCase().includes(query)
      )
      
      if (!matchesOrderNumber && !matchesTableNumber && !matchesItems) {
        return false
      }
    }

    return true
  })
}

export const sortOrders = (orders: Order[], sortBy: SortBy, direction: SortDirection): Order[] => {
  const sorted = [...orders].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'orderTime':
        comparison = new Date(a.orderTime).getTime() - new Date(b.orderTime).getTime()
        break
      case 'orderNumber':
        comparison = a.orderNumber.localeCompare(b.orderNumber)
        break
      case 'tableNumber':
        comparison = a.tableNumber.localeCompare(b.tableNumber)
        break
      case 'status': {
        const statusOrder = { 'new': 0, 'pending': 1, 'confirmed': 2, 'preparing': 3, 'ready': 4, 'completed': 5, 'cancelled': 6 }
        comparison = statusOrder[a.status] - statusOrder[b.status]
        break
      }
      case 'itemCount': {
        const aCount = a.items.reduce((sum, item) => sum + item.quantity, 0)
        const bCount = b.items.reduce((sum, item) => sum + item.quantity, 0)
        comparison = aCount - bCount
        break
      }
    }

    return direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

export const getTimeRangeFromPreset = (preset: TimeRange['preset']): { start: Date; end: Date } => {
  const now = new Date()
  const start = new Date()
  
  switch (preset) {
    case 'last15min':
      start.setMinutes(now.getMinutes() - 15)
      break
    case 'last30min':
      start.setMinutes(now.getMinutes() - 30)
      break
    case 'last1hour':
      start.setHours(now.getHours() - 1)
      break
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
  }

  return { start, end: now }
}