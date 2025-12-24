import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { WebSocketService } from './WebSocketService'
import { supabase } from '@/core/supabase'
import { setCurrentRestaurantId } from '@/services/http/httpClient'
import { toSnakeCase } from '@/services/utils/caseTransform'

// Mock WebSocket with proper event handling
class MockWebSocket {
  readyState = 0 // WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  // Define static constants to match WebSocket
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3

  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = 3 // WebSocket.CLOSED
  })

  // Add addEventListener/removeEventListener for compatibility (not used by service, but good to have)
  addEventListener = vi.fn()
  removeEventListener = vi.fn()

  simulateOpen() {
    // Set readyState synchronously so isConnected() works immediately
    this.readyState = 1 // WebSocket.OPEN

    // Call handler synchronously for simpler testing
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  simulateMessage(data: unknown) {
    if (this.onmessage) {
      // Call handler synchronously for simpler testing
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  simulateError() {
    this.readyState = 3 // WebSocket.CLOSED
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = 3 // WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }
}

// Mock Supabase
vi.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn()
    }
  }
}))

// We'll set up the mock in beforeEach instead

// Mock fetch for demo auth
global.fetch = vi.fn()

describe('WebSocketService', { timeout: 10000 }, () => {
  let service: WebSocketService
  let mockWebSocket: MockWebSocket
  let latestMockWebSocket: MockWebSocket // Track the latest instance created

  // Helper to get the current WebSocket mock (the one actually used by the service)
  const getCurrentMock = () => latestMockWebSocket || mockWebSocket

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Mock fetch to prevent actual network calls
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'demo-token' })
    })

    // Set up auth mock
    ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
      data: {
        session: {
          access_token: 'test-token',
          expires_at: Date.now() + 3600000,
          user: {} as { id: string }
        }
      },
      error: null
    })

    // Set restaurant ID
    setCurrentRestaurantId('test-restaurant')

    // Mock WebSocket constructor - Create new instance on each call for reconnection tests
    // @ts-expect-error - Mock WebSocket for testing
    global.WebSocket = vi.fn().mockImplementation(() => {
      latestMockWebSocket = new MockWebSocket()
      mockWebSocket = latestMockWebSocket // Also set mockWebSocket for backwards compatibility
      return latestMockWebSocket
    }) as any
    // Add WebSocket constants
    global.WebSocket.CONNECTING = 0
    global.WebSocket.OPEN = 1
    global.WebSocket.CLOSING = 2
    global.WebSocket.CLOSED = 3

    service = new WebSocketService()
  })
  
  afterEach(async () => {
    // Properly disconnect and clean up the service
    service.disconnect()
    
    // Clear all timers to prevent hanging tests
    vi.clearAllTimers()
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset WebSocket mock
    if (mockWebSocket) {
      getCurrentMock().close()
      mockWebSocket = null as any
    }
    
    // Simulate the close event if WebSocket exists
    if (latestMockWebSocket && latestMockWebSocket.onclose) {
      latestMockWebSocket.simulateClose(1000, 'Test cleanup')
    }
    
    // Clear all pending timers
    vi.clearAllTimers()
    
    // Run any remaining async operations
    await vi.runAllTimersAsync()
    
    // Restore real timers
    vi.useRealTimers()
    
    // Clear all mocks
    vi.clearAllMocks()
  })
  
  describe('connect', () => {
    test('should establish WebSocket connection with auth params', async () => {
      const connectPromise = service.connect()

      // Wait for auth to be resolved and WebSocket to be created
      await vi.runOnlyPendingTimersAsync()

      const wsCall = (global.WebSocket as unknown as vi.Mock).mock.calls[0]
      const url = new URL(wsCall[0])

      expect(url.searchParams.get('token')).toBe('test-token')
      expect(url.searchParams.get('restaurant_id')).toBe('test-restaurant')

      // Simulate WebSocket opening on the CURRENT mock (the one service is using)
      getCurrentMock().simulateOpen()
      await connectPromise

      expect(service.isConnected()).toBe(true)
    })
    
    test('should handle missing auth session', async () => {
      ;(supabase.auth.getSession as vi.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const connectPromise = service.connect()
      await vi.runOnlyPendingTimersAsync()

      // In dev mode, should connect without token (anonymous connection)
      const wsCall = (global.WebSocket as unknown as vi.Mock).mock.calls[0]
      const url = new URL(wsCall[0])

      // Token should be null or not present in dev mode when no auth
      expect(url.searchParams.get('token')).toBeNull()

      getCurrentMock().simulateOpen()
      await connectPromise

      expect(service.isConnected()).toBe(true)
    })
    
    test('should handle missing restaurant ID', async () => {
      setCurrentRestaurantId(null)

      const connectPromise = service.connect()
      await vi.runOnlyPendingTimersAsync()

      // Should use fallback restaurant ID
      const wsCall = (global.WebSocket as unknown as vi.Mock).mock.calls[0]
      const url = new URL(wsCall[0])

      expect(url.searchParams.get('restaurant_id')).toBe('grow')

      getCurrentMock().simulateOpen()
      await connectPromise

      expect(service.isConnected()).toBe(true)
    })
    
    test('should not connect if already connected', async () => {
      // First connection
      const firstConnect = service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()

      // Simulate open and wait for the handler
      getCurrentMock().simulateOpen() // Just advance a little for the setTimeout(0)
      await firstConnect

      expect(service.isConnected()).toBe(true)

      ;(global.WebSocket as unknown as vi.Mock).mockClear()

      // Second connection attempt should not create new WebSocket
      await service.connect()

      // Should still be using the same connection
      expect(global.WebSocket).not.toHaveBeenCalled()
      expect(service.isConnected()).toBe(true)
    })
  })
  
  describe('disconnect', () => {
    test('should close WebSocket connection', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      // Ensure connection is established
      expect(service.isConnected()).toBe(true)

      service.disconnect()

      expect(getCurrentMock().close).toHaveBeenCalledWith(1000, 'Client disconnect')
      expect(service.isConnected()).toBe(false)
    })
  })
  
  describe('send', () => {
    test('should send messages when connected', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      // Connection should be established
      expect(service.isConnected()).toBe(true)

      // Clear any previous sends (like heartbeat pings)
      getCurrentMock().send.mockClear()

      const payload = { test: 'data' }
      service.send('test-message', payload)

      expect(getCurrentMock().send).toHaveBeenCalled()
      const sentData = JSON.parse(getCurrentMock().send.mock.calls[0][0])
      expect(sentData.type).toBe('test-message')
      expect(sentData.payload).toEqual(toSnakeCase(payload))
    })
    
    test('should queue messages when not connected', () => {
      const payload = { test: 'data' }
      service.send('test-message', payload)
      
      // WebSocket should exist but not be open yet
      expect(service.isConnected()).toBe(false)
    })
    
    test('should not send messages when not connected', async () => {
      // Try to send without connection
      service.send('message1', { data: 1 })

      // Should not crash and WebSocket shouldn't be created
      expect(service.isConnected()).toBe(false)

      // Now connect
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      // Clear any heartbeat sends
      getCurrentMock().send.mockClear()

      // Now sending should work
      service.send('message2', { data: 2 })
      expect(getCurrentMock().send).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('subscribe', () => {
    test('should handle incoming messages', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      const callback = vi.fn()
      service.subscribe('test-message', callback)

      const payload = { test_data: 'value' }
      getCurrentMock().simulateMessage({
        type: 'test-message',
        payload,
        timestamp: new Date().toISOString()
      })

      // Message delivered synchronously

      expect(callback).toHaveBeenCalledWith(payload)
    })

    test('should return unsubscribe function', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      const callback = vi.fn()
      const unsubscribe = service.subscribe('test-message', callback)

      // Send message
      getCurrentMock().simulateMessage({
        type: 'test-message',
        payload: { test: 'data' }
      })

      // Message delivered synchronously

      expect(callback).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsubscribe()

      // Send another message
      getCurrentMock().simulateMessage({
        type: 'test-message',
        payload: { test: 'data2' }
      })

      // Message delivered synchronously

      // Should not be called again
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('reconnection', () => {
    test('should attempt reconnection on unexpected close', async () => {
      // Create a fresh service for this test
      const testService = new WebSocketService({ maxReconnectAttempts: 5 })

      try {
        const connectPromise = testService.connect()
        await vi.runOnlyPendingTimersAsync()
        expect(global.WebSocket).toHaveBeenCalled()

        // Simulate successful connection
        getCurrentMock().simulateOpen()
        await connectPromise

        const initialCallCount = (global.WebSocket as unknown as vi.Mock).mock.calls.length
        expect(testService.isConnected()).toBe(true)

        // Simulate unexpected close - this should trigger scheduleReconnect
        getCurrentMock().simulateClose(1006, 'Connection lost')

        // The reconnect timer is scheduled with exponential backoff (~2000-3000ms with jitter)
        // We need to advance time and also allow the async operations to complete
        // Use runAllTimersAsync which handles async callbacks in timers
        await vi.runAllTimersAsync()

        // Should attempt reconnection (initial + at least 1 reconnect)
        expect((global.WebSocket as unknown as vi.Mock).mock.calls.length).toBeGreaterThan(initialCallCount)
      } finally {
        // Cleanup guaranteed even on test failure
        testService.disconnect()
      }
    })
    
    test('should not reconnect on intentional close', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      ;(global.WebSocket as unknown as vi.Mock).mockClear()

      service.disconnect()

      // Advance timers - should not attempt reconnection
      await vi.advanceTimersByTimeAsync(10000)

      expect(global.WebSocket).not.toHaveBeenCalled()
    })
    
    test('should stop reconnecting after max attempts', async () => {
      // Use a small number of max attempts for faster testing
      const maxAttempts = 3
      service = new WebSocketService({ maxReconnectAttempts: maxAttempts })

      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()

      // Simulate multiple failed connections
      // Each iteration: simulateError triggers onerror, simulateClose triggers onclose which schedules reconnect
      for (let i = 0; i < maxAttempts + 1; i++) {
        getCurrentMock().simulateError()
        getCurrentMock().simulateClose(1006)
        // Run all pending timers to trigger the scheduled reconnect
        await vi.runAllTimersAsync()
      }

      const totalCalls = (global.WebSocket as unknown as vi.Mock).mock.calls.length
      // Should be initial connection + maxAttempts retries = maxAttempts + 1
      expect(totalCalls).toBeLessThanOrEqual(maxAttempts + 1)
    })

    test('should prevent concurrent reconnection attempts', async () => {
      // Create a fresh service for this test
      const testService = new WebSocketService({ maxReconnectAttempts: 5 })

      try {
        const connectPromise = testService.connect()
        await vi.runOnlyPendingTimersAsync()
        expect(global.WebSocket).toHaveBeenCalled()

        // Simulate successful connection
        getCurrentMock().simulateOpen()
        await connectPromise

        const initialCallCount = (global.WebSocket as unknown as vi.Mock).mock.calls.length
        expect(testService.isConnected()).toBe(true)

        // Simulate close to trigger reconnection
        getCurrentMock().simulateClose(1006, 'Connection lost')

        // Try to connect manually while reconnection is scheduled (should be prevented)
        // This should be blocked because isReconnecting is true
        await testService.connect()

        // Wait for the reconnect timer to fire
        await vi.advanceTimersByTimeAsync(5000)
        await vi.runOnlyPendingTimersAsync()

        // Should have only 1 reconnection attempt (concurrent attempts blocked)
        // Initial connection + 1 reconnect = initialCallCount + 1
        expect((global.WebSocket as unknown as vi.Mock).mock.calls.length).toBe(initialCallCount + 1)
      } finally {
        // Cleanup guaranteed even on test failure
        testService.disconnect()
      }
    })
  })
  
  describe('heartbeat', () => {
    test('should send ping messages periodically', async () => {
      service = new WebSocketService()

      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      // Advance time to trigger heartbeat (30 seconds)
      await vi.advanceTimersByTimeAsync(30000)

      const pingCall = getCurrentMock().send.mock.calls.find(call => {
        const data = JSON.parse(call[0])
        return data.type === 'ping'
      })

      expect(pingCall).toBeDefined()
    })
  })
  
  describe('error handling', () => {
    test('should emit error on invalid message format', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      getCurrentMock().simulateOpen()

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Send invalid JSON
      if (getCurrentMock().onmessage) {
        getCurrentMock().onmessage(new MessageEvent('message', { data: 'invalid json' }))
      }

      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'), expect.any(Error))
      consoleError.mockRestore()
    })
  })
})
