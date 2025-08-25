import { describe, it, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { WebSocketService } from './WebSocketService'
import { vi } from 'vitest';
import { supabase } from '@/core/supabase'
import { setCurrentRestaurantId } from '@/services/http/httpClient'
import { toSnakeCase, toCamelCase } from '@/services/utils/caseTransform'

// Mock WebSocket
class MockWebSocket {
  readyState = 0 // WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  
  send = vi.fn()
  close = vi.fn()
  
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
    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket)
    
    service = new WebSocketService()
  })
  
  afterEach(async () => {
    service.disconnect()
    await vi.runAllTimersAsync()
    vi.useRealTimers()
    vi.clearAllTimers()
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
      
      await service.connect()
      
      expect(service.getConnectionState()).toBe('error')
    })
    
    test('should handle missing restaurant ID', async () => {
      setCurrentRestaurantId(null)
      
      await service.connect()
      
      expect(service.getConnectionState()).toBe('error')
    })
    
    test('should not connect if already connected', async () => {
      // First connection
      const firstConnect = service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      await firstConnect
      
      ;(global.WebSocket as unknown as vi.Mock).mockClear()
      
      // Second connection attempt
      await service.connect()
      
      expect(global.WebSocket).not.toHaveBeenCalled()
    })
  })
  
  describe('disconnect', () => {
    test('should close WebSocket connection', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
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
      
      expect(mockWebSocket).toBeUndefined()
    })
    
    test('should flush queued messages after connection', async () => {
      // Queue messages before connection
      service.send('message1', { data: 1 })
      service.send('message2', { data: 2 })
      
      // Connect
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      // Check messages were sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2)
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
      
      expect(callback).toHaveBeenCalledWith(toCamelCase(payload))
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
      
      ;(global.WebSocket as unknown as vi.Mock).mockClear()
      
      // Simulate unexpected close
      mockWebSocket.simulateClose(1006, 'Connection lost')
      
      // Advance timers
      vi.advanceTimersByTime(5000)
      
      expect(global.WebSocket).toHaveBeenCalledTimes(1)
    })
    
    test('should not reconnect on intentional close', async () => {
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      ;(global.WebSocket as unknown as vi.Mock).mockClear()
      
      service.disconnect()
      
      // Advance timers
      vi.advanceTimersByTime(10000)
      
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
        vi.advanceTimersByTime(30000) // Advance past any reconnect delay
      }
      
      const totalCalls = (global.WebSocket as unknown as vi.Mock).mock.calls.length
      expect(totalCalls).toBeLessThanOrEqual(maxAttempts + 1) // Initial + max retries
    })
  })
  
  describe('heartbeat', () => {
    test('should send ping messages periodically', async () => {
      service = new WebSocketService()
      
      await service.connect()
      await vi.runOnlyPendingTimersAsync()
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      vi.advanceTimersByTime(1000)
      
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
      
      const errorCallback = vi.fn()
      service.on('error', errorCallback)
      
      // Send invalid JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }))
      }
      
      expect(errorCallback).toHaveBeenCalled()
    })
  })
})
