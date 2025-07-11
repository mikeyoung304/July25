import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { WebSocket } from 'ws';
import { Readable } from 'stream';
import fs from 'fs/promises';
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
      
      if (audioBuffer.length === 0) {
        return { success: false, error: 'No audio data received' };
      }

      // Save to temporary file for transcription
      const tempFile = path.join('/tmp', `audio-${randomUUID()}.webm`);
      await fs.writeFile(tempFile, audioBuffer);

      // Transcribe with OpenAI
      const transcription = await this.openai.audio.transcriptions.create({
        file: await fs.readFile(tempFile),
        model: 'whisper-1',
        language: 'en'
      });

      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      aiLogger.info(`Transcription completed: "${transcription.text}"`);

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
  async parseOrder(text: string, restaurantId: string): Promise<any> {
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

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
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
}

// Singleton instance
export const aiService = new AIService();