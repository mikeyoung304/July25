import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Add TextEncoder/TextDecoder for React Router
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder
global.TextDecoder = TextDecoder as unknown as typeof global.TextDecoder

// import.meta is already set up in jest-globals.js - just verify it exists
if (!(globalThis as any).import?.meta) {
  console.warn('import.meta not properly mocked - check jest-globals.js setup')
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