import { renderHook, act, waitFor } from '@testing-library/react'
import { vi } from 'vitest';
import { useOrderData } from '../useOrderData'
import { orderService } from '@/services'
import { Order } from '@/modules/orders/types'
import { defaultFilters, OrderStatus, OrderFilters } from '@/types/filters'

// Mock the orderService
vi.mock('@/services', () => ({
  orderService: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn()
  }
}))

// Mock the restaurant context
vi.mock('@/core/restaurant-hooks', () => ({
  useRestaurant: () => ({
    restaurant: { id: 'rest-1', name: 'Test Restaurant' },
    isLoading: false
  })
}))

// Mock the toast hook
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      dismiss: vi.fn()
    }
  })
}))

describe('useOrderData', () => {
  const mockOrders: Order[] = [
    {
      id: '1',
      restaurant_id: 'rest-1',
      orderNumber: '001',
      tableNumber: '5',
      items: [{ id: '1', name: 'Test Item', quantity: 1 }],
      status: 'new',
      orderTime: new Date(),
      totalAmount: 10.00,
      paymentStatus: 'pending'
    },
    {
      id: '2',
      restaurant_id: 'rest-1',
      orderNumber: '002',
      tableNumber: '6',
      items: [{ id: '2', name: 'Another Item', quantity: 2 }],
      status: 'preparing',
      orderTime: new Date(),
      totalAmount: 20.00,
      paymentStatus: 'paid'
    }
  ]
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(orderService.getOrders as vi.Mock).mockResolvedValue({
      orders: mockOrders,
      total: mockOrders.length
    })
    ;(orderService.updateOrderStatus as vi.Mock).mockResolvedValue({
      success: true,
      order: { ...mockOrders[0], status: 'preparing' }
    })
  })
  
  it('should fetch orders on mount', async () => {
    const { result } = renderHook(() => useOrderData())
    
    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.orders).toEqual(mockOrders)
      expect(result.current.error).toBe(null)
    })
    
    expect(orderService.getOrders).toHaveBeenCalled()
    expect(orderService.getOrders).toHaveBeenCalledWith('rest-1', undefined)
  })
  
  it('should fetch orders with filters', async () => {
    const filters: OrderFilters = { 
      ...defaultFilters,
      status: ['new'] 
    }
    const { result } = renderHook(() => useOrderData(filters))
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(orderService.getOrders).toHaveBeenCalledWith('rest-1', {
      status: 'new',
      tableId: undefined
    })
  })
  
  it('should refetch orders', async () => {
    const { result } = renderHook(() => useOrderData())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    const initialCallCount = (orderService.getOrders as vi.Mock).mock.calls.length
    
    act(() => {
      result.current.refetch()
    })
    
    await waitFor(() => {
      expect((orderService.getOrders as vi.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
    })
  })
  
  it('should update order status optimistically', async () => {
    const { result } = renderHook(() => useOrderData())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    act(() => {
      result.current.updateOrderStatus('1', 'preparing')
    })
    
    // Check optimistic update
    expect(result.current.orders[0].status).toBe('preparing')
    
    await waitFor(() => {
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith('rest-1', '1', 'preparing')
    })
  })
  
  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch orders')
    ;(orderService.getOrders as vi.Mock).mockRejectedValue(error)
    
    // Suppress console.error for this test since we're testing error handling
    const originalError = console.error
    console.error = vi.fn()
    
    const { result } = renderHook(() => useOrderData())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toEqual(error)
      expect(result.current.orders).toEqual([])
    })
    
    // Restore console.error
    console.error = originalError
  })
  
  it('should re-fetch when filters change', async () => {
    const { result, rerender } = renderHook(
      ({ filters }: { filters?: OrderFilters }) => useOrderData(filters),
      { initialProps: { filters: undefined as OrderFilters | undefined } }
    )
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    const initialCallCount = (orderService.getOrders as vi.Mock).mock.calls.length
    
    // Change filters
    rerender({ filters: { ...defaultFilters, status: ['new'] as OrderStatus[] } })
    
    await waitFor(() => {
      expect((orderService.getOrders as vi.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
      expect(orderService.getOrders).toHaveBeenLastCalledWith('rest-1', {
        status: 'new',
        tableId: undefined
      })
    })
  })
})