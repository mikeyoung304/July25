// Polyfill for import.meta.env
if (typeof global !== 'undefined' && !(global as any).import) {
  (global as any).import = {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3001',
        VITE_WS_URL: 'ws://localhost:3001',
        VITE_ENVIRONMENT: 'test',
        MODE: 'test',
        DEV: false,
        PROD: false,
        SSR: false,
      }
    }
  }
}

// Browser globals
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

// AudioContext mock
class MockAudioContext {
  createOscillator() {
    return {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      type: 'sine',
      frequency: { value: 440 }
    }
  }
  createGain() {
    return {
      connect: jest.fn(),
      gain: { value: 1 }
    }
  }
  destination = {}
  currentTime = 0
}

// @ts-expect-error - mock
global.AudioContext = MockAudioContext
// @ts-expect-error - mock
global.webkitAudioContext = MockAudioContext

// MediaRecorder mock
class MockMediaRecorder {
  state = 'inactive'
  ondataavailable: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onstart: ((event: any) => void) | null = null
  onstop: ((event: any) => void) | null = null
  
  constructor(public stream: MediaStream, public options?: any) {}
  
  start() {
    this.state = 'recording'
    if (this.onstart && typeof this.onstart === 'function') {
      this.onstart(new Event('start'))
    }
  }
  
  stop() {
    this.state = 'inactive'
    if (this.onstop && typeof this.onstop === 'function') {
      this.onstop(new Event('stop'))
    }
    if (this.ondataavailable && typeof this.ondataavailable === 'function') {
      this.ondataavailable({ data: new Blob() })
    }
  }
  
  pause() { this.state = 'paused' }
  resume() { this.state = 'recording' }
  
  static isTypeSupported() { return true }
}

(global as any).MediaRecorder = MockMediaRecorder

// MediaStream mock
class MockMediaStream {
  active = true
  id = 'mock-stream-id'
  
  getTracks() {
    return [{
      stop: jest.fn(),
      kind: 'audio',
      enabled: true
    }]
  }
  
  addTrack() {}
  removeTrack() {}
  getAudioTracks() { return this.getTracks() }
  getVideoTracks() { return [] }
}

(global as any).MediaStream = MockMediaStream

// WebSocket mock
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  
  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  
  constructor(public url: string, public protocols?: string | string[]) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) this.onopen(new Event('open'))
    }, 0)
  }
  
  send(_data: string | ArrayBuffer | Blob) {
    // Mock implementation
  }
  
  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      const event = new CloseEvent('close', { code: code || 1000, reason: reason || '' })
      this.onclose(event)
    }
  }
}

// @ts-expect-error - mock
global.WebSocket = MockWebSocket

// navigator.mediaDevices mock
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue(new MockMediaStream()),
    enumerateDevices: jest.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' }
    ])
  }
})

// Silence console errors in tests
const originalError = console.error
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: unmountComponentAtNode') ||
     args[0].includes('not wrapped in act'))
  ) {
    return
  }
  originalError.call(console, ...args)
}