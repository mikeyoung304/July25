import React from 'react'
import { Mic } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RecordingIndicatorProps {
  isRecording: boolean
  text?: string
  className?: string
}

export const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({
  isRecording,
  text = 'Listening...',
  className,
}) => {
  if (!isRecording) return null

  return (
    <div
      data-testid="recording-indicator"
      className={cn('flex items-center gap-3 text-lg font-medium animate-pulse', className)}
    >
      <div className="relative">
        <Mic className="h-6 w-6 text-red-500" />
        <div className="absolute inset-0 animate-ping">
          <Mic className="h-6 w-6 text-red-500 opacity-75" />
        </div>
      </div>
      <span>{text}</span>
    </div>
  )
}