import { env } from '@/utils/env'

export interface TranscriptionResult {
  success: boolean
  transcript: string
  error?: string
}

export class TranscriptionService {
  private apiBaseUrl: string

  constructor() {
    this.apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:3001'
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    try {
      // Create FormData for multipart upload
      const formData = new FormData()
      const audioFile = new File([audioBlob], 'audio.webm', { 
        type: audioBlob.type || 'audio/webm' 
      })
      formData.append('audio', audioFile)

      // Get auth token from localStorage (set by Supabase)
      const token = localStorage.getItem('supabase.auth.token')
      const authData = token ? JSON.parse(token) : null
      const accessToken = authData?.currentSession?.access_token

      if (!accessToken) {
        return {
          success: false,
          transcript: '',
          error: 'Authentication required. Please log in.'
        }
      }

      const response = await fetch(`${this.apiBaseUrl}/api/v1/ai/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle specific error cases
        if (response.status === 401) {
          return {
            success: false,
            transcript: '',
            error: 'Authentication failed. Please log in again.'
          }
        } else if (response.status === 429) {
          return {
            success: false,
            transcript: '',
            error: 'Rate limit exceeded. Please try again later.'
          }
        } else if (response.status === 400) {
          return {
            success: false,
            transcript: '',
            error: errorData.error || 'Invalid audio format. Please ensure you are recording in a supported format.'
          }
        }
        
        return {
          success: false,
          transcript: '',
          error: errorData.error || `Server error: ${response.status}`
        }
      }

      const data = await response.json()
      
      return {
        success: data.success || false,
        transcript: data.text || data.transcript || '',
        error: data.error
      }
    } catch (error) {
      console.error('Transcription error:', error)
      
      // Network errors
      if (error instanceof Error && error.message.includes('fetch')) {
        return {
          success: false,
          transcript: '',
          error: 'Network error. Please check your internet connection.'
        }
      }

      // Generic error
      return {
        success: false,
        transcript: '',
        error: error instanceof Error ? error.message : 'Transcription failed. Please try again.'
      }
    }
  }

  // Check if transcription is available (always true when backend is running)
  isAvailable(): boolean {
    return true
  }
}

// Singleton instance
export const transcriptionService = new TranscriptionService()