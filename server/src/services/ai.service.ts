import { logger } from '../utils/logger';
import { WebSocket } from 'ws';
import { ai, checkAIHealth } from '../ai';
import { MenuService } from './menu.service';

const aiLogger = logger.child({ service: 'AIService' });

interface ConnectionState {
  isRecording: boolean;
  startTime: number | null;
  audioBuffer: Buffer[];
}

interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  duration?: number;
}

export class AIService {
  private connections: Map<string, ConnectionState>;
  private menuData: any = null;

  constructor() {
    this.connections = new Map();
    aiLogger.info('AIService using OpenAI-powered AI operations');
  }

  /**
   * Handle WebSocket connection for voice streaming
   */
  handleVoiceConnection(ws: WebSocket, connectionId: string) {
    this.connections.set(connectionId, {
      isRecording: false,
      startTime: null,
      audioBuffer: []
    });

    aiLogger.info(`Voice client connected: ${connectionId}`);

    ws.send(JSON.stringify({
      type: 'connected',
      connectionId,
      message: 'Voice stream ready'
    }));

    ws.on('close', () => {
      this.connections.delete(connectionId);
      aiLogger.info(`Voice client disconnected: ${connectionId}`);
    });
  }

  /**
   * Process audio data from WebSocket
   */
  async processAudioStream(connectionId: string, data: Buffer): Promise<void> {
    const state = this.connections.get(connectionId);
    if (!state || !state.isRecording) return;

    state.audioBuffer.push(data);
    const totalBytes = state.audioBuffer.reduce((acc, buf) => acc + buf.length, 0);
    aiLogger.debug(`Audio chunk received: ${data.length} bytes, total buffered: ${totalBytes} bytes`);
  }

  /**
   * Start recording for a connection
   */
  startRecording(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (!state) return;

    state.isRecording = true;
    state.startTime = Date.now();
    state.audioBuffer = [];
    
    aiLogger.info(`Recording started: ${connectionId}`);
  }

  /**
   * Stop recording and transcribe using OpenAI
   */
  async stopRecording(connectionId: string, restaurantId: string = 'default'): Promise<TranscriptionResult> {
    const state = this.connections.get(connectionId);
    if (!state || !state.isRecording) {
      return { success: false, error: 'Not recording' };
    }

    state.isRecording = false;
    const duration = state.startTime ? Date.now() - state.startTime : 0;

    try {
      // Combine audio chunks
      const audioBuffer = Buffer.concat(state.audioBuffer);
      aiLogger.info(`Stopping recording: ${state.audioBuffer.length} chunks, ${audioBuffer.length} total bytes`);
      
      if (audioBuffer.length === 0) {
        aiLogger.warn('No audio data received during recording');
        return { success: false, error: 'No audio data received' };
      }

      // Transcribe using OpenAI
      const transcriptionResult = await ai.transcriber.transcribe(audioBuffer, {
        model: 'audio/webm'
      });

      aiLogger.info(`OpenAI transcription completed: "${transcriptionResult.text}"`);
      aiLogger.debug(`Audio duration: ${duration / 1000}s, File size: ${audioBuffer.length} bytes`);

      return {
        success: true,
        text: transcriptionResult.text,
        duration: duration / 1000
      };
    } catch (error) {
      aiLogger.error('OpenAI transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }

  /**
   * Parse order from transcribed text using OpenAI
   */
  async parseOrder(text: string, restaurantId: string): Promise<any> {
    try {
      const orderData = await ai.orderNLP.parse({ restaurantId, text });
      
      aiLogger.info('Order parsed via OpenAI:', orderData);
      
      return {
        success: true,
        ...orderData
      };
    } catch (error) {
      aiLogger.error('OpenAI order parsing error:', error);
      
      // Check if it's a 422 error with suggestions
      if ((error as any).status === 422) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Could not parse order',
          suggestions: (error as any).suggestions
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Order parsing failed',
        message: `Failed to parse: "${text}"`
      };
    }
  }

  /**
   * Update menu data for order parsing
   */
  updateMenu(menuData: any): void {
    this.menuData = menuData;
    aiLogger.info(`Menu updated: ${menuData.menu?.length || 0} items`);
  }

  /**
   * Get menu data
   */
  getMenu(): any {
    return this.menuData;
  }

  /**
   * Transcribe audio file using OpenAI (with metadata)
   * This method is used for the /transcribe-with-metadata endpoint
   */
  async transcribeAudioFile(audioBuffer: Buffer, mimeType: string, restaurantId: string = 'default'): Promise<TranscriptionResult> {
    try {
      const transcriptionResult = await ai.transcriber.transcribe(audioBuffer, {
        model: mimeType
      });

      aiLogger.info(`OpenAI file transcription completed: "${transcriptionResult.text}"`);

      return {
        success: true,
        text: transcriptionResult.text,
        duration: 0 // Duration not available from file upload
      };
    } catch (error) {
      aiLogger.error('OpenAI file transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }

  /**
   * Process voice audio and return MP3 response
   * This method transcribes audio, generates a chat response, then converts to speech
   */
  async processVoiceAudio(audioBuffer: Buffer, mimeType: string, restaurantId: string = 'default'): Promise<Buffer> {
    try {
      // Step 1: Transcribe the audio
      const transcriptionResult = await ai.transcriber.transcribe(audioBuffer, {
        model: mimeType
      });

      if (!transcriptionResult.text) {
        throw new Error('No transcription available');
      }

      // Step 2: Generate chat response
      const chatResponse = await ai.chat.respond([
        { role: 'user', content: transcriptionResult.text }
      ], {
        context: { restaurantId }
      });

      // Step 3: Convert response to speech
      const ttsResult = await ai.tts.synthesize(chatResponse.message, {
        voice: 'nova'
      });

      aiLogger.info('OpenAI voice processing completed', {
        restaurantId,
        transcript: transcriptionResult.text.substring(0, 50) + '...',
        responseLength: chatResponse.message.length,
        audioSize: ttsResult.audio.length
      });

      return ttsResult.audio;
    } catch (error) {
      aiLogger.error('OpenAI voice processing error:', error);
      throw error;
    }
  }

  /**
   * Load menu from local database for AI processing
   */
  async syncMenuFromBuildPanel(restaurantId: string): Promise<void> {
    try {
      // Load menu from our local database
      const fullMenu = await MenuService.getFullMenu(restaurantId);
      
      // Transform to format expected by AI processing
      this.menuData = {
        restaurantId: restaurantId,
        menu: fullMenu.items,
        categories: fullMenu.categories
      };
      
      aiLogger.info(`Menu loaded from local database for restaurant ${restaurantId}`, {
        itemCount: fullMenu.items.length,
        categoryCount: fullMenu.categories.length
      });
    } catch (error) {
      aiLogger.error('Failed to load menu from database:', error);
      throw error;
    }
  }

  /**
   * Process chat message using OpenAI
   */
  async chat(message: string, restaurantId: string = 'default', userId?: string): Promise<string> {
    try {
      const response = await ai.chat.respond([
        { role: 'user', content: message }
      ], {
        context: { restaurantId, userId }
      });

      return response.message;
    } catch (error) {
      aiLogger.error('OpenAI chat error:', error);
      throw error;
    }
  }
}

// Lazy-loaded singleton instance
let aiServiceInstance: AIService | null = null;

export const getAIService = (): AIService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
    aiLogger.info('AIService initialized with OpenAI adapters');
  }
  return aiServiceInstance;
};

// Export a getter for backwards compatibility
export const aiService = getAIService();