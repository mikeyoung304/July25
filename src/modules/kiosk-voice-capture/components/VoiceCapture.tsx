import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { submitAudioForTranscription } from '@/services/api'

export function VoiceCapture() {
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (isListening) {
      startRecording()
    }
  }, [isListening])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setIsListening(false)
        setIsLoading(true)
        
        try {
          const result = await submitAudioForTranscription(audioBlob)
          if (result.success) {
            setTranscript(result.transcript)
          }
        } catch (error) {
          console.error('Error submitting audio:', error)
        } finally {
          setIsLoading(false)
        }
        
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()

      // Simulate 3 seconds of recording
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }, 3000)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      setIsListening(false)
    }
  }

  const handleStartListening = () => {
    setIsListening(true)
    setTranscript(null)
  }

  if (transcript) {
    return <div>{transcript}</div>
  }

  if (isLoading) {
    return <div>Processing...</div>
  }

  return (
    <div>
      {!isListening ? (
        <Button size="lg" onClick={handleStartListening}>
          Tap to Order
        </Button>
      ) : (
        <div>Listening...</div>
      )}
    </div>
  )
}