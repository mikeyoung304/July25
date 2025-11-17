// Compatibility wrapper for the filters module hook
import { useOrderFilters as useModuleOrderFilters } from '@/modules/filters/hooks/useOrderFilters'
import { useCallback, useMemo, useState } from 'react'
import type { OrderStatus } from '@shared'
import type { Station } from '@shared'

export interface OrderFilterState {
  status: OrderStatus | 'all'
  stations: Station[]
  timeRange: 'today' | 'week' | 'month' | 'all'
  searchQuery: string
  sortBy: 'created_at' | 'order_number' | 'status'
  sortDirection: 'asc' | 'desc'
}

export interface UseOrderFiltersReturn {
  filters: OrderFilterState
  updateStatusFilter: (status: OrderStatus | 'all') => void
  updateStationFilter: (stations: Station[]) => void
  updateTimeRange: (range: 'today' | 'week' | 'month' | 'all') => void
  updateSearchQuery: (query: string) => void
  updateSort: (sortBy: 'created_at' | 'order_number' | 'status') => void
  toggleSortDirection: () => void
  resetFilters: () => void
  hasActiveFilters: boolean
}

export function useOrderFilters(): UseOrderFiltersReturn {
  const moduleHook = useModuleOrderFilters()
  const [additionalFilters, setAdditionalFilters] = useState<{
    stations: Station[]
    timeRange: 'today' | 'week' | 'month' | 'all'
    sortBy: 'created_at' | 'order_number' | 'status'
    sortDirection: 'asc' | 'desc'
  }>({
    stations: [],
    timeRange: 'today',
    sortBy: 'created_at',
    sortDirection: 'desc'
  })

  const filters = useMemo<OrderFilterState>(() => ({
    status: moduleHook.filters.status || 'all',
    searchQuery: moduleHook.filters.searchQuery || '',
    ...additionalFilters
  }), [moduleHook.filters, additionalFilters])

  const updateStatusFilter = useCallback((status: OrderStatus | 'all') => {
    moduleHook.setStatusFilter(status)
  }, [moduleHook])

  const updateStationFilter = useCallback((stations: Station[]) => {
    setAdditionalFilters(prev => ({ ...prev, stations }))
  }, [])

  const updateTimeRange = useCallback((timeRange: 'today' | 'week' | 'month' | 'all') => {
    setAdditionalFilters(prev => ({ ...prev, timeRange }))
  }, [])

  const updateSearchQuery = useCallback((query: string) => {
    moduleHook.setSearchQuery(query)
  }, [moduleHook])

  const updateSort = useCallback((sortBy: 'created_at' | 'order_number' | 'status') => {
    setAdditionalFilters(prev => ({ ...prev, sortBy }))
  }, [])

  const toggleSortDirection = useCallback(() => {
    setAdditionalFilters(prev => ({ 
      ...prev, 
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc' 
    }))
  }, [])

  const resetFilters = useCallback(() => {
    moduleHook.clearFilters()
    setAdditionalFilters({
      stations: [],
      timeRange: 'today',
      sortBy: 'created_at',
      sortDirection: 'desc'
    })
  }, [moduleHook])

  const hasActiveFilters = useMemo(() => {
    return moduleHook.hasActiveFilters || 
           additionalFilters.stations.length > 0 ||
           additionalFilters.timeRange !== 'today'
  }, [moduleHook.hasActiveFilters, additionalFilters])

  return {
    filters,
    updateStatusFilter,
    updateStationFilter,
    updateTimeRange,
    updateSearchQuery,
    updateSort,
    toggleSortDirection,
    resetFilters,
    hasActiveFilters
  }
}