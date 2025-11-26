import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { VoiceSessionConfig, type WebRTCVoiceConfig } from '../VoiceSessionConfig'

// Mock logger - using alias path
vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// Mock the auth service
const mockAuthService = {
  getAuthToken: vi.fn()
}

// Mock fetch globally
global.fetch = vi.fn()

describe('VoiceSessionConfig', () => {
  let config: WebRTCVoiceConfig
  let sessionConfig: VoiceSessionConfig

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    config = {
      restaurantId: 'test-restaurant-123',
      userId: 'test-user-456',
      debug: false,
      enableVAD: false,
      muteAudioOutput: false
    }

    sessionConfig = new VoiceSessionConfig(config, mockAuthService)

    // Mock environment variable
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3001')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  describe('Token Management', () => {
    describe('fetchEphemeralToken', () => {
      it('calls API and returns token', async () => {
        const mockToken = 'test-ephemeral-token-123'
        const mockExpiresAt = Date.now() + 60000

        mockAuthService.getAuthToken.mockResolvedValue('auth-token-456')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: mockToken },
            expires_at: mockExpiresAt,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        // Verify API was called with correct parameters
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/realtime/session',
          {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer auth-token-456',
              'Content-Type': 'application/json',
              'x-restaurant-id': 'test-restaurant-123'
            }
          }
        )

        // Verify token was stored
        expect(sessionConfig.getToken()).toBe(mockToken)
        expect(sessionConfig.getTokenExpiry()).toBe(mockExpiresAt)
      })

      it('stores menu context when provided', async () => {
        const mockMenuContext = '**MENU**\nGreek Salad - $12.99\nChicken Wings - $10.99'

        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() + 60000,
            menu_context: mockMenuContext
          })
        })

        await sessionConfig.fetchEphemeralToken()

        expect(sessionConfig.getMenuContext()).toBe(mockMenuContext)
      })

      it('throws error when API returns non-OK status', async () => {
        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: false,
          status: 401
        })

        await expect(sessionConfig.fetchEphemeralToken()).rejects.toThrow(
          'Failed to get ephemeral token: 401'
        )
      })

      it('uses default expiry when not provided', async () => {
        const beforeFetch = Date.now()

        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            // No expires_at provided
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        const expiry = sessionConfig.getTokenExpiry()
        // Should default to 60 seconds from now
        expect(expiry).toBeGreaterThanOrEqual(beforeFetch + 60000)
        expect(expiry).toBeLessThanOrEqual(Date.now() + 60000)
      })

      it('automatically schedules token refresh after fetching', async () => {
        const mockExpiresAt = Date.now() + 30000 // 30 seconds from now

        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: mockExpiresAt,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        // Fast-forward to just before refresh time (20 seconds = 30 - 10)
        vi.advanceTimersByTime(19000)
        expect(mockAuthService.getAuthToken).toHaveBeenCalledTimes(1)

        // Fast-forward past refresh time
        vi.advanceTimersByTime(2000)
        await vi.runAllTimersAsync()

        // Should have fetched token again
        expect(mockAuthService.getAuthToken).toHaveBeenCalledTimes(2)
      })
    })

    describe('scheduleTokenRefresh', () => {
      it('sets timer 10 seconds before expiry', async () => {
        const initialTime = Date.now()
        const mockExpiresAt = initialTime + 30000 // 30 seconds from now

        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token-1' },
            expires_at: mockExpiresAt,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        // Verify timer was set (it exists)
        expect(vi.getTimerCount()).toBe(1)

        // Set up second fetch for refresh (with no further refresh)
        ;(global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token-2' },
            expires_at: Date.now() - 1000, // Expired, won't schedule another refresh
            menu_context: '**MENU**\nTest Menu'
          })
        })

        const initialAuthCalls = mockAuthService.getAuthToken.mock.calls.length

        // Fast-forward to refresh time (20 seconds = 30 - 10)
        await vi.advanceTimersByTimeAsync(20000)

        // Should have triggered refresh
        expect(mockAuthService.getAuthToken).toHaveBeenCalledTimes(initialAuthCalls + 1)
        expect(sessionConfig.getToken()).toBe('token-2')
      })

      it('clears existing timer before setting new one', async () => {
        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() + 30000,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        // Fetch token twice
        await sessionConfig.fetchEphemeralToken()
        await sessionConfig.fetchEphemeralToken()

        // Should only have one timer scheduled
        const timerCount = vi.getTimerCount()
        expect(timerCount).toBe(1)
      })

      it('does not schedule refresh if token already expired', async () => {
        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() - 5000, // Already expired
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        // No timer should be scheduled
        expect(vi.getTimerCount()).toBe(0)
      })
    })

    describe('clearTokenRefresh', () => {
      it('cleans up timer', async () => {
        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() + 30000,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        // Verify timer exists
        expect(vi.getTimerCount()).toBe(1)

        sessionConfig.clearTokenRefresh()

        // Timer should be cleared
        expect(vi.getTimerCount()).toBe(0)
      })

      it('can be called multiple times safely', () => {
        expect(() => {
          sessionConfig.clearTokenRefresh()
          sessionConfig.clearTokenRefresh()
          sessionConfig.clearTokenRefresh()
        }).not.toThrow()
      })
    })

    describe('isTokenValid', () => {
      it('returns false when token is expired', async () => {
        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() + 5000, // 5 seconds from now
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        expect(sessionConfig.isTokenValid()).toBe(true)

        // Fast-forward past expiry
        vi.advanceTimersByTime(6000)

        expect(sessionConfig.isTokenValid()).toBe(false)
      })

      it('returns false when no token exists', () => {
        expect(sessionConfig.isTokenValid()).toBe(false)
      })

      it('returns true when token is still valid', async () => {
        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() + 60000,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        await sessionConfig.fetchEphemeralToken()

        expect(sessionConfig.isTokenValid()).toBe(true)
      })
    })

    describe('getToken', () => {
      it('returns current token', async () => {
        const mockToken = 'test-token-789'

        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: mockToken },
            expires_at: Date.now() + 60000,
            menu_context: '**MENU**\nTest Menu'
          })
        })

        expect(sessionConfig.getToken()).toBeNull()

        await sessionConfig.fetchEphemeralToken()

        expect(sessionConfig.getToken()).toBe(mockToken)
      })

      it('returns null when no token fetched', () => {
        expect(sessionConfig.getToken()).toBeNull()
      })
    })
  })

  describe('Session Config Building', () => {
    describe('buildSessionConfig', () => {
      it('returns correct structure with all required fields', () => {
        const result = sessionConfig.buildSessionConfig()

        expect(result).toMatchObject({
          modalities: ['text', 'audio'],
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'gpt-4o-transcribe', // Changed from whisper-1 for better transcription
            language: 'en'
          },
          temperature: 0.6,
          max_response_output_tokens: 500
        })

        expect(result.instructions).toBeDefined()
        expect(typeof result.instructions).toBe('string')
      })

      it('includes tool_choice: auto when tools provided', () => {
        const result = sessionConfig.buildSessionConfig()

        expect(result.tool_choice).toBe('auto')
      })

      it('includes tools array with add/confirm/remove_from_order', () => {
        const result = sessionConfig.buildSessionConfig()

        expect(result.tools).toBeDefined()
        expect(result.tools).toHaveLength(3)

        const toolNames = result.tools!.map((t: any) => t.name)
        expect(toolNames).toContain('add_to_order')
        expect(toolNames).toContain('confirm_order')
        expect(toolNames).toContain('remove_from_order')
      })

      it('includes AI instructions', () => {
        const result = sessionConfig.buildSessionConfig()

        expect(result.instructions).toContain('CRITICAL SYSTEM DIRECTIVE')
        expect(result.instructions).toContain('SPEAK ONLY IN ENGLISH')
        expect(result.instructions).toContain('add_to_order')
      })

      it('includes menu context when available', async () => {
        const mockMenuContext = '**MENU**\nGreek Salad - $12.99'

        mockAuthService.getAuthToken.mockResolvedValue('auth-token')
        ;(global.fetch as any).mockResolvedValue({
          ok: true,
          json: async () => ({
            client_secret: { value: 'token' },
            expires_at: Date.now() + 60000,
            menu_context: mockMenuContext
          })
        })

        await sessionConfig.fetchEphemeralToken()

        const result = sessionConfig.buildSessionConfig()

        expect(result.instructions).toContain(mockMenuContext)
      })

      it('uses server VAD when enabled (or kiosk default)', () => {
        // Kiosk mode now enables VAD by default with higher threshold for noisy environments
        const vadConfig = new VoiceSessionConfig(
          { ...config, enableVAD: true },
          mockAuthService
        )

        const result = vadConfig.buildSessionConfig()

        expect(result.turn_detection).toEqual({
          type: 'server_vad',
          threshold: 0.6,                // Higher for noisy restaurant environment
          prefix_padding_ms: 400,        // Capture lead-in audio
          silence_duration_ms: 2000,     // 2s silence = end of speech (generous for complex orders)
          create_response: false
        })
      })

      it('uses manual PTT when VAD disabled AND context is server', () => {
        // Only server context without explicit VAD enables uses manual PTT
        // Kiosk mode now enables VAD by default
        const serverConfig = new VoiceSessionConfig(
          { ...config, context: 'server', enableVAD: false },
          mockAuthService
        )
        const result = serverConfig.buildSessionConfig()

        expect(result.turn_detection).toBeNull()
      })

      it('handles empty menu context', () => {
        const result = sessionConfig.buildSessionConfig()

        expect(result.instructions).toContain('Menu information is currently unavailable')
      })

      it('includes proper tool schemas', () => {
        const result = sessionConfig.buildSessionConfig()

        const addTool = result.tools!.find((t: any) => t.name === 'add_to_order')
        expect(addTool).toBeDefined()
        expect(addTool.parameters).toMatchObject({
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1, default: 1 },
                  modifications: { type: 'array', items: { type: 'string' } },
                  specialInstructions: { type: 'string' }
                },
                required: ['name', 'quantity']
              }
            }
          },
          required: ['items']
        })

        const confirmTool = result.tools!.find((t: any) => t.name === 'confirm_order')
        expect(confirmTool).toBeDefined()
        expect(confirmTool.parameters.properties.action.enum).toEqual(['checkout', 'review', 'cancel'])

        const removeTool = result.tools!.find((t: any) => t.name === 'remove_from_order')
        expect(removeTool).toBeDefined()
        expect(removeTool.parameters.properties.itemName).toMatchObject({ type: 'string' })
      })
    })
  })

  describe('Pure Function Behavior', () => {
    it('buildSessionConfig has no side effects', async () => {
      const mockMenuContext = '**MENU**\nItem 1\nItem 2'

      mockAuthService.getAuthToken.mockResolvedValue('auth-token')
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          client_secret: { value: 'token' },
          expires_at: Date.now() + 60000,
          menu_context: mockMenuContext
        })
      })

      await sessionConfig.fetchEphemeralToken()

      const menuContextBefore = sessionConfig.getMenuContext()
      const tokenBefore = sessionConfig.getToken()

      // Call buildSessionConfig
      sessionConfig.buildSessionConfig()

      // State should be unchanged
      expect(sessionConfig.getMenuContext()).toBe(menuContextBefore)
      expect(sessionConfig.getToken()).toBe(tokenBefore)
    })

    it('multiple calls with same input return same output', () => {
      const result1 = sessionConfig.buildSessionConfig()
      const result2 = sessionConfig.buildSessionConfig()

      // Deep equality check
      expect(result1).toEqual(result2)
      expect(result1.instructions).toBe(result2.instructions)
      expect(result1.tools).toEqual(result2.tools)
      expect(result1.turn_detection).toEqual(result2.turn_detection)
    })

    it('different VAD settings produce different outputs (server vs kiosk)', () => {
      // Server context (no VAD) vs kiosk context (VAD enabled by default)
      const serverConfig = new VoiceSessionConfig(
        { ...config, context: 'server', enableVAD: false },
        mockAuthService
      )
      const manualPTT = serverConfig.buildSessionConfig()

      // Kiosk has VAD enabled by default
      const kioskConfig = new VoiceSessionConfig(
        { ...config, context: 'kiosk' },
        mockAuthService
      )
      const serverVAD = kioskConfig.buildSessionConfig()

      expect(manualPTT.turn_detection).toBeNull()
      expect(serverVAD.turn_detection).not.toBeNull()
      expect(serverVAD.turn_detection.type).toBe('server_vad')
    })
  })

  describe('Debug Mode', () => {
    it('logs debug information when enabled', async () => {
      // Import logger to access the mock
      const { logger } = await import('@/services/logger')

      // Clear previous mock calls
      vi.mocked(logger.info).mockClear()

      const debugConfig = new VoiceSessionConfig(
        { ...config, debug: true },
        mockAuthService
      )

      mockAuthService.getAuthToken.mockResolvedValue('auth-token')
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          client_secret: { value: 'token' },
          expires_at: Date.now() + 60000,
          menu_context: '**MENU**\nLine 1\nLine 2'
        })
      })

      await debugConfig.fetchEphemeralToken()

      // Verify logger was called with debug information
      expect(logger.info).toHaveBeenCalled()

      // Check for specific log messages
      const logCalls = vi.mocked(logger.info).mock.calls
      const fetchingCall = logCalls.find(call =>
        call[0]?.includes('Fetching ephemeral token')
      )
      const expiresCall = logCalls.find(call =>
        call[0]?.includes('Got ephemeral token')
      )

      expect(fetchingCall).toBeDefined()
      expect(expiresCall).toBeDefined()
    })

    it('does not log when debug disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      mockAuthService.getAuthToken.mockResolvedValue('auth-token')
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          client_secret: { value: 'token' },
          expires_at: Date.now() + 60000,
          menu_context: '**MENU**\nTest Menu'
        })
      })

      await sessionConfig.fetchEphemeralToken()

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Configuration Options', () => {
    it('uses provided restaurantId in API headers', async () => {
      mockAuthService.getAuthToken.mockResolvedValue('auth-token')
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          client_secret: { value: 'token' },
          expires_at: Date.now() + 60000,
          menu_context: '**MENU**\nTest Menu'
        })
      })

      await sessionConfig.fetchEphemeralToken()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-restaurant-id': 'test-restaurant-123'
          })
        })
      )
    })

    it('handles missing VITE_API_BASE_URL with default', async () => {
      vi.unstubAllEnvs()

      mockAuthService.getAuthToken.mockResolvedValue('auth-token')
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          client_secret: { value: 'token' },
          expires_at: Date.now() + 60000,
          menu_context: '**MENU**\nTest Menu'
        })
      })

      await sessionConfig.fetchEphemeralToken()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/realtime/session',
        expect.any(Object)
      )
    })
  })
})
