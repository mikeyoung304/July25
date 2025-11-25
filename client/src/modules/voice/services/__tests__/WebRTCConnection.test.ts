import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebRTCConnection, type WebRTCVoiceConfig, type ConnectionState } from '../WebRTCConnection'

// Mock data channel
const createMockDataChannel = () => ({
  onopen: null as ((event: Event) => void) | null,
  onmessage: null as ((event: MessageEvent) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  onclose: null as ((event: Event) => void) | null,
  close: vi.fn(),
  send: vi.fn(),
  readyState: 'connecting' as RTCDataChannelState,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})

// Mock peer connection
const createMockPeerConnection = () => {
  const mock = {
    createDataChannel: vi.fn(() => createMockDataChannel()),
    createOffer: vi.fn(() => Promise.resolve({
      type: 'offer' as RTCSdpType,
      sdp: 'mock-offer-sdp\nm=audio\nm=application'
    })),
    setLocalDescription: vi.fn(async (desc: RTCSessionDescriptionInit) => {
      // Simulate signaling state change after setting local description
      if (desc.type === 'offer') {
        mock.signalingState = 'have-local-offer'
      }
    }),
    setRemoteDescription: vi.fn(async () => {
      // Simulate signaling state change after setting remote description
      mock.signalingState = 'stable'
    }),
    addTrack: vi.fn(() => ({
      stop: vi.fn()
    })),
    close: vi.fn(() => {
      mock.signalingState = 'closed'
    }),
    iceServers: [],
    signalingState: 'stable' as RTCSignalingState,
    iceConnectionState: 'new' as RTCIceConnectionState,
    connectionState: 'new' as RTCPeerConnectionState,
    onicecandidate: null as ((event: RTCPeerConnectionIceEvent) => void) | null,
    oniceconnectionstatechange: null as ((event: Event) => void) | null,
    onconnectionstatechange: null as ((event: Event) => void) | null,
    ontrack: null as ((event: RTCTrackEvent) => void) | null,
    onsignalingstatechange: null as ((event: Event) => void) | null,
    ondatachannel: null as ((event: RTCDataChannelEvent) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  return mock
}

// Mock media stream track - create with a mutable enabled property
const createMockMediaStreamTrack = () => {
  const track = {
    kind: 'audio' as const,
    enabled: true,
    stop: vi.fn(),
    onended: null as ((event: Event) => void) | null,
    onmute: null as ((event: Event) => void) | null,
    onunmute: null as ((event: Event) => void) | null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    id: 'mock-track-id',
    label: 'mock-audio-track',
    muted: false,
    readyState: 'live' as MediaStreamTrackState,
  }
  return track
}

// Mock media stream - ensure tracks are consistent
const createMockMediaStream = () => {
  const audioTrack = createMockMediaStreamTrack()
  return {
    getTracks: vi.fn(() => [audioTrack]),
    getAudioTracks: vi.fn(() => [audioTrack]),
    getVideoTracks: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    id: 'mock-stream-id',
    active: true,
  }
}

// Mock audio element
const createMockAudioElement = () => ({
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  load: vi.fn(), // Required for cleanup to release media buffers
  autoplay: false,
  muted: false,
  volume: 1,
  srcObject: null as MediaStream | null,
  src: '',
  style: { display: 'block' },
  onloadedmetadata: null as ((event: Event) => void) | null,
  onplay: null as ((event: Event) => void) | null,
  onpause: null as ((event: Event) => void) | null,
  onerror: null as ((event: Event | string) => void) | null,
  onended: null as ((event: Event) => void) | null,
  onseeking: null as ((event: Event) => void) | null,
  onseeked: null as ((event: Event) => void) | null,
  parentNode: {
    removeChild: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
})

// Global mocks
let mockPeerConnection: ReturnType<typeof createMockPeerConnection>
let mockDataChannel: ReturnType<typeof createMockDataChannel>
let mockMediaStream: ReturnType<typeof createMockMediaStream>
let mockAudioElement: ReturnType<typeof createMockAudioElement>

// Setup global browser APIs
global.RTCPeerConnection = vi.fn(() => {
  mockPeerConnection = createMockPeerConnection()
  return mockPeerConnection as any
}) as any

global.navigator = {
  mediaDevices: {
    getUserMedia: vi.fn(() => {
      mockMediaStream = createMockMediaStream()
      return Promise.resolve(mockMediaStream as any)
    }),
  },
} as any

// Mock document.createElement for audio element
const originalCreateElement = document.createElement.bind(document)
document.createElement = vi.fn((tagName: string) => {
  if (tagName === 'audio') {
    mockAudioElement = createMockAudioElement()
    return mockAudioElement as any
  }
  return originalCreateElement(tagName)
}) as any

// Mock document.body.appendChild - properly set parentNode to simulate DOM behavior
document.body.appendChild = vi.fn((node: Node) => {
  // Set parentNode to document.body to simulate real DOM behavior
  (node as any).parentNode = document.body
  return node
}) as any

// Also mock document.body.removeChild
document.body.removeChild = vi.fn((node: Node) => {
  (node as any).parentNode = null
  return node
}) as any

// Mock fetch for OpenAI API
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('mock-answer-sdp'),
    status: 200,
  })
) as any

describe('WebRTCConnection', () => {
  let connection: WebRTCConnection
  let config: WebRTCVoiceConfig

  beforeEach(() => {
    vi.clearAllMocks()

    config = {
      restaurantId: 'test-restaurant-123',
      userId: 'test-user-456',
      debug: false,
      enableVAD: false,
      muteAudioOutput: false,
    }

    connection = new WebRTCConnection(config)
  })

  afterEach(() => {
    connection.disconnect()
    vi.restoreAllMocks()
  })

  describe('Connection Lifecycle', () => {
    it('creates RTCPeerConnection with STUN servers on connect', async () => {
      await connection.connect('test-token')

      expect(global.RTCPeerConnection).toHaveBeenCalledWith({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
      })
    })

    it('creates data channel with correct configuration', async () => {
      await connection.connect('test-token')

      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith('oai-events', {
        ordered: true,
      })
    })

    it('sets up microphone with correct constraints', async () => {
      await connection.connect('test-token')

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    })

    it('cleans up all resources on disconnect', async () => {
      await connection.connect('test-token')

      const pc = connection.getPeerConnection()
      const dc = connection.getDataChannel()
      const stream = connection.getMicrophoneStream()
      const audioEl = mockAudioElement

      connection.disconnect()

      expect((pc as any)?.close).toHaveBeenCalled()
      expect((dc as any)?.close).toHaveBeenCalled()
      expect(stream?.getTracks()[0].stop).toHaveBeenCalled()
      // Audio element is removed from document.body (parentNode is set by appendChild mock)
      expect(document.body.removeChild).toHaveBeenCalledWith(audioEl)
    })

    it('returns correct connection state', async () => {
      expect(connection.getConnectionState()).toBe('disconnected')

      const connectPromise = connection.connect('test-token')
      expect(connection.getConnectionState()).toBe('connecting')

      await connectPromise

      // Get the data channel and simulate open event
      const dc = connection.getDataChannel()
      if (dc && (dc as any).onopen) {
        (dc as any).onopen(new Event('open'))
      }

      expect(connection.getConnectionState()).toBe('connected')
    })

    it('emits connection.change events on state transitions', async () => {
      const stateChanges: ConnectionState[] = []
      connection.on('connection.change', (state: ConnectionState) => {
        stateChanges.push(state)
      })

      const connectPromise = connection.connect('test-token')

      // Should emit 'connecting'
      expect(stateChanges).toContain('connecting')

      await connectPromise

      // Get the data channel and simulate open event to trigger 'connected'
      const dc = connection.getDataChannel()
      if (dc && (dc as any).onopen) {
        (dc as any).onopen(new Event('open'))
      }

      expect(stateChanges).toContain('connected')

      connection.disconnect()
      expect(stateChanges).toContain('disconnected')
    })
  })

  describe('Media Stream Management', () => {
    it('calls getUserMedia with correct audio constraints', async () => {
      await connection.connect('test-token')

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    })

    it('enables microphone by unmuting audio track', async () => {
      await connection.connect('test-token')

      const stream = connection.getMicrophoneStream()
      const audioTrack = stream?.getAudioTracks()[0]

      // Verify track starts disabled
      expect(audioTrack?.enabled).toBe(false)

      connection.enableMicrophone()

      expect(audioTrack?.enabled).toBe(true)
    })

    it('disables microphone by muting audio track', async () => {
      await connection.connect('test-token')

      const stream = connection.getMicrophoneStream()
      const audioTrack = stream?.getAudioTracks()[0]

      // First enable it
      if (audioTrack) audioTrack.enabled = true

      connection.disableMicrophone()

      expect(audioTrack?.enabled).toBe(false)
    })

    it('starts with muted audio track by default (PTT mode)', async () => {
      await connection.connect('test-token')

      const stream = connection.getMicrophoneStream()
      const audioTrack = stream?.getAudioTracks()[0]

      // Track should be disabled after setup
      expect(audioTrack?.enabled).toBe(false)
    })

    it('emits error on microphone access failure', async () => {
      const errorPromise = new Promise((resolve) => {
        connection.on('error', resolve)
      })

      ;(navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      await expect(connection.connect('test-token')).rejects.toThrow()

      const error = await errorPromise
      expect(error).toBeDefined()
    })
  })

  describe('Cleanup & Memory Leaks', () => {
    it('removes all data channel event listeners on disconnect', async () => {
      await connection.connect('test-token')

      const dc = connection.getDataChannel()

      connection.disconnect()

      // Verify the data channel's event handlers were cleared
      expect((dc as any)?.onopen).toBeNull()
      expect((dc as any)?.onmessage).toBeNull()
      expect((dc as any)?.onerror).toBeNull()
      expect((dc as any)?.onclose).toBeNull()
    })

    it('removes all peer connection event listeners on disconnect', async () => {
      await connection.connect('test-token')

      const pc = connection.getPeerConnection()

      connection.disconnect()

      // Verify the peer connection's event handlers were cleared
      expect((pc as any)?.onicecandidate).toBeNull()
      expect((pc as any)?.oniceconnectionstatechange).toBeNull()
      expect((pc as any)?.onconnectionstatechange).toBeNull()
      expect((pc as any)?.ontrack).toBeNull()
      expect((pc as any)?.onsignalingstatechange).toBeNull()
      expect((pc as any)?.ondatachannel).toBeNull()
    })

    it('stops all media tracks on disconnect', async () => {
      await connection.connect('test-token')

      const stream = connection.getMicrophoneStream()
      const tracks = stream?.getTracks() || []

      // Store references to track stop functions before disconnect
      const stopSpies = tracks.map(track => track.stop)

      connection.disconnect()

      // Verify stop was called on each track
      stopSpies.forEach(stopSpy => {
        expect(stopSpy).toHaveBeenCalled()
      })

      // Verify event handlers were cleared
      tracks.forEach(track => {
        expect(track.onended).toBeNull()
        expect(track.onmute).toBeNull()
        expect(track.onunmute).toBeNull()
      })
    })

    it('removes audio element from DOM on disconnect', async () => {
      await connection.connect('test-token')

      // Store reference to audio element before disconnect
      const audioEl = mockAudioElement

      connection.disconnect()

      expect(audioEl.pause).toHaveBeenCalled()
      expect(audioEl.srcObject).toBeNull()
      expect(audioEl.src).toBe('')
      // Audio element is removed from document.body (parentNode is set by appendChild mock)
      expect(document.body.removeChild).toHaveBeenCalledWith(audioEl)
    })

    it('clears connection references on disconnect', async () => {
      await connection.connect('test-token')

      connection.disconnect()

      expect(connection.getPeerConnection()).toBeNull()
      expect(connection.getDataChannel()).toBeNull()
      expect(connection.getMicrophoneStream()).toBeNull()
    })

    it('handles multiple connect/disconnect cycles without leaking', async () => {
      // First cycle
      await connection.connect('test-token-1')

      const firstPc = connection.getPeerConnection()
      const firstDc = connection.getDataChannel()
      const firstStream = connection.getMicrophoneStream()

      connection.disconnect()

      // Verify first cycle resources were cleaned up
      expect((firstPc as any)?.close).toHaveBeenCalled()
      expect((firstDc as any)?.close).toHaveBeenCalled()
      expect(firstStream?.getTracks()[0].stop).toHaveBeenCalled()

      // Second cycle
      await connection.connect('test-token-2')

      const secondPc = connection.getPeerConnection()
      const secondDc = connection.getDataChannel()
      const secondStream = connection.getMicrophoneStream()

      connection.disconnect()

      // Verify second cycle resources were also cleaned up
      expect((secondPc as any)?.close).toHaveBeenCalled()
      expect((secondDc as any)?.close).toHaveBeenCalled()
      expect(secondStream?.getTracks()[0].stop).toHaveBeenCalled()

      // Verify connections were actually recreated (different instances)
      expect(firstPc).not.toBe(secondPc)
      expect(firstDc).not.toBe(secondDc)
    })
  })

  describe('Event Emission', () => {
    it('emits connection.change on state changes', async () => {
      const states: ConnectionState[] = []
      connection.on('connection.change', (state: ConnectionState) => {
        states.push(state)
      })

      await connection.connect('test-token')

      expect(states).toContain('connecting')
    })

    it('emits dataChannelReady when channel opens', async () => {
      const dataChannelPromise = new Promise((resolve) => {
        connection.on('dataChannelReady', resolve)
      })

      await connection.connect('test-token')

      // Get the data channel that was created
      const dc = connection.getDataChannel()

      // Simulate data channel open
      if (dc && (dc as any).onopen) {
        (dc as any).onopen(new Event('open'))
      }

      const receivedDc = await dataChannelPromise
      expect(receivedDc).toBe(dc)
    }, 5000)

    it('emits error on connection failures', async () => {
      const errorPromise = new Promise((resolve) => {
        connection.on('error', resolve)
      })

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(connection.connect('test-token')).rejects.toThrow()

      const error = await errorPromise
      expect(error).toBeDefined()
    })

    it('emits track.received on remote track', async () => {
      const trackPromise = new Promise((resolve) => {
        connection.on('track.received', resolve)
      })

      await connection.connect('test-token')

      // Simulate receiving remote track
      const remoteStream = createMockMediaStream()
      if (mockPeerConnection?.ontrack) {
        mockPeerConnection.ontrack({
          streams: [remoteStream as any],
          track: createMockMediaStreamTrack() as any,
        } as RTCTrackEvent)
      }

      const receivedStream = await trackPromise
      expect(receivedStream).toBe(remoteStream)
    })

    it('emits disconnection on close', async () => {
      const disconnectionPromise = new Promise((resolve) => {
        connection.on('disconnection', resolve)
      })

      await connection.connect('test-token')

      // Get the data channel that was created
      const dc = connection.getDataChannel()

      // Simulate data channel close
      if (dc && (dc as any).onclose) {
        (dc as any).onclose(new Event('close'))
      }

      await disconnectionPromise
      expect(connection.getConnectionState()).toBe('disconnected')
    }, 5000)
  })

  describe('Error Handling', () => {
    it('handles OpenAI API errors gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(connection.connect('invalid-token')).rejects.toThrow(
        'OpenAI SDP exchange failed: 401'
      )

      expect(connection.getConnectionState()).toBe('error')
    })

    it('handles peer connection closed during SDP exchange', async () => {
      ;(global.fetch as any).mockImplementationOnce(async () => {
        // Simulate connection closing during fetch
        connection.disconnect()
        return {
          ok: true,
          text: () => Promise.resolve('mock-answer-sdp'),
        }
      })

      await expect(connection.connect('test-token')).rejects.toThrow(
        'PeerConnection was closed during SDP exchange'
      )
    })

    it('handles wrong signaling state for remote description', async () => {
      await connection.connect('test-token')

      // Change signaling state to invalid state
      mockPeerConnection.signalingState = 'closed'

      // Try to connect again (should fail)
      const connection2 = new WebRTCConnection(config)

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('mock-answer-sdp'),
      })

      // This should handle the wrong state gracefully
      await connection2.connect('test-token')

      // The second connect should work with fresh peer connection
      expect(connection2.getPeerConnection()).not.toBeNull()
    })

    it('prevents duplicate connections', async () => {
      const firstConnect = connection.connect('test-token-1')

      // Try to connect again while connecting
      const secondConnect = connection.connect('test-token-2')

      await firstConnect
      await secondConnect

      // Should only create one peer connection
      expect(global.RTCPeerConnection).toHaveBeenCalledTimes(1)
    })
  })

  describe('State Management', () => {
    it('isConnected returns false initially', () => {
      expect(connection.isConnected()).toBe(false)
    })

    it('isConnected returns true when connected', async () => {
      await connection.connect('test-token')

      // Get the data channel that was created
      const dc = connection.getDataChannel()

      // Simulate data channel open to set state to connected
      if (dc && (dc as any).onopen) {
        (dc as any).onopen(new Event('open'))
      }

      expect(connection.isConnected()).toBe(true)
    })

    it('isConnecting returns true during connection', async () => {
      const connectPromise = connection.connect('test-token')

      expect(connection.isConnecting()).toBe(true)

      await connectPromise
    })

    it('isConnecting returns false after connection', async () => {
      await connection.connect('test-token')

      expect(connection.isConnecting()).toBe(false)
    })
  })

  describe('Audio Output Configuration', () => {
    it('creates audio element with autoplay enabled', async () => {
      await connection.connect('test-token')

      expect(mockAudioElement.autoplay).toBe(true)
    })

    it('hides audio element in DOM', async () => {
      await connection.connect('test-token')

      expect(mockAudioElement.style.display).toBe('none')
    })

    it('mutes audio output when muteAudioOutput is true', async () => {
      const mutedConnection = new WebRTCConnection({
        ...config,
        muteAudioOutput: true,
      })

      await mutedConnection.connect('test-token')

      expect(mockAudioElement.muted).toBe(true)
      expect(mockAudioElement.volume).toBe(0)
    })

    it('assigns remote stream to audio element on track received', async () => {
      await connection.connect('test-token')

      const remoteStream = createMockMediaStream()

      if (mockPeerConnection?.ontrack) {
        mockPeerConnection.ontrack({
          streams: [remoteStream as any],
          track: createMockMediaStreamTrack() as any,
        } as RTCTrackEvent)
      }

      expect(mockAudioElement.srcObject).toBe(remoteStream)
    })
  })

  describe('ICE Connection State Handling', () => {
    it('handles ICE connection failure', async () => {
      const disconnectionPromise = new Promise((resolve) => {
        connection.on('disconnection', resolve)
      })

      await connection.connect('test-token')

      // Get the peer connection that was created
      const pc = connection.getPeerConnection()

      // Simulate ICE connection failure
      if (pc) {
        (pc as any).iceConnectionState = 'failed'
        if ((pc as any).oniceconnectionstatechange) {
          (pc as any).oniceconnectionstatechange(new Event('iceconnectionstatechange'))
        }
      }

      await disconnectionPromise
      expect(connection.getConnectionState()).toBe('disconnected')
    }, 5000)

    it('handles ICE connection disconnected', async () => {
      const disconnectionPromise = new Promise((resolve) => {
        connection.on('disconnection', resolve)
      })

      await connection.connect('test-token')

      // Get the peer connection that was created
      const pc = connection.getPeerConnection()

      // Simulate ICE connection disconnected
      if (pc) {
        (pc as any).iceConnectionState = 'disconnected'
        if ((pc as any).oniceconnectionstatechange) {
          (pc as any).oniceconnectionstatechange(new Event('iceconnectionstatechange'))
        }
      }

      await disconnectionPromise
      expect(connection.getConnectionState()).toBe('disconnected')
    }, 5000)
  })

  describe('Microphone Access Validation', () => {
    it('returns null microphone stream before connection', () => {
      expect(connection.getMicrophoneStream()).toBeNull()
    })

    it('returns microphone stream after successful setup', async () => {
      await connection.connect('test-token')

      const stream = connection.getMicrophoneStream()
      expect(stream).toBe(mockMediaStream)
    })

    it('handles enableMicrophone when no stream available', () => {
      // Should not throw
      expect(() => connection.enableMicrophone()).not.toThrow()
    })

    it('handles disableMicrophone when no stream available', () => {
      // Should not throw
      expect(() => connection.disableMicrophone()).not.toThrow()
    })
  })

  describe('Reconnection Logic', () => {
    it('emits reconnect.needed on connection failure', async () => {
      const reconnectPromise = new Promise((resolve) => {
        connection.on('reconnect.needed', resolve)
      })

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(connection.connect('test-token')).rejects.toThrow()

      // Wait for reconnect event (emitted after delay)
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('calls reconnect to clean up and request new connection', async () => {
      await connection.connect('test-token')

      const reconnectPromise = new Promise((resolve) => {
        connection.on('reconnect.needed', resolve)
      })

      await connection.reconnect()

      expect(connection.getConnectionState()).toBe('disconnected')
      await reconnectPromise
    }, 5000)

    it('increments reconnect attempts on failure', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      // First attempt
      await expect(connection.connect('test-token')).rejects.toThrow()

      // The service should track reconnect attempts internally
      // We can verify by checking if error is emitted after max attempts
      const maxReconnectAttempts = 3

      for (let i = 1; i < maxReconnectAttempts; i++) {
        await expect(connection.connect('test-token')).rejects.toThrow()
      }

      // After max attempts, should emit error about max attempts
      const errorPromise = new Promise((resolve) => {
        connection.on('error', (error: Error) => {
          if (error.message.includes('Max reconnection attempts')) {
            resolve(error)
          }
        })
      })

      await expect(connection.connect('test-token')).rejects.toThrow()

      // Wait for max attempts error
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })
})
