/**
 * React hooks for voice ordering metrics
 *
 * Usage:
 * ```tsx
 * const { trackOrderStarted, trackOrderCompleted } = useVoiceOrderingMetrics();
 *
 * // When opening voice order modal
 * const sessionId = trackOrderStarted(table.id, seatNumber);
 *
 * // When submitting order
 * trackOrderCompleted(sessionId, orderId, orderItems.length);
 * ```
 */

import { useCallback, useMemo } from 'react';
import { voiceOrderingMetrics } from './VoiceOrderingMetrics';

/**
 * Hook for tracking voice ordering metrics
 */
export function useVoiceOrderingMetrics() {
  const trackOrderStarted = useCallback((tableId: string, seatNumber: number) => {
    return voiceOrderingMetrics.trackOrderStarted(tableId, seatNumber);
  }, []);

  const trackOrderCompleted = useCallback((sessionId: string, orderId: string, itemCount: number) => {
    voiceOrderingMetrics.trackOrderCompleted(sessionId, orderId, itemCount);
  }, []);

  const trackOrderAbandoned = useCallback((sessionId: string, reason: string) => {
    voiceOrderingMetrics.trackOrderAbandoned(sessionId, reason);
  }, []);

  const trackConnectionAttempted = useCallback(() => {
    return voiceOrderingMetrics.trackConnectionAttempted();
  }, []);

  const trackConnectionSuccessful = useCallback((sessionId: string) => {
    voiceOrderingMetrics.trackConnectionSuccessful(sessionId);
  }, []);

  const trackConnectionFailed = useCallback((sessionId: string, errorType: string, errorMessage?: string) => {
    voiceOrderingMetrics.trackConnectionFailed(sessionId, errorType, errorMessage);
  }, []);

  const trackConnectionTimeout = useCallback((sessionId: string, timeoutMs: number) => {
    voiceOrderingMetrics.trackConnectionTimeout(sessionId, timeoutMs);
  }, []);

  const trackError = useCallback((errorType: string, errorMessage: string, context?: Record<string, any>) => {
    voiceOrderingMetrics.trackError(errorType, errorMessage, context);
  }, []);

  const trackItemMatched = useCallback((itemName: string, matchedName: string, confidence: number) => {
    voiceOrderingMetrics.trackItemMatched(itemName, matchedName, confidence);
  }, []);

  const trackItemUnmatched = useCallback((itemName: string, confidence: number) => {
    voiceOrderingMetrics.trackItemUnmatched(itemName, confidence);
  }, []);

  return {
    trackOrderStarted,
    trackOrderCompleted,
    trackOrderAbandoned,
    trackConnectionAttempted,
    trackConnectionSuccessful,
    trackConnectionFailed,
    trackConnectionTimeout,
    trackError,
    trackItemMatched,
    trackItemUnmatched
  };
}

/**
 * Hook to get aggregated metrics (for dashboard/admin panel)
 */
export function useVoiceOrderingMetricsAnalytics(since?: number) {
  const orderMetrics = useMemo(() => {
    return voiceOrderingMetrics.getOrderMetrics(since);
  }, [since]);

  const connectionMetrics = useMemo(() => {
    return voiceOrderingMetrics.getConnectionMetrics(since);
  }, [since]);

  const errorMetrics = useMemo(() => {
    return voiceOrderingMetrics.getErrorMetrics(since);
  }, [since]);

  return {
    orderMetrics,
    connectionMetrics,
    errorMetrics
  };
}
