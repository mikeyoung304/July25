import OpenAI from 'openai';
import { TTS, TTSOptions, TTSResult } from '../../core/tts';
import { withRetry } from './utils';
import { logger } from '../../../utils/logger';

const ttsLogger = logger.child({ service: 'OpenAITTS' });

export class OpenAITextToSpeech implements TTS {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for AI features');
    }
    
    this.client = new OpenAI({ apiKey });
  }

  async synthesize(text: string, options?: TTSOptions): Promise<TTSResult> {
    const requestId = `tts-${Date.now()}`;
    
    try {
      ttsLogger.info('Starting TTS synthesis', {
        requestId,
        textLength: text.length,
        voice: options?.voice
      });

      const result = await withRetry(async () => {
        const response = await this.client.audio.speech.create({
          model: 'tts-1',
          voice: (options?.voice as any) || 'nova', // nova, alloy, echo, fable, onyx, shimmer
          input: text,
          response_format: 'mp3'
        });

        // Convert response to Buffer
        const chunks: Uint8Array[] = [];
        const reader = response.body?.getReader();
        
        if (!reader) {
          throw new Error('No response body from OpenAI TTS');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        // Combine all chunks into a single buffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }

        return Buffer.from(buffer);
      });

      ttsLogger.info('TTS synthesis completed', {
        requestId,
        audioSize: result.length
      });

      return {
        audio: result,
        audioBuffer: result, // For backward compatibility
        mimeType: 'audio/mpeg'
      };
    } catch (error) {
      ttsLogger.error('TTS synthesis failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return empty audio as degraded response
      return {
        audio: Buffer.alloc(0),
        audioBuffer: Buffer.alloc(0), // For backward compatibility
        mimeType: 'audio/mpeg'
      };
    }
  }
}