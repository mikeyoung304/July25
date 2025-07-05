import { useEffect, useCallback, useState } from 'react'
import { soundEffects, soundPresets } from '@/services/audio/soundEffects'

export interface UseSoundNotificationsReturn {
  playNewOrderSound: () => Promise<void>
  playOrderReadySound: () => Promise<void>
  playAlertSound: () => Promise<void>
  toggleSound: () => void
  setVolume: (volume: number) => void
  soundEnabled: boolean
  volume: number
}

/**
 * Hook for managing sound notifications in the KDS
 * Provides methods to play sounds and control audio settings
 */
export const useSoundNotifications = (): UseSoundNotificationsReturn => {
  const [soundEnabled, setSoundEnabled] = useState(() => soundEffects.getConfig().enabled)
  const [volume, setVolumeState] = useState(() => soundEffects.getConfig().volume)

  // Initialize sound effects on mount
  useEffect(() => {
    soundEffects.init()
  }, [])

  // Play new order notification
  const playNewOrderSound = useCallback(async () => {
    await soundPresets.newOrderChime()
  }, [])

  // Play order ready notification
  const playOrderReadySound = useCallback(async () => {
    await soundPresets.orderReadyChime()
  }, [])

  // Play alert sound
  const playAlertSound = useCallback(async () => {
    await soundEffects.play('alert')
  }, [])

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    soundEffects.toggle()
    setSoundEnabled(!soundEnabled)
  }, [soundEnabled])

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    soundEffects.setConfig({ volume: clampedVolume })
    setVolumeState(clampedVolume)
  }, [])

  return {
    playNewOrderSound,
    playOrderReadySound,
    playAlertSound,
    toggleSound,
    setVolume,
    soundEnabled,
    volume
  }
}