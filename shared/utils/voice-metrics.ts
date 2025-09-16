/**
 * Lightweight voice session metrics and observability
 *
 * Provides structured logging for voice session lifecycle events
 * without external dependencies or PII collection.
 *
 * Events tracked:
 * - voice.session.created
 * - voice.session.normalized
 * - voice.session.reconnect
 * - voice.session.fail
 * - Connect latency (time to establish connection)
 * - Time to first transcript (TTF)
 */

export interface VoiceMetricsEvent {
  event: string;
  timestamp: number;
  sessionId?: string;
  restaurantId?: string;
  userId?: string;
  mode?: 'employee' | 'customer';
  metadata?: Record<string, any>;
}

export interface SessionCreatedMetrics {
  sessionId: string;
  restaurantId: string;
  userId?: string;
  mode: 'employee' | 'customer';
  hasMenuContext: boolean;
  connectStartTime: number;
}

export interface SessionNormalizedMetrics {
  sessionId: string;
  restaurantId: string;
  mode: 'employee' | 'customer';
  configSource: {
    temperature: 'request' | 'environment' | 'restaurant' | 'default';
    maxTokens: 'request' | 'environment' | 'restaurant' | 'default';
  };
  changes: Record<string, { from: any; to: any; reason: string }>;
  normalizationTimeMs: number;
}

export interface SessionReconnectMetrics {
  sessionId: string;
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  reason: string;
  lastError?: string;
}

export interface SessionFailMetrics {
  sessionId: string;
  reason: 'connection_lost' | 'auth_failed' | 'rate_limit' | 'server_error' | 'unknown';
  lastError?: string;
  attempts: number;
  totalDurationMs?: number;
}

export interface ConnectLatencyMetrics {
  sessionId: string;
  connectStartTime: number;
  connectEndTime: number;
  latencyMs: number;
  steps: {
    tokenFetch: number;
    peerConnectionSetup: number;
    sdpExchange: number;
    dataChannelReady: number;
  };
}

export interface TimeToFirstTranscriptMetrics {
  sessionId: string;
  recordingStartTime: number;
  firstTranscriptTime: number;
  ttfMs: number;
  isFinalTranscript: boolean;
}

/**
 * Voice metrics emitter - supports both browser and Node.js environments
 */
export class VoiceMetrics {
  private static instance: VoiceMetrics;
  private environment: 'browser' | 'node';
  private sessionMetrics = new Map<string, Partial<SessionCreatedMetrics>>();

  private constructor() {
    this.environment = typeof window !== 'undefined' ? 'browser' : 'node';
  }

  static getInstance(): VoiceMetrics {
    if (!VoiceMetrics.instance) {
      VoiceMetrics.instance = new VoiceMetrics();
    }
    return VoiceMetrics.instance;
  }

  /**
   * Emit a structured metrics event
   */
  private emit(event: VoiceMetricsEvent): void {
    // Use structured logging based on environment
    if (this.environment === 'node') {
      // Server-side: use proper structured logger if available
      const logMessage = {
        level: 'info',
        message: `Voice metrics: ${event.event}`,
        event: event.event,
        timestamp: new Date(event.timestamp).toISOString(),
        sessionId: event.sessionId,
        restaurantId: event.restaurantId,
        userId: event.userId,
        mode: event.mode,
        ...event.metadata
      };

      // Use console.log with JSON for structured logging
      // Production systems can pipe this to proper log aggregation
      console.log(JSON.stringify(logMessage));
    } else {
      // Client-side: use console.log with structured format
      const logMessage = {
        level: 'info',
        message: `[VoiceMetrics] ${event.event}`,
        timestamp: new Date(event.timestamp).toISOString(),
        sessionId: event.sessionId,
        restaurantId: event.restaurantId,
        mode: event.mode,
        ...event.metadata
      };

      console.log(logMessage.message, logMessage);
    }
  }

