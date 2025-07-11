import { soundEffects, soundPresets } from './soundEffects'

// Mock AudioContext
const mockAudioContext = {
  createOscillator: jest.fn(),
  createGain: jest.fn(),
  destination: {},
  currentTime: 0
}

const mockOscillator = {
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: { value: 0 },
  type: 'sine' as OscillatorType
}

const mockGainNode = {
  connect: jest.fn(),
  gain: {
    value: 0,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn()
  }
}

describe('SoundEffectsService', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Setup AudioContext mock
    global.AudioContext = jest.fn(() => mockAudioContext) as unknown as typeof AudioContext
    mockAudioContext.createOscillator.mockReturnValue(mockOscillator)
    mockAudioContext.createGain.mockReturnValue(mockGainNode)
    
    // Initialize service
    soundEffects.init()
    soundEffects.setConfig({ enabled: true, volume: 0.5 })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('init', () => {
    it('should create AudioContext when available', () => {
      expect(global.AudioContext).toHaveBeenCalled()
    })
  })

  describe('play', () => {
    it('should play newOrder sound with correct frequency', async () => {
      await soundEffects.play('newOrder')
      
      expect(mockOscillator.frequency.value).toBe(880) // A5
      expect(mockOscillator.type).toBe('sine')
      expect(mockOscillator.start).toHaveBeenCalled()
      expect(mockOscillator.stop).toHaveBeenCalled()
    })

    it('should play orderReady sound with correct frequency', async () => {
      await soundEffects.play('orderReady')
      
      expect(mockOscillator.frequency.value).toBe(1318.51) // E6
      expect(mockOscillator.type).toBe('sine')
    })

    it('should play alert sound with square wave', async () => {
      await soundEffects.play('alert')
      
      expect(mockOscillator.frequency.value).toBe(440) // A4
      expect(mockOscillator.type).toBe('square')
    })

    it('should not play sound when disabled', async () => {
      soundEffects.setConfig({ enabled: false })
      
      await soundEffects.play('newOrder')
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })

    it('should apply volume settings', async () => {
      soundEffects.setConfig({ volume: 0.3 })
      
      // Verify volume was set
      expect(soundEffects.getConfig().volume).toBe(0.3)
      
      await soundEffects.play('success')
      
      // Verify oscillator was created (sound attempted to play)
      expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    })
  })

  describe('playSequence', () => {
    it('should play multiple notes in sequence', async () => {
      // Reset to ensure counting from 0
      jest.clearAllMocks()
      
      const notes = [
        { frequency: 440, duration: 0.1 },
        { frequency: 880, duration: 0.1 }
      ]
      
      await soundEffects.playSequence(notes)
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2)
    })

    it('should not play sequence when disabled', async () => {
      soundEffects.setConfig({ enabled: false })
      
      await soundEffects.playSequence([{ frequency: 440, duration: 0.1 }])
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled()
    })
  })

  describe('configuration', () => {
    it('should update configuration', () => {
      soundEffects.setConfig({ volume: 0.8, enabled: false })
      
      const config = soundEffects.getConfig()
      expect(config.volume).toBe(0.8)
      expect(config.enabled).toBe(false)
    })

    it('should toggle sound on/off', () => {
      const initialConfig = soundEffects.getConfig()
      const initialEnabled = initialConfig.enabled
      
      soundEffects.toggle()
      
      const newConfig = soundEffects.getConfig()
      expect(newConfig.enabled).toBe(!initialEnabled)
    })
  })

  describe('sound presets', () => {
    it('should play newOrderChime preset', async () => {
      await soundPresets.newOrderChime()
      
      // Should create 3 oscillators for the chime
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(3)
    })

    it('should play orderReadyChime preset', async () => {
      await soundPresets.orderReadyChime()
      
      // Should create 4 oscillators for the chime
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(4)
    })
  })

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Spy on console.error to suppress error output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('Audio not supported')
      })
      
      // Should not throw
      await expect(soundEffects.play('newOrder')).resolves.toBeUndefined()
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error))
      
      // Restore console.error
      consoleErrorSpy.mockRestore()
    })
  })
})