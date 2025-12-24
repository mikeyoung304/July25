import { renderHook, act, waitFor } from '@testing-library/react'
import { vi } from 'vitest';
import { useOrderData } from '../useOrderData'
import { orderService } from '@/services'
import { Order } from '@/modules/orders/types'
import { defaultFilters, UIOrderFilters } from '@rebuild/shared/types/filters.types'
import { OrderStatus } from '@rebuild/shared/types/order.types'

// Mock the orderService
vi.mock('@/services', () => ({
  orderService: {
    getOrders: vi.fn(),
    updateOrderStatus: vi.fn(),
    getOrderById: vi.fn(),
    submitOrder: vi.fn(),
    validateOrder: vi.fn()
  }
}))

// Mock the restaurant context
vi.mock('@/core', () => ({
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
      order_number: '001',
      table_number: '5',
      items: [{
        id: '1',
        menu_item_id: '1',
        name: 'Test Item',
        quantity: 1,
        price: 10.00,
        subtotal: 10.00
      }],
      status: 'new',
      type: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtotal: 10.00,
      tax: 0.80,
      total: 10.80,
      payment_status: 'pending'
    },
    {
      id: '2',
      restaurant_id: 'rest-1',
      order_number: '002',
      table_number: '6',
      items: [{
        id: '2',
        menu_item_id: '2',
        name: 'Another Item',
        quantity: 2,
        price: 10.00,
        subtotal: 20.00
      }],
      status: 'preparing',
      type: 'online',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      subtotal: 20.00,
      tax: 1.60,
      total: 21.60,
      payment_status: 'paid'
    }
  ]
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(orderService.getOrders as vi.Mock).mockResolvedValue(mockOrders)
    ;(orderService.updateOrderStatus as vi.Mock).mockResolvedValue({ ...mockOrders[0], status: 'preparing' })

    // Ensure the toast methods are properly mocked
    vi.mocked(orderService.getOrders).mockClear()
    vi.mocked(orderService.updateOrderStatus).mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it('should fetch orders on mount', async () => {
    const { result } = renderHook(() => useOrderData())

    // Wait for both data to be loaded AND loading to be false
    // React 18 batches state updates, so we need to wait for both conditions
    await waitFor(() => {
      expect(result.current.orders.length).toBeGreaterThan(0)
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    expect(result.current.orders).toEqual(mockOrders)
    expect(result.current.error).toBe(null)
    expect(orderService.getOrders).toHaveBeenCalled()
    expect(orderService.getOrders).toHaveBeenCalledWith(undefined)
  })
  
  it('should fetch orders with filters', async () => {
    const filters: UIOrderFilters = {
      ...defaultFilters,
      status: ['new']
    }
    const { result } = renderHook(() => useOrderData(filters))

    // Wait for data to be loaded AND loading to be false
    // Orders is initialized to [], so we wait for length > 0
    await waitFor(() => {
      expect(result.current.orders.length).toBeGreaterThan(0)
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    expect(orderService.getOrders).toHaveBeenCalledWith({
      status: 'new',
      tableId: undefined
    })
  })

  it('should refetch orders', async () => {
    const { result } = renderHook(() => useOrderData())

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.orders.length).toBeGreaterThan(0)
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    const initialCallCount = (orderService.getOrders as vi.Mock).mock.calls.length

    await act(async () => {
      await result.current.refetch()
    })

    await waitFor(() => {
      expect((orderService.getOrders as vi.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
      expect(result.current.loading).toBe(false)
    })
  })
  
  it('should update order status optimistically', async () => {
    const { result } = renderHook(() => useOrderData())

    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.orders.length).toBeGreaterThan(0)
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    await act(async () => {
      await result.current.updateOrderStatus('1', 'preparing')
    })

    // Check optimistic update
    expect(result.current.orders[0].status).toBe('preparing')
    expect(orderService.updateOrderStatus).toHaveBeenCalledWith('1', 'preparing')
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
      ({ filters }: { filters?: UIOrderFilters }) => useOrderData(filters),
      { initialProps: { filters: undefined as UIOrderFilters | undefined } }
    )

    // Wait for initial load to complete
    // Orders is initialized to [], so we wait for length > 0
    await waitFor(() => {
      expect(result.current.orders.length).toBeGreaterThan(0)
      expect(result.current.loading).toBe(false)
    }, { timeout: 3000 })

    const initialCallCount = (orderService.getOrders as vi.Mock).mock.calls.length

    // Change filters
    rerender({ filters: { ...defaultFilters, status: ['new'] as OrderStatus[] } })

    await waitFor(() => {
      expect((orderService.getOrders as vi.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
      expect(result.current.loading).toBe(false)
    })

    expect(orderService.getOrders).toHaveBeenLastCalledWith({
      status: 'new',
      tableId: undefined
    })
  })
})