/**
 * Voice Ordering Metrics Service
 *
 * Tracks baseline metrics for voice ordering system to measure:
 * - Order completion rate
 * - Connection success rate
 * - Average completion time
 * - Error rates by type
 *
 * These metrics feed into the Grafana dashboard for Phase 1 baseline measurement.
 *
 * Usage:
 * ```ts
 * import { voiceOrderingMetrics } from '@/services/metrics';
 *
 * // Track order started
 * voiceOrderingMetrics.trackOrderStarted(tableId, seatNumber);
 *
 * // Track order completed
 * voiceOrderingMetrics.trackOrderCompleted(orderId, itemCount, durationMs);
 * ```
 */

import { logger } from '@/services/monitoring/logger';

export interface VoiceOrderMetric {
  timestamp: number;
  eventType: string;
  metadata: Record<string, any>;
}

export interface OrderMetrics {
  ordersStarted: number;
  ordersCompleted: number;
  ordersAbandoned: number;
  averageDurationMs: number;
  completionRate: number;
}

export interface ConnectionMetrics {
  connectionsAttempted: number;
  connectionsSuccessful: number;
  connectionsFailed: number;
  averageConnectionTimeMs: number;
  successRate: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
}

export class VoiceOrderingMetricsService {
  private metrics: VoiceOrderMetric[] = [];
  private readonly MAX_METRICS_IN_MEMORY = 1000;
  private readonly STORAGE_KEY = 'voice_ordering_metrics';

  // In-flight sessions for tracking duration
  private orderSessions: Map<string, { startTime: number; tableId: string; seatNumber: number }> = new Map();
  private connectionSessions: Map<string, { startTime: number }> = new Map();

  constructor() {
    this.loadMetricsFromStorage();
  }

  // -------------------------------------------------------------------------
  // Order Metrics
  // -------------------------------------------------------------------------

  /**
   * Track when user starts a voice order
   */
  trackOrderStarted(tableId: string, seatNumber: number): string {
    const sessionId = this.generateSessionId();

    this.orderSessions.set(sessionId, {
      startTime: Date.now(),
      tableId,
      seatNumber
    });

    this.recordMetric('order.started', {
      sessionId,
      tableId,
      seatNumber
    });

    logger.info('[Metrics] Order started', { sessionId, tableId, seatNumber });

    return sessionId;
  }

  /**
   * Track successful order completion
   */
  trackOrderCompleted(sessionId: string, orderId: string, itemCount: number): void {
    const session = this.orderSessions.get(sessionId);

    if (!session) {
      logger.warn('[Metrics] Order completed but no session found', { sessionId, orderId });
      return;
    }

    const durationMs = Date.now() - session.startTime;

    this.recordMetric('order.completed', {
      sessionId,
      orderId,
      itemCount,
      durationMs,
      tableId: session.tableId,
      seatNumber: session.seatNumber
    });

    logger.info('[Metrics] Order completed', {
      sessionId,
      orderId,
      itemCount,
      durationMs
    });

    this.orderSessions.delete(sessionId);
  }

  /**
   * Track abandoned order (user closed modal without submitting)
   */
  trackOrderAbandoned(sessionId: string, reason: string): void {
    const session = this.orderSessions.get(sessionId);

    if (!session) {
      return; // Session may have already been cleaned up
    }

    const durationMs = Date.now() - session.startTime;

    this.recordMetric('order.abandoned', {
      sessionId,
      reason,
      durationMs,
      tableId: session.tableId,
      seatNumber: session.seatNumber
    });

    logger.info('[Metrics] Order abandoned', {
      sessionId,
      reason,
      durationMs
    });

    this.orderSessions.delete(sessionId);
  }

  // -------------------------------------------------------------------------
  // Connection Metrics
  // -------------------------------------------------------------------------

  /**
   * Track WebRTC connection attempt
   */
  trackConnectionAttempted(): string {
    const sessionId = this.generateSessionId();

    this.connectionSessions.set(sessionId, {
      startTime: Date.now()
    });

    this.recordMetric('connection.attempted', { sessionId });

    logger.info('[Metrics] Connection attempted', { sessionId });

    return sessionId;
  }

  /**
   * Track successful WebRTC connection
   */
  trackConnectionSuccessful(sessionId: string): void {
    const session = this.connectionSessions.get(sessionId);

    if (!session) {
      logger.warn('[Metrics] Connection successful but no session found', { sessionId });
      return;
    }

    const durationMs = Date.now() - session.startTime;

    this.recordMetric('connection.successful', {
      sessionId,
      durationMs
    });

    logger.info('[Metrics] Connection successful', { sessionId, durationMs });

    this.connectionSessions.delete(sessionId);
  }

  /**
   * Track failed WebRTC connection
   */
  trackConnectionFailed(sessionId: string, errorType: string, errorMessage?: string): void {
    const session = this.connectionSessions.get(sessionId);
    const durationMs = session ? Date.now() - session.startTime : 0;

    this.recordMetric('connection.failed', {
      sessionId,
      errorType,
      errorMessage,
      durationMs
    });

    logger.error('[Metrics] Connection failed', {
      sessionId,
      errorType,
      errorMessage,
      durationMs
    });

    if (session) {
      this.connectionSessions.delete(sessionId);
    }
  }

  /**
   * Track connection timeout (15s timeout from Phase 1 Week 1 fix)
   */
  trackConnectionTimeout(sessionId: string, timeoutMs: number): void {
    this.trackConnectionFailed(sessionId, 'timeout', `Connection timeout after ${timeoutMs}ms`);
  }

