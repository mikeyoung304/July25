import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MicrophonePermission } from './MicrophonePermission'
import { RecordingIndicator } from './RecordingIndicator'
import { TranscriptionDisplay } from './TranscriptionDisplay'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { cn } from '@/lib/utils'

interface VoiceCaptureProps {
  className?: string
  onOrderComplete?: (transcription: string) => void
}

export const VoiceCapture: React.FC<VoiceCaptureProps> = ({ 
  className,
  onOrderComplete,
}) => {
  const [transcription, setTranscription] = useState('')
  const [isInterim, setIsInterim] = useState(false)
  
  const {
    isRecording,
    permissionStatus,
    startRecording,
    stopRecording,
  } = useAudioCapture({
    onTranscription: (text, interim) => {
      setTranscription(text)
      setIsInterim(interim)
      
      if (!interim && text) {
        onOrderComplete?.(text)
      }
    },
  })

  const handleButtonClick = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-6 p-8', className)}>
      <MicrophonePermission status={permissionStatus}>
        <div className="flex flex-col items-center gap-6 w-full">
          <Button
            size="lg"
            onClick={handleButtonClick}
            className="text-lg px-8 py-6"
            variant={isRecording ? 'destructive' : 'default'}
          >
            {isRecording ? 'Stop Recording' : 'Tap to Order'}
          </Button>
          
          <RecordingIndicator isRecording={isRecording} />
          
          <TranscriptionDisplay
            transcription={transcription}
            isInterim={isInterim}
            isProcessing={isRecording && !transcription}
          />
        </div>
      </MicrophonePermission>
    </div>
  )
}