/**
 * Mock Transcription Service
 * Placeholder for voice transcription functionality
 */

export interface TranscriptionResult {
  text: string
  confidence: number
}

export const transcriptionService = {
   
  async transcribe(_audioBlob: Blob): Promise<TranscriptionResult> {
    // Mock implementation
    return {
      text: 'Mock transcription result',
      confidence: 0.95
    }
  }
}