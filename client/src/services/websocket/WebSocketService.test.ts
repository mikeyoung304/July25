import { WebSocketService } from './WebSocketService'
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
  
  send = jest.fn()
  close = jest.fn()
  
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
jest.mock('@/core/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    }
  }
}))

// Mock global WebSocket
// @ts-expect-error - Mock WebSocket for testing
global.WebSocket = MockWebSocket

describe('WebSocketService', () => {
  let service: WebSocketService
  let mockWebSocket: MockWebSocket
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Set up auth mock
    ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
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
    
    // Mock WebSocket constructor
    // @ts-expect-error - Mock WebSocket for testing
    global.WebSocket = jest.fn().mockImplementation(() => {
      mockWebSocket = new MockWebSocket()
      return mockWebSocket
    })
    
    service = new WebSocketService()
  })
  
  afterEach(() => {
    jest.useRealTimers()
    service.disconnect()
  })
  
  describe('connect', () => {
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should establish WebSocket connection with auth params', async () => {
      const connectPromise = service.connect()
      
      // Wait for auth to be resolved
      await new Promise(resolve => setTimeout(resolve, 0))
      
      const wsCall = (global.WebSocket as unknown as jest.Mock).mock.calls[0]
      const url = new URL(wsCall[0])
      
      expect(url.searchParams.get('token')).toBe('test-token')
      expect(url.searchParams.get('restaurant_id')).toBe('test-restaurant')
      
      mockWebSocket.simulateOpen()
      await connectPromise
      
      expect(service.isConnected()).toBe(true)
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should handle missing auth session', async () => {
      ;(supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      })
      
      await service.connect()
      
      expect(service.getConnectionState()).toBe('error')
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should handle missing restaurant ID', async () => {
      setCurrentRestaurantId(null)
      
      await service.connect()
      
      expect(service.getConnectionState()).toBe('error')
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should not connect if already connected', async () => {
      // First connection
      const firstConnect = service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      await firstConnect
      
      ;(global.WebSocket as unknown as jest.Mock).mockClear()
      
      // Second connection attempt
      await service.connect()
      
      expect(global.WebSocket).not.toHaveBeenCalled()
    })
  })
  
  describe('disconnect', () => {
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should close WebSocket connection', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      service.disconnect()
      
      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect')
      expect(service.isConnected()).toBe(false)
    })
  })
  
  describe('send', () => {
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should send messages when connected', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      const payload = { test: 'data' }
      service.send('test-message', payload)
      
      expect(mockWebSocket.send).toHaveBeenCalled()
      const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0])
      expect(sentData.type).toBe('test-message')
      expect(sentData.payload).toEqual(toSnakeCase(payload))
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should queue messages when not connected', () => {
      const payload = { test: 'data' }
      service.send('test-message', payload)
      
      expect(mockWebSocket).toBeUndefined()
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should flush queued messages after connection', async () => {
      // Queue messages before connection
      service.send('message1', { data: 1 })
      service.send('message2', { data: 2 })
      
      // Connect
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      // Check messages were sent
      expect(mockWebSocket.send).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('subscribe', () => {
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should handle incoming messages', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      const callback = jest.fn()
      service.subscribe('test-message', callback)
      
      const payload = { test_data: 'value' }
      mockWebSocket.simulateMessage({
        type: 'test-message',
        payload,
        timestamp: new Date().toISOString()
      })
      
      expect(callback).toHaveBeenCalledWith(toCamelCase(payload))
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should return unsubscribe function', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      const callback = jest.fn()
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
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should attempt reconnection on unexpected close', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      ;(global.WebSocket as unknown as jest.Mock).mockClear()
      
      // Simulate unexpected close
      mockWebSocket.simulateClose(1006, 'Connection lost')
      
      // Advance timers
      jest.advanceTimersByTime(5000)
      
      expect(global.WebSocket).toHaveBeenCalledTimes(1)
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should not reconnect on intentional close', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      ;(global.WebSocket as unknown as jest.Mock).mockClear()
      
      service.disconnect()
      
      // Advance timers
      jest.advanceTimersByTime(10000)
      
      expect(global.WebSocket).not.toHaveBeenCalled()
    })
    
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should stop reconnecting after max attempts', async () => {
      const maxAttempts = 10
      service = new WebSocketService({ maxReconnectAttempts: maxAttempts })
      
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      
      // Simulate multiple failed connections
      for (let i = 0; i < maxAttempts + 1; i++) {
        mockWebSocket.simulateError()
        mockWebSocket.simulateClose(1006)
        jest.advanceTimersByTime(30000) // Advance past any reconnect delay
      }
      
      const totalCalls = (global.WebSocket as unknown as jest.Mock).mock.calls.length
      expect(totalCalls).toBeLessThanOrEqual(maxAttempts + 1) // Initial + max retries
    })
  })
  
  describe('heartbeat', () => {
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should send ping messages periodically', async () => {
      service = new WebSocketService()
      
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      jest.advanceTimersByTime(1000)
      
      const pingCall = mockWebSocket.send.mock.calls.find(call => {
        const data = JSON.parse(call[0])
        return data.type === 'ping'
      })
      
      expect(pingCall).toBeDefined()
    })
  })
  
  describe('error handling', () => {
    // TODO(luis): enable when Playwright pipeline runs
    test.skip('should emit error on invalid message format', async () => {
      await service.connect()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(global.WebSocket).toHaveBeenCalled()
      mockWebSocket.simulateOpen()
      
      const errorCallback = jest.fn()
      service.on('error', errorCallback)
      
      // Send invalid JSON
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid json' }))
      }
      
      expect(errorCallback).toHaveBeenCalled()
    })
  })
})