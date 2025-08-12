import OpenAI from 'openai';
import { Transcriber, TranscriberOptions, TranscriptionResult } from '../../core/transcriber';
import { bufferToTmpFile, withRetry } from './utils';
import { unlink } from 'fs/promises';
import { createReadStream } from 'fs';
import { logger } from '../../../utils/logger';

const transcriberLogger = logger.child({ service: 'OpenAITranscriber' });

export class OpenAITranscriber implements Transcriber {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for AI features');
    }
    
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(
    audioBuffer: Buffer, 
    options?: TranscriberOptions
  ): Promise<TranscriptionResult> {
    const requestId = `transcribe-${Date.now()}`;
    
    try {
      transcriberLogger.info('Starting transcription', {
        requestId,
        bufferSize: audioBuffer.length,
        language: options?.language
      });

      // Determine file extension from mime type or default to webm
      const mimeToExt: Record<string, string> = {
        'audio/webm': 'webm',
        'audio/wav': 'wav',
        'audio/mpeg': 'mp3',
        'audio/mp4': 'mp4',
        'audio/ogg': 'ogg',
      };
      
      const extension = mimeToExt[options?.model || 'audio/webm'] || 'webm';
      
      // Write to temporary file (OpenAI SDK requires file path or stream)
      const tmpPath = await bufferToTmpFile(audioBuffer, extension);
      
      try {
        const result = await withRetry(async () => {
          const fileStream = createReadStream(tmpPath);
          
          const transcriptionOptions: any = {
            file: fileStream,
            model: 'whisper-1',
            response_format: 'json'
          };
          
          if (options?.language) {
            transcriptionOptions.language = options.language;
          }
          
          const response = await this.client.audio.transcriptions.create(transcriptionOptions);

          return response;
        });

        transcriberLogger.info('Transcription completed', {
          requestId,
          textLength: result.text.length
        });

        return {
          text: result.text,
          language: options?.language || 'en'
        };
      } finally {
        // Clean up temp file
        try {
          await unlink(tmpPath);
        } catch (error) {
          transcriberLogger.warn('Failed to clean up temp file', { tmpPath, error });
        }
      }
    } catch (error) {
      transcriberLogger.error('Transcription failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Return degraded response
      return {
        text: '',
        language: options?.language || 'en'
      };
    }
  }
}