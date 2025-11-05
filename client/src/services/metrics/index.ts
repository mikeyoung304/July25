/**
 * Metrics Module
 *
 * Provides metrics collection and analytics for voice ordering system.
 * Feeds into Grafana dashboard for Phase 1 baseline measurement.
 */

export {
  voiceOrderingMetrics,
  type VoiceOrderMetric,
  type OrderMetrics,
  type ConnectionMetrics,
  type ErrorMetrics
} from './VoiceOrderingMetrics';

export {
  useVoiceOrderingMetrics,
  useVoiceOrderingMetricsAnalytics
} from './useVoiceOrderingMetrics';
