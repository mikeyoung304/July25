import { renderHook, act } from '@testing-library/react'
import { useSoundNotifications } from './useSoundNotifications'
import { soundEffects, soundPresets } from '@/services/audio/soundEffects'

// Mock the sound effects service
jest.mock('@/services/audio/soundEffects', () => ({
  soundEffects: {
    init: jest.fn(),
    play: jest.fn(),
    setConfig: jest.fn(),
    getConfig: jest.fn(() => ({ enabled: true, volume: 0.5 })),
    toggle: jest.fn()
  },
  soundPresets: {
    newOrderChime: jest.fn(),
    orderReadyChime: jest.fn()
  }
}))

describe('useSoundNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize sound effects on mount', () => {
    renderHook(() => useSoundNotifications())
    
    expect(soundEffects.init).toHaveBeenCalled()
  })

  it('should play new order sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playNewOrderSound()
    })
    
    expect(soundPresets.newOrderChime).toHaveBeenCalled()
  })

  it('should play order ready sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playOrderReadySound()
    })
    
    expect(soundPresets.orderReadyChime).toHaveBeenCalled()
  })

  it('should play alert sound', async () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    await act(async () => {
      await result.current.playAlertSound()
    })
    
    expect(soundEffects.play).toHaveBeenCalledWith('alert')
  })

  it('should toggle sound', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    act(() => {
      result.current.toggleSound()
    })
    
    expect(soundEffects.toggle).toHaveBeenCalled()
  })

  it('should set volume', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    act(() => {
      result.current.setVolume(0.8)
    })
    
    expect(soundEffects.setConfig).toHaveBeenCalledWith({ volume: 0.8 })
  })

  it('should return sound enabled state', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    expect(result.current.soundEnabled).toBe(true)
  })

  it('should return current volume', () => {
    const { result } = renderHook(() => useSoundNotifications())
    
    expect(result.current.volume).toBe(0.5)
  })

  it('should handle initialization only once', () => {
    const { rerender } = renderHook(() => useSoundNotifications())
    
    rerender()
    rerender()
    
    expect(soundEffects.init).toHaveBeenCalledTimes(1)
  })
})