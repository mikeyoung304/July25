import { renderHook, act, waitFor } from '@testing-library/react'
import { useOrderData } from '../useOrderData'
import { orderService } from '@/services'
import { Order } from '@/modules/orders/types'

// Mock the orderService
jest.mock('@/services', () => ({
  orderService: {
    getOrders: jest.fn(),
    updateOrderStatus: jest.fn()
  }
}))

describe('useOrderData', () => {
  const mockOrders: Order[] = [
    {
      id: '1',
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
    jest.clearAllMocks()
    ;(orderService.getOrders as jest.Mock).mockResolvedValue({
      orders: mockOrders,
      total: mockOrders.length
    })
    ;(orderService.updateOrderStatus as jest.Mock).mockResolvedValue({
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
    
    expect(orderService.getOrders).toHaveBeenCalledTimes(1)
    expect(orderService.getOrders).toHaveBeenCalledWith(undefined)
  })
  
  it('should fetch orders with filters', async () => {
    const filters = { status: 'new' }
    const { result } = renderHook(() => useOrderData(filters))
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(orderService.getOrders).toHaveBeenCalledWith(filters)
  })
  
  it('should refetch orders', async () => {
    const { result } = renderHook(() => useOrderData())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(orderService.getOrders).toHaveBeenCalledTimes(1)
    
    act(() => {
      result.current.refetch()
    })
    
    await waitFor(() => {
      expect(orderService.getOrders).toHaveBeenCalledTimes(2)
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
      expect(orderService.updateOrderStatus).toHaveBeenCalledWith('1', 'preparing')
    })
  })
  
  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch orders')
    ;(orderService.getOrders as jest.Mock).mockRejectedValue(error)
    
    const { result } = renderHook(() => useOrderData())
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toEqual(error)
      expect(result.current.orders).toEqual([])
    })
  })
  
  it('should re-fetch when filters change', async () => {
    const { result, rerender } = renderHook(
      ({ filters }) => useOrderData(filters),
      { initialProps: { filters: undefined } }
    )
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    
    expect(orderService.getOrders).toHaveBeenCalledTimes(1)
    
    // Change filters
    rerender({ filters: { status: 'new' } })
    
    await waitFor(() => {
      expect(orderService.getOrders).toHaveBeenCalledTimes(2)
      expect(orderService.getOrders).toHaveBeenLastCalledWith({ status: 'new' })
    })
  })
})