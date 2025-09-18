import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { 
  ClientEventSchema, 
  ServerEvent, 
  SessionState, 
  VoiceMetrics,
  VoiceError 
} from '@rebuild/shared/src/voice-types';
import { OpenAIAdapter } from './openai-adapter';

interface VoiceSession {
  id: string;
  restaurantId: string;
  ws: WebSocket;
  openaiAdapter?: OpenAIAdapter;
  state: SessionState;
  metrics: VoiceMetrics;
  heartbeatInterval?: NodeJS.Timeout;
  lastActivity: number;
}

export class VoiceWebSocketServer {
  private sessions = new Map<string, VoiceSession>();
  private heartbeatInterval = 30000; // 30 seconds
  private sessionTimeout = 300000; // 5 minutes

  constructor() {
    // Cleanup inactive sessions every minute
    setInterval(() => this.cleanupInactiveSessions(), 60000);
  }

  handleConnection(ws: WebSocket, request: any) {
    logger.info('[VoiceWebSocket] New connection received', {
      url: request.url,
      headers: request.headers,
      origin: request.headers?.origin
    });
    
    // Set up connection handlers
    ws.on('message', (data) => {
      logger.debug('[VoiceWebSocket] Message received, size:', Buffer.byteLength(data));
      this.handleMessage(ws, data);
    });
    ws.on('close', (code, reason) => this.handleClose(ws, code, reason));
    ws.on('error', (error) => this.handleError(ws, error));
    ws.on('pong', () => this.handlePong(ws));

    // Send initial heartbeat
    this.sendHeartbeat(ws);
  }

  private async handleMessage(ws: WebSocket, data: any) {
    try {
      const dataStr = Buffer.isBuffer(data) ? data.toString() : String(data);
      const message = JSON.parse(dataStr);
      
      logger.info('[VoiceWebSocket] Parsed message:', {
        type: message.type,
        hasData: !!message.data,
        timestamp: message.timestamp
      });
      
      const event = ClientEventSchema.parse(message);

      const session = this.getSessionByWebSocket(ws);
      
      if (session) {
        logger.debug('[VoiceWebSocket] Session found, processing event:', event.type);
        session.lastActivity = Date.now();
        await this.processEvent(session, event);
      } else if (event.type === 'session.start') {
        logger.info('[VoiceWebSocket] Starting new session');
        await this.startSession(ws, event);
      } else {
        logger.warn('[VoiceWebSocket] No session found, rejecting message');
        this.sendError(ws, {
          code: 'SESSION_NOT_FOUND',
          message: 'Session not found. Send session.start first.',
        });
      }
    } catch (error) {
      logger.error('[VoiceWebSocket] Error handling message:', error, 'Raw data:', data?.toString?.());
      this.sendError(ws, {
        code: 'UNKNOWN_ERROR',
        message: 'Invalid message format',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async startSession(ws: WebSocket, event: any) {
    const sessionId = uuidv4();
    const { restaurant_id, loopback = false } = event.session_config;

    const session: VoiceSession = {
      id: sessionId,
      restaurantId: restaurant_id,
      ws,
      state: {
        session_id: sessionId,
        restaurant_id,
        state: 'idle',
        created_at: Date.now(),
        last_activity: Date.now(),
        total_audio_duration: 0,
        transcript_count: 0,
      },
      metrics: {
        session_id: sessionId,
        error_count: 0,
        reconnect_count: 0,
      },
      lastActivity: Date.now(),
    };

    // Create OpenAI adapter if not in loopback mode
    if (!loopback) {
      try {
        session.openaiAdapter = new OpenAIAdapter(sessionId, restaurant_id);
        session.openaiAdapter.on('transcript', (data) => {
          this.sendEvent(session, {
            type: 'transcript',
            event_id: uuidv4(),
            timestamp: Date.now(),
            transcript: data.transcript,
            is_final: data.is_final,
            confidence: data.confidence,
          });
        });

        session.openaiAdapter.on('order', (data) => {
          this.sendEvent(session, {
            type: 'order.detected',
            event_id: uuidv4(),
            timestamp: Date.now(),
            order: data,
          });
        });

        session.openaiAdapter.on('audio', (data) => {
          this.sendEvent(session, {
            type: 'audio',
            event_id: uuidv4(),
            timestamp: Date.now(),
            audio: data.audio,
          });
        });

        session.openaiAdapter.on('error', (error) => {
          session.metrics.error_count++;
          this.sendError(ws, error);
        });

        await session.openaiAdapter.connect();
      } catch (error) {
        logger.error('Failed to create OpenAI adapter:', error);
        this.sendError(ws, {
          code: 'OPENAI_CONNECTION_FAILED',
          message: 'Failed to connect to OpenAI service',
          session_id: sessionId,
        });
        return;
      }
    }

    this.sessions.set(sessionId, session);
    
    // Start heartbeat
    session.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat(ws, sessionId);
    }, this.heartbeatInterval);

    // Send session started event
    this.sendEvent(session, {
      type: 'session.started',
      event_id: uuidv4(),
      timestamp: Date.now(),
      session_id: sessionId,
    });

    logger.info(`Voice session started: ${sessionId} for restaurant: ${restaurant_id}`);
  }

  private async processEvent(session: VoiceSession, event: any) {
    switch (event.type) {
      case 'audio':
        await this.processAudio(session, event);
        break;
      case 'session.stop':
        await this.stopSession(session.id);
        break;
      case 'heartbeat':
        // Update last activity - heartbeat handled automatically
        break;
      default:
        logger.warn(`Unknown event type: ${event.type}`);
    }
  }

  private async processAudio(session: VoiceSession, event: any) {
    // Handle both formats: event.audio (direct) or event.data.chunk (from client)
    const audioData = event.audio || event.data?.chunk;
    
    if (!audioData) {
      logger.error('[VoiceWebSocket] No audio data in event:', event);
      this.sendError(session.ws, {
        code: 'INVALID_AUDIO_FORMAT',
        message: 'No audio data found in message',
        session_id: session.id,
      });
      return;
    }
    
    // Log audio processing (sample to avoid spam)
    if (Math.random() < 0.01) {
      logger.debug('[VoiceWebSocket] Processing audio chunk:', {
        sessionId: session.id,
        audioSize: audioData.length,
        hasVoice: event.data?.hasVoice
      });
    }
    
    session.state.state = 'processing';
    session.state.total_audio_duration += 25; // 25ms chunks from client

    if (session.openaiAdapter) {
      // Forward to OpenAI
      try {
        await session.openaiAdapter.sendAudio(audioData, 24000); // PCM16 24kHz from client pipeline
      } catch (error) {
        session.metrics.error_count++;
        logger.error('[VoiceWebSocket] Error sending audio to OpenAI:', error);
        this.sendError(session.ws, {
          code: 'AUDIO_PROCESSING_FAILED',
          message: 'Failed to process audio',
          session_id: session.id,
        });
      }
    } else {
      // Loopback mode - echo back the audio
      this.sendEvent(session, {
        type: 'audio',
        event_id: uuidv4(),
        timestamp: Date.now(),
        audio: audioData, // Echo back the same audio
      });

      // Mock transcript for testing
      this.sendEvent(session, {
        type: 'transcript',
        event_id: uuidv4(),
        timestamp: Date.now(),
        transcript: 'Loopback test audio received',
        is_final: true,
        confidence: 1.0,
      });
    }

    session.state.state = 'idle';
  }

  private async stopSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.heartbeatInterval) {
      clearInterval(session.heartbeatInterval);
    }

    if (session.openaiAdapter) {
      await session.openaiAdapter.disconnect();
    }

    this.sessions.delete(sessionId);
    logger.info(`Voice session stopped: ${sessionId}`);
  }

