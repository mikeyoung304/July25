/**
 * Stub implementation of Transcriber for development/testing
 */

import { Transcriber, TranscriberOptions, TranscriptionResult } from '../core/transcriber';

export class TranscriberStub implements Transcriber {
  async transcribe(_audioBuffer: Buffer, options?: TranscriberOptions): Promise<TranscriptionResult> {
    // Stub implementation - returns mock data
    return {
      text: "I'd like to order a large pepperoni pizza",
      confidence: 0.95,
      language: options?.language || 'en-US'
    };
  }
}