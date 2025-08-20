import { useMemo } from 'react'
import { useOrderFilters } from '@/hooks/useOrderFilters'
import { applyFilters, sortOrders } from '@/types/filters'
import { stationRouting } from '@/services/stationRouting'
import type { Order } from '@/services/api'
import type { OrderStatus, StationType } from '@/types/filters'

export function useOrderFiltering(orders: Order[]) {
  const {
    filters,
    updateStatusFilter,
    updateStationFilter,
    updateTimeRange,
    updateSearchQuery,
    updateSort,
    toggleSortDirection,
    resetFilters,
    hasActiveFilters
  } = useOrderFilters()

  const adaptedFilters = useMemo(() => {
    const statusArray: OrderStatus[] = filters.status === 'all' 
      ? ['pending', 'confirmed', 'new', 'preparing', 'ready']
      : [filters.status]
    
    const stationArray = filters.stations.length === 0 
      ? ['all'] as (StationType | 'all')[]
      : filters.stations.map(s => s.type) as (StationType | 'all')[]
    
    return {
      status: statusArray,
      stations: stationArray,
      timeRange: { preset: 'today' as const },
      searchQuery: filters.searchQuery,
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection
    }
  }, [filters])

  const timeFilteredOrders = useMemo(() => {
    if (filters.timeRange === 'all') return orders

    const now = new Date()
    const start = new Date()
    
    switch (filters.timeRange) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setDate(now.getDate() - 30)
        break
    }
    
    return orders.filter(order => {
      // Use snake_case as per Order type definition
      const createdAt = order.created_at
      if (!createdAt) {
        console.warn('[useOrderFiltering] Order missing created date:', order)
        return true // Include orders with no date rather than filter them out
      }
      const orderDate = new Date(createdAt)
      return orderDate >= start && orderDate <= now
    })
  }, [orders, filters.timeRange])

  const stationFilteredOrders = useMemo(() => {
    if (filters.stations.length === 0) return timeFilteredOrders

    return timeFilteredOrders.filter(order => 
      order.items.some(item => {
        const itemStation = stationRouting.getStationTypeForItem(item)
        return filters.stations.some(s => s.type === itemStation)
      })
    )
  }, [timeFilteredOrders, filters.stations])

  const filteredAndSortedOrders = useMemo(() => {
    let result = applyFilters(stationFilteredOrders, adaptedFilters)
    return sortOrders(result, filters.sortBy, filters.sortDirection)
  }, [stationFilteredOrders, adaptedFilters, filters.sortBy, filters.sortDirection])

  return {
    filteredAndSortedOrders,
    filters,
    adaptedFilters,
    hasActiveFilters,
    updateStatusFilter,
    updateStationFilter,
    updateTimeRange,
    updateSearchQuery,
    updateSort,
    toggleSortDirection,
    resetFilters
  }
}