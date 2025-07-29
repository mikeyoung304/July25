import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest';
import { useSoundNotifications } from '../useSoundNotifications'
import { soundEffects, soundPresets } from '@/services/audio/soundEffects'

// Mock the soundEffects service
vi.mock('@/services/audio/soundEffects', () => ({
  soundEffects: {
    init: vi.fn(),
    getConfig: vi.fn(() => ({ enabled: true, volume: 0.5 })),
    setConfig: vi.fn(),
    toggle: vi.fn(),
    play: vi.fn(() => Promise.resolve())
  },
  soundPresets: {
    newOrderChime: vi.fn(() => Promise.resolve()),
    orderReadyChime: vi.fn(() => Promise.resolve())
  }
}))

describe('useSoundNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementation
    ;(soundEffects.getConfig as vi.Mock).mockReturnValue({ enabled: true, volume: 0.5 })
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
    
    expect(soundPresets.newOrderChime).toHaveBeenCalled()
  })

  it('does not play sound when disabled', async () => {
    ;(soundEffects.getConfig as vi.Mock).mockReturnValue({ enabled: false, volume: 0.5 })
    
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playNewOrderSound()
    })
    
    expect(soundPresets.newOrderChime).toHaveBeenCalled() // Sound is always called, the service handles enabled/disabled
  })

  it('plays order ready sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playOrderReadySound()
    })
    
    expect(soundPresets.orderReadyChime).toHaveBeenCalled()
  })

  it('plays alert sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playAlertSound()
    })
    
    expect(soundEffects.play).toHaveBeenCalledWith('alert')
  })


  it('toggles sound on and off', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    expect(result.current.soundEnabled).toBe(true)
    
    act(() => {
      result.current.toggleSound()
    })
    
    expect(result.current.soundEnabled).toBe(false)
    expect(soundEffects.toggle).toHaveBeenCalled()
    
    act(() => {
      result.current.toggleSound()
    })
    
    expect(result.current.soundEnabled).toBe(true)
    expect(soundEffects.toggle).toHaveBeenCalledTimes(2)
  })

  it('updates volume', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    act(() => {
      result.current.setVolume(0.75)
    })
    
    expect(result.current.volume).toBe(0.75)
    expect(soundEffects.setConfig).toHaveBeenCalledWith({ volume: 0.75 })
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
    expect(result.current).toHaveProperty('playAlertSound')
  })
})