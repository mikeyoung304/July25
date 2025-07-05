import React from 'react'
import { AlertCircle, Mic, MicOff, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export type MicrophonePermissionStatus = 'checking' | 'granted' | 'denied' | 'not-found'

interface MicrophonePermissionProps {
  status: MicrophonePermissionStatus
  errorMessage?: string
  children: React.ReactNode
}

const statusMessages: Record<MicrophonePermissionStatus, { icon: React.ElementType; message: string }> = {
  checking: {
    icon: Loader2,
    message: 'Checking microphone...',
  },
  denied: {
    icon: MicOff,
    message: 'Microphone access denied. Please allow microphone access to use voice ordering.',
  },
  'not-found': {
    icon: AlertCircle,
    message: 'No microphone found. Please connect a microphone to use voice ordering.',
  },
  granted: {
    icon: Mic,
    message: '',
  },
}

export const MicrophonePermission: React.FC<MicrophonePermissionProps> = ({
  status,
  errorMessage,
  children,
}) => {
  if (status === 'granted') {
    return <>{children}</>
  }

  const { icon: Icon, message: defaultMessage } = statusMessages[status]
  const displayMessage = errorMessage || defaultMessage

  return (
    <Alert variant={status === 'checking' ? 'default' : 'destructive'}>
      <Icon className={status === 'checking' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      <AlertDescription>{displayMessage}</AlertDescription>
    </Alert>
  )
}