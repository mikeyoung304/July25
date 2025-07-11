import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Add TextEncoder/TextDecoder for React Router
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder

// Mock import.meta for tests
;(globalThis as any).import = {
  meta: {
    env: {
      VITE_API_BASE_URL: 'http://localhost:3001',
      VITE_USE_MOCK_DATA: 'true',
      DEV: false,
      MODE: 'test'
    }
  }
}

// Mock the transcription service
jest.mock('@/services/transcription/TranscriptionService')

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})