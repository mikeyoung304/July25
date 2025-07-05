import { useState, useCallback, useRef, useEffect } from 'react'
import { MicrophonePermissionStatus } from '../components/MicrophonePermission'

interface UseAudioCaptureOptions {
  onTranscription?: (transcription: string, isInterim: boolean) => void
  onError?: (error: Error) => void
}

interface UseAudioCaptureReturn {
  isRecording: boolean
  permissionStatus: MicrophonePermissionStatus
  startRecording: () => Promise<void>
  stopRecording: () => void
  error: Error | null
}

export const useAudioCapture = ({
  onTranscription,
  onError,
}: UseAudioCaptureOptions = {}): UseAudioCaptureReturn => {
  const [isRecording, setIsRecording] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<MicrophonePermissionStatus>('checking')
  const [error, setError] = useState<Error | null>(null)
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Check if browser supports getUserMedia
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionStatus('not-found')
      setError(new Error('getUserMedia is not supported in this browser'))
    } else {
      setPermissionStatus('granted') // Default to granted, will check on first use
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setPermissionStatus('checking')
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      setPermissionStatus('granted')
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      // Handle audio data
      const audioChunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        // Here we would normally send to speech-to-text service
        // For now, simulate with mock transcription
        setTimeout(() => {
          onTranscription?.('Mock transcription result', false)
        }, 1000)
      }
      
      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      
    } catch (err) {
      const error = err as Error
      
      if (error.message.includes('Permission denied') || error.name === 'NotAllowedError') {
        setPermissionStatus('denied')
      } else if (error.name === 'NotFoundError') {
        setPermissionStatus('not-found')
      }
      
      setError(error)
      onError?.(error)
    }
  }, [onTranscription, onError])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    
    setIsRecording(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  return {
    isRecording,
    permissionStatus,
    startRecording,
    stopRecording,
    error,
  }
}