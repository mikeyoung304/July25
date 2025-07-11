export interface TranscriptionResult {
  success: boolean
  transcript: string
  error?: string
}

export class TranscriptionService {
  async transcribeAudio(): Promise<TranscriptionResult> {
    return {
      success: true,
      transcript: 'Mock transcription result'
    }
  }

  isAvailable(): boolean {
    return true
  }
}

export const transcriptionService = new TranscriptionService()