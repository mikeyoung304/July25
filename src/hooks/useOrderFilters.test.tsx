import { renderHook, act } from '@testing-library/react'
import { useOrderFilters } from './useOrderFilters'
import type { OrderFilters } from '@/types/filters'

describe('useOrderFilters', () => {
  beforeEach(() => {
    // Clear localStorage to prevent test interference
    localStorage.clear()
  })

  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    expect(result.current.filters).toEqual({
      status: ['new', 'preparing', 'ready'],
      stations: ['all'],
      timeRange: { preset: 'today' },
      searchQuery: '',
      sortBy: 'orderTime',
      sortDirection: 'desc'
    })
  })

  it('should update status filter', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.updateStatusFilter(['new', 'preparing'])
    })
    
    expect(result.current.filters.status).toEqual(['new', 'preparing'])
  })

  it('should toggle individual status', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    // Start with all statuses
    act(() => {
      result.current.toggleStatus('ready')
    })
    
    expect(result.current.filters.status).toEqual(['new', 'preparing'])
    
    // Toggle back on
    act(() => {
      result.current.toggleStatus('ready')
    })
    
    expect(result.current.filters.status).toEqual(['new', 'preparing', 'ready'])
  })

  it('should update station filter', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.updateStationFilter(['grill', 'fryer'])
    })
    
    expect(result.current.filters.stations).toEqual(['grill', 'fryer'])
  })

  it('should update time range', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.updateTimeRange({ preset: 'last30min' })
    })
    
    expect(result.current.filters.timeRange).toEqual({ preset: 'last30min' })
  })

  it('should update search query', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.updateSearchQuery('pizza')
    })
    
    expect(result.current.filters.searchQuery).toBe('pizza')
  })

  it('should update sort options', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.updateSort('orderNumber', 'asc')
    })
    
    expect(result.current.filters.sortBy).toBe('orderNumber')
    expect(result.current.filters.sortDirection).toBe('asc')
  })

  it('should toggle sort direction', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    // Start with desc
    expect(result.current.filters.sortDirection).toBe('desc')
    
    act(() => {
      result.current.toggleSortDirection()
    })
    
    expect(result.current.filters.sortDirection).toBe('asc')
    
    act(() => {
      result.current.toggleSortDirection()
    })
    
    expect(result.current.filters.sortDirection).toBe('desc')
  })

  it('should reset filters to defaults', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    // Change some filters
    act(() => {
      result.current.updateStatusFilter(['new'])
      result.current.updateSearchQuery('test')
      result.current.updateSort('tableNumber', 'asc')
    })
    
    // Reset
    act(() => {
      result.current.resetFilters()
    })
    
    expect(result.current.filters).toEqual({
      status: ['new', 'preparing', 'ready'],
      stations: ['all'],
      timeRange: { preset: 'today' },
      searchQuery: '',
      sortBy: 'orderTime',
      sortDirection: 'desc'
    })
  })

  it('should check if filters are active', () => {
    const { result } = renderHook(() => useOrderFilters())
    
    // Initially no custom filters
    expect(result.current.hasActiveFilters).toBe(false)
    
    // Add a filter
    act(() => {
      result.current.updateStatusFilter(['new'])
    })
    
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('should persist filters to localStorage', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useOrderFilters())
    
    act(() => {
      result.current.updateStatusFilter(['new', 'preparing'])
    })
    
    expect(setItemSpy).toHaveBeenCalledWith(
      'kds-order-filters',
      expect.stringContaining('"status":["new","preparing"]')
    )
  })

  it('should load filters from localStorage', () => {
    const savedFilters: Partial<OrderFilters> = {
      status: ['ready'],
      searchQuery: 'saved search',
      sortBy: 'tableNumber'
    }
    
    localStorage.setItem('kds-order-filters', JSON.stringify(savedFilters))
    
    const { result } = renderHook(() => useOrderFilters())
    
    expect(result.current.filters.status).toEqual(['ready'])
    expect(result.current.filters.searchQuery).toBe('saved search')
    expect(result.current.filters.sortBy).toBe('tableNumber')
  })
})