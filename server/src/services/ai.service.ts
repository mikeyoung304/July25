import { logger } from '../utils/logger';
import { WebSocket } from 'ws';
import { getBuildPanelService } from './buildpanel.service';
// import { AuthenticatedRequest } from '../middleware/auth'; // Currently unused
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

      // Send to BuildPanel for processing with metadata
      await this.buildPanel.processVoiceWithMetadata(
        audioBuffer,
        'audio/webm',
        restaurantId
      );

      aiLogger.info(`BuildPanel transcription completed`);
      aiLogger.debug(`Audio duration: ${duration / 1000}s, File size: ${audioBuffer.length} bytes`);

      return {
        success: true,
        text: 'Voice processed successfully', // BuildPanel returns audio, not transcription
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
   * Parse order from transcribed text using BuildPanel
   */
  async parseOrder(text: string, restaurantId: string): Promise<any> {
    if (!this.useBuildPanel) {
      throw new Error('BuildPanel integration is disabled - cannot parse orders');
    }

    try {
      // Use BuildPanel's chat endpoint with order parsing prompt
      const orderParsingPrompt = `Parse the following customer order and return a structured response with menu items, quantities, and any special instructions: "${text}"`;
      
      const response = await this.buildPanel.processChat(
        orderParsingPrompt,
        restaurantId
      );

      aiLogger.info('Order parsed via BuildPanel:', response);
      
      // BuildPanel should return structured order data
      if (response.orderData) {
        return {
          success: true,
          ...response.orderData
        };
      }
      
      // Fallback if no structured data
      return {
        success: false,
        error: 'Could not parse order from text',
        message: response.message
      };
    } catch (error) {
      aiLogger.error('BuildPanel order parsing error:', error);
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
   * Transcribe audio file using BuildPanel (with metadata)
   * This method is used for the /transcribe-with-metadata endpoint
   */
  async transcribeAudioFile(audioBuffer: Buffer, mimeType: string, restaurantId: string = 'default'): Promise<TranscriptionResult> {
    if (!this.useBuildPanel) {
      return { 
        success: false, 
        error: 'BuildPanel integration is disabled' 
      };
    }

    try {
      // Use processVoiceWithMetadata to get transcription data
      const response = await this.buildPanel.processVoiceWithMetadata(
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
   * Process voice audio and return MP3 response
   * This method is used for the main /transcribe endpoint
   */
  async processVoiceAudio(audioBuffer: Buffer, mimeType: string, restaurantId: string = 'default'): Promise<Buffer> {
    if (!this.useBuildPanel) {
      throw new Error('BuildPanel integration is disabled');
    }

    try {
      // Get MP3 audio response from BuildPanel
      const audioResponse = await this.buildPanel.processVoice(
        audioBuffer,
        mimeType || 'audio/webm',
        restaurantId
      );

      aiLogger.info('BuildPanel voice processing completed', {
        restaurantId,
        responseSize: audioResponse.length
      });

      return audioResponse;
    } catch (error) {
      aiLogger.error('BuildPanel voice processing error:', error);
      throw error;
    }
  }

  /**
   * Sync menu from local database instead of BuildPanel
   * BuildPanel will receive menu data as context with chat/voice requests
   */
  async syncMenuFromBuildPanel(restaurantId: string): Promise<void> {
    if (!this.useBuildPanel) {
      aiLogger.warn('Cannot sync menu - BuildPanel integration is disabled');
      return;
    }

    try {
      // Load menu from our local database instead of BuildPanel
      const fullMenu = await MenuService.getFullMenu(restaurantId);
      
      // Transform to format expected by AI processing
      this.menuData = {
        restaurant: restaurantId,
        menu: fullMenu.items,
        categories: fullMenu.categories
      };
      
      // Set menu context in BuildPanel service for chat/voice requests
      this.buildPanel.setMenuContext(this.menuData);
      
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