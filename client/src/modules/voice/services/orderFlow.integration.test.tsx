import React from 'react'
import { vi } from 'vitest';
import { render, waitFor, act } from '@testing-library/react'

// Mock toast *before* component import so Jest hoists it
const mockToast = { success: vi.fn(), error: vi.fn() }
vi.doMock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: mockToast })
}))

import VoiceControl from '@/modules/voice/components/VoiceControl'
import { TestRestaurantProvider } from '@/test-utils/TestRestaurantProvider'
import { Toaster } from 'react-hot-toast'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []
  
  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  
  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }
  
  send(_data: string | ArrayBuffer | Blob) {
    // Mock implementation
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
  
  simulateMessage(data: any) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }))
  }
}

// Replace global WebSocket with mock
const originalWebSocket = global.WebSocket
beforeAll(() => {
  global.WebSocket = MockWebSocket as any
})

afterAll(() => {
  global.WebSocket = originalWebSocket
})

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{
        stop: vi.fn()
      }]
    })
  }
})

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive'
  ondataavailable: ((event: any) => void) | null = null
  onstop: (() => void) | null = null
  
  start() {
    this.state = 'recording'
  }
  
  stop() {
    this.state = 'inactive'
    this.onstop?.()
  }
}

global.MediaRecorder = MockMediaRecorder as any

describe('Voice Order Flow Integration', () => {
  let mockWs: MockWebSocket
  let fetchMock: vi.Mock
  
  beforeEach(() => {
    // Clear WebSocket instances
    MockWebSocket.instances = []
    
    // Mock fetch API
    fetchMock = vi.fn() as vi.Mock
    ;(global as any).fetch = fetchMock  // TS-safe override
    
    // Default successful responses
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/v1/ai/parse-order')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [
              {
                name: 'Burger',
                quantity: 2,
                price: 8.99,
                modifiers: ['Extra cheese']
              }
            ],
            totalAmount: 17.98,
            orderType: 'dine-in'
          })
        } as Response)
      }
      
      if (url.includes('/api/v1/orders')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: 'order-123',
            orderNumber: '1001',
            status: 'new',
            items: [
              {
                name: 'Burger',
                quantity: 2,
                price: 8.99,
                modifiers: ['Extra cheese']
              }
            ],
            totalAmount: 17.98,
            createdAt: new Date().toISOString()
          })
        } as Response)
      }
      
      return Promise.reject(new Error('Unknown URL'))
    })
  })
  
  afterEach(() => {
    vi.clearAllMocks()
  })
  
  it('should create an order when receiving transcription_result from WebSocket', async () => {
    const mockTranscriptHandler = vi.fn()
    
    // Clear mock calls from previous tests
    mockToast.success.mockClear()
    mockToast.error.mockClear()
    
    const { container: _container } = render(
      <TestRestaurantProvider restaurant={{ id: 'rest-1', name: 'Test Restaurant', timezone: 'America/New_York', currency: 'USD' }}>
        <VoiceControl onTranscript={mockTranscriptHandler} />
        <Toaster />
      </TestRestaurantProvider>
    )
    
    // Wait for WebSocket connection
    await waitFor(() => {
      const wsInstances = (global.WebSocket as any).instances || []
      mockWs = wsInstances[wsInstances.length - 1]
      expect(mockWs).toBeDefined()
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN)
    })
    
    // Simulate transcription result from WebSocket
    act(() => {
      mockWs.simulateMessage({
        type: 'transcription_result',
        text: 'I would like two burgers with extra cheese'
      })
    })
    
    // Wait for API calls and toast
    await waitFor(() => {
      // Check that onTranscript was called
      expect(mockTranscriptHandler).toHaveBeenCalledWith(
        'I would like two burgers with extra cheese',
        true
      )
    })
    
    // Verify API endpoints were called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/ai/parse-order'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            text: 'I would like two burgers with extra cheese',
            restaurant_id: 'rest-1'
          })
        })
      )
      
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/orders'),
        expect.any(Object)
      )
    })
    
    // Check success toast
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Order created!')
    })
  })
  
  it('should show error toast when order parsing fails', async () => {
    const mockTranscriptHandler = vi.fn()
    
    // Clear mock calls from previous tests
    mockToast.success.mockClear()
    mockToast.error.mockClear()
    
    // Override parse-order to fail
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/v1/ai/parse-order')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Failed to parse order' })
        } as Response)
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    const { container: _container } = render(
      <TestRestaurantProvider restaurant={{ id: 'rest-1', name: 'Test Restaurant', timezone: 'America/New_York', currency: 'USD' }}>
        <VoiceControl onTranscript={mockTranscriptHandler} />
        <Toaster />
      </TestRestaurantProvider>
    )
    
    // Wait for WebSocket connection
    await waitFor(() => {
      mockWs = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      expect(mockWs).toBeDefined()
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN)
    })
    
    // Simulate transcription result
    act(() => {
      mockWs.simulateMessage({
        type: 'transcription_result',
        text: 'Invalid order text'
      })
    })
    
    // Check error toast
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to parse order')
    })
  })
  
  it('should show error toast when order creation fails', async () => {
    const mockTranscriptHandler = vi.fn()
    
    // Clear mock calls from previous tests
    mockToast.success.mockClear()
    mockToast.error.mockClear()
    
    // Override create order to fail but parse succeeds
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/api/v1/ai/parse-order')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            items: [{ name: 'Burger', quantity: 1, price: 8.99 }],
            totalAmount: 8.99,
            orderType: 'dine-in'
          })
        } as Response)
      }
      
      if (url.includes('/api/v1/orders')) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Database error' })
        } as Response)
      }
      
      return Promise.reject(new Error('Unknown URL'))
    })
    
    const { container: _container } = render(
      <TestRestaurantProvider restaurant={{ id: 'rest-1', name: 'Test Restaurant', timezone: 'America/New_York', currency: 'USD' }}>
        <VoiceControl onTranscript={mockTranscriptHandler} />
        <Toaster />
      </TestRestaurantProvider>
    )
    
    // Wait for WebSocket connection
    await waitFor(() => {
      mockWs = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      expect(mockWs).toBeDefined()
      expect(mockWs.readyState).toBe(MockWebSocket.OPEN)
    })
    
    // Simulate transcription result
    act(() => {
      mockWs.simulateMessage({
        type: 'transcription_result',
        text: 'I would like a burger'
      })
    })
    
    // Check error toast
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to create order')
    })
  })
})