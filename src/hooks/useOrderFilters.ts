import { useState, useCallback, useEffect } from 'react'
import type { OrderFilters, OrderStatus, SortBy, SortDirection, TimeRange } from '@/types/filters'
import { defaultFilters } from '@/types/filters'
import type { StationType } from '@/types/station'

const STORAGE_KEY = 'kds-order-filters'

export interface UseOrderFiltersReturn {
  filters: OrderFilters
  updateStatusFilter: (status: OrderStatus[]) => void
  toggleStatus: (status: OrderStatus) => void
  updateStationFilter: (stations: (StationType | 'all')[]) => void
  updateTimeRange: (timeRange: TimeRange) => void
  updateSearchQuery: (query: string) => void
  updateSort: (sortBy: SortBy, direction?: SortDirection) => void
  toggleSortDirection: () => void
  resetFilters: () => void
  hasActiveFilters: boolean
}

export const useOrderFilters = (): UseOrderFiltersReturn => {
  // Load saved filters from localStorage
  const loadSavedFilters = (): OrderFilters => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...defaultFilters, ...parsed }
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
    return defaultFilters
  }

  const [filters, setFilters] = useState<OrderFilters>(loadSavedFilters)

  // Save filters to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [filters])

  // Update status filter
  const updateStatusFilter = useCallback((status: OrderStatus[]) => {
    setFilters(prev => ({ ...prev, status }))
  }, [])

  // Toggle individual status
  const toggleStatus = useCallback((status: OrderStatus) => {
    setFilters(prev => {
      const currentStatus = prev.status
      const isSelected = currentStatus.includes(status)
      
      if (isSelected) {
        return { ...prev, status: currentStatus.filter(s => s !== status) }
      } else {
        return { ...prev, status: [...currentStatus, status] }
      }
    })
  }, [])

  // Update station filter
  const updateStationFilter = useCallback((stations: (StationType | 'all')[]) => {
    setFilters(prev => ({ ...prev, stations }))
  }, [])

  // Update time range
  const updateTimeRange = useCallback((timeRange: TimeRange) => {
    setFilters(prev => ({ ...prev, timeRange }))
  }, [])

  // Update search query
  const updateSearchQuery = useCallback((searchQuery: string) => {
    setFilters(prev => ({ ...prev, searchQuery }))
  }, [])

  // Update sort options
  const updateSort = useCallback((sortBy: SortBy, sortDirection?: SortDirection) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortDirection: sortDirection || prev.sortDirection
    }))
  }, [])

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Check if any filters are active (different from defaults)
  const hasActiveFilters = 
    filters.status.length !== defaultFilters.status.length ||
    filters.stations.join(',') !== defaultFilters.stations.join(',') ||
    filters.timeRange.preset !== defaultFilters.timeRange.preset ||
    filters.searchQuery !== defaultFilters.searchQuery ||
    filters.sortBy !== defaultFilters.sortBy ||
    filters.sortDirection !== defaultFilters.sortDirection

  return {
    filters,
    updateStatusFilter,
    toggleStatus,
    updateStationFilter,
    updateTimeRange,
    updateSearchQuery,
    updateSort,
    toggleSortDirection,
    resetFilters,
    hasActiveFilters
  }
}