  // -------------------------------------------------------------------------
  // Error Metrics
  // -------------------------------------------------------------------------

  /**
   * Track voice ordering error
   */
  trackError(errorType: string, errorMessage: string, context?: Record<string, any>): void {
    this.recordMetric('error', {
      errorType,
      errorMessage,
      ...context
    });

    logger.error('[Metrics] Voice ordering error', {
      errorType,
      errorMessage,
      context
    });
  }

  // -------------------------------------------------------------------------
  // Item Matching Metrics
  // -------------------------------------------------------------------------

  /**
   * Track menu item matching success
   */
  trackItemMatched(itemName: string, matchedName: string, confidence: number): void {
    this.recordMetric('item.matched', {
      itemName,
      matchedName,
      confidence
    });
  }

  /**
   * Track unmatched item (low confidence or not found)
   */
  trackItemUnmatched(itemName: string, confidence: number): void {
    this.recordMetric('item.unmatched', {
      itemName,
      confidence
    });
  }

  // -------------------------------------------------------------------------
  // Analytics & Reporting
  // -------------------------------------------------------------------------

  /**
   * Get aggregated order metrics for baseline measurement
   */
  getOrderMetrics(since?: number): OrderMetrics {
    const cutoff = since || Date.now() - (7 * 24 * 60 * 60 * 1000); // Default: last 7 days

    const started = this.metrics.filter(m => m.eventType === 'order.started' && m.timestamp >= cutoff);
    const completed = this.metrics.filter(m => m.eventType === 'order.completed' && m.timestamp >= cutoff);
    const abandoned = this.metrics.filter(m => m.eventType === 'order.abandoned' && m.timestamp >= cutoff);

    const durations = completed
      .map(m => m.metadata.durationMs)
      .filter((d): d is number => typeof d === 'number');

    const averageDurationMs = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    const completionRate = started.length > 0
      ? (completed.length / started.length) * 100
      : 0;

    return {
      ordersStarted: started.length,
      ordersCompleted: completed.length,
      ordersAbandoned: abandoned.length,
      averageDurationMs,
      completionRate
    };
  }

  /**
   * Get aggregated connection metrics
   */
  getConnectionMetrics(since?: number): ConnectionMetrics {
    const cutoff = since || Date.now() - (7 * 24 * 60 * 60 * 1000);

    const attempted = this.metrics.filter(m => m.eventType === 'connection.attempted' && m.timestamp >= cutoff);
    const successful = this.metrics.filter(m => m.eventType === 'connection.successful' && m.timestamp >= cutoff);
    const failed = this.metrics.filter(m => m.eventType === 'connection.failed' && m.timestamp >= cutoff);

    const connectionTimes = successful
      .map(m => m.metadata.durationMs)
      .filter((d): d is number => typeof d === 'number');

    const averageConnectionTimeMs = connectionTimes.length > 0
      ? connectionTimes.reduce((sum, d) => sum + d, 0) / connectionTimes.length
      : 0;

    const successRate = attempted.length > 0
      ? (successful.length / attempted.length) * 100
      : 0;

    return {
      connectionsAttempted: attempted.length,
      connectionsSuccessful: successful.length,
      connectionsFailed: failed.length,
      averageConnectionTimeMs,
      successRate
    };
  }

  /**
   * Get error metrics grouped by type
   */
  getErrorMetrics(since?: number): ErrorMetrics {
    const cutoff = since || Date.now() - (7 * 24 * 60 * 60 * 1000);

    const errors = this.metrics.filter(m => m.eventType === 'error' && m.timestamp >= cutoff);

    const errorsByType: Record<string, number> = {};

    errors.forEach(error => {
      const errorType = error.metadata.errorType || 'unknown';
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });

    return {
      totalErrors: errors.length,
      errorsByType
    };
  }

  /**
   * Export metrics for external analysis (Grafana, CSV, etc.)
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metrics, null, 2);
    }

    // CSV export
    if (this.metrics.length === 0) {
      return 'timestamp,eventType,metadata';
    }

    const header = 'timestamp,eventType,metadata\n';
    const rows = this.metrics.map(m =>
      `${m.timestamp},${m.eventType},"${JSON.stringify(m.metadata).replace(/"/g, '""')}"`
    ).join('\n');

    return header + rows;
  }

  // -------------------------------------------------------------------------
  // Internal Methods
  // -------------------------------------------------------------------------

  private recordMetric(eventType: string, metadata: Record<string, any>): void {
    const metric: VoiceOrderMetric = {
      timestamp: Date.now(),
      eventType,
      metadata
    };

    this.metrics.push(metric);

    // Trim old metrics if exceeding limit
    if (this.metrics.length > this.MAX_METRICS_IN_MEMORY) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS_IN_MEMORY);
    }

    // Persist to localStorage
    this.saveMetricsToStorage();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private saveMetricsToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      logger.error('[Metrics] Failed to save to localStorage', { error });
    }
  }

  private loadMetricsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.metrics = JSON.parse(stored);
        logger.info('[Metrics] Loaded metrics from storage', { count: this.metrics.length });
      }
    } catch (error) {
      logger.error('[Metrics] Failed to load from localStorage', { error });
    }
  }

  /**
   * Clear all metrics (for testing/debugging)
   */
  clearMetrics(): void {
    this.metrics = [];
    this.orderSessions.clear();
    this.connectionSessions.clear();
    localStorage.removeItem(this.STORAGE_KEY);

    logger.info('[Metrics] Cleared all metrics');
  }
}

// Singleton instance
export const voiceOrderingMetrics = new VoiceOrderingMetricsService();
