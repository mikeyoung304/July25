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

        // The OpenAI SDK returns a Response object
        // Convert it to Buffer using arrayBuffer()
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      ttsLogger.error('TTS synthesis failed', {
        requestId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // STOP HIDING ERRORS - Throw them so we can see what's wrong
      throw new Error(`OpenAI TTS failed: ${errorMessage}`);
    }
  }
}