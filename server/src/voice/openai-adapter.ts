import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { VoiceError } from '../../../shared/src/voice-types';

interface OpenAIRealtimeEvent {
  type: string;
  [key: string]: any;
}

interface TranscriptData {
  transcript: string;
  is_final: boolean;
  confidence?: number;
}

interface OrderData {
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
    modifiers?: string[];
  }>;
  total?: number;
  confidence: number;
}

interface AudioData {
  audio: string; // base64 encoded
}

export class OpenAIAdapter extends EventEmitter {
  private ws?: WebSocket;
  private sessionId: string;
  private restaurantId: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  private heartbeatInterval?: NodeJS.Timeout;
  private responseBuffer: string[] = [];

  constructor(sessionId: string, restaurantId: string) {
    super();
    this.sessionId = sessionId;
    this.restaurantId = restaurantId;
  }

  async connect(): Promise<void> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment');
    }

    // Model configurable via env with safe default
    const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';
    logger.info(`[voice] realtime model: ${model}`);
    
    const url = `wss://api.openai.com/v1/realtime?model=${model}`;
    
    try {
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      });

      await this.setupWebSocketHandlers();
      await this.waitForConnection();
      await this.initializeSession();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      logger.info(`OpenAI adapter connected for session: ${this.sessionId}`);
    } catch (error) {
      logger.error('Failed to connect to OpenAI:', error);
      throw error;
    }
  }

  private setupWebSocketHandlers(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not initialized'));
        return;
      }

      this.ws.on('open', () => {
        logger.debug('OpenAI WebSocket connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleOpenAIMessage(data);
      });

      this.ws.on('close', (code, reason) => {
        this.handleDisconnection(code, reason);
      });

      this.ws.on('error', (error) => {
        logger.error('OpenAI WebSocket error:', error);
        this.handleError({
          code: 'OPENAI_CONNECTION_FAILED',
          message: 'OpenAI WebSocket error',
          session_id: this.sessionId,
          details: error.message,
        });
        reject(error);
      });

      // Timeout for connection
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
      } else {
        this.ws?.once('open', resolve);
      }
    });
  }

  private async initializeSession(): Promise<void> {
    // Configure the session for restaurant voice ordering
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: `You are a helpful voice assistant for a restaurant named "Restaurant". 
                      Help customers place food orders. Listen for menu items, quantities, and modifications.
                      When you detect a complete order, respond with confirmation and ask if there's anything else.
                      Be friendly, efficient, and accurate.`,
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: [],
        tool_choice: 'auto',
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    this.sendToOpenAI(sessionConfig);

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  private handleOpenAIMessage(data: any): void {
    try {
      const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
      const event: OpenAIRealtimeEvent = JSON.parse(dataStr);
      
      switch (event.type) {
        case 'session.created':
          logger.debug('OpenAI session created');
          break;
          
        case 'session.updated':
          logger.debug('OpenAI session updated');
          break;

        case 'input_audio_buffer.speech_started':
          logger.debug('Speech detected');
          break;

        case 'input_audio_buffer.speech_stopped':
          logger.debug('Speech ended');
          break;

        case 'conversation.item.input_audio_transcription.completed':
          this.handleTranscript(event);
          break;

        case 'response.audio.delta':
          this.handleAudioDelta(event);
          break;

        case 'response.audio.done':
          this.flushAudioBuffer();
          break;

        case 'response.done':
          this.handleResponseComplete(event);
          break;

        case 'error':
          this.handleOpenAIError(event);
          break;

        default:
          logger.debug(`Unhandled OpenAI event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error parsing OpenAI message:', error);
    }
  }

  private handleTranscript(event: OpenAIRealtimeEvent): void {
    const transcript = event.transcript || '';
    const confidence = 0.9; // OpenAI doesn't provide confidence scores

    const transcriptData: TranscriptData = {
      transcript,
      is_final: true,
      confidence,
    };

    this.emit('transcript', transcriptData);

    // Try to detect order patterns
    this.detectOrder(transcript);
  }

  private handleAudioDelta(event: OpenAIRealtimeEvent): void {
    if (event.delta) {
      this.responseBuffer.push(event.delta);
    }
  }

  private flushAudioBuffer(): void {
    if (this.responseBuffer.length > 0) {
      const combinedAudio = this.responseBuffer.join('');
      this.responseBuffer = [];

      const audioData: AudioData = {
        audio: combinedAudio,
      };

      this.emit('audio', audioData);
    }
  }

  private handleResponseComplete(event: OpenAIRealtimeEvent): void {
    logger.debug('OpenAI response complete');
    // Could emit metrics or other completion events here
  }

  private handleOpenAIError(event: OpenAIRealtimeEvent): void {
    logger.error('OpenAI error event:', event);
    
    this.handleError({
      code: 'OPENAI_CONNECTION_FAILED',
      message: event.error?.message || 'OpenAI error',
      session_id: this.sessionId,
      details: event.error,
    });
  }

  private detectOrder(transcript: string): void {
    // Simple order detection logic - in production, this would be more sophisticated
    const orderKeywords = ['order', 'get', 'have', 'want', 'burger', 'pizza', 'drink', 'coffee'];
    const hasOrderKeywords = orderKeywords.some(keyword => 
      transcript.toLowerCase().includes(keyword)
    );

    if (hasOrderKeywords && transcript.length > 10) {
      // Mock order detection - in production, this would use NLP
      const mockOrder: OrderData = {
        items: [
          {
            name: 'Detected Item',
            quantity: 1,
            price: 12.99,
          }
        ],
        total: 12.99,
        confidence: 0.8,
      };

      this.emit('order', mockOrder);
    }
  }

  private handleDisconnection(code: number, reason: Buffer): void {
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    logger.warn(`OpenAI connection closed: ${code} - ${reason}`);

    // Attempt reconnection if not a clean close
    if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnect();
    }
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnectAttempts++;
    logger.info(`Attempting OpenAI reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts));

    try {
      await this.connect();
    } catch (error) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.handleError({
          code: 'OPENAI_CONNECTION_FAILED',
          message: 'Failed to reconnect to OpenAI after maximum attempts',
          session_id: this.sessionId,
        });
      }
    }
  }

  private handleError(error: VoiceError): void {
    this.emit('error', error);
  }

  private sendToOpenAI(event: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      logger.warn('Cannot send to OpenAI: connection not open');
    }
  }

  private sendHeartbeat(): void {
    // OpenAI Realtime API doesn't require explicit heartbeats
    // But we can send a ping to keep connection alive
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.ping();
    }
  }

  async sendAudio(audioData: string, sampleRate?: number): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to OpenAI');
    }
    
    // Assert 24kHz if sample rate provided
    if (sampleRate && sampleRate !== 24000) {
      logger.warn(`Audio sample rate mismatch: expected 24000Hz, got ${sampleRate}Hz`, {
        sessionId: this.sessionId
      });
      // Non-breaking: log and continue
      // In future, could resample here if needed
    }

    const audioEvent = {
      type: 'input_audio_buffer.append',
      audio: audioData,
    };

    this.sendToOpenAI(audioEvent);
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = undefined;
    }

    logger.info(`OpenAI adapter disconnected for session: ${this.sessionId}`);
  }

  // Metrics getters
  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}