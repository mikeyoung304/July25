import { Wifi, WifiOff, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/utils'
import { useConnectionStatus } from '@/hooks/useConnectionStatus'
import { Button } from '@/components/ui/button'

export function ConnectionStatusBar() {
  const { connectionState, lastConnected, reconnectAttempts, isOnline } = useConnectionStatus()

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        text: 'No Internet Connection',
        className: 'bg-red-500 text-white',
        pulse: true
      }
    }

    switch (connectionState) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Live',
          className: 'bg-green-500 text-white',
          pulse: false
        }
      case 'connecting':
        return {
          icon: RefreshCw,
          text: reconnectAttempts > 1 ? `Reconnecting... (${reconnectAttempts})` : 'Connecting...',
          className: 'bg-yellow-500 text-white',
          pulse: true
        }
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Connection Error',
          className: 'bg-red-500 text-white',
          pulse: true
        }
      default:
        return {
          icon: WifiOff,
          text: 'Disconnected',
          className: 'bg-gray-500 text-white',
          pulse: false
        }
    }
  }

  const { icon: Icon, text, className, pulse } = getStatusConfig()

  const handleRetry = () => {
    window.location.reload()
  }

  // Always show status - important for KDS operators to see real-time connection
  // Green indicator for connected, red for problems - never hidden
  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg',
        'transition-all duration-300 text-sm font-medium',
        className,
        pulse && 'animate-pulse'
      )}
      role="status"
      aria-live="polite"
      aria-label={`WebSocket connection status: ${text}`}
    >
      <Icon className={cn(
        'w-4 h-4',
        connectionState === 'connecting' && 'animate-spin'
      )} />
      <span>{text}</span>
      
      {lastConnected && connectionState !== 'connected' && (
        <span className="text-xs opacity-75">
          Last: {lastConnected.toLocaleTimeString()}
        </span>
      )}

      {connectionState === 'error' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRetry}
          className="h-6 px-2 text-xs text-white hover:bg-white/20"
        >
          Retry
        </Button>
      )}
    </div>
  )
}