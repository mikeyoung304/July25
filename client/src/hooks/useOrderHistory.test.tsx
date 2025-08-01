import { renderHook, act, waitFor } from '@testing-library/react'
import { vi } from 'vitest';
import { useOrderHistory } from './useOrderHistory'
import { api } from '@/services/api'

// Mock the API
vi.mock('@/services/api', () => ({
  api: {
    getOrderHistory: vi.fn(),
    getOrderStatistics: vi.fn()
  }
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')

describe('useOrderHistory', () => {
  const mockHistoryResponse = {
    orders: [
      {
        id: '1',
        orderNumber: '1001',
        tableNumber: '5',
        items: [],
        status: 'completed',
        orderTime: new Date(),
        completedTime: new Date(),
        totalAmount: 25.99,
        paymentStatus: 'paid',
        preparationTime: 20
      }
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1
  }

  const mockStatsResponse = {
    totalOrders: 100,
    completedOrders: 95,
    cancelledOrders: 5,
    totalRevenue: 5000,
    averageOrderValue: 50,
    averagePreparationTime: 25,
    ordersByHour: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.getOrderHistory as vi.Mock).mockResolvedValue(mockHistoryResponse)
    ;(api.getOrderStatistics as vi.Mock).mockResolvedValue(mockStatsResponse)
  })

  it('should fetch order history on mount', async () => {
    const { result } = renderHook(() => useOrderHistory())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(api.getOrderHistory).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      startDate: expect.any(Date),
      endDate: expect.any(Date)
    })
    expect(result.current.orders).toEqual(mockHistoryResponse.orders)
  })

  it('should fetch statistics on mount', async () => {
    const { result } = renderHook(() => useOrderHistory())

    await waitFor(() => {
      expect(result.current.statistics).toEqual(mockStatsResponse)
    })

    expect(api.getOrderStatistics).toHaveBeenCalled()
  })

  it('should handle page changes', async () => {
    const { result } = renderHook(() => useOrderHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setPage(2)
    })

    await waitFor(() => {
      expect(api.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      )
    })
  })

  it('should handle search query changes', async () => {
    const { result } = renderHook(() => useOrderHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.setSearchQuery('pizza')
    })

    await waitFor(() => {
      expect(api.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({ searchQuery: 'pizza' })
      )
    })
  })

  it('should handle date range changes', async () => {
    const { result } = renderHook(() => useOrderHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const newStartDate = new Date('2024-01-01')
    const newEndDate = new Date('2024-01-31')

    act(() => {
      result.current.setDateRange(newStartDate, newEndDate)
    })

    await waitFor(() => {
      expect(api.getOrderHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: newStartDate,
          endDate: newEndDate
        })
      )
    })
  })

  it('should refresh data', async () => {
    const { result } = renderHook(() => useOrderHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    vi.clearAllMocks()

    act(() => {
      result.current.refresh()
    })

    expect(api.getOrderHistory).toHaveBeenCalled()
    expect(api.getOrderStatistics).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation()
    ;(api.getOrderHistory as vi.Mock).mockRejectedValue(new Error('API Error'))

    const { result } = renderHook(() => useOrderHistory())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to load order history')
    expect(result.current.orders).toEqual([])

    consoleError.mockRestore()
  })

  it('should export data to CSV', () => {
    const { result } = renderHook(() => useOrderHistory())

    // Mock createElement and click
    const link = { click: vi.fn(), href: '', download: '' }
    vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLElement)

    act(() => {
      result.current.exportToCSV()
    })

    expect(link.download).toBe('order-history.csv')
    expect(link.click).toHaveBeenCalled()
  })
})