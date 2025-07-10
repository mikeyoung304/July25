import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MicrophonePermission } from './MicrophonePermission'
import { RecordingIndicator } from './RecordingIndicator'
import { TranscriptionDisplay } from './TranscriptionDisplay'
import { useAudioCapture } from '../hooks/useAudioCapture'
import { cn } from '@/utils'

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  
  const {
    isRecording,
    permissionStatus,
    startRecording,
    stopRecording,
  } = useAudioCapture({
    onTranscription: (text, interim) => {
      setTranscription(text)
      setIsInterim(interim)
      setErrorMessage(null)
      
      if (!interim && text) {
        onOrderComplete?.(text)
      }
    },
    onError: (err) => {
      console.error('Voice capture error:', err)
      setErrorMessage(err.message)
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
          
          {errorMessage && (
            <div className="w-full max-w-md p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}
        </div>
      </MicrophonePermission>
    </div>
  )
}