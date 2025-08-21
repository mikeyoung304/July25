import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { TextEncoder, TextDecoder } from 'util'

// Add TextEncoder/TextDecoder for React Router
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder

// import.meta is already handled by Vitest natively

// Mock AI service calls (backend integration)
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn().mockResolvedValue({
        data: {
          transcription: 'Mock AI transcription',
          response: 'Mock AI response',
          orderData: null
        }
      }),
      get: vi.fn().mockResolvedValue({
        data: { status: 'healthy' }
      })
    }))
  }
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})