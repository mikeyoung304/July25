import { useState, useCallback, useMemo } from 'react'
import { OrderFilterState } from '../types'
import { OrderStatus } from '@/types/filters'

export interface UseOrderFiltersReturn {
  filters: OrderFilterState
  setStatusFilter: (status: OrderStatus | 'all') => void
  setTableFilter: (table_number: string) => void
  setDateRange: (start: Date, end: Date) => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean
}

const initialFilters: OrderFilterState = {
  status: 'all',
  table_number: '',
  searchQuery: ''
}

export const useOrderFilters = (defaultFilters?: Partial<OrderFilterState>): UseOrderFiltersReturn => {
  const [filters, setFilters] = useState<OrderFilterState>({
    ...initialFilters,
    ...defaultFilters
  })
  
  const setStatusFilter = useCallback((status: OrderStatus | 'all') => {
    setFilters(prev => ({ ...prev, status }))
  }, [])
  
  const setTableFilter = useCallback((tableNumber: string) => {
    setFilters(prev => ({ ...prev, tableNumber }))
  }, [])
  
  const setDateRange = useCallback((start: Date, end: Date) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end } }))
  }, [])
  
  const setSearchQuery = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }))
  }, [])
  
  const clearFilters = useCallback(() => {
    setFilters(initialFilters)
  }, [])
  
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== 'all' ||
      !!filters.table_number ||
      !!filters.dateRange ||
      !!filters.searchQuery
    )
  }, [filters])
  
  return {
    filters,
    setStatusFilter,
    setTableFilter,
    setDateRange,
    setSearchQuery,
    clearFilters,
    hasActiveFilters
  }
}