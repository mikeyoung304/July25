import { renderHook, act } from '@testing-library/react'
import { useSoundNotifications } from '../useSoundNotifications'
import { soundEffects } from '@/services/audio/soundEffects'

// Mock the soundEffects service
jest.mock('@/services/audio/soundEffects', () => ({
  soundEffects: {
    init: jest.fn(),
    getConfig: jest.fn(() => ({ enabled: true, volume: 0.5 })),
    setEnabled: jest.fn(),
    setVolume: jest.fn(),
    playSequence: jest.fn(() => Promise.resolve()),
    playChord: jest.fn(() => Promise.resolve()),
    testSound: jest.fn(() => Promise.resolve())
  },
  soundPresets: {
    newOrderChime: jest.fn(() => Promise.resolve()),
    orderReadyChime: jest.fn(() => Promise.resolve()),
    attentionAlert: jest.fn(() => Promise.resolve()),
    successChime: jest.fn(() => Promise.resolve()),
    warningBeep: jest.fn(() => Promise.resolve())
  }
}))

describe('useSoundNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementation
    ;(soundEffects.getConfig as jest.Mock).mockReturnValue({ enabled: true, volume: 0.5 })
  })

  it('initializes with sound effects config', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    expect(result.current.soundEnabled).toBe(true)
    expect(result.current.volume).toBe(0.5)
    expect(soundEffects.getConfig).toHaveBeenCalled()
  })

  it('plays new order sound when enabled', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playNewOrderSound()
    })
    
    expect(soundEffects.playSequence).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ frequency: expect.any(Number) })
      ])
    )
  })

  it('does not play sound when disabled', async () => {
    ;(soundEffects.getConfig as jest.Mock).mockReturnValue({ enabled: false, volume: 0.5 })
    
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playNewOrderSound()
    })
    
    expect(soundEffects.playSequence).not.toHaveBeenCalled()
  })

  it('plays order ready sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playOrderReadySound()
    })
    
    expect(soundEffects.playChord).toHaveBeenCalledWith(
      expect.arrayContaining([523.25, 659.25, 783.99]),
      0.5
    )
  })

  it('plays attention sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playAttentionSound()
    })
    
    expect(soundEffects.playSequence).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ frequency: 880, duration: 200 }),
        expect.objectContaining({ frequency: 880, duration: 200 })
      ])
    )
  })

  it('plays success sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playSuccessSound()
    })
    
    expect(soundEffects.playSequence).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ frequency: 523.25 }),
        expect.objectContaining({ frequency: 659.25 }),
        expect.objectContaining({ frequency: 783.99 })
      ])
    )
  })

  it('plays error sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playErrorSound()
    })
    
    expect(soundEffects.playSequence).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ frequency: 300, duration: 300 })
      ])
    )
  })

  it('toggles sound on and off', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    expect(result.current.soundEnabled).toBe(true)
    
    act(() => {
      result.current.toggleSound()
    })
    
    expect(result.current.soundEnabled).toBe(false)
    expect(soundEffects.setEnabled).toHaveBeenCalledWith(false)
    
    act(() => {
      result.current.toggleSound()
    })
    
    expect(result.current.soundEnabled).toBe(true)
    expect(soundEffects.setEnabled).toHaveBeenCalledWith(true)
  })

  it('updates volume', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    act(() => {
      result.current.setVolume(0.75)
    })
    
    expect(result.current.volume).toBe(0.75)
    expect(soundEffects.setVolume).toHaveBeenCalledWith(0.75)
  })

  it('tests sound playback', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.testSound()
    })
    
    expect(soundEffects.testSound).toHaveBeenCalled()
  })

  it('handles sound playback errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation()
    ;(soundEffects.playSequence as jest.Mock).mockRejectedValueOnce(new Error('Audio error'))
    
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playNewOrderSound()
    })
    
    expect(consoleError).toHaveBeenCalledWith('Failed to play sound:', expect.any(Error))
    
    consoleError.mockRestore()
  })

  it('persists sound settings across re-renders', () => {
    const { result, rerender } = renderHook(() => useSoundNotifications())
    
    act(() => {
      result.current.setVolume(0.8)
      result.current.toggleSound()
    })
    
    expect(result.current.volume).toBe(0.8)
    expect(result.current.soundEnabled).toBe(false)
    
    rerender()
    
    // Settings should persist
    expect(result.current.volume).toBe(0.8)
    expect(result.current.soundEnabled).toBe(false)
  })

  it('provides all expected methods and properties', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    expect(result.current).toHaveProperty('soundEnabled')
    expect(result.current).toHaveProperty('volume')
    expect(result.current).toHaveProperty('toggleSound')
    expect(result.current).toHaveProperty('setVolume')
    expect(result.current).toHaveProperty('playNewOrderSound')
    expect(result.current).toHaveProperty('playOrderReadySound')
    expect(result.current).toHaveProperty('playAttentionSound')
    expect(result.current).toHaveProperty('playSuccessSound')
    expect(result.current).toHaveProperty('playErrorSound')
    expect(result.current).toHaveProperty('testSound')
  })
})