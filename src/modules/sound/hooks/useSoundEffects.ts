import { useCallback, useRef } from 'react'
import { soundEffectsService } from '@/services/audio/soundEffects'

export interface UseSoundEffectsReturn {
  playNewOrder: () => void
  playStatusChange: () => void
  playAlert: () => void
  playSuccess: () => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

export const useSoundEffects = (): UseSoundEffectsReturn => {
  const serviceRef = useRef(soundEffectsService)
  
  const playNewOrder = useCallback(() => {
    serviceRef.current.play('newOrder')
  }, [])
  
  const playStatusChange = useCallback(() => {
    serviceRef.current.play('statusChange')
  }, [])
  
  const playAlert = useCallback(() => {
    serviceRef.current.play('alert')
  }, [])
  
  const playSuccess = useCallback(() => {
    serviceRef.current.play('success')
  }, [])
  
  const setVolume = useCallback((volume: number) => {
    serviceRef.current.setVolume(volume)
  }, [])
  
  const toggleMute = useCallback(() => {
    serviceRef.current.toggleMute()
  }, [])
  
  return {
    playNewOrder,
    playStatusChange,
    playAlert,
    playSuccess,
    setVolume,
    toggleMute
  }
}