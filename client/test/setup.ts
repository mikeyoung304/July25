/**
 * Vitest Test Setup
 * Configures the test environment for all test suites
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, afterAll, beforeAll, vi } from 'vitest'

// Enable manual GC for tests
beforeAll(() => {
  if (!global.gc) {
    console.warn('Garbage collection not exposed. Run tests with --expose-gc flag for better memory management');
  }
})

// Comprehensive cleanup after each test
afterEach(async () => {
  // React cleanup
  cleanup()
  
  // Clear all timers to prevent memory leaks
  vi.clearAllTimers()
  vi.clearAllMocks()
  
  // Clear response cache if available
  try {
    // Use dynamic import for test environment compatibility
    const ResponseCacheModule = await import('../src/services/cache/ResponseCache')
    const responseCache = ResponseCacheModule.responseCache || ResponseCacheModule.default?.responseCache
    if (responseCache && typeof responseCache.destroy === 'function') {
      responseCache.destroy()
    }
  } catch {
    // ResponseCache might not be loaded in all tests
  }
  
  // Close any open WebSocket connections
  if ((global as any).__websockets__) {
    (global as any).__websockets__.forEach((ws: WebSocket) => {
      if (ws && ws.close) {
        ws.close()
      }
    })
    ;(global as any).__websockets__ = []
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})

// Final cleanup after all tests
afterAll(() => {
  // Clear any remaining intervals/timeouts
  const highestId = setTimeout(() => {}, 0)
  for (let i = 0; i < highestId; i++) {
    clearTimeout(i)
    clearInterval(i)
  }
  
  // Final garbage collection
  if (global.gc) {
    global.gc()
  }
})

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver - must be a proper class for `new ResizeObserver()` to work
class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock Audio API for voice tests
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  currentTime: 0,
  volume: 1,
  muted: false,
  preload: 'none',
}))

// Mock MediaRecorder for voice tests
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive',
  ondataavailable: null,
  onerror: null,
  onstop: null,
})) as any

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [{
      stop: vi.fn(),
      kind: 'audio',
      enabled: true,
    }],
  }),
  enumerateDevices: vi.fn().mockResolvedValue([]),
} as any

// Mock WebSocket with connection tracking for cleanup
global.WebSocket = vi.fn().mockImplementation(() => {
  const ws = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }
  
  // Track WebSocket connections for cleanup
  if (!(global as any).__websockets__) {
    ;(global as any).__websockets__ = []
  }
  ;(global as any).__websockets__.push(ws)
  
  return ws
}) as any

// Suppress console errors in tests (unless debugging)
if (!process.env.DEBUG_TESTS) {
  const originalError = console.error
  beforeAll(() => {
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Warning: ReactDOM.render') ||
         args[0].includes('Warning: useLayoutEffect') ||
         args[0].includes('Not implemented: HTMLCanvasElement'))
      ) {
        return
      }
      originalError.call(console, ...args)
    }
  })

  afterEach(() => {
    console.error = originalError
  })
}

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:3001'
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.VITE_DEFAULT_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111'