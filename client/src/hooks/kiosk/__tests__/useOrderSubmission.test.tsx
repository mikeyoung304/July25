import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOrderSubmission } from '../useOrderSubmission'
import { useRestaurantContext } from '@/core/RestaurantContext'
import { useToast } from '@/hooks/useToast'

// Mock dependencies
vi.mock('@/core/RestaurantContext')
vi.mock('@/hooks/useToast')

describe('useOrderSubmission', () => {
  const mockToast = {
    error: vi.fn(),
    success: vi.fn()
  }

  beforeEach(() => {
    vi.resetAllMocks()
    ;(useToast as any).mockReturnValue({ toast: mockToast })
  })

  it('should throw error when restaurant context is missing', async () => {
    ;(useRestaurantContext as any).mockReturnValue({ restaurant: null })

    const { result } = renderHook(() => useOrderSubmission())

    const testItems = [
      {
        menuItem: { id: '1', name: 'Test Item', price: 10 },
        quantity: 1
      }
    ]

    const response = await act(async () => {
      return result.current.submitOrder(testItems)
    })

    expect(response.success).toBe(false)
    expect(response.error).toBe('Missing restaurant context')
    expect(mockToast.error).toHaveBeenCalledWith('Restaurant context not available')
  })

  it('should use restaurant ID from context instead of environment variable', async () => {
    const mockRestaurantId = 'context-restaurant-123'
    ;(useRestaurantContext as any).mockReturnValue({
      restaurant: { id: mockRestaurantId }
    })

    // Mock fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'order-123', order_number: 'ORD-123' })
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => useOrderSubmission())

    const testItems = [
      {
        menuItem: { id: '1', name: 'Test Item', price: 10 },
        quantity: 1
      }
    ]

    await act(async () => {
      await result.current.submitOrder(testItems)
    })

    // Verify the fetch was called with restaurant ID from context
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/orders',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Restaurant-ID': mockRestaurantId
        })
      })
    )
  })

  it('should handle empty cart', async () => {
    ;(useRestaurantContext as any).mockReturnValue({
      restaurant: { id: 'test-restaurant' }
    })

    const { result } = renderHook(() => useOrderSubmission())

    const response = await act(async () => {
      return result.current.submitOrder([])
    })

    expect(response.success).toBe(false)
    expect(response.error).toBe('Empty cart')
    expect(mockToast.error).toHaveBeenCalledWith('No items in cart to submit')
  })
})