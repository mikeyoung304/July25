import { logger } from '../utils/logger';
import { WebSocket } from 'ws';
import { getBuildPanelService } from './buildpanel.service';
import { AuthenticatedRequest } from '../middleware/auth';

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
  private buildPanel = getBuildPanelService();
  private connections: Map<string, ConnectionState>;
  private menuData: any = null;
  private useBuildPanel: boolean;

  constructor() {
    this.connections = new Map();
    this.useBuildPanel = process.env.USE_BUILDPANEL === 'true';
    
    if (this.useBuildPanel) {
      aiLogger.info('AIService using BuildPanel for all AI operations');
    } else {
      aiLogger.warn('BuildPanel integration disabled - AI features will not work');
    }
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
   * Stop recording and transcribe using BuildPanel
   */
  async stopRecording(connectionId: string, restaurantId: string = 'default'): Promise<TranscriptionResult> {
    const state = this.connections.get(connectionId);
    if (!state || !state.isRecording) {
      return { success: false, error: 'Not recording' };
    }

    state.isRecording = false;
    const duration = state.startTime ? Date.now() - state.startTime : 0;

    if (!this.useBuildPanel) {
      return { 
        success: false, 
        error: 'BuildPanel integration is disabled. Enable USE_BUILDPANEL in environment.' 
      };
    }

    try {
      // Combine audio chunks
      const audioBuffer = Buffer.concat(state.audioBuffer);
      aiLogger.info(`Stopping recording: ${state.audioBuffer.length} chunks, ${audioBuffer.length} total bytes`);
      
      if (audioBuffer.length === 0) {
        aiLogger.warn('No audio data received during recording');
        return { success: false, error: 'No audio data received' };
      }

      // Send to BuildPanel for processing
      const response = await this.buildPanel.processVoice(
        audioBuffer,
        'audio/webm',
        restaurantId
      );

      aiLogger.info(`BuildPanel transcription completed: "${response.transcription}"`);
      aiLogger.debug(`Audio duration: ${duration / 1000}s, File size: ${audioBuffer.length} bytes`);

      return {
        success: true,
        text: response.transcription,
        duration: duration / 1000
      };
    } catch (error) {
      aiLogger.error('BuildPanel transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }

  /**
   * Parse order from transcribed text
   */
  async parseOrder(text: string, _restaurantId: string): Promise<any> {
    if (!this.menuData) {
      throw new Error('Menu not loaded');
    }

    try {
      const prompt = `You are an AI order parser for ${this.menuData.restaurant}.
      
Menu Items:
${JSON.stringify(this.menuData.menu, null, 2)}

Customer said: "${text}"

Parse this into an order. Return a JSON object with:
{
  "success": true/false,
  "items": [
    {
      "name": "exact menu item name",
      "quantity": number,
      "modifiers": ["any mentioned modifiers"]
    }
  ],
  "specialInstructions": "any special requests",
  "confidence": 0.0-1.0
}

If you cannot identify valid menu items, return success: false with an error message.`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
      
      aiLogger.info('Order parsed:', result);
      return result;
    } catch (error) {
      aiLogger.error('Order parsing error:', error);
      throw error;
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
   * Transcribe audio file using BuildPanel
   */
  async transcribeAudioFile(audioBuffer: Buffer, mimeType: string, restaurantId: string = 'default'): Promise<TranscriptionResult> {
    if (!this.useBuildPanel) {
      return { 
        success: false, 
        error: 'BuildPanel integration is disabled' 
      };
    }

    try {
      // Send to BuildPanel for transcription
      const response = await this.buildPanel.processVoice(
        audioBuffer,
        mimeType || 'audio/webm',
        restaurantId
      );

      aiLogger.info(`BuildPanel file transcription completed: "${response.transcription}"`);

      return {
        success: true,
        text: response.transcription,
        duration: 0 // Duration not available from file upload
      };
    } catch (error) {
      aiLogger.error('BuildPanel file transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }

  /**
   * Sync menu from BuildPanel
   */
  async syncMenuFromBuildPanel(restaurantId: string): Promise<void> {
    if (!this.useBuildPanel) {
      aiLogger.warn('Cannot sync menu - BuildPanel integration is disabled');
      return;
    }

    try {
      const menu = await this.buildPanel.getMenu(restaurantId);
      this.menuData = {
        restaurant: restaurantId,
        menu: menu
      };
      aiLogger.info(`Menu synced from BuildPanel for restaurant ${restaurantId}`);
    } catch (error) {
      aiLogger.error('Failed to sync menu from BuildPanel:', error);
      throw error;
    }
  }

  /**
   * Process chat message using BuildPanel
   */
  async chat(message: string, restaurantId: string = 'default', userId?: string): Promise<string> {
    if (!this.useBuildPanel) {
      throw new Error('BuildPanel integration is disabled');
    }

    try {
      const response = await this.buildPanel.processChat(
        message,
        restaurantId,
        userId
      );

      return response.message || 'I apologize, but I could not generate a response.';
    } catch (error) {
      aiLogger.error('BuildPanel chat error:', error);
      throw error;
    }
  }
}

// Lazy-loaded singleton instance
let aiServiceInstance: AIService | null = null;

export const getAIService = (): AIService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
    const useBuildPanel = process.env.USE_BUILDPANEL === 'true';
    aiLogger.info('AIService initialized:', {
      useBuildPanel,
      buildPanelUrl: process.env.BUILDPANEL_URL || 'http://localhost:3003'
    });
  }
  return aiServiceInstance;
};

// Export a getter for backwards compatibility
export const aiService = getAIService();