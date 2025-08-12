/**
 * Stub implementation of TTS for development/testing
 */

import { TTS, TTSOptions, TTSResult } from '../core/tts';

export class TTSStub implements TTS {
  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    // Stub implementation - returns empty audio buffer
    return {
      audioBuffer: Buffer.from('mock-audio-data'),
      mimeType: 'audio/mpeg',
      duration: 3.5
    };
  }
}