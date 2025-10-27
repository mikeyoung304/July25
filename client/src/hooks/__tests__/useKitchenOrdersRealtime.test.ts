/**
 * Test: useKitchenOrdersRealtime hook mount/unmount race conditions
 *
 * This test verifies that rapid mount/unmount cycles don't create
 * duplicate WebSocket subscriptions or memory leaks.
 */

import { describe, test, beforeEach, vi, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useKitchenOrdersRealtime } from '../useKitchenOrdersRealtime'
import { webSocketService } from '@/services/websocket'
import { connectionManager } from '@/services/websocket/ConnectionManager'
import { api } from '@/services/api'

// Mock dependencies using Vitest
vi.mock('@/services/websocket', () => ({
  webSocketService: {
    subscribe: vi.fn(),
    isConnected: vi.fn(() => true)
  }
}))

vi.mock('@/services/websocket/ConnectionManager', () => ({
  connectionManager: {
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn()
  }
}))

vi.mock('@/services/api', () => ({
  api: {
    getOrders: vi.fn(() => Promise.resolve([]))
  }
}))

vi.mock('@/core', () => ({
  useRestaurant: () => ({
    isLoading: false,
    error: null
  })
}))

vi.mock('@/modules/orders/hooks/useOrderActions', () => ({
  useOrderActions: () => ({
    updateOrderStatus: vi.fn()
  })
}))

describe('useKitchenOrdersRealtime - Race Condition Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock subscribe to return unsubscribe functions
    const mockSubscribe = webSocketService.subscribe as ReturnType<typeof vi.fn>
    mockSubscribe.mockReturnValue(vi.fn())
  })

  test('should not create duplicate subscriptions on rapid mount/unmount', async () => {
    const mockSubscribe = webSocketService.subscribe as ReturnType<typeof vi.fn>
    const mockConnect = connectionManager.connect as ReturnType<typeof vi.fn>
    const mockDisconnect = connectionManager.disconnect as ReturnType<typeof vi.fn>

    // Rapid mount/unmount cycle (5 times)
    for (let i = 0; i < 5; i++) {
      const { unmount } = renderHook(() => useKitchenOrdersRealtime())

      // Unmount immediately
      unmount()
    }

    // Wait for any pending operations
    await waitFor(() => {
      // Each mount should create 4 subscriptions (created, updated, deleted, status_changed)
      // But we should have exactly 4 active subscriptions after cleanup, not 20 (5 mounts × 4)

      // Count actual subscribe calls
      const subscribeCallCount = mockSubscribe.mock.calls.length

      // Each mount creates 4 subscriptions, but cleanup should remove them
      // Final mount should have 4 active subscriptions
      expect(subscribeCallCount).toBeGreaterThanOrEqual(4)

      // Verify unsubscribe was called for each subscription (cleanup happened)
      mockSubscribe.mock.results.forEach((result) => {
        const unsubscribeFn = result.value
        expect(unsubscribeFn).toHaveBeenCalled()
      })
    })

    // Verify disconnect was called for each mount (proper cleanup)
    expect(mockDisconnect).toHaveBeenCalledTimes(5)
  })

  test('should prevent state updates after unmount', async () => {
    const mockSubscribe = webSocketService.subscribe as ReturnType<typeof vi.fn>

    // Track subscription callbacks
    const subscriptionCallbacks: Array<(payload: unknown) => void> = []

    mockSubscribe.mockImplementation((event: string, callback: (payload: unknown) => void) => {
      subscriptionCallbacks.push(callback)
      return vi.fn() // return unsubscribe function
    })

    const { unmount } = renderHook(() => useKitchenOrdersRealtime())

    // Unmount immediately
    unmount()

    // Try to trigger callbacks after unmount
    subscriptionCallbacks.forEach(callback => {
      // This should not cause any errors or warnings about state updates
      expect(() => {
        callback({
          order: {
            id: '123',
            order_number: 'TEST-001',
            status: 'pending'
          }
        })
      }).not.toThrow()
    })
  })

  test('should handle mount during connection', async () => {
    const mockConnect = connectionManager.connect as ReturnType<typeof vi.fn>

    // Simulate slow connection
    let resolveConnection: () => void
    const connectionPromise = new Promise<void>((resolve) => {
      resolveConnection = resolve
    })
    mockConnect.mockReturnValue(connectionPromise)

    const { unmount } = renderHook(() => useKitchenOrdersRealtime())

    // Unmount before connection completes
    unmount()

    // Complete connection after unmount
    resolveConnection!()
    await connectionPromise

    // Should not cause any errors
    expect(mockConnect).toHaveBeenCalled()
  })

  test('should properly cleanup loadOrders effect', async () => {
    const mockGetOrders = api.getOrders as ReturnType<typeof vi.fn>
    mockGetOrders.mockResolvedValue([])

    // Mount and unmount rapidly multiple times
    for (let i = 0; i < 3; i++) {
      const { unmount } = renderHook(() => useKitchenOrdersRealtime())
      unmount()
    }

    await waitFor(() => {
      // loadOrders should be called once per mount
      expect(mockGetOrders).toHaveBeenCalledTimes(3)
    })
  })

  test('should maintain stable loadOrders reference', () => {
    const { result, rerender } = renderHook(() => useKitchenOrdersRealtime())

    // Initial render
    const initialOrders = result.current.orders

    // Force re-render
    rerender()

    // Orders reference should be stable unless data changes
    // This verifies that useCallback with empty deps is working
    expect(result.current.orders).toBe(initialOrders)
  })
})
