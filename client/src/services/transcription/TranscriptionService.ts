import OpenAI from 'openai'
import { env } from '@/utils/env'

export interface TranscriptionResult {
  success: boolean
  transcript: string
  error?: string
}

export class TranscriptionService {
  private openai: OpenAI | null = null

  constructor() {
    // Get API key from environment
    const apiKey = env.VITE_OPENAI_API_KEY
    
    if (apiKey) {
      // dangerouslyAllowBrowser: true is used here for demo purposes
      // In production, transcription should be handled server-side to protect API keys
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      })
    }
  }

  async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    if (!this.openai) {
      // Development mode: Return mock transcription
      if (env.DEV) {
        console.warn('OpenAI API key not configured. Using mock transcription for development.')
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Return mock transcriptions for testing
        const mockTranscriptions = [
          "I'd like a burger with extra cheese",
          "Two pizzas and a salad please",
          "One large pizza with no onions",
          "Can I get three burgers and two fries"
        ]
        const randomIndex = Math.floor(Math.random() * mockTranscriptions.length)
        
        return {
          success: true,
          transcript: mockTranscriptions[randomIndex]
        }
      }
      
      return {
        success: false,
        transcript: '',
        error: 'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.'
      }
    }

    try {
      // Convert blob to File object required by OpenAI API
      const audioFile = new File([audioBlob], 'audio.webm', { 
        type: audioBlob.type || 'audio/webm' 
      })

      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // Specify English for better accuracy
        response_format: 'text'
      })

      return {
        success: true,
        transcript: response
      }
    } catch (error) {
      console.error('Transcription error:', error)
      
      // Handle specific error cases
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401) {
          return {
            success: false,
            transcript: '',
            error: 'Invalid OpenAI API key. Please check your configuration.'
          }
        } else if (error.status === 429) {
          return {
            success: false,
            transcript: '',
            error: 'Rate limit exceeded. Please try again later.'
          }
        } else if (error.status === 400) {
          return {
            success: false,
            transcript: '',
            error: 'Invalid audio format. Please ensure you are recording in a supported format.'
          }
        }
      }

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

  // Check if transcription is available
  isAvailable(): boolean {
    return this.openai !== null
  }
}

// Singleton instance
export const transcriptionService = new TranscriptionService()