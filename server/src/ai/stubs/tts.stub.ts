/**
 * Stub implementation of TTS for development/testing
 */

import { TTS, TTSOptions, TTSResult } from '../core/tts';

export class TTSStub implements TTS {
  async synthesize(_text: string, _options?: TTSOptions): Promise<TTSResult> {
    // Stub implementation - returns empty audio buffer
    const mockBuffer = Buffer.from('mock-audio-data');
    return {
      audio: mockBuffer,
      audioBuffer: mockBuffer, // For backward compatibility
      mimeType: 'audio/mpeg',
      duration: 3.5
    };
  }
}