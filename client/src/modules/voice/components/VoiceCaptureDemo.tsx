import React from 'react'
import { VoiceCapture } from './VoiceCapture'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

export const VoiceCaptureDemo: React.FC = () => {
  const handleOrderComplete = (transcription: string) => {
    console.warn('Transcription received:', transcription)
    // Here you would normally parse the order and submit it
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-center">Voice Order Demo</h2>
      
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          To use voice transcription:
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Ensure VITE_OPENAI_API_KEY is set in your .env.local file</li>
            <li>Click the microphone button to start recording</li>
            <li>Speak your order clearly</li>
            <li>Click the button again to stop and transcribe</li>
          </ol>
        </AlertDescription>
      </Alert>
      
      <VoiceCapture onOrderComplete={handleOrderComplete} />
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Note: In production, transcription should be handled server-side to protect API keys.</p>
      </div>
    </div>
  )
}