import { renderHook, act } from '@testing-library/react'
import { useOrderFilters } from '../useOrderFilters'

describe('useOrderFilters', () => {
  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    expect(result.current.filters).toEqual({
      status: 'all',
      tableNumber: '',
      searchQuery: ''
    })
    expect(result.current.hasActiveFilters).toBe(false)
  })
  
  it('should initialize with custom default filters', () => {
    const defaultFilters = {
      status: 'new' as const,
      tableNumber: '5'
    }
    
    const { result } = renderHook(() => useOrderFilters(defaultFilters))
    
    expect(result.current.filters.status).toBe('new')
    expect(result.current.filters.tableNumber).toBe('5')
    expect(result.current.hasActiveFilters).toBe(true)
  })
  
  it('should update status filter', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.setStatusFilter('preparing')
    })
    
    expect(result.current.filters.status).toBe('preparing')
    expect(result.current.hasActiveFilters).toBe(true)
  })
  
  it('should update table filter', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.setTableFilter('10')
    })
    
    expect(result.current.filters.tableNumber).toBe('10')
    expect(result.current.hasActiveFilters).toBe(true)
  })
  
  it('should update date range', () => {
    const { result } = renderHook(() => useOrderFilters())
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-01-31')
    
    act(() => {
      result.current.setDateRange(startDate, endDate)
    })
    
    expect(result.current.filters.dateRange).toEqual({
      start: startDate,
      end: endDate
    })
    expect(result.current.hasActiveFilters).toBe(true)
  })
  
  it('should update search query', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.setSearchQuery('burger')
    })
    
    expect(result.current.filters.searchQuery).toBe('burger')
    expect(result.current.hasActiveFilters).toBe(true)
  })
  
  it('should clear all filters', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    // Set multiple filters
    act(() => {
      result.current.setStatusFilter('ready')
      result.current.setTableFilter('5')
      result.current.setSearchQuery('test')
    })
    
    expect(result.current.hasActiveFilters).toBe(true)
    
    // Clear filters
    act(() => {
      result.current.clearFilters()
    })
    
    expect(result.current.filters).toEqual({
      status: 'all',
      tableNumber: '',
      searchQuery: ''
    })
    expect(result.current.hasActiveFilters).toBe(false)
  })
  
  it('should correctly determine hasActiveFilters', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    // Initially no active filters
    expect(result.current.hasActiveFilters).toBe(false)
    
    // Status filter other than 'all'
    act(() => {
      result.current.setStatusFilter('new')
    })
    expect(result.current.hasActiveFilters).toBe(true)
    
    // Reset to 'all'
    act(() => {
      result.current.setStatusFilter('all')
    })
    expect(result.current.hasActiveFilters).toBe(false)
    
    // Empty string should not count as active filter
    act(() => {
      result.current.setTableFilter('')
      result.current.setSearchQuery('')
    })
    expect(result.current.hasActiveFilters).toBe(false)
  })
})