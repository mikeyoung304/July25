import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useVoiceOrderWebRTC } from '../useVoiceOrderWebRTC'
import type { MenuItem } from '@/types/menu'

// Mock dependencies
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    }
  })
}))

vi.mock('@/modules/menu/hooks/useMenuItems', () => ({
  useMenuItems: vi.fn()
}))

vi.mock('@/hooks/useTaxRate', () => ({
  useTaxRate: () => 0.08
}))

vi.mock('@/core/supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

vi.mock('@/services/monitoring/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

// Import mocked hooks
import { useMenuItems } from '@/modules/menu/hooks/useMenuItems'

describe('useVoiceOrderWebRTC', () => {
  const mockMenuItems: MenuItem[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Greek Salad',
      description: 'Fresh salad with feta',
      price: 12.99,
      category: 'Salads',
      available: true,
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      restaurant_id: 'test-restaurant'
    },
    {
      id: '223e4567-e89b-12d3-a456-426614174001',
      name: 'Chicken Wings',
      description: 'Spicy buffalo wings',
      price: 10.99,
      category: 'Appetizers',
      available: true,
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      restaurant_id: 'test-restaurant'
    },
    {
      id: '323e4567-e89b-12d3-a456-426614174002',
      name: 'Margherita Pizza',
      description: 'Classic pizza with tomato and mozzarella',
      price: 15.99,
      category: 'Pizza',
      available: true,
      image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      restaurant_id: 'test-restaurant'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('OrderParser Integration', () => {
    it('initializes OrderParser when menu items load', async () => {
      // Start with empty menu
      ;(useMenuItems as any).mockReturnValue({ items: [], loading: false })

      const { result, rerender } = renderHook(() => useVoiceOrderWebRTC())

      // Menu is empty initially
      expect(result.current.orderItems).toEqual([])

      // Simulate menu loading
      ;(useMenuItems as any).mockReturnValue({ items: mockMenuItems, loading: false })

      await act(async () => {
        rerender()
      })

      // OrderParser should now be initialized with menu items
      // Test by processing an order
      const orderData = {
        items: [{ name: 'Greek Salad', quantity: 1 }]
      }

      await act(async () => {
        result.current.handleOrderData(orderData)
      })

      // Should successfully match and add item
      await waitFor(() => {
        expect(result.current.orderItems).toHaveLength(1)
        expect(result.current.orderItems[0]).toMatchObject({
          menuItemId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Greek Salad',
          quantity: 1
        })
      })
    })

    it('rebuilds OrderParser when menu items change', async () => {
      // Start with initial menu
      const initialMenu = [mockMenuItems[0]]
      ;(useMenuItems as any).mockReturnValue({ items: initialMenu, loading: false })

      const { result, rerender } = renderHook(() => useVoiceOrderWebRTC())

      // Process order with first menu
      await act(async () => {
        result.current.handleOrderData({
          items: [{ name: 'Greek Salad', quantity: 1 }]
        })
      })

      expect(result.current.orderItems).toHaveLength(1)

      // Update menu with more items
      ;(useMenuItems as any).mockReturnValue({ items: mockMenuItems, loading: false })

      await act(async () => {
        rerender()
      })

      // Should now be able to match new items
      await act(async () => {
        result.current.handleOrderData({
          items: [{ name: 'Chicken Wings', quantity: 2 }]
        })
      })

      await waitFor(() => {
        expect(result.current.orderItems).toHaveLength(2)
        expect(result.current.orderItems[1]).toMatchObject({
          menuItemId: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Chicken Wings',
          quantity: 2
        })
      })
    })

    it('handles defensive checks when menu not loaded', async () => {
      ;(useMenuItems as any).mockReturnValue({ items: [], loading: false })

      const { result } = renderHook(() => useVoiceOrderWebRTC())

      const orderData = {
        items: [{ name: 'Greek Salad', quantity: 1 }]
      }

      await act(async () => {
        result.current.handleOrderData(orderData)
      })

      // Should not crash and should not add items
      expect(result.current.orderItems).toHaveLength(0)
    })
  })

  describe('Order Data Processing', () => {
    beforeEach(() => {
      ;(useMenuItems as any).mockReturnValue({ items: mockMenuItems, loading: false })
    })

    it('matches items with fuzzy matching', async () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      // Wait for OrderParser to initialize
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // AI might transcribe "greek salad" in lowercase
      const orderData = {
        items: [
          { name: 'greek salad', quantity: 1 },
          { name: 'CHICKEN WINGS', quantity: 3 }
        ]
      }

      await act(async () => {
        result.current.handleOrderData(orderData)
      })

      await waitFor(() => {
        expect(result.current.orderItems).toHaveLength(2)

        // Should match despite case differences
        const greekSalad = result.current.orderItems.find(
          item => item.menuItemId === '123e4567-e89b-12d3-a456-426614174000'
        )
        const wings = result.current.orderItems.find(
          item => item.menuItemId === '223e4567-e89b-12d3-a456-426614174001'
        )

        expect(greekSalad).toBeDefined()
        expect(greekSalad?.quantity).toBe(1)
        expect(wings).toBeDefined()
        expect(wings?.quantity).toBe(3)
      })
    })

    it('handles modifiers from AI', async () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const orderData = {
        items: [{
          name: 'Greek Salad',
          quantity: 1,
          modifiers: ['extra feta', 'no onions']
        }]
      }

      await act(async () => {
        result.current.handleOrderData(orderData)
      })

      await waitFor(() => {
        expect(result.current.orderItems).toHaveLength(1)
        expect(result.current.orderItems[0].modifications).toHaveLength(2)
        expect(result.current.orderItems[0].modifications).toEqual([
          { id: 'mod-extra feta', name: 'extra feta', price: 0 },
          { id: 'mod-no onions', name: 'no onions', price: 0 }
        ])
      })
    })

    it('handles empty order data gracefully', async () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      await act(async () => {
        result.current.handleOrderData({ items: [] })
      })

      expect(result.current.orderItems).toHaveLength(0)
    })

    it('handles unmatched items (low confidence)', async () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      const orderData = {
        items: [
          { name: 'Greek Salad', quantity: 1 },
          { name: 'Nonexistent Item', quantity: 1 } // Won't match
        ]
      }

      await act(async () => {
        result.current.handleOrderData(orderData)
      })

      await waitFor(() => {
        // Should only add the matched item
        expect(result.current.orderItems).toHaveLength(1)
        expect(result.current.orderItems[0].name).toBe('Greek Salad')
      })
    })
  })

  describe('Voice Transcript Handling', () => {
    beforeEach(() => {
      ;(useMenuItems as any).mockReturnValue({ items: mockMenuItems, loading: false })
    })

    it('updates transcript during voice input', () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      act(() => {
        result.current.handleVoiceTranscript({ text: 'I want a Greek', isFinal: false })
      })

      expect(result.current.currentTranscript).toBe('I want a Greek')
    })

    it('clears transcript on final input', () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      act(() => {
        result.current.handleVoiceTranscript({ text: 'Greek Salad', isFinal: false })
      })

      expect(result.current.currentTranscript).toBe('Greek Salad')

      act(() => {
        result.current.handleVoiceTranscript({ text: 'Greek Salad', isFinal: true })
      })

      expect(result.current.currentTranscript).toBe('')
    })

    it('handles string transcript format', () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      act(() => {
        result.current.handleVoiceTranscript('Greek Salad')
      })

      // String format is treated as final, so transcript is cleared
      expect(result.current.currentTranscript).toBe('')
    })
  })

  describe('Multi-seat Ordering', () => {
    beforeEach(() => {
      ;(useMenuItems as any).mockReturnValue({ items: mockMenuItems, loading: false })
    })

    it('exposes multi-seat state', () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      // Initial state
      expect(result.current.orderedSeats).toEqual([])
      expect(result.current.lastCompletedSeat).toBeNull()
      expect(result.current.showPostOrderPrompt).toBe(false)
    })

    it('resets all state with resetAllState', () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      // Set some state
      act(() => {
        result.current.setShowVoiceOrder(true)
        result.current.setIsProcessing(true)
      })

      expect(result.current.showVoiceOrder).toBe(true)
      expect(result.current.isProcessing).toBe(true)

      // Reset all
      act(() => {
        result.current.resetAllState()
      })

      expect(result.current.showVoiceOrder).toBe(false)
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.orderedSeats).toEqual([])
      expect(result.current.lastCompletedSeat).toBeNull()
      expect(result.current.orderItems).toEqual([])
    })

    it('resets voice order state with resetVoiceOrder', () => {
      const { result } = renderHook(() => useVoiceOrderWebRTC())

      // Set some state
      act(() => {
        result.current.setShowVoiceOrder(true)
        result.current.setIsProcessing(true)
      })

      // Reset voice order
      act(() => {
        result.current.resetVoiceOrder()
      })

      expect(result.current.showVoiceOrder).toBe(false)
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.orderItems).toEqual([])
      expect(result.current.currentTranscript).toBe('')
      expect(result.current.isVoiceActive).toBe(false)
    })
  })

  describe('Regression Tests for Oct 28-30 Fixes', () => {
    it('REGRESSION: OrderParser rebuilds when menu loads after mount', async () => {
      // This test ensures the bug from Oct 29 doesn't reoccur
      // Bug: OrderParser was initialized once with empty menu, never rebuilt

      ;(useMenuItems as any).mockReturnValue({ items: [], loading: true })

      const { result, rerender } = renderHook(() => useVoiceOrderWebRTC())

      // Try to process order with empty menu (should fail gracefully)
      await act(async () => {
        result.current.handleOrderData({
          items: [{ name: 'Greek Salad', quantity: 1 }]
        })
      })

      expect(result.current.orderItems).toHaveLength(0)

      // Menu loads
      ;(useMenuItems as any).mockReturnValue({ items: mockMenuItems, loading: false })

      await act(async () => {
        rerender()
      })

      // Now processing should work
      await act(async () => {
        result.current.handleOrderData({
          items: [{ name: 'Greek Salad', quantity: 1 }]
        })
      })

      await waitFor(() => {
        expect(result.current.orderItems).toHaveLength(1)
        expect(result.current.orderItems[0].menuItemId).toBe('123e4567-e89b-12d3-a456-426614174000')
      }, { timeout: 1000 })
    })

    it('REGRESSION: Defensive checks prevent crashes when OrderParser not ready', async () => {
      // This test ensures the defensive checks from Oct 30 work

      ;(useMenuItems as any).mockReturnValue({ items: [], loading: false })

      const { result } = renderHook(() => useVoiceOrderWebRTC())

      // Should not throw when OrderParser is not ready
      await act(async () => {
        expect(() => {
          result.current.handleOrderData({
            items: [{ name: 'Greek Salad', quantity: 1 }]
          })
        }).not.toThrow()
      })

      // Should not add any items
      expect(result.current.orderItems).toHaveLength(0)
    })
  })
})
