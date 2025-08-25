import { useEffect, useCallback, useRef, useState } from 'react'
import { webSocketService } from '@/services/websocket'

interface AudioAlert {
  type: 'new_order' | 'urgent_order' | 'order_ready' | 'connection_lost' | 'connection_restored'
  volume: number
  enabled: boolean
}

interface UseAudioAlertsReturn {
  alerts: Record<string, AudioAlert>
  isEnabled: boolean
  toggleAlert: (type: keyof AudioAlert) => void
  setVolume: (type: keyof AudioAlert, volume: number) => void
  setGlobalEnabled: (enabled: boolean) => void
  testAlert: (type: keyof AudioAlert) => void
}

const DEFAULT_ALERTS: Record<string, AudioAlert> = {
  new_order: { type: 'new_order', volume: 0.7, enabled: true },
  urgent_order: { type: 'urgent_order', volume: 0.9, enabled: true },
  order_ready: { type: 'order_ready', volume: 0.5, enabled: false },
  connection_lost: { type: 'connection_lost', volume: 0.8, enabled: true },
  connection_restored: { type: 'connection_restored', volume: 0.6, enabled: true }
}

// Audio generation functions for different alert types
const generateBeep = (frequency: number, duration: number, volume: number): AudioBuffer => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  const sampleRate = audioContext.sampleRate
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate)
  const data = buffer.getChannelData(0)

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate
    data[i] = Math.sin(2 * Math.PI * frequency * t) * volume * Math.exp(-t * 2) // Fade out
  }

  return buffer
}

const playAudioBuffer = async (buffer: AudioBuffer) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start()
  } catch (error) {
    console.warn('Failed to play audio alert:', error)
  }
}

export const useAudioAlerts = (): UseAudioAlertsReturn => {
  const [alerts, setAlerts] = useState<Record<string, AudioAlert>>(() => {
    const saved = localStorage.getItem('kitchen_audio_alerts')
    if (saved) {
      try {
        return { ...DEFAULT_ALERTS, ...JSON.parse(saved) }
      } catch {
        return DEFAULT_ALERTS
      }
    }
    return DEFAULT_ALERTS
  })

  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem('kitchen_audio_enabled')
    return saved ? JSON.parse(saved) : true
  })

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBuffersRef = useRef<Record<string, AudioBuffer>>({})

  // Initialize audio context and buffers
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContextClass()

        // Pre-generate audio buffers for different alert types
        audioBuffersRef.current = {
          new_order: generateBeep(800, 0.3, 0.5), // Pleasant ding
          urgent_order: generateBeep(1000, 0.5, 0.8), // Urgent beep
          order_ready: generateBeep(600, 0.2, 0.3), // Soft notification
          connection_lost: generateBeep(400, 0.8, 0.6), // Low warning tone
          connection_restored: generateBeep(800, 0.4, 0.4) // Positive reconnect sound
        }
      } catch (error) {
        console.warn('Failed to initialize audio context:', error)
      }
    }

    initializeAudio()

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('kitchen_audio_alerts', JSON.stringify(alerts))
  }, [alerts])

  useEffect(() => {
    localStorage.setItem('kitchen_audio_enabled', JSON.stringify(isEnabled))
  }, [isEnabled])

  // Play alert sound
  const playAlert = useCallback(async (alertType: string) => {
    if (!isEnabled || !alerts[alertType]?.enabled) return

    const audioBuffer = audioBuffersRef.current[alertType]
    if (!audioBuffer) return

    try {
      // Create a new buffer with the desired volume
      const volumeAdjustedBuffer = generateBeep(
        alertType === 'new_order' ? 800 :
        alertType === 'urgent_order' ? 1000 :
        alertType === 'order_ready' ? 600 :
        alertType === 'connection_lost' ? 400 : 800,
        alertType === 'urgent_order' ? 0.5 :
        alertType === 'connection_lost' ? 0.8 : 0.3,
        alerts[alertType].volume
      )

      await playAudioBuffer(volumeAdjustedBuffer)
    } catch (error) {
      console.warn(`Failed to play ${alertType} alert:`, error)
    }
  }, [isEnabled, alerts])

  // Set up WebSocket event listeners for alerts
  useEffect(() => {
    const unsubscribeNewOrder = webSocketService.subscribe('order:created', () => {
      playAlert('new_order')
    })

    const unsubscribeOrderUpdate = webSocketService.subscribe('order:updated', (payload: any) => {
      const order = payload?.order || payload
      if (order) {
        // Check if order became urgent (over 15 minutes old)
        const age = (Date.now() - new Date(order.created_at).getTime()) / 60000
        if (age >= 15 && !['completed', 'cancelled'].includes(order.status)) {
          playAlert('urgent_order')
        }
        
        // Alert when order becomes ready
        if (order.status === 'ready') {
          playAlert('order_ready')
        }
      }
    })

    const handleConnectionChange = (state: string) => {
      if (state === 'disconnected' || state === 'error') {
        playAlert('connection_lost')
      } else if (state === 'connected') {
        playAlert('connection_restored')
      }
    }
    
    webSocketService.on('connectionStateChange', handleConnectionChange)

    return () => {
      unsubscribeNewOrder()
      unsubscribeOrderUpdate()
      webSocketService.off('connectionStateChange', handleConnectionChange)
    }
  }, [playAlert])

  // Control functions
  const toggleAlert = useCallback((type: keyof AudioAlert) => {
    setAlerts(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled
      }
    }))
  }, [])

  const setVolume = useCallback((type: keyof AudioAlert, volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume))
    setAlerts(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        volume: clampedVolume
      }
    }))
  }, [])

  const setGlobalEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled)
  }, [])

  const testAlert = useCallback((type: keyof AudioAlert) => {
    playAlert(type as string)
  }, [playAlert])

  return {
    alerts,
    isEnabled,
    toggleAlert,
    setVolume,
    setGlobalEnabled,
    testAlert
  }
}