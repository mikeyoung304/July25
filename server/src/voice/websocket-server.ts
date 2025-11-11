import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import {
  ClientEventSchema,
  ServerEvent,
  SessionState,
  VoiceMetrics,
  VoiceError
} from '../../../shared/src/voice-types';
import { OpenAIAdapter } from './openai-adapter';
import { verifyWebSocketAuth } from '../middleware/auth';
import { supabase } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// Extend WebSocket type to store authenticated restaurant ID
interface AuthenticatedWebSocket extends WebSocket {
  authenticatedRestaurantId?: string;
  authenticatedUserId?: string;
}

interface VoiceSession {
  id: string;
  restaurantId: string;
  ws: AuthenticatedWebSocket;
  openaiAdapter?: OpenAIAdapter;
  state: SessionState;
  metrics: VoiceMetrics;
  heartbeatInterval?: NodeJS.Timeout;
  lastActivity: number;
}

interface SecurityViolation {
  type: string;
  userId: string;
  authenticatedRestaurant: string;
  attemptedRestaurant: string;
  sessionId?: string | undefined;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class VoiceWebSocketServer {
  private sessions = new Map<string, VoiceSession>();
  private heartbeatInterval = 30000; // 30 seconds
  private sessionTimeout = 300000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;
  private securityLogPath = '/var/log/grow/security_violations.log';

  constructor() {
    // Cleanup inactive sessions every minute
    this.cleanupInterval = setInterval(() => this.cleanupInactiveSessions(), 60000);

    // Ensure security log directory exists (fallback logging)
    this.ensureSecurityLogDirectory();
  }

  /**
   * CRITICAL SECURITY: Log multi-tenancy violations to database with file fallback
   * Phase 2B: P0.9 Auth Stabilization - Multi-tenancy isolation
   */
  private async logSecurityViolation(violation: SecurityViolation): Promise<void> {
    const timestamp = new Date().toISOString();
    const logEntry = {
      ...violation,
      timestamp,
      severity: 'CRITICAL' as const,
    };

    // Primary: Try database logging
    try {
      const { error } = await supabase.from('security_audit_logs').insert({
        event_type: violation.type,
        user_id: violation.userId,
        authenticated_restaurant_id: violation.authenticatedRestaurant,
        attempted_restaurant_id: violation.attemptedRestaurant,
        session_id: violation.sessionId,
        ip_address: violation.ipAddress,
        user_agent: violation.userAgent,
        severity: 'CRITICAL',
        created_at: timestamp,
      });

      if (error) {
        logger.error('Failed to write security violation to database', { error, violation });
        // Fall through to file logging
      } else {
        logger.info('Security violation logged to database', { violation });
        return;
      }
    } catch (error) {
      logger.error('Exception writing security violation to database', { error, violation });
      // Fall through to file logging
    }

    // Fallback: File logging if database fails
    try {
      await fs.promises.appendFile(
        this.securityLogPath,
        JSON.stringify(logEntry) + '\n'
      );
      logger.info('Security violation logged to file (DB unavailable)', { violation });
    } catch (fileError) {
      logger.error('CRITICAL: Failed to log security violation to both DB and file', {
        violation,
        fileError,
      });
    }
  }

  /**
   * Ensure security log directory exists for fallback logging
   */
  private ensureSecurityLogDirectory(): void {
    try {
      const logDir = path.dirname(this.securityLogPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        logger.info('Created security log directory', { path: logDir });
      }
    } catch (error) {
      logger.warn('Failed to create security log directory, using /tmp fallback', { error });
      this.securityLogPath = '/tmp/grow_security_violations.log';
    }
  }

  /**
   * CRITICAL SECURITY: Validate restaurant isolation
   * Ensures authenticated restaurant matches requested restaurant
   * Phase 2B: P0.9 Auth Stabilization - Multi-tenancy isolation
   */
  private validateRestaurantIsolation(
    ws: AuthenticatedWebSocket,
    requestedRestaurantId: string | undefined,
    operation: string,
    sessionId?: string
  ): boolean {
    // Normalize restaurant IDs to lowercase for comparison (edge case: case sensitivity)
    const authenticatedRestaurantId = ws.authenticatedRestaurantId?.toLowerCase();
    const normalizedRequestedId = requestedRestaurantId?.toLowerCase();

    // STRICT PERIMETER CONTROL: Reject if no restaurant ID in session
    if (!normalizedRequestedId) {
      logger.error('🚨 SECURITY VIOLATION: No restaurant ID in session config', {
        operation,
        sessionId,
        userId: ws.authenticatedUserId,
        timestamp: new Date().toISOString(),
      });

      this.logSecurityViolation({
        type: 'missing_restaurant_id',
        userId: ws.authenticatedUserId || 'unknown',
        authenticatedRestaurant: authenticatedRestaurantId || 'none',
        attemptedRestaurant: 'missing',
        sessionId,
      });

      ws.send(JSON.stringify({
        type: 'error',
        event_id: uuidv4(),
        timestamp: Date.now(),
        error: {
          code: 'MULTI_TENANCY_VIOLATION',
          message: 'Access denied: Restaurant context required',
        },
      }));

      ws.close(1008, 'Security policy violation: missing restaurant context');
      return false;
    }

    // CRITICAL: Validate restaurant isolation - authenticated must match requested
    if (normalizedRequestedId !== authenticatedRestaurantId) {
      logger.error('🚨 SECURITY VIOLATION: Cross-restaurant access attempt', {
        operation,
        authenticated: authenticatedRestaurantId,
        requested: normalizedRequestedId,
        userId: ws.authenticatedUserId,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      this.logSecurityViolation({
        type: 'cross_restaurant_access',
        userId: ws.authenticatedUserId || 'unknown',
        authenticatedRestaurant: authenticatedRestaurantId || 'none',
        attemptedRestaurant: normalizedRequestedId,
        sessionId,
      });

      // Don't leak information about other restaurants in error message
      ws.send(JSON.stringify({
        type: 'error',
        event_id: uuidv4(),
        timestamp: Date.now(),
        error: {
          code: 'MULTI_TENANCY_VIOLATION',
          message: 'Access denied: Restaurant context mismatch',
        },
      }));

      ws.close(1008, 'Security policy violation: cross-restaurant access');
      return false;
    }

    return true;
  }

  async handleConnection(ws: WebSocket, request: any) {
    logger.info('[VoiceWebSocket] New connection received', {
      url: request.url,
      headers: request.headers,
      origin: request.headers?.origin
    });

    // Cast to AuthenticatedWebSocket to store auth context
    const authWs = ws as AuthenticatedWebSocket;

    // Authenticate WebSocket connection
    // In production, authentication is REQUIRED for voice connections
    try {
      const auth = await verifyWebSocketAuth(request);
      if (!auth) {
        logger.warn('[VoiceWebSocket] Authentication failed - rejecting connection');
        ws.close(1008, 'Authentication required');
        return;
      }

      // CRITICAL SECURITY: Validate restaurant context in JWT
      // Phase 2B: P0.9 Auth Stabilization - Multi-tenancy isolation
      if (!auth.restaurantId) {
        logger.error('🚨 SECURITY VIOLATION: JWT missing restaurant_id - rejecting connection', {
          userId: auth.userId,
          timestamp: new Date().toISOString(),
        });
        ws.close(1008, 'Authentication failed: missing restaurant context');
        return;
      }

      // Store authenticated restaurant ID with connection for validation
      authWs.authenticatedRestaurantId = auth.restaurantId.toLowerCase();
      authWs.authenticatedUserId = auth.userId;

      logger.info('[VoiceWebSocket] Connection authenticated', {
        userId: auth.userId,
        restaurantId: auth.restaurantId
      });
    } catch (error) {
      logger.error('[VoiceWebSocket] Authentication error:', error);
      ws.close(1008, 'Authentication failed');
      return;
    }

    // Set up connection handlers
    ws.on('message', (data) => {
      logger.debug('[VoiceWebSocket] Message received, size:', Buffer.byteLength(data as Buffer));
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
    const authWs = ws as AuthenticatedWebSocket;
    const { restaurant_id, loopback = false } = event.session_config;

    // CRITICAL SECURITY: Validate restaurant isolation before creating session
    // Phase 2B: P0.9 Auth Stabilization - Multi-tenancy isolation
    if (!this.validateRestaurantIsolation(authWs, restaurant_id, 'session.start', sessionId)) {
      // validateRestaurantIsolation already logged and closed connection
      return;
    }

    const session: VoiceSession = {
      id: sessionId,
      restaurantId: restaurant_id,
      ws: authWs,
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
    // CRITICAL SECURITY: Validate restaurant isolation before processing audio
    // Phase 2B: P0.9 Auth Stabilization - Multi-tenancy isolation
    const authWs = session.ws as AuthenticatedWebSocket;
    if (!this.validateRestaurantIsolation(authWs, session.restaurantId, 'audio.process', session.id)) {
      // validateRestaurantIsolation already logged and closed connection
      return;
    }

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
      // Clean up the session on error to prevent leaks
      this.stopSession(session.id);
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
    const authWs = ws as AuthenticatedWebSocket;
    let foundSession: VoiceSession | undefined;

    this.sessions.forEach(session => {
      if (session.ws === ws) {
        // CRITICAL SECURITY: Defense-in-depth validation
        // Verify session restaurant matches authenticated restaurant
        // This should never fail if earlier validations worked, but provides extra safety
        const sessionRestaurantId = session.restaurantId?.toLowerCase();
        const authRestaurantId = authWs.authenticatedRestaurantId?.toLowerCase();

        if (sessionRestaurantId !== authRestaurantId) {
          logger.error('🚨 SECURITY ALERT: Session restaurant mismatch in getSessionByWebSocket', {
            sessionRestaurant: sessionRestaurantId,
            authenticatedRestaurant: authRestaurantId,
            sessionId: session.id,
            userId: authWs.authenticatedUserId,
          });
          // Don't return this session - it's a security violation
          return;
        }

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

  /**
   * Shutdown the voice server and clean up all resources
   * CRITICAL: Must be called during server shutdown to prevent memory leaks
   */
  shutdown(): void {
    logger.info('[VoiceWebSocket] Shutting down voice server...');

    // Stop the cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('[VoiceWebSocket] Cleanup interval cleared');
    }

    // Stop all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    logger.info(`[VoiceWebSocket] Stopping ${sessionIds.length} active sessions`);

    for (const sessionId of sessionIds) {
      this.stopSession(sessionId);
    }

    logger.info('[VoiceWebSocket] Voice server shutdown complete');
  }
}