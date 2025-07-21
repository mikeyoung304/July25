import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { WebSocket } from 'ws';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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
  private openai: OpenAI;
  private connections: Map<string, ConnectionState>;
  private menuData: any = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    this.openai = new OpenAI({ apiKey });
    this.connections = new Map();
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
   * Stop recording and transcribe
   */
  async stopRecording(connectionId: string): Promise<TranscriptionResult> {
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

      // Save to temporary file for transcription
      const tempFile = path.join('/tmp', `audio-${randomUUID()}.webm`);
      await fs.writeFile(tempFile, audioBuffer);

      // Create a read stream for OpenAI
      const fileStream = createReadStream(tempFile);
      
      // Transcribe with OpenAI
      const transcription = await this.openai.audio.transcriptions.create({
        file: fileStream as any,
        model: 'whisper-1',
        language: 'en',
        prompt: this.getWhisperPrompt(),
        temperature: 0.2  // Lower temperature for more accurate transcription
      });

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      aiLogger.info(`Transcription completed: "${transcription.text}"`);
      aiLogger.debug(`Audio duration: ${duration / 1000}s, File size: ${audioBuffer.length} bytes`);

      return {
        success: true,
        text: transcription.text,
        duration: duration / 1000
      };
    } catch (error) {
      aiLogger.error('Transcription error:', error);
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
   * Generate Whisper prompt with menu context
   */
  private getWhisperPrompt(): string {
    // Common Grow Fresh menu items and phrases
    const menuItems = [
      // Bowls
      'soul bowl', 'summer vegan bowl', 'honey bowl', 'protein power bowl', 'greek bowl',
      // Salads
      'green goddess salad', 'moms chicken salad', 'chicken salad', 'caesar salad',
      // Entrees
      'mushroom pasta', 'honey mustard chicken', 'lemon pepper salmon',
      // Sides
      'fries', 'french fries', 'side salad', 'fruit cup', 'soup',
      // Drinks
      'coke', 'coca cola', 'sprite', 'water', 'lemonade', 'sweet tea', 'unsweet tea',
      // Common modifiers
      'no onions', 'no cheese', 'extra dressing', 'on the side', 'gluten free', 'vegan',
      // Common phrases
      'can I get', 'Id like', 'I want', 'give me', 'let me have', 'I\'ll take', 'I\'ll have'
    ];

    return `Restaurant order context. Common items: ${menuItems.join(', ')}. Customer is ordering food at Grow Fresh Local Food restaurant.`;
  }
}

// Lazy-loaded singleton instance
let aiServiceInstance: AIService | null = null;

export const getAIService = (): AIService => {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
    aiLogger.info('AIService initialized with API key:', {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + '...' // Log first 7 chars for debugging
    });
  }
  return aiServiceInstance;
};

// Export a getter for backwards compatibility
export const aiService = getAIService();