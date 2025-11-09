/**
 * Unified Filter Types
 * Single source of truth for all filter-related types
 */

import type { OrderStatus } from './order.types';
import type { StationType } from './station.types';
import type { Order } from './order.types';

export type SortBy =
  | 'created_at'
  | 'order_number'
  | 'table_number'
  | 'status'
  | 'itemCount';

export type SortDirection = 'asc' | 'desc';

export interface TimeRange {
  start?: Date;
  end?: Date;
  preset?: 'last15min' | 'last30min' | 'last1hour' | 'today' | 'custom';
}

// UI-specific order filters (for client-side filtering)
export interface UIOrderFilters {
  status: OrderStatus[];
  stations: (StationType | 'all')[];
  timeRange: TimeRange;
  searchQuery: string;
  sortBy: SortBy;
  sortDirection: SortDirection;
}

export interface FilterStats {
  totalOrders: number;
  filteredOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByStation: Record<StationType, number>;
}

// Default filter values
export const defaultFilters: UIOrderFilters = {
  status: ['new', 'preparing', 'ready'],
  stations: ['all'],
  timeRange: { preset: 'today' },
  searchQuery: '',
  sortBy: 'created_at',
  sortDirection: 'desc'
};

// Filter helper functions
export const applyFilters = (orders: Order[], filters: UIOrderFilters): Order[] => {
  return orders.filter(order => {
    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(order.status)) {
      return false;
    }

    // Station filter - handled separately as it needs item-level checking
    // This will be implemented in the component that has access to stationRouting

    // Time range filter
    if (filters.timeRange.start || filters.timeRange.end) {
      // Order type uses snake_case created_at
      const createdAt = order.created_at;
      if (!createdAt) return true; // Include if no date
      const orderDate = new Date(createdAt);
      if (filters.timeRange.start && orderDate < filters.timeRange.start) {
        return false;
      }
      if (filters.timeRange.end && orderDate > filters.timeRange.end) {
        return false;
      }
    }

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      // Order type uses snake_case properties
      const orderNumber = order.order_number || '';
      const tableNumber = order.table_number || '';
      const matchesOrderNumber = orderNumber.toLowerCase().includes(query);
      const matchesTableNumber = tableNumber.toLowerCase().includes(query);
      const matchesItems = order.items.some(item =>
        item.name.toLowerCase().includes(query)
      );

      if (!matchesOrderNumber && !matchesTableNumber && !matchesItems) {
        return false;
      }
    }

    return true;
  });
};

export const sortOrders = (orders: Order[], sortBy: SortBy, direction: SortDirection): Order[] => {
  const sorted = [...orders].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'created_at': {
        const aCreated = a.created_at;
        const bCreated = b.created_at;
        comparison = new Date(aCreated).getTime() - new Date(bCreated).getTime();
        break;
      }
      case 'order_number': {
        const aNum = a.order_number || '';
        const bNum = b.order_number || '';
        comparison = aNum.localeCompare(bNum);
        break;
      }
      case 'table_number': {
        const aTable = a.table_number || '';
        const bTable = b.table_number || '';
        comparison = aTable.localeCompare(bTable);
        break;
      }
      case 'status': {
        const statusOrder: Record<OrderStatus, number> = {
          'new': 0,
          'pending': 1,
          'confirmed': 2,
          'preparing': 3,
          'ready': 4,
          'picked-up': 5,
          'completed': 6,
          'cancelled': 7
        };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
      }
      case 'itemCount': {
        const aCount = a.items.reduce((sum, item) => sum + item.quantity, 0);
        const bCount = b.items.reduce((sum, item) => sum + item.quantity, 0);
        comparison = aCount - bCount;
        break;
      }
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  return sorted;
};

export const getTimeRangeFromPreset = (preset: TimeRange['preset']): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();

  switch (preset) {
    case 'last15min':
      start.setMinutes(now.getMinutes() - 15);
      break;
    case 'last30min':
      start.setMinutes(now.getMinutes() - 30);
      break;
    case 'last1hour':
      start.setHours(now.getHours() - 1);
      break;
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end: now };
};