  private handleClose(ws: WebSocket, code: number, reason: Buffer) {
    const session = this.getSessionByWebSocket(ws);
    if (session) {
      logger.info(`Voice session closed: ${session.id}, code: ${code}, reason: ${reason}`);
      this.stopSession(session.id);
    }
  }

  private handleError(ws: WebSocket, error: Error) {
    const session = this.getSessionByWebSocket(ws);
    logger.error('Voice WebSocket error:', error);
    
    if (session) {
      session.metrics.error_count++;
      this.sendError(ws, {
        code: 'UNKNOWN_ERROR',
        message: 'WebSocket error occurred',
        session_id: session.id,
        details: error.message,
      });
    }
  }

  private handlePong(ws: WebSocket) {
    const session = this.getSessionByWebSocket(ws);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  private sendEvent(session: VoiceSession, event: ServerEvent) {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(event));
    }
  }

  private sendError(ws: WebSocket, error: VoiceError) {
    if (ws.readyState === WebSocket.OPEN) {
      const errorEvent = {
        type: 'error',
        event_id: uuidv4(),
        timestamp: Date.now(),
        error,
      };
      ws.send(JSON.stringify(errorEvent));
    }
  }

  private sendHeartbeat(ws: WebSocket, sessionId?: string) {
    if (ws.readyState === WebSocket.OPEN) {
      const heartbeat = {
        type: 'heartbeat',
        event_id: uuidv4(),
        timestamp: Date.now(),
        session_id: sessionId || 'pending',
      };
      ws.send(JSON.stringify(heartbeat));
      ws.ping();
    }
  }

  private getSessionByWebSocket(ws: WebSocket): VoiceSession | undefined {
    let foundSession: VoiceSession | undefined;
    this.sessions.forEach(session => {
      if (session.ws === ws) {
        foundSession = session;
      }
    });
    return foundSession;
  }

  private cleanupInactiveSessions() {
    const now = Date.now();
    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.sessionTimeout) {
        logger.info(`Cleaning up inactive voice session: ${sessionId}`);
        this.stopSession(sessionId);
      }
    });
  }

  // Public methods for metrics
  getActiveSessions(): number {
    return this.sessions.size;
  }

  getSessionMetrics(sessionId: string): VoiceMetrics | undefined {
    const session = this.sessions.get(sessionId);
    return session?.metrics;
  }

  getAllMetrics(): VoiceMetrics[] {
    const metrics: VoiceMetrics[] = [];
    this.sessions.forEach(session => {
      metrics.push(session.metrics);
    });
    return metrics;
  }
}