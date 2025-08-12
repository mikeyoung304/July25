/**
 * Transcriber interface for speech-to-text conversion
 */

export interface TranscriberOptions {
  language?: string;
  model?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
}

export interface Transcriber {
  transcribe(audioBuffer: Buffer, options?: TranscriberOptions): Promise<TranscriptionResult>;
}