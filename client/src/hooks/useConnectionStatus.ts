import { useState, useEffect } from 'react'
import { webSocketService } from '@/services/websocket'

export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'error'

interface UseConnectionStatusReturn {
  connectionState: ConnectionState
  lastConnected: Date | null
  reconnectAttempts: number
  isOnline: boolean
}

export const useConnectionStatus = (): UseConnectionStatusReturn => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [lastConnected, setLastConnected] = useState<Date | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handleConnectionChange = (state: ConnectionState) => {
      setConnectionState(state)
      
      if (state === 'connected') {
        setLastConnected(new Date())
        setReconnectAttempts(0)
      } else if (state === 'connecting') {
        setReconnectAttempts(prev => prev + 1)
      }
    }

    const unsubscribe = webSocketService.on('connectionStateChange', handleConnectionChange)
    
    // Get initial state from service
    const currentState = webSocketService.isConnected() ? 'connected' : 'disconnected'
    setConnectionState(currentState)

    return unsubscribe
  }, [])

  return {
    connectionState,
    lastConnected,
    reconnectAttempts,
    isOnline
  }
}