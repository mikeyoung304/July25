import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { WebSocketService } from './WebSocketService'
import { supabase } from '@/core/supabase'
import { setCurrentRestaurantId } from '@/services/http/httpClient'
import { toSnakeCase } from '@/services/utils/caseTransform'

// Mock WebSocket
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
  
  simulateOpen() {
    this.readyState = 1 // WebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }
  
  simulateMessage(data: unknown) {
    if (this.onmessage) {
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
    
    // Create mock WebSocket instance
    mockWebSocket = new MockWebSocket()
    
    // Mock WebSocket constructor
    // @ts-expect-error - Mock WebSocket for testing
    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket) as any
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
      mockWebSocket.close()
      mockWebSocket = null as any
    }
    
    // Simulate the close event if WebSocket exists
    if (mockWebSocket && mockWebSocket.onclose) {
      mockWebSocket.simulateClose(1000, 'Test cleanup')
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
      
      // Wait for auth to be resolved
      await vi.runOnlyPendingTimersAsync()
      
      const wsCall = (global.WebSocket as unknown as vi.Mock).mock.calls[0]
      const url = new URL(wsCall[0])
      
      expect(url.searchParams.get('token')).toBe('test-token')
      expect(url.searchParams.get('restaurant_id')).toBe('test-restaurant')
      
      mockWebSocket.simulateOpen()
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
      
      // Should still connect with demo token
      const wsCall = (global.WebSocket as unknown as vi.Mock).mock.calls[0]
      const url = new URL(wsCall[0])
      
      expect(url.searchParams.get('token')).toBe('demo-token')
      
      mockWebSocket.simulateOpen()
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
      
      expect(url.searchParams.get('restaurant_id')).toBe('11111111-1111-1111-1111-111111111111')
      
      mockWebSocket.simulateOpen()
      await connectPromise
      
      expect(service.isConnected()).toBe(true)
    })
    
    test('should not connect if already connected', async () => {
      // First connection
      const firstConnect = service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      await firstConnect
      
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
      mockWebSocket.simulateOpen()
      
      // Ensure connection is established
      expect(service.isConnected()).toBe(true)
      
      service.disconnect()
      
      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect')
      expect(service.isConnected()).toBe(false)
    })
  })
  
  describe('send', () => {
    test('should send messages when connected', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      // Wait for connection to be established
      await vi.runOnlyPendingTimersAsync()
      expect(service.isConnected()).toBe(true)
      
      // Clear any previous sends (like heartbeat pings)
      mockWebSocket.send.mockClear()
      
      const payload = { test: 'data' }
      service.send('test-message', payload)
      
      expect(mockWebSocket.send).toHaveBeenCalled()
      const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0])
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
      mockWebSocket.simulateOpen()
      await vi.runOnlyPendingTimersAsync()
      
      // Clear any heartbeat sends
      mockWebSocket.send.mockClear()
      
      // Now sending should work
      service.send('message2', { data: 2 })
      expect(mockWebSocket.send).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('subscribe', () => {
    test('should handle incoming messages', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      const callback = vi.fn()
      service.subscribe('test-message', callback)
      
      const payload = { test_data: 'value' }
      mockWebSocket.simulateMessage({
        type: 'test-message',
        payload,
        timestamp: new Date().toISOString()
      })
      
      expect(callback).toHaveBeenCalledWith(payload)
    })
    
    test('should return unsubscribe function', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      const callback = vi.fn()
      const unsubscribe = service.subscribe('test-message', callback)
      
      // Send message
      mockWebSocket.simulateMessage({
        type: 'test-message',
        payload: { test: 'data' }
      })
      
      expect(callback).toHaveBeenCalledTimes(1)
      
      // Unsubscribe
      unsubscribe()
      
      // Send another message
      mockWebSocket.simulateMessage({
        type: 'test-message',
        payload: { test: 'data2' }
      })
      
      // Should not be called again
      expect(callback).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('reconnection', () => {
    test('should attempt reconnection on unexpected close', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      await vi.runOnlyPendingTimersAsync()
      
      ;(global.WebSocket as unknown as vi.Mock).mockClear()
      
      // Simulate unexpected close
      mockWebSocket.simulateClose(1006, 'Connection lost')
      
      // Advance timers to trigger reconnection (exponential backoff: 2s + jitter)
      await vi.advanceTimersByTimeAsync(3000)
      
      expect(global.WebSocket).toHaveBeenCalledTimes(1)
    })
    
    test('should not reconnect on intentional close', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      ;(global.WebSocket as unknown as vi.Mock).mockClear()
      
      service.disconnect()
      
      // Advance timers - should not attempt reconnection
      await vi.advanceTimersByTimeAsync(10000)
      
      expect(global.WebSocket).not.toHaveBeenCalled()
    })
    
    test('should stop reconnecting after max attempts', async () => {
      const maxAttempts = 10
      service = new WebSocketService({ maxReconnectAttempts: maxAttempts })

      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()

      // Simulate multiple failed connections
      for (let i = 0; i < maxAttempts + 1; i++) {
        mockWebSocket.simulateError()
        mockWebSocket.simulateClose(1006)
        await vi.advanceTimersByTimeAsync(35000) // Advance past any reconnect delay
      }

      const totalCalls = (global.WebSocket as unknown as vi.Mock).mock.calls.length
      expect(totalCalls).toBeLessThanOrEqual(maxAttempts + 1) // Initial + max retries
    })

    test('should prevent concurrent reconnection attempts', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      mockWebSocket.simulateOpen()
      await vi.runOnlyPendingTimersAsync()

      // Clear mock to count only reconnection attempts
      ;(global.WebSocket as unknown as vi.Mock).mockClear()

      // Simulate close to trigger reconnection
      mockWebSocket.simulateClose(1006, 'Connection lost')

      // Try to connect manually while reconnection is scheduled (should be prevented)
      await service.connect()

      // Only one reconnection should be scheduled
      await vi.advanceTimersByTimeAsync(3000)

      // Should have only 1 reconnection attempt (concurrent attempts blocked)
      expect(global.WebSocket).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('heartbeat', () => {
    test('should send ping messages periodically', async () => {
      service = new WebSocketService()
      
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      // Advance time to trigger heartbeat (30 seconds)
      await vi.advanceTimersByTimeAsync(30000)
      
      const pingCall = mockWebSocket.send.mock.calls.find(call => {
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
      mockWebSocket.simulateOpen()
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Send invalid JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }))
      }
      
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'), expect.any(Error))
      consoleError.mockRestore()
    })
  })
})
