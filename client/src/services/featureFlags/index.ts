/**
 * Feature Flags Module
 *
 * Provides feature flag functionality for gradual rollout and A/B testing.
 */

export { featureFlagService, type FeatureFlagConfig } from './FeatureFlagService';
export { useFeatureFlag, useFeatureFlagConfig, useAllFeatureFlags } from './useFeatureFlag';

/**
 * Feature Flag Registry
 *
 * Central registry of all feature flags used in the application.
 * This serves as documentation and type safety.
 */
export const FEATURE_FLAGS = {
  // Phase 1: Crisis Response & Baseline
  NEW_CUSTOMER_ID_FLOW: 'NEW_CUSTOMER_ID_FLOW',
  IDEMPOTENCY_ENABLED: 'IDEMPOTENCY_ENABLED',

  // Phase 2A: Backend Reliability
  TURN_SERVERS_ENABLED: 'TURN_SERVERS_ENABLED',
  STATE_PRESERVATION_ENABLED: 'STATE_PRESERVATION_ENABLED',

  // Phase 2B: Voice UX Improvements
  HIGH_CONFIDENCE_THRESHOLD: 'HIGH_CONFIDENCE_THRESHOLD', // 0.75 vs 0.5
  ITEM_CONFIRMATION_UI: 'ITEM_CONFIRMATION_UI',
  UNMATCHED_ITEM_SUGGESTIONS: 'UNMATCHED_ITEM_SUGGESTIONS',

  // Phase 3: Connection Reliability
  GRADUATED_TIMEOUT: 'GRADUATED_TIMEOUT', // 60s → 10s gradual reduction
  EXPONENTIAL_BACKOFF_RETRY: 'EXPONENTIAL_BACKOFF_RETRY',
  RATE_LIMITING_WITH_RETRY: 'RATE_LIMITING_WITH_RETRY',

  // Phase 4: UX Polish
  AUDIO_VISUALIZATION: 'AUDIO_VISUALIZATION',
  PRE_SUBMISSION_REVIEW: 'PRE_SUBMISSION_REVIEW',
  CONVERSATIONAL_ERROR_MESSAGES: 'CONVERSATIONAL_ERROR_MESSAGES',
  OPTIMISTIC_UI_UPDATES: 'OPTIMISTIC_UI_UPDATES',
} as const;

export type FeatureFlagName = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];