  /**
   * Track session creation
   */
  sessionCreated(metrics: SessionCreatedMetrics): void {
    // Store session info for later correlation
    this.sessionMetrics.set(metrics.sessionId, metrics);

    this.emit({
      event: 'voice.session.created',
      timestamp: Date.now(),
      sessionId: metrics.sessionId,
      restaurantId: metrics.restaurantId,
      userId: metrics.userId,
      mode: metrics.mode,
      metadata: {
        hasMenuContext: metrics.hasMenuContext,
        connectStartTime: metrics.connectStartTime
      }
    });
  }

  /**
   * Track session configuration normalization
   */
  sessionNormalized(metrics: SessionNormalizedMetrics): void {
    this.emit({
      event: 'voice.session.normalized',
      timestamp: Date.now(),
      sessionId: metrics.sessionId,
      restaurantId: metrics.restaurantId,
      mode: metrics.mode,
      metadata: {
        configSource: metrics.configSource,
        changes: metrics.changes,
        normalizationTimeMs: metrics.normalizationTimeMs,
        changesCount: Object.keys(metrics.changes).length
      }
    });
  }

  /**
   * Track connection latency and performance
   */
  connectLatency(metrics: ConnectLatencyMetrics): void {
    this.emit({
      event: 'voice.session.connect_latency',
      timestamp: Date.now(),
      sessionId: metrics.sessionId,
      metadata: {
        latencyMs: metrics.latencyMs,
        steps: metrics.steps,
        totalDurationMs: metrics.connectEndTime - metrics.connectStartTime
      }
    });
  }

  /**
   * Track time to first transcript
   */
  timeToFirstTranscript(metrics: TimeToFirstTranscriptMetrics): void {
    this.emit({
      event: 'voice.session.ttf',
      timestamp: Date.now(),
      sessionId: metrics.sessionId,
      metadata: {
        ttfMs: metrics.ttfMs,
        isFinalTranscript: metrics.isFinalTranscript,
        recordingStartTime: metrics.recordingStartTime,
        firstTranscriptTime: metrics.firstTranscriptTime
      }
    });
  }

  /**
   * Track reconnection attempts
   */
  sessionReconnect(metrics: SessionReconnectMetrics): void {
    this.emit({
      event: 'voice.session.reconnect',
      timestamp: Date.now(),
      sessionId: metrics.sessionId,
      metadata: {
        attempt: metrics.attempt,
        maxAttempts: metrics.maxAttempts,
        delayMs: metrics.delayMs,
        reason: metrics.reason,
        lastError: metrics.lastError
      }
    });
  }

  /**
   * Track session failures
   */
  sessionFail(metrics: SessionFailMetrics): void {
    // Get session info for correlation
    const sessionInfo = this.sessionMetrics.get(metrics.sessionId);

    this.emit({
      event: 'voice.session.fail',
      timestamp: Date.now(),
      sessionId: metrics.sessionId,
      restaurantId: sessionInfo?.restaurantId,
      userId: sessionInfo?.userId,
      mode: sessionInfo?.mode,
      metadata: {
        reason: metrics.reason,
        lastError: metrics.lastError,
        attempts: metrics.attempts,
        totalDurationMs: metrics.totalDurationMs
      }
    });

    // Clean up session tracking
    this.sessionMetrics.delete(metrics.sessionId);
  }

  /**
   * Generate a unique session ID for tracking
   */
  generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `voice_${timestamp}_${random}`;
  }

  /**
   * Get session info for correlation
   */
  getSessionInfo(sessionId: string): Partial<SessionCreatedMetrics> | undefined {
    return this.sessionMetrics.get(sessionId);
  }

  /**
   * Clean up old session tracking data
   */
  cleanup(): void {
    // Remove sessions older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    for (const [sessionId, sessionInfo] of this.sessionMetrics.entries()) {
      if (sessionInfo.connectStartTime && sessionInfo.connectStartTime < oneHourAgo) {
        this.sessionMetrics.delete(sessionId);
      }
    }
  }
}

/**
 * Convenience instance for direct usage
 */
export const voiceMetrics = VoiceMetrics.getInstance();

/**
 * Helper function to measure execution time
 */
export function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
  const startTime = Date.now();
  const result = fn();
  const durationMs = Date.now() - startTime;
  return { result, durationMs };
}

/**
 * Helper function to measure async execution time
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startTime;
  return { result, durationMs };
}