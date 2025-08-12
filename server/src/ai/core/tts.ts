/**
 * Text-to-Speech interface
 */

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  mimeType: string;
  duration?: number;
}

export interface TTS {
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;
}