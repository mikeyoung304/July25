/**
 * Text-to-Speech interface
 */

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResult {
  audio: Buffer;
  audioBuffer?: Buffer; // For backward compatibility
  mimeType: string;
  duration?: number;
}

export interface TTS {
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}